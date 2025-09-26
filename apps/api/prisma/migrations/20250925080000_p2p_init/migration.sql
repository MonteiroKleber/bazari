-- P2P initial schema
CREATE TYPE "P2POfferSide" AS ENUM ('BUY_BZR', 'SELL_BZR');
CREATE TYPE "P2POfferStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ARCHIVED');
CREATE TYPE "P2POrderStatus" AS ENUM (
  'DRAFT','AWAITING_ESCROW','AWAITING_FIAT_PAYMENT','AWAITING_CONFIRMATION',
  'RELEASED','EXPIRED','CANCELLED','DISPUTE_OPEN','DISPUTE_RESOLVED_BUYER','DISPUTE_RESOLVED_SELLER'
);
CREATE TYPE "P2PPaymentMethod" AS ENUM ('PIX');

CREATE TABLE "P2PPaymentProfile" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL UNIQUE,
  "pixKey" TEXT,
  "bankName" TEXT,
  "accountName" TEXT,
  "updatedAt" TIMESTAMP NOT NULL,
  "createdAt" TIMESTAMP NOT NULL
);

CREATE TABLE "P2POffer" (
  "id" TEXT PRIMARY KEY,
  "ownerId" TEXT NOT NULL,
  "side" "P2POfferSide" NOT NULL,
  "priceBRLPerBZR" DECIMAL(18,2) NOT NULL,
  "minBRL" DECIMAL(18,2) NOT NULL,
  "maxBRL" DECIMAL(18,2) NOT NULL,
  "method" "P2PPaymentMethod" NOT NULL,
  "autoReply" TEXT,
  "status" "P2POfferStatus" NOT NULL DEFAULT 'ACTIVE',
  "stats" JSONB,
  "createdAt" TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP NOT NULL
);

CREATE INDEX "P2POffer_owner_status_side_idx" ON "P2POffer" ("ownerId", "status", "side");

CREATE TABLE "P2POrder" (
  "id" TEXT PRIMARY KEY,
  "offerId" TEXT NOT NULL,
  "makerId" TEXT NOT NULL,
  "takerId" TEXT NOT NULL,
  "side" "P2POfferSide" NOT NULL,
  "priceBRLPerBZR" DECIMAL(18,2) NOT NULL,
  "amountBZR" DECIMAL(38,18) NOT NULL,
  "amountBRL" DECIMAL(18,2) NOT NULL,
  "method" "P2PPaymentMethod" NOT NULL,
  "status" "P2POrderStatus" NOT NULL DEFAULT 'DRAFT',
  "escrowTxHash" TEXT,
  "escrowAt" TIMESTAMP,
  "releasedTxHash" TEXT,
  "releasedAt" TIMESTAMP,
  "pixKeySnapshot" TEXT,
  "payerDeclaredAt" TIMESTAMP,
  "proofUrls" JSONB,
  "expiresAt" TIMESTAMP NOT NULL,
  "createdAt" TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP NOT NULL
);

CREATE INDEX "P2POrder_maker_taker_status_idx" ON "P2POrder" ("makerId", "takerId", "status");
CREATE INDEX "P2POrder_offer_idx" ON "P2POrder" ("offerId");

CREATE TABLE "P2PMessage" (
  "id" TEXT PRIMARY KEY,
  "orderId" TEXT NOT NULL,
  "senderId" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL
);

CREATE INDEX "P2PMessage_order_created_idx" ON "P2PMessage" ("orderId", "createdAt");

CREATE TABLE "P2PDispute" (
  "id" TEXT PRIMARY KEY,
  "orderId" TEXT NOT NULL UNIQUE,
  "openedById" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "evidence" JSONB,
  "status" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP NOT NULL
);

CREATE TABLE "P2PReview" (
  "id" TEXT PRIMARY KEY,
  "orderId" TEXT NOT NULL UNIQUE,
  "raterId" TEXT NOT NULL,
  "rateeId" TEXT NOT NULL,
  "stars" INTEGER NOT NULL,
  "comment" TEXT,
  "createdAt" TIMESTAMP NOT NULL
);

-- Note: FKs intentionally omitted in MVP to allow flexibility; add later.

