-- CreateTable
CREATE TABLE "missions" (
    "id" TEXT NOT NULL,
    "missionId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "missionType" TEXT NOT NULL,
    "rewardAmount" TEXT NOT NULL,
    "requiredCount" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "missions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_mission_progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "missionId" INTEGER NOT NULL,
    "currentCount" INTEGER NOT NULL DEFAULT 0,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "isClaimed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "claimedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_mission_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cashback_grants" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderAmount" TEXT NOT NULL,
    "cashbackAmount" TEXT NOT NULL,
    "orderId" TEXT,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cashback_grants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "missions_missionId_key" ON "missions"("missionId");

-- CreateIndex
CREATE INDEX "missions_missionId_idx" ON "missions"("missionId");

-- CreateIndex
CREATE INDEX "missions_missionType_idx" ON "missions"("missionType");

-- CreateIndex
CREATE INDEX "missions_isActive_idx" ON "missions"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "user_mission_progress_userId_missionId_key" ON "user_mission_progress"("userId", "missionId");

-- CreateIndex
CREATE INDEX "user_mission_progress_userId_idx" ON "user_mission_progress"("userId");

-- CreateIndex
CREATE INDEX "user_mission_progress_missionId_idx" ON "user_mission_progress"("missionId");

-- CreateIndex
CREATE INDEX "user_mission_progress_isCompleted_idx" ON "user_mission_progress"("isCompleted");

-- CreateIndex
CREATE INDEX "user_mission_progress_isClaimed_idx" ON "user_mission_progress"("isClaimed");

-- CreateIndex
CREATE INDEX "cashback_grants_userId_idx" ON "cashback_grants"("userId");

-- CreateIndex
CREATE INDEX "cashback_grants_grantedAt_idx" ON "cashback_grants"("grantedAt");

-- CreateIndex
CREATE INDEX "cashback_grants_orderId_idx" ON "cashback_grants"("orderId");

-- AddForeignKey
ALTER TABLE "user_mission_progress" ADD CONSTRAINT "user_mission_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_mission_progress" ADD CONSTRAINT "user_mission_progress_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "missions"("missionId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cashback_grants" ADD CONSTRAINT "cashback_grants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
