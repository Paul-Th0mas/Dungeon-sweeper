'use client';

import { Spell, CardElement, PlayerClass } from '@/lib/types';
import { clsx } from 'clsx';
import { Flame, Droplets, Wind, Mountain, Star, Shield, Sparkles, Zap, Sword, Eye } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  spell: Spell;
  selected?: boolean;
  onClick?: () => void;
  compact?: boolean;
}

const EL: Record<CardElement, { color: string; bg: string; border: string; icon: React.ElementType; label: string }> = {
  FIRE:  { color: 'text-orange-400', bg: 'bg-orange-950/60', border: 'border-orange-500/50', icon: Flame,    label: 'Fire'  },
  WATER: { color: 'text-sky-400',    bg: 'bg-sky-950/60',    border: 'border-sky-500/50',    icon: Droplets, label: 'Water' },
  AIR:   { color: 'text-violet-300', bg: 'bg-violet-950/60', border: 'border-violet-400/50', icon: Wind,     label: 'Air'   },
  EARTH: { color: 'text-[#5adf82]',  bg: 'bg-emerald-950/60',  border: 'border-emerald-500/50',  icon: Mountain, label: 'Earth' },
  VOID:  { color: 'text-purple-400', bg: 'bg-purple-950/60', border: 'border-purple-500/50', icon: Star,     label: 'Void'  },
};

const SPELL_CLASS_MAP: Record<string, PlayerClass> = {
  // Berserker
  'Ember Strike': 'BERSERKER',
  'Scorched Earth': 'BERSERKER',
  'Flame Surge': 'BERSERKER',
  'Rage Strike': 'BERSERKER',
  'Fireball': 'BERSERKER',
  'Inferno Wave': 'BERSERKER',
  'Magma Burst': 'BERSERKER',
  'Shatter Slam': 'BERSERKER',

  // Paladin
  'Tidal Wave': 'PALADIN',
  'Frostbite': 'PALADIN',
  'Mud Trap': 'PALADIN',
  'Shield Bash': 'PALADIN',
  'Blizzard': 'PALADIN',
  'Tidal Crush': 'PALADIN',
  'Glacial Nova': 'PALADIN',
  'Consecration': 'PALADIN',

  // Wizard
  'Wind Slash': 'WIZARD',
  'Static Shock': 'WIZARD',
  'Dust Storm': 'WIZARD',
  'Spark Flare': 'WIZARD',
  'Storm Surge': 'WIZARD',
  'Thunderclap': 'WIZARD',
  'Cyclone': 'WIZARD',
  'Arcane Chain': 'WIZARD',

  // Overseer
  'Stone Crush': 'OVERSEER',
  'Tremor': 'OVERSEER',
  'Gravel Shot': 'OVERSEER',
  'Toxic Drip': 'OVERSEER',
  'Earthquake': 'OVERSEER',
  'Rockslide': 'OVERSEER',
  'Petrify': 'OVERSEER',
  'Venomous Gale': 'OVERSEER',
};

const CLASS_STYLES: Record<PlayerClass | 'NEUTRAL', {
  bg: string;
  borderSelected: string;
  borderUnselected: string;
  badge: string;
  icon: React.ElementType;
}> = {
  BERSERKER: {
    bg: 'bg-gradient-to-b from-zinc-900/90 to-red-950/20',
    borderSelected: 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.25)]',
    borderUnselected: 'border-zinc-800/80 hover:border-red-500/30',
    badge: 'bg-red-950/30 border-red-500/20 text-red-400',
    icon: Sword,
  },
  PALADIN: {
    bg: 'bg-gradient-to-b from-zinc-900/90 to-sky-950/20',
    borderSelected: 'border-sky-500 shadow-[0_0_15px_rgba(14,165,233,0.25)]',
    borderUnselected: 'border-zinc-800/80 hover:border-sky-500/30',
    badge: 'bg-sky-950/30 border-sky-500/20 text-sky-400',
    icon: Shield,
  },
  WIZARD: {
    bg: 'bg-gradient-to-b from-zinc-900/90 to-violet-950/20',
    borderSelected: 'border-violet-500 shadow-[0_0_15px_rgba(139,92,246,0.25)]',
    borderUnselected: 'border-zinc-800/80 hover:border-violet-500/30',
    badge: 'bg-violet-950/30 border-violet-500/20 text-violet-400',
    icon: Sparkles,
  },
  OVERSEER: {
    bg: 'bg-gradient-to-b from-zinc-900/90 to-emerald-950/20',
    borderSelected: 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.25)]',
    borderUnselected: 'border-zinc-800/80 hover:border-emerald-500/30',
    badge: 'bg-emerald-950/30 border-emerald-500/20 text-emerald-400',
    icon: Eye,
  },
  NEUTRAL: {
    bg: 'bg-gradient-to-b from-zinc-900/90 to-amber-950/20',
    borderSelected: 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.25)]',
    borderUnselected: 'border-zinc-800/80 hover:border-amber-500/30',
    badge: 'bg-amber-950/30 border-amber-500/20 text-amber-400',
    icon: Zap,
  },
};

export default function CardComponent({ spell, selected = false, onClick, compact = false }: Props) {
  const spellClass = SPELL_CLASS_MAP[spell.name] ?? 'NEUTRAL';
  const style = CLASS_STYLES[spellClass];
  const ClassIcon = style.icon;

  return (
    <motion.div
      whileHover={onClick ? { y: -4, scale: 1.03 } : {}}
      whileTap={onClick ? { scale: 0.96 } : {}}
      onClick={onClick}
      className={clsx(
        'group flex flex-col gap-2 rounded-2xl border-2 transition-all select-none backdrop-blur-md relative overflow-hidden',
        compact ? 'p-2.5 min-w-[125px]' : 'p-4 min-w-[150px]',
        style.bg,
        selected ? style.borderSelected : style.borderUnselected,
        onClick ? 'cursor-pointer' : 'cursor-default',
      )}
    >
      {/* Top row */}
      <div className="flex items-center justify-between gap-2 z-10">
        <span className="font-black text-zinc-100 text-xs truncate">{spell.name}</span>
        {spell.isUpgraded && <Star className="w-3 h-3 text-amber-400 flex-shrink-0" />}
      </div>

      {/* Class badge */}
      <div className="flex items-center gap-1 z-10">
        <span className={clsx(
          'flex items-center gap-0.5 px-1.5 py-0.25 rounded-md border text-[8px] font-black uppercase tracking-widest',
          style.badge,
        )}>
          <ClassIcon className="w-2 h-2" />
          {spellClass}
        </span>
      </div>

      {/* Recipe tokens */}
      <div className="flex items-center gap-1 flex-wrap z-10">
        {spell.recipe.map((el, i) => {
          const elStyle = EL[el];
          const Icon = elStyle.icon;
          return (
            <span key={i} className={clsx(
              'flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg border text-[10px] font-bold',
              elStyle.bg, elStyle.border, elStyle.color,
            )}>
              <Icon className="w-2.5 h-2.5" />
              {el[0]}
            </span>
          );
        })}
      </div>

      {/* Damage */}
      <div className="text-[10px] text-zinc-500 font-mono mt-auto z-10 flex justify-between items-center">
        <span>{spell.isUpgraded ? Math.floor(spell.baseDamage * 1.25) : spell.baseDamage} dmg</span>
        {spell.isAdvanced && (
          <span className="text-violet-400 font-bold uppercase text-[8px] tracking-wider">Adv</span>
        )}
      </div>

      {/* Subtle background highlight element */}
      <div className="absolute -right-6 -bottom-6 w-16 h-16 rounded-full bg-white/1 blur-xl pointer-events-none group-hover:bg-white/3 transition-colors" />
    </motion.div>
  );
}
