/**
 * Elemental Combat Engine
 * Evaluates a submitted hand of cards, detects the poker hand rank,
 * determines the dominant element(s), applies class-specific bonuses,
 * and returns a fully-resolved SpellResult with status effects.
 */
import { Card, CardElement, HandRank, PlayerClass, SpellResult, StatusEffect, PassiveAbility } from './types';
import { countBy, sortBy, uniq } from 'lodash';

// ── Hand Detection ────────────────────────────────────────────────────────────

function isConsecutive(ranks: number[]): boolean {
  const u = uniq(ranks);
  if (u.length < 5) return false;
  for (let i = 0; i < u.length - 1; i++) {
    if (u[i + 1] !== u[i] + 1) {
      if (i === 3 && u[i] === 5 && u[4] === 14) return true; // Ace-low
      return false;
    }
  }
  return true;
}

function detectHandRank(cards: Card[]): HandRank {
  const ranks = sortBy(cards.map((c) => c.rank));
  const elements = cards.map((c) => c.element);
  const rankCounts = Object.values(countBy(ranks)).sort((a, b) => b - a);
  const isFlush = uniq(elements).length === 1 && cards.length >= 5;
  const isStraight = isConsecutive(ranks) && cards.length >= 5;

  if (isFlush && isStraight) return 'STRAIGHT_FLUSH';
  if (rankCounts[0] === 4)   return 'FOUR_OF_A_KIND';
  if (rankCounts[0] === 3 && rankCounts[1] === 2) return 'FULL_HOUSE';
  if (isFlush)               return 'FLUSH';
  if (isStraight)            return 'STRAIGHT';
  if (rankCounts[0] === 3)   return 'THREE_OF_A_KIND';
  if (rankCounts[0] === 2 && rankCounts[1] === 2) return 'TWO_PAIR';
  if (rankCounts[0] === 2)   return 'PAIR';
  return 'HIGH_CARD';
}

/** Returns the dominant element and whether it's a hybrid (2 elements tied). */
function getDominantElement(cards: Card[]): { dominant: CardElement; secondary: CardElement | null; isHybrid: boolean } {
  const counts = countBy(cards.map((c) => c.element)) as Record<CardElement, number>;
  const sorted = (Object.entries(counts) as [CardElement, number][]).sort((a, b) => b[1] - a[1]);
  const dominant = sorted[0][0];
  const secondary = sorted.length > 1 ? sorted[1][0] : null;
  const isHybrid = sorted.length >= 2 && sorted[1][1] >= 2; // meaningful second element
  return { dominant, secondary, isHybrid };
}

// ── Base damage table per hand rank ──────────────────────────────────────────
const BASE_DAMAGE: Record<HandRank, number> = {
  HIGH_CARD:       8,
  PAIR:           20,
  TWO_PAIR:       30,
  THREE_OF_A_KIND: 45,
  STRAIGHT:       60,
  FLUSH:          75,
  FULL_HOUSE:     95,
  FOUR_OF_A_KIND: 120,
  STRAIGHT_FLUSH: 160,
};

const MULTIPLIERS: Record<HandRank, number> = {
  HIGH_CARD:       1,
  PAIR:            1.5,
  TWO_PAIR:        2,
  THREE_OF_A_KIND: 2.5,
  STRAIGHT:        3,
  FLUSH:           3.5,
  FULL_HOUSE:      4,
  FOUR_OF_A_KIND:  5,
  STRAIGHT_FLUSH:  8,
};

// ── Status effect builders ────────────────────────────────────────────────────
function burn(dmgPerTurn: number, turns: number): StatusEffect {
  return { type: 'BURN', value: dmgPerTurn, turnsRemaining: turns, label: `Burn (${dmgPerTurn}/turn × ${turns})` };
}
function freeze(turns: number): StatusEffect {
  return { type: 'FREEZE', value: 0, turnsRemaining: turns, label: `Frozen (${turns} turns)` };
}
function chain(bonusMult: number): StatusEffect {
  return { type: 'CHAIN', value: bonusMult, turnsRemaining: 1, label: `Chain ×${bonusMult}` };
}
function push(turns: number): StatusEffect {
  return { type: 'PUSH', value: 0, turnsRemaining: turns, label: `Pushed (${turns} turns)` };
}

// ── Elemental spell lookup: single-element ─────────────────────────────────────
interface SpellTemplate {
  name: string;
  damageBonus: number;        // flat addition on top of base
  damageMultBonus: number;    // multiplicative on base*mult
  effects: StatusEffect[];
  extraDraws: number;
  extraDiscards: number;
  description: string;
}

const FIRE_SPELLS: Record<HandRank, SpellTemplate> = {
  HIGH_CARD:       { name: 'Ember',          damageBonus: 0,   damageMultBonus: 1.0,  effects: [],                  extraDraws: 0, extraDiscards: 0, description: 'A weak flame. Deals base damage.' },
  PAIR:            { name: 'Ember Strike',   damageBonus: 5,   damageMultBonus: 1.0,  effects: [burn(5, 2)],        extraDraws: 0, extraDiscards: 0, description: 'Scorches the target. Applies Burn for 2 turns.' },
  TWO_PAIR:        { name: 'Flame Lance',    damageBonus: 10,  damageMultBonus: 1.1,  effects: [burn(8, 2)],        extraDraws: 0, extraDiscards: 0, description: 'Two jets of flame. Burn stacks.' },
  THREE_OF_A_KIND: { name: 'Fireball',       damageBonus: 15,  damageMultBonus: 1.2,  effects: [burn(10, 3)],       extraDraws: 0, extraDiscards: 0, description: 'Classic fireball. Burn for 3 turns.' },
  STRAIGHT:        { name: 'Magma Surge',    damageBonus: 20,  damageMultBonus: 1.3,  effects: [burn(12, 3)],       extraDraws: 0, extraDiscards: 0, description: 'A wave of lava. Heavy burn.' },
  FLUSH:           { name: 'Inferno',         damageBonus: 25,  damageMultBonus: 1.5,  effects: [burn(15, 3)],       extraDraws: 0, extraDiscards: 0, description: 'The ground burns. Massive DoT.' },
  FULL_HOUSE:      { name: 'Firestorm',      damageBonus: 40,  damageMultBonus: 1.6,  effects: [burn(20, 4)],       extraDraws: 0, extraDiscards: 0, description: 'A self-sustaining storm of fire. Extreme burn.' },
  FOUR_OF_A_KIND:  { name: 'Solar Flare',    damageBonus: 60,  damageMultBonus: 1.8,  effects: [burn(25, 4)],       extraDraws: 0, extraDiscards: 0, description: 'Scorching solar energy. Burn is catastrophic.' },
  STRAIGHT_FLUSH:  { name: 'Ragnarök',       damageBonus: 100, damageMultBonus: 2.0,  effects: [burn(30, 5)],       extraDraws: 0, extraDiscards: 0, description: 'The world ends in fire.' },
};

const ICE_SPELLS: Record<HandRank, SpellTemplate> = {
  HIGH_CARD:       { name: 'Frost Chip',     damageBonus: 0,   damageMultBonus: 1.0,  effects: [],                  extraDraws: 0, extraDiscards: 0, description: 'A sliver of cold.' },
  PAIR:            { name: 'Frost Shard',    damageBonus: 0,   damageMultBonus: 1.0,  effects: [freeze(1)],         extraDraws: 0, extraDiscards: 0, description: 'Freezes the enemy for 1 turn — they skip their attack.' },
  TWO_PAIR:        { name: 'Ice Lance',      damageBonus: 5,   damageMultBonus: 1.1,  effects: [freeze(1)],         extraDraws: 0, extraDiscards: 0, description: 'Piercing ice. Freeze 1 turn.' },
  THREE_OF_A_KIND: { name: 'Glacial Spike',  damageBonus: 10,  damageMultBonus: 1.2,  effects: [freeze(2)],         extraDraws: 0, extraDiscards: 0, description: 'Impales with ice. Freeze 2 turns.' },
  STRAIGHT:        { name: 'Frozen Path',    damageBonus: 15,  damageMultBonus: 1.25, effects: [freeze(2)],         extraDraws: 0, extraDiscards: 0, description: 'The ground freezes. Enemy halted.' },
  FLUSH:           { name: 'Blizzard',       damageBonus: 20,  damageMultBonus: 1.4,  effects: [freeze(2)],         extraDraws: 0, extraDiscards: 0, description: 'A wall of ice. Long freeze.' },
  FULL_HOUSE:      { name: 'Absolute Zero',  damageBonus: 35,  damageMultBonus: 1.5,  effects: [freeze(3)],         extraDraws: 0, extraDiscards: 0, description: 'Stops the enemy cold for 3 turns.' },
  FOUR_OF_A_KIND:  { name: 'Permafrost',     damageBonus: 50,  damageMultBonus: 1.6,  effects: [freeze(4)],         extraDraws: 0, extraDiscards: 0, description: 'Permanent winter. Enemy locked for 4 turns.' },
  STRAIGHT_FLUSH:  { name: 'Glacial Epoch',  damageBonus: 80,  damageMultBonus: 1.8,  effects: [freeze(5)],         extraDraws: 0, extraDiscards: 0, description: 'An age of ice descends.' },
};

const ELECTRICITY_SPELLS: Record<HandRank, SpellTemplate> = {
  HIGH_CARD:       { name: 'Static Spark',   damageBonus: 0,   damageMultBonus: 1.0,  effects: [],                  extraDraws: 0, extraDiscards: 0, description: 'Minor static.' },
  PAIR:            { name: 'Static Shock',   damageBonus: 5,   damageMultBonus: 1.0,  effects: [chain(0.3)],        extraDraws: 0, extraDiscards: 0, description: 'Shocks the target. Next hand +×0.3 chain bonus.' },
  TWO_PAIR:        { name: 'Volt Strike',    damageBonus: 10,  damageMultBonus: 1.15, effects: [chain(0.5)],        extraDraws: 0, extraDiscards: 0, description: 'Charged strike. Chain bonus builds.' },
  THREE_OF_A_KIND: { name: 'Arc Flash',      damageBonus: 15,  damageMultBonus: 1.2,  effects: [chain(0.7)],        extraDraws: 0, extraDiscards: 0, description: 'A dangerous arc. Chain ×0.7.' },
  STRAIGHT:        { name: 'Thunderclap',    damageBonus: 20,  damageMultBonus: 1.3,  effects: [chain(1.0)],        extraDraws: 0, extraDiscards: 0, description: 'Booming thunder. Chain doubles next hand.' },
  FLUSH:           { name: 'Chain Lightning', damageBonus: 30, damageMultBonus: 1.5,  effects: [chain(1.5)],        extraDraws: 0, extraDiscards: 0, description: 'Bounces between targets. Chain ×1.5.' },
  FULL_HOUSE:      { name: 'Thunderstorm',   damageBonus: 50,  damageMultBonus: 1.6,  effects: [chain(2.0)],        extraDraws: 0, extraDiscards: 0, description: 'A relentless storm. Massive chain bonus.' },
  FOUR_OF_A_KIND:  { name: 'Ball Lightning', damageBonus: 70,  damageMultBonus: 1.8,  effects: [chain(2.5)],        extraDraws: 0, extraDiscards: 0, description: 'Rolls through the enemy. Exponential chain.' },
  STRAIGHT_FLUSH:  { name: 'Judgment Bolt',  damageBonus: 110, damageMultBonus: 2.2,  effects: [chain(3.0)],        extraDraws: 0, extraDiscards: 0, description: 'The sky itself strikes down.' },
};

const WIND_SPELLS: Record<HandRank, SpellTemplate> = {
  HIGH_CARD:       { name: 'Breeze',         damageBonus: 0,   damageMultBonus: 1.0,  effects: [],                  extraDraws: 1, extraDiscards: 0, description: 'A gentle wind. Draw 1 extra card.' },
  PAIR:            { name: 'Gust',           damageBonus: 0,   damageMultBonus: 0.9,  effects: [push(1)],           extraDraws: 2, extraDiscards: 0, description: 'Pushes the enemy back. Draw 2. Enemy delayed.' },
  TWO_PAIR:        { name: 'Tailwind',       damageBonus: 0,   damageMultBonus: 1.0,  effects: [],                  extraDraws: 2, extraDiscards: 1, description: 'Favorable winds. Draw 2, gain a discard.' },
  THREE_OF_A_KIND: { name: 'Whirlwind',      damageBonus: 10,  damageMultBonus: 1.1,  effects: [push(1)],           extraDraws: 2, extraDiscards: 1, description: 'Spins the enemy and fuels your hand.' },
  STRAIGHT:        { name: 'Sirocco',        damageBonus: 15,  damageMultBonus: 1.2,  effects: [push(1)],           extraDraws: 3, extraDiscards: 1, description: 'Scorching desert wind. Push + major draws.' },
  FLUSH:           { name: 'Cyclone',        damageBonus: 20,  damageMultBonus: 1.3,  effects: [push(2)],           extraDraws: 3, extraDiscards: 2, description: 'Engulfs the enemy. Big push and redraw.' },
  FULL_HOUSE:      { name: 'Tempest',        damageBonus: 35,  damageMultBonus: 1.4,  effects: [push(2)],           extraDraws: 4, extraDiscards: 2, description: 'An endless storm. Push 2 turns + full redraw.' },
  FOUR_OF_A_KIND:  { name: 'Hurricane',      damageBonus: 50,  damageMultBonus: 1.5,  effects: [push(3)],           extraDraws: 5, extraDiscards: 2, description: 'Category 5. Massive push and engine.' },
  STRAIGHT_FLUSH:  { name: 'Eye of the Storm', damageBonus: 80, damageMultBonus: 1.7, effects: [push(3)],           extraDraws: 6, extraDiscards: 3, description: 'Calm inside chaos. Ultimate draw engine.' },
};

const ELEMENT_SPELLS: Record<CardElement, Record<HandRank, SpellTemplate>> = {
  FIRE:        FIRE_SPELLS,
  ICE:         ICE_SPELLS,
  ELECTRICITY: ELECTRICITY_SPELLS,
  WIND:        WIND_SPELLS,
};

// ── Hybrid Spell Overrides ────────────────────────────────────────────────────
// Applied at FULL_HOUSE+ when two elements are strongly represented.
type HybridKey = `${CardElement}+${CardElement}`;

const HYBRID_TEMPLATES: Partial<Record<HybridKey, Partial<SpellTemplate>>> = {
  'FIRE+WIND': {
    name: 'Firestorm Gale',
    damageMultBonus: 1.9,
    effects: [burn(25, 4), push(1)],
    description: 'Wind fans the flames — catastrophic burn with a push.',
  },
  'WIND+FIRE': {
    name: 'Firestorm Gale',
    damageMultBonus: 1.9,
    effects: [burn(25, 4), push(1)],
    description: 'Wind fans the flames — catastrophic burn with a push.',
  },
  'ICE+WIND': {
    name: 'Arctic Gale',
    damageMultBonus: 1.7,
    effects: [freeze(3), push(2)],
    description: 'Freezing winds push and lock the enemy.',
  },
  'WIND+ICE': {
    name: 'Arctic Gale',
    damageMultBonus: 1.7,
    effects: [freeze(3), push(2)],
    description: 'Freezing winds push and lock the enemy.',
  },
  'FIRE+ICE': {
    name: 'Steam Burst',
    damageBonus: 30,
    damageMultBonus: 1.6,
    effects: [burn(10, 2), freeze(1)],
    description: 'Superheated steam scalds and stuns.',
  },
  'ICE+FIRE': {
    name: 'Steam Burst',
    damageBonus: 30,
    damageMultBonus: 1.6,
    effects: [burn(10, 2), freeze(1)],
    description: 'Superheated steam scalds and stuns.',
  },
  'ELECTRICITY+WIND': {
    name: 'Storm Call',
    damageBonus: 25,
    damageMultBonus: 2.0,
    effects: [chain(1.5), push(1)],
    extraDraws: 2,
    description: 'Lightning-charged winds. Chain bonus + draw.',
  },
  'WIND+ELECTRICITY': {
    name: 'Storm Call',
    damageBonus: 25,
    damageMultBonus: 2.0,
    effects: [chain(1.5), push(1)],
    extraDraws: 2,
    description: 'Lightning-charged winds. Chain bonus + draw.',
  },
  'FIRE+ELECTRICITY': {
    name: 'Plasma Burst',
    damageBonus: 40,
    damageMultBonus: 1.8,
    effects: [burn(12, 3), chain(1.0)],
    description: 'Supercharged plasma. Burn + chain.',
  },
  'ELECTRICITY+FIRE': {
    name: 'Plasma Burst',
    damageBonus: 40,
    damageMultBonus: 1.8,
    effects: [burn(12, 3), chain(1.0)],
    description: 'Supercharged plasma. Burn + chain.',
  },
  'ICE+ELECTRICITY': {
    name: 'Cryostatic Field',
    damageBonus: 20,
    damageMultBonus: 1.65,
    effects: [freeze(2), chain(0.8)],
    description: 'Cold conducts the charge. Freeze + chain.',
  },
  'ELECTRICITY+ICE': {
    name: 'Cryostatic Field',
    damageBonus: 20,
    damageMultBonus: 1.65,
    effects: [freeze(2), chain(0.8)],
    description: 'Cold conducts the charge. Freeze + chain.',
  },
};

// ── Class-Specific Bonuses ────────────────────────────────────────────────────
function applyClassBonuses(
  template: SpellTemplate,
  dominant: CardElement,
  passives: string[],
  playerClass: PlayerClass,
  cards: Card[]
): SpellTemplate {
  let { damageBonus, damageMultBonus, effects, extraDraws, extraDiscards } = { ...template };

  // Paladin: ICE freeze lasts +1 turn
  if (playerClass === 'PALADIN' && passives.includes('HOLY_SMITE') && dominant === 'ICE') {
    effects = effects.map((e) => e.type === 'FREEZE' ? { ...e, turnsRemaining: e.turnsRemaining + 1 } : e);
  }

  // Berserker: FIRE +25% damage
  if (playerClass === 'BERSERKER' && passives.includes('RAGE_BONUS') && dominant === 'FIRE') {
    damageMultBonus *= 1.25;
  }

  // Wizard: ELECTRICITY chains ×1.5 better
  if (playerClass === 'WIZARD' && passives.includes('ARCANE_MASTERY') && dominant === 'ELECTRICITY') {
    effects = effects.map((e) => e.type === 'CHAIN' ? { ...e, value: e.value * 1.5 } : e);
  }

  // Overseer: WIND draws also push a gold event (handled in server action via EXPLOIT_WEAKNESS)
  if (playerClass === 'OVERSEER' && passives.includes('EXPLOIT_WEAKNESS') && dominant === 'WIND') {
    extraDraws += 1;
  }

  // Paladin: SACRED_GROUND — tracked per-card (each ICE card = 3 HP) — returned via extraDraws trick
  // Actual HP healing happens in the server action using card count.

  return { ...template, damageBonus, damageMultBonus, effects, extraDraws, extraDiscards };
}

// ── Main Evaluator ────────────────────────────────────────────────────────────
export function evaluateElementalHand(
  cards: Card[],
  playerClass: PlayerClass,
  passives: string[],
  currentChainBonus: number = 1.0  // stored as combatMultiplierBonus in DB
): SpellResult {
  if (cards.length === 0) {
    return {
      spellName: 'No Spell',
      handRank: 'HIGH_CARD',
      damage: 0, multiplier: 0, baseDamage: 0,
      newStatusEffects: [], extraDraws: 0, extraDiscards: 0,
      description: 'Select cards to cast a spell.',
      dominantElement: 'FIRE',
    };
  }

  const handRank = detectHandRank(cards);
  const { dominant, secondary, isHybrid } = getDominantElement(cards);

  // Resolve base template
  let template: SpellTemplate = { ...ELEMENT_SPELLS[dominant][handRank] };

  // Apply hybrid override at Full House and above if warranted
  const isHighHand = ['FULL_HOUSE', 'FOUR_OF_A_KIND', 'STRAIGHT_FLUSH'].includes(handRank);
  if (isHybrid && secondary && isHighHand) {
    const hybridKey = `${dominant}+${secondary}` as HybridKey;
    const hybridOverride = HYBRID_TEMPLATES[hybridKey];
    if (hybridOverride) {
      template = {
        ...template,
        ...hybridOverride,
        effects: hybridOverride.effects ?? template.effects,
        extraDraws: hybridOverride.extraDraws ?? template.extraDraws,
        extraDiscards: hybridOverride.extraDiscards ?? template.extraDiscards,
      };
    }
  }

  // Apply class passives
  template = applyClassBonuses(template, dominant, passives, playerClass, cards);

  const baseDamage = BASE_DAMAGE[handRank];
  const baseMultiplier = MULTIPLIERS[handRank];

  // Total damage = (base + bonus) × multiplier × template.damageMultBonus × chainBonus
  const damage = Math.floor(
    (baseDamage + template.damageBonus) * baseMultiplier * template.damageMultBonus * currentChainBonus
  );

  return {
    spellName: template.name,
    handRank,
    damage,
    multiplier: baseMultiplier * template.damageMultBonus,
    baseDamage: baseDamage + template.damageBonus,
    newStatusEffects: template.effects,
    extraDraws: template.extraDraws,
    extraDiscards: template.extraDiscards,
    description: template.description,
    dominantElement: isHybrid && secondary ? 'HYBRID' : dominant,
  };
}

/** Consume existing status effects: apply BURN tick damage, decrement turns. */
export function tickStatusEffects(effects: StatusEffect[]): {
  tickDamage: number;
  remainingEffects: StatusEffect[];
  chainBonus: number;
} {
  let tickDamage = 0;
  let chainBonus = 0;
  const remaining: StatusEffect[] = [];

  for (const e of effects) {
    if (e.type === 'BURN') tickDamage += e.value;
    if (e.type === 'CHAIN') chainBonus += e.value;
    const next = { ...e, turnsRemaining: e.turnsRemaining - 1 };
    if (next.turnsRemaining > 0) remaining.push(next);
  }

  return { tickDamage, remainingEffects: remaining, chainBonus };
}

/** Merge new effects into the existing list, stacking burns and refreshing freezes. */
export function mergeStatusEffects(
  existing: StatusEffect[],
  incoming: StatusEffect[]
): StatusEffect[] {
  const merged = [...existing];
  for (const effect of incoming) {
    const idx = merged.findIndex((e) => e.type === effect.type);
    if (idx === -1) {
      merged.push(effect);
    } else {
      // BURN stacks value; FREEZE refreshes to highest duration; CHAIN stacks; PUSH refreshes
      if (effect.type === 'BURN') {
        merged[idx] = {
          ...merged[idx],
          value: merged[idx].value + effect.value,
          turnsRemaining: Math.max(merged[idx].turnsRemaining, effect.turnsRemaining),
          label: `Burn (${merged[idx].value + effect.value}/turn)`,
        };
      } else {
        merged[idx] = { ...merged[idx], turnsRemaining: Math.max(merged[idx].turnsRemaining, effect.turnsRemaining) };
      }
    }
  }
  return merged;
}

/** Is the enemy frozen this turn? */
export function isFrozen(effects: StatusEffect[]): boolean {
  return effects.some((e) => e.type === 'FREEZE' && e.turnsRemaining > 0);
}

/** Is the enemy pushed (attack delayed)? */
export function isPushed(effects: StatusEffect[]): boolean {
  return effects.some((e) => e.type === 'PUSH' && e.turnsRemaining > 0);
}

/** Extract the current CHAIN multiplier bonus from active effects. */
export function getChainBonus(effects: StatusEffect[]): number {
  const chainEffect = effects.find((e) => e.type === 'CHAIN');
  return chainEffect ? 1 + chainEffect.value : 1.0;
}
