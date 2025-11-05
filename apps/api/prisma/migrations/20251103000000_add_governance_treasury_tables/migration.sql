-- CreateTable
CREATE TABLE "governance_treasury_requests" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "value" VARCHAR(50) NOT NULL,
    "beneficiary" VARCHAR(66) NOT NULL,
    "proposer" VARCHAR(66) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'PENDING_REVIEW',
    "councilMotionHash" VARCHAR(66),
    "councilMotionIndex" INTEGER,
    "spendId" INTEGER,
    "txHash" VARCHAR(66),
    "blockNumber" INTEGER,
    "signature" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "paidOutAt" TIMESTAMP(3),

    CONSTRAINT "governance_treasury_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "governance_council_votes" (
    "id" SERIAL NOT NULL,
    "motionHash" VARCHAR(66) NOT NULL,
    "motionIndex" INTEGER NOT NULL,
    "voter" VARCHAR(66) NOT NULL,
    "vote" BOOLEAN NOT NULL,
    "txHash" VARCHAR(66) NOT NULL,
    "blockNumber" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "governance_council_votes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "governance_treasury_requests_status_idx" ON "governance_treasury_requests"("status");

-- CreateIndex
CREATE INDEX "governance_treasury_requests_proposer_idx" ON "governance_treasury_requests"("proposer");

-- CreateIndex
CREATE INDEX "governance_treasury_requests_councilMotionHash_idx" ON "governance_treasury_requests"("councilMotionHash");

-- CreateIndex
CREATE INDEX "governance_treasury_requests_createdAt_idx" ON "governance_treasury_requests"("createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "governance_council_votes_motionHash_voter_key" ON "governance_council_votes"("motionHash", "voter");

-- CreateIndex
CREATE INDEX "governance_council_votes_motionHash_motionIndex_idx" ON "governance_council_votes"("motionHash", "motionIndex");
