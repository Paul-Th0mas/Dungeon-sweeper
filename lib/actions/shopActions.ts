'use server';

import {
  purchaseShopSpell as _purchaseShopSpell,
  purchaseSpareElements as _purchaseSpareElements,
  sellLibrarySpell as _sellLibrarySpell,
  exitShop as _exitShop,
} from './actions';
import { CardElement } from '../types';

export async function purchaseShopSpell(sessionId: string, spellId: string) {
  return _purchaseShopSpell(sessionId, spellId);
}

export async function purchaseSpareElements(sessionId: string, element: CardElement, amount: number) {
  return _purchaseSpareElements(sessionId, element, amount);
}

export async function sellLibrarySpell(sessionId: string, spellId: string) {
  return _sellLibrarySpell(sessionId, spellId);
}

export async function exitShop(sessionId: string) {
  return _exitShop(sessionId);
}
