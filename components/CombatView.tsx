'use client';

import { useGameStore } from '@/store/useGameStore';
import CardComponent from './Card';
import { motion, AnimatePresence } from 'framer-motion';
import { Sword, RotateCcw, Skull, Flame, Droplets, Wind, Mountain, Shield } from 'lucide-react';
import { clsx } from 'clsx';
import { StatusEffect, CardElement } from '@/lib/types';
import { useEffect, useState } from 'react';

const ELEMENT_STYLES: Record<CardElement, { color: string; bg: string; icon: React.ElementType }> = {
  FIRE:        { color: 'text-orange-400', bg: 'bg-orange-900/50 border-orange-500/50',  icon: Flame },
  WATER:       { color: 'text-sky-400',    bg: 'bg-sky-900/50 border-sky-500/50',     icon: Droplets },
  AIR:         { color: 'text-white',      bg: 'bg-zinc-800/50 border-zinc-500/50',   icon: Wind },
  EARTH:       { color: 'text-amber-600',  bg: 'bg-amber-900/50 border-amber-500/50', icon: Mountain },
  VOID:        { color: 'text-purple-400', bg: 'bg-purple-900/50 border-purple-500/50', icon: Skull },
};

const STATUS_STYLES: Record<StatusEffect['type'], { color: string; icon: React.ElementType; bg: string }> = {
  BURN:  { color: 'text-orange-400', icon: Flame,     bg: 'bg-orange-500/10 border-orange-500/20' },
  FREEZE:{ color: 'text-sky-400',    icon: Droplets, bg: 'bg-sky-500/10 border-sky-500/20' },
  CHAIN: { color: 'text-yellow-400', icon: Wind,       bg: 'bg-yellow-500/10 border-yellow-500/20' },
  PUSH:  { color: 'text-emerald-400', icon: Mountain,     bg: 'bg-emerald-500/10 border-emerald-500/20' },
};

export default function CombatView() {
  const { combatState, player, lastClash, selectCard, deselectCard, playQueue, discardHand, clearLastClash } = useGameStore();
  const [animationPhase, setAnimationPhase] = useState<'NONE' | 'CLASHING' | 'SPELLS' | 'SUMMARY'>('NONE');
  const [animatingFrame, setAnimatingFrame] = useState(0);
  const [animatingSpellIndex, setAnimatingSpellIndex] = useState(0);
  const [displayedEnemyHp, setDisplayedEnemyHp] = useState(0);

  useEffect(() => {
    if (lastClash && lastClash.frames.length > 0) {
      setAnimationPhase('CLASHING');
      setAnimatingFrame(0);
      setAnimatingSpellIndex(0);
      setDisplayedEnemyHp(lastClash.enemyHpAtStart);
    } else {
      setAnimationPhase('NONE');
      if (combatState?.enemy) {
        setDisplayedEnemyHp(combatState.enemy.currentHp);
      }
    }
  }, [lastClash, combatState?.enemy]);

  // Handle phases
  useEffect(() => {
    if (animationPhase === 'CLASHING') {
      const interval = setInterval(() => {
        setAnimatingFrame(prev => {
          const currentFrame = lastClash!.frames[prev];
          if (currentFrame) {
            setDisplayedEnemyHp(currentFrame.enemyHpAfter);
          }
          
          const isEnemyDefeated = currentFrame && currentFrame.enemyHpAfter <= 0;

          if (prev >= lastClash!.frames.length - 1 || isEnemyDefeated) {
            clearInterval(interval);
            if (isEnemyDefeated) {
              setAnimationPhase('SUMMARY');
            } else if (lastClash!.spellsTriggered.length > 0) {
              setAnimationPhase('SPELLS');
            } else {
              setAnimationPhase('SUMMARY');
            }
            return prev + 1;
          }
          return prev + 1;
        });
      }, 800);
      return () => clearInterval(interval);
    }

    if (animationPhase === 'SPELLS') {
      const interval = setInterval(() => {
        setAnimatingSpellIndex(prev => {
          if (prev >= lastClash!.spellsTriggered.length - 1) {
            clearInterval(interval);
            setAnimationPhase('SUMMARY');
            return prev + 1;
          }
          return prev + 1;
        });
      }, 2000); // 2 seconds per spell animation
      return () => clearInterval(interval);
    }
  }, [animationPhase, lastClash]);

  if (!combatState || !combatState.enemy || !player) {
    return <div className="flex items-center justify-center h-screen bg-zinc-950 text-white">Loading Combat State...</div>;
  }

  const { enemy, hand, playerQueue, enemyQueue, enemyQueueRevealed, queueSlots, maxVigor, currentVigor } = combatState;
  const statusEffects: StatusEffect[] = enemy.statusEffects ?? [];

  return (
    <div className="relative flex flex-col items-center justify-between w-full h-screen overflow-hidden py-6 px-4 bg-zinc-950">
      
      {/* ── Elemental Counters Panel ── */}
      <div className="absolute top-6 left-6 flex flex-col gap-2 p-4 bg-zinc-900/40 border border-white/5 rounded-2xl backdrop-blur-md z-10 pointer-events-none hidden sm:flex">
        <span className="text-[9px] text-zinc-500 font-black uppercase tracking-widest mb-1 text-center">Element Advantages</span>
        <div className="flex flex-col gap-2">
          {/* Earth beats Fire */}
          <div className="flex items-center justify-between gap-3 text-sm bg-zinc-950/50 p-2 rounded-xl border border-white/5">
            <Mountain className="w-4 h-4 text-amber-600" />
            <span className="text-zinc-600 font-black text-[10px]">&gt;</span>
            <Flame className="w-4 h-4 text-orange-400" />
          </div>
          {/* Fire beats Air */}
          <div className="flex items-center justify-between gap-3 text-sm bg-zinc-950/50 p-2 rounded-xl border border-white/5">
            <Flame className="w-4 h-4 text-orange-400" />
            <span className="text-zinc-600 font-black text-[10px]">&gt;</span>
            <Wind className="w-4 h-4 text-white" />
          </div>
          {/* Air beats Water */}
          <div className="flex items-center justify-between gap-3 text-sm bg-zinc-950/50 p-2 rounded-xl border border-white/5">
            <Wind className="w-4 h-4 text-white" />
            <span className="text-zinc-600 font-black text-[10px]">&gt;</span>
            <Droplets className="w-4 h-4 text-sky-400" />
          </div>
          {/* Water beats Earth */}
          <div className="flex items-center justify-between gap-3 text-sm bg-zinc-950/50 p-2 rounded-xl border border-white/5">
            <Droplets className="w-4 h-4 text-sky-400" />
            <span className="text-zinc-600 font-black text-[10px]">&gt;</span>
            <Mountain className="w-4 h-4 text-amber-600" />
          </div>
        </div>
      </div>

      {/* ── Enemy Section ── */}
      <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex flex-col items-center gap-3 w-full max-w-2xl z-10">
        <div className="flex items-center gap-4">
          <motion.div
            animate={{ y: [0, -5, 0] }}
            transition={{ repeat: Infinity, duration: 3.5, ease: 'easeInOut' }}
            className="p-4 bg-zinc-900/50 border border-red-900/30 rounded-full backdrop-blur-md"
          >
            <Skull className="w-10 h-10 text-red-500" />
          </motion.div>
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-black uppercase tracking-widest text-zinc-100 italic">{enemy.name}</h2>
            {/* Enemy HP as Vigor for now */}
            <div className="w-48 h-3 bg-zinc-900 rounded-full border border-white/5 p-[2px] overflow-hidden">
              <motion.div
                animate={{ width: `${(displayedEnemyHp / enemy.maxHp) * 100}%` }}
                className="h-full bg-gradient-to-r from-red-800 to-red-500 rounded-full"
              />
            </div>
            <div className="text-[10px] text-zinc-400 font-mono text-right">{displayedEnemyHp} / {enemy.maxHp} HP</div>
          </div>
        </div>

        {/* Status Effects */}
        {statusEffects.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center">
            {statusEffects.map((effect, i) => {
              const s = STATUS_STYLES[effect.type];
              const SIcon = s.icon;
              return (
                <span key={i} className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-bold ${s.bg} ${s.color}`}>
                  <SIcon className="w-3 h-3" /> {effect.label}
                </span>
              );
            })}
          </div>
        )}

        {/* Enemy Intent Queue */}
        <div className="mt-2 flex flex-col items-center">
          <span className="text-[10px] text-red-400/70 font-black uppercase tracking-widest mb-1">Enemy Intent</span>
          <div className="flex gap-2">
            {enemyQueue.map((el, i) => {
              const isRevealed = enemyQueueRevealed;
              const style = isRevealed ? ELEMENT_STYLES[el] : null;
              const Icon = style?.icon;
              return (
                <div key={i} className={`w-12 h-12 rounded-lg border-2 flex items-center justify-center shadow-lg ${isRevealed ? style!.bg : 'bg-zinc-800 border-zinc-700'}`}>
                  {isRevealed && Icon ? <Icon className={`w-6 h-6 ${style.color}`} /> : <span className="text-zinc-600 font-bold">?</span>}
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* ── Clash Animation Area ── */}
      <div className="flex-1 w-full flex flex-col items-center justify-center relative">
        {animationPhase !== 'NONE' && lastClash ? (
          <div className="flex flex-col items-center gap-4 p-6 glass rounded-2xl border border-white/10 w-full max-w-2xl relative overflow-hidden">
            
            {/* Dynamic Background during Spells */}
            <AnimatePresence>
              {animationPhase === 'SPELLS' && (
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  exit={{ opacity: 0 }} 
                  className="absolute inset-0 bg-gradient-to-tr from-orange-900/40 via-red-900/40 to-yellow-900/40 z-0" 
                />
              )}
            </AnimatePresence>

            <h3 className="text-xl font-black uppercase text-zinc-300 italic tracking-widest mb-4 z-10">
              {animationPhase === 'CLASHING' ? 'Clashing...' : animationPhase === 'SPELLS' ? 'Spell Triggered!' : displayedEnemyHp <= 0 ? 'Enemy Defeated!' : 'Clash Complete'}
            </h3>
            
            <div className="z-10 w-full flex justify-center min-h-[120px] items-center">
              {animationPhase === 'CLASHING' && animatingFrame < lastClash.frames.length ? (
                // Show current frame clashing
                <AnimatePresence mode="wait">
                  <motion.div
                    key={animatingFrame}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 1.2, opacity: 0 }}
                    className="flex items-center gap-12"
                  >
                    {/* Player Side */}
                    <div className="flex flex-col items-center gap-2">
                      {lastClash.frames[animatingFrame].playerCard ? (
                        <div className={`w-16 h-16 rounded-xl border-2 flex items-center justify-center ${ELEMENT_STYLES[lastClash.frames[animatingFrame].playerCard!.element as CardElement]?.bg || ""}`}>
                          {(() => {
                             const style = ELEMENT_STYLES[lastClash.frames[animatingFrame].playerCard!.element as CardElement];
const Icon = style?.icon || Sword;
                             return <Icon className={`w-8 h-8 ${style?.color || ""}`} />;
                          })()}
                        </div>
                      ) : (
                         <div className="w-16 h-16 rounded-xl border-2 border-zinc-800 bg-zinc-900/50 flex items-center justify-center text-zinc-600">-</div>
                      )}
                      <span className="text-xs text-green-400 font-mono">Dmg: {lastClash.frames[animatingFrame].damageToEnemy}</span>
                    </div>

                    {/* Clash Text */}
                    <div className="text-2xl font-black text-zinc-500 uppercase italic">VS</div>

                    {/* Enemy Side */}
                    <div className="flex flex-col items-center gap-2">
                       {lastClash.frames[animatingFrame].enemyElement ? (
                        <div className={`w-16 h-16 rounded-xl border-2 flex items-center justify-center ${ELEMENT_STYLES[lastClash.frames[animatingFrame].enemyElement as CardElement]?.bg || ""}`}>
                          {(() => {
                             const estyle = ELEMENT_STYLES[lastClash.frames[animatingFrame].enemyElement as CardElement];
const Icon = estyle?.icon || Shield;
                             return <Icon className={`w-8 h-8 ${estyle?.color || ""}`} />;
                          })()}
                        </div>
                      ) : (
                         <div className="w-16 h-16 rounded-xl border-2 border-zinc-800 bg-zinc-900/50 flex items-center justify-center text-zinc-600">-</div>
                      )}
                      <span className="text-xs text-red-400 font-mono">Dmg: {lastClash.frames[animatingFrame].damageToPlayer}</span>
                    </div>
                  </motion.div>
                </AnimatePresence>
              ) : animationPhase === 'SPELLS' && animatingSpellIndex < lastClash.spellsTriggered.length ? (
                // Show combo sequence visualization
                <AnimatePresence mode="wait">
                   <motion.div
                     key={animatingSpellIndex}
                     initial={{ scale: 0.5, opacity: 0, y: 20 }}
                     animate={{ scale: [1.2, 1], opacity: 1, y: 0 }}
                     exit={{ scale: 1.5, opacity: 0, filter: 'blur(10px)' }}
                     transition={{ duration: 0.8 }}
                     className="flex flex-col items-center justify-center py-4"
                   >
                     <motion.h1 
                       className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 italic uppercase tracking-[0.2em] drop-shadow-[0_0_30px_rgba(255,165,0,0.8)] text-center"
                     >
                       {lastClash.spellsTriggered[animatingSpellIndex]}
                     </motion.h1>
                     <motion.p className="text-xl text-white mt-4 font-bold tracking-widest uppercase opacity-80">
                       Combo Executed!
                     </motion.p>
                   </motion.div>
                 </AnimatePresence>
              ) : animationPhase === 'SUMMARY' ? (
                // Summary
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center text-center gap-2">
                  <p className="text-sm text-zinc-400">{lastClash.description}</p>
                  <div className="flex gap-4 mt-2">
                     <div className="text-green-400 font-black">Dealt: {lastClash.totalEnemyDamage} dmg</div>
                     <div className="text-red-400 font-black">Received: {lastClash.totalPlayerDamage} dmg</div>
                  </div>
                  <button
                    onClick={clearLastClash}
                    className="mt-6 px-8 py-3 bg-zinc-100 hover:bg-white text-zinc-950 font-black uppercase tracking-widest rounded-xl transition-all hover:scale-105 active:scale-95"
                  >
                    Continue
                  </button>
                </motion.div>
              ) : null}
            </div>
          </div>
        ) : (
          // Planning Interface: Player Queue
          <div className="flex flex-col items-center w-full max-w-4xl z-20">
            <span className="text-sm text-zinc-400 font-black uppercase tracking-[0.3em] mb-4">Your Sequence</span>
            <div className="flex gap-4">
              {Array.from({ length: queueSlots }).map((_, i) => {
                const card = playerQueue[i];
                return (
                  <div key={i} className={`w-20 h-28 rounded-xl border-2 flex items-center justify-center transition-all ${card ? 'bg-zinc-800 border-zinc-600 scale-105' : 'bg-zinc-900/40 border-white/5 border-dashed'}`}>
                    {card ? (
                       <div className="flex flex-col items-center">
                          {(() => {
                             const elStyle = ELEMENT_STYLES[card.element as CardElement];
                             const Icon = elStyle.icon;
                             return <Icon className={`w-10 h-10 ${elStyle.color} drop-shadow-md`} />;
                          })()}
                       </div>
                    ) : (
                       <span className="text-zinc-600 font-bold opacity-30 text-2xl">{i + 1}</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 mt-10">
              <button
                onClick={playQueue}
                disabled={playerQueue.length === 0}
                className="flex items-center gap-3 px-10 py-4 bg-green-500 hover:bg-green-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 font-black uppercase tracking-[0.2em] rounded-2xl transition-all hover:scale-105 active:scale-95"
              >
                <Sword className="w-5 h-5" />
                <span>Execute Sequence</span>
              </button>

              <button
                onClick={() => {
                   // Quickly deselect all by clicking them out of queue (we can just loop or refresh)
                   // But since store only supports deselectCard individually, we can just clear them or let them discard.
                   // Actually, discardHand is available.
                   discardHand();
                }}
                disabled={playerQueue.length === 0}
                className="flex items-center gap-3 px-8 py-4 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 text-zinc-400 font-black uppercase tracking-[0.2em] rounded-2xl border border-white/5 transition-all hover:scale-105"
              >
                <RotateCcw className="w-5 h-5" />
                <span>Clear / Discard</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Player Section & Hand ── */}
      <div className="flex flex-col items-center gap-4 w-full z-10 pb-4">
        {/* Player Stats (Vigor & HP) */}
        <div className="flex gap-6 w-full max-w-md bg-zinc-900/50 p-3 rounded-2xl border border-white/10 backdrop-blur-md">
          {/* Vigor */}
          <div className="flex-1 flex flex-col gap-1">
            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest px-1">
              <span className="text-blue-400 flex items-center gap-1"><Shield className="w-3 h-3"/> Vigor</span>
              <span className="text-zinc-400 font-mono">{currentVigor} / {maxVigor}</span>
            </div>
            <div className="w-full h-2 bg-zinc-900 rounded-full border border-white/5 overflow-hidden">
              <motion.div
                animate={{ width: `${(currentVigor / maxVigor) * 100}%` }}
                className="h-full bg-gradient-to-r from-blue-700 to-blue-400"
              />
            </div>
          </div>
          {/* HP / Inner Injuries */}
          <div className="flex-1 flex flex-col gap-1">
            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest px-1">
              <span className="text-green-500">Health</span>
              <span className="text-zinc-400 font-mono">{player.currentHp} / {player.maxHp}</span>
            </div>
            <div className="w-full h-2 bg-zinc-900 rounded-full border border-white/5 overflow-hidden">
              <motion.div
                animate={{ width: `${(player.currentHp / player.maxHp) * 100}%` }}
                className="h-full bg-gradient-to-r from-green-700 to-green-400"
              />
            </div>
          </div>
        </div>

        {/* Hand */}
        <div className="flex flex-wrap justify-center gap-2 perspective-1000 mt-2">
          <AnimatePresence mode="popLayout">
            {hand.map((card, i) => {
              const isSelected = !!playerQueue.find((c) => c.id === card.id);
              return (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: isSelected ? 0.3 : 1, y: 0, scale: isSelected ? 0.9 : 1 }}
                  transition={{ delay: i * 0.04 }}
                  className={isSelected ? 'pointer-events-none' : ''}
                >
                  <CardComponent
                    card={card}
                    selected={isSelected}
                    onClick={() => {
                      if (isSelected) {
                        deselectCard(card);
                      } else {
                        selectCard(card);
                      }
                    }}
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
