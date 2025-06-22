from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from geopy.geocoders import Nominatim
from geopy.location import Location
from typing import cast, Optional, List, Dict
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
import uuid
from datetime import datetime, timedelta

##API KEYS
load_dotenv()

google_api_key = os.getenv("GOOGLE_API_KEY")
api_key = os.getenv("api_key")
client = Groq(api_key=api_key)

app = FastAPI()

geolocator = Nominatim(user_agent="calhacks2025-app")

# Session memory storage
sessions: Dict[str, Dict] = {}
MAX_SESSIONS = 100
SESSION_TIMEOUT = timedelta(hours=24)

class LocationInput(BaseModel):
    lat: float
    lon: float

class ChatMessage(BaseModel):
    role: str
    content: str
    timestamp: Optional[datetime] = None

class LegalRequest(BaseModel):
    question: str
    location: dict
    session_id: Optional[str] = None  # Add session support

class SpeechRequest(BaseModel):
    text: str

class SessionInfo(BaseModel):
    session_id: str
    created_at: datetime
    message_count: int
    last_activity: datetime

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def cleanup_expired_sessions():
    """Remove expired sessions"""
    current_time = datetime.now()
    expired_sessions = [
        session_id for session_id, session_data in sessions.items()
        if current_time - session_data["last_activity"] > SESSION_TIMEOUT
    ]
    for session_id in expired_sessions:
        del sessions[session_id]

def create_new_session() -> str:
    """Create a new session and return session ID"""
    cleanup_expired_sessions()
    
    if len(sessions) >= MAX_SESSIONS:
        oldest_session = min(sessions.keys(), 
                           key=lambda x: sessions[x]["created_at"])
        del sessions[oldest_session]
    
    session_id = str(uuid.uuid4())
    sessions[session_id] = {
        "messages": [],
        "created_at": datetime.now(),
        "last_activity": datetime.now()
    }
    return session_id

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

        print(f"Detected location - City: {city}, State: {state}")

        return {
            "city": city,
            "state": state
        }
    return {"error": "Unable to determine city/state"}

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
        temperature=0.3,
        max_completion_tokens=512,
        top_p=0.9,
        stream=True,
        reasoning_format="raw"
    )

@app.post("/legal-response")
async def legal_response(request: LegalRequest):
    # Handle session management
    if not request.session_id or request.session_id not in sessions:
        request.session_id = create_new_session()
    
    session = sessions[request.session_id]
    session["last_activity"] = datetime.now()
    
    # Add user message to session history
    user_message = ChatMessage(
        role="user",
        content=request.question,
        timestamp=datetime.now()
    )
    session["messages"].append(user_message)
    
    # Build context from conversation history
    conversation_context = ""
    if len(session["messages"]) > 1:
        recent_messages = session["messages"][-6:]  # Last 6 messages for context
        conversation_context = "\n\nPrevious conversation:\n"
        for msg in recent_messages[:-1]:  # Exclude current message
            conversation_context += f"{msg.role}: {msg.content}\n"
    
    # Step 1: Get the reasoning output with conversation context
    reasoning_prompt = f"""
You are a legal assistant AI. A user from {request.location['city']}, {request.location['state']} asked the following:

"{request.question}"

{conversation_context}

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
        temperature=0.5,
        max_tokens=800
    )
    
    summary_content = summary_completion.choices[0].message.content
    summarized_response = summary_content.strip() if summary_content else humanized_response

    # Add assistant response to session history
    assistant_message = ChatMessage(
        role="assistant",
        content=summarized_response,
        timestamp=datetime.now()
    )
    session["messages"].append(assistant_message)

    return {
        "response": summarized_response,
        "session_id": request.session_id,
        "conversation_history": session["messages"]
    }

@app.post("/speak")
async def speak_text(request: SpeechRequest):
    try:
        google_api_key = os.getenv("GOOGLE_API_KEY")
        if not google_api_key:
            raise HTTPException(status_code=500, detail="Google API key not configured")
        
        url = "https://texttospeech.googleapis.com/v1/text:synthesize"
        
        payload = {
            "input": {
                "text": request.text
            },
            "voice": {
                "languageCode": "en-US",
                "name": "en-US-Neural2-F",
                "ssmlGender": "FEMALE"
            },
            "audioConfig": {
                "audioEncoding": "MP3",
                "speakingRate": 1.25,
                "pitch": 0,
                "volumeGainDb": 0,
                "effectsProfileId": ["headphone-class-device"]
            }
        }
        
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
        
        audio_bytes = base64.b64decode(audio_content)
        
        return Response(
            content=audio_bytes,
            media_type="audio/mpeg",
            headers={"Content-Disposition": "attachment; filename=speech.mp3"}
        )
        
    except Exception as e:
        print(f"TTS Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"TTS service error: {str(e)}")

# New session management endpoints
@app.post("/api/sessions/new")
async def create_session():
    """Create a new session"""
    session_id = create_new_session()
    return {"session_id": session_id}

@app.get("/api/sessions/{session_id}")
async def get_session(session_id: str):
    """Get session information and conversation history"""
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = sessions[session_id]
    return {
        "session_id": session_id,
        "created_at": session["created_at"],
        "last_activity": session["last_activity"],
        "message_count": len(session["messages"]),
        "conversation_history": session["messages"]
    }

@app.delete("/api/sessions/{session_id}")
async def delete_session(session_id: str):
    """Delete a session"""
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    del sessions[session_id]
    return {"message": "Session deleted successfully"}

@app.get("/api/sessions", response_model=List[SessionInfo])
async def list_sessions():
    """List all active sessions"""
    cleanup_expired_sessions()
    
    session_list = []
    for session_id, session_data in sessions.items():
        session_list.append(SessionInfo(
            session_id=session_id,
            created_at=session_data["created_at"],
            last_activity=session_data["last_activity"],
            message_count=len(session_data["messages"])
        ))
    
    return session_list

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "active_sessions": len(sessions)}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
    
    
    