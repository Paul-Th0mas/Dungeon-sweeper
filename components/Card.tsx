'use client';

import { Card, CardElement } from '@/lib/types';
import { clsx } from 'clsx';
import { Flame, Droplets, Wind, Mountain, X, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  card: Card;
  selected: boolean;
  onClick: () => void;
}

const ELEMENT_CONFIG: Record<string, { color: string; selectedColor: string; icon: any; glow: string; border: string; label: string }> = {
  FIRE:        { color: 'text-orange-400', selectedColor: 'text-orange-600', icon: Flame,     glow: 'bg-orange-500/15', border: 'border-orange-500/40', label: 'Fire'  },
  WATER:         { color: 'text-sky-400',    selectedColor: 'text-sky-600',    icon: Droplets, glow: 'bg-sky-400/15',    border: 'border-sky-400/40',    label: 'Water'   },
  AIR: { color: 'text-yellow-400', selectedColor: 'text-yellow-600', icon: Wind,       glow: 'bg-yellow-400/15', border: 'border-yellow-400/40', label: 'Air'  },
  EARTH:        { color: 'text-emerald-400', selectedColor: 'text-emerald-600', icon: Mountain,    glow: 'bg-emerald-400/15', border: 'border-emerald-500/40', label: 'Earth' },
  VOID:        { color: 'text-zinc-400',    selectedColor: 'text-zinc-600',    icon: Sparkles, glow: 'bg-zinc-500/15', border: 'border-zinc-500/40', label: 'Void' },
};

const WILDCARD_COLORS: Record<string, { bg: string; border: string; glow: string; text: string; label: string }> = {
  wildcard_prism_shard: {
    bg: 'bg-gradient-to-br from-indigo-950 via-purple-900/80 to-pink-950',
    border: 'border-pink-500/40 hover:border-pink-400',
    glow: 'bg-pink-500/20',
    text: 'text-pink-400',
    label: 'Prism Shard'
  },
  wildcard_void_shard: {
    bg: 'bg-gradient-to-br from-zinc-950 via-purple-950/80 to-zinc-900',
    border: 'border-purple-600/40 hover:border-purple-500',
    glow: 'bg-purple-600/20',
    text: 'text-purple-400',
    label: 'Void Shard'
  },
  wildcard_catalyst: {
    bg: 'bg-gradient-to-br from-emerald-950 via-teal-950/80 to-slate-900',
    border: 'border-emerald-500/40 hover:border-emerald-400',
    glow: 'bg-emerald-500/20',
    text: 'text-emerald-400',
    label: 'Catalyst'
  },
  wildcard_aegis_shard: {
    bg: 'bg-gradient-to-br from-blue-950 via-sky-950/80 to-slate-900',
    border: 'border-sky-500/40 hover:border-sky-400',
    glow: 'bg-sky-500/20',
    text: 'text-sky-400',
    label: 'Aegis Shard'
  },
  wildcard_terra_stone: {
    bg: 'bg-gradient-to-br from-amber-950 via-yellow-950/80 to-orange-900',
    border: 'border-amber-500/40 hover:border-amber-400',
    glow: 'bg-amber-500/20',
    text: 'text-amber-400',
    label: 'Terra Stone'
  },
  wildcard_chaos_shard: {
    bg: 'bg-gradient-to-br from-red-950 via-rose-950/80 to-slate-900',
    border: 'border-rose-500/40 hover:border-rose-400',
    glow: 'bg-rose-500/20',
    text: 'text-rose-400',
    label: 'Chaos Shard'
  },
};

const DEFAULT_WILDCARD = {
  bg: 'bg-gradient-to-br from-violet-950 via-fuchsia-950/80 to-slate-900',
  border: 'border-violet-500/40 hover:border-violet-400',
  glow: 'bg-violet-500/20',
  text: 'text-violet-400',
  label: 'Wildcard'
};

function getRankLabel(rank: number, isWildcard: boolean): string {
  if (isWildcard) return '★';
  if (rank <= 10) return String(rank);
  if (rank === 11) return 'J';
  if (rank === 12) return 'Q';
  if (rank === 13) return 'K';
  if (rank === 14) return 'A';
  return String(rank);
}

/** Renders 1–5 small dots showing remaining uses. 999 = ∞ */
function DurabilityPips({ current, max }: { current: number; max: number }) {
  if (max >= 999) {
    return <span className="text-[6px] sm:text-[8px] text-zinc-500 font-bold">∞</span>;
  }
  const pips = Math.min(max, 5); // show at most 5 pips
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: pips }).map((_, i) => (
        <div
          key={i}
          className={clsx(
            'w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full',
            i < current ? 'bg-emerald-400' : 'bg-zinc-700'
          )}
        />
      ))}
    </div>
  );
}

export default function CardComponent({ card, selected, onClick }: Props) {
  const isAsh = card.isAsh ?? false;
  const isWildcard = !!(card.specialModifier && (card.specialModifier as any).isWildcard);
  const wildcardType = isWildcard ? ((card.specialModifier as any).wildcardType || "") : "";
  const wildcardConf = isWildcard ? (WILDCARD_COLORS[wildcardType] || DEFAULT_WILDCARD) : DEFAULT_WILDCARD;
  const wildcardDesc = isWildcard ? ((card.specialModifier as any).description || "") : "";

  const config = isAsh ? null : ELEMENT_CONFIG[card.element];
  const Icon = isAsh ? X : isWildcard ? Sparkles : (config ? config.icon : X);

  return (
    <motion.div
      layout
      whileHover={isAsh ? {} : { y: -5, scale: 1.02 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={clsx(
        'relative w-16 h-24 sm:w-24 sm:h-36 rounded-xl sm:rounded-2xl border-2 transition-all duration-300 cursor-pointer flex flex-col items-center justify-between p-1.5 sm:p-3 select-none backdrop-blur-sm',
        isAsh
          ? 'bg-zinc-900/50 border-zinc-700/40 opacity-60 cursor-not-allowed'
          : selected
            ? `bg-zinc-100 ${isWildcard ? wildcardConf.border : config!.border} -translate-y-4 sm:-translate-y-8 shadow-[0_20px_50px_rgba(255,255,255,0.15)] z-30`
            : `${isWildcard ? wildcardConf.bg : 'bg-zinc-900/80'} ${isWildcard ? wildcardConf.border : 'border-white/5'} hover:${isWildcard ? wildcardConf.border : config!.border} shadow-2xl`
      )}
    >
      {/* Ash overlay */}
      {isAsh && (
        <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-zinc-900/60 flex flex-col items-center justify-center gap-0.5 sm:gap-1 z-10">
          <X className="w-4 h-4 sm:w-6 h-6 text-zinc-600" />
          <span className="text-[6px] sm:text-[8px] text-zinc-600 font-black uppercase tracking-widest">ASH</span>
        </div>
      )}

      {/* Exhaust badge */}
      {card.isExhaust && !isAsh && (
        <div className="absolute -top-1 -right-1 sm:-top-1.5 sm:-right-1.5 bg-purple-600 text-white text-[5px] sm:text-[7px] font-black uppercase rounded-full px-0.5 sm:px-1 py-0.5 z-20">
          EXHST
        </div>
      )}

      {/* Upgrade shimmer */}
      {card.isUpgraded && !isAsh && (
        <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none animate-pulse" />
      )}

      {/* Selection glow */}
      {selected && !isAsh && (isWildcard ? wildcardConf : config) && (
        <motion.div
          className={clsx('absolute inset-0 rounded-xl sm:rounded-2xl blur-lg sm:blur-xl -z-10 opacity-30', isWildcard ? wildcardConf.glow : config!.glow)}
        />
      )}

      {/* Top Row */}
      <div className="w-full flex justify-between items-start">
        <Icon className={clsx('w-3.5 h-3.5 sm:w-5 sm:h-5', isAsh ? 'text-zinc-600' : selected ? 'text-zinc-700' : isWildcard ? wildcardConf.text : `${config!.color} opacity-60`)} />
        {!isAsh && (
          <span className={clsx('text-[9px] sm:text-[11px] font-black tracking-tight', isWildcard ? wildcardConf.text : selected ? 'text-zinc-800' : 'text-zinc-400')}>
            {getRankLabel(card.rank, isWildcard)}
          </span>
        )}
      </div>

      {/* Center */}
      {!isAsh && (
        isWildcard ? (
          <div className="relative flex flex-col items-center gap-0.5 px-0.5 text-center">
            <Icon className={clsx('w-5 h-5 sm:w-8 sm:h-8 transition-transform duration-300', selected ? 'text-zinc-900' : wildcardConf.text)} />
            <span className={clsx('text-[6px] sm:text-[8px] font-black uppercase tracking-wider', selected ? 'text-zinc-800' : 'text-zinc-100')}>
              {wildcardConf.label}
            </span>
            <span className={clsx('text-[5px] sm:text-[6px] leading-tight font-medium opacity-80 px-0.5 hidden sm:block', selected ? 'text-zinc-600' : 'text-zinc-400')}>
              {wildcardDesc}
            </span>
          </div>
        ) : (
          config && (
            <div className="relative flex flex-col items-center gap-0.5 sm:gap-1">
              <Icon className={clsx('w-6 h-6 sm:w-10 sm:h-10 transition-transform duration-300', selected ? 'text-zinc-900' : config.color)} />
              <span className={clsx('text-[7px] sm:text-[9px] font-black uppercase tracking-widest', selected ? 'text-zinc-600' : 'text-zinc-600')}>
                {config.label}
              </span>
              {!selected && (
                <div className={clsx('absolute inset-0 blur-2xl -z-10 opacity-60 hidden sm:block', config.glow)} />
              )}
            </div>
          )
        )
      )}

      {/* Durability Pips (bottom) */}
      {!isAsh && (
        <div className="w-full flex flex-col items-center gap-0.5 sm:gap-1">
          <DurabilityPips current={card.currentUses ?? 3} max={card.maxUses ?? 3} />
          {/* Bottom row rank (rotated) */}
          <div className="w-full flex justify-between items-end rotate-180 hidden sm:flex">
            <Icon className={clsx('w-5 h-5', selected ? 'text-zinc-700' : isWildcard ? wildcardConf.text : `${config!.color} opacity-60`)} />
            <span className={clsx('text-[11px] font-black tracking-tight', isWildcard ? wildcardConf.text : selected ? 'text-zinc-800' : 'text-zinc-400')}>
              {getRankLabel(card.rank, isWildcard)}
            </span>
          </div>
        </div>
      )}

      {/* Holographic sheen */}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 rounded-xl sm:rounded-2xl pointer-events-none" />
      <div className={clsx(
        'absolute inset-0.5 sm:inset-1 border rounded-[10px] sm:rounded-[14px] pointer-events-none transition-colors',
        selected ? 'border-zinc-900/10' : 'border-white/5'
      )} />
    </motion.div>
  );
}
