'use client';

export function playRingTone() {
  const ctx = new window.AudioContext();
  const playBeep = (startTime: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 440;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.3, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);
    osc.start(startTime);
    osc.stop(startTime + 0.4);
  };
  
  // 3 rings with gaps
  playBeep(ctx.currentTime);
  playBeep(ctx.currentTime + 0.7);
  playBeep(ctx.currentTime + 1.4);
  
  return ctx; // caller can close() to stop
}

export function playEndTone() {
  const ctx = new window.AudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.value = 480;
  osc.type = 'sine';
  gain.gain.setValueAtTime(0.2, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.5);
}
