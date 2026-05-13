'use client';

import { useGameStore } from '@/store/useGameStore';
import CardComponent from './Card';
import { evaluateElementalHand } from '@/lib/combatEngine';
import { motion, AnimatePresence } from 'framer-motion';
import { Sword, RotateCcw, Skull, Flame, Snowflake, Zap, Wind } from 'lucide-react';
import { clsx } from 'clsx';
import { StatusEffect, CardElement } from '@/lib/types';

// ── Element styling ────────────────────────────────────────────────────────────
const ELEMENT_STYLES: Record<CardElement, { color: string; glow: string; icon: React.ElementType }> = {
  FIRE:        { color: 'text-orange-400', glow: 'rgba(249,115,22,0.3)',  icon: Flame },
  ICE:         { color: 'text-sky-400',    glow: 'rgba(56,189,248,0.3)',  icon: Snowflake },
  ELECTRICITY: { color: 'text-yellow-400', glow: 'rgba(250,204,21,0.3)', icon: Zap },
  WIND:        { color: 'text-emerald-400', glow: 'rgba(52,211,153,0.3)', icon: Wind },
};

const STATUS_STYLES: Record<StatusEffect['type'], { color: string; icon: React.ElementType; bg: string }> = {
  BURN:  { color: 'text-orange-400', icon: Flame,     bg: 'bg-orange-500/10 border-orange-500/20' },
  FREEZE:{ color: 'text-sky-400',    icon: Snowflake, bg: 'bg-sky-500/10 border-sky-500/20' },
  CHAIN: { color: 'text-yellow-400', icon: Zap,       bg: 'bg-yellow-500/10 border-yellow-500/20' },
  PUSH:  { color: 'text-emerald-400', icon: Wind,     bg: 'bg-emerald-500/10 border-emerald-500/20' },
};

export default function CombatView() {
  const { combatState, player, lastSpell, selectCard, deselectCard, playHand, discardHand } = useGameStore();

  if (!combatState || !combatState.enemy || !player) return null;

  const { enemy, hand, selectedCards, discardsRemaining, handsRemaining } = combatState;

  // Live preview using the combat engine (client-side only — server validates on submit)
  const preview = evaluateElementalHand(
    selectedCards,
    player.class,
    player.passives
  );

  const dominantEl = preview.dominantElement !== 'HYBRID' ? preview.dominantElement : 'FIRE';
  const elStyle = ELEMENT_STYLES[dominantEl as CardElement];
  const ElIcon = elStyle.icon;

  const statusEffects: StatusEffect[] = enemy.statusEffects ?? [];

  return (
    <div className="relative flex flex-col items-center justify-between w-full h-screen overflow-hidden py-10 px-4 bg-zinc-950">
      {/* Dynamic background glow matching dominant element */}
      <AnimatePresence mode="wait">
        <motion.div
          key={dominantEl}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse at 50% 0%, ${elStyle.glow} 0%, transparent 55%)` }}
        />
      </AnimatePresence>

      {/* Enemy Section */}
      <motion.div
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex flex-col items-center gap-4 w-full max-w-2xl z-10"
      >
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ repeat: Infinity, duration: 3.5, ease: 'easeInOut' }}
          className="p-5 bg-zinc-900/50 border border-red-900/30 rounded-full shadow-[0_0_50px_rgba(239,68,68,0.1)] backdrop-blur-md"
        >
          <Skull className="w-14 h-14 text-red-500 fill-red-500/10" />
        </motion.div>

        <h2 className="text-2xl font-black uppercase tracking-[0.3em] text-zinc-100 italic">{enemy.name}</h2>

        {/* Enemy HP Bar */}
        <div className="w-full max-w-md flex flex-col gap-1">
          <div className="flex justify-between text-[10px] font-black uppercase tracking-widest px-1">
            <span className="text-red-500">Integrity</span>
            <span className="text-zinc-400 font-mono">{enemy.currentHp} / {enemy.maxHp}</span>
          </div>
          <div className="w-full h-3 bg-zinc-900 rounded-full border border-white/5 p-[2px] overflow-hidden">
            <motion.div
              animate={{ width: `${(enemy.currentHp / enemy.maxHp) * 100}%` }}
              className="h-full bg-gradient-to-r from-red-800 to-red-500 rounded-full shadow-[0_0_12px_rgba(239,68,68,0.5)]"
            />
          </div>
        </div>

        {/* Active Status Effects on Enemy */}
        {statusEffects.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center">
            {statusEffects.map((effect, i) => {
              const s = STATUS_STYLES[effect.type];
              const SIcon = s.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold ${s.bg} ${s.color}`}
                >
                  <SIcon className="w-3 h-3" />
                  {effect.label}
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Last spell resolved (shown briefly) */}
        {lastSpell && lastSpell.damage > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-xs text-zinc-500 italic"
          >
            Last: <span className={elStyle.color}>{lastSpell.spellName}</span> — {lastSpell.damage} dmg
          </motion.div>
        )}
      </motion.div>

      {/* Spell Preview Panel */}
      <div className="flex flex-col items-center gap-6 w-full max-w-4xl z-20">
        <motion.div layout className="glass p-6 rounded-[2rem] flex flex-col items-center min-w-[380px] relative overflow-hidden">
          <motion.div
            animate={{ opacity: [0.04, 0.1, 0.04], scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 3 }}
            className="absolute inset-0 rounded-full blur-[80px]"
            style={{ background: elStyle.glow }}
          />

          <AnimatePresence mode="wait">
            <motion.div
              key={preview.spellName}
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -16, opacity: 0 }}
              className="flex flex-col items-center relative z-10 w-full"
            >
              <div className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.4em] mb-1">
                {selectedCards.length > 0 ? 'Spell Detected' : 'Select Cards'}
              </div>

              <div className={clsx('text-3xl font-black uppercase tracking-tight italic mb-1', preview.damage > 0 ? elStyle.color : 'text-zinc-700')}>
                {preview.damage > 0 ? preview.spellName : 'Awaiting Strategy'}
              </div>

              {preview.damage > 0 && (
                <p className="text-zinc-500 text-xs text-center max-w-xs mb-3">{preview.description}</p>
              )}

              {/* Damage breakdown */}
              <div className="flex items-center gap-6 mt-1">
                <div className="flex flex-col items-center">
                  <span className="text-3xl font-black text-blue-400 font-mono">{preview.baseDamage}</span>
                  <span className="text-[10px] text-zinc-500 uppercase mt-0.5">Base</span>
                </div>
                <div className="text-xl font-black text-zinc-700">×</div>
                <div className="flex flex-col items-center">
                  <span className="text-3xl font-black text-red-500 font-mono">{preview.multiplier.toFixed(1)}</span>
                  <span className="text-[10px] text-zinc-500 uppercase mt-0.5">Mult</span>
                </div>
                {preview.damage > 0 && (
                  <>
                    <div className="text-xl font-black text-zinc-700">=</div>
                    <div className="flex flex-col items-center">
                      <span className={`text-3xl font-black font-mono ${elStyle.color}`}>{preview.damage}</span>
                      <span className="text-[10px] text-zinc-500 uppercase mt-0.5">Total</span>
                    </div>
                  </>
                )}
              </div>

              {/* Extra effects preview */}
              {preview.newStatusEffects.length > 0 && (
                <div className="flex gap-2 mt-3 flex-wrap justify-center">
                  {preview.newStatusEffects.map((eff, i) => {
                    const s = STATUS_STYLES[eff.type];
                    const SIcon = s.icon;
                    return (
                      <span key={i} className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${s.bg} ${s.color}`}>
                        <SIcon className="w-3 h-3" /> {eff.label}
                      </span>
                    );
                  })}
                </div>
              )}
              {preview.extraDraws > 0 && (
                <div className="text-[10px] text-emerald-400 font-bold mt-2">+{preview.extraDraws} card draws</div>
              )}
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={playHand}
            disabled={selectedCards.length === 0}
            className="group relative flex items-center gap-3 px-10 py-4 bg-zinc-100 hover:bg-white disabled:bg-zinc-800 text-zinc-950 font-black uppercase tracking-[0.2em] rounded-2xl transition-all hover:scale-105 active:scale-95 disabled:hover:scale-100"
          >
            <Sword className="w-5 h-5" />
            <span>Cast ({handsRemaining})</span>
            <div className="absolute -top-3 left-0 right-0 flex justify-center gap-1">
              {Array.from({ length: handsRemaining }).map((_, i) => (
                <div key={i} className="w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
              ))}
            </div>
          </button>

          <button
            onClick={discardHand}
            disabled={selectedCards.length === 0 || discardsRemaining <= 0}
            className="flex items-center gap-3 px-10 py-4 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 text-zinc-400 font-black uppercase tracking-[0.2em] rounded-2xl border border-white/5 transition-all hover:scale-105 active:scale-95"
          >
            <RotateCcw className="w-5 h-5" />
            <span>Discard ({discardsRemaining})</span>
          </button>
        </div>
      </div>

      {/* Player Hand */}
      <div className="flex flex-col items-center gap-4 w-full z-10">
        {/* Player HP */}
        <div className="flex flex-col gap-1 w-full max-w-sm">
          <div className="flex justify-between text-[10px] font-black uppercase tracking-widest px-1">
            <span className="text-green-500">Player</span>
            <span className="text-zinc-400 font-mono">{player.currentHp} / {player.maxHp}</span>
          </div>
          <div className="w-full h-2 bg-zinc-900 rounded-full border border-white/5 overflow-hidden">
            <motion.div
              animate={{ width: `${(player.currentHp / player.maxHp) * 100}%` }}
              className="h-full bg-gradient-to-r from-green-700 to-green-400"
            />
          </div>
        </div>

        {/* Hand */}
        <div className="flex flex-wrap justify-center gap-2 perspective-1000">
          <AnimatePresence mode="popLayout">
            {hand.map((card, i) => (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 50, rotateX: 45 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <CardComponent
                  card={card}
                  selected={!!selectedCards.find((c) => c.id === card.id)}
                  onClick={() => {
                    if (selectedCards.find((c) => c.id === card.id)) {
                      deselectCard(card);
                    } else {
                      selectCard(card);
                    }
                  }}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
