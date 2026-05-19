'use client';

import { useGameStore } from '@/store/useGameStore';
import { PlayerClass } from '@/lib/types';
import { motion } from 'framer-motion';
import { Shield, Sparkles, Zap, Eye, Sword } from 'lucide-react';
import { clsx } from 'clsx';

const CLASSES: Array<{
  id: PlayerClass;
  name: string;
  icon: any;
  color: string;
  desc: string;
  focus: string;
}> = [
  {
    id: 'BERSERKER',
    name: 'Berserker',
    icon: Sword,
    color: 'from-red-600 to-orange-500',
    desc: 'Aggressive melee fighter. Gains bonus damage on FIRE spells and heals on kills.',
    focus: 'Fire & Electricity',
  },
  {
    id: 'PALADIN',
    name: 'Paladin',
    icon: Shield,
    color: 'from-sky-500 to-indigo-500',
    desc: 'Holy defender. ICE spells heal you. Freeze lasts longer.',
    focus: 'Ice & Fire',
  },
  {
    id: 'WIZARD',
    name: 'Wizard',
    icon: Sparkles,
    color: 'from-purple-600 to-violet-500',
    desc: 'Master of elements. ELECTRICITY chains exponentially faster.',
    focus: 'Electricity & Fire',
  },
  {
    id: 'OVERSEER',
    name: 'Overseer',
    icon: Eye,
    color: 'from-emerald-500 to-teal-500',
    desc: 'Tactical rogue. WIND spells draw more cards and generate gold.',
    focus: 'Wind & Ice',
  },
];

export default function StartScreenView() {
  const { initializeGame } = useGameStore();

  return (
    <div className="relative w-full h-screen overflow-hidden flex flex-col items-center justify-center bg-zinc-950 p-6">
      {/* Background elements */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-red-500/5 rounded-full blur-[150px] pointer-events-none" />

      <motion.div
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-center mb-16 z-10"
      >
        <h1 className="text-7xl font-black uppercase tracking-tighter mb-4 text-zinc-100">
          Dungeon <span className="text-red-500">Sweeper</span>
        </h1>
        <p className="text-zinc-500 font-medium tracking-widest uppercase text-sm">
          Select your class to begin the descent
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-6xl z-10">
        {CLASSES.map((cls, i) => {
          const Icon = cls.icon;
          return (
            <motion.button
              key={cls.id}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => initializeGame(cls.id)}
              className="group relative flex flex-col items-start p-8 rounded-3xl bg-zinc-900/50 border border-white/5 hover:bg-zinc-900 transition-all text-left overflow-hidden h-full"
            >
              {/* Hover Glow */}
              <div className={clsx(
                "absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500 bg-gradient-to-br",
                cls.color
              )} />
              
              <div className={clsx(
                "w-16 h-16 rounded-2xl mb-6 flex items-center justify-center bg-gradient-to-br shadow-lg group-hover:scale-110 transition-transform duration-500",
                cls.color
              )}>
                <Icon className="w-8 h-8 text-white" />
              </div>

              <h3 className="text-2xl font-black uppercase tracking-tight text-zinc-100 mb-2">
                {cls.name}
              </h3>
              
              <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
                <Zap className="w-3 h-3" />
                Deck Focus: {cls.focus}
              </div>

              <p className="text-zinc-400 text-sm leading-relaxed mt-auto">
                {cls.desc}
              </p>
              
              {/* Inner border */}
              <div className="absolute inset-1 border border-white/5 rounded-[20px] pointer-events-none group-hover:border-white/10 transition-colors" />
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
