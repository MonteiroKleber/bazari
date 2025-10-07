-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "onChainProfileId" BIGINT,
ADD COLUMN     "reputationScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reputationTier" TEXT NOT NULL DEFAULT 'bronze',
ADD COLUMN     "metadataCid" TEXT,
ADD COLUMN     "isVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastChainSync" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ProfileBadge" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" JSONB NOT NULL,
    "issuedBy" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "revokeReason" TEXT,

    CONSTRAINT "ProfileBadge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileReputationEvent" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "eventCode" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "newTotal" INTEGER NOT NULL,
    "reason" TEXT,
    "emittedBy" TEXT NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "extrinsicId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfileReputationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HandleHistory" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "oldHandle" TEXT,
    "newHandle" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL,
    "blockNumber" BIGINT NOT NULL,

    CONSTRAINT "HandleHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Profile_onChainProfileId_key" ON "Profile"("onChainProfileId");

-- CreateIndex
CREATE INDEX "Profile_onChainProfileId_idx" ON "Profile"("onChainProfileId");

-- CreateIndex
CREATE INDEX "Profile_reputationScore_idx" ON "Profile"("reputationScore");

-- CreateIndex
CREATE INDEX "Profile_reputationTier_idx" ON "Profile"("reputationTier");

-- CreateIndex
CREATE INDEX "ProfileBadge_profileId_idx" ON "ProfileBadge"("profileId");

-- CreateIndex
CREATE INDEX "ProfileBadge_code_idx" ON "ProfileBadge"("code");

-- CreateIndex
CREATE INDEX "ProfileBadge_issuedAt_idx" ON "ProfileBadge"("issuedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProfileBadge_profileId_code_key" ON "ProfileBadge"("profileId", "code");

-- CreateIndex
CREATE INDEX "ProfileReputationEvent_profileId_createdAt_idx" ON "ProfileReputationEvent"("profileId", "createdAt");

-- CreateIndex
CREATE INDEX "ProfileReputationEvent_eventCode_idx" ON "ProfileReputationEvent"("eventCode");

-- CreateIndex
CREATE INDEX "ProfileReputationEvent_blockNumber_idx" ON "ProfileReputationEvent"("blockNumber");

-- CreateIndex
CREATE INDEX "HandleHistory_profileId_changedAt_idx" ON "HandleHistory"("profileId", "changedAt");

-- CreateIndex
CREATE INDEX "HandleHistory_newHandle_idx" ON "HandleHistory"("newHandle");

-- AddForeignKey
ALTER TABLE "ProfileBadge" ADD CONSTRAINT "ProfileBadge_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileReputationEvent" ADD CONSTRAINT "ProfileReputationEvent_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HandleHistory" ADD CONSTRAINT "HandleHistory_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
