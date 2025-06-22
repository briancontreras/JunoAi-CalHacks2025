
import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Volume2 } from 'lucide-react';
import { Button } from "@/components/ui/button";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface ChatMessageProps {
  message: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const handleSpeak = () => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(message.text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] sm:max-w-xs lg:max-w-md xl:max-w-lg ${message.isUser ? 'order-2' : 'order-1'}`}>
        <div
          className={`rounded-2xl p-3 sm:p-4 ${
            message.isUser
              ? 'bg-blue-600 text-white ml-auto'
              : 'bg-white border border-blue-200 shadow-sm'
          }`}
        >
          
          <div className={`prose prose-sm sm:prose-base max-w-none ${
              message.isUser ? 'text-white' : 'text-gray-800'
            }`}
          >
            <ReactMarkdown>
              {message.text}
            </ReactMarkdown>
          </div>

          
          <div className={`flex items-center justify-between mt-2 ${
            message.isUser ? 'text-blue-100' : 'text-gray-500'
          }`}>
            <span className="text-xs">
              {formatTime(message.timestamp)}
            </span>
            
            {!message.isUser && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSpeak}
                className="h-8 w-8 p-0 hover:bg-blue-50 touch-manipulation"
              >
                <Volume2 className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
