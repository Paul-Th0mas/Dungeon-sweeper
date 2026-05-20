import { PlayerClass, LevelUpChoice, PassiveAbility } from './types';

// ── XP Thresholds ─────────────────────────────────────────────────────────────
// Index = target level. XP_THRESHOLDS[2] = XP needed to reach level 2.
export const XP_THRESHOLDS: number[] = [
  0,    // Level 1 (base — never triggered)
  100,  // → Level 2
  250,  // → Level 3
  450,  // → Level 4
  700,  // → Level 5
  1000, // → Level 6
  1350, // → Level 7
  1750, // → Level 8
  2200, // → Level 9
  2700, // → Level 10 (max)
];

export const MAX_LEVEL = XP_THRESHOLDS.length;

/** XP required to reach the NEXT level from `level`. Returns Infinity at cap. */
export function getXPToNextLevel(level: number): number {
  if (level >= MAX_LEVEL) return Infinity;
  return XP_THRESHOLDS[level]; // threshold at index = level means "reach level+1"
}

/**
 * Given accumulated XP and current level, compute the resulting level.
 * Returns the new level and whether a level-up occurred.
 */
export function calculateLevelUp(
  currentXP: number,
  currentLevel: number
): { newLevel: number; didLevelUp: boolean } {
  let level = currentLevel;
  while (level < MAX_LEVEL && currentXP >= XP_THRESHOLDS[level]) {
    level++;
  }
  return { newLevel: level, didLevelUp: level > currentLevel };
}

/** Server-side reward calculation — never exposed to client before resolution. */
export function getEnemyRewards(
  floor: number,
  rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'
): { xp: number; gold: number } {
  const rarityMult: Record<string, number> = {
    COMMON: 1,
    RARE: 1.5,
    EPIC: 2.5,
    LEGENDARY: 4,
  };
  const mult = rarityMult[rarity] ?? 1;
  return {
    xp: Math.floor((20 + floor * 10) * mult),
    gold: Math.floor((10 + floor * 5) * mult) + Math.floor(Math.random() * 10),
  };
}

// ── Level-up choice pools per class ──────────────────────────────────────────
const POOLS: Record<PlayerClass, LevelUpChoice[]> = {
  BERSERKER: [
    { passive: 'RAGE_BONUS',   name: 'Berserker Rage',  description: 'FIRE spells deal +25% damage.',           icon: '🔥' },
    { passive: 'BLOODLUST',    name: 'Bloodlust',        description: 'Heal 5 HP every time you kill an enemy.', icon: '🩸' },
    { passive: 'TITANS_GRIP',  name: "Titan's Grip",     description: 'Combat hand size +1 card.',               icon: '✊' },
    { passive: 'IRON_SKIN',    name: 'Iron Skin',         description: 'Max HP +20.',                             icon: '🛡️' },
    { passive: 'BATTLE_FURY',  name: 'Battle Fury',       description: '+1 hand attempt per combat.',             icon: '⚔️' },
  ],
  PALADIN: [
    { passive: 'DIVINE_SHIELD', name: 'Divine Shield',  description: 'Block the first 10 damage each combat.',  icon: '✨' },
    { passive: 'HOLY_SMITE',   name: 'Holy Smite',      description: 'WATER Freeze effects last +1 extra turn.',  icon: '❄️' },
    { passive: 'BLESSING',     name: 'Blessing',         description: 'Heal 10% max HP when entering a new floor.', icon: '💚' },
    { passive: 'IRON_SKIN',    name: 'Iron Skin',         description: 'Max HP +20.',                             icon: '🛡️' },
    { passive: 'SACRED_GROUND', name: 'Sacred Ground',  description: 'Each WATER card played heals you for 3 HP.', icon: '🌊' },
  ],
  WIZARD: [
    { passive: 'ARCANE_MASTERY', name: 'Arcane Mastery', description: 'AIR multipliers stack ×1.5.',    icon: '⚡' },
    { passive: 'OVERLOAD',     name: 'Overload',          description: '+1 hand attempt per combat.',             icon: '💥' },
    { passive: 'MANA_SURGE',   name: 'Mana Surge',        description: 'Every 3rd hand played deals double damage.', icon: '🌀' },
    { passive: 'IRON_SKIN',    name: 'Iron Skin',         description: 'Max HP +20.',                             icon: '🛡️' },
    { passive: 'LEYLINE',      name: 'Leyline',           description: 'Draw 1 extra card at the start of combat.', icon: '🔮' },
  ],
  OVERSEER: [
    { passive: 'SHADOW_STEP',     name: 'Shadow Step',      description: '20% chance to dodge enemy attack.',    icon: '👁️' },
    { passive: 'EXPLOIT_WEAKNESS', name: 'Exploit Weakness', description: 'EARTH draws also grant +5 gold.',       icon: '💨' },
    { passive: 'TACTICAL_INSIGHT', name: 'Tactical Insight', description: '+1 discard per combat.',               icon: '🧠' },
    { passive: 'IRON_SKIN',       name: 'Iron Skin',         description: 'Max HP +20.',                          icon: '🛡️' },
    { passive: 'CALCULATED_RISK', name: 'Calculated Risk',   description: 'Win at <50% HP → earn double gold.',   icon: '🎲' },
  ],
};

/**
 * Pick 3 unique level-up choices for the player's class,
 * filtering out passives they already have.
 */
export function pickLevelUpChoices(
  playerClass: PlayerClass,
  existingPassives: string[]
): LevelUpChoice[] {
  const pool = POOLS[playerClass].filter(
    (c) => !existingPassives.includes(c.passive)
  );
  const shuffled = pool.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(3, shuffled.length));
}

/** Apply stat changes when a passive is chosen. Returns delta to apply. */
export function applyPassiveStat(
  passive: PassiveAbility
): { maxHpDelta: number; handSizeDelta: number; handsDelta: number; discardsDelta: number } {
  const none = { maxHpDelta: 0, handSizeDelta: 0, handsDelta: 0, discardsDelta: 0 };
  if (passive === 'IRON_SKIN')       return { ...none, maxHpDelta: 20 };
  if (passive === 'TITANS_GRIP')     return { ...none, handSizeDelta: 1 };
  if (passive === 'LEYLINE')         return { ...none, handSizeDelta: 1 };
  if (passive === 'BATTLE_FURY')     return { ...none, handsDelta: 1 };
  if (passive === 'OVERLOAD')        return { ...none, handsDelta: 1 };
  if (passive === 'TACTICAL_INSIGHT') return { ...none, discardsDelta: 1 };
  return none;
}
