import { create } from 'zustand';
import {
  GamePhase,
  Player,
  Tile,
  CombatState,
  AxialCoord,
  ClashResult,
  PassiveAbility,
  PlayerClass,
  CardElement,
  Spell,
  SpareElements,
} from '../lib/types';
import { coordToString } from '../lib/hexMath';
import {
  initializeGame as serverInitialize,
  movePlayer as serverMovePlayer,
  submitSequence as serverSubmitSequence,
  chooseLevelUpPassive as serverChooseLevelUp,
  descendToNextFloor as serverDescend,
  stayOnFloor as serverStay,
  useItem as serverUseItem,
  getRecentSessions as serverGetRecentSessions,
  resumeSession as serverResumeSession,
  claimPostCombatRewardSpell as serverClaimRewardSpell,
  equipSpell as serverEquipSpell,
  unequipSpell as serverUnequipSpell,
  handleEvent as serverHandleEvent,
  clickTreasureTile as serverClickTreasureTile,
  exitTreasureRoom as serverExitTreasureRoom,
  restHeal as serverRestHeal,
  restUpgradeSpell as serverRestUpgradeSpell,
  unleashUltimate as serverUnleashUltimate,
  cheatFocus as serverCheatFocus,
} from '../lib/actions';
import {
  purchaseShopSpell as serverPurchaseShopSpell,
  purchaseSpareElements as serverPurchaseSpareElements,
  sellLibrarySpell as serverSellLibrarySpell,
  exitShop as serverExitShop,
} from '../lib/shopActions';

interface GameStore {
  sessionId: string | null;
  gamePhase: GamePhase;
  player: Player | null;
  grid: Record<string, Tile>;
  combatState: CombatState | null;
  visitedCoords: Set<string>;
  pendingLevelUpChoices: any;
  lastClash: ClashResult | null;
  nextPhase: GamePhase | null;
  xpGained: number;
  goldGained: number;
  shopSpells: Spell[];
  shopRerolled: boolean;

  // Actions — Session
  setPhase: (phase: GamePhase) => void;
  initializeGame: (playerClass: PlayerClass) => Promise<void>;
  resumeSession: (sessionId: string) => Promise<void>;
  getRecentSessions: () => Promise<any[]>;

  // Actions — Exploration
  movePlayer: (coord: AxialCoord) => Promise<void>;

  // Actions — Combat (sequence-based)
  setPlayerSequence: (sequence: (CardElement | null)[]) => void;
  placeElement: (element: CardElement, slotIndex: number) => void;
  clearSlot: (slotIndex: number) => void;
  injectSpare: (element: CardElement) => void;
  returnSpareFromSlot: (slotIndex: number) => void;
  clearSequence: () => void;
  submitSequence: () => Promise<void>;
  unleashUltimate: () => Promise<void>;
  cheatFocus: () => Promise<void>;
  clearLastClash: () => void;

  // Actions — Spells
  claimRewardSpell: (choiceIndex: number) => Promise<void>;
  equipSpell: (spellId: string) => Promise<void>;
  unequipSpell: (spellId: string) => Promise<void>;

  // Actions — Level Up
  chooseLevelUp: (passive: PassiveAbility) => Promise<void>;

  // Actions — Floor
  descend: () => Promise<void>;
  stayOnFloor: () => Promise<void>;

  // Actions — Items
  useItem: (itemName: string) => Promise<void>;

  // Actions — Shop
  buySpell: (spellId: string) => Promise<void>;
  buySpareElements: (element: CardElement, amount: number) => Promise<void>;
  sellSpell: (spellId: string) => Promise<void>;
  exitShop: () => Promise<void>;

  // Actions — Rest Room
  restHeal: () => Promise<void>;
  restUpgradeSpell: (spellId: string) => Promise<void>;

  // Actions — Event / Treasure
  handleEvent: (choice: string) => Promise<void>;
  clickTreasureTile: (coord: AxialCoord) => Promise<void>;
  exitTreasureRoom: () => Promise<void>;
}

function applySessionData(data: any) {
  return {
    sessionId: data.id,
    gamePhase: data.phase,
    player: data.player,
    grid: data.grid,
    combatState: data.combatState,
    pendingLevelUpChoices: data.pendingLevelUpChoices ?? null,
    shopSpells: data.shopSpells ?? [],
    shopRerolled: data.shopRerolled ?? false,
  };
}

export const useGameStore = create<GameStore>((set, get) => ({
  sessionId: null,
  gamePhase: 'DASHBOARD',
  player: null,
  grid: {},
  combatState: null,
  visitedCoords: new Set<string>(),
  pendingLevelUpChoices: null,
  lastClash: null,
  nextPhase: null,
  xpGained: 0,
  goldGained: 0,
  shopSpells: [],
  shopRerolled: false,

  setPhase: (phase) => set({ gamePhase: phase }),

  // ── Session ────────────────────────────────────────────────────────────────

  initializeGame: async (playerClass) => {
    const data = await serverInitialize(playerClass);
    if (typeof window !== 'undefined') {
      localStorage.setItem('dungeon_sweeper_session_id', data.id);
    }
    set({
      ...applySessionData(data),
      lastClash: null,
      nextPhase: null,
      visitedCoords: new Set<string>(['0,0']),
    });
  },

  resumeSession: async (sessionId) => {
    const data = await serverResumeSession(sessionId);
    if (!data) return;
    if (typeof window !== 'undefined') {
      localStorage.setItem('dungeon_sweeper_session_id', data.id);
    }
    set({
      ...applySessionData(data),
      lastClash: null,
      nextPhase: null,
      visitedCoords: new Set<string>(['0,0']),
    });
  },

  getRecentSessions: async () => serverGetRecentSessions(),

  // ── Exploration ────────────────────────────────────────────────────────────

  movePlayer: async (coord) => {
    const { sessionId, gamePhase } = get();
    if (!sessionId || gamePhase !== 'EXPLORING') return;
    const data = await serverMovePlayer(sessionId, coord);
    if (!data) return;
    const visited = new Set(get().visitedCoords);
    visited.add(coordToString(coord));
    set({ ...applySessionData(data), visitedCoords: visited });
  },

  // ── Combat: Sequence Building ─────────────────────────────────────────────

  setPlayerSequence: (sequence) => {
    const { combatState } = get();
    if (!combatState) return;
    set({ combatState: { ...combatState, playerSequence: sequence } });
  },

  placeElement: (element, slotIndex) => {
    const { combatState } = get();
    if (!combatState) return;
    const newSequence = [...combatState.playerSequence];
    if (slotIndex < 0 || slotIndex >= newSequence.length) return;
    // Check element is available in activePool (not already placed)
    const usedInSequence = newSequence.filter(Boolean) as CardElement[];
    const poolCopy = [...combatState.activePool];
    for (const used of usedInSequence) {
      const idx = poolCopy.indexOf(used);
      if (idx !== -1) poolCopy.splice(idx, 1);
    }
    if (!poolCopy.includes(element)) return; // not available
    newSequence[slotIndex] = element;
    set({ combatState: { ...combatState, playerSequence: newSequence } });
  },

  clearSlot: (slotIndex) => {
    const { combatState } = get();
    if (!combatState) return;
    const newSequence = [...combatState.playerSequence];
    newSequence[slotIndex] = null;
    set({ combatState: { ...combatState, playerSequence: newSequence } });
  },

  injectSpare: (element) => {
    const { combatState } = get();
    if (!combatState) return;
    const spares = { ...combatState.spareElements };
    if (spares[element as keyof SpareElements] <= 0) return;
    spares[element as keyof SpareElements] -= 1;
    const newPool = [...combatState.activePool, element];
    set({ combatState: { ...combatState, activePool: newPool, spareElements: spares } });
  },

  returnSpareFromSlot: (slotIndex) => {
    const { combatState } = get();
    if (!combatState) return;
    const el = combatState.playerSequence[slotIndex];
    if (!el) return;
    // Determine if this element came from the base pool or was a spare inject
    // by checking if it's in the base pool (derived from equipped spells)
    const equippedSpells = get().player?.spells.filter((s) => s.equipped) ?? [];
    const basePool: CardElement[] = [];
    for (const spell of equippedSpells) basePool.push(...spell.recipe);
    const usedInOtherSlots = combatState.playerSequence
      .filter((_, i) => i !== slotIndex)
      .filter(Boolean) as CardElement[];
    const basePoolCopy = [...basePool];
    for (const used of usedInOtherSlots) {
      const idx = basePoolCopy.indexOf(used);
      if (idx !== -1) basePoolCopy.splice(idx, 1);
    }
    // If the element being cleared is NOT in remaining basePool, it was a spare
    const wasSpare = !basePoolCopy.includes(el);
    const newSequence = [...combatState.playerSequence];
    newSequence[slotIndex] = null;
    const newSpares = { ...combatState.spareElements };
    let newPool = [...combatState.activePool];
    if (wasSpare && (el === 'FIRE' || el === 'WATER' || el === 'AIR' || el === 'EARTH')) {
      newSpares[el] += 1;
      const poolIdx = newPool.indexOf(el);
      if (poolIdx !== -1) {
        newPool.splice(poolIdx, 1);
      }
    }
    set({
      combatState: {
        ...combatState,
        playerSequence: newSequence,
        activePool: newPool,
        spareElements: newSpares,
      },
    });
  },

  clearSequence: () => {
    const { combatState, player } = get();
    if (!combatState || !player) return;

    // Base pool from spells
    const equippedSpells = player.spells.filter((s) => s.equipped);
    const basePool: CardElement[] = [];
    for (const spell of equippedSpells) basePool.push(...spell.recipe);

    // Any element in activePool that is not in basePool is an injected spare.
    // Return all injected spares back to spareElements.
    const basePoolCopy = [...basePool];
    const newSpares = { ...combatState.spareElements };

    for (const el of combatState.activePool) {
      const idx = basePoolCopy.indexOf(el);
      if (idx !== -1) {
        basePoolCopy.splice(idx, 1);
      } else {
        if (el === 'FIRE' || el === 'WATER' || el === 'AIR' || el === 'EARTH') {
          newSpares[el] += 1;
        }
      }
    }

    set({
      combatState: {
        ...combatState,
        playerSequence: new Array(combatState.boardLength).fill(null),
        activePool: basePool,
        spareElements: newSpares,
      },
    });
  },

  submitSequence: async () => {
    const { sessionId, combatState, player } = get();
    if (!sessionId || !combatState || !player) return;

    const playerSequence = combatState.playerSequence;
    // Determine which spares were injected (active pool vs base pool delta)
    const equippedSpells = player.spells.filter((s) => s.equipped);
    const basePool: CardElement[] = [];
    for (const spell of equippedSpells) basePool.push(...spell.recipe);
    // Injected spares = activePool elements that are not in basePool
    const basePoolCopy = [...basePool];
    const injectedSpares: CardElement[] = [];
    for (const el of combatState.activePool) {
      const idx = basePoolCopy.indexOf(el);
      if (idx !== -1) {
        basePoolCopy.splice(idx, 1);
      } else {
        injectedSpares.push(el);
      }
    }

    const data = await serverSubmitSequence(sessionId, playerSequence, injectedSpares);
    if (!data) return;

    const result = data as any;
    set({
      ...applySessionData(result),
      lastClash: result.lastClash ?? null,
      nextPhase: result.nextPhase ?? null,
      xpGained: result.xpGained ?? 0,
      goldGained: result.goldGained ?? 0,
    });
  },

  unleashUltimate: async () => {
    const { sessionId } = get();
    if (!sessionId) return;
    const data = await serverUnleashUltimate(sessionId);
    if (!data) return;
    const result = data as any;
    set({
      ...applySessionData(result),
      lastClash: result.lastClash ?? null,
      nextPhase: result.nextPhase ?? null,
      xpGained: result.xpGained ?? 0,
      goldGained: result.goldGained ?? 0,
    });
  },

  cheatFocus: async () => {
    const { sessionId } = get();
    if (!sessionId) return;
    const data = await serverCheatFocus(sessionId);
    if (!data) return;
    set(applySessionData(data));
  },

  clearLastClash: () => {
    const { nextPhase } = get();
    if (nextPhase) {
      set({ gamePhase: nextPhase, lastClash: null, nextPhase: null });
    } else {
      set({ lastClash: null });
    }
  },

  // ── Spells ────────────────────────────────────────────────────────────────

  claimRewardSpell: async (choiceIndex) => {
    const { sessionId } = get();
    if (!sessionId) return;
    const data = await serverClaimRewardSpell(sessionId, choiceIndex);
    if (!data) return;
    set(applySessionData(data));
  },

  equipSpell: async (spellId) => {
    const { sessionId } = get();
    if (!sessionId) return;
    const data = await serverEquipSpell(sessionId, spellId);
    if (!data || (data as any).error) return;
    set(applySessionData(data));
  },

  unequipSpell: async (spellId) => {
    const { sessionId } = get();
    if (!sessionId) return;
    const data = await serverUnequipSpell(sessionId, spellId);
    if (!data || (data as any).error) return;
    set(applySessionData(data));
  },

  // ── Level Up ──────────────────────────────────────────────────────────────

  chooseLevelUp: async (passive) => {
    const { sessionId } = get();
    if (!sessionId) return;
    const data = await serverChooseLevelUp(sessionId, passive);
    if (!data) return;
    set({ ...applySessionData(data), pendingLevelUpChoices: null });
  },

  // ── Floor ─────────────────────────────────────────────────────────────────

  descend: async () => {
    const { sessionId } = get();
    if (!sessionId) return;
    const data = await serverDescend(sessionId);
    if (!data) return;
    set({
      ...applySessionData(data),
      combatState: null,
      visitedCoords: new Set<string>(['0,0']),
    });
  },

  stayOnFloor: async () => {
    const { sessionId } = get();
    if (!sessionId) return;
    const data = await serverStay(sessionId);
    if (!data) return;
    set(applySessionData(data));
  },

  // ── Items ─────────────────────────────────────────────────────────────────

  useItem: async (itemName) => {
    const { sessionId } = get();
    if (!sessionId) return;
    const data = await serverUseItem(sessionId, itemName);
    if (!data) return;
    set(applySessionData(data));
  },

  // ── Shop ──────────────────────────────────────────────────────────────────

  buySpell: async (spellId) => {
    const { sessionId } = get();
    if (!sessionId) return;
    const data = await serverPurchaseShopSpell(sessionId, spellId);
    if (!data) return;
    set(applySessionData(data));
  },

  buySpareElements: async (element, amount) => {
    const { sessionId } = get();
    if (!sessionId) return;
    const data = await serverPurchaseSpareElements(sessionId, element, amount);
    if (!data) return;
    set(applySessionData(data));
  },

  sellSpell: async (spellId) => {
    const { sessionId } = get();
    if (!sessionId) return;
    const data = await serverSellLibrarySpell(sessionId, spellId);
    if (!data) return;
    set(applySessionData(data));
  },

  exitShop: async () => {
    const { sessionId } = get();
    if (!sessionId) return;
    const data = await serverExitShop(sessionId);
    if (!data) return;
    set(applySessionData(data));
  },

  // ── Rest ──────────────────────────────────────────────────────────────────

  restHeal: async () => {
    const { sessionId } = get();
    if (!sessionId) return;
    const data = await serverRestHeal(sessionId);
    if (!data) return;
    set(applySessionData(data));
  },

  restUpgradeSpell: async (spellId) => {
    const { sessionId } = get();
    if (!sessionId) return;
    const data = await serverRestUpgradeSpell(sessionId, spellId);
    if (!data) return;
    set(applySessionData(data));
  },

  // ── Event / Treasure ─────────────────────────────────────────────────────

  handleEvent: async (choice) => {
    const { sessionId } = get();
    if (!sessionId) return;
    const data = await serverHandleEvent(sessionId, choice);
    if (!data) return;
    set(applySessionData(data));
  },

  clickTreasureTile: async (coord) => {
    const { sessionId } = get();
    if (!sessionId) return;
    const data = await serverClickTreasureTile(sessionId, coord);
    if (!data) return;
    set(applySessionData(data));
  },

  exitTreasureRoom: async () => {
    const { sessionId } = get();
    if (!sessionId) return;
    const data = await serverExitTreasureRoom(sessionId);
    if (!data) return;
    set(applySessionData(data));
  },
}));
