import { PlayerClass, CardElement, Card, StatusEffect } from './types';

/**
 * Wildcard Design Philosophy:
 * - Creates a decision, not just a power spike.
 * - Bends a specific rule of the elemental clash system, carrying a cost.
 * - Separate durability from regular cards.
 * - By default, does not contribute to spell recipes.
 * - Synergizes with one specific class.
 */
export abstract class BaseWildcard {
  public readonly id: string;
  public readonly name: string;
  public readonly description: string;
  public readonly preferredClass: PlayerClass;
  public readonly contributesToRecipes: boolean;
  
  public maxDurability: number;
  public currentDurability: number;

  constructor(
    id: string,
    name: string,
    description: string,
    maxDurability: number,
    preferredClass: PlayerClass,
    contributesToRecipes: boolean = false
  ) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.maxDurability = maxDurability;
    this.currentDurability = maxDurability; // Starts fully repaired
    this.preferredClass = preferredClass;
    this.contributesToRecipes = contributesToRecipes;
  }

  /**
   * Returns whether the Wildcard has turned to Ash (0 durability).
   * Ash Wildcards must be repaired at a Shop or Rest site before they can be used again.
   */
  get isAsh(): boolean {
    return this.currentDurability <= 0;
  }

  /**
   * Reduces durability when the Wildcard is used in a clash.
   */
  public consumeDurability(): void {
    if (this.currentDurability > 0) {
      this.currentDurability -= 1;
    }
  }

  /**
   * Repairs the Wildcard to full durability.
   */
  public repair(): void {
    this.currentDurability = this.maxDurability;
  }

  /**
   * Abstract method defining the core rule-bending effect of the Wildcard.
   * This is called during the clash resolution phase.
   * 
   * @param playerQueue The current queue of cards played by the player.
   * @param enemyQueue The current queue of elements played by the enemy.
   * @param playerClass The class of the player (used for synergy checks).
   * @returns An object detailing modifications to the clash, damage, or status effects.
   */
  abstract applyEffect(
    playerQueue: Card[], 
    enemyQueue: CardElement[], 
    playerClass: PlayerClass
  ): {
    bonusDamage?: number;
    bonusStatusEffects?: StatusEffect[];
    modifiedPlayerQueue?: Card[];
    modifiedEnemyQueue?: CardElement[];
  };
}

const CLASS_BASE_ELEMENTS: Record<PlayerClass, CardElement> = {
  BERSERKER: 'FIRE',
  PALADIN: 'WATER',
  WIZARD: 'AIR',
  OVERSEER: 'EARTH',
};

export class PrismShard extends BaseWildcard {
  constructor() {
    super(
      'wildcard_prism_shard',
      'Prism Shard',
      'Copies the element and rank of the card immediately before it. If played first, defaults to your Class Element.',
      3, // Durability: 3 uses
      'WIZARD',
      true // Contributes to spell recipes
    );
  }

  applyEffect(
    playerQueue: Card[],
    enemyQueue: CardElement[],
    playerClass: PlayerClass
  ) {
    const modifiedPlayerQueue = [...playerQueue];
    
    // Find the index of this wildcard in the queue
    const shardIndex = modifiedPlayerQueue.findIndex((c) => c.id === this.id);
    
    if (shardIndex !== -1) {
      let copiedElement: CardElement;
      let copiedRank: number;

      if (shardIndex === 0) {
        // Edge Case 1: First card in queue defaults to player's class element
        copiedElement = CLASS_BASE_ELEMENTS[playerClass];
        copiedRank = 5; // Default rank if no preceding card exists
      } else {
        // Copy the preceding card in the queue
        // (If the preceding card was a Wildcard, we assume its applyEffect has already resolved its element/rank)
        const precedingCard = modifiedPlayerQueue[shardIndex - 1];
        copiedElement = precedingCard.element;
        copiedRank = precedingCard.rank;
      }

      // Replace the Prism Shard placeholder in the queue with a temporary copied card
      modifiedPlayerQueue[shardIndex] = {
        id: `${this.id}_copied_${Date.now()}`,
        element: copiedElement,
        rank: copiedRank,
      };
    }

    return {
      modifiedPlayerQueue
    };
  }
}

export class VoidShard extends BaseWildcard {
  constructor() {
    super(
      'wildcard_void_shard',
      'Void Shard',
      'Has no element. Wins every standard clash unconditionally, dealing a fixed 20 damage. If clashing against another Void effect, both take 20 damage.',
      2, // Durability: 2 uses
      'BERSERKER',
      false // Does NOT contribute to spell recipes
    );
  }

  applyEffect(
    playerQueue: Card[],
    enemyQueue: CardElement[],
    playerClass: PlayerClass
  ) {
    const modifiedPlayerQueue = [...playerQueue];
    const shardIndex = modifiedPlayerQueue.findIndex((c) => c.id === this.id);

    if (shardIndex !== -1) {
      modifiedPlayerQueue[shardIndex] = {
        id: `${this.id}_resolved_${Date.now()}`,
        // Using 'VOID' as element; requires engine support to parse as unconditional win.
        element: 'VOID' as CardElement, 
        rank: 10, // Rank 10 * 2 = 20 base damage as fallback, though engine will hardcode 20 dmg.
      };
    }

    return {
      modifiedPlayerQueue
    };
  }
}

export class Catalyst extends BaseWildcard {
  constructor() {
    super(
      'wildcard_catalyst',
      'Catalyst',
      'Declare any element when queued. Resolves as that element with rank 7. Counts toward spell recipes as the declared element.',
      2, // Durability: 2 uses
      'WIZARD',
      true // Contributes to spell recipes
    );
  }

  applyEffect(
    playerQueue: Card[],
    enemyQueue: CardElement[],
    playerClass: PlayerClass
  ) {
    const modifiedPlayerQueue = [...playerQueue];
    const shardIndex = modifiedPlayerQueue.findIndex((c) => c.id === this.id);

    if (shardIndex !== -1) {
      const cardInQueue = modifiedPlayerQueue[shardIndex];
      
      // The UI is expected to attach the player's chosen element to specialModifier.declaredElement
      // Fallback to player's class base element if none was provided somehow
      const fallbackElement = CLASS_BASE_ELEMENTS[playerClass];
      const declaredElement = (cardInQueue.specialModifier?.declaredElement as CardElement) || fallbackElement;

      modifiedPlayerQueue[shardIndex] = {
        id: `${this.id}_resolved_${Date.now()}`,
        element: declaredElement,
        rank: 7, // Fixed rank 7
        // Carry over special modifiers to let engine enforce "one recipe per queue" rules
        specialModifier: {
          ...cardInQueue.specialModifier,
          isCatalyst: true 
        }
      };
    }

    return {
      modifiedPlayerQueue
    };
  }
}

export class AegisShard extends BaseWildcard {
  constructor() {
    super(
      'wildcard_aegis_shard',
      'Aegis Shard',
      'When played, immediately grants 15 Vigor block in combat. Does not contribute to spell recipes.',
      2, // Durability: 2 uses
      'PALADIN',
      false // Does NOT contribute to spell recipes
    );
  }

  applyEffect(
    playerQueue: Card[],
    enemyQueue: CardElement[],
    playerClass: PlayerClass
  ) {
    const modifiedPlayerQueue = [...playerQueue];
    const shardIndex = modifiedPlayerQueue.findIndex((c) => c.id === this.id);

    if (shardIndex !== -1) {
      modifiedPlayerQueue[shardIndex] = {
        id: `${this.id}_resolved_${Date.now()}`,
        element: 'VOID' as CardElement,
        rank: 0,
        specialModifier: {
          isAegis: true
        }
      };
    }

    return {
      modifiedPlayerQueue
    };
  }
}

export class TerraStone extends BaseWildcard {
  constructor() {
    super(
      'wildcard_terra_stone',
      'Terra Stone',
      'Draws one Earth card from your discard pile back to your hand when played.',
      2, // Durability: 2 uses
      'OVERSEER',
      false // Does NOT contribute to spell recipes
    );
  }

  applyEffect(
    playerQueue: Card[],
    enemyQueue: CardElement[],
    playerClass: PlayerClass
  ) {
    const modifiedPlayerQueue = [...playerQueue];
    const shardIndex = modifiedPlayerQueue.findIndex((c) => c.id === this.id);

    if (shardIndex !== -1) {
      modifiedPlayerQueue[shardIndex] = {
        id: `${this.id}_resolved_${Date.now()}`,
        element: 'VOID' as CardElement,
        rank: 0,
        specialModifier: {
          isTerraStone: true
        }
      };
    }

    return {
      modifiedPlayerQueue
    };
  }
}

export class ChaosShard extends BaseWildcard {
  constructor() {
    super(
      'wildcard_chaos_shard',
      'Chaos Shard',
      'Transforms into a random Rank 10 card of any element when queued.',
      3, // Durability: 3 uses
      'BERSERKER',
      true // Contributes to spell recipes
    );
  }

  applyEffect(
    playerQueue: Card[],
    enemyQueue: CardElement[],
    playerClass: PlayerClass
  ) {
    const modifiedPlayerQueue = [...playerQueue];
    const shardIndex = modifiedPlayerQueue.findIndex((c) => c.id === this.id);

    if (shardIndex !== -1) {
      const elements: CardElement[] = ['FIRE', 'WATER', 'AIR', 'EARTH'];
      const randomElement = elements[Math.floor(Math.random() * elements.length)];

      modifiedPlayerQueue[shardIndex] = {
        id: `${this.id}_resolved_${Date.now()}`,
        element: randomElement,
        rank: 10,
        specialModifier: {
          isChaosShard: true
        }
      };
    }

    return {
      modifiedPlayerQueue
    };
  }
}

export const ALL_WILDCARDS = [
  PrismShard,
  VoidShard,
  Catalyst,
  AegisShard,
  TerraStone,
  ChaosShard
];

export function getWildcardInstance(type: string): BaseWildcard | null {
  if (type === 'wildcard_prism_shard') return new PrismShard();
  if (type === 'wildcard_void_shard') return new VoidShard();
  if (type === 'wildcard_catalyst') return new Catalyst();
  if (type === 'wildcard_aegis_shard') return new AegisShard();
  if (type === 'wildcard_terra_stone') return new TerraStone();
  if (type === 'wildcard_chaos_shard') return new ChaosShard();
  return null;
}
