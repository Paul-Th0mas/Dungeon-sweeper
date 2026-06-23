import {
  CardElement,
  PlayerClass,
  ClashResult,
  SlotResult,
  StatusEffect,
  TriggeredSpell,
  Spell,
  SpellStatusEffect,
  EnemySpell,
} from '../types';

// ── Elemental Counter Wheel ────────────────────────────────────────────────────
// Key hard-counters Value (key beats value).
const COUNTERS: Record<Exclude<CardElement, 'VOID'>, CardElement> = {
  EARTH: 'FIRE',
  FIRE:  'AIR',
  AIR:   'WATER',
  WATER: 'EARTH',
};

// Returns the element that counters the given element.
export function getCounter(el: CardElement): CardElement | null {
  if (el === 'VOID') return null;
  return COUNTERS[el as keyof typeof COUNTERS] ?? null;
}

// Returns true if attackerEl hard-counters defenderEl.
export function hardCounters(attacker: CardElement, defender: CardElement): boolean {
  if (attacker === 'VOID' || defender === 'VOID') return false;
  return COUNTERS[attacker as keyof typeof COUNTERS] === defender;
}

// ── Sliding Window Spell Matching ─────────────────────────────────────────────
// Scans the player's sequence LEFT TO RIGHT for contiguous sub-arrays that
// match an equipped spell's recipe. Each element can only be consumed once.
// Returns a list of triggered spells with their positions.
export function findTriggeredSpells(
  sequence: (CardElement | null)[],
  equippedSpells: Spell[],
  enemyHpAtStart: number,
  wizardCascadeActive?: boolean
): { triggeredSpells: TriggeredSpell[]; consumed: Set<number> } {
  // Filter to only equipped, non-null spells
  const spells = equippedSpells.filter((s) => s.equipped && s.recipe.length > 0);

  // Sort spells by recipe length descending so longer spells match first
  spells.sort((a, b) => b.recipe.length - a.recipe.length);

  const triggered: TriggeredSpell[] = [];
  // Track which indices have been consumed by a spell match
  const consumed = new Set<number>();

  for (const spell of spells) {
    const recipe = spell.recipe;
    const rLen = recipe.length;
    // Slide across the sequence looking for a contiguous match on unconsumed slots
    for (let i = 0; i <= sequence.length - rLen; i++) {
      if (consumed.has(i)) continue;

      // Check if recipe matches at position i (all slots unconsumed)
      let match = true;
      for (let j = 0; j < rLen; j++) {
        if (consumed.has(i + j) || sequence[i + j] !== recipe[j]) {
          match = false;
          break;
        }
      }

      if (match) {
        // Consume the matched indices
        for (let j = 0; j < rLen; j++) consumed.add(i + j);

        const damage = spell.isUpgraded
          ? Math.floor(spell.baseDamage * 1.25)
          : spell.baseDamage;

        triggered.push({
          name: spell.name,
          damage,
          enemyHpAfter: 0,
          startIndex: i,
          recipeLength: rLen,
        });
        // Only match a spell once per sequence scan
        break;
      }
    }
  }

  // Sort triggered spells by startIndex ascending
  triggered.sort((a, b) => a.startIndex - b.startIndex);

  let comboCount = 0;
  for (let i = 0; i < triggered.length; i++) {
    const spell = triggered[i];
    if (i > 0) {
      const prev = triggered[i - 1];
      const isAdjacent = spell.startIndex === prev.startIndex + (prev.recipeLength ?? 0);
      if (isAdjacent || wizardCascadeActive) {
        comboCount++;
        spell.isCombo = true;
        spell.comboCount = comboCount;
        const multiplier = comboCount === 1 ? 1.5 : 2.0;
        spell.damage = Math.floor(spell.damage * multiplier);
      } else {
        comboCount = 0;
      }
    }
  }

  // Calculate enemyHpAfter sequentially
  let currentHp = enemyHpAtStart;
  for (const spell of triggered) {
    currentHp = Math.max(0, currentHp - spell.damage);
    spell.enemyHpAfter = currentHp;
  }

  return { triggeredSpells: triggered, consumed };
}

// ── 40% Counter Negation Rule ─────────────────────────────────────────────────
// If the player's sequence hard-counters >= 40% of the enemy queue's slots,
// ALL enemy damage for this round is negated.
export function resolveSlots(
  playerSequence: (CardElement | null)[],
  enemyQueue: (CardElement | null)[],
  boardLength: number,
  enemyAttackDamage: number,
  passives: string[]
): {
  slots: SlotResult[];
  totalPlayerDamage: number;
  enemyDamageNegated: boolean;
  counterPercent: number;
} {
  const slots: SlotResult[] = [];
  let counteredSlots = 0;
  let uncounteredEnemyDamage = 0;

  for (let i = 0; i < boardLength; i++) {
    const pEl = playerSequence[i] ?? null;
    const eEl = enemyQueue[i] ?? null;

    let result: SlotResult['result'] = 'NEUTRAL';
    let damageToPlayer = 0;

    if (pEl && eEl) {
      if (hardCounters(pEl, eEl)) {
        result = 'COUNTER';
        counteredSlots++;
      } else if (hardCounters(eEl, pEl)) {
        result = 'COUNTERED';
        uncounteredEnemyDamage += enemyAttackDamage;
        damageToPlayer = enemyAttackDamage;
      } else {
        result = 'NEUTRAL';
        uncounteredEnemyDamage += Math.floor(enemyAttackDamage * 0.5);
        damageToPlayer = Math.floor(enemyAttackDamage * 0.5);
      }
    } else if (!pEl && eEl) {
      // Empty player slot — undefended
      result = 'EMPTY';
      uncounteredEnemyDamage += enemyAttackDamage;
      damageToPlayer = enemyAttackDamage;
    } else if (pEl && !eEl) {
      // Empty enemy slot — player slot goes uncontested (no damage either way)
      result = 'NEUTRAL';
    } else {
      result = 'EMPTY';
    }

    slots.push({ playerElement: pEl, enemyElement: eEl, result, damageToPlayer });
  }

  // Paladin DIVINE_SHIELD: negate damage from the first uncountered slot
  let totalPlayerDamage = uncounteredEnemyDamage;
  if (passives.includes('DIVINE_SHIELD')) {
    const firstHit = slots.find((s) => s.damageToPlayer > 0);
    if (firstHit) {
      totalPlayerDamage = Math.max(0, totalPlayerDamage - firstHit.damageToPlayer);
    }
  }

  // Overseer SHADOW_STEP: 20% chance to dodge all damage
  if (passives.includes('SHADOW_STEP') && Math.random() < 0.2) {
    totalPlayerDamage = 0;
  }

  const counterPercent = boardLength > 0 ? counteredSlots / boardLength : 0;
  const enemyDamageNegated = counterPercent >= 0.4;
  if (enemyDamageNegated) totalPlayerDamage = 0;

  return { slots, totalPlayerDamage, enemyDamageNegated, counterPercent };
}

// ── Main Clash Resolver ───────────────────────────────────────────────────────
export function resolveClash(
  playerSequence: (CardElement | null)[],
  enemyQueue: (CardElement | null)[],
  boardLength: number,
  equippedSpells: Spell[],
  enemyAttackDamage: number,
  enemyHpAtStart: number,
  passives: string[],
  existingStatusEffects: StatusEffect[],
  activeOmen: string | null,
  focusAbilityUsed: boolean,
  playerClass: string,
  lastTurnSpells: string[],
  floor: number
): ClashResult {
  // 1. Resolve slot-by-slot counters and player damage
  const { slots, totalPlayerDamage, enemyDamageNegated, counterPercent } = resolveSlots(
    playerSequence,
    enemyQueue,
    boardLength,
    enemyAttackDamage,
    passives
  );

  // 2. Find triggered spells via sliding window (pass WIZARD Cascade active)
  const wizardCascade = focusAbilityUsed && playerClass === 'WIZARD';
  const { triggeredSpells, consumed } = findTriggeredSpells(playerSequence, equippedSpells, enemyHpAtStart, wizardCascade);

  // Calculate basic strike damage for unconsumed elements
  let basicStrikeDamage = 0;
  const basicStrikePerElement = 1 + Math.floor(floor / 2);
  for (let i = 0; i < boardLength; i++) {
    const pEl = playerSequence[i];
    if (pEl && pEl !== 'VOID' && !consumed.has(i)) {
      const slotRes = slots[i]?.result;
      if (slotRes !== 'COUNTERED') {
        basicStrikeDamage += basicStrikePerElement;
      }
    }
  }

  // Apply Omen: ENRAGE (triggered spells that also triggered last turn deal 0 damage)
  if (activeOmen === 'ENRAGE') {
    for (const ts of triggeredSpells) {
      if (lastTurnSpells.includes(ts.name)) {
        ts.damage = 0;
      }
    }
  }

  // Apply Ultimate: BERSERKER Ignite (FIRE spells deal x2 damage)
  if (focusAbilityUsed && playerClass === 'BERSERKER') {
    for (const ts of triggeredSpells) {
      const spellDef = equippedSpells.find(s => s.name === ts.name);
      if (spellDef?.recipe.includes('FIRE')) {
        ts.damage *= 2;
      }
    }
  }

  // Apply Omen: SHIELD (enemy takes 50% less spell damage)
  if (activeOmen === 'SHIELD') {
    for (const ts of triggeredSpells) {
      ts.damage = Math.floor(ts.damage * 0.5);
    }
  }

  // Recalculate enemyHpAfter sequentially and sum total damage
  let currentHp = enemyHpAtStart;
  for (const ts of triggeredSpells) {
    currentHp = Math.max(0, currentHp - ts.damage);
    ts.enemyHpAfter = currentHp;
  }
  currentHp = Math.max(0, currentHp - basicStrikeDamage);
  const totalEnemyDamage = triggeredSpells.reduce((sum, s) => sum + s.damage, 0) + basicStrikeDamage;

  // Apply Ultimate: PALADIN Fortress (immune to all damage)
  let finalPlayerDamage = totalPlayerDamage;
  if (focusAbilityUsed && playerClass === 'PALADIN') {
    finalPlayerDamage = 0;
  }

  // 4. Collect status effects from triggered spells
  const newStatusEffects: StatusEffect[] = [];
  for (const spell of equippedSpells.filter((s) => s.equipped && s.statusEffect)) {
    const triggered = triggeredSpells.find((t) => t.name === spell.name);
    // Spell must have triggered and dealt > 0 damage to apply status effects, or just triggered.
    // E.g., if Enrage negated it, maybe it doesn't apply status effects. Let's say if triggered.damage > 0.
    if (triggered && triggered.damage > 0 && spell.statusEffect) {
      const se = spell.statusEffect as SpellStatusEffect;
      newStatusEffects.push({
        type: se.type,
        value: se.value,
        turnsRemaining: se.turns,
        label: `${se.type} (${se.value > 0 ? se.value + '/turn' : ''} × ${se.turns})`,
      });
    }
  }

  // 5. Build description
  const pct = Math.round(counterPercent * 100);
  let description = `Countered ${pct}% of enemy slots.`;
  if (enemyDamageNegated) {
    description += ' Enemy damage NEGATED (≥40% threshold)!';
  }
  if (triggeredSpells.length > 0) {
    description += ` Spells triggered: ${triggeredSpells.map((s) => s.name).join(', ')}.`;
  }
  if (basicStrikeDamage > 0) {
    description += ` Basic Strike: ${basicStrikeDamage} dmg.`;
  }
  if (triggeredSpells.length === 0 && basicStrikeDamage === 0 && !enemyDamageNegated) {
    description += ' No spells triggered.';
  }
  if (focusAbilityUsed) {
    description += ` [ULTIMATE ACTIVATED!]`;
  }
  if (activeOmen) {
    description += ` [Omen: ${activeOmen}]`;
  }

  return {
    slots,
    triggeredSpells,
    totalEnemyDamage,
    totalPlayerDamage: finalPlayerDamage,
    enemyDamageNegated,
    counterPercent,
    newStatusEffects,
    description,
    enemyHpAtStart,
    focusAbilityUsed,
    playerClass: playerClass as any,
    basicStrikeDamage,
    staleTurns: 0,
  };
}

// ── Boss AI: Omniscient Counter Engine ────────────────────────────────────────
// Called at the start of each turn for Elites and Bosses.
// Given the player's base pool (from equipped spell recipes),
// computes the optimal player sequence and builds a counter queue for the boss.
export function generateBossCounterQueue(
  equippedSpells: Spell[],
  enemyMana: number,
  enemySpellbook: EnemySpell[],
  enemyElementBias: Partial<Record<CardElement, number>>
): CardElement[] {
  // 1. Build base player pool from equipped spell recipes
  const basePool: CardElement[] = [];
  for (const spell of equippedSpells.filter((s) => s.equipped)) {
    basePool.push(...spell.recipe);
  }

  // 2. Determine the optimal player sequence (highest damage ordering)
  // Simple heuristic: group elements so spell recipes are contiguous from the start
  const optimalSequence: CardElement[] = [];
  const remaining = [...basePool];
  for (const spell of equippedSpells.filter((s) => s.equipped).sort((a, b) => b.baseDamage - a.baseDamage)) {
    for (const el of spell.recipe) {
      const idx = remaining.indexOf(el);
      if (idx !== -1) {
        optimalSequence.push(el);
        remaining.splice(idx, 1);
      }
    }
  }
  // Append any leftover elements
  optimalSequence.push(...remaining);

  // 3. Build counter queue: for each optimal player element, place its counter
  const counterQueue: CardElement[] = [];
  for (let i = 0; i < enemyMana; i++) {
    if (i < optimalSequence.length) {
      const pEl = optimalSequence[i];
      const counter = getCounter(pEl);
      // Counter the player if possible, else fall back to bias
      counterQueue.push(counter ?? drawFromBias(enemyElementBias));
    } else {
      // More enemy mana than player slots — fill with bias
      counterQueue.push(drawFromBias(enemyElementBias));
    }
  }

  return counterQueue;
}

// ── Standard Enemy Queue Generator ───────────────────────────────────────────
export function generateEnemyQueue(
  elementBias: Partial<Record<CardElement, number>>,
  length: number
): CardElement[] {
  return Array.from({ length }, () => drawFromBias(elementBias));
}

// Draw a random element according to weighted bias.
function drawFromBias(bias: Partial<Record<CardElement, number>>): CardElement {
  const elements: CardElement[] = ['FIRE', 'WATER', 'AIR', 'EARTH'];
  const weights = elements.map((el) => bias[el] ?? 0);
  const totalWeight = weights.reduce((s, w) => s + w, 0) || 1;
  const normalized = weights.map((w) => w / totalWeight);
  const r = Math.random();
  let cumulative = 0;
  for (let i = 0; i < elements.length; i++) {
    cumulative += normalized[i];
    if (r <= cumulative) return elements[i];
  }
  return elements[elements.length - 1];
}

// ── Status Effect Helpers ─────────────────────────────────────────────────────
export function tickStatusEffects(effects: StatusEffect[]): {
  tickDamage: number;
  remainingEffects: StatusEffect[];
} {
  let tickDamage = 0;
  const remaining: StatusEffect[] = [];

  for (const e of effects) {
    if (e.type === 'BURN') tickDamage += e.value;
    const next = { ...e, turnsRemaining: e.turnsRemaining - 1 };
    if (next.turnsRemaining > 0) remaining.push(next);
  }

  return { tickDamage, remainingEffects: remaining };
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
        merged[idx] = {
          ...merged[idx],
          turnsRemaining: Math.max(merged[idx].turnsRemaining, effect.turnsRemaining),
        };
      }
    }
  }
  return merged;
}

export function isFrozen(effects: StatusEffect[]): boolean {
  return effects.some((e) => e.type === 'FREEZE' && e.turnsRemaining > 0);
}
