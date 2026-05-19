import { create } from 'zustand';
import {
  GamePhase, Player, Tile, CombatState, AxialCoord, Card, ClashResult, PassiveAbility, LevelUpChoice, PlayerClass
} from '../lib/types';
import { coordToString } from '../lib/hexMath';
import {
  initializeGame as serverInitialize,
  movePlayer as serverMovePlayer,
  submitQueue as serverSubmitQueue,
  discardCards as serverDiscardCards,
  chooseLevelUpPassive as serverChooseLevelUp,
  descendToNextFloor as serverDescend,
  stayOnFloor as serverStay,
  useItem as serverUseItem,
} from '../lib/actions';

interface GameStore {
  sessionId: string | null;
  gamePhase: GamePhase;
  player: Player | null;
  grid: Record<string, Tile>;
  combatState: CombatState | null;

  // Visited tile coordinates (client-side trail, per session)
  visitedCoords: Set<string>;

  // Level-up
  pendingLevelUpChoices: LevelUpChoice[] | null;

  // Last resolved clash (for display in CombatView)
  lastClash: ClashResult | null;
  nextPhase: GamePhase | null;

  // XP/gold flash (for toast notifications)
  xpGained: number;
  goldGained: number;

  // Actions
  initializeGame: (playerClass: PlayerClass) => Promise<void>;
  movePlayer: (coord: AxialCoord) => Promise<void>;
  selectCard: (card: Card) => void;
  deselectCard: (card: Card) => void;
  playQueue: () => Promise<void>;
  discardHand: () => Promise<void>;
  clearLastClash: () => void;
  chooseLevelUp: (passive: PassiveAbility) => Promise<void>;
  descend: () => Promise<void>;
  stayOnFloor: () => Promise<void>;
  useItem: (itemName: string) => Promise<void>;
}

export const useGameStore = create<GameStore>((set, get) => ({
  sessionId: null,
  gamePhase: 'START_SCREEN',
  player: null,
  grid: {},
  combatState: null,
  visitedCoords: new Set<string>(),
  pendingLevelUpChoices: null,
  lastClash: null,
  nextPhase: null,
  xpGained: 0,
  goldGained: 0,

  initializeGame: async (playerClass: PlayerClass) => {
    const data = await serverInitialize(playerClass);
    set({
      sessionId: data.id,
      gamePhase: data.phase,
      player: data.player,
      grid: data.grid,
      combatState: data.combatState,
      pendingLevelUpChoices: data.pendingLevelUpChoices ?? null,
      lastClash: null,
      nextPhase: null,
      visitedCoords: new Set<string>(['0,0']), // start tile is always visited
    });
  },

  movePlayer: async (coord: AxialCoord) => {
    const { sessionId, gamePhase } = get();
    if (!sessionId || gamePhase !== 'EXPLORING') return;

    const data = await serverMovePlayer(sessionId, coord);
    if (!data) return;

    // Track the visited coord in client store
    const visited = new Set(get().visitedCoords);
    visited.add(coordToString(coord));

    set({
      gamePhase: data.phase,
      player: data.player,
      grid: data.grid,
      combatState: data.combatState,
      pendingLevelUpChoices: data.pendingLevelUpChoices ?? null,
      visitedCoords: visited,
    });
  },

  selectCard: (card: Card) => {
    const { combatState } = get();
    if (!combatState) return;
    if (combatState.playerQueue.length >= combatState.queueSlots) return;
    if (combatState.playerQueue.find((c) => c.id === card.id)) return;

    set({
      combatState: {
        ...combatState,
        playerQueue: [...combatState.playerQueue, card],
      },
    });
  },

  deselectCard: (card: Card) => {
    const { combatState } = get();
    if (!combatState) return;
    set({
      combatState: {
        ...combatState,
        playerQueue: combatState.playerQueue.filter((c) => c.id !== card.id),
      },
    });
  },

  playQueue: async () => {
    const { sessionId, combatState } = get();
    if (!sessionId || !combatState) return;
    if (combatState.playerQueue.length === 0) return;

    const cardIds = combatState.playerQueue.map((c) => c.id);

    // Optimistically clear selection
    set({ combatState: { ...combatState, playerQueue: [] } });

    const data = await serverSubmitQueue(sessionId, cardIds);
    if (!data) return;

    const result = data as any;

    set({
      gamePhase: result.phase,
      player: result.player,
      grid: result.grid,
      combatState: result.combatState,
      lastClash: result.lastClash ?? null,
      nextPhase: result.nextPhase ?? null,
      pendingLevelUpChoices: result.pendingLevelUpChoices ?? null,
      xpGained: result.xpGained ?? 0,
      goldGained: result.goldGained ?? 0,
    });
  },

  discardHand: async () => {
    const { sessionId, combatState } = get();
    if (!sessionId || !combatState) return;
    if (combatState.playerQueue.length === 0) return;

    const cardIds = combatState.playerQueue.map((c) => c.id);
    set({ combatState: { ...combatState, playerQueue: [] } });

    const data = await serverDiscardCards(sessionId, cardIds);
    if (!data) return;

    set({
      combatState: data.combatState,
      player: data.player,
    });
  },

  clearLastClash: () => {
    const { nextPhase } = get();
    if (nextPhase) {
      set({
        gamePhase: nextPhase,
        lastClash: null,
        nextPhase: null,
      });
    } else {
      set({ lastClash: null });
    }
  },

  chooseLevelUp: async (passive: PassiveAbility) => {
    const { sessionId } = get();
    if (!sessionId) return;

    const data = await serverChooseLevelUp(sessionId, passive);
    if (!data) return;

    set({
      gamePhase: data.phase,
      player: data.player,
      grid: data.grid,
      pendingLevelUpChoices: null,
    });
  },

  descend: async () => {
    const { sessionId } = get();
    if (!sessionId) return;
    const data = await serverDescend(sessionId);
    if (!data) return;
    set({
      gamePhase: data.phase,
      player: data.player,
      grid: data.grid,
      combatState: null,
      visitedCoords: new Set<string>(['0,0']),
    });
  },

  stayOnFloor: async () => {
    const { sessionId } = get();
    if (!sessionId) return;
    const data = await serverStay(sessionId);
    if (!data) return;
    set({
      gamePhase: data.phase,
      player: data.player,
      grid: data.grid,
    });
  },

  useItem: async (itemName: string) => {
    const { sessionId } = get();
    if (!sessionId) return;
    const data = await serverUseItem(sessionId, itemName);
    if (!data) return;
    set({
      player: data.player,
      grid: data.grid,
    });
  },
}));
