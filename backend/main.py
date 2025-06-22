from fastapi import FastAPI
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

##API KEYS
load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

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


@app.get("/legal_reasoning")
def legal_reasoning(user_input, location, city):

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

    client = Groq(api_key=GROQ_API_KEY)
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

    for chunk in completion:
        print(chunk.choices[0].delta.content or "", end="")
