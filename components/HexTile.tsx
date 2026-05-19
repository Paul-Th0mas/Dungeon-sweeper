'use client';

import { Tile } from '@/lib/types';
import { useGameStore } from '@/store/useGameStore';
import { getDistance, coordToString } from '@/lib/hexMath';
import { clsx } from 'clsx';
import { Skull, Key, DoorOpen, Shield, Ghost, ShoppingCart, Flame, Gem, Sparkles, Footprints } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  tile: Tile;
}

export default function HexTile({ tile }: Props) {
  const { player, movePlayer, visitedCoords } = useGameStore();

  if (!player) return null;

  const dist = getDistance(player.position, tile.coord);
  const isPlayer = dist === 0;
  const isAdjacent = dist === 1;
  const isVisible = tile.revealed || dist <= 1;
  const isVisited = visitedCoords.has(coordToString(tile.coord)) && !isPlayer;
  const showNumber = tile.revealed && dist <= player.torchRadius &&
    (tile.type === 'SAFE' || tile.type === 'SHOP' || tile.type === 'REST' || tile.type === 'TREASURE' || tile.type === 'EVENT');

  const handleClick = () => {
    if (isAdjacent) movePlayer(tile.coord);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{
        opacity: 1,
        scale: isPlayer ? 1.15 : 1,
        y: isPlayer ? -8 : 0,
      }}
      whileHover={isAdjacent ? { scale: 1.05, y: -4 } : {}}
      onClick={handleClick}
      className={clsx(
        'relative w-16 h-16 hex-clip transition-colors duration-500 cursor-pointer flex items-center justify-center group',
        isPlayer ? 'z-30' : 'z-10',
        !tile.revealed ? 'bg-zinc-900' : isVisited ? 'bg-zinc-900' : 'bg-zinc-950',
      )}
    >
      {/* Depth gradient */}
      <div className="absolute inset-0 hex-clip bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />

      {/* ── Inner face ────────────────────────────────────────────────────── */}
      <div className={clsx(
        'absolute inset-[2px] hex-clip transition-all duration-500',
        isPlayer
          ? 'bg-zinc-100 shadow-[0_0_25px_rgba(255,255,255,0.4)]'
          : isVisited
            ? 'bg-zinc-800/70'      // darkened footprint floor
            : !tile.revealed
              ? 'bg-zinc-900 group-hover:bg-zinc-800'
              : 'bg-zinc-950',
        isAdjacent && !tile.revealed && 'ring-2 ring-white/10 ring-inset',
      )} />

      {/* ── Visited path glow ────────────────────────────────────────────── */}
      {isVisited && (
        <div className="absolute inset-[2px] hex-clip pointer-events-none">
          {/* Subtle cyan-blue inner edge to indicate traversed path */}
          <div className="absolute inset-0 hex-clip bg-gradient-to-b from-sky-500/8 via-transparent to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-sky-500/30 to-transparent" />
        </div>
      )}

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <div className="relative z-10 flex items-center justify-center">
        <AnimatePresence mode="wait">
          {isPlayer ? (
            <motion.div key="player" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="relative flex items-center justify-center">
              <Shield className="w-8 h-8 text-zinc-900 fill-zinc-900" />
              {showNumber && tile.dangerNumber > 0 && (
                <div className="absolute -top-3 -right-3 bg-zinc-900 rounded-full w-6 h-6 flex items-center justify-center border border-zinc-700 shadow-xl">
                  <span className={clsx(
                    'text-xs font-black font-mono tracking-tighter',
                    tile.dangerNumber === 1 && 'text-blue-400',
                    tile.dangerNumber === 2 && 'text-green-400',
                    tile.dangerNumber === 3 && 'text-orange-400',
                    tile.dangerNumber >= 4  && 'text-red-500',
                  )}>
                    {tile.dangerNumber}
                  </span>
                </div>
              )}
            </motion.div>
          ) : tile.revealed ? (
            <motion.div
              key="content"
              initial={{ opacity: 0, filter: 'blur(10px)' }}
              animate={{ opacity: 1, filter: 'blur(0px)' }}
              className="flex items-center justify-center"
            >
              {tile.type === 'ENEMY' && (
                <div className="relative">
                  <Skull className="w-8 h-8 text-red-500" />
                  <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.2, 0.5] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute inset-0 bg-red-500 rounded-full blur-xl -z-10"
                  />
                </div>
              )}
              {tile.type === 'SHOP'     && <ShoppingCart className="w-7 h-7 text-yellow-500" />}
              {tile.type === 'REST'     && <Flame className="w-7 h-7 text-orange-500 animate-pulse" />}
              {tile.type === 'TREASURE' && <Gem className="w-7 h-7 text-emerald-400" />}
              {tile.type === 'EVENT'    && <Sparkles className="w-7 h-7 text-purple-400" />}
              {tile.type === 'KEY' && (
                <div className="relative">
                  <Key className="w-8 h-8 text-yellow-500" />
                  <div className="absolute inset-0 bg-yellow-500 rounded-full blur-xl -z-10 opacity-30" />
                </div>
              )}
              {tile.type === 'EXIT' && (
                <div className="relative">
                  <DoorOpen className="w-8 h-8 text-blue-400" />
                  <div className="absolute inset-0 bg-blue-500 rounded-full blur-xl -z-10 opacity-20" />
                </div>
              )}

              {/* Visited SAFE tiles: replace empty space with dim footprint icon */}
              {isVisited && tile.type === 'SAFE' && !showNumber && (
                <Footprints className="w-5 h-5 text-sky-500/30" />
              )}

              {showNumber && tile.dangerNumber > 0 && (
                <span className={clsx(
                  'text-2xl font-black font-mono tracking-tighter',
                  // Visited tiles get slightly dimmed numbers to indicate already explored
                  isVisited ? 'opacity-50' : 'opacity-100',
                  tile.dangerNumber === 1 && 'text-blue-400/80',
                  tile.dangerNumber === 2 && 'text-green-400/80',
                  tile.dangerNumber === 3 && 'text-orange-400/80',
                  tile.dangerNumber >= 4  && 'text-red-500',
                )}>
                  {tile.dangerNumber}
                </span>
              )}
            </motion.div>
          ) : (
            isAdjacent && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.3 }}
                className="w-1 h-1 bg-white rounded-full"
              />
            )
          )}
        </AnimatePresence>
      </div>

      {/* ── Fog of War ───────────────────────────────────────────────────── */}
      {!tile.revealed && dist > 1 && (
        <div className="absolute inset-0 hex-clip bg-black/40 backdrop-blur-[2px] z-20" />
      )}
    </motion.div>
  );
}
