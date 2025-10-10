-- CreateTable
CREATE TABLE "TrendingTopic" (
    "id" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "growthRate" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrendingTopic_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TrendingTopic_tag_key" ON "TrendingTopic"("tag");

-- CreateIndex
CREATE INDEX "TrendingTopic_score_updatedAt_idx" ON "TrendingTopic"("score" DESC, "updatedAt");

-- CreateIndex
CREATE INDEX "TrendingTopic_updatedAt_idx" ON "TrendingTopic"("updatedAt");
