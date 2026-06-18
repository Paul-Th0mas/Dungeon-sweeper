'use client';

import { Tile, PlayerClass } from '@/lib/types';
import { useGameStore } from '@/store/useGameStore';
import { getDistance, coordToString } from '@/lib/hexMath';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

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

const PixelKey = () => (
  <svg className="w-8 h-8 drop-shadow-[2px_2px_0_#0d0d15]" viewBox="0 0 16 16" fill="#fbbf24">
    <path d="M5 2h6v2h1v4h-1v2H9v4H8v2H5v-2h2v-2H5v-2h2V8H5V2zm2 2v2h2V4H7z" />
  </svg>
);

const PixelDoor = ({ isOpen }: { isOpen: boolean }) => (
  <svg className="w-9 h-9 drop-shadow-[2px_2px_0_#0d0d15]" viewBox="0 0 16 16" fill="none">
    {/* Frame */}
    <path d="M2 1h12v14H2V1z" fill="#78350f" />
    {isOpen ? (
      <path d="M4 3h8v12H4V3z" fill="#0d0d15" />
    ) : (
      <>
        <path d="M4 3h8v12H4V3z" fill="#b45309" />
        <rect x="5" y="8" width="2" height="2" fill="#f59e0b" />
      </>
    )}
    <path d="M2 1h12v1H2V1zm0 1v13H3V2h10v13h1V2H2z" fill="#451a03" />
  </svg>
);

const PixelShop = ({ isCleared }: { isCleared: boolean }) => (
  <svg className="w-9 h-9 drop-shadow-[2px_2px_0_#0d0d15]" viewBox="0 0 16 16" fill="none">
    {/* Cart Chassis */}
    <path d="M2 2h3v1h8v5H5V4H3V2H2v1z" fill="#94a3b8" />
    <rect x="5" y="9" width="2" height="2" fill="#1e293b" />
    <rect x="11" y="9" width="2" height="2" fill="#1e293b" />
    {/* Gold Coins (only if active) */}
    {!isCleared && <path d="M6 3h5v2H6V3z" fill="#fbbf24" />}
  </svg>
);

const PixelCampfire = ({ isCleared }: { isCleared: boolean }) => (
  <div className="relative flex flex-col items-center">
    {!isCleared && (
      <svg className="w-7 h-7 animate-torch-flicker" viewBox="0 0 8 8" fill="none">
        <path d="M3 1h2v1h1v2H2V3h1V1z" fill="#ef4444" />
        <path d="M3 3h2v1H3V3z" fill="#f97316" />
        <path d="M4 4h1v1H4V4z" fill="#eab308" />
      </svg>
    )}
    {/* Logs */}
    <svg className="w-8 h-4 mt-[-4px]" viewBox="0 0 8 4" fill="none">
      <path d="M1 2h6v1H1V2z" fill={isCleared ? "#4b5563" : "#78350f"} />
      <path d="M2 1h4v1H2V1z" fill={isCleared ? "#374151" : "#451a03"} />
    </svg>
  </div>
);

const PixelChest = ({ isCleared }: { isCleared: boolean }) => (
  <svg className="w-9 h-9 drop-shadow-[2px_2px_0_#0d0d15]" viewBox="0 0 16 16" fill="none">
    {isCleared ? (
      <>
        <path d="M2 6h12v9H2V6z" fill="#78350f" />
        <path d="M4 8h8v7H4V8z" fill="#1c1917" />
        <path d="M1 2h14v3H1V2z" fill="#451a03" />
      </>
    ) : (
      <>
        <path d="M2 4h12v11H2V4z" fill="#78350f" />
        <path d="M2 8h12v1H2V8zm7-2h2v3H9V6z" fill="#d97706" />
        <rect x="7" y="7" width="2" height="2" fill="#f59e0b" />
      </>
    )}
  </svg>
);

const PixelEvent = ({ isCleared }: { isCleared: boolean }) => {
  if (isCleared) return null;
  return (
    <svg className="w-7 h-7 drop-shadow-[1px_1px_0_#0d0d15] animate-pulse" viewBox="0 0 16 16" fill="#c084fc">
      <path d="M3 2h2v2H3V2zm5 4h2v2H8V6zm5-4h2v2h-2V2zM1 9h2v2H1V9zm12 1h2v2h-2v-2zm-5 4h2v2H8v-2z" />
      <path d="M6 2h1v1H6V2zm4 7h1v1h-1V9z" fill="#ffffff" />
    </svg>
  );
};

const PixelEnemy = ({ isCleared }: { isCleared: boolean }) => {
  if (isCleared) {
    return (
      <svg className="w-7 h-7 drop-shadow-[1px_1px_0_#0d0d15]" viewBox="0 0 16 16" fill="#a1a1aa">
        <path d="M2 13h12v2H2v-2zm2-2h8v1H4v-1zm2-2h4v1H6V9zm1-2h2v1H7V7z" />
      </svg>
    );
  }
  return (
    <div className="relative flex flex-col items-center">
      <svg className="w-8 h-8 drop-shadow-[2px_2px_0_#0d0d15]" viewBox="0 0 16 16" fill="#e4e1ed">
        <path d="M3 3h10v6H3V3z" />
        <path d="M4 9h8v3H4V9z" />
        <path d="M5 12h6v2H5v-2z" />
        <rect x="5" y="6" width="2" height="2" fill="#ef4444" />
        <rect x="9" y="6" width="2" height="2" fill="#ef4444" />
        <rect x="7" y="8" width="2" height="1" fill="#0d0d15" />
        <path d="M6 10h1v2H6v-2zm2 0h1v2H8v-2zm2 0h1v2h-1v-2z" fill="#0d0d15" />
      </svg>
      <div className="absolute inset-0 bg-red-500 rounded-full blur-lg -z-10 opacity-20 animate-pulse" />
    </div>
  );
};

// ── Main Component ──────────────────────────────────────────────────────────

export default function HexTile({ tile }: Props) {
  const { player, movePlayer, visitedCoords } = useGameStore();

  if (!player) return null;

  const dist = getDistance(player.position, tile.coord);
  const isPlayer = dist === 0;
  const isAdjacent = dist === 1;
  const isVisible = tile.revealed || dist <= 1;
  const isVisited = visitedCoords.has(coordToString(tile.coord)) && !isPlayer;
  const showNumber = tile.revealed && dist <= player.torchRadius && tile.type === 'SAFE';

  const handleClick = () => {
    if (isAdjacent) movePlayer(tile.coord);
  };

  // 1. Pillar Color Mapping based on current tile state
  let topFill = '#1f1f27';      // Default revealed grey
  let leftSideFill = '#13131b';  // Shaded side
  let rightSideFill = '#1b1b23'; // Lighter side
  let strokeColor = '#464652';
  let filterGlow = '';

  if (isPlayer) {
    topFill = '#e1e0ff';      // Glowing white/blue (primary-fixed)
    leftSideFill = '#2e3192'; // Sonic Blue shadow (primary-container)
    rightSideFill = '#4f54b4';// Inverse primary highlight
    strokeColor = '#c0c1ff';  // Cyan-blue stroke
    filterGlow = 'drop-shadow(0 0 12px rgba(192, 193, 255, 0.65))';
  } else if (!tile.revealed) {
    topFill = '#0d0d15';      // Unrevealed dark obsidian
    leftSideFill = '#09090c';
    rightSideFill = '#0d0d15';
    strokeColor = '#1f1f27';
  } else if (isVisited) {
    topFill = '#1b1b23';      // Visited low contrast path
    leftSideFill = '#0d0d15';
    rightSideFill = '#13131b';
    strokeColor = '#292932';
  }

  // 2. Minesweeper Danger Number Color Mapping
  const numberColor =
    tile.dangerNumber === 1 ? '#38bdf8' : // Blue
    tile.dangerNumber === 2 ? '#4ade80' : // Green
    tile.dangerNumber === 3 ? '#fb923c' : // Orange
    '#ef4444';                            // Red

  // 3. Player Class Badge Mappings
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

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{
        opacity: isVisible ? 1 : 0.25, // Deep fog of war on unrevealed/unreachable tiles
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
      {/* ── 3D Hexagonal Pillar Vector Shape ── */}
      <svg 
        className="w-20 h-20 overflow-visible" 
        viewBox="0 0 80 80" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        style={{ filter: filterGlow }}
      >
        {/* Left Shaded Face (Depth D = 26px) */}
        <path 
          d="M 4 15 L 4 39 L 40 51 L 40 77 L 4 65 L 4 41 Z" 
          fill={leftSideFill} 
          stroke="#0d0d15" 
          strokeWidth="2" 
          strokeLinejoin="miter"
        />

        {/* Right Shaded Face (Depth D = 26px) */}
        <path 
          d="M 40 51 L 76 39 L 76 15 L 76 41 L 76 65 L 40 77 Z" 
          fill={rightSideFill} 
          stroke="#0d0d15" 
          strokeWidth="2" 
          strokeLinejoin="miter"
        />

        {/* Flat Isometric Hexagonal Top Face */}
        <path 
          d="M 40 3 L 76 15 L 76 39 L 40 51 L 4 39 L 4 15 Z" 
          fill={topFill} 
          stroke={strokeColor} 
          strokeWidth="2" 
          strokeLinejoin="miter"
        />

        {/* Flat Projected Footprints (Traversed Safe empty cells) */}
        {isVisited && tile.type === 'SAFE' && tile.dangerNumber === 0 && (
          <g transform="translate(32, 19) rotate(-8) skewX(-15)" style={{ transformOrigin: '8px 8px' }}>
            <path d="M2 5h3v5H2V5zm1-1h2v1H3V4zm5 3h3v5H8V7zm1-1h2v1H9V5z" fill="#38bdf8" opacity="0.3" />
          </g>
        )}

        {/* Flat Projected Minesweeper Danger Number */}
        {showNumber && tile.dangerNumber > 0 && (
          <text
            x="40"
            y="33"
            textAnchor="middle"
            fill={numberColor}
            stroke="#0d0d15"
            strokeWidth="3"
            paintOrder="stroke"
            strokeLinejoin="miter"
            className="font-anybody text-[16px] font-black italic select-none pointer-events-none"
            transform="rotate(-8) skewX(-15)"
            style={{ transformOrigin: '40px 27px' }}
          >
            {tile.dangerNumber}
          </text>
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
        <AnimatePresence mode="wait">
          {/* 1. Player Floating Badge */}
          {isPlayer && (
            <motion.div
              key="player-badge"
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: [0, -6, 0], opacity: 1 }}
              transition={{
                y: { repeat: Infinity, duration: 2, ease: "easeInOut" },
                opacity: { duration: 0.2 }
              }}
              className="w-12 h-12 flex items-center justify-center rounded-full border-4 bg-[#0d0d15] shadow-[0_4px_10px_rgba(0,0,0,0.6)] mb-3"
              style={{ borderColor: playerClassColor }}
            >
              <PlayerClassIcon color={playerClassColor} />
            </motion.div>
          )}

          {/* 2. Unrevealed Glowing Center Marker */}
          {!tile.revealed && (
            <motion.div
              key="unrevealed-marker"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="w-3.5 h-3.5 rounded-full bg-cyan-400 border border-black shadow-[0_0_8px_#22d3ee] animate-pulse mb-2.5"
            />
          )}

          {/* 3. Revealed Action Landmarks */}
          {tile.revealed && (
            <motion.div
              key="landmark"
              initial={{ scale: 0, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0 }}
              className="flex items-center justify-center mb-1"
            >
              {tile.type === 'ENEMY' && <PixelEnemy isCleared={!!tile.cleared} />}
              {tile.type === 'SHOP' && <PixelShop isCleared={!!tile.cleared} />}
              {tile.type === 'REST' && <PixelCampfire isCleared={!!tile.cleared} />}
              {tile.type === 'TREASURE' && <PixelChest isCleared={!!tile.cleared} />}
              {tile.type === 'EVENT' && <PixelEvent isCleared={!!tile.cleared} />}
              {tile.type === 'KEY' && !tile.cleared && <PixelKey />}
              {tile.type === 'EXIT' && <PixelDoor isOpen={!!tile.cleared} />}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
