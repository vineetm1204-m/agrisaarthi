'use client';

import { useState, useCallback, useRef } from 'react';

// Detect language from transcript
function detectLanguage(text: string): 'hi' | 'en' {
  const hindiPattern = /[\u0900-\u097F]/; // Devanagari Unicode range
  const hindiWords = ['kya', 'hai', 'mera', 'meri', 'aap', 'hoon', 'kar', 'bata', 'mujhe', 'fasal', 'khet'];
  if (hindiPattern.test(text)) return 'hi';
  if (hindiWords.some(w => text.toLowerCase().includes(w))) return 'hi';
  return 'en';
}

function getVoice(lang: 'hi' | 'en'): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  if (lang === 'hi') {
    return voices.find(v => v.lang === 'hi-IN') ||
           voices.find(v => v.lang.startsWith('hi')) ||
           voices.find(v => v.name.includes('Google हिन्दी')) ||
           null;
  }
  return voices.find(v => v.lang === 'en-IN') ||
         voices.find(v => v.name.includes('Raveena')) ||
         voices.find(v => v.lang.startsWith('en')) ||
         null;
}

export function useSpeech() {
  const [currentLanguage, setCurrentLanguage] = useState<'hi' | 'en'>('hi');
  const [errorCount, setErrorCount] = useState(0);
  const recognitionRef = useRef<any>(null);

  // Initialize SpeechRecognition
  const initRecognition = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn("Speech recognition not supported in this browser.");
      return null;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = currentLanguage === 'hi' ? 'hi-IN' : 'en-IN';
    recognition.maxAlternatives = 3;
    recognitionRef.current = recognition;
    return recognition;
  }, [currentLanguage]);

  const speakText = useCallback((text: string, onEnd?: () => void) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.88;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    const voice = getVoice(currentLanguage);
    if (voice) utterance.voice = voice;

    if (onEnd) {
      utterance.onend = onEnd;
      utterance.onerror = onEnd; // proceed even on error
    }
    
    window.speechSynthesis.speak(utterance);
  }, [currentLanguage]);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis.cancel();
  }, []);

  const listen = useCallback((
    onResult: (text: string, lang: 'hi' | 'en') => void,
    onError: (errorType: string) => void,
    onEnd: () => void
  ) => {
    const recognition = initRecognition();
    if (!recognition) {
      onError('not-supported');
      return;
    }

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      const lang = detectLanguage(transcript);
      if (lang !== currentLanguage) {
        setCurrentLanguage(lang);
      }
      setErrorCount(0);
      onResult(transcript, lang);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setErrorCount(prev => prev + 1);
      onError(event.error);
    };

    recognition.onend = () => {
      onEnd();
    };

    try {
      recognition.start();
    } catch (e) {
      console.error("Failed to start recognition", e);
    }
  }, [initRecognition, currentLanguage]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  return {
    currentLanguage,
    setCurrentLanguage,
    speakText,
    stopSpeaking,
    listen,
    stopListening,
    errorCount,
    setErrorCount
  };
}
