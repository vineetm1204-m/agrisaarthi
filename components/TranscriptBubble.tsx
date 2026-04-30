import React from 'react';

export type Turn = {
  id: string;
  role: 'farmer' | 'saarthi';
  text: string;
  timestamp: Date;
  topic?: string;
};

export function TranscriptBubble({ turn }: { turn: Turn }) {
  const isFarmer = turn.role === 'farmer';
  const timeStr = turn.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={`flex w-full mb-4 ${isFarmer ? 'justify-end' : 'justify-start'}`}>
      {!isFarmer && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white font-bold mr-2 mt-1">
          S
        </div>
      )}
      <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
        isFarmer ? 'bg-green-700 text-white rounded-tr-sm' : 'bg-white/10 text-white rounded-tl-sm'
      }`}>
        <p className="text-[15px] leading-relaxed">{turn.text}</p>
        <div className={`text-[11px] mt-1 opacity-60 flex ${isFarmer ? 'justify-end' : 'justify-start'}`}>
          {timeStr} {turn.topic && `• ${turn.topic}`}
        </div>
      </div>
    </div>
  );
}
