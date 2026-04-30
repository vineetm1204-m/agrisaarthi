'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Phone, PhoneOff, MicOff, Mic, Download } from 'lucide-react';
import { useCallState } from '../hooks/useCallState';
import { useSpeech } from '../hooks/useSpeech';
import { playRingTone, playEndTone } from '../hooks/useAudioTone';
import { SoundWave } from './SoundWave';
import { CallTimer } from './CallTimer';
import { TranscriptBubble, Turn } from './TranscriptBubble';

// Fallback dummy user since Auth isn't fully integrated here
const DUMMY_FARMER_ID = 'farmer_123';

export function CallUI() {
  const { status, setStatus, isMuted, toggleMute } = useCallState();
  const { currentLanguage, setCurrentLanguage, speakText, stopSpeaking, listen, stopListening, errorCount, setErrorCount } = useSpeech();
  
  const [turns, setTurns] = useState<Turn[]>([]);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns]);

  const startListeningLoop = useCallback(() => {
    if (status === 'ended' || isMuted) return;
    
    setStatus('listening');
    listen(
      async (text, lang) => {
        // Stop listening, set status to processing
        stopListening();
        setStatus('processing');
        
        // Add Farmer Bubble
        setTurns(prev => [...prev, {
          id: Math.random().toString(),
          role: 'farmer',
          text,
          timestamp: new Date()
        }]);

        // Call API
        try {
          const res = await fetch('/api/ivr', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text,
              language: lang,
              farmer_id: DUMMY_FARMER_ID,
              conversation_history: turns.slice(-6).map(t => ({ role: t.role === 'farmer' ? 'user' : 'assistant', content: t.text }))
            })
          });

          if (!res.ok) throw new Error('API Error');

          const data = await res.json();
          
          setStatus('speaking');
          setTurns(prev => [...prev, {
            id: Math.random().toString(),
            role: 'saarthi',
            text: data.reply,
            timestamp: new Date(),
            topic: data.detected_topic
          }]);

          speakText(data.reply, () => {
            // After speaking, go back to listening
            // After speaking, go back to listening
            startListeningLoop();
          });

        } catch (error) {
          console.error(error);
          const fallback = lang === 'hi' 
            ? 'Kuch takneeki samasya aayi hai. Kripya thodi der baad dobara try karein.'
            : 'I encountered a technical issue. Please try again in a moment.';
          
          setStatus('speaking');
          setTurns(prev => [...prev, {
            id: Math.random().toString(), role: 'saarthi', text: fallback, timestamp: new Date()
          }]);
          
          speakText(fallback, () => {
            startListeningLoop();
          });
        }
      },
      (errorType) => {
        if (errorType === 'not-allowed') {
          speakText('Maafi chahta hoon. Microphone ki permission nahi mili. Kripya browser settings mein mic allow karein.');
          endCall();
        } else if (errorType === 'no-speech') {
          setStatus('speaking');
          speakText('Mujhe aawaz nahi aayi. Kya aap dobara bol sakte hain?', () => {
             startListeningLoop();
          });
        } else if (errorType === 'network') {
          setStatus('speaking');
          speakText('Internet connection mein kuch dikkat hai. Thodi der baad try karein.', () => {
             startListeningLoop();
          });
        }
        
        if (errorCount >= 3) {
           speakText('Bahut baar takleef hui. Call band kar raha hoon. Baad mein try karein.');
           endCall();
        }
      },
      () => {
         // onEnd of recognition, if we are still 'listening', it means we stopped without result (maybe timeout)
         // we should probably loop it again if not muted
         if (status === 'listening' && !isMuted) {
           // startListeningLoop();
         }
      }
    );
  }, [status, isMuted, listen, stopListening, turns, speakText, errorCount]);

  // Effect to handle mute
  useEffect(() => {
    if (isMuted) {
      stopListening();
      if (status === 'listening') {
         // keep status visually as listening, but actual recording is stopped
      }
    } else {
      if (status === 'listening') {
        startListeningLoop();
      }
    }
  }, [isMuted]);

  const handleStartCall = () => {
    setStatus('connecting');
    const ringCtx = playRingTone();
    
    setTimeout(() => {
      ringCtx.close();
      setStatus('speaking');
      
      const greetingHi = "नमस्ते किसान भाई! मैं साथी हूँ — आपका AgriSaarthi AI सहायक। आज मैं आपकी फसल, मौसम, मंडी भाव, सिंचाई, और सरकारी योजनाओं में मदद कर सकता हूँ। हिंदी या अंग्रेजी — जैसे चाहें बात करें। बताइए — आज मैं आपकी क्या मदद कर सकता हूँ?";
      const greetingEn = "Namaste Kisan Bhai! I am Saarthi — your AgriSaarthi AI assistant. Today I can help you with your crops, weather, mandi prices, irrigation, and government schemes. Please speak in Hindi or English — whichever you prefer. Tell me — how can I help you today?";
      const greeting = currentLanguage === 'hi' ? greetingHi : greetingEn;
      
      setTurns([{
        id: Math.random().toString(),
        role: 'saarthi',
        text: greeting,
        timestamp: new Date()
      }]);

      speakText(greeting, () => {
        startListeningLoop();
      });
      
    }, 2000);
  };

  const endCall = () => {
    stopListening();
    stopSpeaking();
    playEndTone();
    setStatus('ended');
    // We could fetch summary here via API if needed
  };

  const getStatusText = () => {
    if (isMuted) return "Mute hai...";
    switch(status) {
      case 'idle': return "Taiyaar hain...";
      case 'connecting': return "Jod rahe hain...";
      case 'listening': return "Sun raha hoon...";
      case 'processing': return "Soch raha hoon...";
      case 'speaking': return "Bol raha hoon...";
      case 'ended': return "Call khatam hui";
      default: return "";
    }
  };

  const handleDownloadTranscript = () => {
    const text = turns.map(t => `[${t.timestamp.toLocaleTimeString()}] ${t.role.toUpperCase()}: ${t.text}`).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Agrisaarthi_Transcript_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-screen bg-[#0f2d1f] text-white overflow-hidden relative">
      {/* Top Bar */}
      <div className="pt-8 pb-4 flex flex-col items-center z-10 shrink-0">
        <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center mb-2">
          {/* Leaf Icon simplified */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>
        </div>
        <h1 className="text-xl font-semibold opacity-90">Saarthi — AI Kisan Sahayak</h1>
      </div>

      {/* Main Avatar Area */}
      <div className="flex-1 flex flex-col items-center justify-center min-h-[300px] z-10 shrink-0">
        <div className="relative flex items-center justify-center w-32 h-32 mb-8">
          <SoundWave isSpeaking={status === 'speaking'} />
          
          <div className={`relative w-28 h-28 rounded-full flex items-center justify-center text-4xl font-bold z-10 shadow-lg transition-all duration-300 ${
             status === 'listening' ? 'bg-blue-600 animate-pulse' : 
             status === 'processing' ? 'bg-green-700' : 
             status === 'ended' ? 'bg-gray-600' : 'bg-green-600'
          }`}>
            {status === 'processing' ? (
              <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : "S"}
          </div>
        </div>

        <h2 className="text-2xl font-medium tracking-wide">{getStatusText()}</h2>
        {(status !== 'idle' && status !== 'ended') && <CallTimer isActive={true} />}
      </div>

      {/* Transcript Panel */}
      {(turns.length > 0) && (
        <div className="flex-1 overflow-y-auto px-4 pb-32 z-10">
          <div className="bg-black/20 rounded-t-3xl p-4 min-h-full">
            {turns.map(turn => (
              <TranscriptBubble key={turn.id} turn={turn} />
            ))}
            <div ref={transcriptEndRef} />
          </div>
        </div>
      )}

      {/* Summary Card after call */}
      {status === 'ended' && turns.length > 0 && (
         <div className="absolute inset-x-4 bottom-32 bg-black/40 rounded-2xl p-6 backdrop-blur-md z-20 border border-white/10">
            <h3 className="text-xl font-bold mb-4">Call Summary</h3>
            <p className="opacity-80 mb-2">Duration: Total Turns {turns.length}</p>
            <button onClick={handleDownloadTranscript} className="mt-4 flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl transition-colors">
              <Download size={18} /> Download Transcript
            </button>
         </div>
      )}

      {/* Bottom Controls */}
      <div className="absolute bottom-0 w-full p-8 flex justify-center items-center gap-8 bg-gradient-to-t from-[#0f2d1f] to-transparent z-20">
        {status === 'idle' || status === 'ended' ? (
          <button 
            onClick={handleStartCall}
            className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(34,197,94,0.4)] hover:scale-105 transition-transform"
          >
            <Phone size={32} className="text-white fill-current" />
          </button>
        ) : (
          <>
            <button 
              onClick={toggleMute}
              className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${
                isMuted ? 'bg-amber-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
            </button>
            <button 
              onClick={endCall}
              className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.4)] hover:scale-105 transition-transform"
            >
              <PhoneOff size={32} className="text-white" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
