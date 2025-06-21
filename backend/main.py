from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from groq import Groq
from dotenv import load_dotenv
import os

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")



user_input = "Hello I am currently in my vehicle and I got pulled over by the police on the freeway. The officer is requesting to search my car " + \
"but I don't think he has a valid reason, what should I do?"

reasoning_prompt = f"""
You are a legal reasoning AI.
Given a user's situation, determine:
1. What is happening?
2. What rights are relevant?
3. What should they say or not say?
Only use logic based on U.S. law. Be clear and concise.

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




# Create FastAPI instance
app = FastAPI(
    title="CalHacks 2025 API",
    description="A FastAPI application for CalHacks 2025",
    version="1.0.0"
)

# Add CORS middleware to allow frontend to communicate with backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root endpoint
@app.get("/")
async def root():
    return {"message": "Welcome to CalHacks 2025 API!"}

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy", "message": "API is running"}

# Example endpoint with path parameter
@app.get("/hello/{name}")
async def say_hello(name: str):
    return {"message": f"Hello, {name}!"}

# Example POST endpoint
@app.post("/items")
async def create_item(item: dict):
    return {"item": item, "message": "Item created successfully"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
