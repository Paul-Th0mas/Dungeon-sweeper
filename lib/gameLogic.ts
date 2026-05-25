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
    // Primary: 8 Fire cards
    { element: 'FIRE', rank: 2 }, { element: 'FIRE', rank: 3 },
    { element: 'FIRE', rank: 4 }, { element: 'FIRE', rank: 5 },
    { element: 'FIRE', rank: 7 }, { element: 'FIRE', rank: 9 },
    { element: 'FIRE', rank: 12 }, { element: 'FIRE', rank: 14 },
    // Secondary: 5 Air cards
    { element: 'AIR', rank: 2 }, { element: 'AIR', rank: 3 },
    { element: 'AIR', rank: 8 }, { element: 'AIR', rank: 10 },
    { element: 'AIR', rank: 11 },
    // Utility: 4 Earth cards
    { element: 'EARTH', rank: 3 }, { element: 'EARTH', rank: 5 },
    { element: 'EARTH', rank: 7 }, { element: 'EARTH', rank: 9 },
    // Splash: 3 Water cards
    { element: 'WATER', rank: 4 }, { element: 'WATER', rank: 8 },
    { element: 'WATER', rank: 9 },
  ],
  PALADIN: [
    // Primary: 8 Water cards
    { element: 'WATER', rank: 2 }, { element: 'WATER', rank: 3 },
    { element: 'WATER', rank: 4 }, { element: 'WATER', rank: 5 },
    { element: 'WATER', rank: 7 }, { element: 'WATER', rank: 9 },
    { element: 'WATER', rank: 12 }, { element: 'WATER', rank: 14 },
    // Secondary: 5 Earth cards
    { element: 'EARTH', rank: 2 }, { element: 'EARTH', rank: 3 },
    { element: 'EARTH', rank: 8 }, { element: 'EARTH', rank: 10 },
    { element: 'EARTH', rank: 11 },
    // Utility: 4 Fire cards
    { element: 'FIRE', rank: 3 }, { element: 'FIRE', rank: 5 },
    { element: 'FIRE', rank: 7 }, { element: 'FIRE', rank: 9 },
    // Splash: 3 Air cards
    { element: 'AIR', rank: 4 }, { element: 'AIR', rank: 8 },
    { element: 'AIR', rank: 9 },
  ],
  WIZARD: [
    // Primary: 8 Air cards
    { element: 'AIR', rank: 2 }, { element: 'AIR', rank: 3 },
    { element: 'AIR', rank: 4 }, { element: 'AIR', rank: 5 },
    { element: 'AIR', rank: 7 }, { element: 'AIR', rank: 9 },
    { element: 'AIR', rank: 13 }, { element: 'AIR', rank: 14 },
    // Secondary: 5 Fire cards
    { element: 'FIRE', rank: 2 }, { element: 'FIRE', rank: 3 },
    { element: 'FIRE', rank: 8 }, { element: 'FIRE', rank: 10 },
    { element: 'FIRE', rank: 11 },
    // Utility: 4 Water cards
    { element: 'WATER', rank: 3 }, { element: 'WATER', rank: 5 },
    { element: 'WATER', rank: 7 }, { element: 'WATER', rank: 9 },
    // Splash: 3 Earth cards
    { element: 'EARTH', rank: 4 }, { element: 'EARTH', rank: 8 },
    { element: 'EARTH', rank: 9 },
  ],
  OVERSEER: [
    // Primary: 8 Earth cards
    { element: 'EARTH', rank: 2 }, { element: 'EARTH', rank: 3 },
    { element: 'EARTH', rank: 4 }, { element: 'EARTH', rank: 5 },
    { element: 'EARTH', rank: 7 }, { element: 'EARTH', rank: 9 },
    { element: 'EARTH', rank: 12 }, { element: 'EARTH', rank: 14 },
    // Secondary: 5 Water cards
    { element: 'WATER', rank: 2 }, { element: 'WATER', rank: 3 },
    { element: 'WATER', rank: 8 }, { element: 'WATER', rank: 10 },
    { element: 'WATER', rank: 11 },
    // Utility: 4 Air cards
    { element: 'AIR', rank: 3 }, { element: 'AIR', rank: 5 },
    { element: 'AIR', rank: 7 }, { element: 'AIR', rank: 9 },
    // Splash: 3 Fire cards
    { element: 'FIRE', rank: 4 }, { element: 'FIRE', rank: 8 },
    { element: 'FIRE', rank: 9 },
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
  elementBias?: Partial<Record<CardElement, number>>;
}> = [
  {
    name: 'Goblin Scout',
    hpBase: 40,
    hpPerFloor: 15,
    handsAllowed: 3,
    discardsAllowed: 2,
    attackBase: 8,
    attackPerFloor: 2,
    rarity: 'COMMON',
    elementBias: { AIR: 0.5, FIRE: 0.2, EARTH: 0.15, WATER: 0.15 }
  },
  {
    name: 'Skeleton Archer',
    hpBase: 50,
    hpPerFloor: 18,
    handsAllowed: 4,
    discardsAllowed: 2,
    attackBase: 10,
    attackPerFloor: 3,
    rarity: 'COMMON',
    elementBias: { EARTH: 0.5, AIR: 0.2, WATER: 0.15, FIRE: 0.15 }
  },
  {
    name: 'Cursed Slime',
    hpBase: 35,
    hpPerFloor: 12,
    handsAllowed: 5,
    discardsAllowed: 3,
    attackBase: 6,
    attackPerFloor: 2,
    rarity: 'COMMON',
    elementBias: { WATER: 0.5, EARTH: 0.2, FIRE: 0.15, AIR: 0.15 }
  },
  {
    name: 'Dark Knight',
    hpBase: 80,
    hpPerFloor: 25,
    handsAllowed: 4,
    discardsAllowed: 2,
    attackBase: 15,
    attackPerFloor: 4,
    rarity: 'RARE',
    elementBias: { EARTH: 0.3, FIRE: 0.3, WATER: 0.2, AIR: 0.2 }
  },
  {
    name: 'Shadow Wraith',
    hpBase: 65,
    hpPerFloor: 20,
    handsAllowed: 5,
    discardsAllowed: 3,
    attackBase: 12,
    attackPerFloor: 3,
    rarity: 'RARE',
    elementBias: { AIR: 0.4, FIRE: 0.4, WATER: 0.1, EARTH: 0.1 }
  },
  {
    name: 'Flame Golem',
    hpBase: 100,
    hpPerFloor: 30,
    handsAllowed: 4,
    discardsAllowed: 2,
    attackBase: 18,
    attackPerFloor: 5,
    rarity: 'EPIC',
    elementBias: { FIRE: 0.6, EARTH: 0.2, AIR: 0.1, WATER: 0.1 }
  },
  {
    name: 'Ancient Dragon',
    hpBase: 150,
    hpPerFloor: 50,
    handsAllowed: 5,
    discardsAllowed: 2,
    attackBase: 25,
    attackPerFloor: 8,
    rarity: 'LEGENDARY',
    elementBias: { FIRE: 0.6, AIR: 0.2, EARTH: 0.1, WATER: 0.1 }
  },
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
    elementBias: template.elementBias,
  };
}

export function getEnemyBiasByName(name: string): Partial<Record<CardElement, number>> | undefined {
  const template = ENEMY_ROSTER.find((e) => e.name === name);
  return template?.elementBias;
}

export function generateEnemyQueue(enemyName: string, length: number): CardElement[] {
  const bias = getEnemyBiasByName(enemyName) || { FIRE: 0.25, WATER: 0.25, AIR: 0.25, EARTH: 0.25 };
  const elements: CardElement[] = ['FIRE', 'WATER', 'EARTH', 'AIR'];
  
  // Normalize weights in case some elements are missing or do not sum to 1
  const weights = elements.map(el => bias[el] ?? 0);
  const totalWeight = weights.reduce((sum, w) => sum + w, 0) || 1;
  const normalizedWeights = weights.map(w => w / totalWeight);

  return Array.from({ length }).map(() => {
    const r = Math.random();
    let cumulative = 0;
    for (let i = 0; i < elements.length; i++) {
      cumulative += normalizedWeights[i];
      if (r <= cumulative) {
        return elements[i];
      }
    }
    return elements[elements.length - 1]; // fallback
  });
}


