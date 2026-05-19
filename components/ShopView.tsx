'use client';

import { useGameStore } from '@/store/useGameStore';
import { motion } from 'framer-motion';
import { ShoppingCart, X, Zap, Shield, Sparkles, Trash2, ArrowUpCircle } from 'lucide-react';
import { purchaseItem, exitShop, purchaseCardRemoval, purchaseCardUpgrade, purchaseRelic } from '@/lib/actions';
import CardComponent from './Card';
import { Card } from '@/lib/types';
import { useState } from 'react';

export default function ShopView() {
  const { player, sessionId, grid } = useGameStore();
  const [shopMode, setShopMode] = useState<'MAIN' | 'REMOVE' | 'UPGRADE'>('MAIN');

  if (!player || !sessionId) return null;

  const closeShop = async () => {
    const sessionData = await exitShop(sessionId);
    if (sessionData) {
      useGameStore.setState({ 
        gamePhase: sessionData.phase,
        player: sessionData.player,
        grid: sessionData.grid
      });
    } else {
      useGameStore.setState({ gamePhase: 'EXPLORING' });
    }
  };

  const handlePurchase = async (itemType: 'HEAL' | 'REVEAL') => {
    const sessionData = await purchaseItem(sessionId, itemType);
    if (sessionData) {
      useGameStore.setState({
        player: sessionData.player,
        grid: sessionData.grid,
      });
    }
  };

  const handleCardRemoval = async (cardId: string) => {
    const sessionData = await purchaseCardRemoval(sessionId, cardId);
    if (sessionData) {
      useGameStore.setState({ player: sessionData.player, grid: sessionData.grid });
      setShopMode('MAIN');
    }
  };

  const handleCardUpgrade = async (cardId: string) => {
    const sessionData = await purchaseCardUpgrade(sessionId, cardId);
    if (sessionData) {
      useGameStore.setState({ player: sessionData.player, grid: sessionData.grid });
      setShopMode('MAIN');
    }
  };

  const handleRelicPurchase = async () => {
    // Hardcoded for now. A real implementation would pick 3 random relics to offer.
    const sessionData = await purchaseRelic(sessionId, 'MITHRIL_COIN', 150);
    if (sessionData) {
      useGameStore.setState({ player: sessionData.player, grid: sessionData.grid });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="glass w-full max-w-2xl p-8 rounded-3xl border-zinc-800"
      >
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-yellow-500/20 rounded-xl">
              <ShoppingCart className="w-6 h-6 text-yellow-500" />
            </div>
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tighter">The Merchant</h2>
              <p className="text-zinc-500 text-sm font-medium italic">"Got some rare goods for a traveler like you..."</p>
            </div>
          </div>
          <button 
            onClick={closeShop}
            className="p-2 hover:bg-white/5 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-zinc-500" />
          </button>
        </div>

        {shopMode === 'MAIN' ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            <div 
              onClick={() => handlePurchase('REVEAL')}
              className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-yellow-500/50 transition-all cursor-pointer group flex flex-col h-full"
            >
              <h3 className="font-bold text-zinc-100 group-hover:text-yellow-500 transition-colors">Reveal Map</h3>
              <p className="text-xs text-zinc-500 mb-4 flex-grow">Instantly reveals 3 random hidden hexes.</p>
              <div className="flex items-center gap-2 text-yellow-500 font-mono font-bold mt-auto">
                <Zap className="w-4 h-4" /> 25g
              </div>
            </div>

            <div 
              onClick={() => handlePurchase('HEAL')}
              className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-yellow-500/50 transition-all cursor-pointer group flex flex-col h-full"
            >
              <h3 className="font-bold text-zinc-100 group-hover:text-yellow-500 transition-colors">Health Potion</h3>
              <p className="text-xs text-zinc-500 mb-4 flex-grow">Restores 25 HP.</p>
              <div className="flex items-center gap-2 text-yellow-500 font-mono font-bold mt-auto">
                <Zap className="w-4 h-4" /> 40g
              </div>
            </div>

            <div 
              onClick={() => setShopMode('REMOVE')}
              className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-yellow-500/50 transition-all cursor-pointer group flex flex-col h-full"
            >
              <div className="flex items-center gap-2 mb-1">
                <Trash2 className="w-4 h-4 text-zinc-400 group-hover:text-yellow-500" />
                <h3 className="font-bold text-zinc-100 group-hover:text-yellow-500 transition-colors">Remove Card</h3>
              </div>
              <p className="text-xs text-zinc-500 mb-4 flex-grow">Thin your deck by permanently destroying a card.</p>
              <div className="flex items-center gap-2 text-yellow-500 font-mono font-bold mt-auto">
                <Zap className="w-4 h-4" /> 50g
              </div>
            </div>

            <div 
              onClick={() => setShopMode('UPGRADE')}
              className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-yellow-500/50 transition-all cursor-pointer group flex flex-col h-full"
            >
              <div className="flex items-center gap-2 mb-1">
                <ArrowUpCircle className="w-4 h-4 text-zinc-400 group-hover:text-yellow-500" />
                <h3 className="font-bold text-zinc-100 group-hover:text-yellow-500 transition-colors">Upgrade Card</h3>
              </div>
              <p className="text-xs text-zinc-500 mb-4 flex-grow">Permanently upgrade a card's power.</p>
              <div className="flex items-center gap-2 text-yellow-500 font-mono font-bold mt-auto">
                <Zap className="w-4 h-4" /> 75g
              </div>
            </div>

            {!player.relics?.includes('MITHRIL_COIN') && (
              <div 
                onClick={handleRelicPurchase}
                className="col-span-2 p-4 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 hover:border-yellow-500/50 transition-all cursor-pointer group flex items-center justify-between"
              >
                <div>
                  <h3 className="font-black text-yellow-500 flex items-center gap-2">
                    <Shield className="w-4 h-4" /> Mithril Coin
                  </h3>
                  <p className="text-xs text-zinc-400">Relic. Max HP increases when you gain gold.</p>
                </div>
                <div className="flex items-center gap-2 text-yellow-500 font-mono font-bold">
                  <Zap className="w-4 h-4" /> 150g
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-zinc-100">
                {shopMode === 'REMOVE' ? 'Select a card to destroy:' : 'Select a card to upgrade:'}
              </h3>
              <button onClick={() => setShopMode('MAIN')} className="text-sm text-zinc-400 hover:text-white">
                Cancel
              </button>
            </div>
            <div className="flex flex-wrap gap-2 max-h-[400px] overflow-y-auto p-2">
              {player.deck.map((c) => (
                <div 
                  key={c.id} 
                  className="cursor-pointer hover:scale-105 transition-transform"
                >
                  <CardComponent 
                    card={c} 
                    selected={false} 
                    onClick={() => shopMode === 'REMOVE' ? handleCardRemoval(c.id) : handleCardUpgrade(c.id)} 
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-between items-center pt-6 border-t border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Your Purse:</span>
            <span className="text-xl font-mono font-bold text-yellow-500">{player.gold}g</span>
          </div>
          <button 
            onClick={closeShop}
            className="px-8 py-3 bg-zinc-100 text-zinc-950 font-black uppercase tracking-tighter rounded-xl hover:bg-yellow-500 transition-colors"
          >
            Leave Shop
          </button>
        </div>
      </motion.div>
    </div>
  );
}
