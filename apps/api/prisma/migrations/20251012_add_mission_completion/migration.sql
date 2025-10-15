-- Add ChatMissionCompletion table
CREATE TABLE "ChatMissionCompletion" (
  "profileId" TEXT NOT NULL,
  "missionId" TEXT NOT NULL,
  "progress" INTEGER NOT NULL DEFAULT 0,
  "completedAt" BIGINT,

  CONSTRAINT "ChatMissionCompletion_pkey" PRIMARY KEY ("profileId", "missionId")
);

-- Add indexes
CREATE INDEX "ChatMissionCompletion_profileId_idx" ON "ChatMissionCompletion"("profileId");
CREATE INDEX "ChatMissionCompletion_missionId_idx" ON "ChatMissionCompletion"("missionId");

-- Add foreign key to ChatMission
ALTER TABLE "ChatMissionCompletion" ADD CONSTRAINT "ChatMissionCompletion_missionId_fkey"
  FOREIGN KEY ("missionId") REFERENCES "ChatMission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add kind column to ChatMission (if not exists)
ALTER TABLE "ChatMission" ADD COLUMN IF NOT EXISTS "kind" TEXT DEFAULT 'custom';

-- Add isActive column to ChatMission (if not exists)
ALTER TABLE "ChatMission" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true;

-- Add goal column to ChatMission (if not exists)
ALTER TABLE "ChatMission" ADD COLUMN IF NOT EXISTS "goal" INTEGER DEFAULT 1;

-- Add cashbackBalance to Profile (if not exists)
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "cashbackBalance" TEXT DEFAULT '0';
