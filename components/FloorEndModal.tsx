'use client';

import { useGameStore } from '@/store/useGameStore';
import { motion } from 'framer-motion';
import { ArrowDown, MapPin, Sparkles, ChevronRight } from 'lucide-react';
import { useState } from 'react';

export default function FloorEndModal() {
  const { player, descend, stayOnFloor } = useGameStore();
  const [loading, setLoading] = useState<'descend' | 'stay' | null>(null);

  if (!player) return null;

  const nextFloor = player.floor + 1;

  const handleDescend = async () => {
    setLoading('descend');
    await descend();
    setLoading(null);
  };

  const handleStay = async () => {
    setLoading('stay');
    await stayOnFloor();
    setLoading(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
      {/* Ambient radial glow behind modal */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.12)_0%,transparent_65%)] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.88, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="relative mx-4 max-w-lg w-full"
      >
        {/* Card */}
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/90 backdrop-blur-xl shadow-[0_32px_80px_rgba(0,0,0,0.6)]">

          {/* Top glint */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-indigo-400/50 to-transparent" />

          {/* Portal visual */}
          <div className="flex justify-center pt-10 pb-6">
            <div className="relative">
              {/* Outer ring pulse */}
              <motion.div
                animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.6, 0.3] }}
                transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
                className="absolute inset-0 rounded-full bg-indigo-500/20 blur-2xl"
              />
              {/* Portal circle */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
                className="relative w-28 h-28 rounded-full border-2 border-dashed border-indigo-400/40 flex items-center justify-center"
              >
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-600/60 to-violet-700/60 backdrop-blur-sm flex items-center justify-center shadow-[0_0_40px_rgba(99,102,241,0.4)]">
                  <ArrowDown className="w-9 h-9 text-indigo-200" />
                </div>
              </motion.div>
            </div>
          </div>

          {/* Text block */}
          <div className="text-center px-8 pb-2">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-400">
                Floor {player.floor} Complete
              </span>
              <Sparkles className="w-4 h-4 text-indigo-400" />
            </div>
            <h1 className="text-4xl font-black text-zinc-100 tracking-tight leading-none mb-3">
              The Stairwell<br />
              <span className="text-indigo-400">Beckons</span>
            </h1>
            <p className="text-zinc-400 text-sm font-medium leading-relaxed max-w-xs mx-auto">
              A crumbling staircase spirals down into{' '}
              <span className="text-zinc-200 font-semibold">Floor {nextFloor}</span>.
              You may descend now, or linger to finish what you started.
            </p>
          </div>

          {/* Stats strip */}
          <div className="mx-6 my-5 px-5 py-3 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex justify-between text-xs font-bold">
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-zinc-500 uppercase tracking-widest text-[9px]">HP</span>
              <span className="text-zinc-200 font-mono">{player.currentHp}/{player.maxHp}</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-zinc-500 uppercase tracking-widest text-[9px]">Gold</span>
              <span className="text-yellow-400 font-mono">{player.gold}g</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-zinc-500 uppercase tracking-widest text-[9px]">Floor</span>
              <span className="text-indigo-300 font-mono">{player.floor} → {nextFloor}</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-zinc-500 uppercase tracking-widest text-[9px]">Heal</span>
              <span className="text-emerald-400 font-mono">+{Math.floor(player.maxHp * 0.1)} HP</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-3 px-6 pb-8">
            {/* Descend button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleDescend}
              disabled={loading !== null}
              id="btn-descend-floor"
              className="relative overflow-hidden flex items-center justify-between gap-4 w-full px-6 py-4 rounded-2xl
                         bg-gradient-to-r from-indigo-600 to-violet-600 
                         text-white font-black uppercase tracking-[0.15em] text-sm
                         shadow-[0_12px_40px_rgba(99,102,241,0.35)]
                         disabled:opacity-60 disabled:cursor-not-allowed
                         transition-shadow hover:shadow-[0_16px_50px_rgba(99,102,241,0.5)]"
            >
              <span className="flex items-center gap-3">
                <ArrowDown className="w-5 h-5" />
                {loading === 'descend' ? 'Descending…' : `Descend to Floor ${nextFloor}`}
              </span>
              <ChevronRight className="w-5 h-5 opacity-60" />
              {/* Shine overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity" />
            </motion.button>

            {/* Stay button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleStay}
              disabled={loading !== null}
              id="btn-stay-floor"
              className="flex items-center justify-between gap-4 w-full px-6 py-4 rounded-2xl
                         border border-white/10 bg-white/[0.04]
                         text-zinc-300 font-bold uppercase tracking-[0.12em] text-sm
                         disabled:opacity-60 disabled:cursor-not-allowed
                         hover:bg-white/[0.07] hover:border-white/20
                         transition-all"
            >
              <span className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-zinc-400" />
                {loading === 'stay' ? 'Returning…' : 'Stay & Keep Exploring'}
              </span>
              <span className="text-[10px] text-zinc-500 font-bold normal-case tracking-wider">Keep key</span>
            </motion.button>
          </div>

          {/* Bottom tip */}
          <div className="border-t border-white/[0.06] px-6 py-3 text-center">
            <p className="text-[10px] text-zinc-600 uppercase tracking-widest">
              You can return to the stairwell at any time
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
