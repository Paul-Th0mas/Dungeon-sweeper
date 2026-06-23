'use server';

import prisma from './prisma';
import {
  generateGrid,
  generateTreasureGrid,
  generateStarterSpells,
  getRandomEnemy,
  buildEnemyFromTemplate,
  generateSpellRewardChoices,
  getBiomeBoss,
} from './gameLogic';
import {
  resolveClash,
  generateEnemyQueue,
  generateBossCounterQueue,
  tickStatusEffects,
  mergeStatusEffects,
  isFrozen,
} from './combatEngine';
import { calculateLevelUp, getEnemyRewards, getXPToNextLevel, pickLevelUpChoices, applyPassiveStat } from './xpSystem';
import {
  AxialCoord,
  Tile as ClientTile,
  GamePhase,
  PlayerClass,
  TileType,
  StatusEffect,
  PassiveAbility,
  CardElement,
  Spell,
  SpareElements,
  Biome,
} from './types';
import { coordToString, getDistance, getNeighbors } from './hexMath';
import { shuffle } from 'lodash';

// ── Helpers ────────────────────────────────────────────────────────────────────

function parseSpareElements(raw: any): SpareElements {
  return {
    FIRE:  raw?.FIRE  ?? 0,
    WATER: raw?.WATER ?? 0,
    AIR:   raw?.AIR   ?? 0,
    EARTH: raw?.EARTH ?? 0,
  };
}

function addToSpareElements(base: SpareElements, adds: CardElement[]): SpareElements {
  const result = { ...base };
  for (const el of adds) {
    if (el === 'FIRE' || el === 'WATER' || el === 'AIR' || el === 'EARTH') {
      result[el] += 1;
    }
  }
  return result;
}

function consumeFromSpareElements(base: SpareElements, consumed: CardElement[]): SpareElements {
  const result = { ...base };
  for (const el of consumed) {
    if (el === 'FIRE' || el === 'WATER' || el === 'AIR' || el === 'EARTH') {
      result[el] = Math.max(0, result[el] - 1);
    }
  }
  return result;
}

async function clearTileAndDecrementNeighbors(sessionId: string, q: number, r: number) {
  // If this tile is already cleared, skip to avoid double-decrementing neighbors
  const existing = await prisma.tile.findUnique({
    where: { sessionId_q_r: { sessionId, q, r } },
    select: { cleared: true },
  });
  if (existing?.cleared) {
    return; // No further action needed
  }
  await prisma.tile.update({
    where: { sessionId_q_r: { sessionId, q, r } },
    data: { cleared: true, revealed: true },
  });

  const neighbors = getNeighbors({ q, r });
  for (const n of neighbors) {
    const neighborTile = await prisma.tile.findUnique({
      where: { sessionId_q_r: { sessionId, q: n.q, r: n.r } },
    });
    if (neighborTile && neighborTile.dangerNumber > 0) {
      await prisma.tile.update({
        where: { id: neighborTile.id },
        data: { dangerNumber: { decrement: 1 } },
      });
    }
  }
}

function getTrueDangerNumber(tiles: any[], q: number, r: number): number {
  const neighbors = getNeighbors({ q, r });
  let count = 0;
  for (const n of neighbors) {
    const neighbor = tiles.find((t) => t.q === n.q && t.r === n.r);
    if (neighbor && neighbor.type !== 'SAFE' && neighbor.type !== 'WALL') {
      count++;
    }
  }
  return count;
}

function mapSpellFromDB(s: any): Spell {
  return {
    id: s.id,
    name: s.name,
    recipe: (s.recipe as CardElement[]),
    baseDamage: s.baseDamage,
    isAdvanced: s.isAdvanced,
    isUpgraded: s.isUpgraded,
    equipped: s.equipped,
    location: s.location as Spell['location'],
  };
}

function formatSession(session: any) {
  const grid: Record<string, ClientTile> = {};
  session.tiles.forEach((t: any) => {
    grid[coordToString({ q: t.q, r: t.r })] = {
      coord: { q: t.q, r: t.r },
      type: t.type as TileType,
      revealed: t.revealed,
      dangerNumber: t.dangerNumber,
      hasItem: t.hasItem,
      cleared: t.cleared,
      isMirage: t.isMirage,
      calcifiedHits: t.calcifiedHits,
    };
  });

  const allSpells: Spell[] = (session.spells ?? []).map(mapSpellFromDB);
  const shopSpells = allSpells.filter((s) => s.location === 'SHOP');
  const playerSpells = allSpells.filter((s) => s.location !== 'SHOP');

  const currentXP = session.currentXP ?? 0;
  const level = session.level ?? 1;
  const spareElements = parseSpareElements(session.spareElements);
  const statusEffects = (session.enemyStatusEffects as StatusEffect[]) ?? [];

  // Build base pool from equipped spells for combat context
  const equippedSpells = playerSpells.filter((s) => s.equipped);
  const basePool: CardElement[] = [];
  for (const spell of equippedSpells) basePool.push(...spell.recipe);

  // Apply Curse: void elements next turn
  if (session.voidElementsNextTurn > 0) {
    for (let i = 0; i < session.voidElementsNextTurn; i++) {
      basePool.push('VOID');
    }
  }

  // Apply Drain: remove leftmost element from pool
  if (session.activeOmen === 'DRAIN' && basePool.length > 0) {
    basePool.shift();
  }

  // Apply Wizard Ultimate: add 1 AIR element to active pool
  if (session.focusAbilityUsed && session.playerClass === 'WIZARD') {
    basePool.push('AIR');
  }

  const combatState =
    session.phase === 'COMBAT' || session.phase === 'SPELL_REWARD'
      ? {
          enemy: {
            id: 'current-enemy',
            name: session.enemyName || 'Enemy',
            tier: session.enemyTier ?? 1,
            maxHp: session.enemyMaxHp,
            currentHp: session.enemyCurrentHp,
            attackDamage: session.enemyAttackDamage ?? 10,
            mana: session.enemyMana ?? 4,
            isEliteOrBoss: session.isEliteOrBoss ?? false,
            spellbook: (session.enemySpellbook as any[]) ?? [],
            elementBias: (session.enemyElementBias as any) ?? {},
            rewardElements: [],
            rewardRarity: 'COMMON' as const,
            statusEffects,
          },
          activePool: basePool,
          spareElements,
          playerSequence: new Array(session.playerMana ?? 4).fill(null),
          enemyQueue: (session.enemyQueue as CardElement[]) ?? [],
          boardLength: session.playerMana ?? 4,
          lastClash: null,
          rerollUsed: false,
          focusPips: session.focusPips ?? 0,
          focusAbilityUsed: session.focusAbilityUsed ?? false,
          activeOmen: session.activeOmen ?? null,
          enemyQueueRevealed: session.enemyQueueRevealed ?? false,
          sandBlindnessActive: session.enemyName === 'Sol-Inured Skimmer, The Dune Weaver' && (session.combatTurn % 3 === 0),
        }
      : null;

  return {
    id: session.id,
    phase: session.phase as GamePhase,
    biome: session.biome as Biome,
    player: {
      maxHp: session.maxHp,
      currentHp: session.currentHp,
      gold: session.gold,
      class: session.playerClass as PlayerClass,
      relics: session.relics,
      passives: session.passives,
      spells: playerSpells,
      spareElements,
      inventory: session.inventory || [],
      position: { q: session.posX, r: session.posY },
      torchRadius: session.torchRadius,
      floor: session.floor,
      hasKey: session.hasKey,
      xp: currentXP,
      level,
      xpToNextLevel: getXPToNextLevel(level),
      playerMana: session.playerMana ?? 4,
    },
    grid,
    combatState,
    pendingLevelUpChoices: session.pendingLevelUpChoices ?? null,
    shopSpells,
    shopRerolled: session.shopRerolled ?? false,
  };
}

// ── Session Queries ────────────────────────────────────────────────────────────

export async function getRecentSessions(limit: number = 5) {
  const sessions = await prisma.gameSession.findMany({
    orderBy: { updatedAt: 'desc' },
    take: limit,
  });
  return sessions.map((s) => ({
    id: s.id,
    playerClass: s.playerClass,
    level: s.level,
    floor: s.floor,
    updatedAt: s.updatedAt,
  }));
}

export async function resumeSession(sessionId: string) {
  const session = await prisma.gameSession.findUnique({
    where: { id: sessionId },
    include: { tiles: true, spells: true },
  });
  if (!session) return null;
  return formatSession(session);
}

// ── Initialize Game ────────────────────────────────────────────────────────────

export async function initializeGame(playerClass: PlayerClass = 'BERSERKER') {
  const starterSpells = generateStarterSpells(playerClass);
  const grid = generateGrid(3, 'SIROCCO', 1);

  const HP_BY_CLASS: Record<PlayerClass, number> = {
    BERSERKER: 120,
    PALADIN:   110,
    WIZARD:    80,
    OVERSEER:  95,
  };
  const maxHp = HP_BY_CLASS[playerClass];

  const session = await prisma.gameSession.create({
    data: {
      phase: 'EXPLORING',
      floor: 1,
      biome: 'SIROCCO',
      playerClass,
      maxHp,
      currentHp: maxHp,
      gold: 50,
      currentXP: 0,
      level: 1,
      relics: [],
      passives: [
        playerClass === 'BERSERKER' ? 'RAGE_BONUS' :
        playerClass === 'PALADIN'   ? 'SACRED_GROUND' :
        playerClass === 'WIZARD'    ? 'ARCANE_MASTERY' :
        'EXPLOIT_WEAKNESS'
      ],
      posX: 0,
      posY: 0,
      playerMana: 4,
      spareElements: { FIRE: 0, WATER: 0, AIR: 0, EARTH: 0 },
      tiles: {
        create: Object.values(grid).map((tile) => ({
          q: tile.coord.q,
          r: tile.coord.r,
          type: tile.type as any,
          revealed: tile.revealed,
          dangerNumber: tile.dangerNumber,
          cleared: tile.cleared ?? false,
          isMirage: tile.isMirage ?? false,
          calcifiedHits: tile.calcifiedHits ?? 0,
        })),
      },
      spells: {
        create: starterSpells.map((s) => ({
          name: s.name,
          recipe: s.recipe,
          baseDamage: s.baseDamage,
          isAdvanced: false,
          isUpgraded: false,
          equipped: true,
          location: 'LOADOUT',
        })),
      },
    },
    include: { tiles: true, spells: true },
  });

  return formatSession(session);
}

// ── Move Player ────────────────────────────────────────────────────────────────

export async function movePlayer(sessionId: string, targetCoord: AxialCoord) {
  const session = await prisma.gameSession.findUnique({
    where: { id: sessionId },
    include: { tiles: true, spells: true },
  });

  if (!session || session.phase !== 'EXPLORING') return null;

  const distance = getDistance({ q: session.posX, r: session.posY }, targetCoord);
  if (distance > 1) return null;

  const targetTile = session.tiles.find(
    (t) => t.q === targetCoord.q && t.r === targetCoord.r
  );
  if (!targetTile) return null;

  // 1. Calcified Tile Check
  if (targetTile.calcifiedHits > 0) {
    const nextHits = targetTile.calcifiedHits - 1;
    if (nextHits > 0) {
      // Crack the shell, set revealed to true so the cracked state is visible, but do not move the player
      await prisma.tile.update({
        where: { id: targetTile.id },
        data: { calcifiedHits: nextHits, revealed: true },
      });
      const final = await prisma.gameSession.findUnique({
        where: { id: sessionId },
        include: { tiles: true, spells: true },
      });
      return formatSession(final);
    } else {
      // Hits becomes 0, so we update it in the database and continue to move player
      await prisma.tile.update({
        where: { id: targetTile.id },
        data: { calcifiedHits: 0 },
      });
    }
  }

  // Reveal + move
  await prisma.gameSession.update({
    where: { id: sessionId },
    data: {
      posX: targetCoord.q,
      posY: targetCoord.r,
      tiles: { update: { where: { id: targetTile.id }, data: { revealed: true } } },
    },
  });

  // 2. Mirage Fluctuation upon player movement
  for (const tile of session.tiles) {
    if (tile.isMirage && tile.revealed) {
      const trueDanger = getTrueDangerNumber(session.tiles, tile.q, tile.r);
      const shift = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
      const newDanger = Math.max(0, trueDanger + shift);
      await prisma.tile.update({
        where: { id: tile.id },
        data: { dangerNumber: newDanger },
      });
    }
  }

  // 3. Reality Rifts (Void-Scaur)
  if ((targetTile.type === 'EVENT' || targetTile.type === 'TREASURE') && !targetTile.cleared && session.biome === 'VOID_SCAUR') {
    const unrevealedSafeTiles = session.tiles.filter((t) => !t.revealed && t.type === 'SAFE');
    if (unrevealedSafeTiles.length > 0) {
      let closestTile = unrevealedSafeTiles[0];
      let minDistance = getDistance(targetCoord, { q: closestTile.q, r: closestTile.r });
      for (const t of unrevealedSafeTiles) {
        const dist = getDistance(targetCoord, { q: t.q, r: t.r });
        if (dist < minDistance) {
          minDistance = dist;
          closestTile = t;
        }
      }
      const roll = Math.random();
      let nextType: TileType = 'ENEMY';
      if (roll < 0.50) nextType = 'ENEMY';
      else if (roll < 0.70) nextType = 'TREASURE';
      else if (roll < 0.85) nextType = 'SHOP';
      else nextType = 'REST';

      await prisma.tile.update({
        where: { id: closestTile.id },
        data: { type: nextType },
      });

      // Recalculate danger numbers of neighbors of mutated tile
      const neighborsOfMutated = getNeighbors(closestTile);
      const freshSession = await prisma.gameSession.findUnique({
        where: { id: sessionId },
        include: { tiles: true },
      });
      if (freshSession) {
        for (const n of neighborsOfMutated) {
          const neighborTile = freshSession.tiles.find((t) => t.q === n.q && t.r === n.r);
          if (neighborTile) {
            const trueDanger = getTrueDangerNumber(freshSession.tiles, n.q, n.r);
            await prisma.tile.update({
              where: { id: neighborTile.id },
              data: { dangerNumber: trueDanger },
            });
          }
        }
      }
    }
  }

  // ── Handle special tile types ─────────────────────────────────────────────
  if (targetTile.type === 'ENEMY' && !targetTile.cleared) {
    let template;
    const isBoss = targetTile.hasItem && (session.floor === 2 || session.floor === 4 || session.floor === 6);
    if (isBoss) {
      template = getBiomeBoss(session.floor);
    } else {
      template = getRandomEnemy(session.floor);
    }
    const enemy = buildEnemyFromTemplate(template, session.floor);

    // Equipped spells' recipes form the base pool
    const equippedSpells = (session.spells ?? [])
      .filter((s) => s.equipped)
      .map(mapSpellFromDB);

    // Generate enemy queue
    let enemyQueue: CardElement[];
    if (enemy.name === 'Amalgam-9, The Singularity Core') {
      const pool: CardElement[] = ['FIRE', 'WATER', 'AIR', 'EARTH', 'VOID'];
      const s1 = pool[Math.floor(Math.random() * pool.length)];
      const s2 = pool[Math.floor(Math.random() * pool.length)];
      enemyQueue = ['VOID', 'VOID', s1, s2];
    } else if (enemy.isEliteOrBoss) {
      enemyQueue = generateBossCounterQueue(
        equippedSpells,
        enemy.mana,
        enemy.spellbook,
        enemy.elementBias
      );
    } else {
      enemyQueue = generateEnemyQueue(enemy.elementBias, enemy.mana);
    }

    const omens = ['FURY', 'ENRAGE', 'DRAIN', 'SHIELD', 'CURSE'];
    let initialOmen = omens[Math.floor(Math.random() * omens.length)];
    if (enemy.name === 'Amalgam-9, The Singularity Core') {
      initialOmen = 'DRAIN';
    }

    const updated = await prisma.gameSession.update({
      where: { id: sessionId },
      data: {
        phase: 'COMBAT',
        enemyName: enemy.name,
        enemyTier: enemy.tier,
        enemyMana: enemy.mana,
        enemyMaxHp: enemy.maxHp,
        enemyCurrentHp: enemy.currentHp,
        enemyAttackDamage: enemy.attackDamage,
        enemyStatusEffects: [],
        enemySpellbook: enemy.spellbook as any,
        enemyElementBias: enemy.elementBias as any,
        isEliteOrBoss: enemy.isEliteOrBoss,
        playerQueue: [],
        enemyQueue,
        enemyQueueRevealed: false,
        focusAbilityUsed: false,
        activeOmen: initialOmen,
        lastTurnSpells: [],
        voidElementsNextTurn: 0,
        revealQueueTurns: 0,
        combatTurn: 1,
        bossShieldShatteredTurns: 0,
        bossImmunities: [],
      },
      include: { tiles: true, spells: true },
    });
    return formatSession(updated);
  }

  if (targetTile.type === 'TREASURE' && !targetTile.cleared) {
    const treasureGrid = generateTreasureGrid(3);
    const savedGridData = session.tiles.map((t) => ({
      q: t.q,
      r: t.r,
      type: t.type,
      revealed: t.revealed,
      dangerNumber: t.dangerNumber,
      hasItem: t.hasItem,
      cleared: t.cleared,
    }));
    await prisma.tile.deleteMany({ where: { sessionId } });
    const updated = await prisma.gameSession.update({
      where: { id: sessionId },
      data: {
        phase: 'TREASURE',
        savedGrid: savedGridData as any,
        tiles: {
          create: Object.values(treasureGrid).map((tile) => ({
            q: tile.coord.q,
            r: tile.coord.r,
            type: tile.type as any,
            revealed: false,
            dangerNumber: tile.dangerNumber,
            hasItem: tile.hasItem,
          })),
        },
      },
      include: { tiles: true, spells: true },
    });
    return formatSession(updated);
  }

  if (targetTile.type === 'SHOP') {
    await generateShopSpellsForSession(sessionId, session.floor);
    const updated = await prisma.gameSession.update({
      where: { id: sessionId },
      data: { phase: 'SHOP', shopRerolled: false },
      include: { tiles: true, spells: true },
    });
    return formatSession(updated);
  }

  if (targetTile.type === 'REST' && !targetTile.cleared) {
    const updated = await prisma.gameSession.update({
      where: { id: sessionId },
      data: { phase: 'REST' },
      include: { tiles: true, spells: true },
    });
    return formatSession(updated);
  }

  if (targetTile.type === 'EVENT' && !targetTile.cleared) {
    const updated = await prisma.gameSession.update({
      where: { id: sessionId },
      data: { phase: 'EVENT' },
      include: { tiles: true, spells: true },
    });
    return formatSession(updated);
  }

  if (targetTile.type === 'KEY' && !targetTile.cleared) {
    await clearTileAndDecrementNeighbors(sessionId, targetTile.q, targetTile.r);

    const updated = await prisma.gameSession.update({
      where: { id: sessionId },
      data: {
        hasKey: true,
      },
      include: { tiles: true, spells: true },
    });
    return formatSession(updated);
  }

  if (targetTile.type === 'EXIT') {
    const updated = await prisma.gameSession.update({
      where: { id: sessionId },
      data: { phase: 'FLOOR_END' },
      include: { tiles: true, spells: true },
    });
    return formatSession(updated);
  }

  const final = await prisma.gameSession.findUnique({
    where: { id: sessionId },
    include: { tiles: true, spells: true },
  });
  return formatSession(final);
}

// ── Submit Sequence (Server-side combat resolution) ───────────────────────────

export async function submitSequence(
  sessionId: string,
  playerSequence: (CardElement | null)[],
  injectedSpares: CardElement[]  // Spare elements the player chose to inject this turn
) {
  const session = await prisma.gameSession.findUnique({
    where: { id: sessionId },
    include: { spells: true },
  });

  if (!session || session.phase !== 'COMBAT') return null;

  const spareElements = parseSpareElements(session.spareElements);
  const equippedSpells = (session.spells ?? []).filter((s) => s.equipped).map(mapSpellFromDB);
  const existingEffects = (session.enemyStatusEffects as unknown as StatusEffect[]) ?? [];
  const enemyQueue = (session.enemyQueue as CardElement[]) ?? [];

  // 1. Tick status effects (BURN ticks, decrement turns)
  const { tickDamage, remainingEffects } = tickStatusEffects(existingEffects);

  // 2. Validate and consume injected spare elements from inventory
  const newSpares = consumeFromSpareElements(spareElements, injectedSpares);

  // 3. Resolve clash with activeOmen and focus states
  const clash = resolveClash(
    playerSequence,
    enemyQueue,
    session.playerMana ?? 4,
    equippedSpells,
    session.enemyAttackDamage ?? 10,
    Math.max(0, (session.enemyCurrentHp ?? 0) - tickDamage),
    session.passives,
    remainingEffects,
    session.activeOmen,
    session.focusAbilityUsed,
    session.playerClass,
    session.lastTurnSpells,
    session.floor
  );

  // Amalgam-9 Element Immunities Negation
  if (session.enemyName === 'Amalgam-9, The Singularity Core') {
    const immunities = session.bossImmunities as string[];
    for (const ts of clash.triggeredSpells) {
      const spell = equippedSpells.find((s) => s.name === ts.name);
      if (spell) {
        const isImmune = spell.recipe.some((el) => immunities.includes(el));
        if (isImmune) {
          clash.totalEnemyDamage -= ts.damage;
          ts.damage = 0;
        }
      }
    }
    clash.totalEnemyDamage = Math.max(0, clash.totalEnemyDamage);
  }

  // 4. Apply passive bonuses to spell damage
  let totalEnemyDamage = clash.totalEnemyDamage + tickDamage;
  // RAGE_BONUS: FIRE spell damage +25%
  if (session.passives.includes('RAGE_BONUS')) {
    for (const ts of clash.triggeredSpells) {
      const spell = equippedSpells.find((s) => s.name === ts.name);
      if (spell?.recipe.includes('FIRE')) {
        totalEnemyDamage += Math.floor(ts.damage * 0.25);
      }
    }
  }
  // ARCANE_MASTERY: AIR spell damage ×1.5
  if (session.passives.includes('ARCANE_MASTERY')) {
    for (const ts of clash.triggeredSpells) {
      const spell = equippedSpells.find((s) => s.name === ts.name);
      if (spell?.recipe.includes('AIR')) {
        totalEnemyDamage += Math.floor(ts.damage * 0.5);
      }
    }
  }

  // Baron Thalassor Damage Shield & Shatter Scaling
  let nextBossShieldShatteredTurns = session.bossShieldShatteredTurns;
  if (session.enemyName === 'Baron Thalassor, The Sunken Bulwark') {
    if (session.bossShieldShatteredTurns > 0) {
      totalEnemyDamage = totalEnemyDamage * 2;
      nextBossShieldShatteredTurns = Math.max(0, session.bossShieldShatteredTurns - 1);
    } else {
      totalEnemyDamage = Math.floor(totalEnemyDamage * 0.5);
    }

    const triggersCount = clash.triggeredSpells.length;
    if (triggersCount >= 3) {
      nextBossShieldShatteredTurns = 2;
    }
  }

  const newEnemyHp = Math.max(0, (session.enemyCurrentHp ?? 0) - totalEnemyDamage);

  // Amalgam-9 Build New Immunities
  let nextImmunities = [...(session.bossImmunities as string[])];
  if (session.enemyName === 'Amalgam-9, The Singularity Core') {
    for (const ts of clash.triggeredSpells) {
      if (ts.damage > 0) {
        const spell = equippedSpells.find((s) => s.name === ts.name);
        if (spell) {
          for (const el of spell.recipe) {
            if (!nextImmunities.includes(el)) {
              nextImmunities.push(el);
            }
          }
        }
      }
    }
  }
  let newPlayerHp = session.currentHp;

  // 5. Apply player damage (to HP directly, Vigor removed)
  if (!isFrozen(remainingEffects)) {
    newPlayerHp = Math.max(0, session.currentHp - clash.totalPlayerDamage);
  }

  // 6. Merge status effects onto enemy
  const newEffects = mergeStatusEffects(remainingEffects, clash.newStatusEffects);

  // 7. Bloodlust: heal 5 HP on kill
  if (newEnemyHp <= 0 && session.passives.includes('BLOODLUST')) {
    newPlayerHp = Math.min(session.maxHp, newPlayerHp + 5);
  }

  // 8. Focus Bar Calculations (calculated early so we can pass to victory)
  const counteredCount = clash.slots.filter((s) => s.result === 'COUNTER').length;
  const spellsCount = clash.triggeredSpells.length;
  const damageTaken = clash.totalPlayerDamage > 0 ? 1 : 0;
  
  // If ultimate was used this turn, starting Focus for this calculation is 0 (as pips were spent)
  const basePips = session.focusAbilityUsed ? 0 : (session.focusPips ?? 0);
  const newPips = Math.min(5, Math.max(0, basePips + counteredCount + spellsCount - damageTaken));

  console.log('--- FOCUS PIP CALCULATION ---');
  console.log('clash.slots results:', clash.slots.map(s => s.result));
  console.log('counteredCount:', counteredCount);
  console.log('spellsCount:', spellsCount);
  console.log('damageTaken:', damageTaken);
  console.log('basePips:', basePips);
  console.log('newPips:', newPips);
  console.log('-----------------------------');

  // 9. Check enemy defeat
  if (newEnemyHp <= 0) {
    return await resolveVictory(sessionId, session, newPlayerHp, clash, injectedSpares, newPips);
  }

  // 10. Check player defeat
  if (newPlayerHp <= 0) {
    const updated = await prisma.gameSession.update({
      where: { id: sessionId },
      data: { phase: 'GAMEOVER', currentHp: 0, spareElements: newSpares as any },
      include: { tiles: true, spells: true },
    });
    return { ...formatSession(updated), lastClash: clash };
  }

  // 11. Omen Punishments (applied if damage not negated)
  let updatedEnemyMana = session.enemyMana ?? 4;
  if (session.activeOmen === 'FURY' && !clash.enemyDamageNegated) {
    updatedEnemyMana = Math.min(8, updatedEnemyMana + 1);
  }
  let nextVoidElements = 0;
  if (session.activeOmen === 'CURSE' && !clash.enemyDamageNegated) {
    nextVoidElements = 1;
  }

  // Rotate Active Omen
  const omens = ['FURY', 'ENRAGE', 'DRAIN', 'SHIELD', 'CURSE'];
  let nextOmen = omens[Math.floor(Math.random() * omens.length)];
  if (session.enemyName === 'Sol-Inured Skimmer, The Dune Weaver' && !clash.enemyDamageNegated) {
    nextOmen = 'FURY';
  } else if (session.enemyName === 'Amalgam-9, The Singularity Core') {
    nextOmen = 'DRAIN';
  }

  // Restore playerMana for Wizard if ultimate was used
  let nextPlayerMana = session.playerMana;
  if (session.focusAbilityUsed && session.playerClass === 'WIZARD') {
    nextPlayerMana = Math.max(4, session.playerMana - 1);
  }

  // Handle Overseer queue reveal duration countdown
  let nextRevealTurns = session.revealQueueTurns ?? 0;
  let nextQueueRevealed = session.enemyQueueRevealed;
  if (nextRevealTurns > 0) {
    nextRevealTurns -= 1;
    if (nextRevealTurns === 0) {
      nextQueueRevealed = false;
    }
  }

  // 12. Generate next enemy queue using updated enemy mana
  let nextEnemyQueue: CardElement[];
  if (session.enemyName === 'Amalgam-9, The Singularity Core') {
    const pool: CardElement[] = ['FIRE', 'WATER', 'AIR', 'EARTH', 'VOID'];
    const s1 = pool[Math.floor(Math.random() * pool.length)];
    const s2 = pool[Math.floor(Math.random() * pool.length)];
    nextEnemyQueue = ['VOID', 'VOID', s1, s2];
  } else if (session.isEliteOrBoss) {
    nextEnemyQueue = generateBossCounterQueue(
      equippedSpells,
      updatedEnemyMana,
      (session.enemySpellbook as any[]) ?? [],
      (session.enemyElementBias as any) ?? {}
    );
  } else {
    nextEnemyQueue = generateEnemyQueue(
      (session.enemyElementBias as Partial<Record<CardElement, number>>) ?? {},
      updatedEnemyMana
    );
  }

  const nextCombatTurn = (session.combatTurn ?? 0) + 1;

  // 13. Update session
  const updated = await prisma.gameSession.update({
    where: { id: sessionId },
    data: {
      currentHp: newPlayerHp,
      enemyCurrentHp: newEnemyHp,
      enemyStatusEffects: newEffects as any,
      enemyQueue: nextEnemyQueue,
      playerQueue: [],
      spareElements: newSpares as any,
      focusPips: newPips,
      focusAbilityUsed: false,
      activeOmen: nextOmen,
      lastTurnSpells: clash.triggeredSpells.map((s) => s.name),
      voidElementsNextTurn: nextVoidElements,
      playerMana: nextPlayerMana,
      revealQueueTurns: nextRevealTurns,
      enemyQueueRevealed: nextQueueRevealed,
      enemyMana: updatedEnemyMana,
      combatTurn: nextCombatTurn,
      bossShieldShatteredTurns: nextBossShieldShatteredTurns,
      bossImmunities: nextImmunities,
    },
    include: { tiles: true, spells: true },
  });

  return { ...formatSession(updated), lastClash: clash };
}

// ── Victory Resolution ────────────────────────────────────────────────────────

async function resolveVictory(
  sessionId: string,
  session: any,
  newPlayerHp: number,
  clashResult: any,
  injectedSpares: CardElement[],
  newPips: number
) {
  const { xp, gold } = getEnemyRewards(session.floor, 'COMMON');
  let goldReward = gold;

  if (session.passives.includes('CALCULATED_RISK') && session.currentHp < session.maxHp / 2) {
    goldReward *= 2;
  }

  const newXP = session.currentXP + xp;
  const { newLevel, didLevelUp } = calculateLevelUp(newXP, session.level);

  // Award spare elements based on enemy type
  const enemyBias = (session.enemyElementBias as Partial<Record<CardElement, number>>) ?? {};
  const topElement = (Object.entries(enemyBias).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))[0]?.[0] ?? 'FIRE') as CardElement;
  const spareDrops: CardElement[] = [topElement, topElement]; // 2 spares matching enemy theme
  const currentSpares = parseSpareElements(session.spareElements);
  const newSpares = addToSpareElements(
    consumeFromSpareElements(currentSpares, injectedSpares),
    spareDrops
  );

  // Generate spell reward choices
  const spellChoices = generateSpellRewardChoices(session.playerClass, session.floor);

  // Restore playerMana for Wizard if ultimate was used
  let nextPlayerMana = session.playerMana;
  if (session.focusAbilityUsed && session.playerClass === 'WIZARD') {
    nextPlayerMana = Math.max(4, session.playerMana - 1);
  }

  // Clear tile and decrement neighbors
  await clearTileAndDecrementNeighbors(sessionId, session.posX, session.posY);

  const isBoss =
    session.enemyName === 'Sol-Inured Skimmer, The Dune Weaver' ||
    session.enemyName === 'Baron Thalassor, The Sunken Bulwark' ||
    session.enemyName === 'Amalgam-9, The Singularity Core';

  const updated = await prisma.gameSession.update({
    where: { id: sessionId },
    data: {
      phase: 'SPELL_REWARD',
      currentHp: newPlayerHp,
      gold: { increment: goldReward },
      currentXP: newXP,
      level: newLevel,
      enemyCurrentHp: 0,
      spareElements: newSpares as any,
      playerMana: nextPlayerMana,
      hasKey: isBoss ? true : undefined,
      // Reset combat states
      focusPips: newPips,
      focusAbilityUsed: false,
      activeOmen: null,
      lastTurnSpells: [],
      voidElementsNextTurn: 0,
      revealQueueTurns: 0,
      enemyQueueRevealed: false,
      pendingLevelUpChoices: {
        type: 'SPELL_REWARDS',
        choices: spellChoices,
        didLevelUp,
        xpGained: xp,
        goldGained: goldReward,
        spareDrops,
      } as any,
    },
    include: { tiles: true, spells: true },
  });

  const formatted = formatSession(updated);
  return {
    ...formatted,
    phase: 'COMBAT',
    nextPhase: 'SPELL_REWARD',
    xpGained: xp,
    goldGained: goldReward,
    didLevelUp,
    lastClash: clashResult,
  };
}

// ── Claim Post-Combat Spell Reward ────────────────────────────────────────────

export async function claimPostCombatRewardSpell(sessionId: string, choiceIndex: number) {
  const session = await prisma.gameSession.findUnique({ where: { id: sessionId } });
  if (!session || session.phase !== 'SPELL_REWARD') return null;

  const pending = session.pendingLevelUpChoices as any;
  if (!pending || pending.type !== 'SPELL_REWARDS') return null;

  // Add chosen spell to player's library (not equipped by default — let them manage)
  if (choiceIndex !== -1 && pending.choices?.[choiceIndex]) {
    const chosen = pending.choices[choiceIndex];
    await prisma.spell.create({
      data: {
        sessionId,
        name: chosen.name,
        recipe: chosen.recipe,
        baseDamage: chosen.baseDamage,
        isAdvanced: chosen.isAdvanced ?? false,
        isUpgraded: false,
        equipped: false,
        location: 'LIBRARY',
      },
    });
  }

  if (pending.didLevelUp) {
    const levelUpChoices = pickLevelUpChoices(session.playerClass as PlayerClass, session.passives);
    const updated = await prisma.gameSession.update({
      where: { id: sessionId },
      data: { phase: 'LEVELUP', pendingLevelUpChoices: levelUpChoices as any },
      include: { tiles: true, spells: true },
    });
    return formatSession(updated);
  } else {
    const updated = await prisma.gameSession.update({
      where: { id: sessionId },
      data: { phase: 'EXPLORING', pendingLevelUpChoices: null as any },
      include: { tiles: true, spells: true },
    });
    return formatSession(updated);
  }
}

export async function claimRewardSpellAndReplace(
  sessionId: string,
  choiceIndex: number,
  outgoingSpellId: string
) {
  const session = await prisma.gameSession.findUnique({
    where: { id: sessionId },
    include: { spells: true },
  });
  if (!session || session.phase !== 'SPELL_REWARD') return null;

  const pending = session.pendingLevelUpChoices as any;
  if (!pending || pending.type !== 'SPELL_REWARDS') return null;

  if (choiceIndex !== -1 && pending.choices?.[choiceIndex]) {
    const chosen = pending.choices[choiceIndex];

    const outgoing = session.spells.find((s) => s.id === outgoingSpellId && s.equipped);
    if (!outgoing) return null;

    const advancedCount = session.spells.filter((s) => s.equipped && s.isAdvanced).length;
    const isIncomingAdvanced = chosen.isAdvanced ?? false;
    const nextAdvancedCount = advancedCount - (outgoing.isAdvanced ? 1 : 0) + (isIncomingAdvanced ? 1 : 0);
    if (nextAdvancedCount > 2) return { error: 'MAX_ADVANCED' } as any;

    await prisma.$transaction([
      prisma.spell.update({
        where: { id: outgoingSpellId },
        data: { equipped: false, location: 'LIBRARY' },
      }),
      prisma.spell.create({
        data: {
          sessionId,
          name: chosen.name,
          recipe: chosen.recipe,
          baseDamage: chosen.baseDamage,
          isAdvanced: isIncomingAdvanced,
          isUpgraded: false,
          equipped: true,
          location: 'LOADOUT',
        },
      }),
    ]);
  }

  if (pending.didLevelUp) {
    const levelUpChoices = pickLevelUpChoices(session.playerClass as PlayerClass, session.passives);
    const updated = await prisma.gameSession.update({
      where: { id: sessionId },
      data: { phase: 'LEVELUP', pendingLevelUpChoices: levelUpChoices as any },
      include: { tiles: true, spells: true },
    });
    return formatSession(updated);
  } else {
    const updated = await prisma.gameSession.update({
      where: { id: sessionId },
      data: { phase: 'EXPLORING', pendingLevelUpChoices: null as any },
      include: { tiles: true, spells: true },
    });
    return formatSession(updated);
  }
}

// ── Level Up ──────────────────────────────────────────────────────────────────

export async function chooseLevelUpPassive(sessionId: string, passive: PassiveAbility) {
  const session = await prisma.gameSession.findUnique({ where: { id: sessionId } });
  if (!session || session.phase !== 'LEVELUP') return null;

  const deltas = applyPassiveStat(passive);

  const updated = await prisma.gameSession.update({
    where: { id: sessionId },
    data: {
      phase: 'EXPLORING',
      passives: { push: passive },
      pendingLevelUpChoices: { set: [] as any },
      maxHp: deltas.maxHpDelta > 0 ? { increment: deltas.maxHpDelta } : undefined,
      currentHp: deltas.maxHpDelta > 0 ? { increment: deltas.maxHpDelta } : undefined,
      // Mana upgrades handled via relics/items
    },
    include: { tiles: true, spells: true },
  });
  return formatSession(updated);
}

// ── Equip / Unequip Spells ────────────────────────────────────────────────────

export async function equipSpell(sessionId: string, spellId: string) {
  const session = await prisma.gameSession.findUnique({
    where: { id: sessionId },
    include: { spells: true },
  });
  if (!session) return null;

  const equippedSpells = session.spells.filter((s) => s.equipped);
  const advancedCount = equippedSpells.filter((s) => s.isAdvanced).length;
  const spell = session.spells.find((s) => s.id === spellId);
  if (!spell) return null;

  // Enforce limits: max 4 equipped, max 2 advanced
  if (equippedSpells.length >= 4) return { error: 'MAX_SLOTS' };
  if (spell.isAdvanced && advancedCount >= 2) return { error: 'MAX_ADVANCED' };

  await prisma.spell.update({
    where: { id: spellId },
    data: { equipped: true, location: 'LOADOUT' },
  });

  const updated = await prisma.gameSession.findUnique({
    where: { id: sessionId },
    include: { tiles: true, spells: true },
  });
  return formatSession(updated);
}

export async function unequipSpell(sessionId: string, spellId: string) {
  const session = await prisma.gameSession.findUnique({
    where: { id: sessionId },
    include: { spells: true },
  });
  if (!session) return null;

  const equippedCount = session.spells.filter((s) => s.equipped).length;
  if (equippedCount <= 4) return { error: 'MIN_SLOTS' }; // must keep at least 4

  await prisma.spell.update({
    where: { id: spellId },
    data: { equipped: false, location: 'LIBRARY' },
  });

  const updated = await prisma.gameSession.findUnique({
    where: { id: sessionId },
    include: { tiles: true, spells: true },
  });
  return formatSession(updated);
}

// ── Swap Equipped Spell (when loadout is full) ───────────────────────────────

export async function replaceEquippedSpell(sessionId: string, outgoingSpellId: string, incomingSpellId: string) {
  const session = await prisma.gameSession.findUnique({
    where: { id: sessionId },
    include: { spells: true },
  });
  if (!session) return null;

  const outgoing = session.spells.find((s) => s.id === outgoingSpellId && s.equipped);
  const incoming = session.spells.find((s) => s.id === incomingSpellId && !s.equipped);
  if (!outgoing || !incoming) return null;

  // Enforce limit: max 2 advanced spells
  const advancedCount = session.spells.filter((s) => s.equipped && s.isAdvanced).length;
  const nextAdvancedCount = advancedCount - (outgoing.isAdvanced ? 1 : 0) + (incoming.isAdvanced ? 1 : 0);
  if (nextAdvancedCount > 2) return { error: 'MAX_ADVANCED' } as any;

  // Execute both updates in a transaction
  await prisma.$transaction([
    prisma.spell.update({
      where: { id: outgoingSpellId },
      data: { equipped: false, location: 'LIBRARY' },
    }),
    prisma.spell.update({
      where: { id: incomingSpellId },
      data: { equipped: true, location: 'LOADOUT' },
    }),
  ]);

  const updated = await prisma.gameSession.findUnique({
    where: { id: sessionId },
    include: { tiles: true, spells: true },
  });
  return formatSession(updated);
}

// ── Shop ──────────────────────────────────────────────────────────────────────

async function generateShopSpellsForSession(sessionId: string, floor: number) {
  // Remove old shop spells
  await prisma.spell.deleteMany({ where: { sessionId, location: 'SHOP' } });

  const session = await prisma.gameSession.findUnique({
    where: { id: sessionId },
    select: { playerClass: true },
  });
  const playerClass = session?.playerClass ?? 'BERSERKER';

  const spellChoices = generateSpellRewardChoices(playerClass, floor);

  // 3 spells + 2 spare element bundles
  await prisma.spell.createMany({
    data: spellChoices.map((s) => ({
      sessionId,
      name: s.name,
      recipe: s.recipe as any,
      baseDamage: s.baseDamage,
      isAdvanced: s.isAdvanced,
      isUpgraded: false,
      equipped: false,
      location: 'SHOP',
    })),
  });
}

export async function purchaseShopSpell(sessionId: string, spellId: string) {
  const session = await prisma.gameSession.findUnique({
    where: { id: sessionId },
    include: { spells: true },
  });
  if (!session || session.phase !== 'SHOP') return null;

  const spell = session.spells.find((s) => s.id === spellId && s.location === 'SHOP');
  if (!spell) return null;

  const cost = spell.isAdvanced ? 80 : 40;
  if (session.gold < cost) return null;

  await prisma.spell.update({
    where: { id: spellId },
    data: { location: 'LIBRARY', equipped: false },
  });

  await prisma.gameSession.update({
    where: { id: sessionId },
    data: { gold: { decrement: cost } },
  });

  const updated = await prisma.gameSession.findUnique({
    where: { id: sessionId },
    include: { tiles: true, spells: true },
  });
  return formatSession(updated);
}

export async function purchaseSpareElements(
  sessionId: string,
  element: CardElement,
  amount: number
) {
  const session = await prisma.gameSession.findUnique({ where: { id: sessionId } });
  if (!session || session.phase !== 'SHOP') return null;

  const costPerElement = 10;
  const totalCost = costPerElement * amount;
  if (session.gold < totalCost) return null;

  if (element === 'VOID') return null; // VOID is not a spare element
  const current = parseSpareElements(session.spareElements);
  const updated_spares = { ...current, [element]: (current[element as keyof typeof current] ?? 0) + amount };

  const updated = await prisma.gameSession.update({
    where: { id: sessionId },
    data: {
      gold: { decrement: totalCost },
      spareElements: updated_spares as any,
    },
    include: { tiles: true, spells: true },
  });
  return formatSession(updated);
}

export async function sellLibrarySpell(sessionId: string, spellId: string) {
  const session = await prisma.gameSession.findUnique({
    where: { id: sessionId },
    include: { spells: true },
  });
  if (!session || session.phase !== 'SHOP') return null;

  // Must keep at least 4 spells total
  const ownedSpells = session.spells.filter((s) => s.location !== 'SHOP');
  if (ownedSpells.length <= 4) return null;

  const spell = session.spells.find((s) => s.id === spellId && s.location !== 'SHOP');
  if (!spell || spell.equipped) return null; // Can't sell equipped spells

  const sellValue = spell.isAdvanced ? 35 : 15;
  await prisma.spell.delete({ where: { id: spellId } });

  const updated = await prisma.gameSession.update({
    where: { id: sessionId },
    data: { gold: { increment: sellValue } },
    include: { tiles: true, spells: true },
  });
  return formatSession(updated);
}

export async function exitShop(sessionId: string) {
  const session = await prisma.gameSession.findUnique({ where: { id: sessionId } });
  if (!session) return null;

  await clearTileAndDecrementNeighbors(sessionId, session.posX, session.posY);

  const updated = await prisma.gameSession.update({
    where: { id: sessionId },
    data: {
      phase: 'EXPLORING',
    },
    include: { tiles: true, spells: true },
  });
  return formatSession(updated);
}

// ── Rest Room ─────────────────────────────────────────────────────────────────

export async function restHeal(sessionId: string) {
  const session = await prisma.gameSession.findUnique({ where: { id: sessionId } });
  if (!session || session.phase !== 'REST') return null;

  const healAmount = Math.floor(session.maxHp * 0.5);

  await clearTileAndDecrementNeighbors(sessionId, session.posX, session.posY);

  const updated = await prisma.gameSession.update({
    where: { id: sessionId },
    data: {
      phase: 'EXPLORING',
      currentHp: Math.min(session.maxHp, session.currentHp + healAmount),
    },
    include: { tiles: true, spells: true },
  });
  return formatSession(updated);
}

export async function restUpgradeSpell(sessionId: string, spellId: string) {
  const session = await prisma.gameSession.findUnique({
    where: { id: sessionId },
    include: { spells: true },
  });
  if (!session || session.phase !== 'REST') return null;

  const spell = session.spells.find((s) => s.id === spellId && s.location !== 'SHOP');
  if (!spell || spell.isUpgraded) return null;

  await prisma.spell.update({
    where: { id: spellId },
    data: { isUpgraded: true },
  });

  await clearTileAndDecrementNeighbors(sessionId, session.posX, session.posY);

  const updated = await prisma.gameSession.update({
    where: { id: sessionId },
    data: {
      phase: 'EXPLORING',
    },
    include: { tiles: true, spells: true },
  });
  return formatSession(updated);
}

// ── Event ─────────────────────────────────────────────────────────────────────

export async function handleEvent(sessionId: string, choice: string) {
  const session = await prisma.gameSession.findUnique({ where: { id: sessionId } });
  if (!session || session.phase !== 'EVENT') return null;

  await clearTileAndDecrementNeighbors(sessionId, session.posX, session.posY);

  let updateData: any = {
    phase: 'EXPLORING',
  };
  if (choice === 'INTIMIDATE') {
    updateData.gold = { increment: 20 };
  } else if (choice === 'RITUAL') {
    updateData.maxHp = { increment: 10 };
    updateData.currentHp = { increment: 10 };
  }

  const updated = await prisma.gameSession.update({
    where: { id: sessionId },
    data: updateData,
    include: { tiles: true, spells: true },
  });
  return formatSession(updated);
}

// ── Treasure Room ─────────────────────────────────────────────────────────────

export async function clickTreasureTile(sessionId: string, coord: AxialCoord) {
  const session = await prisma.gameSession.findUnique({
    where: { id: sessionId },
    include: { tiles: true },
  });
  if (!session || session.phase !== 'TREASURE') return null;

  const targetTile = session.tiles.find((t) => t.q === coord.q && t.r === coord.r);
  if (!targetTile || targetTile.revealed) return null;

  if (targetTile.type === 'WALL') {
    const savedGridArray = (session.savedGrid as any[]) || [];
    const restoredTiles = savedGridArray.map((t) =>
      t.q === session.posX && t.r === session.posY ? { ...t, cleared: true } : t
    );
    const neighbors = getNeighbors({ q: session.posX, r: session.posY });
    for (const n of neighbors) {
      const idx = restoredTiles.findIndex((t) => t.q === n.q && t.r === n.r);
      if (idx !== -1 && restoredTiles[idx].dangerNumber > 0) {
        restoredTiles[idx].dangerNumber -= 1;
      }
    }
    const newHp = Math.max(0, session.currentHp - 10);
    const newPhase = newHp <= 0 ? 'GAMEOVER' : 'EXPLORING';
    await prisma.tile.deleteMany({ where: { sessionId } });
    await prisma.gameSession.update({
      where: { id: sessionId },
      data: {
        phase: newPhase,
        currentHp: newHp,
        savedGrid: [],
        tiles: {
          create: restoredTiles.map((tile) => ({
            q: tile.q, r: tile.r, type: tile.type, revealed: tile.revealed,
            dangerNumber: tile.dangerNumber, hasItem: tile.hasItem,
            cleared: tile.cleared ?? false,
          })),
        },
      },
    });
    const final = await prisma.gameSession.findUnique({
      where: { id: sessionId },
      include: { tiles: true, spells: true },
    });
    return formatSession(final);
  }

  await prisma.tile.update({ where: { id: targetTile.id }, data: { revealed: true } });
  const updated = await prisma.gameSession.update({
    where: { id: sessionId },
    data: { gold: { increment: 5 } },
    include: { tiles: true, spells: true },
  });
  return formatSession(updated);
}

export async function exitTreasureRoom(sessionId: string) {
  const session = await prisma.gameSession.findUnique({ where: { id: sessionId } });
  if (!session || session.phase !== 'TREASURE') return null;

  const savedGridArray = (session.savedGrid as any[]) || [];
  const restoredTiles = savedGridArray.map((t) =>
    t.q === session.posX && t.r === session.posY ? { ...t, cleared: true } : t
  );
  const neighbors = getNeighbors({ q: session.posX, r: session.posY });
  for (const n of neighbors) {
    const idx = restoredTiles.findIndex((t) => t.q === n.q && t.r === n.r);
    if (idx !== -1 && restoredTiles[idx].dangerNumber > 0) {
      restoredTiles[idx].dangerNumber -= 1;
    }
  }
  await prisma.tile.deleteMany({ where: { sessionId } });
  await prisma.gameSession.update({
    where: { id: sessionId },
    data: {
      phase: 'EXPLORING',
      savedGrid: [],
      tiles: {
        create: restoredTiles.map((tile) => ({
          q: tile.q, r: tile.r, type: tile.type, revealed: tile.revealed,
          dangerNumber: tile.dangerNumber, hasItem: tile.hasItem,
          cleared: tile.cleared ?? false,
        })),
      },
    },
  });
  const final = await prisma.gameSession.findUnique({
    where: { id: sessionId },
    include: { tiles: true, spells: true },
  });
  return formatSession(final);
}

// ── Floor Descent ─────────────────────────────────────────────────────────────

export async function descendToNextFloor(sessionId: string) {
  const session = await prisma.gameSession.findUnique({ where: { id: sessionId } });
  if (!session || session.phase !== 'FLOOR_END') return null;

  const newFloor = session.floor + 1;
  const nextBiome = newFloor <= 2 ? 'SIROCCO' : newFloor <= 4 ? 'SEPULCHER' : 'VOID_SCAUR';
  const grid = generateGrid(3, nextBiome, newFloor);

  await prisma.tile.deleteMany({ where: { sessionId } });

  const blessingHeal = session.passives.includes('BLESSING') ? Math.floor(session.maxHp * 0.1) : 0;
  const floorStartHeal = Math.floor(session.maxHp * 0.1);
  const newHp = Math.min(session.maxHp, session.currentHp + floorStartHeal + blessingHeal);

  const updated = await prisma.gameSession.update({
    where: { id: sessionId },
    data: {
      phase: 'EXPLORING',
      floor: newFloor,
      biome: nextBiome,
      posX: 0,
      posY: 0,
      hasKey: false,
      currentHp: newHp,
      tiles: {
        create: Object.values(grid).map((tile) => ({
          q: tile.coord.q,
          r: tile.coord.r,
          type: tile.type as any,
          revealed: tile.revealed,
          dangerNumber: tile.dangerNumber,
          cleared: tile.cleared ?? false,
          isMirage: tile.isMirage ?? false,
          calcifiedHits: tile.calcifiedHits ?? 0,
        })),
      },
    },
    include: { tiles: true, spells: true },
  });

  return formatSession(updated);
}

export async function stayOnFloor(sessionId: string) {
  const session = await prisma.gameSession.findUnique({ where: { id: sessionId } });
  if (!session || session.phase !== 'FLOOR_END') return null;

  const updated = await prisma.gameSession.update({
    where: { id: sessionId },
    data: { phase: 'EXPLORING' },
    include: { tiles: true, spells: true },
  });
  return formatSession(updated);
}

export async function useItem(sessionId: string, itemName: string) {
  const session = await prisma.gameSession.findUnique({ where: { id: sessionId } });
  if (!session || itemName !== 'HEALTH_POTION') return null;

  const inv = session.inventory as string[];
  const idx = inv.indexOf(itemName);
  if (idx === -1) return null;
  inv.splice(idx, 1);

  const updated = await prisma.gameSession.update({
    where: { id: sessionId },
    data: {
      inventory: inv,
      currentHp: Math.min(session.maxHp, session.currentHp + 25),
    },
    include: { tiles: true, spells: true },
  });
  return formatSession(updated);
}

export async function unleashUltimate(sessionId: string) {
  const session = await prisma.gameSession.findUnique({
    where: { id: sessionId },
  });
  if (!session || session.phase !== 'COMBAT') return null;
  if (session.focusPips < 5 || session.focusAbilityUsed) return null;

  let updatedMana = session.playerMana;
  let activeOmen = session.activeOmen;
  let enemyQueueRevealed = session.enemyQueueRevealed;
  let revealQueueTurns = session.revealQueueTurns ?? 0;
  let updatedEnemyHp = session.enemyCurrentHp ?? 0;

  if (session.playerClass === 'BERSERKER') {
    updatedEnemyHp = Math.max(0, updatedEnemyHp - 20);
  } else if (session.playerClass === 'WIZARD') {
    updatedMana = session.playerMana + 1;
  } else if (session.playerClass === 'OVERSEER') {
    enemyQueueRevealed = true;
    revealQueueTurns = 2;
  }

  // If enemy is defeated by Berserker ultimate, resolve victory immediately!
  if (session.playerClass === 'BERSERKER' && updatedEnemyHp <= 0 && (session.enemyCurrentHp ?? 0) > 0) {
    const dummyClash = {
      slots: [],
      triggeredSpells: [{ name: 'Ignite Splash', damage: 20, enemyHpAfter: 0, startIndex: 0, recipeLength: 1 }],
      totalEnemyDamage: 20,
      totalPlayerDamage: 0,
      enemyDamageNegated: true,
      counterPercent: 1.0,
      newStatusEffects: [],
      description: 'Enemy incinerated by Berserker ultimate Ignite!',
      enemyHpAtStart: session.enemyCurrentHp ?? 0,
      basicStrikeDamage: 0,
      staleTurns: 0,
    };
    return await resolveVictory(sessionId, session, session.currentHp, dummyClash, [], 0);
  }

  const updated = await prisma.gameSession.update({
    where: { id: sessionId },
    data: {
      focusPips: 0,
      focusAbilityUsed: true,
      playerMana: updatedMana,
      enemyQueueRevealed,
      revealQueueTurns,
      enemyCurrentHp: updatedEnemyHp,
    },
    include: { tiles: true, spells: true },
  });

  return formatSession(updated);
}

export async function cheatFocus(sessionId: string) {
  const updated = await prisma.gameSession.update({
    where: { id: sessionId },
    data: { focusPips: 5 },
    include: { tiles: true, spells: true },
  });
  return formatSession(updated);
}
