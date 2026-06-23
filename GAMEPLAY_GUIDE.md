# Dungeon-Sweeper: Gameplay & Combat Guide

Dungeon-Sweeper is a rogue-lite RPG that blends tactical hexagonal dungeon exploration (reminiscent of Minesweeper) with an intricate, elemental counter-based spellcasting combat system.

---

## 🗺️ Exploration: The Minesweeper Map
Players navigate floors represented by hexagonal grids. Moving to an adjacent tile reveals it and exposes new parts of the floor.

*   **Danger Numbers:** Safe tiles display a number showing the exact count of adjacent trap/enemy threats.
*   **Special Landmark Tiles:**
    *   **ENEMY:** Triggers a combat encounter when stepped on.
    *   **SHOP:** Spend gold on new spells or healing items. Can be re-visited to browse fresh stock.
    *   **REST:** Campfires to heal HP or upgrade an equipped spell (+25% base damage).
    *   **TREASURE:** Contains gold, chest loot, or items.
    *   **EVENT:** Interactive text events with choices.
    *   **KEY / EXIT:** Find the key on the map to unlock the exit door and descend to the next floor.

---

## ⚔️ Combat System
Combat is turn-based, pitting your spell library and elemental resource management against a queue of enemy actions.

### 1. The Elemental Counter Wheel
Both player sequences and enemy queues utilize four core elements plus a void element. Elements counter each other in a circular wheel:

```
      ▲ [EARTH]
      │   (counters)
      │   ▼
   [FIRE] ──(counters)──► [AIR]
      ▲                     │
      │                 (counters)
  (counters)                ▼
      │                  [WATER]
```

*   **EARTH** counters **FIRE**
*   **FIRE** counters **AIR**
*   **AIR** counters **WATER**
*   **WATER** counters **EARTH**
*   **VOID** cannot counter and is never countered.

---

### 2. Turn Sequence & Clash Resolution
Each combat round is resolved slot-by-slot:
1.  **Drafting the Sequence:** You are given an active element pool based on your equipped spells, plus any **Spare Elements** you choose to inject from your inventory (dropped by defeated enemies). You arrange these elements into your board slots (typically 4 to 8 slots depending on your mana).
2.  **The Clash:** Your sequence is compared slot-by-slot against the enemy's queue:
    *   `COUNTER`: Player counters the enemy element (0 damage taken).
    *   `COUNTERED`: Enemy counters the player element (Player takes 100% of enemy attack damage).
    *   `NEUTRAL`: Elements do not counter each other (Player takes 50% enemy damage).
    *   `EMPTY`: Slot is undefended (Player takes 100% enemy damage).

#### 🛡️ The 40% Counter Negation Rule
If the player successfully counters **40% or more** of the enemy's active queue slots (e.g., at least 2 out of 4 slots), **all incoming enemy damage for the round is negated to 0**.

---

### 3. Spell Triggering & Combos
Equip up to 4 spells in your active loadout. Every spell has a specific elemental recipe (e.g., *Fireball* requires `[FIRE, FIRE, AIR]`).

*   **Sliding Window Matching:** The system scans your placed sequence from left to right. When it finds a contiguous sequence matching a spell recipe, that spell triggers and deals damage. Matched elements are consumed.
*   **Spell Combos:** If multiple spells trigger consecutively/adjacently in the same round, they form a **Combo**, applying a damage multiplier (e.g., **1.5x** for the second spell, **2.0x** for subsequent spells).
*   **Basic Strikes:** Elements that were placed but not consumed by any spell deal minor basic strike damage (provided that slot wasn't countered by the enemy).

---

### 4. Focus Pips & Class Ultimate Abilities
Triggering spells and countering enemy slots builds **Focus Pips** (up to 5). Once full, you can activate your class ultimate:

*   🔥 **BERSERKER (Ignite):** FIRE spells deal **double damage** this turn.
*   🛡️ **PALADIN (Fortress):** Become **completely immune** to all damage this turn.
*   ⚡ **WIZARD (Cascade):** Grants +1 temporary `AIR` element, and all spells triggered this turn count as adjacent combo triggers regardless of position.
*   👁️ **OVERSEER (Insight):** Fully reveals the enemy's queue of elements for precise countering.

---

### 5. Combat Omens
A volatile omen rotates every round, adding dynamic modifiers to the clash:
*   **DRAIN:** Discards the leftmost element from your starting pool.
*   **CURSE:** Adds a `VOID` element to your pool next turn if you take damage.
*   **ENRAGE:** Spells that triggered in the previous turn deal 0 damage.
*   **FURY:** Enemy gains +1 slot queue length next round if player takes damage.
*   **SHIELD:** Enemy takes 50% less spell damage.
