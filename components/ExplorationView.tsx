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

interface BiomeTheme {
  bgCenter: string;
  bgMid: string;
  bgEdge: string;
  torchColor1: string;
  torchColor2: string;
  mistColor: string;
}

const BIOME_THEMES: Record<string, BiomeTheme> = {
  VOID_SCAUR: {
    bgCenter: '#1a0b36',
    bgMid: '#0e0520',
    bgEdge: '#030107',
    torchColor1: '#ff5500',
    torchColor2: '#ffa200',
    mistColor: 'rgba(29, 11, 60, 0.35)',
  },
  SIROCCO: {
    bgCenter: '#2f1208',
    bgMid: '#1b0904',
    bgEdge: '#060201',
    torchColor1: '#ff4400',
    torchColor2: '#ff9000',
    mistColor: 'rgba(47, 18, 8, 0.3)',
  },
  SEPULCHER: {
    bgCenter: '#082a24',
    bgMid: '#041713',
    bgEdge: '#010605',
    torchColor1: '#00ff99',
    torchColor2: '#00b388',
    mistColor: 'rgba(8, 42, 36, 0.3)',
  },
};

export default function ExplorationView() {
  const { grid, player, useItem, biome } = useGameStore();
  const hexSize = 44;

  if (!player) return null;

  const colors = CLASS_COLORS[player.class] ?? CLASS_COLORS.BERSERKER;
  const xpPercent = player.xpToNextLevel === Infinity ? 100 : Math.min(100, (player.xp / player.xpToNextLevel) * 100);

  const theme = BIOME_THEMES[biome] || BIOME_THEMES.VOID_SCAUR;
  const styleVars = {
    '--bg-center': theme.bgCenter,
    '--bg-mid': theme.bgMid,
    '--bg-edge': theme.bgEdge,
    '--torch-1': theme.torchColor1,
    '--torch-2': theme.torchColor2,
    '--mist-color': theme.mistColor,
  } as React.CSSProperties;

  return (
    <div 
      className="relative w-full h-screen overflow-hidden flex items-center justify-center dungeon-bg-container"
      style={styleVars}
    >
      {/* Vignette ambient overlay */}
      <div className="vignette-overlay" />
      
      {/* Dynamic torch light overlay */}
      <div className="torch-glow-overlay" />

      {/* Floating dungeon mist overlay */}
      <div className="dungeon-mist-overlay" />

      {/* Embedded styles for premium dungeon theme */}
      <style>{`
        .dungeon-bg-container {
          background: radial-gradient(circle at 50% 45%, var(--bg-center) 0%, var(--bg-mid) 60%, var(--bg-edge) 100%) !important;
        }
        .vignette-overlay {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: radial-gradient(circle at 50% 45%, transparent 20%, rgba(3, 1, 6, 0.9) 100%);
          z-index: 10;
        }
        .torch-glow-overlay {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 15;
          mix-blend-mode: color-dodge;
          opacity: 0.25;
          background: 
            radial-gradient(circle at 10% 25%, var(--torch-1) 0%, transparent 45%),
            radial-gradient(circle at 90% 25%, var(--torch-1) 0%, transparent 45%),
            radial-gradient(circle at 22% 15%, var(--torch-2) 0%, transparent 40%),
            radial-gradient(circle at 78% 15%, var(--torch-2) 0%, transparent 40%);
          animation: torchGlowPulse 5s infinite alternate ease-in-out;
        }
        .dungeon-mist-overlay {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 12;
          background: linear-gradient(to top, var(--mist-color) 0%, transparent 55%);
          animation: mistFloat 8s infinite alternate ease-in-out;
        }
        @keyframes mistFloat {
          0% { transform: translateY(12px) scaleY(1.0); opacity: 0.65; }
          100% { transform: translateY(-12px) scaleY(1.12); opacity: 0.9; }
        }
        @keyframes torchGlowPulse {
          0%, 100% { opacity: 0.20; transform: scale(1); }
          50% { opacity: 0.30; transform: scale(1.02); }
        }
        @keyframes electricFlicker {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 0.25; }
          75% { opacity: 0.95; }
          80% { opacity: 0.4; }
        }
        .animate-electric-flicker {
          animation: electricFlicker 2s infinite ease-in-out;
        }
        @keyframes orbPulse {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.22); opacity: 1; }
        }
        .animate-orb-pulse {
          animation: orbPulse 1.5s infinite ease-in-out;
        }

        /* Chiseled Layered Stone Border Effect matching the mockup slabs */
        .hud-card {
          background: rgba(18, 12, 24, 0.96);
          pointer-events: auto;
          border: 4px solid #140d1c;
          box-shadow: 
            0 0 0 3px #4d425a,
            0 0 0 6px #1b1225,
            inset 0 0 0 2px #2f243b,
            inset 0 0 16px rgba(0, 0, 0, 0.95),
            0 12px 28px rgba(0, 0, 0, 0.8);
          border-radius: 8px;
          padding: 16px;
        }

        /* Bottom Left Compass */
        .compass-container {
          position: absolute;
          bottom: 24px;
          left: 24px;
          z-index: 40;
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: rgba(15, 9, 24, 0.9);
          border: 3px solid #634b8c;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 
            inset 0 0 10px rgba(0,0,0,0.8),
            0 6px 15px rgba(0,0,0,0.6);
        }
        .compass-circle {
          color: #dfd3f7;
          font-family: serif;
          font-size: 20px;
          font-weight: bold;
          text-shadow: 0 0 8px rgba(255,255,255,0.3);
        }
      `}</style>

      {/* HUD */}
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="absolute top-8 left-8 right-8 flex justify-between items-start z-40 pointer-events-none"
      >
        {/* Left Panel: Vitality + XP + Class */}
        <div className="hud-card flex flex-col gap-3 min-w-[240px]">
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
          <div className="hud-card flex flex-col gap-3 min-w-[200px]">
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
                        {item === 'HEALTH_POTION' ? 'Health Potion' : String(item)}
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
        initial={{ scale: 1.1, opacity: 0 }}
        animate={{ scale: 1.45, opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="relative w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing z-20"
      >
        <div className="relative">
          {Object.values(grid)
            .sort((a, b) => {
              // Sort by Y coordinate so front elements are rendered after back elements in the DOM
              const pyA = axialToPixel(a.coord, hexSize).y;
              const pyB = axialToPixel(b.coord, hexSize).y;
              return pyA - pyB;
            })
            .map((tile) => {
              const { x, y } = axialToPixel(tile.coord, hexSize);
              const isoX = x;
              const isoY = y * 0.68; // Vertical compression for isometric view (steeper angle)
              const zIndex = Math.round(isoY + 1000);
              return (
                <div
                  key={coordToString(tile.coord)}
                  style={{
                    position: 'absolute',
                    left: `${isoX}px`,
                    top: `${isoY}px`,
                    transform: 'translate(-40px, -27px)', // Align the top face center (40, 27) exactly with (isoX, isoY)
                    zIndex: zIndex,
                  }}
                >
                  <HexTile tile={tile} />
                </div>
              );
            })}
        </div>
      </motion.div>
    </div>
  );
}
