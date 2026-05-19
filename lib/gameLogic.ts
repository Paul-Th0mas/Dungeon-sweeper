import { AxialCoord, Tile, TileType, Card, CardElement, Enemy, PlayerClass } from './types';
import { getNeighbors, coordToString } from './hexMath';
import { shuffle } from 'lodash';

// ── Deck Generation ───────────────────────────────────────────────────────────

/**
 * Durability helper.
 * rank 2-5  → infinite basic attacks (999 uses, never break)
 * rank 6-9  → standard spells (4 uses)
 * rank 10-13 → limited spells (3 uses)
 * rank 14   → Ace legendary (2 uses, isExhaust)
 */
function durabilityFor(rank: number): { maxUses: number; isExhaust: boolean } {
  if (rank <= 5)  return { maxUses: 999, isExhaust: false };
  if (rank <= 9)  return { maxUses: 4,   isExhaust: false };
  if (rank <= 13) return { maxUses: 3,   isExhaust: false };
  return           { maxUses: 2,   isExhaust: true  }; // Ace — exhaust after all uses
}

interface DeckEntry { element: CardElement; rank: number; }

/**
 * Class-specific starter loadouts (20–28 cards with explicit ranks).
 * Low-rank cards = infinite basic attacks.
 * High-rank cards = rare limited spells.
 */
const CLASS_KITS: Record<PlayerClass, DeckEntry[]> = {
  BERSERKER: [
    // Core: 8 Basic Fire attacks (infinite)
    { element: 'FIRE', rank: 2 }, { element: 'FIRE', rank: 3 },
    { element: 'FIRE', rank: 4 }, { element: 'FIRE', rank: 5 },
    { element: 'FIRE', rank: 2 }, { element: 'FIRE', rank: 3 },
    { element: 'FIRE', rank: 4 }, { element: 'FIRE', rank: 5 },
    // Standard Fire spells
    { element: 'FIRE', rank: 7 }, { element: 'FIRE', rank: 8 },
    { element: 'FIRE', rank: 9 }, { element: 'FIRE', rank: 9 },
    // Limited Fire power
    { element: 'FIRE', rank: 11 }, { element: 'FIRE', rank: 12 },
    // Legendary Fire (Exhaust)
    { element: 'FIRE', rank: 14 },
    // Support Electricity
    { element: 'ELECTRICITY', rank: 3 }, { element: 'ELECTRICITY', rank: 7 },
    { element: 'ELECTRICITY', rank: 10 },
    // Utility Ice & Wind
    { element: 'ICE',  rank: 4 }, { element: 'WIND', rank: 3 },
  ],
  PALADIN: [
    // Core: 8 Basic Ice attacks (infinite)
    { element: 'ICE', rank: 2 }, { element: 'ICE', rank: 3 },
    { element: 'ICE', rank: 4 }, { element: 'ICE', rank: 5 },
    { element: 'ICE', rank: 2 }, { element: 'ICE', rank: 3 },
    { element: 'ICE', rank: 4 }, { element: 'ICE', rank: 5 },
    // Standard Ice spells
    { element: 'ICE', rank: 7 }, { element: 'ICE', rank: 8 },
    { element: 'ICE', rank: 9 }, { element: 'ICE', rank: 9 },
    // Limited Ice power
    { element: 'ICE', rank: 11 }, { element: 'ICE', rank: 12 },
    // Legendary Ice (Exhaust)
    { element: 'ICE', rank: 14 },
    // Support Fire
    { element: 'FIRE', rank: 3 }, { element: 'FIRE', rank: 8 },
    // Utility Wind
    { element: 'WIND', rank: 3 }, { element: 'WIND', rank: 7 },
    // One Electricity
    { element: 'ELECTRICITY', rank: 4 },
  ],
  WIZARD: [
    // Core: 8 Basic Electricity attacks (infinite)
    { element: 'ELECTRICITY', rank: 2 }, { element: 'ELECTRICITY', rank: 3 },
    { element: 'ELECTRICITY', rank: 4 }, { element: 'ELECTRICITY', rank: 5 },
    { element: 'ELECTRICITY', rank: 2 }, { element: 'ELECTRICITY', rank: 3 },
    { element: 'ELECTRICITY', rank: 4 }, { element: 'ELECTRICITY', rank: 5 },
    // Standard Electricity spells
    { element: 'ELECTRICITY', rank: 7 }, { element: 'ELECTRICITY', rank: 8 },
    { element: 'ELECTRICITY', rank: 9 },
    // Limited Electricity power
    { element: 'ELECTRICITY', rank: 11 }, { element: 'ELECTRICITY', rank: 13 },
    // Legendary Electricity (Exhaust)
    { element: 'ELECTRICITY', rank: 14 },
    // Support Fire
    { element: 'FIRE', rank: 3 }, { element: 'FIRE', rank: 8 },
    { element: 'FIRE', rank: 10 },
    // Utility Ice & Wind
    { element: 'ICE',  rank: 3 }, { element: 'WIND', rank: 3 },
    { element: 'WIND', rank: 7 },
  ],
  OVERSEER: [
    // Core: 8 Basic Wind attacks (infinite)
    { element: 'WIND', rank: 2 }, { element: 'WIND', rank: 3 },
    { element: 'WIND', rank: 4 }, { element: 'WIND', rank: 5 },
    { element: 'WIND', rank: 2 }, { element: 'WIND', rank: 3 },
    { element: 'WIND', rank: 4 }, { element: 'WIND', rank: 5 },
    // Standard Wind spells
    { element: 'WIND', rank: 7 }, { element: 'WIND', rank: 8 },
    { element: 'WIND', rank: 9 }, { element: 'WIND', rank: 9 },
    // Limited Wind power
    { element: 'WIND', rank: 11 }, { element: 'WIND', rank: 12 },
    // Legendary Wind (Exhaust)
    { element: 'WIND', rank: 14 },
    // Support Ice
    { element: 'ICE',  rank: 3 }, { element: 'ICE',  rank: 8 },
    { element: 'ICE',  rank: 10 },
    // Utility Fire & Electricity
    { element: 'FIRE', rank: 3 }, { element: 'ELECTRICITY', rank: 4 },
    { element: 'ELECTRICITY', rank: 7 },
  ],
};

export function generateDeck(playerClass: PlayerClass = 'BERSERKER'): (DeckEntry & { maxUses: number; currentUses: number; isExhaust: boolean })[] {
  const kit = CLASS_KITS[playerClass];
  return shuffle(kit.map((entry) => {
    const { maxUses, isExhaust } = durabilityFor(entry.rank);
    return { ...entry, maxUses, currentUses: maxUses, isExhaust };
  }));
}

// ── Grid Generation ───────────────────────────────────────────────────────────

export function generateGrid(radius: number): Record<string, Tile> {
  const grid: Record<string, Tile> = {};

  for (let q = -radius; q <= radius; q++) {
    const r1 = Math.max(-radius, -q - radius);
    const r2 = Math.min(radius, -q + radius);
    for (let r = r1; r <= r2; r++) {
      const coord = { q, r };
      grid[coordToString(coord)] = {
        coord,
        type: 'SAFE',
        revealed: false,
        dangerNumber: 0,
      };
    }
  }

  const coords = Object.keys(grid).filter((c) => c !== '0,0');

  const placeTiles = (type: TileType, count: number) => {
    let placed = 0;
    while (placed < count) {
      const randomCoord = coords[Math.floor(Math.random() * coords.length)];
      if (grid[randomCoord].type === 'SAFE') {
        grid[randomCoord].type = type;
        placed++;
      }
    }
  };

  const totalTiles = coords.length;
  placeTiles('ENEMY',   Math.floor(totalTiles * 0.15));
  placeTiles('SHOP',    1);
  placeTiles('REST',    1);
  placeTiles('TREASURE', 1);
  placeTiles('EVENT',   2);
  placeTiles('EXIT',    1);

  // Compute danger numbers
  Object.values(grid).forEach((tile) => {
    if (tile.type === 'ENEMY') return;
    const neighbors = getNeighbors(tile.coord);
    let count = 0;
    neighbors.forEach((n) => {
      const s = coordToString(n);
      if (grid[s] && grid[s].type === 'ENEMY') count++;
    });
    tile.dangerNumber = count;
  });

  grid['0,0'].revealed = true;
  return grid;
}

export function generateTreasureGrid(radius: number): Record<string, Tile> {
  const grid: Record<string, Tile> = {};

  for (let q = -radius; q <= radius; q++) {
    const r1 = Math.max(-radius, -q - radius);
    const r2 = Math.min(radius, -q + radius);
    for (let r = r1; r <= r2; r++) {
      const coord = { q, r };
      grid[coordToString(coord)] = {
        coord,
        type: 'SAFE',
        revealed: false,
        dangerNumber: 0,
        hasItem: true,
      };
    }
  }

  const coords = Object.keys(grid);
  const trapCount = Math.floor(coords.length * 0.25);
  let placedTraps = 0;

  while (placedTraps < trapCount) {
    const randomCoord = coords[Math.floor(Math.random() * coords.length)];
    if (grid[randomCoord].type === 'SAFE') {
      grid[randomCoord].type = 'WALL';
      grid[randomCoord].hasItem = false;
      placedTraps++;
    }
  }

  Object.values(grid).forEach((tile) => {
    if (tile.type === 'WALL') return;
    const neighbors = getNeighbors(tile.coord);
    let count = 0;
    neighbors.forEach((n) => {
      const s = coordToString(n);
      if (grid[s] && grid[s].type === 'WALL') count++;
    });
    tile.dangerNumber = count;
  });

  return grid;
}

// ── Enemy Roster ─────────────────────────────────────────────────────────────

const ENEMY_ROSTER: Array<{
  name: string;
  hpBase: number;
  hpPerFloor: number;
  handsAllowed: number;
  discardsAllowed: number;
  attackBase: number;
  attackPerFloor: number;
  rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
}> = [
  { name: 'Goblin Scout',      hpBase: 40,  hpPerFloor: 15, handsAllowed: 3, discardsAllowed: 2, attackBase: 8,  attackPerFloor: 2, rarity: 'COMMON'    },
  { name: 'Skeleton Archer',   hpBase: 50,  hpPerFloor: 18, handsAllowed: 4, discardsAllowed: 2, attackBase: 10, attackPerFloor: 3, rarity: 'COMMON'    },
  { name: 'Cursed Slime',      hpBase: 35,  hpPerFloor: 12, handsAllowed: 5, discardsAllowed: 3, attackBase: 6,  attackPerFloor: 2, rarity: 'COMMON'    },
  { name: 'Dark Knight',       hpBase: 80,  hpPerFloor: 25, handsAllowed: 4, discardsAllowed: 2, attackBase: 15, attackPerFloor: 4, rarity: 'RARE'      },
  { name: 'Shadow Wraith',     hpBase: 65,  hpPerFloor: 20, handsAllowed: 5, discardsAllowed: 3, attackBase: 12, attackPerFloor: 3, rarity: 'RARE'      },
  { name: 'Flame Golem',       hpBase: 100, hpPerFloor: 30, handsAllowed: 4, discardsAllowed: 2, attackBase: 18, attackPerFloor: 5, rarity: 'EPIC'      },
  { name: 'Ancient Dragon',    hpBase: 150, hpPerFloor: 50, handsAllowed: 5, discardsAllowed: 2, attackBase: 25, attackPerFloor: 8, rarity: 'LEGENDARY' },
];

export function getRandomEnemy(floor: number): Enemy {
  // Weight towards rarer enemies on higher floors
  const roll = Math.random();
  let pool = ENEMY_ROSTER.filter((e) => e.rarity === 'COMMON');
  if (floor >= 3 && roll > 0.6)  pool = ENEMY_ROSTER.filter((e) => e.rarity === 'RARE');
  if (floor >= 5 && roll > 0.75) pool = ENEMY_ROSTER.filter((e) => e.rarity === 'EPIC');
  if (floor >= 7 && roll > 0.9)  pool = ENEMY_ROSTER.filter((e) => e.rarity === 'LEGENDARY');

  const template = pool[Math.floor(Math.random() * pool.length)];
  return {
    id: Math.random().toString(36).substr(2, 9),
    name: template.name,
    maxHp: template.hpBase + template.hpPerFloor * (floor - 1),
    currentHp: template.hpBase + template.hpPerFloor * (floor - 1),
    attackDamage: template.attackBase + template.attackPerFloor * (floor - 1),
    rewardRarity: template.rarity,
    statusEffects: [],
  };
}
