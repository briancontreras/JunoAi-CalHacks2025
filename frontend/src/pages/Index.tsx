import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Send, MapPin, Volume2, VolumeX } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import LocationDetector from "@/components/LocationDetector";
import ChatMessage from "@/components/ChatMessage";
import VoiceInput from "@/components/VoiceInput";
import { useSpeech } from '@/hooks/use-speech';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface ChatMessageType {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

interface SessionInfo {
  session_id: string;
  created_at: string;
  last_activity: string;
  message_count: number;
  conversation_history: ChatMessageType[];
}

const Index = () => {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [showSessions, setShowSessions] = useState(false);
  const [location, setLocation] = useState<{city: string, state: string}>({ city: "", state: "" });
  const [hasInitialized, setHasInitialized] = useState(false);
  const [hasShownWelcome, setHasShownWelcome] = useState(false);
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { speakWithGoogle } = useSpeech();

  const API_BASE = 'http://localhost:8000';

  // Auto-detect location on startup
  useEffect(() => {
    if (!hasInitialized) {
      autoDetectLocation();
      setHasInitialized(true);
    }
  }, [hasInitialized]);

  // Load sessions on component mount
  useEffect(() => {
    loadSessions();
  }, []);

  // Show welcome message if location is set and no messages yet
  useEffect(() => {
    if (location.state && messages.length === 0 && !hasShownWelcome) {
      sendInitialWelcomeMessage(location);
      setHasShownWelcome(true);
    }
  }, [location.state, messages.length, hasShownWelcome]);

  const autoDetectLocation = async () => {
    try {
      if ('geolocation' in navigator) {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 10000,
            enableHighAccuracy: true
          });
        });

        const { latitude, longitude } = position.coords;

        const response = await fetch(`${API_BASE}/location`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lat: latitude, lon: longitude }),
        });

        if (response.ok) {
          const data = await response.json();
          if (!data.error) {
            const detectedLocation = {
              city: data.city || "Unknown City",
              state: data.state || "Unknown State"
            };
            setLocation(detectedLocation);
          }
        }
      }
    } catch (error) {
      console.log('Auto-location detection failed, user can set manually');
    }
  };

  const sendInitialWelcomeMessage = (detectedLocation: {city: string, state: string}) => {
    const welcomeMessage = `Hello! I'm JUNO AI, your legal assistant. I can help you understand your legal rights and provide guidance based on ${detectedLocation.state} law. 

What legal question can I help you with today? You can ask me about:
• Your rights in various situations
• Legal procedures and processes
• Understanding laws and regulations
• What to do in legal emergencies

Just type or speak your question, and I'll provide clear, helpful guidance.`;

    const initialMessage: ChatMessageType = {
      role: 'assistant',
      content: welcomeMessage,
      timestamp: new Date().toISOString(),
    };

    setMessages([initialMessage]);
  };

  const loadSessions = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/sessions`);
      if (response.ok) {
        const sessionsData = await response.json();
        setSessions(sessionsData);
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  };

  const createNewSession = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/sessions/new`, {
        method: 'POST',
      });
      if (response.ok) {
        const { session_id } = await response.json();
        setSessionId(session_id);
        setMessages([]);
        setHasShownWelcome(false);
        
        // Send welcome message for new session
        if (location.state) {
          sendInitialWelcomeMessage(location);
          setHasShownWelcome(true);
        }
        
        toast({
          title: "New session created",
          description: "You can now start a new conversation",
        });
        loadSessions();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create new session",
        variant: "destructive",
      });
    }
  };

  const loadSession = async (sessionId: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/sessions/${sessionId}`);
      if (response.ok) {
        const sessionData = await response.json();
        setSessionId(sessionId);
        setMessages(sessionData.conversation_history || []);
        setShowSessions(false);
        setHasShownWelcome(true); // Prevent welcome message for loaded sessions
        toast({
          title: "Session loaded",
          description: `Loaded conversation with ${sessionData.message_count} messages`,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load session",
        variant: "destructive",
      });
    }
  };

  const deleteSession = async (sessionId: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/sessions/${sessionId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        if (sessionId === sessionId) {
          setSessionId(null);
          setMessages([]);
          setHasShownWelcome(false);
        }
        loadSessions();
        toast({
          title: "Session deleted",
          description: "Session has been removed",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete session",
        variant: "destructive",
      });
    }
  };

  const sendMessage = async (message: string) => {
    if (!message.trim()) return;

    // If no location set, show error
    if (!location.state) {
      toast({
        title: "Location Required",
        description: "Please set your location to get legal advice",
        variant: "destructive",
      });
      return;
    }

    const userMessage: ChatMessageType = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE}/legal-response`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: message,
          location: location,
          session_id: sessionId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSessionId(data.session_id);
        
        // Preserve welcome message if it exists and this is the first user message
        const currentMessages = data.conversation_history;
        const hasWelcomeMessage = messages.length > 0 && messages[0].role === 'assistant' && messages[0].content.includes('JUNO AI');
        
        if (hasWelcomeMessage && currentMessages.length > 0) {
          // Keep the welcome message and add the backend conversation history
          const welcomeMessage = messages[0];
          setMessages([welcomeMessage, ...currentMessages]);
        } else {
          setMessages(currentMessages);
        }
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent | React.KeyboardEvent) => {
    e.preventDefault();
    if (input.trim()) {
      sendMessage(input);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.trim()) {
        sendMessage(input);
      }
    }
  };

  const handleVoiceInput = (transcript: string) => {
    // Clean the transcript to remove common unwanted phrases
    let cleanTranscript = transcript.trim();
    
    // Remove common unwanted phrases that transcription services often add
    const unwantedPhrases = [
      'thank you',
      'thanks',
      'please',
      'um',
      'uh',
      'so',
      'well',
      'you know',
      'like',
      'i mean'
    ];
    
    unwantedPhrases.forEach(phrase => {
      const regex = new RegExp(`\\b${phrase}\\b`, 'gi');
      cleanTranscript = cleanTranscript.replace(regex, '').trim();
    });
    
    // Only send if there's meaningful content
    if (cleanTranscript.length > 0) {
      // Automatically send the transcribed message instead of just setting input
      sendMessage(cleanTranscript);
    }
  };

  const handleRecordingChange = (recording: boolean) => {
    setIsRecording(recording);
    if (recording) {
      setInput('.'); // Show "." while recording
    } else {
      setInput(''); // Clear the "." when recording stops
    }
  };

  const handleLocationChange = (detectedLocation: {city: string, state: string}) => {
    setLocation(detectedLocation);
    setHasShownWelcome(false); // Reset welcome flag when location changes
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Convert messages to the format expected by ChatMessage component
  const formatMessageForComponent = (message: ChatMessageType, index: number) => ({
    id: index.toString(),
    text: message.content,
    isUser: message.role === 'user',
    timestamp: message.timestamp ? new Date(message.timestamp) : new Date()
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-amber-50 flex flex-col">
      {/* Mobile-Optimized Header */}
      <header className="bg-white/90 backdrop-blur-md border-b border-blue-200 sticky top-0 z-50 px-3 py-3 sm:px-4 sm:py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-blue-600 to-amber-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm sm:text-lg">⚖️</span>
            </div>
            <div>
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900">JUNO AI</h1>
              <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">Understanding your legal rights, simplified</p>
            </div>
          </div>

          <div className="flex items-center space-x-1 sm:space-x-2">
            <LocationDetector onLocationChange={handleLocationChange} currentLocation={location} />
            
            {/* Audio Toggle Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAudioEnabled(!isAudioEnabled)}
              className={`text-xs sm:text-sm px-2 sm:px-3 ${
                isAudioEnabled ? 'bg-blue-50 border-blue-300' : 'bg-gray-50 border-gray-300'
              }`}
            >
              {isAudioEnabled ? (
                <Volume2 className="w-3 h-3" />
              ) : (
                <VolumeX className="w-3 h-3" />
              )}
            </Button>
            
            {/* Session Management Buttons */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSessions(!showSessions)}
              className="text-xs sm:text-sm px-2 sm:px-3"
            >
              {showSessions ? 'Hide' : 'Show'} Sessions
            </Button>
            <Button
              size="sm"
              onClick={createNewSession}
              className="text-xs sm:text-sm px-2 sm:px-3"
            >
              New
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile-Optimized Main Content */}
      <div className="flex-1 flex flex-col px-3 py-3 sm:px-4 sm:py-6 max-w-4xl mx-auto w-full">
        {/* Sessions Panel - Mobile Optimized */}
        {showSessions && (
          <div className="mb-4">
            <Card className="bg-white/70 backdrop-blur-sm border border-blue-200 shadow-xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg">Chat Sessions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {sessions.map((session) => (
                    <div
                      key={session.session_id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        sessionId === session.session_id
                          ? 'bg-blue-50 border-blue-200'
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div
                          className="flex-1"
                          onClick={() => loadSession(session.session_id)}
                        >
                          <div className="text-sm font-medium">
                            {new Date(session.created_at).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-gray-500">
                            {session.message_count} messages
                          </div>
                          <div className="text-xs text-gray-400">
                            {new Date(session.last_activity).toLocaleTimeString()}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSession(session.session_id);
                          }}
                          className="text-red-500 hover:text-red-700 h-6 w-6 p-0"
                        >
                          ×
                        </Button>
                      </div>
                    </div>
                  ))}
                  {sessions.length === 0 && (
                    <div className="text-center text-gray-500 py-4">
                      No sessions yet
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Chat Area - Full height on mobile */}
        <Card className="flex-1 flex flex-col bg-white/70 backdrop-blur-sm border border-blue-200 shadow-xl min-h-0">
          {/* Messages - Scrollable area */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-3 sm:space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                {location.state ? 'Ask about your rights...' : 'Please enable location to start'}
              </div>
            ) : (
              messages.map((message, index) => (
                <ChatMessage 
                  key={index} 
                  message={formatMessageForComponent(message, index)} 
                  isAudioEnabled={isAudioEnabled}
                />
              ))
            )}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-blue-100 rounded-lg p-3 sm:p-4 max-w-xs">
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    <span className="text-sm text-blue-600">AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Mobile-Optimized Input Area */}
          <div className="border-t border-blue-200 p-3 sm:p-4 bg-white/50">
            <div className="flex items-end space-x-2 sm:space-x-3">
              <VoiceInput onTranscript={handleVoiceInput} onRecordingChange={handleRecordingChange} />

              <div className="flex-1 flex flex-col space-y-2 sm:space-y-0 sm:flex-row sm:items-center sm:space-x-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={isRecording ? "Recording..." : "Ask about your rights..."}
                  className="flex-1 border-blue-200 focus:border-blue-400 text-base sm:text-sm min-h-[44px] sm:min-h-[40px]"
                  disabled={isLoading}
                />
                <Button
                  onClick={() => handleSubmit({ preventDefault: () => {} } as any)}
                  disabled={isLoading || !input.trim()}
                  className="bg-blue-600 hover:bg-blue-700 min-h-[44px] sm:min-h-[40px] px-4 sm:px-3"
                  size="sm"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="mt-2 sm:mt-3 text-xs text-gray-500 text-center">
              Tap voice button or type your question • Based on {location?.city}, {location?.state} law
            </div>
          </div>
        </Card>

        {/* Mobile-Optimized Footer Info */}
        <div className="mt-3 sm:mt-6 text-center px-2">
          <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
            This AI assistant provides general legal information and should not be considered as legal advice.
            <br className="hidden sm:inline" />
            <span className="sm:hidden"> </span>
            For specific legal matters, please consult with a qualified attorney.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;