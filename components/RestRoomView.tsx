'use client';

import { useGameStore } from '@/store/useGameStore';
import { motion } from 'framer-motion';
import { Flame, Heart, ArrowUpCircle, Hammer } from 'lucide-react';
import { restAction } from '@/lib/actions';

export default function RestRoomView() {
  const { player, sessionId } = useGameStore();

  if (!player || !sessionId) return null;

  const handleRest = async (action: 'HEAL' | 'UPGRADE' | 'DIG') => {
    const sessionData = await restAction(sessionId, action);
    if (sessionData) {
      useGameStore.setState({
        gamePhase: sessionData.phase,
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
        <div className="flex flex-col items-center mb-12 text-center">
          <div className="p-4 bg-orange-500/20 rounded-2xl mb-6">
            <Flame className="w-10 h-10 text-orange-500 animate-pulse" />
          </div>
          <h2 className="text-4xl font-black uppercase tracking-tighter mb-2">Restful Campfire</h2>
          <p className="text-zinc-500 max-w-md font-medium">The warmth of the fire eases your soul. Choose one action to prepare for the depths ahead.</p>
        </div>

        <div className="grid grid-cols-3 gap-6 mb-12">
          <button 
            onClick={() => handleRest('HEAL')}
            className="flex flex-col items-center gap-4 p-6 rounded-3xl bg-white/5 border border-white/5 hover:border-red-500/50 hover:bg-red-500/5 transition-all group"
          >
            <div className="p-4 bg-red-500/20 rounded-2xl group-hover:scale-110 transition-transform">
              <Heart className="w-8 h-8 text-red-500" />
            </div>
            <div className="text-center">
              <span className="block font-black uppercase tracking-tighter text-zinc-100">Heal</span>
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">+50% HP</span>
            </div>
          </button>

          <button 
            onClick={() => handleRest('UPGRADE')}
            className="flex flex-col items-center gap-4 p-6 rounded-3xl bg-white/5 border border-white/5 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all group"
          >
            <div className="p-4 bg-blue-500/20 rounded-2xl group-hover:scale-110 transition-transform">
              <ArrowUpCircle className="w-8 h-8 text-blue-500" />
            </div>
            <div className="text-center">
              <span className="block font-black uppercase tracking-tighter text-zinc-100">Upgrade</span>
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Card Power</span>
            </div>
          </button>

          <button 
            onClick={() => handleRest('DIG')}
            className="flex flex-col items-center gap-4 p-6 rounded-3xl bg-white/5 border border-white/5 hover:border-yellow-500/50 hover:bg-yellow-500/5 transition-all group"
          >
            <div className="p-4 bg-yellow-500/20 rounded-2xl group-hover:scale-110 transition-transform">
              <Hammer className="w-8 h-8 text-yellow-500" />
            </div>
            <div className="text-center">
              <span className="block font-black uppercase tracking-tighter text-zinc-100">Dig</span>
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Find Relic</span>
            </div>
          </button>
        </div>

        <div className="flex justify-center">
          <p className="text-zinc-600 text-[10px] font-bold uppercase tracking-[0.3em]">Choose wisely - you can only rest once</p>
        </div>
      </motion.div>
    </div>
  );
}
