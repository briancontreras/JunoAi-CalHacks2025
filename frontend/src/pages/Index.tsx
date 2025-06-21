
import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Send, MapPin, Volume2, VolumeX } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import LocationDetector from "@/components/LocationDetector";
import ChatMessage from "@/components/ChatMessage";
import VoiceInput from "@/components/VoiceInput";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hello! I'm your AI legal rights assistant. I can help you understand your rights based on your location. How can I assist you today?",
      isUser: false,
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [location, setLocation] = useState<string>('California');
  const [isSpeechEnabled, setIsSpeechEnabled] = useState(true);
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: text.trim(),
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      // Simulate AI response with location-aware content
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: `Based on ${location} law, here's what you need to know: ${getLocationSpecificResponse(text, location)}`,
        isUser: false,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiResponse]);

      // Text-to-speech for AI response
      if (isSpeechEnabled && 'speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(aiResponse.text);
        utterance.rate = 0.9;
        utterance.pitch = 1;
        window.speechSynthesis.speak(utterance);
      }

    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to get AI response. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getLocationSpecificResponse = (question: string, location: string): string => {
    const responses = {
      'California': "In California, you have strong consumer protection rights under the California Consumer Privacy Act (CCPA) and robust tenant protections. For employment issues, California is an at-will employment state but has extensive anti-discrimination laws.",
      'New York': "New York State provides comprehensive worker protections and tenant rights. The state has strict anti-discrimination laws and strong consumer protection measures.",
      'Texas': "Texas follows at-will employment principles with specific state regulations. Property rights are well-defined, and the state has its own consumer protection statutes.",
      'Florida': "Florida law provides specific protections for residents including homestead exemptions and unique property rights. Consumer protection is governed by state-specific statutes."
    };

    return responses[location as keyof typeof responses] || 
           "I can help you understand your rights based on local and federal laws. Please provide more specific details about your situation.";
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(inputText);
    }
  };

  const toggleSpeech = () => {
    setIsSpeechEnabled(!isSpeechEnabled);
    if (!isSpeechEnabled) {
      toast({
        title: "Speech Enabled",
        description: "AI responses will now be read aloud"
      });
    } else {
      window.speechSynthesis.cancel();
      toast({
        title: "Speech Disabled",
        description: "AI responses will no longer be read aloud"
      });
    }
  };

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
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900">AI Rights Assistant</h1>
              <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">Understanding your legal rights, simplified</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-1 sm:space-x-2">
            <LocationDetector onLocationChange={setLocation} currentLocation={location} />
            <Button
              variant={isSpeechEnabled ? "default" : "outline"}
              size="sm"
              onClick={toggleSpeech}
              className="p-2 sm:px-3"
            >
              {isSpeechEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              <span className="hidden md:inline ml-2">
                {isSpeechEnabled ? 'Audio On' : 'Audio Off'}
              </span>
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile-Optimized Main Content */}
      <div className="flex-1 flex flex-col px-3 py-3 sm:px-4 sm:py-6 max-w-4xl mx-auto w-full">
        {/* Chat Area - Full height on mobile */}
        <Card className="flex-1 flex flex-col bg-white/70 backdrop-blur-sm border border-blue-200 shadow-xl min-h-0">
          {/* Messages - Scrollable area */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-3 sm:space-y-4">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
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
              <VoiceInput onTranscript={handleSendMessage} />
              
              <div className="flex-1 flex flex-col space-y-2 sm:space-y-0 sm:flex-row sm:items-center sm:space-x-2">
                <Input
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask about your rights..."
                  className="flex-1 border-blue-200 focus:border-blue-400 text-base sm:text-sm min-h-[44px] sm:min-h-[40px]"
                  disabled={isLoading}
                />
                <Button
                  onClick={() => handleSendMessage(inputText)}
                  disabled={isLoading || !inputText.trim()}
                  className="bg-blue-600 hover:bg-blue-700 min-h-[44px] sm:min-h-[40px] px-4 sm:px-3"
                  size="sm"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <div className="mt-2 sm:mt-3 text-xs text-gray-500 text-center">
              Tap voice button or type your question • Based on {location} law
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
