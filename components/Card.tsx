'use client';

import { Card, CardElement } from '@/lib/types';
import { clsx } from 'clsx';
import { Flame, Snowflake, Zap, Wind } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  card: Card;
  selected: boolean;
  onClick: () => void;
}

const ELEMENT_CONFIG: Record<CardElement, { color: string; selectedColor: string; icon: any; glow: string; border: string; label: string }> = {
  FIRE:        { color: 'text-orange-400', selectedColor: 'text-orange-600', icon: Flame,     glow: 'bg-orange-500/15', border: 'border-orange-500/40', label: 'Fire'  },
  ICE:         { color: 'text-sky-400',    selectedColor: 'text-sky-600',    icon: Snowflake, glow: 'bg-sky-400/15',    border: 'border-sky-400/40',    label: 'Ice'   },
  ELECTRICITY: { color: 'text-yellow-400', selectedColor: 'text-yellow-600', icon: Zap,       glow: 'bg-yellow-400/15', border: 'border-yellow-400/40', label: 'Elec'  },
  WIND:        { color: 'text-emerald-400', selectedColor: 'text-emerald-600', icon: Wind,    glow: 'bg-emerald-400/15', border: 'border-emerald-500/40', label: 'Wind' },
};

function getRankLabel(rank: number): string {
  if (rank <= 10) return rank.toString();
  if (rank === 11) return 'J';
  if (rank === 12) return 'Q';
  if (rank === 13) return 'K';
  if (rank === 14) return 'A';
  return rank.toString();
}

export default function CardComponent({ card, selected, onClick }: Props) {
  const config = ELEMENT_CONFIG[card.element];
  const Icon = config.icon;

  return (
    <motion.div
      layout
      whileHover={{ y: -10, scale: 1.02 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={clsx(
        'relative w-24 h-36 rounded-2xl border-2 transition-all duration-300 cursor-pointer flex flex-col items-center justify-between p-3 select-none backdrop-blur-sm',
        selected
          ? `bg-zinc-100 ${config.border} -translate-y-8 shadow-[0_20px_50px_rgba(255,255,255,0.15)] z-30`
          : `bg-zinc-900/80 border-white/5 hover:${config.border} shadow-2xl`
      )}
    >
      {/* Upgrade shimmer */}
      {card.isUpgraded && (
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none animate-pulse" />
      )}

      {/* Selection glow */}
      {selected && (
        <motion.div
          className={clsx('absolute inset-0 rounded-2xl blur-xl -z-10 opacity-30', config.glow)}
        />
      )}

      {/* Top Row */}
      <div className="w-full flex justify-between items-start">
        <span className={clsx('font-black text-xl italic leading-none', selected ? 'text-zinc-900' : config.color)}>
          {getRankLabel(card.rank)}
        </span>
        <Icon className={clsx('w-3.5 h-3.5', selected ? 'text-zinc-700' : `${config.color} opacity-60`)} />
      </div>

      {/* Center */}
      <div className="relative flex flex-col items-center gap-1">
        <Icon className={clsx('w-10 h-10 transition-transform duration-300', selected ? 'text-zinc-900' : config.color)} />
        <span className={clsx('text-[9px] font-black uppercase tracking-widest', selected ? 'text-zinc-600' : 'text-zinc-600')}>
          {config.label}
        </span>
        {!selected && (
          <div className={clsx('absolute inset-0 blur-2xl -z-10 opacity-60', config.glow)} />
        )}
      </div>

      {/* Bottom Row (rotated) */}
      <div className="w-full flex justify-between items-end rotate-180">
        <span className={clsx('font-black text-xl italic leading-none', selected ? 'text-zinc-900' : config.color)}>
          {getRankLabel(card.rank)}
        </span>
        <Icon className={clsx('w-3.5 h-3.5', selected ? 'text-zinc-700' : `${config.color} opacity-60`)} />
      </div>

      {/* Holographic sheen */}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 rounded-2xl pointer-events-none" />

      {/* Inner border */}
      <div className={clsx(
        'absolute inset-1 border rounded-[14px] pointer-events-none transition-colors',
        selected ? 'border-zinc-900/10' : 'border-white/5'
      )} />
    </motion.div>
  );
}
