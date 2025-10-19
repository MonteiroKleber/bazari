-- AlterTable
ALTER TABLE "SellerProfile" ADD COLUMN     "pickupAddress" JSONB;

-- CreateTable
CREATE TABLE "DeliveryRequest" (
    "id" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "orderId" TEXT,
    "pickupAddress" JSONB NOT NULL,
    "deliveryAddress" JSONB NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderType" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "packageType" TEXT NOT NULL,
    "weight" REAL,
    "dimensions" JSONB,
    "estimatedValue" DECIMAL(20,8),
    "notes" TEXT,
    "requiresSignature" BOOLEAN NOT NULL DEFAULT true,
    "deliveryFeeBzr" DECIMAL(20,8) NOT NULL,
    "distance" REAL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "deliveryPersonId" TEXT,
    "preferredDeliverers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isPrivateNetwork" BOOLEAN NOT NULL DEFAULT false,
    "notifiedDeliverers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" BIGINT NOT NULL,
    "updatedAt" BIGINT NOT NULL,
    "expiresAt" BIGINT,
    "assignedAt" BIGINT,
    "acceptedAt" BIGINT,
    "pickedUpAt" BIGINT,
    "inTransitAt" BIGINT,
    "deliveredAt" BIGINT,
    "completedAt" BIGINT,
    "cancelledAt" BIGINT,
    "escrowAddress" TEXT,
    "paymentTxHash" TEXT,
    "releaseTxHash" TEXT,
    "proofOfDelivery" JSONB,
    "rating" INTEGER,
    "reviewComment" TEXT,
    "metadata" JSONB,

    CONSTRAINT "DeliveryRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreDeliveryPartner" (
    "id" TEXT NOT NULL,
    "storeId" BIGINT NOT NULL,
    "deliveryPersonId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "priority" INTEGER NOT NULL DEFAULT 1,
    "commissionPercent" INTEGER NOT NULL DEFAULT 100,
    "bonusPerDelivery" DECIMAL(20,8),
    "maxDailyDeliveries" INTEGER,
    "allowedDays" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "workingHoursStart" TEXT,
    "workingHoursEnd" TEXT,
    "totalDeliveries" INTEGER NOT NULL DEFAULT 0,
    "completedDeliveries" INTEGER NOT NULL DEFAULT 0,
    "cancelledDeliveries" INTEGER NOT NULL DEFAULT 0,
    "avgRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgDeliveryTime" REAL,
    "onTimeRate" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    "requestedAt" BIGINT,
    "approvedAt" BIGINT,
    "rejectedAt" BIGINT,
    "suspendedAt" BIGINT,
    "createdAt" BIGINT NOT NULL,
    "updatedAt" BIGINT NOT NULL,
    "notes" TEXT,
    "rejectionReason" TEXT,

    CONSTRAINT "StoreDeliveryPartner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryProfile" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "documentNumber" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "emergencyContact" JSONB,
    "vehicleType" TEXT NOT NULL,
    "vehiclePlate" TEXT,
    "vehicleModel" TEXT,
    "vehicleYear" INTEGER,
    "vehicleColor" TEXT,
    "maxWeight" REAL NOT NULL,
    "maxVolume" REAL NOT NULL,
    "canCarryFragile" BOOLEAN NOT NULL DEFAULT false,
    "canCarryPerishable" BOOLEAN NOT NULL DEFAULT false,
    "hasInsulatedBag" BOOLEAN NOT NULL DEFAULT false,
    "isAvailable" BOOLEAN NOT NULL DEFAULT false,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "currentLat" REAL,
    "currentLng" REAL,
    "currentAccuracy" REAL,
    "lastLocationUpdate" BIGINT,
    "serviceRadius" REAL NOT NULL DEFAULT 10.0,
    "serviceCities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "serviceStates" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "preferredNeighborhoods" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "totalDeliveries" INTEGER NOT NULL DEFAULT 0,
    "completedDeliveries" INTEGER NOT NULL DEFAULT 0,
    "cancelledDeliveries" INTEGER NOT NULL DEFAULT 0,
    "avgRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalRatings" INTEGER NOT NULL DEFAULT 0,
    "onTimeRate" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    "acceptanceRate" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    "completionRate" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    "avgDeliveryTime" REAL,
    "fastestDelivery" REAL,
    "totalDistance" REAL NOT NULL DEFAULT 0,
    "walletAddress" TEXT,
    "totalEarnings" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "pendingEarnings" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verificationLevel" TEXT NOT NULL DEFAULT 'basic',
    "backgroundCheckCompleted" BOOLEAN NOT NULL DEFAULT false,
    "backgroundCheckDate" BIGINT,
    "autoAcceptRadius" REAL,
    "minDeliveryFee" DECIMAL(20,8),
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "accountStatus" TEXT NOT NULL DEFAULT 'active',
    "suspensionReason" TEXT,
    "suspendedUntil" BIGINT,
    "createdAt" BIGINT NOT NULL,
    "updatedAt" BIGINT NOT NULL,
    "lastActiveAt" BIGINT,
    "verifiedAt" BIGINT,

    CONSTRAINT "DeliveryProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryRequest_orderId_key" ON "DeliveryRequest"("orderId");

-- CreateIndex
CREATE INDEX "DeliveryRequest_status_idx" ON "DeliveryRequest"("status");

-- CreateIndex
CREATE INDEX "DeliveryRequest_senderId_senderType_idx" ON "DeliveryRequest"("senderId", "senderType");

-- CreateIndex
CREATE INDEX "DeliveryRequest_deliveryPersonId_idx" ON "DeliveryRequest"("deliveryPersonId");

-- CreateIndex
CREATE INDEX "DeliveryRequest_orderId_idx" ON "DeliveryRequest"("orderId");

-- CreateIndex
CREATE INDEX "DeliveryRequest_createdAt_idx" ON "DeliveryRequest"("createdAt");

-- CreateIndex
CREATE INDEX "DeliveryRequest_isPrivateNetwork_idx" ON "DeliveryRequest"("isPrivateNetwork");

-- CreateIndex
CREATE INDEX "StoreDeliveryPartner_storeId_status_idx" ON "StoreDeliveryPartner"("storeId", "status");

-- CreateIndex
CREATE INDEX "StoreDeliveryPartner_deliveryPersonId_status_idx" ON "StoreDeliveryPartner"("deliveryPersonId", "status");

-- CreateIndex
CREATE INDEX "StoreDeliveryPartner_priority_idx" ON "StoreDeliveryPartner"("priority");

-- CreateIndex
CREATE UNIQUE INDEX "StoreDeliveryPartner_storeId_deliveryPersonId_key" ON "StoreDeliveryPartner"("storeId", "deliveryPersonId");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryProfile_profileId_key" ON "DeliveryProfile"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryProfile_documentNumber_key" ON "DeliveryProfile"("documentNumber");

-- CreateIndex
CREATE INDEX "DeliveryProfile_isAvailable_isOnline_idx" ON "DeliveryProfile"("isAvailable", "isOnline");

-- CreateIndex
CREATE INDEX "DeliveryProfile_profileId_idx" ON "DeliveryProfile"("profileId");

-- CreateIndex
CREATE INDEX "DeliveryProfile_documentNumber_idx" ON "DeliveryProfile"("documentNumber");

-- CreateIndex
CREATE INDEX "DeliveryProfile_serviceRadius_idx" ON "DeliveryProfile"("serviceRadius");

-- CreateIndex
CREATE INDEX "DeliveryProfile_accountStatus_idx" ON "DeliveryProfile"("accountStatus");

-- AddForeignKey
ALTER TABLE "DeliveryRequest" ADD CONSTRAINT "DeliveryRequest_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryRequest" ADD CONSTRAINT "DeliveryRequest_deliveryPersonId_fkey" FOREIGN KEY ("deliveryPersonId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreDeliveryPartner" ADD CONSTRAINT "StoreDeliveryPartner_deliveryPersonId_fkey" FOREIGN KEY ("deliveryPersonId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryProfile" ADD CONSTRAINT "DeliveryProfile_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
