import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Square } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface VoiceInputProps {
  onTranscript: (text: string) => void;
}

const VoiceInput: React.FC<VoiceInputProps> = ({ onTranscript }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const mediaStream = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      setIsSupported(true);
    } else {
      setIsSupported(false);
    }
  }, []);

  const stopAllTracks = () => {
    if (mediaStream.current) {
      mediaStream.current.getTracks().forEach(track => {
        track.stop();
      });
      mediaStream.current = null;
    }
  };

  const startRecording = async () => {
    if (!isSupported) {
      toast({
        title: "Not Supported",
        description: "Voice input is not supported in your browser",
        variant: "destructive"
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStream.current = stream;
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (event) => {
        audioChunks.current.push(event.data);
      };

      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        await sendAudioToBackend(audioBlob);
        stopAllTracks();
      };

      mediaRecorder.current.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        stopAllTracks();
        setIsRecording(false);
        toast({
          title: "Recording Error",
          description: "An error occurred during recording",
          variant: "destructive"
        });
      };

      mediaRecorder.current.start();
      setIsRecording(true);

      toast({
        title: "Recording Started",
        description: "Speak now... Tap stop when finished",
      });
    } catch (error) {
      console.error('Error starting recording:', error);
      stopAllTracks();
      toast({
        title: "Recording Failed",
        description: "Could not start recording. Please try again.",
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      try {
        mediaRecorder.current.stop();
        setIsRecording(false);
      } catch (error) {
        console.error('Error stopping recording:', error);
        stopAllTracks();
        setIsRecording(false);
      }
    }
  };

  const sendAudioToBackend = async (audioBlob: Blob) => {
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');
  
    try {
      const response = await fetch('http://localhost:8000/transcribe', {
        method: 'POST',
        body: formData,
      });
  
      if (!response.ok) {
        throw new Error(`Backend API error: ${response.statusText}`);
      }
  
      const data = await response.json();
      onTranscript(data.transcription);
  
      toast({
        title: "Voice Recorded",
        description: "Your message has been transcribed and sent",
      });
    } catch (error) {
      console.error('Transcription error:', error);
      toast({
        title: "Transcription Error",
        description: "Failed to transcribe audio with backend service",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    return () => {
      stopAllTracks();
    };
  }, []);
  
  if (!isSupported) {
    return (
      <Button variant="outline" disabled className="opacity-50 min-h-[44px] sm:min-h-[40px] touch-manipulation">
        <MicOff className="w-4 h-4" />
      </Button>
    );
  }

  return (
    <Button
      variant={isRecording ? "destructive" : "outline"}
      onClick={isRecording ? stopRecording : startRecording}
      className={`transition-all duration-200 min-h-[44px] sm:min-h-[40px] px-3 sm:px-4 touch-manipulation ${
        isRecording ? 'animate-pulse bg-red-500 hover:bg-red-600' : 'hover:bg-blue-50'
      }`}
    >
      {isRecording ? (
        <Square className="w-4 h-4" />
      ) : (
        <Mic className="w-4 h-4" />
      )}
    </Button>
  );
};

export default VoiceInput;