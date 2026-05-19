export type AxialCoord = { q: number; r: number };

export type TileType = 'SAFE' | 'ENEMY' | 'KEY' | 'EXIT' | 'WALL' | 'SHOP' | 'REST' | 'TREASURE' | 'EVENT';

export interface Tile {
  coord: AxialCoord;
  type: TileType;
  revealed: boolean;
  dangerNumber: number;
  hasItem?: boolean;
}

export type GamePhase =
  | 'EXPLORING'
  | 'COMBAT'
  | 'GAMEOVER'
  | 'WIN'
  | 'SHOP'
  | 'REST'
  | 'EVENT'
  | 'TREASURE'
  | 'LEVELUP'
  | 'START_SCREEN'
  | 'FLOOR_END';

// Elemental system replacing traditional suits
export type CardElement = 'FIRE' | 'ICE' | 'ELECTRICITY' | 'WIND';
// Rank 0 = Ash (broken card), 2–14 = normal play ranks
export type CardRank = number;

export interface Card {
  id: string;
  element: CardElement;
  rank: CardRank;
  isUpgraded?: boolean;
  isAsh?: boolean;           // true when all uses are spent — clogs the hand
  isExhaust?: boolean;       // if true, removed from deck after one use
  currentUses?: number;      // remaining uses before breaking
  maxUses?: number;          // max uses (repaired at Rest Room)
  specialModifier?: Record<string, unknown>;
  location?: string;
}

// ── Status Effects ──────────────────────────────────────────────────────────
export interface StatusEffect {
  type: 'BURN' | 'FREEZE' | 'CHAIN' | 'PUSH';
  value: number;         // damage per tick for BURN; turns skipped for FREEZE; bonus multiplier for CHAIN
  turnsRemaining: number;
  label: string;
}

export interface FrameData {
  playerCard: Card | null;
  enemyElement: CardElement | null;
  result: 'WIN' | 'LOSE' | 'TIE' | 'NEUTRAL' | 'NONE';
  damageToEnemy: number;
  damageToPlayer: number;
  enemyHpAfter: number;
}

export interface ClashResult {
  frames: FrameData[];
  spellsTriggered: string[];
  totalEnemyDamage: number;
  totalPlayerDamage: number;
  newStatusEffects: StatusEffect[];
  description: string;
  enemyHpAtStart: number;
}

// ── Enemy ────────────────────────────────────────────────────────────────────
export interface Enemy {
  id: string;
  name: string;
  maxHp: number;
  currentHp: number;
  attackDamage: number;
  rewardRarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
  statusEffects: StatusEffect[];
}

// ── Player & Classes ─────────────────────────────────────────────────────────
export type PlayerClass = 'BERSERKER' | 'PALADIN' | 'WIZARD' | 'OVERSEER';

export type PassiveAbility =
  // Berserker
  | 'RAGE_BONUS'        // FIRE spells +25% dmg
  | 'BLOODLUST'         // Heal 5 HP on kill
  | 'TITANS_GRIP'       // Hand size +1
  | 'IRON_SKIN'         // Max HP +20
  | 'BATTLE_FURY'       // +1 hand per combat
  // Paladin
  | 'DIVINE_SHIELD'     // Block first 10 dmg per combat
  | 'HOLY_SMITE'        // Freeze lasts +1 turn
  | 'BLESSING'          // Heal 10% max HP at floor start
  | 'SACRED_GROUND'     // ICE cards heal 3 HP each
  // Wizard
  | 'ARCANE_MASTERY'    // ELECTRICITY multipliers ×1.5
  | 'OVERLOAD'          // +1 hand per combat
  | 'MANA_SURGE'        // Every 3rd hand: double dmg
  | 'LEYLINE'           // Draw 1 extra at combat start
  // Overseer
  | 'SHADOW_STEP'       // 20% chance to dodge enemy attack
  | 'EXPLOIT_WEAKNESS'  // WIND draw also grants +5g
  | 'TACTICAL_INSIGHT'  // +1 discard per combat
  | 'CALCULATED_RISK';  // Win at <50% HP → double gold

export interface LevelUpChoice {
  passive: PassiveAbility;
  name: string;
  description: string;
  icon: string;
}

export interface Player {
  maxHp: number;
  currentHp: number;
  gold: number;
  class: PlayerClass;
  relics: string[];
  passives: string[];
  deck: Card[];
  inventory: unknown[];
  position: AxialCoord;
  torchRadius: number;
  floor: number;
  hasKey: boolean;
  xp: number;
  level: number;
  xpToNextLevel: number;
  baseHandSize: number;
}

export interface CombatState {
  enemy: Enemy | null;
  hand: Card[];
  playerQueue: Card[];
  enemyQueue: CardElement[];
  enemyQueueRevealed: boolean;
  queueSlots: number;
  maxVigor: number;
  currentVigor: number;
  lastClash: ClashResult | null;
}
