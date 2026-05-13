'use client';

import { useGameStore } from '@/store/useGameStore';
import { motion } from 'framer-motion';
import { ShoppingCart, X, Zap } from 'lucide-react';
import { purchaseItem, exitShop } from '@/lib/actions';

export default function ShopView() {
  const { player, sessionId } = useGameStore();

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

  const handlePurchase = async (itemType: 'HEAL' | 'REVEAL' | 'REMOVE_CURSE') => {
    const sessionData = await purchaseItem(sessionId, itemType);
    if (sessionData) {
      useGameStore.setState({
        player: sessionData.player,
        grid: sessionData.grid,
      });
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

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div 
            onClick={() => handlePurchase('REVEAL')}
            className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-yellow-500/50 transition-all cursor-pointer group"
          >
            <h3 className="font-bold text-zinc-100 group-hover:text-yellow-500 transition-colors">Reveal Map</h3>
            <p className="text-xs text-zinc-500 mb-4">Instantly reveals 3 random hidden hexes.</p>
            <div className="flex items-center gap-2 text-yellow-500 font-mono font-bold">
              <Zap className="w-4 h-4" /> 25g
            </div>
          </div>

          <div 
            onClick={() => handlePurchase('HEAL')}
            className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-yellow-500/50 transition-all cursor-pointer group"
          >
            <h3 className="font-bold text-zinc-100 group-hover:text-yellow-500 transition-colors">Heal 25 HP</h3>
            <p className="text-xs text-zinc-500 mb-4">A refreshing health potion.</p>
            <div className="flex items-center gap-2 text-yellow-500 font-mono font-bold">
              <Zap className="w-4 h-4" /> 40g
            </div>
          </div>
        </div>

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
