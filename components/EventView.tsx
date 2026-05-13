'use client';

import { useGameStore } from '@/store/useGameStore';
import { motion } from 'framer-motion';
import { Sparkles, MessageSquare, Scroll, Wand2 } from 'lucide-react';
import { handleEvent } from '@/lib/actions';

export default function EventView() {
  const { player, sessionId } = useGameStore();

  if (!player || !sessionId) return null;

  const onChoice = async (choice: string) => {
    const sessionData = await handleEvent(sessionId, choice);
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
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="p-4 bg-purple-500/20 rounded-2xl mb-6">
            <Sparkles className="w-10 h-10 text-purple-500" />
          </div>
          <h2 className="text-3xl font-black uppercase tracking-tighter mb-2">Mysterious Encounter</h2>
          <p className="text-zinc-500 max-w-md font-medium">You find a strange altar pulsing with arcane energy. A voice whispers in your mind...</p>
        </div>

        <div className="space-y-4 mb-8">
          <button 
            onClick={() => onChoice('INTIMIDATE')}
            className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-purple-500/50 hover:bg-purple-500/5 transition-all text-left group"
          >
            <div className="p-3 bg-purple-500/20 rounded-xl">
              <MessageSquare className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <span className="block font-bold text-zinc-100">[{player.class}] Intimidate the spirit</span>
              <span className="text-xs text-zinc-500">Attempt to force a reward from the entity.</span>
            </div>
          </button>

          <button 
            onClick={() => onChoice('RITUAL')}
            className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all text-left group"
          >
            <div className="p-3 bg-blue-500/20 rounded-xl">
              <Wand2 className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <span className="block font-bold text-zinc-100">Perform an Arcane Ritual</span>
              <span className="text-xs text-zinc-500">Channel your magic to stabilize the energy.</span>
            </div>
          </button>

          <button 
            onClick={() => onChoice('LEAVE')}
            className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-zinc-500/50 hover:bg-zinc-500/5 transition-all text-left group"
          >
            <div className="p-3 bg-zinc-500/20 rounded-xl">
              <Scroll className="w-5 h-5 text-zinc-500" />
            </div>
            <div>
              <span className="block font-bold text-zinc-100">Leave it alone</span>
              <span className="text-xs text-zinc-500">It's better not to meddle with things you don't understand.</span>
            </div>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
