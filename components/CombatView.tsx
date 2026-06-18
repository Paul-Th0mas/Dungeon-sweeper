'use client';

import { useGameStore } from '@/store/useGameStore';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sword, Skull, Flame, Droplets, Wind, Mountain,
  Sparkles, ChevronRight, RotateCcw, Zap, Shield, Eye
} from 'lucide-react';
import { clsx } from 'clsx';
import { CardElement, Spell, ClashResult, EnemySpell } from '@/lib/types';
import { useEffect, useState } from 'react';
import Card from './Card';

// ── Element Styles ─────────────────────────────────────────────────────────────
const EL: Record<CardElement, { color: string; bg: string; border: string; glow: string; icon: React.ElementType; label: string }> = {
  FIRE: { color: 'text-orange-400', bg: 'bg-orange-950/80', border: 'border-orange-500/60', glow: 'shadow-orange-500/40', icon: Flame, label: 'Fire' },
  WATER: { color: 'text-sky-400', bg: 'bg-sky-950/80', border: 'border-sky-500/60', glow: 'shadow-sky-500/40', icon: Droplets, label: 'Water' },
  AIR: { color: 'text-violet-300', bg: 'bg-violet-950/80', border: 'border-violet-400/60', glow: 'shadow-violet-400/40', icon: Wind, label: 'Air' },
  EARTH: { color: 'text-amber-500', bg: 'bg-amber-950/80', border: 'border-amber-600/60', glow: 'shadow-amber-500/40', icon: Mountain, label: 'Earth' },
  VOID: { color: 'text-purple-400', bg: 'bg-purple-950/80', border: 'border-purple-500/60', glow: 'shadow-purple-400/40', icon: Skull, label: 'Void' },
};

// Counter wheel: key beats value
const COUNTERS: Record<string, CardElement> = {
  EARTH: 'FIRE', FIRE: 'AIR', AIR: 'WATER', WATER: 'EARTH',
};

function ElementToken({
  element, size = 'md', faded = false, pulsing = false, onClick, draggable = false,
}: {
  element: CardElement; size?: 'sm' | 'md' | 'lg'; faded?: boolean; pulsing?: boolean;
  onClick?: () => void; draggable?: boolean;
}) {
  const style = EL[element];
  const Icon = style.icon;
  const sizes = { sm: 'w-10 h-10', md: 'w-12 h-12', lg: 'w-16 h-16' };
  const iconSizes = { sm: 'w-5 h-5', md: 'w-6 h-6', lg: 'w-8 h-8' };
  return (
    <motion.button
      whileHover={onClick ? { scale: 1.12 } : {}}
      whileTap={onClick ? { scale: 0.92 } : {}}
      animate={pulsing ? { boxShadow: ['0 0 0px transparent', `0 0 18px var(--tw-shadow-color)`, '0 0 0px transparent'] } : {}}
      transition={pulsing ? { repeat: Infinity, duration: 1.6 } : {}}
      onClick={onClick}
      className={clsx(
        sizes[size], 'rounded-2xl border-2 flex items-center justify-center transition-all select-none',
        style.bg, style.border, style.glow,
        onClick ? 'cursor-pointer' : 'cursor-default',
        faded && 'opacity-30 grayscale',
        pulsing && style.glow,
        'shadow-md',
      )}
    >
      <Icon className={clsx(iconSizes[size], style.color)} />
    </motion.button>
  );
}

function EmptySlot({ index, size = 'md', onClick }: { index: number; size?: 'sm' | 'md' | 'lg'; onClick?: () => void }) {
  const sizes = { sm: 'w-10 h-10', md: 'w-12 h-12', lg: 'w-16 h-16' };
  return (
    <motion.button
      whileHover={onClick ? { scale: 1.05 } : {}}
      onClick={onClick}
      className={clsx(
        sizes[size], 'rounded-2xl border-2 border-dashed border-zinc-700/60 bg-zinc-900/40',
        'flex items-center justify-center text-zinc-500 text-base font-black',
        onClick ? 'cursor-pointer hover:border-zinc-500' : 'cursor-default',
      )}
    >
      {index + 1}
    </motion.button>
  );
}

function SpellRecipeBadge({ spell, compact = false }: { spell: Spell | EnemySpell; compact?: boolean }) {
  return (
    <div className={clsx('flex items-center gap-1.5 flex-wrap', compact && 'gap-1')}>
      {spell.recipe.map((el, i) => {
        const style = EL[el];
        const Icon = style.icon;
        return (
          <span key={i} className={clsx(
            'flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg border text-[10px] font-bold',
            style.bg, style.border, style.color,
          )}>
            <Icon className="w-2.5 h-2.5" />
            {el[0]}
          </span>
        );
      })}
      <span className="text-zinc-400 text-[10px] font-bold ml-1">→ {spell.baseDamage} dmg</span>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function CombatView() {
  const {
    gamePhase, pendingLevelUpChoices, claimRewardSpell,
    combatState, player, lastClash,
    placeElement, injectSpare, returnSpareFromSlot, clearSequence,
    submitSequence, clearLastClash,
  } = useGameStore();

  const [animPhase, setAnimPhase] = useState<'NONE' | 'RESOLVING' | 'SPELLS' | 'SUMMARY'>('NONE');
  const [animSlot, setAnimSlot] = useState(0);
  const [animSpell, setAnimSpell] = useState(0);
  const [displayedEnemyHp, setDisplayedEnemyHp] = useState(0);

  // Kick off animations when a clash arrives
  useEffect(() => {
    if (lastClash) {
      if (lastClash.slots.length > 0) {
        setAnimPhase('RESOLVING');
        setAnimSlot(0);
        setAnimSpell(0);
        setDisplayedEnemyHp(lastClash.enemyHpAtStart);
      } else if (lastClash.triggeredSpells && lastClash.triggeredSpells.length > 0) {
        setAnimPhase('SPELLS');
        setAnimSlot(0);
        setAnimSpell(0);
        setDisplayedEnemyHp(lastClash.enemyHpAtStart);
      } else {
        setAnimPhase('SUMMARY');
        setAnimSlot(0);
        setAnimSpell(0);
        setDisplayedEnemyHp(Math.max(0, lastClash.enemyHpAtStart - lastClash.totalEnemyDamage));
      }
    } else {
      setAnimPhase('NONE');
      if (combatState?.enemy) setDisplayedEnemyHp(combatState.enemy.currentHp);
    }
  }, [lastClash]);

  useEffect(() => {
    if (!combatState?.enemy) return;
    if (animPhase === 'NONE') setDisplayedEnemyHp(combatState.enemy.currentHp);
  }, [combatState?.enemy?.currentHp]);

  // Slot-by-slot animation
  useEffect(() => {
    if (animPhase !== 'RESOLVING' || !lastClash) return;
    const interval = setInterval(() => {
      setAnimSlot(prev => {
        const next = prev + 1;
        if (next >= lastClash.slots.length) {
          clearInterval(interval);
          if (lastClash.triggeredSpells.length > 0) {
            setAnimPhase('SPELLS');
          } else {
            setAnimPhase('SUMMARY');
            setDisplayedEnemyHp(Math.max(0, lastClash.enemyHpAtStart - lastClash.totalEnemyDamage));
          }
        }
        return next;
      });
    }, 600);
    return () => clearInterval(interval);
  }, [animPhase, lastClash]);

  // Spell animation
  useEffect(() => {
    if (animPhase !== 'SPELLS' || !lastClash) return;
    setDisplayedEnemyHp(lastClash.triggeredSpells[0]?.enemyHpAfter ?? displayedEnemyHp);
    const interval = setInterval(() => {
      setAnimSpell(prev => {
        const next = prev + 1;
        if (next < lastClash.triggeredSpells.length) {
          setDisplayedEnemyHp(lastClash.triggeredSpells[next].enemyHpAfter);
        } else {
          clearInterval(interval);
          setAnimPhase('SUMMARY');
          setDisplayedEnemyHp(Math.max(0, lastClash.enemyHpAtStart - lastClash.totalEnemyDamage));
        }
        return next;
      });
    }, 1800);
    return () => clearInterval(interval);
  }, [animPhase, lastClash]);

  // ── Spell Reward Screen ──────────────────────────────────────────────────────
  if (gamePhase === 'SPELL_REWARD' && pendingLevelUpChoices?.type === 'SPELL_REWARDS') {
    const choices = pendingLevelUpChoices.choices as any[];
    return (
      <div className="flex flex-col items-center justify-center w-full h-screen bg-zinc-950 p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/30 via-zinc-950 to-teal-950/20 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/8 rounded-full blur-[120px] pointer-events-none" />

        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative z-10 w-full max-w-3xl flex flex-col items-center">
          <motion.div animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 2.5 }} className="p-4 bg-emerald-500/20 rounded-2xl mb-4 border border-emerald-500/30">
            <Sparkles className="w-10 h-10 text-emerald-400" />
          </motion.div>
          <div className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-400 mb-1">Victory!</div>
          <h2 className="text-4xl font-black uppercase tracking-tight bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent italic mb-2">
            Choose a Spell
          </h2>
          <div className="flex gap-6 text-xs font-semibold text-zinc-400 mb-8">
            <span>+<span className="text-yellow-400 font-bold">{pendingLevelUpChoices.xpGained} XP</span></span>
            <span>+<span className="text-amber-400 font-bold">{pendingLevelUpChoices.goldGained}g</span></span>
            {pendingLevelUpChoices.spareDrops && (
              <span className="flex items-center gap-1">
                Drops: {(pendingLevelUpChoices.spareDrops as CardElement[]).map((el, i) => {
                  const style = EL[el]; const Icon = style.icon;
                  return <Icon key={i} className={clsx('w-3.5 h-3.5', style.color)} />;
                })}
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-5 w-full mb-8">
            {choices.map((choice: any, idx: number) => (
              <motion.button
                key={idx}
                initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}
                onClick={() => claimRewardSpell(idx)}
                className="flex flex-col gap-3 p-5 rounded-2xl bg-zinc-900/60 border border-white/8 hover:border-emerald-500/50 hover:bg-emerald-500/8 transition-all group text-left"
              >
                <div className="flex items-center justify-between">
                  <span className={clsx('text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border',
                    choice.isAdvanced ? 'text-violet-300 border-violet-500/50 bg-violet-950/50' : 'text-zinc-400 border-zinc-600/50 bg-zinc-800/50'
                  )}>
                    {choice.isAdvanced ? 'Advanced' : 'Basic'}
                  </span>
                  <Zap className="w-4 h-4 text-zinc-600 group-hover:text-emerald-400 transition-colors" />
                </div>
                <div className="font-black text-zinc-100 text-sm">{choice.name}</div>
                <SpellRecipeBadge spell={choice} />
              </motion.button>
            ))}
          </div>

          <button onClick={() => claimRewardSpell(-1)} className="px-8 py-3 bg-zinc-900/60 border border-white/8 hover:border-white/20 text-zinc-400 hover:text-white font-black uppercase tracking-widest rounded-xl transition-all text-xs">
            Skip Reward
          </button>
        </motion.div>
      </div>
    );
  }

  if (!combatState || !combatState.enemy || !player) {
    return <div className="flex items-center justify-center h-screen bg-zinc-950 text-white">Loading...</div>;
  }

  const { enemy, activePool, spareElements, playerSequence, enemyQueue, boardLength } = combatState;

  // Build a "remaining pool" — elements in activePool not yet placed in sequence
  const placedElements = playerSequence.filter(Boolean) as CardElement[];
  const remainingPool = [...activePool];
  for (const placed of placedElements) {
    const idx = remainingPool.indexOf(placed);
    if (idx !== -1) remainingPool.splice(idx, 1);
  }

  const canSubmit = placedElements.length > 0 && animPhase === 'NONE';

  // Handle clicking an element from the pool — auto-place in first empty slot
  const handlePoolClick = (element: CardElement, poolIdx: number) => {
    if (animPhase !== 'NONE') return;
    const firstEmptyIdx = playerSequence.indexOf(null);
    if (firstEmptyIdx !== -1) {
      placeElement(element, firstEmptyIdx);
    }
  };

  // Handle clicking a placed element — clear and return it
  const handleSlotClick = (slotIdx: number) => {
    if (animPhase !== 'NONE') return;
    if (playerSequence[slotIdx] !== null) {
      returnSpareFromSlot(slotIdx);
    }
  };

  return (
    <div className="relative flex flex-col w-full h-screen overflow-hidden bg-zinc-950">
      {/* Atmospheric background */}
      <div className="absolute inset-0 bg-gradient-to-b from-red-950/20 via-zinc-950 to-zinc-950 pointer-events-none" />
      {enemy.isEliteOrBoss && (
        <div className="absolute inset-0 bg-gradient-to-tr from-purple-950/20 via-transparent to-transparent pointer-events-none" />
      )}

      {/* ── Top: Enemy Section ─────────────────────────────────────────────── */}
      <motion.div initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className="relative z-10 flex flex-col items-center pt-6 pb-4 px-6 gap-3">

        {/* Enemy name + HP */}
        <div className="flex items-center gap-4">
          <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
            className={clsx('p-3 rounded-2xl border shadow-lg border-white/10', enemy.isEliteOrBoss
              ? 'bg-purple-950/60 border-purple-500/40 shadow-purple-500/10' : 'bg-zinc-900/60 border-red-900/40 shadow-red-500/10')}>
            <Skull className={clsx('w-8 h-8', enemy.isEliteOrBoss ? 'text-purple-400' : 'text-red-500')} />
          </motion.div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-black uppercase tracking-wider text-zinc-100">{enemy.name}</h2>
              {enemy.isEliteOrBoss && (
                <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-purple-950/60 border border-purple-500/40 text-purple-300">
                  {enemy.tier === 3 ? 'Boss' : 'Elite'}
                </span>
              )}
              <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-zinc-800/60 border border-zinc-600/40 text-zinc-400 flex items-center gap-1">
                <Zap className="w-3 h-3" />{enemy.mana} Mana
              </span>
            </div>
            {/* HP bar */}
            <div className="w-80 h-3 bg-zinc-950 rounded-full overflow-hidden border border-white/5 shadow-inner">
              <motion.div
                animate={{ width: `${(displayedEnemyHp / enemy.maxHp) * 100}%` }}
                transition={{ duration: 0.4 }}
                className={clsx('h-full rounded-full', enemy.isEliteOrBoss
                  ? 'bg-gradient-to-r from-purple-700 to-purple-400'
                  : 'bg-gradient-to-r from-red-800 to-red-500')}
              />
            </div>
            <div className="text-[10px] text-zinc-500 font-mono font-bold">{displayedEnemyHp} / {enemy.maxHp} HP</div>
          </div>
        </div>

        {/* Enemy Spellbook (always visible) */}
        <div className="flex flex-wrap gap-2 justify-center max-w-2xl">
          {enemy.spellbook.map((spell, i) => (
            <div key={i} className={clsx(
              'flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs shadow-md',
              'bg-red-950/30 border-red-800/30',
            )}>
              <Eye className="w-3 h-3 text-red-400/60" />
              <span className="font-bold text-zinc-300 mr-1">{spell.name}</span>
              <SpellRecipeBadge spell={spell} compact />
            </div>
          ))}
        </div>

        {/* Enemy Queue (hidden) */}
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-[9px] font-black uppercase tracking-widest text-red-400/60">Enemy Intent</span>
          <div className="flex gap-2">
            {Array.from({ length: enemy.mana }).map((_, i) => (
              <div key={i} className="w-12 h-12 rounded-xl border-2 border-zinc-800 bg-zinc-900/60 flex items-center justify-center shadow-md">
                <span className="text-zinc-600 font-black text-base">?</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── Middle: Clash Arena / Sequence Board ──────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 gap-4 relative z-10">

        {/* Clash Animation Overlay */}
        <AnimatePresence mode="wait">
          {animPhase !== 'NONE' && lastClash ? (
            <motion.div key="clash-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="w-full max-w-2xl bg-zinc-900/70 border border-white/8 rounded-2xl p-4 backdrop-blur-md flex flex-col items-center gap-3">

              {animPhase === 'RESOLVING' && (
                <>
                  <h3 className="text-sm font-black uppercase tracking-widest text-zinc-300">Sequence Resolving...</h3>
                  <div className="flex gap-2 flex-wrap justify-center">
                    {lastClash.slots.map((slot, i) => {
                      const isResolved = i < animSlot;
                      const pStyle = slot.playerElement ? EL[slot.playerElement] : null;
                      const eStyle = slot.enemyElement ? EL[slot.enemyElement] : null;
                      const PIcon = pStyle?.icon;
                      const EIcon = eStyle?.icon;
                      const resultColors = {
                        COUNTER: 'text-emerald-400',
                        COUNTERED: 'text-red-400',
                        NEUTRAL: 'text-zinc-400',
                        EMPTY: 'text-red-500',
                      };
                      return (
                        <motion.div key={i}
                          initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: i * 0.05 }}
                          className={clsx('flex flex-col items-center gap-1 p-2 rounded-xl border',
                            isResolved ? 'bg-zinc-800/80 border-zinc-600/40' : 'bg-zinc-900/40 border-zinc-800/40'
                          )}>
                          <div className="flex items-center gap-2">
                            {PIcon && pStyle
                              ? <div className={clsx('w-10 h-10 rounded-xl border flex items-center justify-center shadow-md', pStyle.bg, pStyle.border)}><PIcon className={clsx('w-5 h-5', pStyle.color)} /></div>
                              : <div className="w-10 h-10 rounded-xl border border-zinc-800 bg-zinc-900 flex items-center justify-center text-zinc-700 text-xs">—</div>}
                            <span className="text-zinc-600 text-xs font-bold">vs</span>
                            {EIcon && eStyle
                              ? <div className={clsx('w-10 h-10 rounded-xl border flex items-center justify-center shadow-md', eStyle.bg, eStyle.border)}><EIcon className={clsx('w-5 h-5', eStyle.color)} /></div>
                              : <div className="w-10 h-10 rounded-xl border border-zinc-800 bg-zinc-900 flex items-center justify-center text-zinc-700 text-xs">?</div>}
                          </div>
                          {isResolved && (
                            <span className={clsx('text-[9px] font-black uppercase', resultColors[slot.result])}>
                              {slot.result === 'COUNTER' ? '✓ Counter' : slot.result === 'COUNTERED' ? `−${slot.damageToPlayer}` : slot.result === 'EMPTY' ? `−${slot.damageToPlayer}` : '~'}
                            </span>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </>
              )}

              {animPhase === 'SPELLS' && lastClash.triggeredSpells[animSpell] && (
                <motion.div key={animSpell} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 1.3, opacity: 0 }} className="flex flex-col items-center gap-3 py-4">
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-950/40 via-red-950/30 to-yellow-950/20 rounded-2xl pointer-events-none" />
                  <Sparkles className="w-8 h-8 text-yellow-400 animate-pulse" />
                  <h1 className="text-3xl font-black uppercase tracking-widest bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent italic">
                    {lastClash.triggeredSpells[animSpell].name}
                  </h1>
                  <p className="text-xl font-black text-white">
                    {lastClash.triggeredSpells[animSpell].damage} damage!
                  </p>
                </motion.div>
              )}

              {animPhase === 'SUMMARY' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3 w-full">
                  <div className={clsx('flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider border',
                    lastClash.enemyDamageNegated
                      ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400'
                      : 'bg-zinc-800/60 border-zinc-600/40 text-zinc-300'
                  )}>
                    <Shield className="w-4 h-4" />
                    {lastClash.enemyDamageNegated
                      ? `Enemy damage NEGATED! (${Math.round(lastClash.counterPercent * 100)}% countered)`
                      : `${Math.round(lastClash.counterPercent * 100)}% countered — damage not negated`}
                  </div>
                  <div className="grid grid-cols-2 gap-3 w-full max-w-sm text-xs">
                    <div className="bg-zinc-900/60 border border-white/5 rounded-xl p-3 text-center">
                      <div className="text-zinc-500 mb-1">Dealt to Enemy</div>
                      <div className="text-green-400 font-black text-lg">{lastClash.totalEnemyDamage}</div>
                    </div>
                    <div className="bg-zinc-900/60 border border-white/5 rounded-xl p-3 text-center">
                      <div className="text-zinc-500 mb-1">Taken</div>
                      <div className="text-red-400 font-black text-lg">{lastClash.totalPlayerDamage}</div>
                    </div>
                  </div>
                  {(lastClash.triggeredSpells.length > 0 || lastClash.basicStrikeDamage > 0) && (
                    <div className="flex flex-wrap gap-2 justify-center">
                      {lastClash.triggeredSpells.map((ts, i) => (
                        <span key={i} className="text-[10px] px-2 py-1 rounded-full bg-yellow-950/60 border border-yellow-600/40 text-yellow-300 font-bold">
                          ✦ {ts.name}: {ts.damage} dmg
                        </span>
                      ))}
                      {lastClash.basicStrikeDamage > 0 && (
                        <span className="text-[10px] px-2 py-1 rounded-full bg-sky-950/60 border border-sky-600/40 text-sky-300 font-bold">
                          ⚡ Basic Strike: {lastClash.basicStrikeDamage} dmg
                        </span>
                      )}
                    </div>
                  )}
                  <p className="text-xs text-zinc-500 italic text-center max-w-xs">{lastClash.description}</p>
                  <button onClick={clearLastClash}
                    className="mt-2 px-8 py-2.5 bg-zinc-100 hover:bg-white text-zinc-950 font-black uppercase tracking-widest rounded-xl transition-all hover:scale-105 text-xs shadow-md">
                    Continue
                  </button>
                </motion.div>
              )}
            </motion.div>
          ) : (
            /* ── Planning Mode ────────────────────────────────────────────── */
            <motion.div key="plan-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4 w-full max-w-2xl">

              {/* Equipped Spells Cards */}
              <div className="flex flex-col items-center gap-2 w-full">
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500">Your Spells</span>
                <div className="flex gap-4 justify-center flex-wrap max-w-4xl">
                  {player.spells.filter(s => s.equipped).map((spell) => (
                    <Card key={spell.id} spell={spell} compact />
                  ))}
                </div>
              </div>

              {/* Elemental Counters Chart */}
              <div className="flex flex-col items-center gap-2 w-full bg-zinc-900/35 border border-white/5 rounded-2xl py-2.5 px-4 backdrop-blur-sm shadow-inner max-w-lg">
                <div className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">Clash Rules (Counters negate enemy slots)</div>
                <div className="flex items-center gap-2.5 text-xs text-zinc-400 font-bold flex-wrap justify-center select-none">
                  <span className="flex items-center gap-1"><Mountain className="w-4 h-4 text-amber-500" /> Earth <ChevronRight className="w-3.5 h-3.5 text-zinc-600" /> <Flame className="w-4 h-4 text-orange-400" /> Fire</span>
                  <span className="text-zinc-700">|</span>
                  <span className="flex items-center gap-1"><Flame className="w-4 h-4 text-orange-400" /> Fire <ChevronRight className="w-3.5 h-3.5 text-zinc-600" /> <Wind className="w-4 h-4 text-violet-300" /> Air</span>
                  <span className="text-zinc-700">|</span>
                  <span className="flex items-center gap-1"><Wind className="w-4 h-4 text-violet-300" /> Air <ChevronRight className="w-3.5 h-3.5 text-zinc-600" /> <Droplets className="w-4 h-4 text-sky-400" /> Water</span>
                  <span className="text-zinc-700">|</span>
                  <span className="flex items-center gap-1"><Droplets className="w-4 h-4 text-sky-400" /> Water <ChevronRight className="w-3.5 h-3.5 text-zinc-600" /> <Mountain className="w-4 h-4 text-amber-500" /> Earth</span>
                </div>
              </div>

              {/* Sequence Board */}
              <div className="flex flex-col items-center gap-3">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">
                  Your Sequence ({placedElements.length}/{boardLength})
                </span>
                <div className="flex gap-2.5">
                  {playerSequence.map((el, i) => (
                    <div key={i} className="flex flex-col items-center gap-1">
                      {el ? (
                        <ElementToken element={el} size="lg" onClick={() => handleSlotClick(i)} />
                      ) : (
                        <EmptySlot index={i} size="lg" onClick={() => handleSlotClick(i)} />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Available Pool */}
              <div className="flex flex-col items-center gap-3">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">
                  Element Pool — tap to place
                </span>
                <div className="flex gap-2.5 flex-wrap justify-center">
                  {remainingPool.map((el, i) => (
                    <ElementToken
                      key={`pool-${i}`}
                      element={el}
                      size="lg"
                      onClick={() => handlePoolClick(el, i)}
                    />
                  ))}
                  {remainingPool.length === 0 && (
                    <span className="text-zinc-700 text-xs italic">Pool empty — place elements or inject Spares</span>
                  )}
                </div>
              </div>

              {/* Spare Elements Inventory */}
              {(Object.values(spareElements).some(v => v > 0)) && (
                <div className="flex flex-col items-center gap-2 w-full max-w-sm">
                  <span className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-500">Spare Elements — click to inject</span>
                  <div className="flex gap-3 flex-wrap justify-center">
                    {(Object.entries(spareElements) as [CardElement, number][])
                      .filter(([, count]) => count > 0)
                      .map(([el, count]) => {
                        const style = EL[el];
                        const Icon = style.icon;
                        return (
                          <motion.button key={el}
                            whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
                            onClick={() => injectSpare(el)}
                            className={clsx('flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 transition-all', style.bg, style.border)}>
                            <Icon className={clsx('w-4 h-4', style.color)} />
                            <span className={clsx('text-xs font-black', style.color)}>×{count}</span>
                          </motion.button>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Submit / Clear */}
              <div className="flex gap-3 mt-2">
                <motion.button
                  whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                  onClick={() => submitSequence()}
                  disabled={!canSubmit}
                  className="flex items-center gap-2 px-8 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-950 font-black uppercase tracking-widest rounded-xl transition-all text-sm shadow-lg shadow-emerald-500/20"
                >
                  <Sword className="w-4 h-4" />
                  Execute
                </motion.button>
                <button
                  onClick={() => clearSequence()}
                  className="flex items-center gap-2 px-6 py-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 font-black uppercase tracking-widest rounded-xl border border-white/5 transition-all text-sm"
                >
                  <RotateCcw className="w-4 h-4" />
                  Clear
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Bottom: Player Stats ─────────────────────────────────────────────── */}
      <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className="relative z-10 flex flex-col items-center pb-6 pt-2 px-6 gap-2">
        {/* HP Bar */}
        <div className="flex items-center gap-4 w-full max-w-md bg-zinc-900/60 border border-white/8 rounded-2xl px-5 py-3 backdrop-blur-sm shadow-lg">
          <span className="text-xs font-black uppercase tracking-wider text-green-500">HP</span>
          <div className="flex-1 h-3 bg-zinc-950 rounded-full overflow-hidden border border-white/5 shadow-inner">
            <motion.div
              animate={{ width: `${(player.currentHp / player.maxHp) * 100}%` }}
              className="h-full bg-gradient-to-r from-green-700 to-green-400 rounded-full"
            />
          </div>
          <span className="text-xs text-zinc-300 font-mono font-bold">{player.currentHp}/{player.maxHp}</span>
          <span className="text-xs font-black uppercase tracking-widest text-violet-400 flex items-center gap-1.5 ml-3">
            <Zap className="w-4 h-4 text-violet-400" />{player.playerMana} Mana
          </span>
        </div>
      </motion.div>
    </div>
  );
}
