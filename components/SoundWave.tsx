'use client';

import { motion } from 'framer-motion';

export function SoundWave({ isSpeaking }: { isSpeaking: boolean }) {
  if (!isSpeaking) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-full h-full rounded-full border border-green-400"
          initial={{ opacity: 0.8, scale: 1 }}
          animate={{ opacity: 0, scale: 2.5 }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            delay: i * 0.5,
            ease: "easeOut"
          }}
        />
      ))}
    </div>
  );
}
