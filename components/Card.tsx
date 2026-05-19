'use client';

import { Card, CardElement } from '@/lib/types';
import { clsx } from 'clsx';
import { Flame, Snowflake, Zap, Wind, X } from 'lucide-react';
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



/** Renders 1–5 small dots showing remaining uses. 999 = ∞ */
function DurabilityPips({ current, max }: { current: number; max: number }) {
  if (max >= 999) {
    return <span className="text-[8px] text-zinc-500 font-bold">∞</span>;
  }
  const pips = Math.min(max, 5); // show at most 5 pips
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: pips }).map((_, i) => (
        <div
          key={i}
          className={clsx(
            'w-1.5 h-1.5 rounded-full',
            i < current ? 'bg-emerald-400' : 'bg-zinc-700'
          )}
        />
      ))}
    </div>
  );
}

export default function CardComponent({ card, selected, onClick }: Props) {
  const isAsh = card.isAsh ?? false;
  const config = isAsh ? null : ELEMENT_CONFIG[card.element];
  const Icon = config ? config.icon : X;

  return (
    <motion.div
      layout
      whileHover={isAsh ? {} : { y: -10, scale: 1.02 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={clsx(
        'relative w-24 h-36 rounded-2xl border-2 transition-all duration-300 cursor-pointer flex flex-col items-center justify-between p-3 select-none backdrop-blur-sm',
        isAsh
          ? 'bg-zinc-900/50 border-zinc-700/40 opacity-60 cursor-not-allowed'
          : selected
            ? `bg-zinc-100 ${config!.border} -translate-y-8 shadow-[0_20px_50px_rgba(255,255,255,0.15)] z-30`
            : `bg-zinc-900/80 border-white/5 hover:${config!.border} shadow-2xl`
      )}
    >
      {/* Ash overlay */}
      {isAsh && (
        <div className="absolute inset-0 rounded-2xl bg-zinc-900/60 flex flex-col items-center justify-center gap-1 z-10">
          <X className="w-6 h-6 text-zinc-600" />
          <span className="text-[8px] text-zinc-600 font-black uppercase tracking-widest">ASH</span>
        </div>
      )}

      {/* Exhaust badge */}
      {card.isExhaust && !isAsh && (
        <div className="absolute -top-1.5 -right-1.5 bg-purple-600 text-white text-[7px] font-black uppercase rounded-full px-1 py-0.5 z-20">
          EXHST
        </div>
      )}

      {/* Upgrade shimmer */}
      {card.isUpgraded && !isAsh && (
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none animate-pulse" />
      )}

      {/* Selection glow */}
      {selected && !isAsh && config && (
        <motion.div
          className={clsx('absolute inset-0 rounded-2xl blur-xl -z-10 opacity-30', config.glow)}
        />
      )}

      {/* Top Row */}
      <div className="w-full flex justify-start items-start">
        <Icon className={clsx('w-5 h-5', isAsh ? 'text-zinc-600' : selected ? 'text-zinc-700' : `${config!.color} opacity-60`)} />
      </div>

      {/* Center */}
      {!isAsh && config && (
        <div className="relative flex flex-col items-center gap-1">
          <Icon className={clsx('w-10 h-10 transition-transform duration-300', selected ? 'text-zinc-900' : config.color)} />
          <span className={clsx('text-[9px] font-black uppercase tracking-widest', selected ? 'text-zinc-600' : 'text-zinc-600')}>
            {config.label}
          </span>
          {!selected && (
            <div className={clsx('absolute inset-0 blur-2xl -z-10 opacity-60', config.glow)} />
          )}
        </div>
      )}

      {/* Durability Pips (bottom) */}
      {!isAsh && (
        <div className="w-full flex flex-col items-center gap-1">
          <DurabilityPips current={card.currentUses ?? 3} max={card.maxUses ?? 3} />
          {/* Bottom row rank (rotated) */}
          <div className="w-full flex justify-start items-end rotate-180">
            <Icon className={clsx('w-5 h-5', selected ? 'text-zinc-700' : `${config!.color} opacity-60`)} />
          </div>
        </div>
      )}

      {/* Holographic sheen */}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 rounded-2xl pointer-events-none" />
      <div className={clsx(
        'absolute inset-1 border rounded-[14px] pointer-events-none transition-colors',
        selected ? 'border-zinc-900/10' : 'border-white/5'
      )} />
    </motion.div>
  );
}
