import { Card, CardElement, PlayerClass, ClashResult, StatusEffect, FrameData, TriggeredSpell } from './types';

// ── Elemental Wheel ────────────────────────────────────────────────────────
// Key counters Value.
const COUNTERS: Record<Exclude<CardElement, 'VOID'>, CardElement> = {
  EARTH: 'FIRE',
  FIRE: 'AIR',
  AIR: 'WATER',
  WATER: 'EARTH',
};

// ── Status Effect Helpers ───────────────────────────────────────────────────
function burn(dmgPerTurn: number, turns: number): StatusEffect {
  return { type: 'BURN', value: dmgPerTurn, turnsRemaining: turns, label: `Burn (${dmgPerTurn}/turn × ${turns})` };
}
function freeze(turns: number): StatusEffect {
  return { type: 'FREEZE', value: 0, turnsRemaining: turns, label: `Frozen (${turns} turns)` };
}
function chain(bonusMult: number): StatusEffect {
  return { type: 'CHAIN', value: bonusMult, turnsRemaining: 1, label: `Shock ×${bonusMult}` };
}
function push(turns: number): StatusEffect {
  return { type: 'PUSH', value: 0, turnsRemaining: turns, label: `Pushed (${turns} turns)` };
}

// ── Spell Recipes ──────────────────────────────────────────────────────────
interface SpellRecipe {
  name: string;
  sequence: CardElement[];
  effects: StatusEffect[];
  damage: number;
}

const SPELL_DECK: SpellRecipe[] = [
  { name: 'Inferno Blast', sequence: ['FIRE', 'FIRE', 'EARTH'], effects: [burn(15, 3)], damage: 40 },
  { name: 'Blizzard Shard', sequence: ['WATER', 'EARTH'], effects: [freeze(2)], damage: 20 },
  { name: 'Chain Lightning', sequence: ['AIR', 'AIR'], effects: [chain(2.0)], damage: 30 },
  { name: 'Hurricane', sequence: ['EARTH', 'EARTH', 'EARTH'], effects: [push(2)], damage: 25 },
  { name: 'Frostburn', sequence: ['FIRE', 'WATER'], effects: [burn(10, 2), freeze(1)], damage: 25 },
  { name: 'Plasma Storm', sequence: ['AIR', 'FIRE', 'EARTH'], effects: [chain(3.0), burn(20, 2)], damage: 60 }
];

// ── Clashing Logic ──────────────────────────────────────────────────────────
export function resolveQueueClash(
  playerQueue: Card[],
  enemyQueue: CardElement[],
  playerClass: PlayerClass,
  passives: string[],
  enemyHpAtStart: number,
  currentChainBonus: number = 1.0
): ClashResult {
  const frames: FrameData[] = [];
  let totalEnemyDamage = 0;
  let totalPlayerDamage = 0;
  let currentEnemyHp = enemyHpAtStart;
  const newStatusEffects: StatusEffect[] = [];
  
  const maxLength = Math.max(playerQueue.length, enemyQueue.length);

  for (let i = 0; i < maxLength; i++) {
    const pCard = playerQueue[i] || null;
    const eEl = enemyQueue[i] || null;
    const pEl = pCard ? pCard.element : null;

    let result: FrameData['result'] = 'NONE';
    let pDmg = 0;
    let eDmg = 0;

    const basePlayerDamage = pCard ? (pCard.rank * 2) : 0; // rough base dmg based on rank
    const baseEnemyDamage = eEl ? 10 : 0; // static enemy damage for un-countered blocks

    if (pEl === 'VOID' && eEl === 'VOID') {
      result = 'TIE';
      eDmg = 20;
      pDmg = 20;
    } else if (pEl === 'VOID') {
      result = 'WIN';
      eDmg = 20;
    } else if (eEl === 'VOID') {
      result = 'LOSE';
      pDmg = 20;
    } else if (pEl && eEl) {
      if (COUNTERS[pEl as keyof typeof COUNTERS] === eEl) {
        // Player Hard Counters
        result = 'WIN';
        eDmg = basePlayerDamage;
      } else if (COUNTERS[eEl as keyof typeof COUNTERS] === pEl) {
        // Enemy Hard Counters
        result = 'LOSE';
        pDmg = baseEnemyDamage;
      } else if (pEl === eEl) {
        // Power Clash
        result = 'TIE';
        // Assume enemy rank is roughly 7 for ties
        const eRank = 7;
        if (pCard.rank > eRank) {
          eDmg = Math.floor(basePlayerDamage / 2);
        } else if (pCard.rank < eRank) {
          pDmg = Math.floor(baseEnemyDamage / 2);
        } else {
          eDmg = Math.floor(basePlayerDamage / 2);
          pDmg = Math.floor(baseEnemyDamage / 2);
        }
      } else {
        // Neutral Clash
        result = 'NEUTRAL';
        eDmg = basePlayerDamage;
        pDmg = baseEnemyDamage;
      }
    } else if (pEl && !eEl) {
      // Uncontested player attack
      result = 'WIN';
      eDmg = basePlayerDamage;
    } else if (!pEl && eEl) {
      // Uncontested enemy attack
      result = 'LOSE';
      pDmg = baseEnemyDamage;
    }

    currentEnemyHp = Math.max(0, currentEnemyHp - Math.floor(eDmg * currentChainBonus));
    frames.push({
      playerCard: pCard,
      enemyElement: eEl,
      result,
      damageToEnemy: eDmg,
      damageToPlayer: pDmg,
      enemyHpAfter: currentEnemyHp
    });

    totalEnemyDamage += eDmg;
    totalPlayerDamage += pDmg;
  }

  // Multiply player damage by chain bonus
  totalEnemyDamage = Math.floor(totalEnemyDamage * currentChainBonus);

  // Check for Spells triggered by Player Queue
  const triggeredSpells: TriggeredSpell[] = [];
  const pSeq = playerQueue.map(c => c.element);
  let tempEnemyHp = currentEnemyHp;

  for (const spell of SPELL_DECK) {
    // Check if the spell sequence exists exactly inside pSeq
    for (let i = 0; i <= pSeq.length - spell.sequence.length; i++) {
      let match = true;
      for (let j = 0; j < spell.sequence.length; j++) {
        if (pSeq[i + j] !== spell.sequence[j]) {
          match = false;
          break;
        }
      }
      if (match) {
        const spellDmg = Math.floor(spell.damage * currentChainBonus);
        totalEnemyDamage += spellDmg;
        tempEnemyHp = Math.max(0, tempEnemyHp - spellDmg);
        triggeredSpells.push({
          name: spell.name,
          damage: spellDmg,
          enemyHpAfter: tempEnemyHp,
        });
        newStatusEffects.push(...spell.effects);
        // We only trigger a specific spell once per queue to prevent abuse, 
        // though they could weave it twice if long enough. Break inner loop.
        break; 
      }
    }
  }

  return {
    frames,
    spellsTriggered: triggeredSpells,
    totalEnemyDamage,
    totalPlayerDamage,
    newStatusEffects,
    description: triggeredSpells.length > 0 ? `Triggered: ${triggeredSpells.map(s => s.name).join(', ')}` : 'Clash resolved.',
    enemyHpAtStart
  };
}

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

export function isFrozen(effects: StatusEffect[]): boolean {
  return effects.some((e) => e.type === 'FREEZE' && e.turnsRemaining > 0);
}

export function isPushed(effects: StatusEffect[]): boolean {
  return effects.some((e) => e.type === 'PUSH' && e.turnsRemaining > 0);
}

export function getChainBonus(effects: StatusEffect[]): number {
  const chainEffect = effects.find((e) => e.type === 'CHAIN');
  return chainEffect ? 1 + chainEffect.value : 1.0;
}
