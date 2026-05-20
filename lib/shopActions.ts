'use server';

// This file contains all server actions related to the newly structured Shop system.
// By keeping these separate from actions.ts, we maintain a clean and modular architecture.

import prisma from './prisma';
import { getFormattedSessionById, generateShopCardsForSession } from './actions';

export async function purchaseShopCard(sessionId: string, cardId: string) {
  const session = await prisma.gameSession.findUnique({
    where: { id: sessionId },
    include: { deck: true },
  });

  if (!session || session.phase !== 'SHOP') return null;

  const card = await prisma.card.findFirst({
    where: { id: cardId, sessionId, location: 'SHOP' }
  });

  if (!card) return null;

  // Calculate Price
  let price = 30;
  const isWildcard = card.specialModifier && (card.specialModifier as any).isWildcard;

  if (isWildcard) {
    price = 50;
  } else {
    const rank = card.rank;
    if (rank >= 14) {
      price = 120;
    } else if (rank >= 10) {
      price = 60;
    } else {
      price = 30;
    }
  }

  if (session.gold < price) return null;

  // Purchase: deduct gold, move card to DECK
  await prisma.gameSession.update({
    where: { id: sessionId },
    data: {
      gold: session.gold - price,
      deck: {
        update: {
          where: { id: cardId },
          data: { location: 'DECK' }
        }
      }
    }
  });

  return getFormattedSessionById(sessionId);
}

export async function sellDeckCard(sessionId: string, cardId: string) {
  const session = await prisma.gameSession.findUnique({
    where: { id: sessionId },
    include: { deck: true }
  });

  if (!session || session.phase !== 'SHOP') return null;

  const card = await prisma.card.findFirst({
    where: { id: cardId, sessionId, location: 'DECK' }
  });

  if (!card) return null;

  // Calculate Refund
  let refund = 5;
  const isWildcard = card.specialModifier && (card.specialModifier as any).isWildcard;

  if (card.isAsh) {
    refund = 3;
  } else if (isWildcard) {
    refund = 25;
  } else {
    const rank = card.rank;
    if (rank >= 14) {
      refund = 60;
    } else if (rank >= 10) {
      refund = 30;
    } else if (rank >= 6) {
      refund = 15;
    } else {
      refund = 5; // Basic card
    }
  }

  // Delete card and add refund gold
  await prisma.card.delete({
    where: { id: cardId }
  });

  await prisma.gameSession.update({
    where: { id: sessionId },
    data: {
      gold: session.gold + refund
    }
  });

  return getFormattedSessionById(sessionId);
}

export async function rerollShop(sessionId: string) {
  const session = await prisma.gameSession.findUnique({
    where: { id: sessionId }
  });

  if (!session || session.phase !== 'SHOP') return null;
  if (session.shopRerolled || session.gold < 15) return null;

  // Generate new shop cards
  await generateShopCardsForSession(sessionId);

  // Deduct 15g and set shopRerolled to true
  await prisma.gameSession.update({
    where: { id: sessionId },
    data: {
      gold: session.gold - 15,
      shopRerolled: true
    }
  });

  return getFormattedSessionById(sessionId);
}
