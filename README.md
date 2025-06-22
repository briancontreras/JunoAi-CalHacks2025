# Juno Legal AI Assistant

A legal AI assistant powered by GROQ LLM with advanced session memory capabilities.

## Features

### 🤖 AI-Powered Legal Assistance
- Legal reasoning based on U.S. federal and state law
- Location-aware legal advice
- Voice input and text-to-speech capabilities
- Real-time transcription

### 💾 Session Memory System
- **Persistent Conversations**: Each chat session maintains conversation history
- **Context Awareness**: AI remembers previous questions and provides contextual responses
- **Session Management**: Create, switch between, and delete multiple chat sessions
- **Automatic Cleanup**: Sessions expire after 24 hours to manage memory
- **Session Limits**: Maximum 100 active sessions to prevent memory issues

### 📍 Location-Based Legal Advice
- Automatic location detection using GPS
- Manual location selection for all U.S. states
- Legal advice tailored to your specific state and city laws

### 🎤 Voice Features
- Voice-to-text transcription for hands-free interaction
- Text-to-speech for AI responses
- Support for multiple voice input methods

## Session Memory Features

### Backend Session Management
- **Session Creation**: Automatic session creation for new conversations
- **Conversation History**: Stores all messages with timestamps
- **Context Window**: Uses last 6 messages for context in legal reasoning
- **Session APIs**: 
  - `POST /api/sessions/new` - Create new session
  - `GET /api/sessions/{id}` - Get session details
  - `DELETE /api/sessions/{id}` - Delete session
  - `GET /api/sessions` - List all sessions
  - `GET /api/health` - Health check with session count

### Frontend Session Interface
- **Session Panel**: Toggle to show/hide session management
- **Session List**: View all active sessions with creation dates and message counts
- **Session Switching**: Click any session to load its conversation history
- **Session Deletion**: Remove sessions with one click
- **Active Session Indicator**: Shows current session ID and message count

## Setup

### Backend Setup
```bash
cd CalHacks2025/backend
pip install -r requirements.txt
python main.py
```

### Frontend Setup
```bash
cd CalHacks2025/frontend
npm install
npm run dev
```

### Environment Variables
Create a `.env` file in the backend directory:
```env
GROQ_API_KEY=your_groq_api_key_here
GOOGLE_API_KEY=your_google_api_key_here
```

## Usage

1. **Enable Location**: Allow location access or manually select your state
2. **Start Chatting**: Ask legal questions and get AI-powered responses
3. **Manage Sessions**: 
   - Click "Show Sessions" to view all conversations
   - Click "New Session" to start fresh
   - Click any session to switch to it
   - Click "×" to delete a session
4. **Voice Input**: Use the microphone button for hands-free interaction

## Technical Details

### Session Storage
- In-memory storage for fast access
- Automatic cleanup after 24 hours of inactivity
- Maximum 100 sessions to prevent memory overflow
- Session data includes:
  - Unique session ID
  - Creation timestamp
  - Last activity timestamp
  - Complete conversation history

### Context Management
- Last 6 messages used for context in legal reasoning
- Maintains conversation flow and continuity
- Preserves legal context across multiple questions

### Memory Optimization
- Automatic session cleanup
- Configurable session limits
- Efficient message storage
- Health monitoring endpoints

## API Endpoints

### Legal Assistance
- `POST /legal-response` - Main legal advice endpoint with session support
- `POST /transcribe` - Audio transcription
- `POST /speak` - Text-to-speech conversion
- `POST /location` - Location detection

### Session Management
- `POST /api/sessions/new` - Create new session
- `GET /api/sessions/{session_id}` - Get session details
- `DELETE /api/sessions/{session_id}` - Delete session
- `GET /api/sessions` - List all sessions
- `GET /api/health` - Health check

## Legal Disclaimer

This AI assistant provides general legal information and should not be considered as legal advice. For specific legal matters, please consult with a qualified attorney.
