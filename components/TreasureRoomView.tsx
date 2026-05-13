'use client';

import { useGameStore } from '@/store/useGameStore';
import { motion } from 'framer-motion';
import { Gem, X, Bomb, ChevronRight } from 'lucide-react';
import { clickTreasureTile, exitTreasureRoom } from '@/lib/actions';
import { axialToPixel, coordToString } from '@/lib/hexMath';
import { clsx } from 'clsx';

export default function TreasureRoomView() {
  const { grid, player, sessionId } = useGameStore();
  const hexSize = 40;

  if (!player || !sessionId) return null;

  const handleClick = async (coord: any) => {
    const sessionData = await clickTreasureTile(sessionId, coord);
    if (sessionData) {
      useGameStore.setState({
        gamePhase: sessionData.phase,
        player: sessionData.player,
        grid: sessionData.grid,
      });
    }
  };

  const handleExit = async () => {
    const sessionData = await exitTreasureRoom(sessionId);
    if (sessionData) {
      useGameStore.setState({
        gamePhase: sessionData.phase,
        player: sessionData.player,
        grid: sessionData.grid,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#050505] overflow-hidden">
      {/* Background Decorative Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-500/10 rounded-full blur-[150px] pointer-events-none" />

      <motion.div 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="z-10 text-center mb-12"
      >
        <div className="inline-flex items-center gap-3 px-6 py-2 bg-emerald-500/10 rounded-full border border-emerald-500/20 mb-4">
          <Gem className="w-5 h-5 text-emerald-400" />
          <span className="text-xs font-black uppercase tracking-[0.3em] text-emerald-400">Vault of Ancients</span>
        </div>
        <h2 className="text-5xl font-black uppercase tracking-tighter text-white">The Treasure Room</h2>
        <p className="text-zinc-500 max-w-md mx-auto mt-4 font-medium italic">"Tread carefully. One false move triggers the self-destruct sequence..."</p>
      </motion.div>

      {/* Grid Container */}
      <div className="relative w-full h-[500px] flex items-center justify-center">
        <div className="relative">
          {Object.values(grid).map((tile) => {
            const { x, y } = axialToPixel(tile.coord, hexSize);
            return (
              <motion.div
                key={coordToString(tile.coord)}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                style={{
                  position: 'absolute',
                  left: `${x}px`,
                  top: `${y}px`,
                  transform: 'translate(-50%, -50%)',
                }}
                onClick={() => handleClick(tile.coord)}
                className={clsx(
                  "relative w-16 h-16 hex-clip transition-all duration-300 cursor-pointer group flex items-center justify-center",
                  tile.revealed ? "bg-zinc-950" : "bg-zinc-900 hover:bg-zinc-800"
                )}
              >
                <div className={clsx(
                  "absolute inset-[2px] hex-clip transition-colors",
                  tile.revealed ? "bg-zinc-950" : "bg-zinc-900 group-hover:bg-zinc-800"
                )} />
                
                <div className="relative z-10">
                  {tile.revealed ? (
                    tile.type === 'WALL' ? (
                      <Bomb className="w-6 h-6 text-red-500 animate-bounce" />
                    ) : (
                      <div className="flex flex-col items-center">
                        <Gem className="w-5 h-5 text-emerald-400 mb-1" />
                        <span className={clsx(
                          "text-lg font-black font-mono",
                          tile.dangerNumber === 0 ? "text-zinc-600" :
                          tile.dangerNumber === 1 ? "text-blue-400" :
                          tile.dangerNumber === 2 ? "text-yellow-400" :
                          "text-red-500"
                        )}>{tile.dangerNumber}</span>
                      </div>
                    )
                  ) : (
                    <div className="w-1 h-1 bg-white/20 rounded-full group-hover:scale-150 transition-transform" />
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col items-center gap-6 mt-16 z-10">
        <div className="flex items-center gap-3">
          <span className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Loot Collected:</span>
          <span className="text-3xl font-mono font-black text-yellow-500 underline decoration-yellow-500/50 decoration-4 underline-offset-8">{player.gold}g</span>
        </div>
        
        <button 
          onClick={handleExit}
          className="group flex items-center gap-4 px-12 py-4 bg-zinc-100 text-zinc-950 font-black uppercase tracking-widest rounded-2xl hover:bg-emerald-400 transition-all hover:scale-105"
        >
          Secure Loot & Exit
          <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
}
