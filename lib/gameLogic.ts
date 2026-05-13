import { AxialCoord, Tile, TileType, Card, CardElement, CardRank, Enemy, PlayerClass } from './types';
import { getNeighbors, coordToString } from './hexMath';
import { shuffle } from 'lodash';

// ── Deck Generation ───────────────────────────────────────────────────────────

/**
 * Class-specific element distribution.
 * Values are how many cards of each element appear in a 52-card deck.
 */
const CLASS_DECKS: Record<PlayerClass, Record<CardElement, number>> = {
  BERSERKER: { FIRE: 20, ELECTRICITY: 15, ICE: 10, WIND: 7  }, // Aggressive, high damage
  PALADIN:   { ICE: 20,  FIRE: 15,  WIND: 10, ELECTRICITY: 7 }, // Control + sustain
  WIZARD:    { ELECTRICITY: 20, FIRE: 15, ICE: 10, WIND: 7   }, // Chain combo machine
  OVERSEER:  { WIND: 20, ICE: 15, ELECTRICITY: 10, FIRE: 7   }, // Utility and draws
};

const RANKS: CardRank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

export function generateDeck(playerClass: PlayerClass = 'BERSERKER'): Card[] {
  const distribution = CLASS_DECKS[playerClass];
  const deck: Card[] = [];

  for (const [element, count] of Object.entries(distribution) as [CardElement, number][]) {
    const shuffledRanks = shuffle([...RANKS]);
    for (let i = 0; i < count; i++) {
      deck.push({
        id: Math.random().toString(36).substr(2, 9),
        element,
        rank: shuffledRanks[i % RANKS.length],
      });
    }
  }
  return shuffle(deck);
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
  placeTiles('KEY',     1);
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
    handsAllowed: template.handsAllowed,
    discardsAllowed: template.discardsAllowed,
    attackDamage: template.attackBase + template.attackPerFloor * (floor - 1),
    rewardRarity: template.rarity,
    statusEffects: [],
  };
}
