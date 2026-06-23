'use client';

import { Tile, PlayerClass, TileType } from '@/lib/types';
import { useGameStore } from '@/store/useGameStore';
import { getDistance, coordToString } from '@/lib/hexMath';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import { Skull, ShoppingCart, Flame, Trophy, HelpCircle, Key, DoorOpen, Lock, ShieldAlert } from 'lucide-react';

interface Props {
  tile: Tile;
}

// ── Custom Pixel-Art Icons for the Player Floating Badges ──────────────────

const SwordIcon = ({ color }: { color: string }) => (
  <svg className="w-6 h-6" viewBox="0 0 16 16" fill={color}>
    <rect x="11" y="3" width="2" height="2" />
    <rect x="10" y="4" width="2" height="2" />
    <rect x="9" y="5" width="2" height="2" />
    <rect x="8" y="6" width="2" height="2" />
    <rect x="7" y="7" width="2" height="2" />
    <rect x="6" y="8" width="2" height="2" />
    <rect x="5" y="9" width="2" height="2" />
    <rect x="12" y="2" width="2" height="2" />
    {/* Guard */}
    <rect x="3" y="10" width="4" height="2" />
    <rect x="4" y="9" width="2" height="4" />
    {/* Hilt */}
    <rect x="2" y="12" width="2" height="2" />
    <rect x="1" y="13" width="2" height="2" />
  </svg>
);

const ShieldIcon = ({ color }: { color: string }) => (
  <svg className="w-6 h-6" viewBox="0 0 16 16" fill={color}>
    <rect x="3" y="2" width="10" height="2" />
    <rect x="2" y="4" width="2" height="6" />
    <rect x="12" y="4" width="2" height="6" />
    <rect x="3" y="10" width="2" height="2" />
    <rect x="11" y="10" width="2" height="2" />
    <rect x="4" y="12" width="2" height="2" />
    <rect x="10" y="12" width="2" height="2" />
    <rect x="6" y="13" width="4" height="2" />
  </svg>
);

const WandIcon = ({ color }: { color: string }) => (
  <svg className="w-6 h-6" viewBox="0 0 16 16" fill={color}>
    <rect x="2" y="12" width="2" height="2" />
    <rect x="4" y="10" width="2" height="2" />
    <rect x="6" y="8" width="2" height="2" />
    <rect x="8" y="6" width="2" height="2" />
    <rect x="10" y="4" width="2" height="2" />
    {/* Star Tip */}
    <rect x="12" y="1" width="2" height="2" />
    <rect x="11" y="2" width="4" height="1" />
    <rect x="12" y="0" width="2" height="4" />
  </svg>
);

const EyeIcon = ({ color }: { color: string }) => (
  <svg className="w-6 h-6" viewBox="0 0 16 16" fill={color}>
    <rect x="2" y="7" width="12" height="2" />
    <rect x="4" y="5" width="8" height="2" />
    <rect x="4" y="9" width="8" height="2" />
    <rect x="6" y="4" width="4" height="1" />
    <rect x="6" y="11" width="4" height="1" />
    <rect x="7" y="7" width="2" height="2" fill="#0d0d15" />
  </svg>
);

// ── Custom Pixel-Art Billboard Landmark Components ──────────────────────────

function LandmarkIcon({ type, isCleared, calcifiedHits }: { type: TileType; isCleared: boolean; calcifiedHits?: number }) {
  if (calcifiedHits && calcifiedHits === 2) {
    return (
      <div className="flex flex-col items-center gap-0.5 pointer-events-none select-none">
        <div className="w-10 h-10 rounded-full bg-zinc-900 border-2 border-zinc-500 flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
          <Lock className="w-5 h-5 text-zinc-400" />
        </div>
        <span className="text-[9px] font-black tracking-widest text-zinc-400 bg-black/90 px-1.5 py-0.5 rounded border border-zinc-700 uppercase">
          Locked
        </span>
      </div>
    );
  }
  
  if (calcifiedHits && calcifiedHits === 1) {
    return (
      <div className="flex flex-col items-center gap-0.5 pointer-events-none select-none">
        <div className="w-10 h-10 rounded-full bg-zinc-900 border-2 border-orange-500 flex items-center justify-center shadow-[0_2px_8px_rgba(249,115,22,0.4)] animate-pulse">
          <ShieldAlert className="w-5 h-5 text-orange-400" />
        </div>
        <span className="text-[9px] font-black tracking-widest text-orange-400 bg-black/90 px-1.5 py-0.5 rounded border border-orange-900 uppercase">
          Cracked
        </span>
      </div>
    );
  }

  const config = {
    ENEMY: {
      Icon: Skull,
      label: 'Monster',
      colorClass: 'text-red-400',
      borderClass: 'border-red-500',
      bgClass: 'bg-red-950/85',
      shadowClass: 'shadow-[0_2px_10px_rgba(239,68,68,0.35)]',
    },
    SHOP: {
      Icon: ShoppingCart,
      label: 'Merchant',
      colorClass: 'text-yellow-400',
      borderClass: 'border-yellow-500',
      bgClass: 'bg-indigo-950/85',
      shadowClass: 'shadow-[0_2px_10px_rgba(234,179,8,0.35)]',
    },
    REST: {
      Icon: Flame,
      label: 'Campfire',
      colorClass: 'text-orange-400',
      borderClass: 'border-orange-500',
      bgClass: 'bg-amber-950/85',
      shadowClass: 'shadow-[0_2px_10px_rgba(249,115,22,0.35)]',
    },
    TREASURE: {
      Icon: Trophy,
      label: 'Treasure',
      colorClass: 'text-cyan-400',
      borderClass: 'border-cyan-500',
      bgClass: 'bg-cyan-950/85',
      shadowClass: 'shadow-[0_2px_10px_rgba(6,182,212,0.35)]',
    },
    EVENT: {
      Icon: HelpCircle,
      label: 'Altar',
      colorClass: 'text-purple-400',
      borderClass: 'border-purple-500',
      bgClass: 'bg-purple-950/85',
      shadowClass: 'shadow-[0_2px_10px_rgba(168,85,247,0.35)]',
    },
    KEY: {
      Icon: Key,
      label: 'Key',
      colorClass: 'text-amber-400',
      borderClass: 'border-amber-500',
      bgClass: 'bg-amber-950/85',
      shadowClass: 'shadow-[0_2px_10px_rgba(245,158,11,0.35)]',
    },
    EXIT: {
      Icon: DoorOpen,
      label: 'Portal',
      colorClass: 'text-emerald-400',
      borderClass: 'border-emerald-500',
      bgClass: 'bg-emerald-950/85',
      shadowClass: 'shadow-[0_2px_10px_rgba(16,185,129,0.35)]',
    },
    SAFE: null,
    WALL: null,
  }[type];

  if (!config) return null;

  const { Icon, label, colorClass, borderClass, bgClass, shadowClass } = config;

  if (isCleared) {
    return (
      <div className="flex flex-col items-center gap-0.5 opacity-40 pointer-events-none select-none">
        <div className="w-8 h-8 rounded-full bg-zinc-950 border-2 border-zinc-700 flex items-center justify-center">
          <Icon className="w-4 h-4 text-zinc-500" />
        </div>
        <span className="text-[7.5px] font-bold tracking-wider text-zinc-500 bg-black/40 px-1 py-0.5 rounded border border-zinc-800 uppercase">
          Cleared
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-0.5 pointer-events-none select-none">
      <div className={`w-10 h-10 rounded-full ${bgClass} border-2 ${borderClass} flex items-center justify-center ${shadowClass}`}>
        <Icon className={`w-5.5 h-5.5 ${colorClass}`} />
      </div>
      <span className={`text-[9.5px] font-black tracking-widest ${colorClass} bg-black/90 px-1.5 py-0.5 rounded border border-white/10 uppercase shadow-[0_2px_6px_rgba(0,0,0,0.6)]`}>
        {label}
      </span>
    </div>
  );
}

// Helper to choose a rune character based on coordinate hash
function getRuneChar(coord: { q: number; r: number }): string {
  const runes = ['ᚲ', 'ᚱ', 'ᛉ', 'ᚺ', 'ᛈ', 'ᛏ', 'ᚫ', 'ᛗ', 'ᛚ'];
  const hash = Math.abs(coord.q * 7 + coord.r * 13);
  return runes[hash % runes.length];
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function HexTile({ tile }: Props) {
  const { player, movePlayer, visitedCoords, biome, grid } = useGameStore();

  if (!player) return null;

  const dist = getDistance(player.position, tile.coord);
  const isPlayer = dist === 0;
  const isAdjacent = dist === 1;
  const isVisible = tile.revealed || dist <= 1;
  const isVisited = (visitedCoords.has(coordToString(tile.coord)) || tile.cleared) && !isPlayer;
  const showNumber = tile.revealed && dist <= player.torchRadius && tile.type === 'SAFE' && (!tile.calcifiedHits || tile.calcifiedHits === 0);

  const handleClick = () => {
    if (isAdjacent) movePlayer(tile.coord);
  };

  // Minesweeper Danger Number Color Mapping
  const numberColor =
    tile.dangerNumber === 1 ? '#38bdf8' : // Blue
    tile.dangerNumber === 2 ? '#4ade80' : // Green
    tile.dangerNumber === 3 ? '#fb923c' : // Orange
    '#ef4444';                            // Red

  // Player Class Badge Mappings
  const CLASS_ICONS: Record<PlayerClass, React.ElementType> = {
    BERSERKER: SwordIcon,
    PALADIN: ShieldIcon,
    WIZARD: WandIcon,
    OVERSEER: EyeIcon,
  };

  const CLASS_BADGE_COLORS: Record<PlayerClass, string> = {
    BERSERKER: '#db031a', // Power Red
    PALADIN: '#38bdf8',   // Sonic Blue
    WIZARD: '#c084fc',    // Vaporwave Purple
    OVERSEER: '#5adf82',  // Chaos Emerald Green
  };

  const PlayerClassIcon = CLASS_ICONS[player.class] || ShieldIcon;
  const playerClassColor = CLASS_BADGE_COLORS[player.class] || '#38bdf8';

  // Determine if this tile is outside the player's torch radius (memory state)
  const isOutOfTorch = tile.revealed && dist > player.torchRadius && !isPlayer;
  const isFogOfWar = !tile.revealed && dist > 1;
  const tileOpacity = isVisible ? 1 : 0.90;

  // Resolve specific gradients and border colors for each tile category
  const getTileGradients = () => {
    if (isPlayer) {
      return {
        left: 'url(#playerLeft)',
        right: 'url(#playerRight)',
        top: 'url(#playerTop)',
        stroke: '#ffffff',
      };
    }

    if (!tile.revealed) {
      return {
        left: 'url(#fogLeft)',
        right: 'url(#fogRight)',
        top: 'url(#fogTop)',
        stroke: '#211736',
      };
    }

    const typeMap: Record<TileType, { left: string; right: string; top: string; stroke: string }> = {
      SAFE: (isVisited || tile.cleared) ? {
        left: 'url(#safeClearedLeft)',
        right: 'url(#safeClearedRight)',
        top: 'url(#safeClearedTop)',
        stroke: '#3b4a35',
      } : {
        left: 'url(#stoneLeft)',
        right: 'url(#stoneRight)',
        top: 'url(#stoneTop)',
        stroke: '#4a3d31',
      },
      ENEMY: {
        left: 'url(#enemyLeft)',
        right: 'url(#enemyRight)',
        top: 'url(#enemyTop)',
        stroke: '#5c120c',
      },
      SHOP: {
        left: 'url(#shopLeft)',
        right: 'url(#shopRight)',
        top: 'url(#shopTop)',
        stroke: '#d9a714',
      },
      REST: {
        left: 'url(#restLeft)',
        right: 'url(#restRight)',
        top: 'url(#restTop)',
        stroke: '#6e3012',
      },
      TREASURE: {
        left: 'url(#treasureLeft)',
        right: 'url(#treasureRight)',
        top: 'url(#treasureTop)',
        stroke: '#d9a714',
      },
      EVENT: {
        left: 'url(#eventLeft)',
        right: 'url(#eventRight)',
        top: 'url(#eventTop)',
        stroke: '#501773',
      },
      KEY: {
        left: 'url(#keyLeft)',
        right: 'url(#keyRight)',
        top: 'url(#keyTop)',
        stroke: '#d9a714',
      },
      EXIT: {
        left: 'url(#exitLeft)',
        right: 'url(#exitRight)',
        top: 'url(#exitTop)',
        stroke: '#105e2e',
      },
      WALL: {
        left: 'url(#wallLeft)',
        right: 'url(#wallRight)',
        top: 'url(#wallTop)',
        stroke: '#21201f',
      },
    };

    return typeMap[tile.type] || typeMap.SAFE;
  };

  const grads = getTileGradients();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{
        opacity: tileOpacity,
        scale: isPlayer ? 1.05 : 1,
      }}
      whileHover={isAdjacent ? { y: -8 } : {}}
      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      onClick={handleClick}
      className={clsx(
        'relative w-20 h-20 transition-all duration-300 flex items-center justify-center select-none overflow-visible',
        isAdjacent ? 'cursor-pointer' : 'cursor-default',
        !isVisible && 'pointer-events-none'
      )}
    >
      {/* ── 3D Hexagonal Slab Vector Shape ── */}
      <svg 
        className="w-20 h-[80px] overflow-visible" 
        viewBox="0 0 80 80" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        style={{ filter: isPlayer ? 'drop-shadow(0 0 14px rgba(192, 193, 255, 0.45))' : '' }}
      >
        <defs>
          {/* Stone Gradients */}
          <linearGradient id="stoneLeft" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#4a4035" />
            <stop offset="100%" stopColor="#1e1a15" />
          </linearGradient>
          <linearGradient id="stoneRight" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#5c5042" />
            <stop offset="100%" stopColor="#28221c" />
          </linearGradient>
          <linearGradient id="stoneTop" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#786858" />
            <stop offset="100%" stopColor="#4e4033" />
          </linearGradient>

          {/* SAFE Visited / Cleared (Mossy Paved Stone) */}
          <linearGradient id="safeClearedLeft" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3d493a" />
            <stop offset="100%" stopColor="#181d16" />
          </linearGradient>
          <linearGradient id="safeClearedRight" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#4d5c49" />
            <stop offset="100%" stopColor="#22291e" />
          </linearGradient>
          <linearGradient id="safeClearedTop" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#62755c" />
            <stop offset="100%" stopColor="#3e4a3a" />
          </linearGradient>

          {/* ENEMY (Magma Volcanic Stone) */}
          <linearGradient id="enemyLeft" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#4d0e0a" />
            <stop offset="100%" stopColor="#1c0302" />
          </linearGradient>
          <linearGradient id="enemyRight" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#66130d" />
            <stop offset="100%" stopColor="#290503" />
          </linearGradient>
          <linearGradient id="enemyTop" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#821c14" />
            <stop offset="100%" stopColor="#470703" />
          </linearGradient>

          {/* SHOP (Royal Indigo) */}
          <linearGradient id="shopLeft" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#261747" />
            <stop offset="100%" stopColor="#0d071a" />
          </linearGradient>
          <linearGradient id="shopRight" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#362163" />
            <stop offset="100%" stopColor="#150a29" />
          </linearGradient>
          <linearGradient id="shopTop" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4c3187" />
            <stop offset="100%" stopColor="#28154f" />
          </linearGradient>

          {/* REST (Campfire Clay) */}
          <linearGradient id="restLeft" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#5c2c16" />
            <stop offset="100%" stopColor="#240f05" />
          </linearGradient>
          <linearGradient id="restRight" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#753a1f" />
            <stop offset="100%" stopColor="#361708" />
          </linearGradient>
          <linearGradient id="restTop" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#944d2d" />
            <stop offset="100%" stopColor="#5c2912" />
          </linearGradient>

          {/* TREASURE (Shimmering Turquoise) */}
          <linearGradient id="treasureLeft" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#144d59" />
            <stop offset="100%" stopColor="#051c21" />
          </linearGradient>
          <linearGradient id="treasureRight" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1d6675" />
            <stop offset="100%" stopColor="#0a2a30" />
          </linearGradient>
          <linearGradient id="treasureTop" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2a8b9e" />
            <stop offset="100%" stopColor="#14525e" />
          </linearGradient>

          {/* EVENT (Mystic Violet) */}
          <linearGradient id="eventLeft" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3d1459" />
            <stop offset="100%" stopColor="#140321" />
          </linearGradient>
          <linearGradient id="eventRight" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#541b7a" />
            <stop offset="100%" stopColor="#1f0530" />
          </linearGradient>
          <linearGradient id="eventTop" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#712a9e" />
            <stop offset="100%" stopColor="#3c1059" />
          </linearGradient>

          {/* KEY (Amber Yellow) */}
          <linearGradient id="keyLeft" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#634a0d" />
            <stop offset="100%" stopColor="#241902" />
          </linearGradient>
          <linearGradient id="keyRight" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#7d5f15" />
            <stop offset="100%" stopColor="#362705" />
          </linearGradient>
          <linearGradient id="keyTop" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#9e7c24" />
            <stop offset="100%" stopColor="#5e470f" />
          </linearGradient>

          {/* EXIT (Emerald Green) */}
          <linearGradient id="exitLeft" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0f5c2c" />
            <stop offset="100%" stopColor="#03210d" />
          </linearGradient>
          <linearGradient id="exitRight" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#17753a" />
            <stop offset="100%" stopColor="#053314" />
          </linearGradient>
          <linearGradient id="exitTop" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#249c53" />
            <stop offset="100%" stopColor="#105e2e" />
          </linearGradient>

          {/* WALL (Dark Basalt Barrier) */}
          <linearGradient id="wallLeft" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1c1b1a" />
            <stop offset="100%" stopColor="#080807" />
          </linearGradient>
          <linearGradient id="wallRight" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#262524" />
            <stop offset="100%" stopColor="#0f0e0e" />
          </linearGradient>
          <linearGradient id="wallTop" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#383634" />
            <stop offset="100%" stopColor="#1c1b1a" />
          </linearGradient>

          {/* Fog Of War (Unexplored Obsidian) */}
          <linearGradient id="fogLeft" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#121014" />
            <stop offset="100%" stopColor="#060508" />
          </linearGradient>
          <linearGradient id="fogRight" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1a1821" />
            <stop offset="100%" stopColor="#09080c" />
          </linearGradient>
          <linearGradient id="fogTop" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22202b" />
            <stop offset="100%" stopColor="#111017" />
          </linearGradient>

          {/* Obsidian Gradients (for Player class backup) */}
          <linearGradient id="obsidianLeft" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1e0f3c" />
            <stop offset="100%" stopColor="#03010b" />
          </linearGradient>
          <linearGradient id="obsidianRight" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#29154f" />
            <stop offset="100%" stopColor="#050212" />
          </linearGradient>
          <linearGradient id="obsidianTop" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#120924" />
            <stop offset="100%" stopColor="#080412" />
          </linearGradient>

          {/* Player Gradients */}
          <linearGradient id="playerLeft" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3d3fb4" />
            <stop offset="100%" stopColor="#181a54" />
          </linearGradient>
          <linearGradient id="playerRight" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#5558d6" />
            <stop offset="100%" stopColor="#24276d" />
          </linearGradient>
          <linearGradient id="playerTop" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e8e8ff" />
            <stop offset="100%" stopColor="#b4b7ff" />
          </linearGradient>
        </defs>

        <g style={isOutOfTorch ? { filter: 'brightness(0.38) saturate(0.55)' } : undefined}>
          {/* 1. Left Vertical Face */}
          <path 
            d="M 4 15 L 4 39 L 40 51 L 40 63 L 4 51 L 4 27 Z" 
            fill={grads.left} 
            stroke="#0c0a0f" 
            strokeWidth="1.2" 
            strokeLinejoin="miter"
          />

          {/* 2. Right Vertical Face */}
          <path 
            d="M 40 51 L 76 39 L 76 15 L 76 27 L 76 51 L 40 63 Z" 
            fill={grads.right} 
            stroke="#0c0a0f" 
            strokeWidth="1.2" 
            strokeLinejoin="miter"
          />

          {/* 3. Grooves & Masonry seams for Revealed Stone Slabs */}
          {tile.revealed && !isPlayer && (
            <>
              {/* Horizontal stone groove seams */}
              <path d="M 4 45 L 40 57" stroke="#100d14" strokeWidth="1.2" opacity="0.35" />
              <path d="M 40 57 L 76 45" stroke="#100d14" strokeWidth="1.2" opacity="0.35" />
              
              {/* Vertical brick seams */}
              <path d="M 22 45 L 22 51" stroke="#100d14" strokeWidth="1.2" opacity="0.35" />
              <path d="M 58 45 L 58 51" stroke="#100d14" strokeWidth="1.2" opacity="0.35" />
            </>
          )}

          {/* 4. Top Face */}
          <path 
            d="M 40 3 L 76 15 L 76 39 L 40 51 L 4 39 L 4 15 Z" 
            fill={grads.top} 
            stroke={grads.stroke} 
            strokeWidth="1.2"
            strokeLinejoin="miter"
          />

          {/* 5. Chiseled Paving Grooves on Revealed Top Face */}
          {tile.revealed && !isPlayer && (
            <path 
              d="M 40 27 L 40 3 M 40 27 L 76 39 M 40 27 L 4 39" 
              stroke={tile.type === 'SAFE' && (isVisited || tile.cleared) ? '#283323' : '#332a21'} 
              strokeWidth="1" 
              opacity="0.3" 
              strokeLinejoin="round" 
            />
          )}

          {/* 6. Static Player Tile Indicator Ring */}
          {isPlayer && (
            <ellipse cx="40" cy="27" rx="16" ry="10" stroke="#ffffff" strokeWidth="2.5" fill="none" opacity="0.85" />
          )}

          {/* 7. Projected Runes for Visited Safe Tiles */}
          {isVisited && tile.type === 'SAFE' && tile.dangerNumber === 0 && (
            <text
              x="40"
              y="34"
              textAnchor="middle"
              fill="#52e8ff"
              stroke="#0d1f14"
              strokeWidth="2"
              paintOrder="stroke"
              className="font-mono text-[13px] font-black select-none pointer-events-none opacity-85"
              transform="rotate(-8) skewX(-15)"
              style={{ transformOrigin: '40px 27px' }}
            >
              {getRuneChar(tile.coord)}
            </text>
          )}

          {/* 8. Footprints for Visited Safe Empty Tiles */}
          {isVisited && tile.type === 'SAFE' && tile.dangerNumber === 0 && (
            <g transform="translate(32, 19) rotate(-8) skewX(-15)" style={{ transformOrigin: '8px 8px' }}>
              <ellipse cx="4" cy="8" rx="2" ry="1.2" fill="#120e0a" opacity="0.6" />
              <ellipse cx="10" cy="5" rx="2" ry="1.2" fill="#120e0a" opacity="0.6" />
            </g>
          )}

          {/* 9. Runic Mystery Icon on Unrevealed Fog of War tiles */}
          {isFogOfWar && (
            <text
              x="40"
              y="33"
              textAnchor="middle"
              fill="#3e384d"
              stroke="#0c0912"
              strokeWidth="1.5"
              paintOrder="stroke"
              className="font-mono text-[14px] font-bold select-none pointer-events-none"
              transform="rotate(-8) skewX(-15)"
              style={{ transformOrigin: '40px 27px', letterSpacing: '0.05em' }}
            >
              ᛘ
            </text>
          )}

          {/* 10. Projected Minesweeper Danger Number */}
          {showNumber && tile.dangerNumber > 0 && (
            <text
              x="40"
              y="35"
              textAnchor="middle"
              fill={numberColor}
              stroke="#0c0914"
              strokeWidth="3.5"
              paintOrder="stroke"
              className="font-anybody text-[16px] font-black italic select-none pointer-events-none"
              transform="rotate(-8) skewX(-15)"
              style={{ transformOrigin: '40px 27px' }}
            >
              {tile.dangerNumber}
            </text>
          )}
        </g>

        {/* 11. Pulsing selection ring for walkable Adjacent tiles */}
        {isAdjacent && (
          <path
            d="M 40 3 L 76 15 L 76 39 L 40 51 L 4 39 L 4 15 Z"
            fill="none"
            stroke="#00e5ff"
            strokeWidth="2.5"
            strokeLinejoin="miter"
            className="animate-pulse"
          />
        )}
      </svg>

      {/* ── Upright Vertical Billboard Overlay (pop-up sprites) ── */}
      <div 
        className="absolute pointer-events-none z-20 flex flex-col items-center justify-end overflow-visible"
        style={{
          left: '40px',
          top: '27px',
          transform: 'translate(-50%, -100%)',
        }}
      >
        {/* 1. Player Floating Badge */}
        <AnimatePresence>
          {isPlayer && (
            <motion.div
              key="player-badge-container"
              className="flex flex-col items-center overflow-visible"
            >
              <motion.div
                key="player-badge"
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: [0, -6, 0], opacity: 1 }}
                exit={{ y: 10, opacity: 0 }}
                transition={{
                  y: { repeat: Infinity, duration: 2, ease: "easeInOut" },
                  opacity: { duration: 0.2 }
                }}
                className="w-12 h-12 flex items-center justify-center rounded-full border-4 bg-[#0d0d15] shadow-[0_4px_10px_rgba(0,0,0,0.6)] mb-3"
                style={{ borderColor: playerClassColor }}
              >
                <PlayerClassIcon color={playerClassColor} />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 2. Revealed Action Landmarks */}
        <AnimatePresence mode="wait">
          {tile.revealed && (
            <motion.div
              key="landmark"
              initial={{ scale: 0, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0 }}
              className="flex items-center justify-center mb-1"
            >
              <LandmarkIcon 
                type={tile.type} 
                isCleared={!!tile.cleared} 
                calcifiedHits={tile.calcifiedHits} 
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
