'use client';

import { useState, useEffect } from 'react';

export function CallTimer({ isActive }: { isActive: boolean }) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive) {
      interval = setInterval(() => setSeconds(s => s + 1), 1000);
    } else {
      setSeconds(0);
    }
    return () => clearInterval(interval);
  }, [isActive]);

  const mm = Math.floor(seconds / 60).toString().padStart(2, '0');
  const ss = (seconds % 60).toString().padStart(2, '0');

  return (
    <div className="text-white text-xl font-mono opacity-80 mt-4 tracking-widest">
      {mm}:{ss}
    </div>
  );
}
