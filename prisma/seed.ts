/**
 * prisma/seed.ts
 *
 * Seed script for Dungeon-Sweeper.
 *
 * What this seeds:
 *  1. A "guest" User that is used when no auth is present.
 *  2. One ready-to-play GameSession per PlayerClass (BERSERKER, PALADIN, WIZARD, OVERSEER).
 *     Each session starts on Floor 1, Biome SIROCCO, phase START_SCREEN so the
 *     player can pick their class on first load.
 *  3. The four starter Spells (LOADOUT) for each session, matching the CLASS_STARTER_SPELLS
 *     definitions in gameLogic.ts.
 *
 * Run with:
 *   npx tsx prisma/seed.ts
 *
 * Or add to package.json:
 *   "prisma": { "seed": "npx tsx prisma/seed.ts" }
 * then run:
 *   npx prisma db seed
 */

import 'dotenv/config';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

// ── Prisma Client ──────────────────────────────────────────────────────────────

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ── Spell Definitions (mirrored from lib/gameLogic.ts) ────────────────────────

type CardElement = 'FIRE' | 'WATER' | 'AIR' | 'EARTH' | 'VOID';
type PlayerClass = 'BERSERKER' | 'PALADIN' | 'WIZARD' | 'OVERSEER';

interface SpellTemplate {
  name: string;
  recipe: CardElement[];
  baseDamage: number;
  isAdvanced: boolean;
  playerClass?: PlayerClass;
  statusEffect?: { type: 'BURN' | 'FREEZE' | 'CHAIN' | 'PUSH'; value: number; turns: number };
}

const BASIC_SPELLS: SpellTemplate[] = [
  // ── Berserker ──────────────────────────────────────────────────────────────
  { name: 'Ember Strike',   recipe: ['FIRE', 'FIRE'],   baseDamage: 30, isAdvanced: false, playerClass: 'BERSERKER' },
  { name: 'Scorched Earth', recipe: ['FIRE', 'EARTH'],  baseDamage: 25, isAdvanced: false, playerClass: 'BERSERKER', statusEffect: { type: 'BURN',   value: 5, turns: 2 } },
  { name: 'Flame Surge',    recipe: ['FIRE', 'AIR'],    baseDamage: 28, isAdvanced: false, playerClass: 'BERSERKER' },
  { name: 'Rage Strike',    recipe: ['EARTH', 'FIRE'],  baseDamage: 27, isAdvanced: false, playerClass: 'BERSERKER' },
  // ── Paladin ────────────────────────────────────────────────────────────────
  { name: 'Tidal Wave',     recipe: ['WATER', 'WATER'], baseDamage: 30, isAdvanced: false, playerClass: 'PALADIN' },
  { name: 'Frostbite',      recipe: ['WATER', 'AIR'],   baseDamage: 22, isAdvanced: false, playerClass: 'PALADIN', statusEffect: { type: 'FREEZE', value: 0, turns: 1 } },
  { name: 'Mud Trap',       recipe: ['WATER', 'EARTH'], baseDamage: 24, isAdvanced: false, playerClass: 'PALADIN' },
  { name: 'Shield Bash',    recipe: ['EARTH', 'WATER'], baseDamage: 26, isAdvanced: false, playerClass: 'PALADIN' },
  // ── Wizard ─────────────────────────────────────────────────────────────────
  { name: 'Wind Slash',     recipe: ['AIR', 'AIR'],     baseDamage: 30, isAdvanced: false, playerClass: 'WIZARD' },
  { name: 'Static Shock',   recipe: ['AIR', 'FIRE'],    baseDamage: 26, isAdvanced: false, playerClass: 'WIZARD', statusEffect: { type: 'CHAIN', value: 0.5, turns: 1 } },
  { name: 'Dust Storm',     recipe: ['AIR', 'EARTH'],   baseDamage: 25, isAdvanced: false, playerClass: 'WIZARD' },
  { name: 'Spark Flare',    recipe: ['FIRE', 'AIR'],    baseDamage: 27, isAdvanced: false, playerClass: 'WIZARD' },
  // ── Overseer ───────────────────────────────────────────────────────────────
  { name: 'Stone Crush',    recipe: ['EARTH', 'EARTH'], baseDamage: 30, isAdvanced: false, playerClass: 'OVERSEER' },
  { name: 'Tremor',         recipe: ['EARTH', 'WATER'], baseDamage: 24, isAdvanced: false, playerClass: 'OVERSEER', statusEffect: { type: 'PUSH', value: 0, turns: 1 } },
  { name: 'Gravel Shot',    recipe: ['EARTH', 'AIR'],   baseDamage: 26, isAdvanced: false, playerClass: 'OVERSEER' },
  { name: 'Toxic Drip',     recipe: ['EARTH', 'FIRE'],  baseDamage: 25, isAdvanced: false, playerClass: 'OVERSEER', statusEffect: { type: 'BURN', value: 4, turns: 2 } },
];

// Map each class to its 4 starter spell names (matching CLASS_STARTER_SPELLS in gameLogic.ts)
const CLASS_STARTER_SPELL_NAMES: Record<PlayerClass, string[]> = {
  BERSERKER: ['Ember Strike', 'Scorched Earth', 'Flame Surge', 'Rage Strike'],
  PALADIN:   ['Tidal Wave',   'Frostbite',      'Mud Trap',    'Shield Bash'],
  WIZARD:    ['Wind Slash',   'Static Shock',   'Dust Storm',  'Spark Flare'],
  OVERSEER:  ['Stone Crush',  'Tremor',         'Gravel Shot', 'Toxic Drip'],
};

function getStarterSpells(playerClass: PlayerClass): SpellTemplate[] {
  const names = CLASS_STARTER_SPELL_NAMES[playerClass];
  return names.map((name) => {
    const spell = BASIC_SPELLS.find((s) => s.name === name);
    if (!spell) throw new Error(`Spell not found: ${name}`);
    return spell;
  });
}

// ── Default stat baselines per class ──────────────────────────────────────────

interface ClassStats {
  maxHp: number;
  currentHp: number;
  gold: number;
  playerMana: number;
}

const CLASS_STATS: Record<PlayerClass, ClassStats> = {
  BERSERKER: { maxHp: 100, currentHp: 100, gold: 50, playerMana: 4 },
  PALADIN:   { maxHp: 120, currentHp: 120, gold: 40, playerMana: 4 },
  WIZARD:    { maxHp:  80, currentHp:  80, gold: 60, playerMana: 6 },
  OVERSEER:  { maxHp:  90, currentHp:  90, gold: 55, playerMana: 4 },
};

// ── Seed Helpers ──────────────────────────────────────────────────────────────

async function upsertGuestUser() {
  const GUEST_EMAIL = 'guest@dungeon-sweeper.local';
  const existing = await prisma.user.findUnique({ where: { email: GUEST_EMAIL } });
  if (existing) {
    console.log(`  ✓ Guest user already exists (id: ${existing.id})`);
    return existing;
  }
  const user = await prisma.user.create({ data: { email: GUEST_EMAIL } });
  console.log(`  ✓ Created guest user (id: ${user.id})`);
  return user;
}

async function seedSessionForClass(userId: string, playerClass: PlayerClass) {
  // Skip if a seed session for this class already exists at START_SCREEN
  const existing = await prisma.gameSession.findFirst({
    where: { userId, playerClass, phase: 'START_SCREEN' },
  });

  if (existing) {
    console.log(`  ✓ Seed session for ${playerClass} already exists (id: ${existing.id})`);
    return existing;
  }

  const stats = CLASS_STATS[playerClass];
  const spells = getStarterSpells(playerClass);

  const session = await prisma.gameSession.create({
    data: {
      userId,
      phase:       'START_SCREEN',
      floor:       1,
      biome:       'SIROCCO',
      playerClass,
      maxHp:       stats.maxHp,
      currentHp:   stats.currentHp,
      gold:        stats.gold,
      playerMana:  stats.playerMana,
      currentXP:   0,
      level:       1,
      hasKey:      false,
      torchRadius: 2,
      spareElements: { FIRE: 0, WATER: 0, AIR: 0, EARTH: 0 },
      posX: 0,
      posY: 0,
      relics:   [],
      passives: [],
      inventory: [],
      shopRerolled: false,
      // Combat state — empty at session start
      playerQueue: [],
      enemyQueue:  [],
      enemyQueueRevealed:    false,
      isEliteOrBoss:         false,
      focusPips:             0,
      focusAbilityUsed:      false,
      voidElementsNextTurn:  0,
      revealQueueTurns:      0,
      staleTurns:            0,
      combatTurn:            0,
      bossShieldShatteredTurns: 0,
      bossImmunities: [],
      lastTurnSpells: [],
      // Starter Spells (all LOADOUT / equipped)
      spells: {
        create: spells.map((spell) => ({
          name:       spell.name,
          recipe:     spell.recipe,
          baseDamage: spell.baseDamage,
          isAdvanced: spell.isAdvanced,
          isUpgraded: false,
          equipped:   true,
          location:   'LOADOUT',
        })),
      },
    },
  });

  console.log(
    `  ✓ Created ${playerClass} seed session (id: ${session.id}) with ${spells.length} starter spells`,
  );
  return session;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🌱  Dungeon-Sweeper — Database Seed\n');

  // 1. Guest user
  console.log('📋 Seeding guest user...');
  const guestUser = await upsertGuestUser();

  // 2. One demo session per class (all start at START_SCREEN)
  const classes: PlayerClass[] = ['BERSERKER', 'PALADIN', 'WIZARD', 'OVERSEER'];
  console.log('\n⚔️  Seeding starter game sessions (one per class)...');
  for (const cls of classes) {
    await seedSessionForClass(guestUser.id, cls);
  }

  // 3. Summary
  const sessionCount = await prisma.gameSession.count();
  const spellCount   = await prisma.spell.count();
  const userCount    = await prisma.user.count();

  console.log('\n✅  Seed complete!');
  console.log(`    Users:    ${userCount}`);
  console.log(`    Sessions: ${sessionCount}`);
  console.log(`    Spells:   ${spellCount}`);
  console.log('');
}

main()
  .catch((e) => {
    console.error('\n❌  Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
