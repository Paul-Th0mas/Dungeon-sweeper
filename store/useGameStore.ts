import { create } from 'zustand';
import {
  GamePhase, Player, Tile, CombatState, AxialCoord, Card, SpellResult, PassiveAbility, LevelUpChoice,
} from '../lib/types';
import {
  initializeGame as serverInitialize,
  movePlayer as serverMovePlayer,
  submitHand as serverSubmitHand,
  discardCards as serverDiscardCards,
  chooseLevelUpPassive as serverChooseLevelUp,
} from '../lib/actions';

interface GameStore {
  sessionId: string | null;
  gamePhase: GamePhase;
  player: Player | null;
  grid: Record<string, Tile>;
  combatState: CombatState | null;

  // Level-up
  pendingLevelUpChoices: LevelUpChoice[] | null;

  // Last resolved spell (for display in CombatView)
  lastSpell: SpellResult | null;

  // XP/gold flash (for toast notifications)
  xpGained: number;
  goldGained: number;

  // Actions
  initializeGame: () => Promise<void>;
  movePlayer: (coord: AxialCoord) => Promise<void>;
  selectCard: (card: Card) => void;
  deselectCard: (card: Card) => void;
  playHand: () => Promise<void>;
  discardHand: () => Promise<void>;
  chooseLevelUp: (passive: PassiveAbility) => Promise<void>;
}

export const useGameStore = create<GameStore>((set, get) => ({
  sessionId: null,
  gamePhase: 'EXPLORING',
  player: null,
  grid: {},
  combatState: null,
  pendingLevelUpChoices: null,
  lastSpell: null,
  xpGained: 0,
  goldGained: 0,

  initializeGame: async () => {
    const data = await serverInitialize();
    set({
      sessionId: data.id,
      gamePhase: data.phase,
      player: data.player,
      grid: data.grid,
      combatState: data.combatState,
      pendingLevelUpChoices: data.pendingLevelUpChoices ?? null,
      lastSpell: null,
    });
  },

  movePlayer: async (coord: AxialCoord) => {
    const { sessionId, gamePhase } = get();
    if (!sessionId || gamePhase !== 'EXPLORING') return;

    const data = await serverMovePlayer(sessionId, coord);
    if (!data) return;

    set({
      gamePhase: data.phase,
      player: data.player,
      grid: data.grid,
      combatState: data.combatState,
      pendingLevelUpChoices: data.pendingLevelUpChoices ?? null,
    });
  },

  selectCard: (card: Card) => {
    const { combatState } = get();
    if (!combatState) return;
    if (combatState.selectedCards.length >= 5) return;
    if (combatState.selectedCards.find((c) => c.id === card.id)) return;

    set({
      combatState: {
        ...combatState,
        selectedCards: [...combatState.selectedCards, card],
      },
    });
  },

  deselectCard: (card: Card) => {
    const { combatState } = get();
    if (!combatState) return;
    set({
      combatState: {
        ...combatState,
        selectedCards: combatState.selectedCards.filter((c) => c.id !== card.id),
      },
    });
  },

  playHand: async () => {
    const { sessionId, combatState } = get();
    if (!sessionId || !combatState) return;
    if (combatState.selectedCards.length === 0) return;

    const cardIds = combatState.selectedCards.map((c) => c.id);

    // Optimistically clear selection
    set({ combatState: { ...combatState, selectedCards: [] } });

    const data = await serverSubmitHand(sessionId, cardIds);
    if (!data) return;

    const result = data as any;

    set({
      gamePhase: result.phase,
      player: result.player,
      grid: result.grid,
      combatState: result.combatState,
      lastSpell: result.lastSpell ?? null,
      pendingLevelUpChoices: result.pendingLevelUpChoices ?? null,
      xpGained: result.xpGained ?? 0,
      goldGained: result.goldGained ?? 0,
    });
  },

  discardHand: async () => {
    const { sessionId, combatState } = get();
    if (!sessionId || !combatState) return;
    if (combatState.selectedCards.length === 0) return;
    if (combatState.discardsRemaining <= 0) return;

    const cardIds = combatState.selectedCards.map((c) => c.id);
    set({ combatState: { ...combatState, selectedCards: [] } });

    const data = await serverDiscardCards(sessionId, cardIds);
    if (!data) return;

    set({
      combatState: data.combatState,
      player: data.player,
    });
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
}));
