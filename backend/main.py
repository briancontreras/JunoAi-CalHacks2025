from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from geopy.geocoders import Nominatim
from geopy.location import Location
from typing import cast, Optional
import uvicorn
import asyncio
from typing import Optional
from groq import Groq
from dotenv import load_dotenv
import os
from fastapi import UploadFile, File, HTTPException
from fastapi.responses import Response
import httpx
import base64

##API KEYS
load_dotenv()


google_api_key = os.getenv("GOOGLE_API_KEY")
api_key = os.getenv("api_key")
client = Groq(api_key=api_key)

app = FastAPI()

geolocator = Nominatim(user_agent="calhacks2025-app")

class LocationInput(BaseModel):
    lat: float
    lon: float

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/location") 
async def get_location(data: LocationInput):
    raw_location = await asyncio.to_thread(
        geolocator.reverse, (data.lat, data.lon), exactly_one=True
    )
    location = cast(Optional[Location], raw_location)

    if location and "address" in location.raw:
        address = location.raw["address"]
        city = address.get("city") or address.get("town") or address.get("village")
        state = address.get("state")

        print(f"Detected location - City: {city}, State: {state}")  # <-- Print here

        return {
            "city": city,
            "state": state
        }
    return {"error": "Unable to determine city/state"}

from fastapi import Request

@app.post("/transcribe")
async def transcribe_audio(request: Request, file: UploadFile = File(...)):
    audio_bytes = await file.read()

    headers = {
        "Authorization": f"Bearer {api_key}"
    }

    files = {
        "file": (file.filename, audio_bytes, file.content_type),
        "model": (None, "whisper-large-v3-turbo")
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.groq.com/openai/v1/audio/transcriptions",
                headers=headers,
                files=files
            )
        response.raise_for_status()
    except httpx.HTTPStatusError as e:
        # Log full response content for debugging
        error_detail = e.response.text
        print(f"Groq API returned error: {error_detail}")
        raise HTTPException(status_code=500, detail=f"Groq API error: {error_detail}")
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        raise HTTPException(status_code=500, detail="Unexpected error during transcription")

    data = response.json()
    return {"transcription": data.get("text")}



@app.post("/legal_reasoning")
def legal_reasoning(user_input, location, city):
    client = Groq(api_key=api_key)
    reasoning_prompt = f"""
    You are a legal reasoning AI.
    Given a user's situation, determine:
    1. What is happening?
    2. What rights are relevant?
    3. What should they say or not say?
    Only use logic based on U.S. law, in the state of {location}, and city of {city}. Be clear and concise.

    User text: "{user_input}"
    Respond in JSON format:
    {{
    "situation_summary": "...",
    "legal_context": "...",
    "advice": "...",
    "confidence": 0-1
    }}
    """

    completion = client.chat.completions.create(
        model="deepseek-r1-distill-llama-70b",
        messages=[
            {
                "role": "user",
                "content": reasoning_prompt
            }
        ],
        temperature=0.3,  # Lower temp for more factual outputs
        max_completion_tokens=512,
        top_p=0.9,
        stream=True,
        reasoning_format="raw"  # Optional: if your implementation supports it
    )


class LegalRequest(BaseModel):
    question: str
    location: dict  # could be {"city": "...", "state": "..."}

@app.post("/legal-response")
async def legal_response(request: LegalRequest):
    # Step 1: Get the reasoning output
    reasoning_prompt = f"""
You are a legal assistant AI. A user from {request.location['city']}, {request.location['state']} asked the following:

"{request.question}"

Provide a helpful, accurate, and concise answer based on U.S. federal law and relevant {request.location['state']} law. Make sure the response is clear and accessible to non-lawyers.
"""

    reasoning_completion = client.chat.completions.create(
        model="deepseek-r1-distill-llama-70b",
        messages=[{"role": "user", "content": reasoning_prompt}],
        temperature=0.3,
        max_tokens=1500
    )
    content = reasoning_completion.choices[0].message.content
    reasoning_text = content.strip() if content else ""

    # Step 2: Use reasoning output as input to text generation to humanize
    generation_prompt = f"""
You are a friendly legal assistant. Here is the factual legal explanation:

{reasoning_text}

Please rewrite the above explanation in a clear, conversational, empathetic tone, easy for any non-expert to understand. 
Keep it concise but warm.
If you provide a legal answer, cite your sources by providing the law code and section number and links to the source.
Also format your response so it is easy to read and understand.
Try to keep your response to to 500 words.
"""

    generation_completion = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": generation_prompt}],
        temperature=0.7,
        max_tokens=1500
    )
    content = generation_completion.choices[0].message.content
    humanized_response = content.strip() if content else ""

    # Step 3: Use Groq to summarize while preserving crucial information
    summary_prompt = f"""
You are a legal summarization expert. Please summarize the following legal response while ensuring ALL crucial legal information, rights, and actionable advice are preserved:

{humanized_response}

Your summary should:
1. Keep all specific legal rights mentioned
2. Preserve all actionable advice and recommendations
3. Maintain any legal citations or references
4. Keep the conversational, empathetic tone
5. Be more concise (aim for 100-200 words) but comprehensive
6. Highlight the most important points first
7. Ensure no critical legal information is lost
8. If numbering is used, refer to the number as steps instead of a list
9. When you list steps make sure to use the word "step" has a captial 's'

Focus on what the person needs to know and what they should do next.
"""

    summary_completion = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": summary_prompt}],
        temperature=0.5,  # Lower temperature for more consistent summarization
        max_tokens=800
    )
    
    # Extract the summarized response from Groq
    summary_content = summary_completion.choices[0].message.content
    summarized_response = summary_content.strip() if summary_content else humanized_response

    return {"response": summarized_response}


class SpeechRequest(BaseModel):
    text: str

@app.post("/speak")
async def speak_text(request: SpeechRequest):
    try:
        # Get Google API key from environment
        google_api_key = os.getenv("GOOGLE_API_KEY")
        if not google_api_key:
            raise HTTPException(status_code=500, detail="Google API key not configured")
        
        # Google Cloud Text-to-Speech API endpoint
        url = "https://texttospeech.googleapis.com/v1/text:synthesize"
        
        # Prepare the request payload for friendly lawyer voice
        payload = {
            "input": {
                "text": request.text
            },
            "voice": {
                "languageCode": "en-US",
                "name": "en-US-Neural2-F",  # Friendly female neural voice
                "ssmlGender": "FEMALE"
            },
            "audioConfig": {
                "audioEncoding": "MP3",
                "speakingRate": 1.25,      # Slightly slower for clarity
                "pitch": 0,               # Normal pitch
                "volumeGainDb": 0,        # Normal volume
                "effectsProfileId": ["headphone-class-device"]  # Optimized for headphones
            }
        }
        
        # Make request to Google TTS API
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{url}?key={google_api_key}",
                json=payload,
                headers={"Content-Type": "application/json"}
            )
            
        if response.status_code != 200:
            error_detail = response.text
            print(f"Google TTS API error: {error_detail}")
            raise HTTPException(status_code=500, detail="Google TTS API error")
            
        data = response.json()
        audio_content = data.get("audioContent")
        
        if not audio_content:
            raise HTTPException(status_code=500, detail="No audio content received")
        
        # Decode base64 audio and return
        audio_bytes = base64.b64decode(audio_content)
        
        return Response(
            content=audio_bytes,
            media_type="audio/mpeg",
            headers={"Content-Disposition": "attachment; filename=speech.mp3"}
        )
        
    except Exception as e:
        print(f"TTS Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"TTS service error: {str(e)}")
    
    
    