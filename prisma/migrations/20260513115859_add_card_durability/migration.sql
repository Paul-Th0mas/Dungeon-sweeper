/*
  Warnings:

  - You are about to drop the column `suit` on the `Card` table. All the data in the column will be lost.
  - Added the required column `element` to the `Card` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CardElement" AS ENUM ('FIRE', 'ICE', 'ELECTRICITY', 'WIND');

-- CreateEnum
CREATE TYPE "PlayerClass" AS ENUM ('BERSERKER', 'PALADIN', 'WIZARD', 'OVERSEER');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "GamePhase" ADD VALUE 'TREASURE';
ALTER TYPE "GamePhase" ADD VALUE 'LEVELUP';

-- AlterTable
ALTER TABLE "Card" DROP COLUMN "suit",
ADD COLUMN     "currentUses" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "element" "CardElement" NOT NULL,
ADD COLUMN     "isAsh" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isExhaust" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "maxUses" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "specialModifier" JSONB;

-- AlterTable
ALTER TABLE "GameSession" ADD COLUMN     "baseHandSize" INTEGER NOT NULL DEFAULT 8,
ADD COLUMN     "combatMultiplierBonus" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
ADD COLUMN     "currentXP" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "enemyAttackDamage" INTEGER,
ADD COLUMN     "enemyStatusEffects" JSONB,
ADD COLUMN     "lastElementPlayed" TEXT,
ADD COLUMN     "level" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "passives" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "pendingLevelUpChoices" JSONB,
ADD COLUMN     "playerClass" "PlayerClass" NOT NULL DEFAULT 'BERSERKER',
ADD COLUMN     "relics" TEXT[] DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "gold" SET DEFAULT 50;

-- DropEnum
DROP TYPE "CardSuit";
