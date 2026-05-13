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
  | 'LEVELUP';

// Elemental system replacing traditional suits
export type CardElement = 'FIRE' | 'ICE' | 'ELECTRICITY' | 'WIND';
export type CardRank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;

export interface Card {
  id: string;
  element: CardElement;
  rank: CardRank;
  isUpgraded?: boolean;
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

// ── Spell / Hand Results ────────────────────────────────────────────────────
export type HandRank =
  | 'HIGH_CARD'
  | 'PAIR'
  | 'TWO_PAIR'
  | 'THREE_OF_A_KIND'
  | 'STRAIGHT'
  | 'FLUSH'
  | 'FULL_HOUSE'
  | 'FOUR_OF_A_KIND'
  | 'STRAIGHT_FLUSH';

export interface SpellResult {
  spellName: string;
  handRank: HandRank;
  damage: number;
  multiplier: number;
  baseDamage: number;
  newStatusEffects: StatusEffect[];
  extraDraws: number;
  extraDiscards: number;
  description: string;
  dominantElement: CardElement | 'HYBRID';
}

// ── Enemy ────────────────────────────────────────────────────────────────────
export interface Enemy {
  id: string;
  name: string;
  maxHp: number;
  currentHp: number;
  handsAllowed: number;
  discardsAllowed: number;
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
  selectedCards: Card[];
  discardsRemaining: number;
  handsRemaining: number;
  lastSpell: SpellResult | null;
}
