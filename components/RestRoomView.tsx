'use client';

import { useGameStore } from '@/store/useGameStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Heart, Hammer, Trash2, Wrench, RefreshCw } from 'lucide-react';
import { restAction, sharpenCard, maintainAllCards, purgeCard } from '@/lib/actions';
import CardComponent from './Card';
import { Card } from '@/lib/types';
import { useState } from 'react';

type RestMode = 'MAIN' | 'HEAL' | 'SHARPEN' | 'PURGE';

export default function RestRoomView() {
  const { player, sessionId } = useGameStore();
  const [mode, setMode] = useState<RestMode>('MAIN');

  if (!player || !sessionId) return null;

  const applyState = (sessionData: any) => {
    if (sessionData) {
      useGameStore.setState({
        gamePhase: sessionData.phase,
        player: sessionData.player,
        grid: sessionData.grid,
      });
    }
  };

  const handleHeal = async () => {
    applyState(await restAction(sessionId, 'HEAL'));
  };

  const handleMaintain = async () => {
    applyState(await maintainAllCards(sessionId));
  };

  const handleSharpen = async (cardId: string) => {
    applyState(await sharpenCard(sessionId, cardId));
  };

  const handlePurge = async (cardId: string) => {
    applyState(await purgeCard(sessionId, cardId));
  };

  const allDeckCards = player.deck;
  const ashCards = allDeckCards.filter((c) => c.isAsh);
  const usableCards = allDeckCards.filter((c) => !c.isAsh);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="glass w-full max-w-2xl p-8 rounded-3xl border-zinc-800 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="p-4 bg-orange-500/20 rounded-2xl mb-4">
            <Flame className="w-10 h-10 text-orange-500 animate-pulse" />
          </div>
          <h2 className="text-4xl font-black uppercase tracking-tighter mb-2">Restful Campfire</h2>
          <p className="text-zinc-500 max-w-md font-medium text-sm">
            The warmth of the fire eases your soul. Choose <strong className="text-zinc-300">one</strong> action.
          </p>
          {ashCards.length > 0 && (
            <div className="mt-3 px-4 py-2 bg-zinc-800/60 rounded-xl text-xs text-orange-400 font-bold">
              ⚠ {ashCards.length} card{ashCards.length > 1 ? 's' : ''} turned to Ash — repair or purge them!
            </div>
          )}
        </div>

        <AnimatePresence mode="wait">
          {mode === 'MAIN' && (
            <motion.div key="main" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="grid grid-cols-2 gap-4 mb-6">
                {/* Heal */}
                <button
                  onClick={handleHeal}
                  className="flex flex-col items-center gap-4 p-6 rounded-3xl bg-white/5 border border-white/5 hover:border-red-500/50 hover:bg-red-500/5 transition-all group"
                >
                  <div className="p-4 bg-red-500/20 rounded-2xl group-hover:scale-110 transition-transform">
                    <Heart className="w-8 h-8 text-red-500" />
                  </div>
                  <div className="text-center">
                    <span className="block font-black uppercase tracking-tighter text-zinc-100">Rest & Heal</span>
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">+50% HP</span>
                  </div>
                </button>

                {/* General Maintenance */}
                <button
                  onClick={handleMaintain}
                  className="flex flex-col items-center gap-4 p-6 rounded-3xl bg-white/5 border border-white/5 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all group"
                >
                  <div className="p-4 bg-emerald-500/20 rounded-2xl group-hover:scale-110 transition-transform">
                    <RefreshCw className="w-8 h-8 text-emerald-500" />
                  </div>
                  <div className="text-center">
                    <span className="block font-black uppercase tracking-tighter text-zinc-100">Maintain All</span>
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">+2 Uses to Every Card</span>
                  </div>
                </button>

                {/* Sharpen one card */}
                <button
                  onClick={() => setMode('SHARPEN')}
                  className="flex flex-col items-center gap-4 p-6 rounded-3xl bg-white/5 border border-white/5 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all group"
                >
                  <div className="p-4 bg-blue-500/20 rounded-2xl group-hover:scale-110 transition-transform">
                    <Wrench className="w-8 h-8 text-blue-500" />
                  </div>
                  <div className="text-center">
                    <span className="block font-black uppercase tracking-tighter text-zinc-100">Sharpen</span>
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Fully Restore One Card</span>
                  </div>
                </button>

                {/* Purge */}
                <button
                  onClick={() => setMode('PURGE')}
                  className="flex flex-col items-center gap-4 p-6 rounded-3xl bg-white/5 border border-white/5 hover:border-yellow-500/50 hover:bg-yellow-500/5 transition-all group"
                >
                  <div className="p-4 bg-yellow-500/20 rounded-2xl group-hover:scale-110 transition-transform">
                    <Trash2 className="w-8 h-8 text-yellow-500" />
                  </div>
                  <div className="text-center">
                    <span className="block font-black uppercase tracking-tighter text-zinc-100">Purge</span>
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Delete a Card Forever</span>
                  </div>
                </button>
              </div>
            </motion.div>
          )}

          {(mode === 'SHARPEN' || mode === 'PURGE') && (
            <motion.div key={mode} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-zinc-100">
                  {mode === 'SHARPEN'
                    ? '🔧 Select a card to fully restore:'
                    : '🗑 Select a card to permanently destroy:'}
                </h3>
                <button onClick={() => setMode('MAIN')} className="text-sm text-zinc-500 hover:text-white">
                  Cancel
                </button>
              </div>

              {mode === 'PURGE' && ashCards.length > 0 && (
                <p className="text-xs text-orange-400 mb-3">Ash cards shown first — purge them to clean your deck!</p>
              )}

              <div className="flex flex-wrap gap-3 max-h-[360px] overflow-y-auto p-2">
                {/* Show Ash cards first for PURGE */}
                {(mode === 'PURGE' ? [...ashCards, ...usableCards] : allDeckCards).map((c) => (
                  <div
                    key={c.id}
                    onClick={() => mode === 'SHARPEN' ? handleSharpen(c.id) : handlePurge(c.id)}
                    className="cursor-pointer hover:scale-105 transition-transform"
                  >
                    <CardComponent card={c} selected={false} onClick={() => {}} />
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex justify-center mt-6">
          <p className="text-zinc-600 text-[10px] font-bold uppercase tracking-[0.3em]">
            Choose wisely — rest rooms can only be used once
          </p>
        </div>
      </motion.div>
    </div>
  );
}
