'use server';

import prisma from './prisma';
import { generateGrid, generateDeck, getRandomEnemy, generateTreasureGrid } from './gameLogic';
import { resolveQueueClash, tickStatusEffects, mergeStatusEffects, isFrozen, isPushed, getChainBonus } from './combatEngine';
import { calculateLevelUp, getEnemyRewards, getXPToNextLevel, pickLevelUpChoices, applyPassiveStat } from './xpSystem';
import { AxialCoord, Tile as ClientTile, Card as ClientCard, GamePhase, PlayerClass, TileType, StatusEffect, PassiveAbility } from './types';
import { coordToString, getDistance } from './hexMath';
import { shuffle } from 'lodash';
import { ALL_WILDCARDS, getWildcardInstance } from './wildcard';

// ── Helpers ────────────────────────────────────────────────────────────────────

async function drawCards(sessionId: string, count: number): Promise<void> {
  // Move `count` cards from DECK → HAND. If deck runs dry, shuffle DISCARD → DECK first.
  let deckCards = await prisma.card.findMany({
    where: { sessionId, location: 'DECK' },
    take: count,
  });

  if (deckCards.length < count) {
    // Reshuffle discards
    await prisma.card.updateMany({ where: { sessionId, location: 'DISCARD' }, data: { location: 'DECK' } });
    deckCards = await prisma.card.findMany({ where: { sessionId, location: 'DECK' }, take: count });
  }

  if (deckCards.length > 0) {
    await prisma.card.updateMany({
      where: { id: { in: deckCards.map((c) => c.id) } },
      data: { location: 'HAND' },
    });
  }
}

function formatSession(session: any, forceCombat: boolean = false) {
  const grid: Record<string, ClientTile> = {};
  session.tiles.forEach((t: any) => {
    grid[coordToString({ q: t.q, r: t.r })] = {
      coord: { q: t.q, r: t.r },
      type: t.type as TileType,
      revealed: t.revealed,
      dangerNumber: t.dangerNumber,
      hasItem: t.hasItem,
    };
  });

  const allCards = session.deck.map((c: any) => ({
    id: c.id,
    element: c.element,
    rank: c.rank,
    isUpgraded: c.isUpgraded,
    isAsh: c.isAsh,
    isExhaust: c.isExhaust,
    currentUses: c.currentUses,
    maxUses: c.maxUses,
    specialModifier: c.specialModifier,
    location: c.location,
  }));

  const playerDeck = allCards.filter((c: any) => c.location === 'DECK');
  const playerHand = allCards.filter((c: any) => c.location === 'HAND');
  const shopCards = allCards.filter((c: any) => c.location === 'SHOP');

  const currentXP = session.currentXP ?? 0;
  const level = session.level ?? 1;

  const statusEffects = (session.enemyStatusEffects as StatusEffect[]) ?? [];

  const combatState = (session.phase === 'COMBAT' || forceCombat) ? {
    enemy: {
      id: 'current-enemy',
      name: session.enemyName || "Enemy",
      maxHp: session.enemyMaxHp,
      currentHp: session.enemyCurrentHp,
      attackDamage: session.enemyAttackDamage ?? 10,
      rewardRarity: 'COMMON' as 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY',
      statusEffects,
    },
    hand: playerHand,
    playerQueue: (session.playerQueue || []).map((id: string) => allCards.find((c: any) => c.id === id)).filter(Boolean),
    enemyQueue: session.enemyQueue || [],
    enemyQueueRevealed: session.enemyQueueRevealed ?? true,
    queueSlots: session.queueSlots ?? 4,
    maxVigor: session.maxVigor ?? 100,
    currentVigor: session.currentVigor ?? 100,
    lastClash: null,
  } : null;

  return {
    id: session.id,
    phase: session.phase as GamePhase,
    player: {
      maxHp: session.maxHp,
      currentHp: session.currentHp,
      gold: session.gold,
      class: session.playerClass as PlayerClass,
      relics: session.relics,
      passives: session.passives,
      deck: playerDeck,
      inventory: session.inventory || [],
      position: { q: session.posX, r: session.posY },
      torchRadius: session.torchRadius,
      floor: session.floor,
      hasKey: session.hasKey,
      xp: currentXP,
      level,
      xpToNextLevel: getXPToNextLevel(level),
      baseHandSize: session.baseHandSize,
    },
    grid,
    combatState,
    pendingLevelUpChoices: session.pendingLevelUpChoices ?? null,
    shopCards,
    shopRerolled: session.shopRerolled ?? false,
  };
}

// ── Initialize Game ────────────────────────────────────────────────────────────

export async function getRecentSessions(limit: number = 5) {
  const sessions = await prisma.gameSession.findMany({
    orderBy: { updatedAt: 'desc' },
    take: limit,
  });
  return sessions.map(s => ({
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
    include: { tiles: true, deck: true },
  });
  if (!session) return null;
  return formatSession(session);
}

export async function getFormattedSessionById(sessionId: string) {
  const session = await prisma.gameSession.findUnique({
    where: { id: sessionId },
    include: { tiles: true, deck: true },
  });
  if (!session) return null;
  return formatSession(session);
}

export async function generateShopCardsForSession(sessionId: string) {
  // Delete existing shop cards
  await prisma.card.deleteMany({
    where: { sessionId, location: 'SHOP' }
  });

  const elements = ['FIRE', 'WATER', 'AIR', 'EARTH'];

  const getRandomCardTier = () => {
    const r = Math.random();
    if (r < 0.50) {
      // Standard Rank 6-9
      return Math.floor(Math.random() * 4) + 6;
    } else if (r < 0.85) {
      // Limited Rank 10-13
      return Math.floor(Math.random() * 4) + 10;
    } else {
      // Legendary Rank 14
      return 14;
    }
  };

  const shopCardsData = [];

  for (let i = 0; i < 4; i++) {
    // 25% chance of wildcard in slot 4 (available on all floors for testing)
    const isWildcardSlot = i === 3 && Math.random() < 0.25;

    if (isWildcardSlot) {
      const randomWildcardClass = ALL_WILDCARDS[Math.floor(Math.random() * ALL_WILDCARDS.length)];
      const w = new randomWildcardClass();
      shopCardsData.push({
        element: 'FIRE' as any,
        rank: 0,
        maxUses: w.maxDurability,
        currentUses: w.maxDurability,
        isExhaust: false,
        location: 'SHOP' as any,
        specialModifier: {
          isWildcard: true,
          wildcardType: w.id,
          name: w.name,
          description: w.description,
          preferredClass: w.preferredClass,
        }
      });
    } else {
      const rank = getRandomCardTier();
      const element = elements[Math.floor(Math.random() * elements.length)];
      let maxUses = 4;
      let isExhaust = false;
      if (rank <= 5) { maxUses = 999; isExhaust = false; }
      else if (rank <= 9) { maxUses = 4; isExhaust = false; }
      else if (rank <= 13) { maxUses = 3; isExhaust = false; }
      else { maxUses = 2; isExhaust = true; }

      shopCardsData.push({
        element: element as any,
        rank,
        maxUses,
        currentUses: maxUses,
        isExhaust,
        location: 'SHOP' as any,
        specialModifier: {}
      });
    }
  }

  await prisma.card.createMany({
    data: shopCardsData.map(c => ({
      ...c,
      sessionId
    }))
  });
}

export async function initializeGame(playerClass: PlayerClass = 'BERSERKER') {
  const deck = generateDeck(playerClass);
  const grid = generateGrid(3);

  // Class-specific starting HP
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
      playerClass,
      maxHp,
      currentHp: maxHp,
      gold: 50,
      currentXP: 0,
      level: 1,
      relics: [],
      passives: [
        playerClass === 'BERSERKER' ? 'RAGE_BONUS' :
        playerClass === 'PALADIN' ? 'SACRED_GROUND' :
        playerClass === 'WIZARD' ? 'ARCANE_MASTERY' :
        'EXPLOIT_WEAKNESS'
      ],
      posX: 0,
      posY: 0,
      baseHandSize: 8,
      tiles: {
        create: Object.values(grid).map((tile) => ({
          q: tile.coord.q,
          r: tile.coord.r,
          type: tile.type as any,
          revealed: tile.revealed,
          dangerNumber: tile.dangerNumber,
        })),
      },
      deck: {
        create: deck.map((card) => ({
          element: card.element as any,
          rank: card.rank,
          maxUses: card.maxUses,
          currentUses: card.currentUses,
          isExhaust: card.isExhaust,
          location: 'DECK',
        })),
      },
    },
    include: { tiles: true, deck: true },
  });

  return formatSession(session);
}

// ── Move Player ────────────────────────────────────────────────────────────────

export async function movePlayer(sessionId: string, targetCoord: AxialCoord) {
  const session = await prisma.gameSession.findUnique({
    where: { id: sessionId },
    include: { tiles: true, deck: true },
  });

  if (!session || session.phase !== 'EXPLORING') return null;

  const distance = getDistance({ q: session.posX, r: session.posY }, targetCoord);
  if (distance > 1) return null;

  const targetTile = session.tiles.find((t) => t.q === targetCoord.q && t.r === targetCoord.r);
  if (!targetTile) return null;

  // Reveal + move
  await prisma.gameSession.update({
    where: { id: sessionId },
    data: {
      posX: targetCoord.q,
      posY: targetCoord.r,
      tiles: { update: { where: { id: targetTile.id }, data: { revealed: true } } },
    },
  });

  // ── Handle special tile types ─────────────────────────────────────────────
  if (targetTile.type === 'ENEMY') {
    const enemy = getRandomEnemy(session.floor);

    // Reset all cards to DECK, then deal hand
    await prisma.card.updateMany({ where: { sessionId }, data: { location: 'DECK' } });
    const handSize = session.baseHandSize + (session.passives.includes('LEYLINE') ? 1 : 0);
    await drawCards(sessionId, handSize);

    const extraHands = (session.passives.includes('BATTLE_FURY') || session.passives.includes('OVERLOAD')) ? 1 : 0;
    const extraDiscards = session.passives.includes('TACTICAL_INSIGHT') ? 1 : 0;

    const elements: ('FIRE'|'WATER'|'EARTH'|'AIR')[] = ['FIRE', 'WATER', 'EARTH', 'AIR'];
    const enemyQueue = Array.from({ length: 4 }).map(() => elements[Math.floor(Math.random() * elements.length)]);

    const updated = await prisma.gameSession.update({
      where: { id: sessionId },
      data: {
        phase: 'COMBAT',
        enemyName: enemy.name,
        enemyMaxHp: enemy.maxHp,
        enemyCurrentHp: enemy.currentHp,
        enemyAttackDamage: enemy.attackDamage,
        enemyStatusEffects: [],
        queueSlots: 4,
        maxVigor: session.maxHp, // Player's max Vigor is their max HP for now
        currentVigor: session.maxHp, // Start combat with full Vigor shield
        enemyQueue,
        enemyQueueRevealed: true,
        combatMultiplierBonus: 1.0,
      },
      include: { tiles: true, deck: true },
    });
    return formatSession(updated);
  }

  if (targetTile.type === 'TREASURE') {
    const treasureGrid = generateTreasureGrid(3);
    const savedGridData = session.tiles.map((t) => ({
      q: t.q,
      r: t.r,
      type: t.type,
      revealed: t.revealed,
      dangerNumber: t.dangerNumber,
      hasItem: t.hasItem,
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
      include: { tiles: true, deck: true },
    });
    return formatSession(updated);
  }

  if (targetTile.type === 'SHOP') {
    await generateShopCardsForSession(sessionId);
    const updated = await prisma.gameSession.update({
      where: { id: sessionId },
      data: { phase: 'SHOP', shopRerolled: false },
      include: { tiles: true, deck: true },
    });
    return formatSession(updated);
  }

  if (targetTile.type === 'REST') {
    const updated = await prisma.gameSession.update({
      where: { id: sessionId },
      data: { phase: 'REST' },
      include: { tiles: true, deck: true },
    });
    return formatSession(updated);
  }

  if (targetTile.type === 'EVENT') {
    const updated = await prisma.gameSession.update({
      where: { id: sessionId },
      data: { phase: 'EVENT' },
      include: { tiles: true, deck: true },
    });
    return formatSession(updated);
  }

  if (targetTile.type === 'KEY') {
    const updated = await prisma.gameSession.update({
      where: { id: sessionId },
      data: {
        hasKey: true,
        tiles: { update: { where: { id: targetTile.id }, data: { type: 'SAFE' } } },
      },
      include: { tiles: true, deck: true },
    });
    return formatSession(updated);
  }

  // EXIT tile: trigger FLOOR_END confirmation
  if (targetTile.type === 'EXIT') {
    const updated = await prisma.gameSession.update({
      where: { id: sessionId },
      data: { phase: 'FLOOR_END' },
      include: { tiles: true, deck: true },
    });
    return formatSession(updated);
  }

  const final = await prisma.gameSession.findUnique({
    where: { id: sessionId },
    include: { tiles: true, deck: true },
  });
  return formatSession(final);
}

// ── Submit Hand (Server-side combat resolution) ───────────────────────────────

export async function submitQueue(sessionId: string, cardIds: string[]) {
  const session = await prisma.gameSession.findUnique({
    where: { id: sessionId },
    include: { deck: true },
  });

  if (!session || session.phase !== 'COMBAT') return null;
  if (cardIds.length === 0 || cardIds.length > session.queueSlots) return null;

  // Validate cards are in HAND
  const handCards = session.deck.filter((c) => cardIds.includes(c.id) && c.location === 'HAND');
  if (handCards.length !== cardIds.length) return null;

  // Ordered player queue
  const playerQueue = cardIds.map(id => handCards.find(c => c.id === id)).filter(Boolean) as ClientCard[];

  const existingEffects = (session.enemyStatusEffects as unknown as StatusEffect[]) ?? [];

  // 1. Tick existing status effects (BURN damage, decrement turns)
  const { tickDamage, remainingEffects, chainBonus } = tickStatusEffects(existingEffects);

  const enemyQueue = (session.enemyQueue as any[]) || [];

  // 1.5 Resolve wildcards in player queue
  let resolvedPlayerQueue = [...playerQueue] as any[];
  for (const card of playerQueue) {
    if (card.specialModifier && (card.specialModifier as any).isWildcard) {
      const type = (card.specialModifier as any).wildcardType;
      const instance = getWildcardInstance(type);
      if (instance) {
        (instance as any).id = card.id;
        const result = instance.applyEffect(resolvedPlayerQueue, enemyQueue, session.playerClass as PlayerClass);
        if (result.modifiedPlayerQueue) {
          resolvedPlayerQueue = result.modifiedPlayerQueue;
        }
      }
    }
  }

  // 2. Resolve Queue Clash
  const clash = resolveQueueClash(
    resolvedPlayerQueue as any,
    enemyQueue,
    session.playerClass as PlayerClass,
    session.passives,
    Math.max(0, (session.enemyCurrentHp ?? 0) - tickDamage),
    1 + chainBonus + (session.combatMultiplierBonus - 1)
  );

  // 3. Vigor / HP Logic
  const totalEnemyDamage = clash.totalEnemyDamage + tickDamage;
  const newEnemyHp = Math.max(0, (session.enemyCurrentHp ?? 0) - totalEnemyDamage);

  // Enemy counter-attack logic via Vigor
  let aegisVigorGain = 0;
  let terraStoneTriggers = 0;
  for (const card of resolvedPlayerQueue) {
    if (card.specialModifier && (card.specialModifier as any).isAegis) {
      aegisVigorGain += 15;
    }
    if (card.specialModifier && (card.specialModifier as any).isTerraStone) {
      terraStoneTriggers++;
    }
  }

  let newPlayerVigor = Math.min(session.maxHp, session.currentVigor + aegisVigorGain);
  let newPlayerHp = session.currentHp;

  if (terraStoneTriggers > 0) {
    const earthDiscardCards = await prisma.card.findMany({
      where: { sessionId, location: 'DISCARD', element: 'EARTH' },
      take: terraStoneTriggers
    });
    if (earthDiscardCards.length > 0) {
      await prisma.card.updateMany({
        where: { id: { in: earthDiscardCards.map(c => c.id) } },
        data: { location: 'HAND' }
      });
    }
  }
  
  const frozen = isFrozen(remainingEffects);
  const pushed = isPushed(remainingEffects);
  
  if (!frozen) {
    const incomingDmg = clash.totalPlayerDamage;
    const vigorDiff = newPlayerVigor - incomingDmg;
    if (vigorDiff < 0) {
      newPlayerVigor = 0;
      newPlayerHp = Math.max(0, newPlayerHp + vigorDiff); // Inner injury
    } else {
      newPlayerVigor = vigorDiff;
    }
  }

  // 4. Merge new status effects onto enemy
  const newEffects = mergeStatusEffects(remainingEffects, clash.newStatusEffects);
  const newChainBonus = getChainBonus(newEffects);

  // 5. Durability: decrement uses
  for (const card of playerQueue) {
    if (card.isAsh) continue; 
    if ((card.currentUses ?? 0) >= 999) continue;

    const newUses = Math.max(0, (card.currentUses ?? 0) - 1);
    if (card.isExhaust) {
      await prisma.card.delete({ where: { id: card.id } });
    } else if (newUses <= 0) {
      await prisma.card.update({
        where: { id: card.id },
        data: { currentUses: 0, isAsh: true, location: 'DISCARD' },
      });
    } else {
      await prisma.card.update({
        where: { id: card.id },
        data: { currentUses: newUses, location: 'DISCARD' },
      });
    }
  }

  // 6. Draw replacements
  await drawCards(sessionId, cardIds.length);

  // 7. Check enemy defeat
  if (newEnemyHp <= 0) {
    return await resolveVictory(sessionId, session, 0, 0, clash);
  }

  // 8. Check player defeat (Inner Injuries reached max / HP = 0)
  if (newPlayerHp <= 0) {
    const updated = await prisma.gameSession.update({
      where: { id: sessionId },
      data: { phase: 'GAMEOVER', currentHp: 0 },
      include: { tiles: true, deck: true },
    });
    return { ...formatSession(updated), lastClash: clash };
  }

  // 9. Next turn Enemy Intent
  const elements: ('FIRE'|'WATER'|'EARTH'|'AIR')[] = ['FIRE', 'WATER', 'EARTH', 'AIR'];
  const newEnemyQueue = Array.from({ length: session.queueSlots }).map(() => elements[Math.floor(Math.random() * elements.length)]);

  // 10. Update session
  const updated = await prisma.gameSession.update({
    where: { id: sessionId },
    data: {
      currentHp: newPlayerHp,
      currentVigor: newPlayerVigor,
      enemyCurrentHp: newEnemyHp,
      enemyStatusEffects: newEffects as any,
      combatMultiplierBonus: newChainBonus,
      enemyQueue: newEnemyQueue,
      enemyQueueRevealed: !isPushed(newEffects),
    },
    include: { tiles: true, deck: true },
  });

  return { ...formatSession(updated), lastClash: clash };
}

// ── Discard Cards ─────────────────────────────────────────────────────────────

export async function discardCards(sessionId: string, cardIds: string[]) {
  const session = await prisma.gameSession.findUnique({ where: { id: sessionId } });
  if (!session || session.phase !== 'COMBAT') return null;
  if (cardIds.length === 0) return null;

  // Move selected to discard, draw replacements
  await prisma.card.updateMany({ where: { id: { in: cardIds } }, data: { location: 'DISCARD' } });
  await drawCards(sessionId, cardIds.length);

  // Refresh enemy intent queue
  const elements: ('FIRE'|'WATER'|'EARTH'|'AIR')[] = ['FIRE', 'WATER', 'EARTH', 'AIR'];
  const newEnemyQueue = Array.from({ length: session.queueSlots || 4 }).map(() => elements[Math.floor(Math.random() * elements.length)]);

  const updated = await prisma.gameSession.update({
    where: { id: sessionId },
    data: {
      enemyQueue: newEnemyQueue,
    },
    include: { tiles: true, deck: true },
  });
  return formatSession(updated);
}

// ── Victory / Defeat Resolution ───────────────────────────────────────────────

async function resolveVictory(sessionId: string, session: any, healBonus: number = 0, extraGold: number = 0, clashResult: any = null) {
  const { xp, gold } = getEnemyRewards(session.floor, 'COMMON'); // rarity could be passed in

  let goldReward = gold + extraGold;

  // Overseer CALCULATED_RISK: <50% HP → double gold
  if (session.passives.includes('CALCULATED_RISK') && session.currentHp < session.maxHp / 2) {
    goldReward *= 2;
  }

  // Berserker BLOODLUST: heal 5 HP on kill
  const bloodlustHeal = session.passives.includes('BLOODLUST') ? 5 : 0;
  const newHp = Math.min(session.maxHp, session.currentHp + healBonus + bloodlustHeal);

  const newXP = session.currentXP + xp;
  const { newLevel, didLevelUp } = calculateLevelUp(newXP, session.level);

  // Reset all cards to DECK after combat
  await prisma.card.updateMany({ where: { sessionId }, data: { location: 'DECK' } });

  let updateData: any = {
    phase: didLevelUp ? 'LEVELUP' : 'EXPLORING',
    tiles: { updateMany: { where: { q: session.posX, r: session.posY }, data: { type: 'SAFE' } } },
    currentHp: newHp,
    gold: { increment: goldReward },
    currentXP: newXP,
    level: newLevel,
    enemyCurrentHp: 0,
  };

  if (session.relics.includes('MITHRIL_COIN')) {
    const hpInc = Math.max(1, Math.floor(goldReward / 5));
    updateData.maxHp = { increment: hpInc };
    updateData.currentHp = newHp + hpInc;
  }

  if (didLevelUp) {
    const choices = pickLevelUpChoices(session.playerClass as PlayerClass, session.passives);
    updateData.pendingLevelUpChoices = choices;
  }

  const updated = await prisma.gameSession.update({
    where: { id: sessionId },
    data: updateData,
    include: { tiles: true, deck: true },
  });

  const formatted = formatSession(updated, true);
  return { 
    ...formatted, 
    phase: 'COMBAT', // Tell client to stay in COMBAT for animations
    nextPhase: formatted.phase, // Pass the real phase (EXPLORING or LEVELUP)
    xpGained: xp, 
    goldGained: goldReward, 
    didLevelUp, 
    lastClash: clashResult 
  };
}

// Legacy combat resolution (kept for compatibility)
export async function resolveCombat(sessionId: string, won: boolean) {
  const session = await prisma.gameSession.findUnique({ where: { id: sessionId } });
  if (!session) return null;

  if (won) return resolveVictory(sessionId, session);

  await prisma.card.updateMany({ where: { sessionId }, data: { location: 'DECK' } });
  const updated = await prisma.gameSession.update({
    where: { id: sessionId },
    data: {
      phase: 'GAMEOVER',
      enemyName: null, enemyMaxHp: null, enemyCurrentHp: null,
      enemyStatusEffects: [], playerQueue: [], enemyQueue: [],
    },
    include: { tiles: true, deck: true },
  });
  return formatSession(updated);
}

// ── Level-Up: Choose Passive ──────────────────────────────────────────────────

export async function chooseLevelUpPassive(sessionId: string, passive: PassiveAbility) {
  const session = await prisma.gameSession.findUnique({ where: { id: sessionId } });
  if (!session || session.phase !== 'LEVELUP') return null;

  const deltas = applyPassiveStat(passive);

  const updated = await prisma.gameSession.update({
    where: { id: sessionId },
    data: {
      phase: 'EXPLORING',
      passives: { push: passive },
      pendingLevelUpChoices: { set: [] as any },  // clear JSON field
      maxHp: deltas.maxHpDelta > 0 ? { increment: deltas.maxHpDelta } : undefined,
      currentHp: deltas.maxHpDelta > 0 ? { increment: deltas.maxHpDelta } : undefined,
      baseHandSize: deltas.handSizeDelta > 0 ? { increment: deltas.handSizeDelta } : undefined,
    },
    include: { tiles: true, deck: true },
  });

  return formatSession(updated);
}

// ── Shop Actions ──────────────────────────────────────────────────────────────

export async function exitShop(sessionId: string) {
  const session = await prisma.gameSession.findUnique({ where: { id: sessionId } });
  if (!session) return null;

  const updated = await prisma.gameSession.update({
    where: { id: sessionId },
    data: { 
      phase: 'EXPLORING',
      tiles: { updateMany: { where: { q: session.posX, r: session.posY }, data: { type: 'SAFE' } } }
    },
    include: { tiles: true, deck: true },
  });
  return formatSession(updated);
}

export async function purchaseItem(sessionId: string, itemType: 'HEAL' | 'REVEAL' | 'REMOVE_CURSE') {
  const session = await prisma.gameSession.findUnique({ where: { id: sessionId } });
  if (!session || session.phase !== 'SHOP') return null;

  let updateData: any = {};

  if (itemType === 'HEAL') {
    const cost = 40;
    if (session.gold < cost) return null;
    updateData = { 
      gold: { decrement: cost }, 
      inventory: { push: 'HEALTH_POTION' } 
    };
  } else if (itemType === 'REVEAL') {
    const cost = 25;
    if (session.gold < cost) return null;
    const hiddenTiles = await prisma.tile.findMany({ 
      where: { sessionId, revealed: false } 
    });
    const shuffled = shuffle(hiddenTiles).slice(0, 3);
    await prisma.tile.updateMany({ 
      where: { id: { in: shuffled.map((t) => t.id) } }, 
      data: { revealed: true } 
    });
    updateData = { gold: { decrement: cost } };
  }

  const updated = await prisma.gameSession.update({
    where: { id: sessionId },
    data: updateData,
    include: { tiles: true, deck: true },
  });
  return formatSession(updated);
}

export async function purchaseCardRemoval(sessionId: string, cardId: string) {
  const session = await prisma.gameSession.findUnique({ where: { id: sessionId } });
  if (!session || session.phase !== 'SHOP') return null;

  const cost = 50;
  if (session.gold < cost) return null;

  await prisma.card.delete({ where: { id: cardId, sessionId } });
  
  const updated = await prisma.gameSession.update({
    where: { id: sessionId },
    data: { gold: { decrement: cost } },
    include: { tiles: true, deck: true },
  });
  return formatSession(updated);
}

export async function purchaseCardUpgrade(sessionId: string, cardId: string) {
  const session = await prisma.gameSession.findUnique({ where: { id: sessionId } });
  if (!session || session.phase !== 'SHOP') return null;

  const cost = 75;
  if (session.gold < cost) return null;

  await prisma.card.update({
    where: { id: cardId, sessionId },
    data: { isUpgraded: true, rank: { increment: 2 } }, // Upgrading adds +2 to rank (Maxes out later)
  });
  
  const updated = await prisma.gameSession.update({
    where: { id: sessionId },
    data: { gold: { decrement: cost } },
    include: { tiles: true, deck: true },
  });
  return formatSession(updated);
}

export async function purchaseRelic(sessionId: string, relicId: string, cost: number) {
  const session = await prisma.gameSession.findUnique({ where: { id: sessionId } });
  if (!session || session.phase !== 'SHOP') return null;
  if (session.gold < cost) return null;
  if (session.relics.includes(relicId)) return null;

  const updated = await prisma.gameSession.update({
    where: { id: sessionId },
    data: { 
      gold: { decrement: cost },
      relics: { push: relicId }
    },
    include: { tiles: true, deck: true },
  });
  return formatSession(updated);
}

// ── Rest & Event ──────────────────────────────────────────────────────────────

export async function restAction(sessionId: string, action: 'HEAL' | 'UPGRADE' | 'DIG') {
  const session = await prisma.gameSession.findUnique({ where: { id: sessionId } });
  if (!session || session.phase !== 'REST') return null;

  let updateData: any = { 
    phase: 'EXPLORING',
    tiles: { updateMany: { where: { q: session.posX, r: session.posY }, data: { type: 'SAFE' } } }
  };
  if (action === 'HEAL') {
    updateData.currentHp = Math.min(session.maxHp, session.currentHp + Math.floor(session.maxHp * 0.5));
  } else if (action === 'DIG') {
    updateData.relics = { push: 'Ancient Coin' };
  }

  const updated = await prisma.gameSession.update({
    where: { id: sessionId },
    data: updateData,
    include: { tiles: true, deck: true },
  });
  return formatSession(updated);
}

/** Sharpen: fully restore uses on one specific card */
export async function sharpenCard(sessionId: string, cardId: string) {
  const session = await prisma.gameSession.findUnique({ where: { id: sessionId }, include: { deck: true } });
  if (!session || session.phase !== 'REST') return null;

  const card = session.deck.find((c) => c.id === cardId);
  if (!card) return null;

  // Unash the card and fully restore it
  await prisma.card.update({
    where: { id: cardId },
    data: { currentUses: card.maxUses, isAsh: false },
  });

  const updated = await prisma.gameSession.update({
    where: { id: sessionId },
    data: { 
      phase: 'EXPLORING',
      tiles: { updateMany: { where: { q: session.posX, r: session.posY }, data: { type: 'SAFE' } } }
    },
    include: { tiles: true, deck: true },
  });
  return formatSession(updated);
}

/** General Maintenance: restore 2 uses to every card in the deck */
export async function maintainAllCards(sessionId: string) {
  const session = await prisma.gameSession.findUnique({ where: { id: sessionId }, include: { deck: true } });
  if (!session || session.phase !== 'REST') return null;

  // Restore 2 uses to each card, capped at maxUses, and un-Ash any that recover above 0
  for (const card of session.deck) {
    if (card.maxUses >= 999) continue; // skip infinite basic attacks
    const newUses = Math.min(card.maxUses, card.currentUses + 2);
    await prisma.card.update({
      where: { id: card.id },
      data: { currentUses: newUses, isAsh: newUses > 0 ? false : card.isAsh },
    });
  }

  const updated = await prisma.gameSession.update({
    where: { id: sessionId },
    data: { 
      phase: 'EXPLORING',
      tiles: { updateMany: { where: { q: session.posX, r: session.posY }, data: { type: 'SAFE' } } }
    },
    include: { tiles: true, deck: true },
  });
  return formatSession(updated);
}

/** Purge: permanently delete a chosen card (to thin the deck) */
export async function purgeCard(sessionId: string, cardId: string) {
  const session = await prisma.gameSession.findUnique({ where: { id: sessionId } });
  if (!session || session.phase !== 'REST') return null;

  await prisma.card.delete({ where: { id: cardId, sessionId } });

  const updated = await prisma.gameSession.update({
    where: { id: sessionId },
    data: { 
      phase: 'EXPLORING',
      tiles: { updateMany: { where: { q: session.posX, r: session.posY }, data: { type: 'SAFE' } } }
    },
    include: { tiles: true, deck: true },
  });
  return formatSession(updated);
}

export async function handleEvent(sessionId: string, choice: string) {
  const session = await prisma.gameSession.findUnique({ where: { id: sessionId } });
  if (!session || session.phase !== 'EVENT') return null;

  let updateData: any = { 
    phase: 'EXPLORING',
    tiles: { updateMany: { where: { q: session.posX, r: session.posY }, data: { type: 'SAFE' } } }
  };
  if (choice === 'INTIMIDATE') {
    updateData.gold = { increment: 20 };
    if (session.relics.includes('MITHRIL_COIN')) {
      updateData.maxHp = { increment: 4 };
      updateData.currentHp = { increment: 4 };
    }
  }
  else if (choice === 'RITUAL') {
    updateData.maxHp = { increment: 10 };
    updateData.currentHp = { increment: 10 };
  }

  const updated = await prisma.gameSession.update({
    where: { id: sessionId },
    data: updateData,
    include: { tiles: true, deck: true },
  });
  return formatSession(updated);
}

// ── Treasure Room ──────────────────────────────────────────────────────────────

export async function clickTreasureTile(sessionId: string, coord: AxialCoord) {
  const session = await prisma.gameSession.findUnique({ where: { id: sessionId }, include: { tiles: true } });
  if (!session || session.phase !== 'TREASURE') return null;

  const targetTile = session.tiles.find((t) => t.q === coord.q && t.r === coord.r);
  if (!targetTile || targetTile.revealed) return null;

  if (targetTile.type === 'WALL') {
    const savedGridArray = (session.savedGrid as any[]) || [];
    const restoredTiles = savedGridArray.map((t) => 
      (t.q === session.posX && t.r === session.posY) ? { ...t, type: 'SAFE' as any } : t
    );
    
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
            q: tile.q, r: tile.r, type: tile.type, revealed: tile.revealed, dangerNumber: tile.dangerNumber, hasItem: tile.hasItem 
          })) 
        },
      },
    });
    
    const final = await prisma.gameSession.findUnique({ where: { id: sessionId }, include: { tiles: true, deck: true } });
    return formatSession(final);
  }

  await prisma.tile.update({ where: { id: targetTile.id }, data: { revealed: true } });
  
  let updateData: any = { gold: { increment: 5 } };
  if (session.relics.includes('MITHRIL_COIN')) {
    updateData.maxHp = { increment: 1 };
    updateData.currentHp = { increment: 1 };
  }

  const updated = await prisma.gameSession.update({
    where: { id: sessionId },
    data: updateData,
    include: { tiles: true, deck: true },
  });
  return formatSession(updated);
}

export async function exitTreasureRoom(sessionId: string) {
  const session = await prisma.gameSession.findUnique({ where: { id: sessionId } });
  if (!session || session.phase !== 'TREASURE') return null;

  const savedGridArray = (session.savedGrid as any[]) || [];
  const restoredTiles = savedGridArray.map((t) => 
    (t.q === session.posX && t.r === session.posY) ? { ...t, type: 'SAFE' as any } : t
  );

  await prisma.tile.deleteMany({ where: { sessionId } });
  await prisma.gameSession.update({
    where: { id: sessionId },
    data: {
      phase: 'EXPLORING',
      savedGrid: [],
      tiles: { 
        create: restoredTiles.map((tile) => ({ 
          q: tile.q, r: tile.r, type: tile.type, revealed: tile.revealed, dangerNumber: tile.dangerNumber, hasItem: tile.hasItem 
        })) 
      },
    },
  });
  
  const final = await prisma.gameSession.findUnique({ where: { id: sessionId }, include: { tiles: true, deck: true } });
  return formatSession(final);
}

// ── Floor Descent ─────────────────────────────────────────────────────────────

/**
 * Player confirms descending to the next floor.
 * Generates a fresh grid, increments floor counter, resets position,
 * consumes the key, and gives a small heal for making it through.
 */
export async function descendToNextFloor(sessionId: string) {
  const session = await prisma.gameSession.findUnique({ where: { id: sessionId } });
  if (!session || session.phase !== 'FLOOR_END') return null;

  const newFloor = session.floor + 1;
  const grid = generateGrid(3);

  // Reset all cards to DECK at floor transition
  await prisma.card.updateMany({ where: { sessionId }, data: { location: 'DECK' } });

  // Delete old tiles and create new ones for next floor
  await prisma.tile.deleteMany({ where: { sessionId } });

  // Paladin BLESSING: heal 10% max HP at floor start
  const blessingHeal = session.passives.includes('BLESSING') ? Math.floor(session.maxHp * 0.1) : 0;
  const floorStartHeal = Math.floor(session.maxHp * 0.1); // 10% heal as a reward for descending
  const newHp = Math.min(session.maxHp, session.currentHp + floorStartHeal + blessingHeal);

  const updated = await prisma.gameSession.update({
    where: { id: sessionId },
    data: {
      phase: 'EXPLORING',
      floor: newFloor,
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
        })),
      },
    },
    include: { tiles: true, deck: true },
  });

  return formatSession(updated);
}

/**
 * Player declines descending — returns to EXPLORING at the EXIT tile position.
 * The player keeps the key and can continue exploring before deciding to leave.
 */
export async function stayOnFloor(sessionId: string) {
  const session = await prisma.gameSession.findUnique({ where: { id: sessionId } });
  if (!session || session.phase !== 'FLOOR_END') return null;

  const updated = await prisma.gameSession.update({
    where: { id: sessionId },
    data: { phase: 'EXPLORING' },
    include: { tiles: true, deck: true },
  });
  return formatSession(updated);
}

export async function useItem(sessionId: string, itemName: string) {
  const session = await prisma.gameSession.findUnique({ where: { id: sessionId } });
  if (!session || itemName !== 'HEALTH_POTION') return null;

  const inv = session.inventory as string[];
  const idx = inv.indexOf(itemName);
  if (idx === -1) return null;

  // Remove one instance of the item
  inv.splice(idx, 1);

  let updateData: any = {
    inventory: inv,
  };

  if (itemName === 'HEALTH_POTION') {
    updateData.currentHp = Math.min(session.maxHp, session.currentHp + 25);
  }

  const updated = await prisma.gameSession.update({
    where: { id: sessionId },
    data: updateData,
    include: { tiles: true, deck: true },
  });

  return formatSession(updated);
}
