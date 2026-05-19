'use client';

import { useGameStore } from '@/store/useGameStore';
import { Skull, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

export default function GameOverView() {
  const { initializeGame } = useGameStore();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full bg-[#050505] relative overflow-hidden">
      {/* Dramatic Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(185,28,28,0.15)_0%,transparent_100%)]" />
      <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />

      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative z-10 flex flex-col items-center gap-12"
      >
        <div className="relative">
          <motion.div 
            animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
            transition={{ repeat: Infinity, duration: 6 }}
            className="p-10 bg-zinc-900/50 border border-red-900/40 rounded-full backdrop-blur-xl shadow-[0_0_100px_rgba(239,68,68,0.2)]"
          >
            <Skull className="w-24 h-24 text-red-600 fill-red-600/10" />
          </motion.div>
          {/* Particles/Embers placeholder */}
          <div className="absolute -inset-10 bg-red-500/10 blur-[60px] rounded-full -z-10 animate-pulse" />
        </div>

        <div className="text-center flex flex-col gap-4">
          <h1 className="text-8xl font-black uppercase tracking-[-0.05em] text-zinc-100 italic">
            <span className="text-red-600">Fate</span> Sealed
          </h1>
          <p className="text-zinc-500 font-mono uppercase tracking-[0.5em] text-xs">The dungeon claims another soul</p>
        </div>

        <motion.button 
          whileHover={{ scale: 1.05, boxShadow: "0 0 40px rgba(255,255,255,0.1)" }}
          whileTap={{ scale: 0.95 }}
          onClick={() => initializeGame('BERSERKER')}
          className="group flex items-center gap-4 px-12 py-5 bg-zinc-100 text-zinc-950 font-black uppercase tracking-[0.2em] rounded-2xl transition-all"
        >
          <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
          <span>Resurrect</span>
        </motion.button>
      </motion.div>

      {/* Vignette */}
      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_150px_rgba(0,0,0,1)]" />
    </div>
  );
}
