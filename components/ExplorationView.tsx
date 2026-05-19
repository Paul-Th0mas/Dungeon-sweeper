'use client';

import { useGameStore } from '@/store/useGameStore';
import { axialToPixel, coordToString } from '@/lib/hexMath';
import HexTile from './HexTile';
import { motion } from 'framer-motion';
import { Heart, Compass, Trophy, Zap, Star, Shield, Package, FlaskConical } from 'lucide-react';

const CLASS_COLORS: Record<string, { bar: string; badge: string }> = {
  BERSERKER: { bar: 'from-red-600 to-orange-500',    badge: 'text-red-400 bg-red-500/10 border-red-500/20' },
  PALADIN:   { bar: 'from-sky-500 to-indigo-400',     badge: 'text-sky-400 bg-sky-500/10 border-sky-500/20' },
  WIZARD:    { bar: 'from-purple-600 to-violet-500',  badge: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
  OVERSEER:  { bar: 'from-emerald-500 to-teal-400',   badge: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
};

export default function ExplorationView() {
  const { grid, player, useItem } = useGameStore();
  const hexSize = 44;

  if (!player) return null;

  const colors = CLASS_COLORS[player.class] ?? CLASS_COLORS.BERSERKER;
  const xpPercent = player.xpToNextLevel === Infinity ? 100 : Math.min(100, (player.xp / player.xpToNextLevel) * 100);

  return (
    <div className="relative w-full h-screen overflow-hidden flex items-center justify-center bg-[#050505]">
      {/* HUD */}
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="absolute top-8 left-8 right-8 flex justify-between items-start z-40 pointer-events-none"
      >
        {/* Left Panel: Vitality + XP + Class */}
        <div className="glass p-4 rounded-2xl flex flex-col gap-3 pointer-events-auto border-zinc-800/50 min-w-[220px]">
          {/* Class Badge */}
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest w-fit ${colors.badge}`}>
            <Shield className="w-3 h-3" />
            {player.class} · Lv {player.level}
          </div>

          {/* HP */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              <span className="flex items-center gap-1"><Heart className="w-3 h-3 text-red-500" /> Vitality</span>
              <span className="text-zinc-300 font-mono">{player.currentHp}/{player.maxHp}</span>
            </div>
            <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden border border-white/5">
              <motion.div
                animate={{ width: `${(player.currentHp / player.maxHp) * 100}%` }}
                className="h-full bg-gradient-to-r from-red-600 to-red-400"
              />
            </div>
          </div>

          {/* XP */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              <span className="flex items-center gap-1"><Star className="w-3 h-3 text-yellow-400" /> Experience</span>
              <span className="text-zinc-300 font-mono">
                {player.xpToNextLevel === Infinity ? 'MAX' : `${player.xp} / ${player.xpToNextLevel}`}
              </span>
            </div>
            <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden border border-white/5">
              <motion.div
                animate={{ width: `${xpPercent}%` }}
                transition={{ duration: 0.8 }}
                className={`h-full bg-gradient-to-r ${colors.bar}`}
              />
            </div>
          </div>

          {/* Gold + Floor */}
          <div className="flex items-center gap-4 pt-1 border-t border-zinc-800">
            <div className="flex items-center gap-1.5 text-yellow-400 font-mono font-bold text-sm">
              <Zap className="w-3.5 h-3.5" />
              {player.gold}g
            </div>
            <div className="flex items-center gap-1.5 text-zinc-400 text-sm font-medium">
              <Compass className="w-3.5 h-3.5 text-blue-400" />
              Floor {player.floor}
            </div>
          </div>

          {/* Active passives pills */}
          {player.passives.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {player.passives.map((p) => (
                <span key={p} className="text-[9px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-bold uppercase tracking-wider">
                  {p.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Right Panel: Inventory + Key */}
        <div className="flex flex-col gap-4 items-end">
          {/* Key badge */}
          {player.hasKey && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="glass px-6 py-3 rounded-2xl border-yellow-500/30 flex items-center gap-3 pointer-events-auto shadow-[0_0_30px_rgba(234,179,8,0.1)]"
            >
              <Trophy className="w-5 h-5 text-yellow-500" />
              <span className="text-sm font-black text-yellow-500 uppercase tracking-widest">Floor Key</span>
            </motion.div>
          )}

          {/* Inventory */}
          <div className="glass p-4 rounded-2xl flex flex-col gap-3 pointer-events-auto border-zinc-800/50 min-w-[200px]">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-zinc-500 mb-1">
              <Package className="w-4 h-4" />
              Inventory
            </div>
            
            {player.inventory.length === 0 ? (
              <div className="text-[10px] text-zinc-600 font-bold italic py-2">Empty Bag</div>
            ) : (
              <div className="flex flex-col gap-2">
                {player.inventory.map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5 group hover:border-yellow-500/30 transition-all">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-yellow-500/10 rounded-lg group-hover:bg-yellow-500/20 transition-colors">
                        {item === 'HEALTH_POTION' && <FlaskConical className="w-3.5 h-3.5 text-yellow-500" />}
                      </div>
                      <span className="text-[10px] font-bold text-zinc-300">
                        {item === 'HEALTH_POTION' ? 'Health Potion' : item}
                      </span>
                    </div>
                    <button 
                      onClick={() => useItem(item as string)}
                      className="px-3 py-1 rounded-lg bg-zinc-800 hover:bg-yellow-500 hover:text-zinc-950 text-[9px] font-black uppercase tracking-widest transition-all"
                    >
                      Use
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Grid */}
      <motion.div
        drag
        dragConstraints={{ left: -500, right: 500, top: -500, bottom: 500 }}
        dragElastic={0.1}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="relative w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing"
      >
        <div className="relative">
          {Object.values(grid).map((tile) => {
            const { x, y } = axialToPixel(tile.coord, hexSize);
            return (
              <div
                key={coordToString(tile.coord)}
                style={{ position: 'absolute', left: `${x}px`, top: `${y}px`, transform: 'translate(-50%, -50%)' }}
              >
                <HexTile tile={tile} />
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Bg glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-red-500/5 rounded-full blur-[100px] pointer-events-none -z-10" />
    </div>
  );
}
