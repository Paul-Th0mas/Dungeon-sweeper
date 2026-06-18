'use client';

import { useGameStore } from '@/store/useGameStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Zap } from 'lucide-react';
import { chooseLevelUpPassive } from '@/lib/actions';
import { PassiveAbility, LevelUpChoice } from '@/lib/types';

const ELEMENT_COLORS: Record<string, string> = {
  BERSERKER: 'from-red-600 to-orange-500',
  PALADIN:   'from-sky-500 to-indigo-500',
  WIZARD:    'from-purple-600 to-violet-500',
  OVERSEER:  'from-emerald-500 to-teal-500',
};

export default function LevelUpModal() {
  const { player, pendingLevelUpChoices, chooseLevelUp } = useGameStore();

  if (!pendingLevelUpChoices || pendingLevelUpChoices.length === 0 || !player) return null;

  const gradient = ELEMENT_COLORS[player.class] ?? 'from-yellow-500 to-amber-400';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md">
      {/* Radial glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-yellow-500/10 rounded-full blur-[140px]" />
      </div>

      <motion.div
        initial={{ scale: 0.8, opacity: 0, y: 40 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="relative z-10 w-full max-w-2xl px-6"
      >
        {/* Header */}
        <div className="text-center mb-10">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.15, 1] }}
            transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 2 }}
            className="inline-flex p-4 bg-yellow-500/20 rounded-full mb-4 border border-yellow-500/30"
          >
            <Star className="w-10 h-10 text-yellow-400 fill-yellow-400/50" />
          </motion.div>
          <div className="text-xs font-black uppercase tracking-[0.4em] text-yellow-500 mb-2">
            Level Up!
          </div>
          <h2 className={`text-5xl font-black uppercase tracking-tighter bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>
            Level {player.level}
          </h2>
          <p className="text-zinc-500 mt-3 font-medium">
            Choose a passive ability to strengthen your {player.class.toLowerCase()}.
          </p>
        </div>

        {/* Choices */}
        <div className="grid grid-cols-1 gap-4">
          {pendingLevelUpChoices.map((choice: LevelUpChoice, i: number) => (
            <motion.button
              key={choice.passive}
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.12 }}
              onClick={() => chooseLevelUp(choice.passive as PassiveAbility)}
              className="group flex items-center gap-5 p-5 bg-zinc-900/80 border border-white/5 rounded-2xl hover:border-yellow-500/50 hover:bg-yellow-500/5 transition-all text-left"
            >
              <div className="text-3xl select-none">{choice.icon}</div>
              <div className="flex-1">
                <div className="font-black text-zinc-100 group-hover:text-yellow-400 transition-colors text-lg">
                  {choice.name}
                </div>
                <div className="text-sm text-zinc-500 mt-1">{choice.description}</div>
              </div>
              <Zap className="w-5 h-5 text-zinc-700 group-hover:text-yellow-500 transition-colors shrink-0" />
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
