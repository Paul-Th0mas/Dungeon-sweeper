import { PlayerClass, LevelUpChoice, PassiveAbility } from '../types';

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
    { passive: 'RAGE_BONUS',   name: 'Berserker Rage',  description: 'FIRE spells deal +25% damage.',                              icon: '🔥' },
    { passive: 'BLOODLUST',    name: 'Bloodlust',        description: 'Heal 5 HP every time you kill an enemy.',                    icon: '🩸' },
    { passive: 'TITANS_GRIP',  name: "Titan's Grip",     description: 'Start each combat with 1 free FIRE Spare Element.',           icon: '✊' },
    { passive: 'IRON_SKIN',    name: 'Iron Skin',         description: 'Max HP +20.',                                                icon: '🛡️' },
    { passive: 'BATTLE_FURY',  name: 'Battle Fury',       description: 'Once per combat: re-roll your element pool (pass turn).',    icon: '⚔️' },
  ],
  PALADIN: [
    { passive: 'DIVINE_SHIELD', name: 'Divine Shield',  description: 'Negate damage from the first uncountered enemy slot each round.', icon: '✨' },
    { passive: 'HOLY_SMITE',   name: 'Holy Smite',      description: 'FREEZE effects applied to enemies last +1 extra turn.',          icon: '❄️' },
    { passive: 'BLESSING',     name: 'Blessing',         description: 'Heal 10% max HP when entering a new floor.',                    icon: '💚' },
    { passive: 'IRON_SKIN',    name: 'Iron Skin',         description: 'Max HP +20.',                                                   icon: '🛡️' },
    { passive: 'SACRED_GROUND', name: 'Sacred Ground',  description: 'Start each combat with 1 free WATER Spare Element.',            icon: '🌊' },
  ],
  WIZARD: [
    { passive: 'ARCANE_MASTERY', name: 'Arcane Mastery', description: 'AIR spell damage ×1.5.',                                   icon: '⚡' },
    { passive: 'OVERLOAD',     name: 'Overload',          description: 'Once per combat: re-roll your element pool.',                icon: '💥' },
    { passive: 'MANA_SURGE',   name: 'Mana Surge',        description: 'Every 3rd combat turn: gain +1 temporary mana slot.',       icon: '🌀' },
    { passive: 'IRON_SKIN',    name: 'Iron Skin',         description: 'Max HP +20.',                                               icon: '🛡️' },
    { passive: 'LEYLINE',      name: 'Leyline',           description: 'Start each combat with 1 free AIR Spare Element.',          icon: '🔮' },
  ],
  OVERSEER: [
    { passive: 'SHADOW_STEP',     name: 'Shadow Step',       description: '20% chance to dodge all enemy damage for a round.',         icon: '👁️' },
    { passive: 'EXPLOIT_WEAKNESS', name: 'Exploit Weakness',  description: 'EARTH counter-slots reveal 1 extra hidden enemy element.',   icon: '💨' },
    { passive: 'TACTICAL_INSIGHT', name: 'Tactical Insight',  description: 'Once per combat: re-roll your element pool.',               icon: '🧠' },
    { passive: 'IRON_SKIN',       name: 'Iron Skin',          description: 'Max HP +20.',                                              icon: '🛡️' },
    { passive: 'CALCULATED_RISK', name: 'Calculated Risk',    description: 'Win a combat at <50% HP → earn double gold.',             icon: '🎲' },
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
): { maxHpDelta: number } {
  if (passive === 'IRON_SKIN') return { maxHpDelta: 20 };
  return { maxHpDelta: 0 };
}
