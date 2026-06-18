import { AxialCoord, Tile, TileType, CardElement, PlayerClass, EnemyTier, EnemySpell, SpareElements } from './types';
import { getNeighbors, coordToString } from './hexMath';
import { shuffle } from 'lodash';

// ── Spell Definitions ─────────────────────────────────────────────────────────

export interface SpellTemplate {
  name: string;
  recipe: CardElement[];
  baseDamage: number;
  isAdvanced: boolean;
  playerClass?: PlayerClass; // Undefined = Neutral/Void
  statusEffect?: { type: 'BURN' | 'FREEZE' | 'CHAIN' | 'PUSH'; value: number; turns: number };
}

// Basic Spells — 2 element recipes, available from game start or shop
export const BASIC_SPELLS: SpellTemplate[] = [
  // Berserker (Fire/Earth physical)
  { name: 'Ember Strike',  recipe: ['FIRE', 'FIRE'],               baseDamage: 30,  isAdvanced: false, playerClass: 'BERSERKER' },
  { name: 'Scorched Earth', recipe: ['FIRE', 'EARTH'],             baseDamage: 25,  isAdvanced: false, playerClass: 'BERSERKER', statusEffect: { type: 'BURN', value: 5, turns: 2 } },
  { name: 'Flame Surge',   recipe: ['FIRE', 'AIR'],                baseDamage: 28,  isAdvanced: false, playerClass: 'BERSERKER' },
  { name: 'Rage Strike',   recipe: ['EARTH', 'FIRE'],              baseDamage: 27,  isAdvanced: false, playerClass: 'BERSERKER' },

  // Paladin (Water/Earth holy defensive)
  { name: 'Tidal Wave',    recipe: ['WATER', 'WATER'],             baseDamage: 30,  isAdvanced: false, playerClass: 'PALADIN' },
  { name: 'Frostbite',     recipe: ['WATER', 'AIR'],               baseDamage: 22,  isAdvanced: false, playerClass: 'PALADIN', statusEffect: { type: 'FREEZE', value: 0, turns: 1 } },
  { name: 'Mud Trap',      recipe: ['WATER', 'EARTH'],             baseDamage: 24,  isAdvanced: false, playerClass: 'PALADIN' },
  { name: 'Shield Bash',   recipe: ['EARTH', 'WATER'],             baseDamage: 26,  isAdvanced: false, playerClass: 'PALADIN' },

  // Wizard (Air/Fire chain magic)
  { name: 'Wind Slash',    recipe: ['AIR', 'AIR'],                 baseDamage: 30,  isAdvanced: false, playerClass: 'WIZARD' },
  { name: 'Static Shock',  recipe: ['AIR', 'FIRE'],                baseDamage: 26,  isAdvanced: false, playerClass: 'WIZARD', statusEffect: { type: 'CHAIN', value: 0.5, turns: 1 } },
  { name: 'Dust Storm',    recipe: ['AIR', 'EARTH'],               baseDamage: 25,  isAdvanced: false, playerClass: 'WIZARD' },
  { name: 'Spark Flare',   recipe: ['FIRE', 'AIR'],                baseDamage: 27,  isAdvanced: false, playerClass: 'WIZARD' },

  // Overseer (Earth/Water poison rogue)
  { name: 'Stone Crush',   recipe: ['EARTH', 'EARTH'],             baseDamage: 30,  isAdvanced: false, playerClass: 'OVERSEER' },
  { name: 'Tremor',        recipe: ['EARTH', 'WATER'],             baseDamage: 24,  isAdvanced: false, playerClass: 'OVERSEER', statusEffect: { type: 'PUSH', value: 0, turns: 1 } },
  { name: 'Gravel Shot',   recipe: ['EARTH', 'AIR'],               baseDamage: 26,  isAdvanced: false, playerClass: 'OVERSEER' },
  { name: 'Toxic Drip',    recipe: ['EARTH', 'FIRE'],              baseDamage: 25,  isAdvanced: false, playerClass: 'OVERSEER', statusEffect: { type: 'BURN', value: 4, turns: 2 } },
];

// Advanced Spells — 3–4 element recipes, purchasable in shop on later floors
export const ADVANCED_SPELLS: SpellTemplate[] = [
  // Berserker advanced
  { name: 'Fireball',        recipe: ['FIRE', 'FIRE', 'AIR'],         baseDamage: 70,  isAdvanced: true, playerClass: 'BERSERKER' },
  { name: 'Inferno Wave',    recipe: ['FIRE', 'FIRE', 'FIRE'],        baseDamage: 90,  isAdvanced: true, playerClass: 'BERSERKER', statusEffect: { type: 'BURN', value: 10, turns: 3 } },
  { name: 'Magma Burst',     recipe: ['FIRE', 'EARTH', 'FIRE'],       baseDamage: 65,  isAdvanced: true, playerClass: 'BERSERKER' },
  { name: 'Shatter Slam',    recipe: ['EARTH', 'EARTH', 'FIRE'],      baseDamage: 75,  isAdvanced: true, playerClass: 'BERSERKER', statusEffect: { type: 'PUSH', value: 0, turns: 1 } },

  // Paladin advanced
  { name: 'Blizzard',        recipe: ['WATER', 'WATER', 'AIR'],       baseDamage: 65,  isAdvanced: true, playerClass: 'PALADIN', statusEffect: { type: 'FREEZE', value: 0, turns: 2 } },
  { name: 'Tidal Crush',     recipe: ['WATER', 'WATER', 'EARTH'],     baseDamage: 75,  isAdvanced: true, playerClass: 'PALADIN' },
  { name: 'Glacial Nova',    recipe: ['WATER', 'AIR', 'WATER'],       baseDamage: 70,  isAdvanced: true, playerClass: 'PALADIN' },
  { name: 'Consecration',    recipe: ['EARTH', 'WATER', 'EARTH'],     baseDamage: 72,  isAdvanced: true, playerClass: 'PALADIN' },

  // Wizard advanced
  { name: 'Storm Surge',     recipe: ['AIR', 'AIR', 'WATER'],         baseDamage: 65,  isAdvanced: true, playerClass: 'WIZARD' },
  { name: 'Thunderclap',     recipe: ['AIR', 'FIRE', 'AIR'],          baseDamage: 72,  isAdvanced: true, playerClass: 'WIZARD', statusEffect: { type: 'CHAIN', value: 1.0, turns: 1 } },
  { name: 'Cyclone',         recipe: ['AIR', 'AIR', 'AIR'],           baseDamage: 90,  isAdvanced: true, playerClass: 'WIZARD' },
  { name: 'Arcane Chain',    recipe: ['AIR', 'FIRE', 'WATER'],        baseDamage: 80,  isAdvanced: true, playerClass: 'WIZARD', statusEffect: { type: 'CHAIN', value: 1.2, turns: 1 } },

  // Overseer advanced
  { name: 'Earthquake',      recipe: ['EARTH', 'EARTH', 'WATER'],     baseDamage: 75,  isAdvanced: true, playerClass: 'OVERSEER' },
  { name: 'Rockslide',       recipe: ['EARTH', 'EARTH', 'AIR'],       baseDamage: 70,  isAdvanced: true, playerClass: 'OVERSEER', statusEffect: { type: 'PUSH', value: 0, turns: 2 } },
  { name: 'Petrify',         recipe: ['EARTH', 'WATER', 'EARTH'],     baseDamage: 68,  isAdvanced: true, playerClass: 'OVERSEER' },
  { name: 'Venomous Gale',   recipe: ['EARTH', 'AIR', 'WATER'],       baseDamage: 74,  isAdvanced: true, playerClass: 'OVERSEER', statusEffect: { type: 'BURN', value: 8, turns: 2 } },

  // Multi-element advanced / Neutral
  { name: 'Prismatic Burst', recipe: ['FIRE', 'WATER', 'AIR', 'EARTH'], baseDamage: 120, isAdvanced: true },
  { name: 'Voidstrike',      recipe: ['EARTH', 'FIRE', 'AIR'],        baseDamage: 85,  isAdvanced: true },
];

// ── Starter Loadouts ──────────────────────────────────────────────────────────
// Each class starts with 4 basic spells themed around their element.

const CLASS_STARTER_SPELLS: Record<PlayerClass, SpellTemplate[]> = {
  BERSERKER: [
    BASIC_SPELLS.find(s => s.name === 'Ember Strike')!,
    BASIC_SPELLS.find(s => s.name === 'Scorched Earth')!,
    BASIC_SPELLS.find(s => s.name === 'Flame Surge')!,
    BASIC_SPELLS.find(s => s.name === 'Rage Strike')!,
  ],
  PALADIN: [
    BASIC_SPELLS.find(s => s.name === 'Tidal Wave')!,
    BASIC_SPELLS.find(s => s.name === 'Frostbite')!,
    BASIC_SPELLS.find(s => s.name === 'Mud Trap')!,
    BASIC_SPELLS.find(s => s.name === 'Shield Bash')!,
  ],
  WIZARD: [
    BASIC_SPELLS.find(s => s.name === 'Wind Slash')!,
    BASIC_SPELLS.find(s => s.name === 'Static Shock')!,
    BASIC_SPELLS.find(s => s.name === 'Dust Storm')!,
    BASIC_SPELLS.find(s => s.name === 'Spark Flare')!,
  ],
  OVERSEER: [
    BASIC_SPELLS.find(s => s.name === 'Stone Crush')!,
    BASIC_SPELLS.find(s => s.name === 'Tremor')!,
    BASIC_SPELLS.find(s => s.name === 'Gravel Shot')!,
    BASIC_SPELLS.find(s => s.name === 'Toxic Drip')!,
  ],
};

export function generateStarterSpells(playerClass: PlayerClass) {
  const templates = CLASS_STARTER_SPELLS[playerClass];
  return templates.map((t, i) => ({
    name: t.name,
    recipe: t.recipe,
    baseDamage: t.baseDamage,
    isAdvanced: t.isAdvanced,
    isUpgraded: false,
    equipped: true,  // All 4 starter spells are equipped from the start
    location: 'LOADOUT' as const,
    statusEffect: t.statusEffect ?? null,
  }));
}

// ── Enemy Roster ──────────────────────────────────────────────────────────────

export interface EnemyTemplate {
  name: string;
  tier: EnemyTier;
  hpBase: number;
  hpPerFloor: number;
  attackBase: number;      // damage per uncountered slot
  attackPerFloor: number;
  mana: number;            // enemy queue length (immutable)
  isEliteOrBoss: boolean;
  elementBias: Partial<Record<CardElement, number>>;
  spellbook: { name: string; recipe: CardElement[]; baseDamage: number }[];
  rewardElements: CardElement[];  // what spare elements drop on kill
  rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
  spawnFloors: [number, number];  // [minFloor, maxFloor]
}

export const ENEMY_ROSTER: EnemyTemplate[] = [
  // ── Tier 1 ────────────────────────────────────────────────────────────────
  {
    name: 'Fire Slime',
    tier: 1,
    hpBase: 50, hpPerFloor: 10,
    attackBase: 8, attackPerFloor: 2,
    mana: 3,
    isEliteOrBoss: false,
    elementBias: { FIRE: 1.0 },
    spellbook: [{ name: 'Searing Touch', recipe: ['FIRE', 'FIRE'], baseDamage: 25 }],
    rewardElements: ['FIRE', 'FIRE'],
    rarity: 'COMMON',
    spawnFloors: [1, 2],
  },
  {
    name: 'Earth Sprite',
    tier: 1,
    hpBase: 55, hpPerFloor: 10,
    attackBase: 8, attackPerFloor: 2,
    mana: 3,
    isEliteOrBoss: false,
    elementBias: { EARTH: 1.0 },
    spellbook: [{ name: 'Rock Toss', recipe: ['EARTH', 'EARTH'], baseDamage: 25 }],
    rewardElements: ['EARTH', 'EARTH'],
    rarity: 'COMMON',
    spawnFloors: [1, 2],
  },
  {
    name: 'Wind Wisp',
    tier: 1,
    hpBase: 45, hpPerFloor: 8,
    attackBase: 7, attackPerFloor: 2,
    mana: 3,
    isEliteOrBoss: false,
    elementBias: { AIR: 1.0 },
    spellbook: [{ name: 'Gust', recipe: ['AIR', 'AIR'], baseDamage: 22 }],
    rewardElements: ['AIR', 'AIR'],
    rarity: 'COMMON',
    spawnFloors: [1, 2],
  },
  {
    name: 'Water Pudding',
    tier: 1,
    hpBase: 50, hpPerFloor: 8,
    attackBase: 7, attackPerFloor: 2,
    mana: 3,
    isEliteOrBoss: false,
    elementBias: { WATER: 1.0 },
    spellbook: [{ name: 'Splash', recipe: ['WATER', 'WATER'], baseDamage: 22 }],
    rewardElements: ['WATER', 'WATER'],
    rarity: 'COMMON',
    spawnFloors: [1, 2],
  },

  // ── Tier 2 ────────────────────────────────────────────────────────────────
  {
    name: 'Goblin Shaman',
    tier: 2,
    hpBase: 90, hpPerFloor: 20,
    attackBase: 12, attackPerFloor: 3,
    mana: 5,
    isEliteOrBoss: false,
    elementBias: { EARTH: 0.75, FIRE: 0.25 },
    spellbook: [
      { name: 'Magma Shield', recipe: ['EARTH', 'EARTH', 'FIRE'], baseDamage: 50 },
      { name: 'Rock Toss',    recipe: ['EARTH', 'EARTH'],          baseDamage: 28 },
    ],
    rewardElements: ['EARTH', 'EARTH', 'FIRE'],
    rarity: 'RARE',
    spawnFloors: [3, 5],
  },
  {
    name: 'Skeleton Archer',
    tier: 2,
    hpBase: 80, hpPerFloor: 18,
    attackBase: 11, attackPerFloor: 3,
    mana: 4,
    isEliteOrBoss: false,
    elementBias: { AIR: 0.6, EARTH: 0.4 },
    spellbook: [
      { name: 'Arrow Storm', recipe: ['AIR', 'AIR', 'EARTH'], baseDamage: 48 },
    ],
    rewardElements: ['AIR', 'AIR', 'EARTH'],
    rarity: 'RARE',
    spawnFloors: [2, 5],
  },
  {
    name: 'Dark Knight',
    tier: 2,
    hpBase: 110, hpPerFloor: 25,
    attackBase: 15, attackPerFloor: 4,
    mana: 5,
    isEliteOrBoss: true,   // Elite — triggers Boss AI
    elementBias: { EARTH: 0.4, FIRE: 0.4, WATER: 0.1, AIR: 0.1 },
    spellbook: [
      { name: 'Dark Smite',   recipe: ['EARTH', 'FIRE', 'EARTH'], baseDamage: 60 },
      { name: 'Flame Charge', recipe: ['FIRE', 'FIRE'],            baseDamage: 30 },
    ],
    rewardElements: ['EARTH', 'FIRE', 'FIRE'],
    rarity: 'EPIC',
    spawnFloors: [4, 6],
  },

  // ── Tier 3 ────────────────────────────────────────────────────────────────
  {
    name: 'Storm Elemental',
    tier: 3,
    hpBase: 150, hpPerFloor: 35,
    attackBase: 18, attackPerFloor: 5,
    mana: 6,
    isEliteOrBoss: false,
    elementBias: { AIR: 0.4, WATER: 0.4, EARTH: 0.2 },
    spellbook: [
      { name: 'Tempest',      recipe: ['AIR', 'AIR', 'WATER', 'AIR'],  baseDamage: 85 },
      { name: 'Storm Surge',  recipe: ['AIR', 'WATER', 'AIR'],         baseDamage: 55 },
    ],
    rewardElements: ['AIR', 'AIR', 'WATER', 'WATER'],
    rarity: 'EPIC',
    spawnFloors: [5, 7],
  },
  {
    name: 'Ancient Dragon',
    tier: 3,
    hpBase: 220, hpPerFloor: 60,
    attackBase: 25, attackPerFloor: 8,
    mana: 8,
    isEliteOrBoss: true,   // Boss — triggers omniscient AI
    elementBias: { FIRE: 0.5, AIR: 0.25, EARTH: 0.15, WATER: 0.1 },
    spellbook: [
      { name: 'Inferno Breath', recipe: ['FIRE', 'FIRE', 'FIRE', 'AIR'], baseDamage: 110 },
      { name: 'Wing Gust',      recipe: ['AIR', 'AIR', 'FIRE'],          baseDamage: 65 },
      { name: 'Claw Rake',      recipe: ['EARTH', 'FIRE'],               baseDamage: 40 },
    ],
    rewardElements: ['FIRE', 'FIRE', 'FIRE', 'AIR', 'AIR'],
    rarity: 'LEGENDARY',
    spawnFloors: [7, 99],
  },
];

export function getRandomEnemy(floor: number): EnemyTemplate {
  const eligible = ENEMY_ROSTER.filter(
    (e) => floor >= e.spawnFloors[0] && floor <= e.spawnFloors[1]
  );
  const pool = eligible.length > 0 ? eligible : ENEMY_ROSTER.filter((e) => e.tier === 1);
  const roll = Math.random();
  // Prefer rarer on higher floors
  const rarePull =
    floor >= 7 ? roll > 0.5 :
    floor >= 5 ? roll > 0.65 :
    floor >= 3 ? roll > 0.75 :
    roll > 0.9;
  const rarityPool = pool.filter((e) =>
    rarePull ? (e.rarity === 'RARE' || e.rarity === 'EPIC' || e.rarity === 'LEGENDARY') : e.rarity === 'COMMON'
  );
  const chosen = (rarityPool.length > 0 ? rarityPool : pool)[
    Math.floor(Math.random() * (rarityPool.length > 0 ? rarityPool : pool).length)
  ];
  return chosen;
}

export function buildEnemyFromTemplate(template: EnemyTemplate, floor: number) {
  return {
    id: Math.random().toString(36).substr(2, 9),
    name: template.name,
    tier: template.tier,
    maxHp: template.hpBase + template.hpPerFloor * (floor - 1),
    currentHp: template.hpBase + template.hpPerFloor * (floor - 1),
    attackDamage: template.attackBase + template.attackPerFloor * (floor - 1),
    mana: template.mana,
    isEliteOrBoss: template.isEliteOrBoss,
    spellbook: template.spellbook,
    elementBias: template.elementBias,
    rewardElements: template.rewardElements,
    rewardRarity: template.rarity,
    statusEffects: [],
  };
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
        cleared: false,
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

  Object.values(grid).forEach((tile) => {
    const neighbors = getNeighbors(tile.coord);
    let count = 0;
    neighbors.forEach((n) => {
      const s = coordToString(n);
      const neighbor = grid[s];
      if (neighbor && neighbor.type !== 'SAFE' && neighbor.type !== 'WALL') {
        count++;
      }
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
        cleared: false,
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

// ── Post-Combat Spell Rewards ─────────────────────────────────────────────────
// After defeating an enemy, offer the player a choice of 3 spells to add to their library.
export function generateSpellRewardChoices(playerClass: PlayerClass, floor: number): SpellTemplate[] {
  const basicPool = BASIC_SPELLS.filter(s => s.playerClass === playerClass);
  const advancedPool = ADVANCED_SPELLS.filter(s => s.playerClass === playerClass || s.playerClass === undefined);

  // At floor 1: only basic class spells
  // At floor 2-3: basic class spells + a few advanced class/neutral spells
  // At floor 4+: full basic + advanced class/neutral spells
  const pool = floor >= 4 ? [...basicPool, ...advancedPool] :
               floor >= 2 ? [...basicPool, ...advancedPool.slice(0, 3)] :
               basicPool;
  const shuffled = shuffle([...pool]);
  return shuffled.slice(0, 3);
}
