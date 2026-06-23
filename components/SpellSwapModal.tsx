'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Swords, ArrowRight, Flame, Droplets, Wind, Mountain, Zap, X } from 'lucide-react';
import { clsx } from 'clsx';
import { Spell, CardElement } from '@/lib/types';

const EL: Record<CardElement, { color: string; bg: string; border: string; icon: React.ElementType; label: string }> = {
  FIRE:  { color: 'text-orange-400', bg: 'bg-orange-950/60', border: 'border-orange-500/50', icon: Flame,    label: 'Fire'  },
  WATER: { color: 'text-sky-400',    bg: 'bg-sky-950/60',    border: 'border-sky-500/50',    icon: Droplets, label: 'Water' },
  AIR:   { color: 'text-violet-300', bg: 'bg-violet-950/60', border: 'border-violet-400/50', icon: Wind,     label: 'Air'   },
  EARTH: { color: 'text-amber-500',  bg: 'bg-amber-950/60',  border: 'border-amber-600/50',  icon: Mountain, label: 'Earth' },
  VOID:  { color: 'text-purple-400', bg: 'bg-purple-950/60', border: 'border-purple-500/50', icon: Zap,      label: 'Void'  },
};

function RecipeBadges({ recipe, baseDamage }: { recipe: CardElement[]; baseDamage: number }) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {recipe.map((el, i) => {
        const style = EL[el];
        const Icon = style.icon;
        return (
          <span key={i} className={clsx('flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg border text-[10px] font-bold', style.bg, style.border, style.color)}>
            <Icon className="w-2.5 h-2.5" />{el[0]}
          </span>
        );
      })}
      <span className="text-zinc-500 text-[10px] ml-1">→ {baseDamage} dmg</span>
    </div>
  );
}

interface SpellSwapModalProps {
  /** The newly acquired spell that needs a slot */
  incomingSpell: Spell;
  /** The 4 currently equipped spells */
  equippedSpells: Spell[];
  /** Called with the id of the spell to be replaced (unequipped) */
  onReplace: (outgoingSpellId: string) => void;
  /** Called if the player wants to discard the new spell instead */
  onDiscard: () => void;
  /** Loading state during async operation */
  loading?: boolean;
}

export default function SpellSwapModal({
  incomingSpell,
  equippedSpells,
  onReplace,
  onDiscard,
  loading = false,
}: SpellSwapModalProps) {
  return (
    <AnimatePresence>
      <motion.div
        key="spell-swap-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-sm"
      >
        {/* Ambient glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-violet-500/10 rounded-full blur-[120px] pointer-events-none" />

        <motion.div
          initial={{ scale: 0.88, opacity: 0, y: 24 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 340, damping: 28 }}
          className="relative z-10 w-full max-w-lg mx-4 bg-zinc-950 border border-violet-500/30 rounded-3xl p-6 shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2.5 bg-violet-500/15 rounded-xl border border-violet-500/25">
              <Swords className="w-6 h-6 text-violet-400" />
            </div>
            <div>
              <div className="text-[9px] font-black uppercase tracking-[0.35em] text-violet-400">Loadout Full</div>
              <h2 className="text-lg font-black uppercase tracking-tight">Choose a Spell to Replace</h2>
            </div>
          </div>

          {/* Incoming spell highlight */}
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-500/8 border border-emerald-500/25 mb-5">
            <div className="p-2 bg-emerald-500/15 rounded-xl border border-emerald-500/20 shrink-0">
              <Zap className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[9px] font-black uppercase tracking-widest text-emerald-500 mb-0.5">New Spell</div>
              <div className="font-black text-zinc-100 text-sm">{incomingSpell.name}</div>
              <RecipeBadges recipe={incomingSpell.recipe} baseDamage={incomingSpell.baseDamage} />
            </div>
            <span className={clsx('text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border shrink-0',
              incomingSpell.isAdvanced
                ? 'text-violet-300 border-violet-500/40 bg-violet-950/40'
                : 'text-zinc-400 border-zinc-600/40 bg-zinc-800/40'
            )}>
              {incomingSpell.isAdvanced ? 'Advanced' : 'Basic'}
            </span>
          </div>

          <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3 flex items-center gap-2">
            <ArrowRight className="w-3 h-3" />
            Select a spell to replace
          </div>

          {/* Equipped spells list */}
          <div className="flex flex-col gap-2 mb-5">
            {(() => {
              const numAdvancedEquipped = equippedSpells.filter((s) => s.isAdvanced).length;
              const isIncomingAdvanced = incomingSpell.isAdvanced;

              return equippedSpells.map((spell, idx) => {
                const isLimitDisabled = isIncomingAdvanced && !spell.isAdvanced && numAdvancedEquipped >= 2;
                const isDisabled = loading || isLimitDisabled;

                return (
                  <motion.button
                    key={spell.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.06 }}
                    onClick={() => !isDisabled && onReplace(spell.id)}
                    disabled={isDisabled}
                    className={clsx(
                      'flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all group',
                      isLimitDisabled
                        ? 'bg-zinc-900/20 border-white/5 opacity-40 cursor-not-allowed'
                        : 'bg-zinc-900/60 border-white/8 hover:border-rose-500/50 hover:bg-rose-500/6',
                      loading && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    {/* Slot number */}
                    <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[10px] font-black text-zinc-500 shrink-0">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-black text-zinc-200 text-sm truncate">{spell.name}</div>
                      <div className="flex items-center gap-1 mt-0.5">
                        {spell.recipe.map((el, i) => {
                          const style = EL[el]; const Icon = style.icon;
                          return (
                            <span key={i} className={clsx('flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-bold border', style.bg, style.border, style.color)}>
                              <Icon className="w-2 h-2" />{el[0]}
                            </span>
                          );
                        })}
                        <span className="text-zinc-600 text-[10px] ml-1">→ {spell.baseDamage} dmg</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={clsx('text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full border',
                        spell.isAdvanced ? 'text-violet-300 border-violet-500/30 bg-violet-950/30' : 'text-zinc-500 border-zinc-600/30 bg-zinc-800/30'
                      )}>
                        {spell.isAdvanced ? 'Adv' : 'Bsc'}
                      </span>
                      {!isLimitDisabled && (
                        <div className="w-6 h-6 rounded-lg bg-rose-500/0 group-hover:bg-rose-500/15 border border-transparent group-hover:border-rose-500/40 flex items-center justify-center transition-all">
                          <X className="w-3 h-3 text-zinc-600 group-hover:text-rose-400 transition-colors" />
                        </div>
                      )}
                      {isLimitDisabled && (
                        <span className="text-[9px] font-bold text-rose-400/80">Max 2 Adv</span>
                      )}
                    </div>
                  </motion.button>
                );
              });
            })()}
          </div>

          {/* Discard incoming spell */}
          <button
            onClick={onDiscard}
            disabled={loading}
            className="w-full py-3 rounded-xl bg-zinc-900/60 border border-white/8 hover:border-white/20 text-zinc-500 hover:text-zinc-300 font-black uppercase tracking-widest text-xs transition-all disabled:opacity-40"
          >
            Discard New Spell
          </button>

          {loading && (
            <div className="absolute inset-0 rounded-3xl bg-zinc-950/70 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
