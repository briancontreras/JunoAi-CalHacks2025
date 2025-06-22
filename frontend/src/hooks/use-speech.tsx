import { useState } from 'react';

// Helper function to clean text for speech
const cleanTextForSpeech = (text: string): string => {
  return text
    // Remove markdown bold formatting
    .replace(/\*\*(.*?)\*\*/g, '$1')
    // Remove markdown italic formatting
    .replace(/\*(.*?)\*/g, '$1')
    // Remove markdown code formatting
    .replace(/`(.*?)`/g, '$1')
    // Remove markdown links
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove any remaining asterisks
    .replace(/\*/g, '')
    // Remove any remaining backticks
    .replace(/`/g, '')
    // Clean up extra spaces
    .replace(/\s+/g, ' ')
    .trim();
};

export const useSpeech = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const speakWithGoogle = async (text: string) => {
    try {
      setIsSpeaking(true);
      
      // Clean the text before sending to speech API
      const cleanText = cleanTextForSpeech(text);
      console.log('Original text:', text.substring(0, 50) + '...');
      console.log('Clean text for speech:', cleanText.substring(0, 50) + '...');
      
      const response = await fetch('http://localhost:8000/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: cleanText }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('TTS API error:', errorText);
        throw new Error(`TTS failed: ${response.status} ${response.statusText}`);
      }

      const audioBlob = await response.blob();
      console.log('Received audio blob:', audioBlob.size, 'bytes');
      
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      audio.onended = () => {
        console.log('Audio finished playing');
        URL.revokeObjectURL(audioUrl);
        setIsSpeaking(false);
      };
      audio.onerror = (e) => {
        console.error('Audio error:', e);
        URL.revokeObjectURL(audioUrl);
        setIsSpeaking(false);
      };
      
      await audio.play();
      
    } catch (error) {
      console.error('Speech error:', error);
      
      // Fallback to browser speech synthesis with cleaned text
      console.log('Falling back to browser speech synthesis');
      const cleanText = cleanTextForSpeech(text);
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 0.8;
      
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      
      window.speechSynthesis.speak(utterance);
    }
  };

  return {
    speakWithGoogle,
    isSpeaking,
    cleanTextForSpeech
  };
};
