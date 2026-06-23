# Dungeon-Sweeper

A tactical rogue-lite RPG that fuses **hexagonal grid exploration** (reminiscent of Minesweeper) with a deep, **elemental counter-based spellcasting combat system**. Built on a modern Next.js, Prisma, and Tailwind CSS stack.

---

## Core Pillars & Gameplay Mechanics

### 1. Hexagonal Grid Exploration
Players navigate descending floors rendered as a grid of hexagonal tiles. Moving to adjacent tiles reveals them, peeling back the fog of war.
* **Danger Numbers:** Safe tiles display a number showing the exact count of adjacent threats (enemy or trap tiles), using Minesweeper logic.
* **Special Landmarks:**
  * **ENEMY:** Stepping on these triggers a turn-based combat encounter.
  * **SHOP:** Spend gold on new spells or healing items. Shop stocks can be rerolled for a cost.
  * **REST:** Sit at campfires to restore HP or upgrade an equipped spell (+25% base damage).
  * **TREASURE:** Enter treasure chambers with chest loot, items, or gold.
  * **EVENT:** Interactive text-based events requiring choices.
  * **KEY / EXIT:** Uncover the key hidden on the map to unlock the exit portal and descend to the next floor.
* **Environmental Modifiers (Biomes):**
  * **Sirocco:** Desert ruins containing mirages and Skimmers.
  * **Sepulcher:** The underground tombs where you face Baron Thalassor.
  * **Void-Scaur:** Volatile rifts where reality breaks apart, mutating tiles as the player moves.

---

### 2. Turn-Based Combat & The Element Wheel
Combat is resolved slot-by-slot, pitting your drafted elemental sequence against an enemy's action queue.

#### The Elemental Counter Wheel
Elements clash in a cyclic relationship. VOID is a neutral element that cannot counter and is never countered.

```
          ▲ [EARTH]
          │   (counters)
          │   ▼
       [FIRE] ──(counters)──► [AIR]
          ▲                     │
          │                 (counters)
          │                     ▼
      (counters)             [WATER]
          │                     ▲
          └─────────────────────┘
```

* **EARTH** counters **FIRE**
* **FIRE** counters **AIR**
* **AIR** counters **WATER**
* **WATER** counters **EARTH**
* **VOID** is neutral.

#### Clash Resolution (Per Board Slot)
* **`COUNTER`:** Player element counters the enemy element (**0 damage** taken).
* **`COUNTERED`:** Enemy element counters the player element (**100% attack damage** taken).
* **`NEUTRAL`:** Elements do not counter each other (**50% attack damage** taken).
* **`EMPTY`:** Slot is undefended (**100% attack damage** taken).

#### The 40% Damage Negation Rule
If you successfully counter **40% or more** of the enemy's active queue slots (e.g., at least 2 out of 4 slots), **all incoming enemy damage for the round is negated to 0**.

---

### 3. Spell Casting & Combo Multipliers
You can equip up to 4 spells in your active loadout. Every spell represents an elemental recipe (e.g., *Fireball* requires `[FIRE, FIRE, AIR]`).

* **Active Pool:** Equipped spells and inventory elements determine your starting element pool. You draft these elements into your board slots.
* **Sliding Window Matching:** The system scans your placed sequence from left to right. When it finds a contiguous sequence matching a spell recipe, that spell triggers, deals damage, and consumes those elements.
* **Spell Combos:** Triggering multiple spells sequentially in a single turn activates a combo, applying a multiplier (e.g., **1.5x** damage for the 2nd spell, **2.0x** for subsequent spells).
* **Basic Strikes:** Elements placed but not consumed by spells deal minor basic strike damage (unless countered by the enemy).

---

### 4. Classes & Ultimate Abilities
Defeating enemies and countering slots builds your **Focus Bar** (up to 5 pips). When full, you can activate your class-specific ultimate:
* **BERSERKER (Ignite):** FIRE spells deal **double damage** this turn.
* **PALADIN (Fortress):** Become **completely immune** to all damage this turn.
* **WIZARD (Cascade):** Grants +1 temporary `AIR` element, and all spells triggered this turn count as adjacent combo triggers regardless of position.
* **OVERSEER (Insight):** Fully reveals the enemy's queue of elements for precise countering.

---

### 5. Combat Omens
A volatile omen rotates every round, adding dynamic modifiers to the clash:
* **DRAIN:** Discards the leftmost element from your starting pool.
* **CURSE:** Adds a `VOID` element to your pool next turn if you take damage.
* **ENRAGE:** Spells that triggered in the previous turn deal 0 damage.
* **FURY:** Enemy gains +1 slot queue length next round if player takes damage.
* **SHIELD:** Enemy takes 50% less spell damage.

---

### 6. Epic Boss Mechanics
* **Baron Thalassor, The Sunken Bulwark:** Possesses a continuous damage shield. Players must trigger **3 or more spells in a single turn** to shatter the shield, doubling their damage for the next 2 turns.
* **Amalgam-9, The Singularity Core:** Adapts to player tactics. Every time a spell inflicts damage, Amalgam-9 gains permanent immunity to all elements used in that spell's recipe.

---

## Technology Stack
* **Framework:** [Next.js 16](https://nextjs.org/) (App Router)
* **Styling:** [Tailwind CSS 4](https://tailwindcss.com/) & Vanilla CSS
* **State Management:** [Zustand](https://github.com/pmndrs/zustand)
* **Database & ORM:** PostgreSQL & [Prisma ORM](https://www.prisma.io/)
* **Animations:** [Framer Motion](https://www.framer.com/motion/)
* **Icons:** [Lucide React](https://lucide.dev/)
* **Language:** TypeScript

---

## Directory Structure

```
├── app/                  # Next.js App Router (pages and layouts)
│   ├── globals.css       # Global styles and Tailwind imports
│   ├── layout.tsx        # Main application layout
│   └── page.tsx          # Dynamic phase controller view
├── components/           # React component views
│   ├── CombatView.tsx    # Turn-based combat & spellcasting dashboard
│   ├── ExplorationView.tsx# Hexagonal Minesweeper-style grid
│   ├── ShopView.tsx      # Spell shop and item trading UI
│   ├── RestRoomView.tsx  # Campfire healing and upgrading UI
│   └── ...               # Modals, GameOver, Win, and Start screens
├── lib/                  # Core game logic and database interfaces
│   ├── actions.ts        # Next.js Server Actions for state synchronization
│   ├── combatEngine.ts   # Clash resolution and spell matching algorithms
│   ├── gameLogic.ts      # Grid generation, starter spells, and enemy templates
│   ├── hexMath.ts        # Hexagonal grid distance and coordinate helper math
│   ├── prisma.ts         # Singleton client wrapper for PostgreSQL
│   ├── types.ts          # TypeScript type contracts
│   └── xpSystem.ts       # Experience levels, upgrades, and passives
├── prisma/               # Prisma configuration
│   ├── schema.prisma     # PostgreSQL database schemas
│   └── migrations/       # SQL migrations history
├── store/                # Client state management
│   └── useGameStore.ts   # Zustand store wrapping UI interactions
```

---

## Getting Started

### Prerequisites
* [Node.js](https://nodejs.org/) (v18 or higher recommended)
* A running [PostgreSQL](https://www.postgresql.org/) database

### 1. Clone & Install
```bash
git clone https://github.com/your-username/Dungeon-sweeper.git
cd Dungeon-sweeper
npm install
```

### 2. Environment Configuration
Create a `.env` file in the root directory and add your PostgreSQL connection string:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/dungeonsweeper?schema=public"
```

### 3. Database Migration
Synchronize your Prisma schema with the PostgreSQL database:
```bash
npx prisma migrate dev
```
*(This command will apply database migrations and generate the Prisma client).*

### 4. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to start playing!

---

## Available Scripts
* **`npm run dev`:** Starts the Next.js development server.
* **`npm run build`:** Builds the application for production.
* **`npm run start`:** Runs the built Next.js server.
* **`npm run lint`:** Runs ESLint for syntax verification.
* **`npx prisma studio`:** Opens a GUI to inspect and edit your database sessions.
