'use client';

import { useGameStore } from '@/store/useGameStore';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sword, Skull, Flame, Droplets, Wind, Mountain,
  Sparkles, ChevronRight, RotateCcw, Zap, Shield, Eye,
  HelpCircle, BookOpen
} from 'lucide-react';
import { clsx } from 'clsx';
import { CardElement, Spell, ClashResult, EnemySpell, PlayerClass } from '@/lib/types';
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

// Omen Styles and Descriptions
const OMEN_DETAILS: Record<string, { name: string; desc: string; color: string; border: string; bg: string; icon: React.ElementType }> = {
  FURY: { name: 'Fury', desc: 'Enemy attack speed escalates! Enemy mana increases by +1 each turn you take damage.', color: 'text-red-400', border: 'border-red-500/30', bg: 'bg-red-950/40', icon: Zap },
  ENRAGE: { name: 'Enrage', desc: 'Repeating the same spells on consecutive turns deals 0 damage.', color: 'text-orange-400', border: 'border-orange-500/30', bg: 'bg-orange-950/40', icon: Skull },
  DRAIN: { name: 'Drain', desc: 'Enemy absorbs your elemental energy, removing the leftmost element from your pool.', color: 'text-violet-400', border: 'border-violet-500/30', bg: 'bg-violet-950/40', icon: Droplets },
  SHIELD: { name: 'Shield', desc: 'Enemy fortifies defenses, taking 50% less damage from all spells.', color: 'text-sky-400', border: 'border-sky-500/30', bg: 'bg-sky-950/40', icon: Shield },
  CURSE: { name: 'Curse', desc: 'Void elements infect your pool next turn if you take damage.', color: 'text-purple-400', border: 'border-purple-500/30', bg: 'bg-purple-950/40', icon: Skull },
};

const ULTIMATE_DESC: Record<string, string> = {
  BERSERKER: 'Deal 20 dmg. FIRE spells deal x2 dmg this turn.',
  WIZARD: 'Gain +1 temporary mana/AIR. Spells combo without adjacency.',
  OVERSEER: 'Reveal enemy intent queue for 2 turns.',
  PALADIN: 'Fortress: Immune to all player damage this turn.',
};

// ── Main Component ─────────────────────────────────────────────────────────────
export default function CombatView() {
  const {
    gamePhase, pendingLevelUpChoices, claimRewardSpell,
    combatState, player, lastClash,
    placeElement, injectSpare, returnSpareFromSlot, clearSequence,
    submitSequence, clearLastClash,
    unleashUltimate,
  } = useGameStore();

  const [showTutorial, setShowTutorial] = useState(false);
  const [activeTab, setActiveTab] = useState<'loop' | 'counters' | 'spells' | 'negation' | 'ultimates' | 'omens'>('loop');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const viewed = localStorage.getItem('dungeon_sweeper_combat_tutorial_viewed');
      if (!viewed) {
        setShowTutorial(true);
      }
    }
  }, []);

  const closeTutorial = () => {
    setShowTutorial(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('dungeon_sweeper_combat_tutorial_viewed', 'true');
    }
  };

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

  const {
    enemy, activePool, spareElements, playerSequence, enemyQueue, boardLength,
    focusPips = 0, focusAbilityUsed = false, activeOmen = null, enemyQueueRevealed = false
  } = combatState;

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

      {/* Floating Tutorial Button */}
      <div className="absolute top-6 right-6 z-20">
        <button
          onClick={() => setShowTutorial(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900/80 border border-white/10 hover:border-emerald-500/50 hover:bg-emerald-900/20 text-zinc-300 hover:text-emerald-400 text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md backdrop-blur-sm cursor-pointer"
        >
          <HelpCircle className="w-4 h-4" />
          Rules & Tutorial
        </button>
      </div>

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

        {/* Active Omen Banner */}
        {activeOmen && OMEN_DETAILS[activeOmen] && (
          <div className={clsx(
            'flex items-center gap-2 px-4 py-1.5 rounded-xl border text-[11px] font-semibold shadow-md max-w-xl animate-pulse backdrop-blur-sm',
            OMEN_DETAILS[activeOmen].bg, OMEN_DETAILS[activeOmen].border
          )}>
            <span className={clsx('font-black uppercase tracking-wider', OMEN_DETAILS[activeOmen].color)}>
              Omen: {OMEN_DETAILS[activeOmen].name}
            </span>
            <span className="text-zinc-300">
              — {OMEN_DETAILS[activeOmen].desc}
            </span>
          </div>
        )}

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

        {/* Enemy Queue */}
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-[9px] font-black uppercase tracking-widest text-red-400/60">
            {enemyQueueRevealed ? 'Enemy Intent (REVEALED)' : 'Enemy Intent'}
          </span>
          <div className="flex gap-2">
            {enemyQueue.map((el, i) => {
              if (enemyQueueRevealed && el) {
                const style = EL[el];
                const Icon = style.icon;
                return (
                  <div key={i} className={clsx(
                    'w-12 h-12 rounded-xl border-2 flex items-center justify-center shadow-md animate-bounce bg-zinc-900/60',
                    style.bg, style.border
                  )}>
                    <Icon className={clsx('w-6 h-6', style.color)} />
                  </div>
                );
              }
              return (
                <div key={i} className="w-12 h-12 rounded-xl border-2 border-zinc-800 bg-zinc-900/60 flex items-center justify-center shadow-md">
                  <span className="text-zinc-600 font-black text-base">?</span>
                </div>
              );
            })}
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
        className="relative z-10 flex flex-col items-center pb-6 pt-2 px-6 gap-3">

        <div className="flex flex-col md:flex-row items-center gap-4 w-full max-w-2xl">
          {/* HP Bar */}
          <div className="flex-1 flex items-center gap-4 bg-zinc-900/60 border border-white/8 rounded-2xl px-5 py-3.5 backdrop-blur-sm shadow-lg w-full">
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

          {/* Focus / Ultimate */}
          <div className="flex-1 flex items-center justify-between gap-4 bg-zinc-900/60 border border-white/8 rounded-2xl px-5 py-3.5 backdrop-blur-sm shadow-lg w-full">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                Focus ({focusPips}/5)
              </span>
              <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className={clsx(
                      'w-5 h-2 rounded-sm border transition-all duration-300',
                      i < focusPips
                        ? 'bg-amber-400 border-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.6)]'
                        : 'bg-zinc-950 border-zinc-800'
                    )}
                  />
                ))}
              </div>
            </div>

            <div className="flex flex-col items-end">
              <button
                onClick={() => unleashUltimate()}
                disabled={focusPips < 5 || focusAbilityUsed}
                className={clsx(
                  'px-3 py-1.5 font-black uppercase tracking-widest text-[9px] rounded-lg border transition-all duration-300',
                  focusPips >= 5 && !focusAbilityUsed
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-400 border-amber-300 text-zinc-950 shadow-[0_0_15px_rgba(251,191,36,0.5)] hover:scale-105 cursor-pointer animate-pulse'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-600 cursor-not-allowed'
                )}
              >
                {focusAbilityUsed ? 'ULTIMATE ACTIVE' : 'UNLEASH ULTIMATE'}
              </button>
              <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider text-right mt-1 max-w-[160px] leading-none">
                {ULTIMATE_DESC[player.class] || ''}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Combat Tutorial Modal ── */}
      <AnimatePresence>
        {showTutorial && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-zinc-950/85 backdrop-blur-md flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-zinc-900 border-4 border-[#c8966c] shadow-[8px_8px_0px_0px_#0d0d15] rounded-3xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col relative"
            >
              {/* Glossy top-half sheen */}
              <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />

              {/* Header */}
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between relative z-10">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                    <BookOpen className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="font-anybody text-xl font-black uppercase tracking-tight text-white italic">
                      Combat Rules & Tutorial
                    </h2>
                    <p className="text-[10px] font-space-mono text-zinc-400 uppercase tracking-widest mt-0.5">
                      Master the mechanics of the Dungeon Clash
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeTutorial}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 text-zinc-300 font-black uppercase tracking-wider text-xs rounded-xl transition-all cursor-pointer"
                >
                  Close [ESC]
                </button>
              </div>

              {/* Layout Content */}
              <div className="flex-1 flex overflow-hidden min-h-0 relative z-10">
                {/* Tabs Sidebar */}
                <div className="w-1/3 border-r border-zinc-800 bg-zinc-950/40 p-4 flex flex-col gap-2 overflow-y-auto">
                  {[
                    { id: 'loop', label: '1. Flow & Loop', icon: RotateCcw },
                    { id: 'counters', label: '2. Counter Wheel', icon: Shield },
                    { id: 'spells', label: '3. Spells & Combos', icon: Flame },
                    { id: 'negation', label: '4. The 40% Rule', icon: Shield },
                    { id: 'ultimates', label: '5. Focus & Ultimates', icon: Sparkles },
                    { id: 'omens', label: '6. Omens & Boss AI', icon: Skull },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={clsx(
                          'flex items-center gap-2.5 px-4 py-3 rounded-xl border text-left text-xs font-black uppercase tracking-wider transition-all cursor-pointer',
                          activeTab === tab.id
                            ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 shadow-[inset_0_0_12px_rgba(16,185,129,0.1)]'
                            : 'bg-zinc-900/40 border-zinc-800/40 hover:border-zinc-700/60 text-zinc-400 hover:text-zinc-200'
                        )}
                      >
                        <Icon className="w-4 h-4 animate-pulse" />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                {/* Tab Pane */}
                <div className="w-2/3 p-6 overflow-y-auto font-space-grotesk text-sm leading-relaxed text-zinc-300">
                  {activeTab === 'loop' && (
                    <div className="flex flex-col gap-4">
                      <h3 className="text-lg font-black uppercase text-white tracking-wide">The Combat Cycle</h3>
                      <p>
                        Dungeon Sweeper combat is a turn-based tactical element-matching game. Each battle round consists of a **Planning Phase** and a **Resolution Phase (Clash)**.
                      </p>
                      <div className="bg-zinc-950/60 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-3 font-space-mono text-xs text-zinc-400">
                        <div className="flex items-start gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center font-bold text-emerald-400 text-[10px] shrink-0">1</span>
                          <span>Analyze the enemy's spells, HP, and stats. Keep an eye on active Omens!</span>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center font-bold text-emerald-400 text-[10px] shrink-0">2</span>
                          <span>Choose elements from your **Element Pool** to place in sequence slots. You can also inject **Spare Elements** from your inventory.</span>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center font-bold text-emerald-400 text-[10px] shrink-0">3</span>
                          <span>Click **Execute** to start the clash. The system resolves slots left-to-right, triggers matching spells, and resolves damage.</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'counters' && (
                    <div className="flex flex-col gap-4">
                      <h3 className="text-lg font-black uppercase text-white tracking-wide">The Elemental Counter Wheel</h3>
                      <p>
                        Understanding counter matchups is vital to negate enemy attacks and generate energy. The wheel flows in this order:
                      </p>

                      {/* Element counter diagram */}
                      <div className="grid grid-cols-2 gap-3 bg-zinc-950/40 border border-zinc-800/80 rounded-2xl p-4 text-xs font-space-mono">
                        <div className="flex items-center gap-2 p-2 rounded-xl bg-amber-950/30 border border-amber-600/30 text-amber-500">
                          <Mountain className="w-5 h-5 shrink-0" />
                          <span>Earth <span className="text-zinc-600">counters</span> Fire</span>
                        </div>
                        <div className="flex items-center gap-2 p-2 rounded-xl bg-orange-950/30 border border-orange-600/30 text-orange-400">
                          <Flame className="w-5 h-5 shrink-0" />
                          <span>Fire <span className="text-zinc-600">counters</span> Air</span>
                        </div>
                        <div className="flex items-center gap-2 p-2 rounded-xl bg-violet-950/30 border border-violet-600/30 text-violet-300">
                          <Wind className="w-5 h-5 shrink-0" />
                          <span>Air <span className="text-zinc-600">counters</span> Water</span>
                        </div>
                        <div className="flex items-center gap-2 p-2 rounded-xl bg-sky-950/30 border border-sky-600/30 text-sky-400">
                          <Droplets className="w-5 h-5 shrink-0" />
                          <span>Water <span className="text-zinc-600">counters</span> Earth</span>
                        </div>
                      </div>

                      <div className="p-4 bg-purple-950/20 border border-purple-500/20 rounded-2xl flex gap-3 text-xs">
                        <Skull className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-purple-300">Corrupted Element: Void</span>
                          <p className="text-zinc-400 mt-1">
                            Void element slots do not counter anything and cannot be countered. They act as dead slots on the board.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'spells' && (
                    <div className="flex flex-col gap-4">
                      <h3 className="text-lg font-black uppercase text-white tracking-wide">Spells & Combos</h3>
                      <p>
                        Triggering spells is your primary method of dealing damage. Spells are scanned **left-to-right** in your sequence:
                      </p>
                      
                      <div className="flex flex-col gap-3 text-xs font-space-mono">
                        <div className="p-3 bg-zinc-950/60 border border-zinc-800 rounded-xl">
                          <span className="font-bold text-white">🔮 Sliding Window Matching:</span>
                          <p className="text-zinc-400 mt-1">
                            The engine searches for contiguous matches of your equipped spell recipes. Once elements are consumed to match a spell, they cannot be used by another spell. Longest spells match first.
                          </p>
                        </div>

                        <div className="p-3 bg-zinc-950/60 border border-zinc-800 rounded-xl">
                          <span className="font-bold text-amber-400">✦ Spell Combos:</span>
                          <p className="text-zinc-400 mt-1">
                            If two spell recipes trigger adjacent to each other on the board, they trigger a combo!
                            <br />• 1st Combo: <strong className="text-amber-400">1.5x damage</strong>
                            <br />• 2nd Combo and beyond: <strong className="text-amber-400">2.0x damage</strong>
                          </p>
                        </div>

                        <div className="p-3 bg-zinc-950/60 border border-zinc-800 rounded-xl">
                          <span className="font-bold text-sky-400">⚡ Basic Strike:</span>
                          <p className="text-zinc-400 mt-1">
                            Any element placed in your sequence that is NOT countered by the enemy AND is NOT consumed by a spell recipe deals basic strike damage (<strong className="text-sky-300">1 + floor/2</strong> per element).
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'negation' && (
                    <div className="flex flex-col gap-4">
                      <h3 className="text-lg font-black uppercase text-white tracking-wide">The 40% Damage Negation</h3>
                      <p>
                        You don't need to counter every single slot to protect yourself.
                      </p>
                      <div className="p-5 bg-emerald-950/30 border border-emerald-500/30 rounded-2xl flex flex-col gap-2">
                        <div className="text-emerald-400 font-bold text-base flex items-center gap-2">
                          <Shield className="w-5 h-5 text-emerald-400" />
                          The 40% Block Rule
                        </div>
                        <p className="text-zinc-300 text-xs">
                          If the total slots you successfully counter in your sequence is **40% or more** of the board length, **ALL enemy damage for the round is completely negated (reduced to 0)**!
                        </p>
                      </div>
                      <div className="text-xs text-zinc-400 font-space-mono">
                        For a sequence length of 5:
                        <br />• <strong>0–1 counters</strong>: You fail the threshold. You take full damage from uncountered slots.
                        <br />• <strong>2–5 counters</strong>: You reach the 40% threshold! All incoming damage is negated!
                      </div>
                    </div>
                  )}

                  {activeTab === 'ultimates' && (
                    <div className="flex flex-col gap-4">
                      <h3 className="text-lg font-black uppercase text-white tracking-wide">Focus & Ultimates</h3>
                      <p>
                        Each player class has a game-changing **Ultimate Focus Ability**.
                      </p>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="p-3 bg-zinc-950/60 border border-zinc-800 rounded-xl">
                          <div className="text-[#db031a] font-bold uppercase mb-1">Berserker: Ignite</div>
                          <p className="text-zinc-400">Deal 20 damage immediately. All FIRE spells deal double damage this turn.</p>
                        </div>
                        <div className="p-3 bg-zinc-950/60 border border-zinc-800 rounded-xl">
                          <div className="text-[#c084fc] font-bold uppercase mb-1">Wizard: Cascade</div>
                          <p className="text-zinc-400">Gain +1 Mana/AIR slot. All spells combo regardless of adjacency.</p>
                        </div>
                        <div className="p-3 bg-zinc-950/60 border border-zinc-800 rounded-xl">
                          <div className="text-[#5adf82] font-bold uppercase mb-1">Overseer: Tactician</div>
                          <p className="text-zinc-400">Reveals the enemy's intent queue (actual elements) for 2 turns.</p>
                        </div>
                        <div className="p-3 bg-zinc-950/60 border border-zinc-800 rounded-xl">
                          <div className="text-[#38bdf8] font-bold uppercase mb-1">Paladin: Fortress</div>
                          <p className="text-zinc-400">Immune to all player damage this round.</p>
                        </div>
                      </div>
                      <div className="p-3.5 bg-amber-950/20 border border-amber-500/20 rounded-xl text-xs font-space-mono text-amber-300">
                        <strong>Charging Focus:</strong> You gain +1 Focus Pip for each slot you counter and +1 for each triggered spell. You lose -1 Focus Pip when you take damage. When at 5 Focus Pips, unleash your Ultimate!
                      </div>
                    </div>
                  )}

                  {activeTab === 'omens' && (
                    <div className="flex flex-col gap-4">
                      <h3 className="text-lg font-black uppercase text-white tracking-wide">Active Omens & Boss Prediction AI</h3>
                      <p>
                        Dungeon Sweeper challenges you with shifting modifiers and highly intelligent elites.
                      </p>

                      <div className="flex flex-col gap-2.5 text-xs font-space-mono">
                        <div className="p-3 bg-zinc-950/60 border border-zinc-800 rounded-xl">
                          <span className="font-bold text-white">⚠️ Active Omens:</span>
                          <p className="text-zinc-400 mt-1">
                            An Omen modifies rules each turn. E.g., `Fury` speeds up enemies, `Enrage` negates consecutive spell repetitions, `Drain` removes elements, `Shield` blocks damage, and `Curse` adds Void elements.
                          </p>
                        </div>

                        <div className="p-3 bg-zinc-950/60 border border-zinc-800 rounded-xl">
                          <span className="font-bold text-purple-400">👑 Elite & Boss Prediction AI:</span>
                          <p className="text-zinc-400 mt-1">
                            Elites and Bosses are **Omniscient**. They inspect your equipped spells and predict your optimal sequence layout, creating a counter intent queue explicitly designed to shut you down. Sequence unpredictably to defeat them!
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="p-5 border-t border-zinc-800 bg-zinc-950/50 flex items-center justify-between relative z-10">
                <span className="text-[10px] text-zinc-500 font-space-mono">
                  Dungeon Sweeper — Pair Programming Edition
                </span>
                <button
                  onClick={closeTutorial}
                  className="px-8 py-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black uppercase tracking-widest rounded-xl transition-all hover:scale-[1.02] shadow-lg shadow-emerald-500/20 cursor-pointer text-xs"
                >
                  Let's Fight!
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
