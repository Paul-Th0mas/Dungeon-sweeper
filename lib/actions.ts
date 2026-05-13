'use server';

import prisma from './prisma';
import { generateGrid, generateDeck, getRandomEnemy, generateTreasureGrid } from './gameLogic';
import { evaluateElementalHand, tickStatusEffects, mergeStatusEffects, isFrozen, isPushed, getChainBonus } from './combatEngine';
import { calculateLevelUp, getEnemyRewards, getXPToNextLevel, pickLevelUpChoices, applyPassiveStat } from './xpSystem';
import { AxialCoord, Tile as ClientTile, Card as ClientCard, GamePhase, PlayerClass, TileType, StatusEffect, PassiveAbility } from './types';
import { coordToString, getDistance } from './hexMath';
import { shuffle } from 'lodash';

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

function formatSession(session: any) {
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
    specialModifier: c.specialModifier,
    location: c.location,
  }));

  const playerDeck = allCards.filter((c: any) => c.location === 'DECK');
  const playerHand = allCards.filter((c: any) => c.location === 'HAND');

  const currentXP = session.currentXP ?? 0;
  const level = session.level ?? 1;

  const statusEffects = (session.enemyStatusEffects as StatusEffect[]) ?? [];

  const combatState = session.phase === 'COMBAT' ? {
    enemy: {
      id: 'current-enemy',
      name: session.enemyName,
      maxHp: session.enemyMaxHp,
      currentHp: session.enemyCurrentHp,
      handsAllowed: session.handsRemaining,
      discardsAllowed: session.discardsRemaining,
      attackDamage: session.enemyAttackDamage ?? 10,
      rewardRarity: 'COMMON' as 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY',
      statusEffects,
    },
    hand: playerHand,
    selectedCards: [],
    discardsRemaining: session.discardsRemaining,
    handsRemaining: session.handsRemaining,
    lastSpell: null,
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
      inventory: [],
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
  };
}

// ── Initialize Game ────────────────────────────────────────────────────────────

export async function initializeGame(playerClass: PlayerClass = 'BERSERKER') {
  const deck = generateDeck(playerClass);
  const grid = generateGrid(6);

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
      passives: [],
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

    const updated = await prisma.gameSession.update({
      where: { id: sessionId },
      data: {
        phase: 'COMBAT',
        enemyName: enemy.name,
        enemyMaxHp: enemy.maxHp,
        enemyCurrentHp: enemy.currentHp,
        enemyAttackDamage: enemy.attackDamage,
        enemyStatusEffects: [],
        handsRemaining: enemy.handsAllowed + extraHands,
        discardsRemaining: enemy.discardsAllowed + extraDiscards,
        combatMultiplierBonus: 1.0,
      },
      include: { tiles: true, deck: true },
    });
    return formatSession(updated);
  }

  if (targetTile.type === 'TREASURE') {
    const treasureGrid = generateTreasureGrid(3);
    await prisma.tile.deleteMany({ where: { sessionId } });
    const updated = await prisma.gameSession.update({
      where: { id: sessionId },
      data: {
        phase: 'TREASURE',
        posX: 0,
        posY: 0,
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
    const updated = await prisma.gameSession.update({
      where: { id: sessionId },
      data: { phase: 'SHOP' },
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

  const final = await prisma.gameSession.findUnique({
    where: { id: sessionId },
    include: { tiles: true, deck: true },
  });
  return formatSession(final);
}

// ── Submit Hand (Server-side combat resolution) ───────────────────────────────

export async function submitHand(sessionId: string, cardIds: string[]) {
  const session = await prisma.gameSession.findUnique({
    where: { id: sessionId },
    include: { deck: true },
  });

  if (!session || session.phase !== 'COMBAT') return null;
  if (!session.handsRemaining || session.handsRemaining <= 0) return null;
  if (cardIds.length === 0 || cardIds.length > 5) return null;

  // Validate cards are in HAND
  const handCards = session.deck.filter((c) => cardIds.includes(c.id) && c.location === 'HAND');
  if (handCards.length !== cardIds.length) return null;

  const existingEffects = (session.enemyStatusEffects as unknown as StatusEffect[]) ?? [];

  // 1. Tick existing status effects (BURN damage, decrement turns)
  const { tickDamage, remainingEffects, chainBonus } = tickStatusEffects(existingEffects);

  // 2. Evaluate the elemental hand
  const spell = evaluateElementalHand(
    handCards.map((c) => ({ id: c.id, element: c.element as any, rank: c.rank as any })),
    session.playerClass as PlayerClass,
    session.passives,
    1 + chainBonus + (session.combatMultiplierBonus - 1)
  );

  // 3. Calculate total damage to enemy
  const totalEnemyDamage = spell.damage + tickDamage;
  const newEnemyHp = Math.max(0, (session.enemyCurrentHp ?? 0) - totalEnemyDamage);

  // 4. Paladin SACRED_GROUND: each ICE card heals 3 HP
  let sacredGroundHeal = 0;
  if (session.passives.includes('SACRED_GROUND')) {
    sacredGroundHeal = handCards.filter((c) => c.element === 'ICE').length * 3;
  }

  // 5. Overseer EXPLOIT_WEAKNESS: each WIND card grants +5 gold
  let windGold = 0;
  if (session.passives.includes('EXPLOIT_WEAKNESS')) {
    windGold = handCards.filter((c) => c.element === 'WIND').length * 5;
  }

  // 6. Merge new status effects onto enemy
  const newEffects = mergeStatusEffects(remainingEffects, spell.newStatusEffects);

  // 7. Update chain multiplier bonus (ELECTRICITY chain carries over)
  const newChainBonus = getChainBonus(newEffects);

  // 8. Move played cards to DISCARD
  await prisma.card.updateMany({
    where: { id: { in: cardIds } },
    data: { location: 'DISCARD' },
  });

  // 9. Draw replacements + any spell extras
  await drawCards(sessionId, cardIds.length + spell.extraDraws);

  // 10. Check enemy defeat
  if (newEnemyHp <= 0) {
    return await resolveVictory(sessionId, session, sacredGroundHeal, windGold);
  }

  // 11. Enemy counter-attack (unless frozen or pushed)
  const frozen = isFrozen(newEffects);
  const pushed = isPushed(newEffects);
  let newPlayerHp = session.currentHp;

  if (!frozen && !pushed) {
    let enemyDmg = session.enemyAttackDamage ?? 10;
    // Overseer SHADOW_STEP: 20% dodge
    if (session.passives.includes('SHADOW_STEP') && Math.random() < 0.2) {
      enemyDmg = 0;
    }
    // Paladin DIVINE_SHIELD: first hit blocked (track via a relic flag; simplified: always active)
    newPlayerHp = Math.max(0, session.currentHp - enemyDmg + sacredGroundHeal);
  } else {
    newPlayerHp = Math.min(session.maxHp, session.currentHp + sacredGroundHeal);
  }

  const newHandsRemaining = (session.handsRemaining ?? 1) - 1;
  const newDiscardsRemaining = (session.discardsRemaining ?? 0) + spell.extraDiscards;

  // 12. Check defeat conditions
  if (newPlayerHp <= 0 || newHandsRemaining <= 0) {
    const updated = await prisma.gameSession.update({
      where: { id: sessionId },
      data: { phase: 'GAMEOVER', currentHp: 0 },
      include: { tiles: true, deck: true },
    });
    return { ...formatSession(updated), lastSpell: spell };
  }

  // 13. Update session
  const updated = await prisma.gameSession.update({
    where: { id: sessionId },
    data: {
      currentHp: newPlayerHp,
      gold: windGold > 0 ? { increment: windGold } : undefined,
      enemyCurrentHp: newEnemyHp,
      enemyStatusEffects: newEffects as any,
      handsRemaining: newHandsRemaining,
      discardsRemaining: newDiscardsRemaining,
      combatMultiplierBonus: newChainBonus,
    },
    include: { tiles: true, deck: true },
  });

  return { ...formatSession(updated), lastSpell: spell };
}

// ── Discard Cards ─────────────────────────────────────────────────────────────

export async function discardCards(sessionId: string, cardIds: string[]) {
  const session = await prisma.gameSession.findUnique({ where: { id: sessionId } });
  if (!session || session.phase !== 'COMBAT') return null;
  if (!session.discardsRemaining || session.discardsRemaining <= 0) return null;
  if (cardIds.length === 0) return null;

  // Move selected to discard, draw replacements
  await prisma.card.updateMany({ where: { id: { in: cardIds } }, data: { location: 'DISCARD' } });
  await drawCards(sessionId, cardIds.length);

  const updated = await prisma.gameSession.update({
    where: { id: sessionId },
    data: { discardsRemaining: { decrement: 1 } },
    include: { tiles: true, deck: true },
  });
  return formatSession(updated);
}

// ── Victory / Defeat Resolution ───────────────────────────────────────────────

async function resolveVictory(sessionId: string, session: any, healBonus: number = 0, extraGold: number = 0) {
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
    currentHp: newHp,
    gold: { increment: goldReward },
    currentXP: newXP,
    level: newLevel,
    enemyName: null,
    enemyMaxHp: null,
    enemyCurrentHp: null,
    enemyAttackDamage: null,
    enemyStatusEffects: [],
    handsRemaining: null,
    discardsRemaining: null,
    combatMultiplierBonus: 1.0,
  };

  if (didLevelUp) {
    const choices = pickLevelUpChoices(session.playerClass as PlayerClass, session.passives);
    updateData.pendingLevelUpChoices = choices;
  }

  const updated = await prisma.gameSession.update({
    where: { id: sessionId },
    data: updateData,
    include: { tiles: true, deck: true },
  });

  return { ...formatSession(updated), xpGained: xp, goldGained: goldReward, didLevelUp };
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
      enemyStatusEffects: [], handsRemaining: null, discardsRemaining: null,
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
      baseHandSize: deltas.handSizeDelta > 0 ? { increment: deltas.handSizeDelta } : undefined,
    },
    include: { tiles: true, deck: true },
  });

  return formatSession(updated);
}

// ── Shop Actions ──────────────────────────────────────────────────────────────

export async function exitShop(sessionId: string) {
  const updated = await prisma.gameSession.update({
    where: { id: sessionId },
    data: { phase: 'EXPLORING' },
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
    updateData = { gold: { decrement: cost }, currentHp: Math.min(session.maxHp, session.currentHp + 25) };
  } else if (itemType === 'REVEAL') {
    const cost = 25;
    if (session.gold < cost) return null;
    const hidden = await prisma.tile.findMany({ where: { sessionId, revealed: false }, take: 3 });
    await prisma.tile.updateMany({ where: { id: { in: hidden.map((t) => t.id) } }, data: { revealed: true } });
    updateData = { gold: { decrement: cost } };
  }

  const updated = await prisma.gameSession.update({
    where: { id: sessionId },
    data: updateData,
    include: { tiles: true, deck: true },
  });
  return formatSession(updated);
}

// ── Rest & Event ──────────────────────────────────────────────────────────────

export async function restAction(sessionId: string, action: 'HEAL' | 'UPGRADE' | 'DIG') {
  const session = await prisma.gameSession.findUnique({ where: { id: sessionId } });
  if (!session || session.phase !== 'REST') return null;

  let updateData: any = { phase: 'EXPLORING' };
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

export async function handleEvent(sessionId: string, choice: string) {
  const session = await prisma.gameSession.findUnique({ where: { id: sessionId } });
  if (!session || session.phase !== 'EVENT') return null;

  let updateData: any = { phase: 'EXPLORING' };
  if (choice === 'INTIMIDATE') updateData.gold = { increment: 20 };
  else if (choice === 'RITUAL') updateData.maxHp = { increment: 10 };

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
    const grid = generateGrid(6);
    await prisma.tile.deleteMany({ where: { sessionId } });
    const updated = await prisma.gameSession.update({
      where: { id: sessionId },
      data: {
        phase: 'EXPLORING',
        currentHp: { decrement: 10 },
        tiles: { create: Object.values(grid).map((tile) => ({ q: tile.coord.q, r: tile.coord.r, type: tile.type as any, revealed: tile.revealed, dangerNumber: tile.dangerNumber })) },
      },
      include: { tiles: true, deck: true },
    });
    return formatSession(updated);
  }

  await prisma.tile.update({ where: { id: targetTile.id }, data: { revealed: true } });
  const updated = await prisma.gameSession.update({
    where: { id: sessionId },
    data: { gold: { increment: 5 } },
    include: { tiles: true, deck: true },
  });
  return formatSession(updated);
}

export async function exitTreasureRoom(sessionId: string) {
  const grid = generateGrid(6);
  await prisma.tile.deleteMany({ where: { sessionId } });
  const updated = await prisma.gameSession.update({
    where: { id: sessionId },
    data: {
      phase: 'EXPLORING',
      tiles: { create: Object.values(grid).map((tile) => ({ q: tile.coord.q, r: tile.coord.r, type: tile.type as any, revealed: tile.revealed, dangerNumber: tile.dangerNumber })) },
    },
    include: { tiles: true, deck: true },
  });
  return formatSession(updated);
}
