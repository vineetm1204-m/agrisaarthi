'use client';

import { useState } from 'react';

export type CallStatus = 'idle' | 'connecting' | 'listening' | 'processing' | 'speaking' | 'ended';

export function useCallState() {
  const [status, setStatus] = useState<CallStatus>('idle');
  const [isMuted, setIsMuted] = useState(false);

  return {
    status,
    setStatus,
    isMuted,
    setIsMuted,
    toggleMute: () => setIsMuted(prev => !prev),
  };
}
