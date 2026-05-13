-- CreateEnum
CREATE TYPE "GamePhase" AS ENUM ('EXPLORING', 'COMBAT', 'GAMEOVER', 'WIN', 'SHOP', 'REST', 'EVENT');

-- CreateEnum
CREATE TYPE "TileType" AS ENUM ('SAFE', 'ENEMY', 'KEY', 'EXIT', 'WALL', 'SHOP', 'REST', 'TREASURE', 'EVENT');

-- CreateEnum
CREATE TYPE "CardSuit" AS ENUM ('FIRE', 'ICE', 'NATURE', 'ARCANE');

-- CreateEnum
CREATE TYPE "CardLocation" AS ENUM ('DECK', 'HAND', 'DISCARD', 'SHOP');

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
    "maxHp" INTEGER NOT NULL DEFAULT 100,
    "currentHp" INTEGER NOT NULL DEFAULT 100,
    "gold" INTEGER NOT NULL DEFAULT 0,
    "hasKey" BOOLEAN NOT NULL DEFAULT false,
    "torchRadius" INTEGER NOT NULL DEFAULT 2,
    "posX" INTEGER NOT NULL DEFAULT 0,
    "posY" INTEGER NOT NULL DEFAULT 0,
    "enemyName" TEXT,
    "enemyMaxHp" INTEGER,
    "enemyCurrentHp" INTEGER,
    "handsRemaining" INTEGER,
    "discardsRemaining" INTEGER,
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

    CONSTRAINT "Tile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Card" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "suit" "CardSuit" NOT NULL,
    "rank" INTEGER NOT NULL,
    "isUpgraded" BOOLEAN NOT NULL DEFAULT false,
    "location" "CardLocation" NOT NULL DEFAULT 'DECK',

    CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
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
ALTER TABLE "Card" ADD CONSTRAINT "Card_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GameSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
