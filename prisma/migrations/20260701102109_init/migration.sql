-- CreateEnum
CREATE TYPE "GamePhase" AS ENUM ('DASHBOARD', 'EXPLORING', 'COMBAT', 'GAMEOVER', 'WIN', 'SHOP', 'REST', 'EVENT', 'TREASURE', 'LEVELUP', 'START_SCREEN', 'FLOOR_END', 'SPELL_REWARD');

-- CreateEnum
CREATE TYPE "TileType" AS ENUM ('SAFE', 'ENEMY', 'KEY', 'EXIT', 'WALL', 'SHOP', 'REST', 'TREASURE', 'EVENT');

-- CreateEnum
CREATE TYPE "CardElement" AS ENUM ('FIRE', 'WATER', 'AIR', 'EARTH');

-- CreateEnum
CREATE TYPE "PlayerClass" AS ENUM ('BERSERKER', 'PALADIN', 'WIZARD', 'OVERSEER');

-- CreateEnum
CREATE TYPE "Biome" AS ENUM ('SIROCCO', 'SEPULCHER', 'VOID_SCAUR');

-- CreateEnum
CREATE TYPE "SpellLocation" AS ENUM ('LIBRARY', 'LOADOUT', 'SHOP');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "phase" "GamePhase" NOT NULL DEFAULT 'EXPLORING',
    "floor" INTEGER NOT NULL DEFAULT 1,
    "biome" "Biome" NOT NULL DEFAULT 'SIROCCO',
    "playerClass" "PlayerClass" NOT NULL DEFAULT 'BERSERKER',
    "maxHp" INTEGER NOT NULL DEFAULT 100,
    "currentHp" INTEGER NOT NULL DEFAULT 100,
    "gold" INTEGER NOT NULL DEFAULT 50,
    "currentXP" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "relics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "passives" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "hasKey" BOOLEAN NOT NULL DEFAULT false,
    "torchRadius" INTEGER NOT NULL DEFAULT 2,
    "playerMana" INTEGER NOT NULL DEFAULT 4,
    "spareElements" JSONB NOT NULL DEFAULT '{"FIRE":0,"WATER":0,"AIR":0,"EARTH":0}',
    "posX" INTEGER NOT NULL DEFAULT 0,
    "posY" INTEGER NOT NULL DEFAULT 0,
    "inventory" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "shopRerolled" BOOLEAN NOT NULL DEFAULT false,
    "enemyName" TEXT,
    "enemyTier" INTEGER,
    "enemyMana" INTEGER,
    "enemyMaxHp" INTEGER,
    "enemyCurrentHp" INTEGER,
    "enemyAttackDamage" INTEGER,
    "enemyStatusEffects" JSONB,
    "enemySpellbook" JSONB,
    "enemyElementBias" JSONB,
    "playerQueue" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "enemyQueue" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "enemyQueueRevealed" BOOLEAN NOT NULL DEFAULT false,
    "isEliteOrBoss" BOOLEAN NOT NULL DEFAULT false,
    "focusPips" INTEGER NOT NULL DEFAULT 0,
    "focusAbilityUsed" BOOLEAN NOT NULL DEFAULT false,
    "activeOmen" TEXT,
    "lastTurnSpells" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "voidElementsNextTurn" INTEGER NOT NULL DEFAULT 0,
    "revealQueueTurns" INTEGER NOT NULL DEFAULT 0,
    "staleTurns" INTEGER NOT NULL DEFAULT 0,
    "combatTurn" INTEGER NOT NULL DEFAULT 0,
    "bossShieldShatteredTurns" INTEGER NOT NULL DEFAULT 0,
    "bossImmunities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "pendingLevelUpChoices" JSONB,
    "savedGrid" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tile" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "q" INTEGER NOT NULL,
    "r" INTEGER NOT NULL,
    "type" "TileType" NOT NULL,
    "revealed" BOOLEAN NOT NULL DEFAULT false,
    "dangerNumber" INTEGER NOT NULL DEFAULT 0,
    "hasItem" BOOLEAN NOT NULL DEFAULT false,
    "cleared" BOOLEAN NOT NULL DEFAULT false,
    "isMirage" BOOLEAN NOT NULL DEFAULT false,
    "calcifiedHits" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Tile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Spell" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "recipe" JSONB NOT NULL,
    "baseDamage" INTEGER NOT NULL,
    "isAdvanced" BOOLEAN NOT NULL DEFAULT false,
    "isUpgraded" BOOLEAN NOT NULL DEFAULT false,
    "equipped" BOOLEAN NOT NULL DEFAULT false,
    "location" "SpellLocation" NOT NULL DEFAULT 'LIBRARY',

    CONSTRAINT "Spell_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Tile_sessionId_q_r_key" ON "Tile"("sessionId", "q", "r");

-- AddForeignKey
ALTER TABLE "GameSession" ADD CONSTRAINT "GameSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tile" ADD CONSTRAINT "Tile_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GameSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Spell" ADD CONSTRAINT "Spell_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GameSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
