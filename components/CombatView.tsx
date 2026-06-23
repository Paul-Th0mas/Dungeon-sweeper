'use client';

import { useGameStore } from '@/store/useGameStore';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sword, Skull, Flame, Droplets, Wind, Mountain,
  Sparkles, ChevronRight, RotateCcw, Zap, Shield, Eye,
  HelpCircle, BookOpen, X
} from 'lucide-react';
import { clsx } from 'clsx';
import { CardElement, Spell, ClashResult, EnemySpell, PlayerClass } from '@/lib/types';
import { useEffect, useState } from 'react';
import Card from './Card';
import SpellSwapModal from './SpellSwapModal';

// ── Element Styles ─────────────────────────────────────────────────────────────
const EL: Record<CardElement, { color: string; bg: string; border: string; glow: string; icon: React.ElementType; label: string }> = {
  FIRE: { color: 'text-orange-400', bg: 'bg-orange-950/80', border: 'border-orange-500/60', glow: 'shadow-orange-500/40', icon: Flame, label: 'Fire' },
  WATER: { color: 'text-sky-400', bg: 'bg-sky-950/80', border: 'border-sky-500/60', glow: 'shadow-sky-500/40', icon: Droplets, label: 'Water' },
  AIR: { color: 'text-violet-300', bg: 'bg-violet-950/80', border: 'border-violet-400/60', glow: 'shadow-violet-400/40', icon: Wind, label: 'Air' },
  EARTH: { color: 'text-[#5adf82]', bg: 'bg-emerald-950/80', border: 'border-emerald-600/60', glow: 'shadow-emerald-500/40', icon: Mountain, label: 'Earth' },
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
  const sizes = {
    sm: 'w-7 h-7 xs:w-8 xs:h-8 sm:w-10 sm:h-10',
    md: 'w-9 h-9 xs:w-10 xs:h-10 sm:w-12 sm:h-12',
    lg: 'w-10 h-10 xs:w-12 xs:h-12 sm:w-14 sm:h-14 md:w-16 md:h-16'
  };
  const iconSizes = {
    sm: 'w-3 h-3 xs:w-4 xs:h-4 sm:w-5 sm:h-5',
    md: 'w-4 h-4 xs:w-5 xs:h-5 sm:w-6 sm:h-6',
    lg: 'w-5 h-5 xs:w-6 xs:h-6 sm:w-7 sm:h-7 md:w-8 md:h-8'
  };
  return (
    <motion.button
      whileHover={onClick ? { scale: 1.12 } : {}}
      whileTap={onClick ? { scale: 0.92 } : {}}
      animate={pulsing ? { boxShadow: ['0 0 0px transparent', `0 0 18px var(--tw-shadow-color)`, '0 0 0px transparent'] } : {}}
      transition={pulsing ? { repeat: Infinity, duration: 1.6 } : {}}
      onClick={onClick}
      className={clsx(
        sizes[size], `token-scale-${size}`, 'rounded-xl sm:rounded-2xl border-2 flex items-center justify-center transition-all select-none',
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
  const sizes = {
    sm: 'w-7 h-7 xs:w-8 xs:h-8 sm:w-10 sm:h-10',
    md: 'w-9 h-9 xs:w-10 xs:h-10 sm:w-12 sm:h-12',
    lg: 'w-10 h-10 xs:w-12 xs:h-12 sm:w-14 sm:h-14 md:w-16 md:h-16'
  };
  return (
    <motion.button
      whileHover={onClick ? { scale: 1.05 } : {}}
      onClick={onClick}
      className={clsx(
        sizes[size], `token-scale-${size}`, 'rounded-xl sm:rounded-2xl border-2 border-dashed border-zinc-700 bg-zinc-900/20 shadow-inner',
        'flex items-center justify-center text-zinc-500 font-black',
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

const PixelSkull = () => (
  <svg className="w-8 h-8 sm:w-10 sm:h-10" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Head shape */}
    <rect x="5" y="1" width="6" height="1" fill="#c8966c" />
    <rect x="4" y="2" width="8" height="1" fill="#c8966c" />
    <rect x="3" y="3" width="10" height="7" fill="#c8966c" />
    {/* Eyes */}
    <rect x="5" y="6" width="2" height="2" fill="#0d0d15" />
    <rect x="9" y="6" width="2" height="2" fill="#0d0d15" />
    {/* Nose */}
    <rect x="7" y="8" width="2" height="1" fill="#0d0d15" />
    <rect x="8" y="9" width="1" height="1" fill="#0d0d15" />
    {/* Teeth/Jaw */}
    <rect x="5" y="10" width="6" height="3" fill="#c8966c" />
    <rect x="6" y="13" width="4" height="1" fill="#c8966c" />
    <rect x="6" y="11" width="1" height="2" fill="#0d0d15" />
    <rect x="8" y="11" width="1" height="2" fill="#0d0d15" />
    <rect x="10" y="11" width="1" height="2" fill="#0d0d15" />
    {/* Highlights/Details */}
    <rect x="5" y="2" width="1" height="1" fill="#e4e1ed" opacity="0.4" />
    <rect x="6" y="3" width="2" height="1" fill="#e4e1ed" opacity="0.4" />
    <rect x="4" y="4" width="1" height="2" fill="#e4e1ed" opacity="0.4" />
  </svg>
);

// Omen Styles and Descriptions
const OMEN_DETAILS: Record<string, { name: string; desc: string; color: string; border: string; bg: string; icon: React.ElementType }> = {
  FURY: { name: 'Fury', desc: 'Enemy mana increases +1 each turn you take damage.', color: 'text-red-400', border: 'border-red-500/30', bg: 'bg-red-950/40', icon: Zap },
  ENRAGE: { name: 'Enrage', desc: 'Repeating the same spells consecutively deals 0 damage.', color: 'text-orange-400', border: 'border-orange-500/30', bg: 'bg-orange-950/40', icon: Skull },
  DRAIN: { name: 'Drain', desc: 'Enemy removes your leftmost pool element each turn.', color: 'text-violet-400', border: 'border-violet-500/30', bg: 'bg-violet-950/40', icon: Droplets },
  SHIELD: { name: 'Shield', desc: 'Enemy takes 50% less damage from all spells.', color: 'text-sky-400', border: 'border-sky-500/30', bg: 'bg-sky-950/40', icon: Shield },
  CURSE: { name: 'Curse', desc: 'Void elements infect your pool next turn if you take damage.', color: 'text-purple-400', border: 'border-purple-500/30', bg: 'bg-purple-950/40', icon: Skull },
};

const ULTIMATE_DESC: Record<string, string> = {
  BERSERKER: 'Deal 20 dmg. FIRE spells deal x2 dmg this turn.',
  WIZARD: 'Gain +1 temporary mana/AIR. Spells combo without adjacency.',
  OVERSEER: 'Reveal enemy intent queue for 2 turns.',
  PALADIN: 'Fortress: Immune to all player damage this turn.',
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

// ── Main Component ─────────────────────────────────────────────────────────────
export default function CombatView() {
  const {
    gamePhase, pendingLevelUpChoices, claimRewardSpell,
    claimRewardSpellAndReplace,
    combatState, player, lastClash,
    placeElement, injectSpare, returnSpareFromSlot, clearSequence,
    submitSequence, clearLastClash,
    unleashUltimate, biome,
    replaceEquippedSpell,
  } = useGameStore();

  const [showTutorial, setShowTutorial] = useState(false);
  const [activeTab, setActiveTab] = useState<'loop' | 'counters' | 'spells' | 'negation' | 'ultimates' | 'omens'>('loop');
  const [selectedChoiceIdx, setSelectedChoiceIdx] = useState<number | null>(null);
  const [swapLoading, setSwapLoading] = useState(false);

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
      <>
        <div className="flex flex-col items-center justify-center w-full min-h-screen bg-zinc-950 p-4 sm:p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/30 via-zinc-950 to-teal-950/20 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-emerald-500/8 rounded-full blur-[120px] pointer-events-none" />

        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative z-10 w-full max-w-3xl flex flex-col items-center">
          <motion.div animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 2.5 }} className="p-3 sm:p-4 bg-emerald-500/20 rounded-2xl mb-3 sm:mb-4 border border-emerald-500/30">
            <Sparkles className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-400" />
          </motion.div>
          <div className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.4em] text-emerald-400 mb-1">Victory!</div>
          <h2 className="text-2xl sm:text-4xl font-black uppercase tracking-tight bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent italic mb-2">
            Choose a Spell
          </h2>
          <div className="flex gap-4 sm:gap-6 text-xs font-semibold text-zinc-400 mb-6 sm:mb-8">
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-5 w-full mb-6 sm:mb-8">
            {choices.map((choice: any, idx: number) => (
              <motion.button
                key={idx}
                initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}
                onClick={async () => {
                  const equippedCount = player?.spells?.filter((s) => s.equipped).length ?? 0;
                  if (equippedCount >= 4) {
                    setSelectedChoiceIdx(idx);
                  } else {
                    await claimRewardSpell(idx);
                  }
                }}
                className="flex flex-col gap-3 p-4 sm:p-5 rounded-2xl bg-zinc-900/60 border border-white/8 hover:border-emerald-500/50 hover:bg-emerald-500/8 transition-all group text-left"
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

          <button onClick={() => claimRewardSpell(-1)} className="px-6 sm:px-8 py-3 bg-zinc-900/60 border border-white/8 hover:border-white/20 text-zinc-400 hover:text-white font-black uppercase tracking-widest rounded-xl transition-all text-xs">
            Skip Reward
          </button>
        </motion.div>
      </div>

      {/* Spell Swap Modal – shown when loadout is full and player selected a choice */}
      {selectedChoiceIdx !== null && player && choices[selectedChoiceIdx] && (
        <SpellSwapModal
          incomingSpell={{
            id: 'incoming',
            name: choices[selectedChoiceIdx].name,
            recipe: choices[selectedChoiceIdx].recipe,
            baseDamage: choices[selectedChoiceIdx].baseDamage,
            isAdvanced: choices[selectedChoiceIdx].isAdvanced ?? false,
            isUpgraded: false,
            equipped: false,
            location: 'LIBRARY',
          }}
          equippedSpells={player.spells.filter((s) => s.equipped)}
          loading={swapLoading}
          onReplace={async (outgoingId) => {
            setSwapLoading(true);
            await claimRewardSpellAndReplace(selectedChoiceIdx, outgoingId);
            setSwapLoading(false);
            setSelectedChoiceIdx(null);
          }}
          onDiscard={() => setSelectedChoiceIdx(null)}
        />
      )}
      </>
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

  let bgClass = "bg-zinc-950";
  let gradientOverlay = "from-zinc-950/25 via-zinc-950/60 to-zinc-950/90";
  if (biome === 'SIROCCO') {
    bgClass = "bg-[#0c0502]";
    gradientOverlay = "from-amber-950/15 via-[#0c0502]/70 to-red-950/15";
  } else if (biome === 'SEPULCHER') {
    bgClass = "bg-[#020e0d]";
    gradientOverlay = "from-teal-950/20 via-[#020e0d]/70 to-cyan-950/20";
  } else if (biome === 'VOID_SCAUR') {
    bgClass = "bg-[#070110]";
    gradientOverlay = "from-purple-950/20 via-[#070110]/70 to-fuchsia-950/20";
  }

  return (
    <div className={`relative flex flex-col w-full h-screen overflow-hidden transition-colors duration-1000 ${bgClass}`}>
      {/* Dungeon Background */}
      <div
        className="absolute inset-0 bg-cover bg-center mix-blend-normal opacity-35 z-0 pointer-events-none"
        style={{ backgroundImage: `url('/dungeon_combat_bg.png')` }}
      />
      <div className={`absolute inset-0 bg-gradient-to-b ${gradientOverlay} z-0 pointer-events-none`} />

      {/* Floating Tutorial Button — top right */}
      <div className="absolute top-2 right-2 sm:top-4 sm:right-4 md:top-6 md:right-6 z-20">
        <button
          onClick={() => setShowTutorial(true)}
          className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 bg-zinc-900/80 border border-white/10 hover:border-emerald-500/50 hover:bg-emerald-900/20 text-zinc-300 hover:text-emerald-400 text-[10px] sm:text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md backdrop-blur-sm cursor-pointer"
        >
          <HelpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-pulse text-zinc-400" />
          <span className="hidden xs:inline">Rules &amp; Tutorial</span>
          <span className="xs:hidden">Rules</span>
        </button>
      </div>

      {/* ── Top: Enemy Section ─────────────────────────────────────────────── */}
      <motion.div initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className="relative z-10 flex flex-col items-center pt-3 sm:pt-5 md:pt-6 pb-1 sm:pb-2 px-3 sm:px-6 gap-1.5 sm:gap-2.5 combat-enemy-section">

        {/* Enemy name + HP bar */}
        <div className="flex items-center gap-2 sm:gap-3">
          <PixelSkull />
          <div className="flex flex-col">
            <div className="flex items-center gap-2 sm:gap-3">
              <h2 className="font-anybody text-lg sm:text-2xl md:text-3xl font-black italic tracking-wide text-white uppercase text-shadow-[2px_2px_0px_#0d0d15]">
                {enemy.name}
              </h2>
              {enemy.isEliteOrBoss && (
                <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-purple-950/60 border border-purple-500/40 text-purple-300">
                  {enemy.tier === 3 ? 'Boss' : 'Elite'}
                </span>
              )}
            </div>
            {/* HP progress bar */}
            <div className="relative w-44 sm:w-64 md:w-80 h-4 sm:h-5 bg-zinc-950 rounded-lg overflow-hidden border border-zinc-800 shadow-inner flex items-center justify-center mt-0.5 sm:mt-1">
              <motion.div
                animate={{ width: `${(displayedEnemyHp / enemy.maxHp) * 100}%` }}
                transition={{ duration: 0.4 }}
                className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-red-600 to-pink-500 rounded-r"
              />
              <span className="relative z-10 text-[9px] sm:text-[10px] font-space-mono font-black text-white drop-shadow-[1px_1px_0px_#000]">
                {displayedEnemyHp} / {enemy.maxHp} HP
              </span>
            </div>
          </div>
        </div>

        {/* Active Omen Banner */}
        {activeOmen && OMEN_DETAILS[activeOmen] && (
          <div className={clsx(
            'flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1 rounded-full border text-[9px] sm:text-[10px] font-bold shadow-md max-w-full animate-pulse backdrop-blur-sm',
            OMEN_DETAILS[activeOmen].bg, OMEN_DETAILS[activeOmen].border
          )}>
            <span className={clsx('font-black uppercase tracking-wider shrink-0', OMEN_DETAILS[activeOmen].color)}>
              Omen: {OMEN_DETAILS[activeOmen].name}
            </span>
            <span className="text-zinc-300 truncate hidden sm:inline">
              — {OMEN_DETAILS[activeOmen].desc}
            </span>
          </div>
        )}

        {/* Enemy Spellbook — compact on mobile, pill on desktop */}
        <div className="flex flex-wrap gap-1 sm:gap-2 justify-center max-w-full sm:max-w-2xl">
          {enemy.spellbook.map((spell, i) => (
            <div key={i} className="flex items-center gap-1 sm:gap-2.5 px-2 sm:px-4 md:px-5 py-1 sm:py-2 rounded-full border border-red-500/30 bg-red-950/15 text-xs shadow-md">
              <Eye className="w-3 h-3 sm:w-4 sm:h-4 text-red-400 shrink-0" />
              <span className="font-bold text-zinc-200 text-[10px] sm:text-sm mr-0.5 sm:mr-1 truncate max-w-[70px] sm:max-w-none">{spell.name}</span>
              <span className="flex items-center gap-0.5 sm:gap-1">
                {spell.recipe.map((el, idx) => {
                  const style = EL[el];
                  const Icon = style.icon;
                  return (
                    <span key={idx} className={clsx('inline-flex items-center justify-center p-0.5 sm:p-1 rounded-md bg-zinc-950/80 border', style.border, style.color)}>
                      <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    </span>
                  );
                })}
              </span>
              <span className="text-zinc-400 font-bold text-[9px] sm:text-xs ml-1">→ {spell.baseDamage}</span>
            </div>
          ))}
        </div>

        {/* Enemy Queue */}
        <div className="flex flex-col items-center gap-0.5 sm:gap-1">
          <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-zinc-500">Enemy Intent</span>
          <div className="flex gap-1.5 sm:gap-2">
            {enemyQueue.map((el, i) => {
              const isMaskedBySand = combatState.sandBlindnessActive && i < 2;
              if (enemyQueueRevealed && el && !isMaskedBySand) {
                const style = EL[el];
                const Icon = style.icon;
                return (
                  <div key={i} className={clsx(
                    'w-9 h-9 sm:w-11 sm:h-11 md:w-12 md:h-12 token-scale-md rounded-xl border-2 flex items-center justify-center shadow-md animate-bounce bg-zinc-900/60',
                    style.bg, style.border
                  )}>
                    <Icon className={clsx('w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6', style.color)} />
                  </div>
                );
              }
              if (isMaskedBySand) {
                return (
                  <div key={i} className="w-9 h-9 sm:w-11 sm:h-11 md:w-12 md:h-12 token-scale-md rounded-xl border-2 border-amber-600 bg-amber-950/20 flex flex-col items-center justify-center shadow-md animate-pulse">
                    <span className="text-amber-500 font-black text-[9px] sm:text-[10px] uppercase tracking-tighter">Sand</span>
                  </div>
                );
              }
              return (
                <div key={i} className="w-9 h-9 sm:w-11 sm:h-11 md:w-12 md:h-12 token-scale-md rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-900/10 flex items-center justify-center shadow-md">
                  <span className="text-zinc-600 font-black text-sm sm:text-base">?</span>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* ── Middle: Clash Arena / Sequence Board ──────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar w-full flex flex-col items-center justify-start px-2 sm:px-4 py-2 sm:py-4 gap-2 sm:gap-4 relative z-10 combat-middle-area">

        {/* Clash Animation Overlay */}
        <AnimatePresence mode="wait">
          {animPhase !== 'NONE' && lastClash ? (
            <motion.div key="clash-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="w-full max-w-2xl bg-zinc-900/70 border border-white/8 rounded-2xl p-3 sm:p-4 backdrop-blur-md flex flex-col items-center gap-2 sm:gap-3">

              {animPhase === 'RESOLVING' && (
                <>
                  <h3 className="text-xs sm:text-sm font-black uppercase tracking-widest text-zinc-300">Sequence Resolving...</h3>
                  <div className="flex gap-1.5 sm:gap-2 flex-wrap justify-center">
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
                          className={clsx('flex flex-col items-center gap-1 p-1.5 sm:p-2 rounded-xl border',
                            isResolved ? 'bg-zinc-800/80 border-zinc-600/40' : 'bg-zinc-900/40 border-zinc-800/40'
                          )}>
                          <div className="flex items-center gap-1 sm:gap-2">
                            {PIcon && pStyle
                              ? <div className={clsx('w-8 h-8 sm:w-10 sm:h-10 rounded-xl border flex items-center justify-center shadow-md', pStyle.bg, pStyle.border)}><PIcon className={clsx('w-4 h-4 sm:w-5 sm:h-5', pStyle.color)} /></div>
                              : <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl border border-zinc-800 bg-zinc-900 flex items-center justify-center text-zinc-700 text-xs">—</div>}
                            <span className="text-zinc-600 text-xs font-bold">vs</span>
                            {EIcon && eStyle
                              ? <div className={clsx('w-8 h-8 sm:w-10 sm:h-10 rounded-xl border flex items-center justify-center shadow-md', eStyle.bg, eStyle.border)}><EIcon className={clsx('w-4 h-4 sm:w-5 sm:h-5', eStyle.color)} /></div>
                              : <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl border border-zinc-800 bg-zinc-900 flex items-center justify-center text-zinc-700 text-xs">?</div>}
                          </div>
                          {isResolved && (
                            <span className={clsx('text-[8px] sm:text-[9px] font-black uppercase', resultColors[slot.result])}>
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
                <motion.div key={animSpell} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 1.3, opacity: 0 }} className="flex flex-col items-center gap-2 sm:gap-3 py-3 sm:py-4">
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-950/40 via-red-950/30 to-yellow-950/20 rounded-2xl pointer-events-none" />
                  <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-400 animate-pulse" />
                  <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-widest bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent italic text-center">
                    {lastClash.triggeredSpells[animSpell].name}
                  </h1>
                  <p className="text-lg sm:text-xl font-black text-white">
                    {lastClash.triggeredSpells[animSpell].damage} damage!
                  </p>
                </motion.div>
              )}

              {animPhase === 'SUMMARY' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-2 sm:gap-3 w-full">
                  <div className={clsx('flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider border',
                    lastClash.enemyDamageNegated
                      ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400'
                      : 'bg-zinc-800/60 border-zinc-600/40 text-zinc-300'
                  )}>
                    <Shield className="w-4 h-4" />
                    {lastClash.enemyDamageNegated
                      ? `Enemy damage NEGATED! (${Math.round(lastClash.counterPercent * 100)}% countered)`
                      : `${Math.round(lastClash.counterPercent * 100)}% countered — damage not negated`}
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:gap-3 w-full max-w-sm text-xs">
                    <div className="bg-zinc-900/60 border border-white/5 rounded-xl p-2 sm:p-3 text-center">
                      <div className="text-zinc-500 mb-1">Dealt to Enemy</div>
                      <div className="text-green-400 font-black text-base sm:text-lg">{lastClash.totalEnemyDamage}</div>
                    </div>
                    <div className="bg-zinc-900/60 border border-white/5 rounded-xl p-2 sm:p-3 text-center">
                      <div className="text-zinc-500 mb-1">Taken</div>
                      <div className="text-red-400 font-black text-base sm:text-lg">{lastClash.totalPlayerDamage}</div>
                    </div>
                  </div>
                  {(lastClash.triggeredSpells.length > 0 || lastClash.basicStrikeDamage > 0) && (
                    <div className="flex flex-wrap gap-1.5 sm:gap-2 justify-center">
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
                    className="mt-1 sm:mt-2 px-6 sm:px-8 py-2 sm:py-2.5 bg-zinc-100 hover:bg-white text-zinc-950 font-black uppercase tracking-widest rounded-xl transition-all hover:scale-105 text-xs shadow-md">
                    Continue
                  </button>
                </motion.div>
              )}
            </motion.div>
          ) : (
            /* ── Planning Mode ────────────────────────────────────────────────── */
            <motion.div key="plan-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-1.5 sm:gap-4 md:gap-5 w-full max-w-3xl py-1">

              {/* Your Spells */}
              <div className="flex flex-col items-center gap-1 sm:gap-1.5 w-full">
                <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-zinc-500">Your Spells</span>
                <div className="flex gap-2 sm:gap-3 md:gap-4 justify-start sm:justify-center overflow-x-auto no-scrollbar max-w-full w-full px-4 sm:px-2 pb-1.5 sm:pb-0">
                  {player.spells.filter(s => s.equipped).map((spell) => {
                    const spellClass = SPELL_CLASS_MAP[spell.name] ?? 'NEUTRAL';
                    return (
                      <div
                        key={spell.id}
                        className="flex flex-col flex-shrink-0 gap-1 sm:gap-1.5 p-2 sm:p-3 rounded-xl border-2 border-zinc-800 bg-[#1e1b18]/90 text-left min-w-[90px] sm:min-w-[110px] md:min-w-[125px] shadow-lg relative overflow-hidden transition-all hover:scale-[1.02] spell-card-scale"
                      >
                        <div className="font-bold text-zinc-200 text-[10px] sm:text-xs truncate max-w-[80px] sm:max-w-[100px] md:max-w-[120px]">{spell.name}</div>
                        <div className={clsx('text-[7px] sm:text-[8px] font-black uppercase tracking-widest leading-none',
                          spellClass === 'BERSERKER' ? 'text-red-400' :
                          spellClass === 'PALADIN' ? 'text-sky-400' :
                          spellClass === 'WIZARD' ? 'text-violet-400' : 'text-emerald-400'
                        )}>
                          / {spellClass}
                        </div>
                        <div className="flex items-center gap-0.5 sm:gap-1 mt-0.5 sm:mt-1 flex-wrap">
                          {spell.recipe.map((el, idx) => {
                            const elStyle = EL[el];
                            const Icon = elStyle.icon;
                            return (
                              <span key={idx} className={clsx(
                                'flex items-center gap-0.5 px-1 py-0.5 rounded border text-[7px] sm:text-[8px] font-black',
                                elStyle.bg, elStyle.border, elStyle.color
                              )}>
                                <Icon className="w-2 h-2" />
                                {el[0]}
                              </span>
                            );
                          })}
                        </div>
                        <div className="text-zinc-400 font-mono text-[8px] sm:text-[9px] font-semibold mt-0.5 sm:mt-1 text-center w-full">
                          {spell.isUpgraded ? Math.floor(spell.baseDamage * 1.25) : spell.baseDamage} dmg
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Clash Rules Chart */}
              <div className="relative flex flex-col items-center gap-1 w-full bg-zinc-950/80 rounded-2xl py-1.5 sm:py-2 px-3 sm:px-5 max-w-full sm:max-w-lg shadow-lg border-2 border-purple-500/50 shadow-purple-500/10 clash-rules-chart">
                <div className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Clash Rules</div>
                <div className="flex items-center gap-1.5 sm:gap-3 text-[9px] sm:text-[11px] text-zinc-300 font-black flex-wrap justify-center select-none font-space-mono">
                  <span className="flex items-center gap-0.5 sm:gap-1">
                    <span className="flex items-center gap-0.5 text-[#5adf82]"><Mountain className="w-3 h-3 sm:w-4 sm:h-4" /> Earth</span>
                    <ChevronRight className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-zinc-600" />
                    <span className="flex items-center gap-0.5 text-orange-400"><Flame className="w-3 h-3 sm:w-4 sm:h-4" /> Fire</span>
                  </span>
                  <span className="text-zinc-700 font-bold">|</span>
                  <span className="flex items-center gap-0.5 sm:gap-1">
                    <span className="flex items-center gap-0.5 text-orange-400"><Flame className="w-3 h-3 sm:w-4 sm:h-4" /> Fire</span>
                    <ChevronRight className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-zinc-600" />
                    <span className="flex items-center gap-0.5 text-violet-300"><Wind className="w-3 h-3 sm:w-4 sm:h-4" /> Air</span>
                  </span>
                  <span className="text-zinc-700 font-bold">|</span>
                  <span className="flex items-center gap-0.5 sm:gap-1">
                    <span className="flex items-center gap-0.5 text-violet-300"><Wind className="w-3 h-3 sm:w-4 sm:h-4" /> Air</span>
                    <ChevronRight className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-zinc-600" />
                    <span className="flex items-center gap-0.5 text-sky-400"><Droplets className="w-3 h-3 sm:w-4 sm:h-4" /> Water</span>
                  </span>
                  <span className="text-zinc-700 font-bold">|</span>
                  <span className="flex items-center gap-0.5 sm:gap-1">
                    <span className="flex items-center gap-0.5 text-sky-400"><Droplets className="w-3 h-3 sm:w-4 sm:h-4" /> Water</span>
                    <ChevronRight className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-zinc-600" />
                    <span className="flex items-center gap-0.5 text-[#5adf82]"><Mountain className="w-3 h-3 sm:w-4 sm:h-4" /> Earth</span>
                  </span>
                </div>
              </div>

              {/* Sequence Board */}
              <div className="flex flex-col items-center gap-1 sm:gap-2">
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-zinc-400">
                  Your Sequence ({placedElements.length}/{boardLength})
                </span>
                <div className="flex gap-1.5 sm:gap-2 md:gap-3 flex-wrap justify-center">
                  {playerSequence.map((el, i) => (
                    <div key={i} className="flex flex-col items-center gap-0.5 sm:gap-1">
                      {el ? (
                        <ElementToken element={el} size="lg" onClick={() => handleSlotClick(i)} />
                      ) : (
                        <EmptySlot index={i} size="lg" onClick={() => handleSlotClick(i)} />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Element Pool & Spares — side-by-side on larger screens, stacked on mobile */}
              <div className="flex flex-col xs:flex-row items-center xs:items-start justify-center gap-4 xs:gap-6 sm:gap-8 md:gap-10 w-full max-w-2xl">
                {/* Available Pool */}
                <div className="flex flex-col items-center gap-1 sm:gap-2">
                  <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-zinc-500">
                    Element Pool
                  </span>
                  <div className="flex gap-1.5 sm:gap-2.5 justify-center min-h-[2.5rem] sm:min-h-[3.5rem] flex-wrap">
                    {remainingPool.map((el, i) => (
                      <ElementToken
                        key={`pool-${i}`}
                        element={el}
                        size="lg"
                        onClick={() => handlePoolClick(el, i)}
                      />
                    ))}
                    {remainingPool.length === 0 && (
                      <span className="text-zinc-700 text-xs italic self-center">Pool empty</span>
                    )}
                  </div>
                </div>

                {/* Spare Elements Inventory */}
                <div className="flex flex-col items-center gap-1 sm:gap-2">
                  <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-zinc-500">
                    Spare Elements
                  </span>
                  <div className="flex gap-1.5 sm:gap-2.5 justify-center min-h-[2.5rem] sm:min-h-[3.5rem] flex-wrap">
                    {(Object.entries(spareElements) as [CardElement, number][])
                      .filter(([, count]) => count > 0)
                      .map(([el, count]) => {
                        const style = EL[el];
                        const Icon = style.icon;
                        return (
                          <motion.button key={el}
                            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                            onClick={() => injectSpare(el)}
                            className={clsx('flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl border-2 transition-all shadow-md', style.bg, style.border)}>
                            <Icon className={clsx('w-3 h-3 sm:w-3.5 sm:h-3.5', style.color)} />
                            <span className={clsx('text-[10px] sm:text-xs font-black', style.color)}>x{count}</span>
                          </motion.button>
                        );
                      })}
                    {!(Object.values(spareElements).some(v => v > 0)) && (
                      <span className="text-zinc-700 text-xs italic self-center">No spares</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Submit / Clear buttons */}
              <div className="flex gap-2 sm:gap-4 mt-0.5 sm:mt-1">
                <motion.button
                  whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                  onClick={() => submitSequence()}
                  disabled={!canSubmit}
                  className="flex items-center gap-1.5 sm:gap-2 px-5 sm:px-8 py-2 sm:py-2.5 bg-[#4a5568]/80 hover:bg-[#4a5568] disabled:bg-zinc-800 disabled:text-zinc-600 disabled:border-zinc-700 text-white font-black uppercase tracking-widest rounded-xl border border-[#718096] transition-all text-[10px] sm:text-xs shadow-md shadow-black/40 cursor-pointer"
                >
                  <Sword className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  EXECUTE
                </motion.button>
                <button
                  onClick={() => clearSequence()}
                  className="flex items-center gap-1.5 sm:gap-2 px-5 sm:px-8 py-2 sm:py-2.5 bg-[#742a2a]/80 hover:bg-[#742a2a] text-zinc-100 font-black uppercase tracking-widest rounded-xl border border-red-500/50 transition-all text-[10px] sm:text-xs shadow-md shadow-black/40 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  CLEAR
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Bottom: Dashboard Bar ── */}
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full bg-[#0d0e12] border-t-2 border-zinc-800/80 py-1.5 sm:py-3 px-2 sm:px-6 md:px-8 flex flex-row items-center justify-between gap-1 sm:gap-4 z-10 shadow-2xl combat-dashboard-bar"
      >
        {/* Left Side: HP & Mana */}
        <div className="flex items-center gap-1.5 sm:gap-4 md:gap-6 justify-start">
          {/* HP Label & Bar */}
          <div className="flex items-center gap-1 sm:gap-3 bg-zinc-900/40 border border-zinc-800 rounded-lg sm:rounded-xl px-1.5 sm:px-4 py-1 sm:py-2">
            <span className="text-[9px] sm:text-xs font-black text-emerald-500 uppercase tracking-widest">HP</span>
            <div className="w-14 xs:w-24 sm:w-36 md:w-48 h-2 sm:h-3 bg-zinc-950 rounded border border-zinc-800 overflow-hidden flex items-center">
              <motion.div
                animate={{ width: `${(player.currentHp / player.maxHp) * 100}%` }}
                className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-r"
              />
            </div>
            <span className="text-[9px] sm:text-xs text-zinc-300 font-mono font-bold tracking-tight">
              {player.currentHp}<span className="hidden sm:inline"> / {player.maxHp}</span>
            </span>
          </div>

          {/* Mana Badge */}
          <div className="flex items-center gap-1 bg-[#2d1b4e]/30 border border-violet-500/30 rounded-lg sm:rounded-xl px-1.5 sm:px-4 py-1 sm:py-2 text-violet-300">
            <Zap className="w-3 h-3 sm:w-4 sm:h-4 fill-violet-400/20" />
            <span className="text-[9px] sm:text-xs font-black uppercase tracking-wider">{player.playerMana} Mana</span>
          </div>
        </div>

        {/* Right Side: Focus & Ultimate */}
        <div className="flex items-center gap-1.5 sm:gap-4 md:gap-6 justify-end">
          {/* Focus Pips */}
          <div className="flex items-center gap-1 sm:gap-3 bg-zinc-900/40 border border-zinc-800 rounded-lg sm:rounded-xl px-1.5 sm:px-4 py-1 sm:py-1.5">
            <div className="flex flex-col gap-0.5">
              <span className="text-[7px] sm:text-[9px] font-black uppercase tracking-wider text-amber-500 flex items-center gap-0.5 sm:gap-1">
                <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-500 animate-pulse" />
                Focus ({focusPips}/5)
              </span>
              <div className="flex gap-0.5 sm:gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className={clsx(
                      'w-2 h-1 xs:w-3.5 xs:h-1.5 sm:w-5 sm:h-2 rounded-sm border transition-all duration-300',
                      i < focusPips
                        ? 'bg-amber-400 border-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.6)]'
                        : 'bg-zinc-950 border-zinc-800'
                    )}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Ultimate Unleash */}
          <div className="flex flex-col items-end">
            <button
              onClick={() => unleashUltimate()}
              disabled={focusPips < 5 || focusAbilityUsed}
              className={clsx(
                'px-2 xs:px-3 sm:px-4 py-1.5 font-black uppercase tracking-widest text-[8px] sm:text-[10px] rounded-lg sm:rounded-xl border transition-all duration-300',
                focusPips >= 5 && !focusAbilityUsed
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-400 border-amber-300 text-zinc-950 shadow-[0_0_15px_rgba(251,191,36,0.5)] hover:scale-105 cursor-pointer animate-pulse'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-600 cursor-not-allowed'
              )}
            >
              {focusAbilityUsed ? 'ULTIMATE ACTIVE' : 'UNLEASH'}
            </button>
            <span className="hidden xs:block text-[7px] sm:text-[8px] text-zinc-500 font-bold uppercase tracking-wider text-right mt-0.5 sm:mt-1 max-w-[120px] sm:max-w-[180px] leading-tight">
              {ULTIMATE_DESC[player.class] || ''}
            </span>
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
            className="absolute inset-0 bg-zinc-950/85 backdrop-blur-md flex items-center justify-center z-50 p-2 sm:p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-zinc-900 border-2 sm:border-4 border-[#c8966c] shadow-[4px_4px_0px_0px_#0d0d15] sm:shadow-[8px_8px_0px_0px_#0d0d15] rounded-2xl sm:rounded-3xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col relative"
            >
              {/* Glossy sheen */}
              <div className="absolute top-0 left-0 right-0 h-16 sm:h-24 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />

              {/* Header */}
              <div className="p-3 sm:p-6 border-b border-zinc-800 flex items-center justify-between relative z-10">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                    <BookOpen className="w-4 h-4 sm:w-6 sm:h-6 text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="font-anybody text-base sm:text-xl font-black uppercase tracking-tight text-white italic">
                      Combat Rules &amp; Tutorial
                    </h2>
                    <p className="text-[9px] sm:text-[10px] font-space-mono text-zinc-400 uppercase tracking-widest mt-0.5">
                      Master the mechanics of the Dungeon Clash
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeTutorial}
                  className="p-1.5 sm:px-4 sm:py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 text-zinc-300 font-black uppercase tracking-wider text-xs rounded-xl transition-all cursor-pointer"
                >
                  <X className="w-4 h-4 sm:hidden" />
                  <span className="hidden sm:inline">Close [ESC]</span>
                </button>
              </div>

              {/* Layout Content */}
              <div className="flex-1 flex flex-col sm:flex-row overflow-hidden min-h-0 relative z-10">
                {/* Tabs — horizontal scroll on mobile, sidebar on desktop */}
                <div className="sm:w-1/3 border-b sm:border-b-0 sm:border-r border-zinc-800 bg-zinc-950/40 p-2 sm:p-4 flex flex-row sm:flex-col gap-1 sm:gap-2 overflow-x-auto sm:overflow-y-auto">
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
                          'flex items-center gap-1.5 sm:gap-2.5 px-2.5 sm:px-4 py-2 sm:py-3 rounded-xl border text-left text-[9px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer shrink-0 sm:shrink',
                          activeTab === tab.id
                            ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 shadow-[inset_0_0_12px_rgba(16,185,129,0.1)]'
                            : 'bg-zinc-900/40 border-zinc-800/40 hover:border-zinc-700/60 text-zinc-400 hover:text-zinc-200'
                        )}
                      >
                        <Icon className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="truncate">{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Tab Pane */}
                <div className="flex-1 p-3 sm:p-6 overflow-y-auto font-space-grotesk text-xs sm:text-sm leading-relaxed text-zinc-300">
                  {activeTab === 'loop' && (
                    <div className="flex flex-col gap-3 sm:gap-4">
                      <h3 className="text-base sm:text-lg font-black uppercase text-white tracking-wide">The Combat Cycle</h3>
                      <p>
                        Dungeon Sweeper combat is a turn-based tactical element-matching game. Each battle round consists of a <strong>Planning Phase</strong> and a <strong>Resolution Phase (Clash)</strong>.
                      </p>
                      <div className="bg-zinc-950/60 border border-zinc-800 rounded-2xl p-3 sm:p-4 flex flex-col gap-2 sm:gap-3 font-space-mono text-[11px] sm:text-xs text-zinc-400">
                        <div className="flex items-start gap-2 sm:gap-2.5">
                          <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center font-bold text-emerald-400 text-[9px] sm:text-[10px] shrink-0">1</span>
                          <span>Analyze the enemy's spells, HP, and stats. Keep an eye on active Omens!</span>
                        </div>
                        <div className="flex items-start gap-2 sm:gap-2.5">
                          <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center font-bold text-emerald-400 text-[9px] sm:text-[10px] shrink-0">2</span>
                          <span>Choose elements from your <strong>Element Pool</strong> to place in sequence slots. You can also inject <strong>Spare Elements</strong> from your inventory.</span>
                        </div>
                        <div className="flex items-start gap-2 sm:gap-2.5">
                          <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center font-bold text-emerald-400 text-[9px] sm:text-[10px] shrink-0">3</span>
                          <span>Click <strong>Execute</strong> to start the clash. The system resolves slots left-to-right, triggers matching spells, and resolves damage.</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'counters' && (
                    <div className="flex flex-col gap-3 sm:gap-4">
                      <h3 className="text-base sm:text-lg font-black uppercase text-white tracking-wide">The Elemental Counter Wheel</h3>
                      <p>
                        Understanding counter matchups is vital to negate enemy attacks and generate energy. The wheel flows in this order:
                      </p>
                      <div className="grid grid-cols-2 gap-2 sm:gap-3 bg-zinc-950/40 border border-zinc-800/80 rounded-2xl p-3 sm:p-4 text-[11px] sm:text-xs font-space-mono">
                        <div className="flex items-center gap-1.5 sm:gap-2 p-2 rounded-xl bg-amber-950/30 border border-amber-600/30 text-amber-500">
                          <Mountain className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                          <span>Earth <span className="text-zinc-600">counters</span> Fire</span>
                        </div>
                        <div className="flex items-center gap-1.5 sm:gap-2 p-2 rounded-xl bg-orange-950/30 border border-orange-600/30 text-orange-400">
                          <Flame className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                          <span>Fire <span className="text-zinc-600">counters</span> Air</span>
                        </div>
                        <div className="flex items-center gap-1.5 sm:gap-2 p-2 rounded-xl bg-violet-950/30 border border-violet-600/30 text-violet-300">
                          <Wind className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                          <span>Air <span className="text-zinc-600">counters</span> Water</span>
                        </div>
                        <div className="flex items-center gap-1.5 sm:gap-2 p-2 rounded-xl bg-sky-950/30 border border-sky-600/30 text-sky-400">
                          <Droplets className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                          <span>Water <span className="text-zinc-600">counters</span> Earth</span>
                        </div>
                      </div>
                      <div className="p-3 sm:p-4 bg-purple-950/20 border border-purple-500/20 rounded-2xl flex gap-2 sm:gap-3 text-[11px] sm:text-xs">
                        <Skull className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400 shrink-0 mt-0.5" />
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
                    <div className="flex flex-col gap-3 sm:gap-4">
                      <h3 className="text-base sm:text-lg font-black uppercase text-white tracking-wide">Spells &amp; Combos</h3>
                      <p>
                        Triggering spells is your primary method of dealing damage. Spells are scanned <strong>left-to-right</strong> in your sequence:
                      </p>
                      <div className="flex flex-col gap-2 sm:gap-3 text-[11px] sm:text-xs font-space-mono">
                        <div className="p-2.5 sm:p-3 bg-zinc-950/60 border border-zinc-800 rounded-xl">
                          <span className="font-bold text-white">🔮 Sliding Window Matching:</span>
                          <p className="text-zinc-400 mt-1">
                            The engine searches for contiguous matches of your equipped spell recipes. Once elements are consumed to match a spell, they cannot be used by another spell. Longest spells match first.
                          </p>
                        </div>
                        <div className="p-2.5 sm:p-3 bg-zinc-950/60 border border-zinc-800 rounded-xl">
                          <span className="font-bold text-amber-400">✦ Spell Combos:</span>
                          <p className="text-zinc-400 mt-1">
                            If two spell recipes trigger adjacent to each other on the board, they trigger a combo!
                            <br />• 1st Combo: <strong className="text-amber-400">1.5x damage</strong>
                            <br />• 2nd Combo and beyond: <strong className="text-amber-400">2.0x damage</strong>
                          </p>
                        </div>
                        <div className="p-2.5 sm:p-3 bg-zinc-950/60 border border-zinc-800 rounded-xl">
                          <span className="font-bold text-sky-400">⚡ Basic Strike:</span>
                          <p className="text-zinc-400 mt-1">
                            Any element placed in your sequence that is NOT countered by the enemy AND is NOT consumed by a spell recipe deals basic strike damage (<strong className="text-sky-300">1 + floor/2</strong> per element).
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'negation' && (
                    <div className="flex flex-col gap-3 sm:gap-4">
                      <h3 className="text-base sm:text-lg font-black uppercase text-white tracking-wide">The 40% Damage Negation</h3>
                      <p>
                        You don't need to counter every single slot to protect yourself.
                      </p>
                      <div className="p-4 sm:p-5 bg-emerald-950/30 border border-emerald-500/30 rounded-2xl flex flex-col gap-2">
                        <div className="text-emerald-400 font-bold text-sm sm:text-base flex items-center gap-2">
                          <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
                          The 40% Block Rule
                        </div>
                        <p className="text-zinc-300 text-[11px] sm:text-xs">
                          If the total slots you successfully counter in your sequence is <strong>40% or more</strong> of the board length, <strong>ALL enemy damage for the round is completely negated (reduced to 0)</strong>!
                        </p>
                      </div>
                      <div className="text-[11px] sm:text-xs text-zinc-400 font-space-mono">
                        For a sequence length of 5:
                        <br />• <strong>0–1 counters</strong>: You fail the threshold. You take full damage from uncountered slots.
                        <br />• <strong>2–5 counters</strong>: You reach the 40% threshold! All incoming damage is negated!
                      </div>
                    </div>
                  )}

                  {activeTab === 'ultimates' && (
                    <div className="flex flex-col gap-3 sm:gap-4">
                      <h3 className="text-base sm:text-lg font-black uppercase text-white tracking-wide">Focus &amp; Ultimates</h3>
                      <p>
                        Each player class has a game-changing <strong>Ultimate Focus Ability</strong>.
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-[11px] sm:text-xs">
                        <div className="p-2.5 sm:p-3 bg-zinc-950/60 border border-zinc-800 rounded-xl">
                          <div className="text-[#db031a] font-bold uppercase mb-1">Berserker: Ignite</div>
                          <p className="text-zinc-400">Deal 20 damage immediately. All FIRE spells deal double damage this turn.</p>
                        </div>
                        <div className="p-2.5 sm:p-3 bg-zinc-950/60 border border-zinc-800 rounded-xl">
                          <div className="text-[#c084fc] font-bold uppercase mb-1">Wizard: Cascade</div>
                          <p className="text-zinc-400">Gain +1 Mana/AIR slot. All spells combo regardless of adjacency.</p>
                        </div>
                        <div className="p-2.5 sm:p-3 bg-zinc-950/60 border border-zinc-800 rounded-xl">
                          <div className="text-[#5adf82] font-bold uppercase mb-1">Overseer: Tactician</div>
                          <p className="text-zinc-400">Reveals the enemy's intent queue (actual elements) for 2 turns.</p>
                        </div>
                        <div className="p-2.5 sm:p-3 bg-zinc-950/60 border border-zinc-800 rounded-xl">
                          <div className="text-[#38bdf8] font-bold uppercase mb-1">Paladin: Fortress</div>
                          <p className="text-zinc-400">Immune to all player damage this round.</p>
                        </div>
                      </div>
                      <div className="p-3 sm:p-3.5 bg-amber-950/20 border border-amber-500/20 rounded-xl text-[11px] sm:text-xs font-space-mono text-amber-300">
                        <strong>Charging Focus:</strong> You gain +1 Focus Pip for each slot you counter and +1 for each triggered spell. You lose -1 Focus Pip when you take damage. When at 5 Focus Pips, unleash your Ultimate!
                      </div>
                    </div>
                  )}

                  {activeTab === 'omens' && (
                    <div className="flex flex-col gap-3 sm:gap-4">
                      <h3 className="text-base sm:text-lg font-black uppercase text-white tracking-wide">Active Omens &amp; Boss Prediction AI</h3>
                      <p>
                        Dungeon Sweeper challenges you with shifting modifiers and highly intelligent elites.
                      </p>
                      <div className="flex flex-col gap-2 sm:gap-2.5 text-[11px] sm:text-xs font-space-mono">
                        <div className="p-2.5 sm:p-3 bg-zinc-950/60 border border-zinc-800 rounded-xl">
                          <span className="font-bold text-white">⚠️ Active Omens:</span>
                          <p className="text-zinc-400 mt-1">
                            An Omen modifies rules each turn. E.g., <code>Fury</code> speeds up enemies, <code>Enrage</code> negates consecutive spell repetitions, <code>Drain</code> removes elements, <code>Shield</code> blocks damage, and <code>Curse</code> adds Void elements.
                          </p>
                        </div>
                        <div className="p-2.5 sm:p-3 bg-zinc-950/60 border border-zinc-800 rounded-xl">
                          <span className="font-bold text-purple-400">👑 Elite &amp; Boss Prediction AI:</span>
                          <p className="text-zinc-400 mt-1">
                            Elites and Bosses are <strong>Omniscient</strong>. They inspect your equipped spells and predict your optimal sequence layout, creating a counter intent queue explicitly designed to shut you down. Sequence unpredictably to defeat them!
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="p-3 sm:p-5 border-t border-zinc-800 bg-zinc-950/50 flex items-center justify-between relative z-10">
                <span className="text-[9px] sm:text-[10px] text-zinc-500 font-space-mono hidden sm:inline">
                  Dungeon Sweeper — Pair Programming Edition
                </span>
                <button
                  onClick={closeTutorial}
                  className="w-full sm:w-auto px-6 sm:px-8 py-2.5 sm:py-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black uppercase tracking-widest rounded-xl transition-all hover:scale-[1.02] shadow-lg shadow-emerald-500/20 cursor-pointer text-xs"
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
