'use client';

import { useGameStore } from '@/store/useGameStore';
import { Trophy, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function WinView() {
  const { initializeGame } = useGameStore();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full bg-[#050505] relative overflow-hidden">
      {/* Radiant Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(234,179,8,0.1)_0%,transparent_100%)]" />
      
      <motion.div 
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative z-10 flex flex-col items-center gap-12"
      >
        <div className="relative">
          <motion.div 
            animate={{ y: [0, -20, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            className="p-12 bg-zinc-900/50 border border-yellow-500/30 rounded-full backdrop-blur-xl shadow-[0_0_80px_rgba(234,179,8,0.2)]"
          >
            <Trophy className="w-24 h-24 text-yellow-500 fill-yellow-500/10" />
          </motion.div>
          <motion.div 
            animate={{ scale: [1, 1.5, 1], opacity: [0.2, 0.5, 0.2] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute inset-0 bg-yellow-500/20 rounded-full blur-3xl -z-10"
          />
        </div>

        <div className="text-center flex flex-col gap-4">
          <h1 className="text-8xl font-black uppercase tracking-tight text-zinc-100 italic">
            Conquered
          </h1>
          <p className="text-zinc-500 font-mono uppercase tracking-[0.5em] text-xs">Light returns to the depths</p>
        </div>

        <motion.button 
          whileHover={{ scale: 1.05, gap: '2rem' }}
          whileTap={{ scale: 0.95 }}
          onClick={() => initializeGame('BERSERKER')}
          className="group flex items-center gap-6 px-12 py-5 bg-yellow-500 text-zinc-950 font-black uppercase tracking-[0.2em] rounded-2xl transition-all shadow-[0_20px_60px_rgba(234,179,8,0.3)]"
        >
          <span>Descend Further</span>
          <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
        </motion.button>
      </motion.div>

      {/* Light Rays Effect */}
      <div className="absolute top-0 left-1/4 w-[1px] h-full bg-gradient-to-b from-yellow-500/0 via-yellow-500/20 to-yellow-500/0 rotate-12 blur-[1px]" />
      <div className="absolute top-0 right-1/4 w-[1px] h-full bg-gradient-to-b from-yellow-500/0 via-yellow-500/20 to-yellow-500/0 -rotate-12 blur-[1px]" />
    </div>
  );
}
