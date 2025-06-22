import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Square } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  onRecordingChange?: (isRecording: boolean) => void;
}

const VoiceInput: React.FC<VoiceInputProps> = ({ onTranscript, onRecordingChange }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      setIsSupported(true);
    } else {
      setIsSupported(false);
    }
  }, []);

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
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (event) => {
        audioChunks.current.push(event.data);
      };

      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' }); // or 'audio/wav' depending on format
        await sendAudioToBackend(audioBlob);
      };

      mediaRecorder.current.start();
      setIsRecording(true);
      onRecordingChange?.(true);

      toast({
        title: "Recording Started",
        description: "Speak now... Tap stop when finished",
      });
    } catch (error) {
      toast({
        title: "Recording Failed",
        description: "Could not start recording. Please try again.",
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
      onRecordingChange?.(false);
    }
  };

  const sendAudioToBackend = async (audioBlob: Blob) => {
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');
  
    try {
      const response = await fetch('http://localhost:8000/transcribe', {  // adjust URL to your backend
        method: 'POST',
        body: formData,
      });
  
      if (!response.ok) {
        throw new Error(`Backend API error: ${response.statusText}`);
      }
  
      const data = await response.json();
      onTranscript(data.transcription);  // backend returns { transcription: "text" }
  
      toast({
        title: "Voice Recorded",
        description: "Your message has been transcribed and sent",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Transcription Error",
        description: "Failed to transcribe audio with backend service",
        variant: "destructive",
      });
    }
  };
  
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