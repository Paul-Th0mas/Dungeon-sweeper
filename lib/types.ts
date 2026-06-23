export type AxialCoord = { q: number; r: number };

export type TileType = 'SAFE' | 'ENEMY' | 'KEY' | 'EXIT' | 'WALL' | 'SHOP' | 'REST' | 'TREASURE' | 'EVENT';

export type Biome = 'SIROCCO' | 'SEPULCHER' | 'VOID_SCAUR';

export interface Tile {
  coord: AxialCoord;
  type: TileType;
  revealed: boolean;
  dangerNumber: number;
  hasItem?: boolean;
  cleared: boolean;
  isMirage?: boolean;
  calcifiedHits?: number;
}

export type GamePhase =
  | 'DASHBOARD'
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
  | 'FLOOR_END'
  | 'SPELL_REWARD';

// ── Elements ────────────────────────────────────────────────────────────────
export type CardElement = 'FIRE' | 'WATER' | 'AIR' | 'EARTH' | 'VOID';

// ── Spells ──────────────────────────────────────────────────────────────────
// A Spell has an ordered recipe of elements. When all recipe elements appear
// in-order as a contiguous subsequence in the player's submitted sequence,
// the spell triggers, dealing baseDamage to the enemy.
export interface Spell {
  id: string;
  name: string;
  recipe: CardElement[];   // e.g. ['FIRE', 'FIRE', 'AIR']
  baseDamage: number;
  statusEffect?: SpellStatusEffect; // optional on-trigger status
  isAdvanced: boolean;
  isUpgraded: boolean;     // upgrade at Rest Room: +25% baseDamage
  equipped: boolean;       // true = in active 4-slot loadout
  location: 'LIBRARY' | 'LOADOUT' | 'SHOP';
}

// ── Spell Rewards ────────────────────────────────────────────────────────────
export interface SpellRewardChoice {
  name: string;
  recipe: CardElement[];
  baseDamage: number;
  isAdvanced: boolean;
}

// ── Status Effects ───────────────────────────────────────────────────────────
export interface StatusEffect {
  type: 'BURN' | 'FREEZE' | 'CHAIN' | 'PUSH';
  value: number;
  turnsRemaining: number;
  label: string;
}

// Spell-applied status effects (simplified — triggered on spell hit)
export interface SpellStatusEffect {
  type: 'BURN' | 'FREEZE' | 'CHAIN' | 'PUSH';
  value: number;
  turns: number;
}

// ── Spare Elements ───────────────────────────────────────────────────────────
// Player's consumable element inventory earned by defeating enemies.
export type SpareElements = {
  FIRE: number;
  WATER: number;
  AIR: number;
  EARTH: number;
};

// ── Enemy Spellbook Entry (visible to player) ─────────────────────────────────
export interface EnemySpell {
  name: string;
  recipe: CardElement[];
  baseDamage: number;
}

// ── Enemy ─────────────────────────────────────────────────────────────────────
export type EnemyTier = 1 | 2 | 3;

export interface Enemy {
  id: string;
  name: string;
  tier: EnemyTier;
  maxHp: number;
  currentHp: number;
  attackDamage: number;  // damage per uncountered slot
  mana: number;          // enemy queue length (immutable)
  isEliteOrBoss: boolean;
  spellbook: EnemySpell[];           // fully visible to player
  elementBias: Partial<Record<CardElement, number>>;
  rewardElements: CardElement[];     // spare element drops on defeat
  rewardRarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
  statusEffects: StatusEffect[];
}

// ── Clash Result ─────────────────────────────────────────────────────────────
export interface TriggeredSpell {
  name: string;
  damage: number;
  enemyHpAfter: number;
  startIndex: number;   // index in player sequence where recipe matched
  isCombo?: boolean;
  comboCount?: number;
  recipeLength?: number;
}

export interface SlotResult {
  playerElement: CardElement | null;
  enemyElement: CardElement | null;
  result: 'COUNTER' | 'COUNTERED' | 'NEUTRAL' | 'EMPTY';
  damageToPlayer: number;
}

export interface ClashResult {
  slots: SlotResult[];
  triggeredSpells: TriggeredSpell[];
  totalEnemyDamage: number;     // damage dealt to enemy from spells
  totalPlayerDamage: number;    // damage dealt to player from uncountered slots
  enemyDamageNegated: boolean;  // true if 40% counter threshold was met
  counterPercent: number;       // percentage of slots the player countered
  newStatusEffects: StatusEffect[];
  description: string;
  enemyHpAtStart: number;
  focusAbilityUsed?: boolean;
  playerClass?: PlayerClass;
  basicStrikeDamage: number;    // raw damage from unmatched (non-spell) elements
  staleTurns: number;           // consecutive turns with 0 enemy damage (for escalation display)
}

// ── Player & Classes ──────────────────────────────────────────────────────────
export type PlayerClass = 'BERSERKER' | 'PALADIN' | 'WIZARD' | 'OVERSEER';

export type PassiveAbility =
  // Berserker
  | 'RAGE_BONUS'        // FIRE spells +25% dmg
  | 'BLOODLUST'         // Heal 5 HP on kill
  | 'TITANS_GRIP'       // Start combat with 1 free FIRE Spare Element
  | 'IRON_SKIN'         // Max HP +20
  | 'BATTLE_FURY'       // Once per combat: re-roll element pool
  // Paladin
  | 'DIVINE_SHIELD'     // First uncountered enemy slot is negated each round
  | 'HOLY_SMITE'        // FREEZE lasts +1 turn
  | 'BLESSING'          // Heal 10% max HP at floor start
  | 'SACRED_GROUND'     // Start combat with 1 free WATER Spare Element
  // Wizard
  | 'ARCANE_MASTERY'    // AIR spell damage ×1.5
  | 'OVERLOAD'          // Once per combat: re-roll element pool
  | 'MANA_SURGE'        // Every 3rd turn: +1 temporary mana slot
  | 'LEYLINE'           // Start combat with 1 free AIR Spare Element
  // Overseer
  | 'SHADOW_STEP'       // 20% chance to dodge all enemy damage per round
  | 'EXPLOIT_WEAKNESS'  // EARTH counter reveals 1 extra enemy slot
  | 'TACTICAL_INSIGHT'  // Once per combat: re-roll element pool
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
  spells: Spell[];       // all owned spells (equipped + library)
  spareElements: SpareElements;
  inventory: unknown[];
  position: AxialCoord;
  torchRadius: number;
  floor: number;
  hasKey: boolean;
  xp: number;
  level: number;
  xpToNextLevel: number;
  playerMana: number;    // current queue capacity (4–8)
}

// ── Combat State ──────────────────────────────────────────────────────────────
export interface CombatState {
  enemy: Enemy | null;
  // The player's active element pool for this turn:
  // base pool (from equipped spells) + any injected Spare Elements
  activePool: CardElement[];
  // Spare elements still in inventory (not yet injected)
  spareElements: SpareElements;
  // Player's current sequence (elements moved from pool to board slots)
  playerSequence: (CardElement | null)[];
  // Enemy's hidden queue (unknown until post-clash reveal)
  enemyQueue: CardElement[];
  // Board length = player's mana
  boardLength: number;
  lastClash: ClashResult | null;
  // Whether the player has used their pool re-roll charge this combat
  rerollUsed: boolean;
  focusPips: number;
  focusAbilityUsed: boolean;
  activeOmen: string | null;
  enemyQueueRevealed: boolean;
  sandBlindnessActive?: boolean;
}
