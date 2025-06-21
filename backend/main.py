from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from geopy.geocoders import Nominatim
from geopy.location import Location
from typing import cast, Optional
import uvicorn
import asyncio
from typing import Optional

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