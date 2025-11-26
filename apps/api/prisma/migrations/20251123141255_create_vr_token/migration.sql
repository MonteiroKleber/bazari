-- CreateTable
CREATE TABLE "VRToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VRToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VRToken_token_key" ON "VRToken"("token");

-- CreateIndex
CREATE INDEX "VRToken_token_used_idx" ON "VRToken"("token", "used");

-- CreateIndex
CREATE INDEX "VRToken_userId_createdAt_idx" ON "VRToken"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "VRToken" ADD CONSTRAINT "VRToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
