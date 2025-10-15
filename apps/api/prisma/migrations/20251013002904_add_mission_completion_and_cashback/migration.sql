/*
  Warnings:

  - Made the column `kind` on table `ChatMission` required. This step will fail if there are existing NULL values in that column.
  - Made the column `isActive` on table `ChatMission` required. This step will fail if there are existing NULL values in that column.
  - Made the column `goal` on table `ChatMission` required. This step will fail if there are existing NULL values in that column.
  - Made the column `cashbackBalance` on table `Profile` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "ChatMission" ALTER COLUMN "kind" SET NOT NULL,
ALTER COLUMN "isActive" SET NOT NULL,
ALTER COLUMN "goal" SET NOT NULL;

-- AlterTable
ALTER TABLE "Profile" ALTER COLUMN "cashbackBalance" SET NOT NULL;

-- CreateIndex
CREATE INDEX "ChatMission_isActive_idx" ON "ChatMission"("isActive");
