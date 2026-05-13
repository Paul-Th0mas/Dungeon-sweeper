import { Card, CardElement } from './types';
import { countBy, sortBy, uniq } from 'lodash';

export interface HandResult {
  name: string;
  multiplier: number;
  baseDamage: number;
}

export function evaluateHand(cards: Card[]): HandResult {
  if (cards.length === 0) return { name: 'None', multiplier: 0, baseDamage: 0 };

  const ranks = sortBy(cards.map(c => c.rank));
  const suits = cards.map(c => c.element);
  const rankCounts = countBy(ranks);
  const counts = Object.values(rankCounts).sort((a, b) => b - a);
  const sumRanks = ranks.reduce((a, b) => a + b, 0);

  const isFlush = uniq(suits).length === 1 && cards.length >= 5;
  const isStraight = isConsecutive(ranks) && cards.length >= 5;

  if (isFlush && isStraight) return { name: 'Straight Flush', multiplier: 15, baseDamage: sumRanks };
  if (counts[0] === 4) return { name: 'Four of a Kind', multiplier: 10, baseDamage: sumRanks };
  if (counts[0] === 3 && counts[1] === 2) return { name: 'Full House', multiplier: 8, baseDamage: sumRanks };
  if (isFlush) return { name: 'Flush', multiplier: 7, baseDamage: sumRanks };
  if (isStraight) return { name: 'Straight', multiplier: 6, baseDamage: sumRanks };
  if (counts[0] === 3) return { name: 'Three of a Kind', multiplier: 4, baseDamage: sumRanks };
  if (counts[0] === 2 && counts[1] === 2) return { name: 'Two Pair', multiplier: 3, baseDamage: sumRanks };
  if (counts[0] === 2) return { name: 'Pair', multiplier: 2, baseDamage: sumRanks };

  return { name: 'High Card', multiplier: 1, baseDamage: sumRanks };
}

function isConsecutive(ranks: number[]): boolean {
  const uniqueRanks = uniq(ranks);
  if (uniqueRanks.length < 5) return false;
  for (let i = 0; i < uniqueRanks.length - 1; i++) {
    if (uniqueRanks[i+1] !== uniqueRanks[i] + 1) {
      // Handle Ace-low straight
      if (i === 3 && uniqueRanks[i] === 5 && uniqueRanks[4] === 14) return true;
      return false;
    }
  }
  return true;
}
