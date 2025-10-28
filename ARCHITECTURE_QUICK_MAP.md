# BAZARI - QUICK ARCHITECTURE MAP

## 1. COMPONENTES PRINCIPAIS

```
┌────────────────────────────────────────────────────────────────┐
│                      BAZARI ECOSYSTEM                          │
└────────────────────────────────────────────────────────────────┘

BLOCKCHAIN LAYER (Substrate v47)
├─ pallet-balances         → BZR native token (12 decimals)
├─ pallet-assets           → ZARI multi-phase token (asset_id=1)
├─ pallet-stores           → Store on-chain primitives
├─ pallet-bazari-identity  → Profile + Reputation + Badges
├─ pallet-uniques          → NFT certificates
└─ pallet-universal-registry → IPFS HEAD registry

BACKEND API LAYER (Fastify + Prisma)
├─ /p2p/offers             → BZR + ZARI trading pairs
├─ /p2p/orders             → Order lifecycle with escrow
├─ /p2p/zari/              → Phase management (2A, 2B, 3)
├─ /chat/                  → E2EE messaging + proposals
├─ /affiliates/            → Commission marketplaces
├─ /delivery/              → Delivery network
├─ /auth/                  → SIWS + JWT
└─ /stores/, /products/    → Catalog management

FRONTEND LAYER (React)
├─ modules/auth            → SIWS login
├─ modules/wallet          → Multi-asset balance (BZR + ZARI)
├─ modules/p2p             → P2P trading UI
├─ modules/orders          → Order tracking
└─ modules/delivery        → Delivery tracking

DATABASE LAYER (PostgreSQL)
├─ P2P Models              → Offers, Orders, Messages, Disputes
├─ Commerce Models         → Products, Services, Orders, Delivery
├─ Social Models           → Profiles, Posts, Comments, Badges
├─ Affiliate Models        → Marketplaces, Sales, Commissions
└─ Auth Models             → Users, Tokens, Sessions
```

## 2. FLUXO P2P (BZR + ZARI)

### STATUS MACHINE
```
P2POffer: ACTIVE → PAUSED → ARCHIVED
          (可被accept)

P2POrder Status Progression:
┌──────────────────────────────────────────────────────────┐
│ DRAFT                                                    │
│   ↓                                                      │
│ AWAITING_ESCROW [Maker locks BZR/ZARI on blockchain]    │
│   ↓                                                      │
│ AWAITING_FIAT_PAYMENT [Taker sends BRL via PIX]         │
│   ↓                                                      │
│ AWAITING_CONFIRMATION [Maker confirms PIX receipt]      │
│   ↓                                                      │
│ RELEASED [Assets released, transaction complete] ✅     │
│   ↓                                                      │
│ (P2PReview allowed here)                                │
└──────────────────────────────────────────────────────────┘

Alt paths:
- CANCELLED (from DRAFT/AWAITING_ESCROW)
- EXPIRED (timeout)
- DISPUTE_OPEN → DISPUTE_RESOLVED_BUYER/SELLER
```

### BLOCKCHAIN TRANSACTIONS

**BZR Flow**:
```
Step 1: balances.transfer_keep_alive(escrow_addr, amount_planck)
        Maker signs, tranca BZR no escrow account

Step 2: [PIX payment off-chain]

Step 3: balances.transfer_keep_alive(taker_addr, amount_planck)
        Escrow account releases to taker
        (requires escrow.signAndSend or maker confirmation)
```

**ZARI Flow**:
```
Step 1: assets.transfer_keep_alive(asset_id=1, escrow_addr, amount_planck)
        Maker locks ZARI

Step 2: [PIX payment off-chain]

Step 3: assets.transfer_keep_alive(asset_id=1, taker_addr, amount_planck)
        Release to taker
```

## 3. ZARI PHASES

```
Phase Configuration (in ZARIPhaseConfig):

┌─────────────────────────────────────────────────────────────┐
│ Phase 2A                                                    │
│ ├─ Price: 0.25 BZR per ZARI                               │
│ ├─ Supply: 2.1M ZARI                                       │
│ ├─ Status: active (on startup) or next                     │
│ └─ Transition: manual trigger or automatic on sold out      │
├─────────────────────────────────────────────────────────────┤
│ Phase 2B                                                    │
│ ├─ Price: 0.35 BZR per ZARI                               │
│ ├─ Supply: 2.1M ZARI                                       │
│ └─ Transition: auto → Phase 3                              │
├─────────────────────────────────────────────────────────────┤
│ Phase 3                                                     │
│ ├─ Price: 0.50 BZR per ZARI                               │
│ ├─ Supply: 2.1M ZARI                                       │
│ └─ Status: final phase                                     │
└─────────────────────────────────────────────────────────────┘

Total P2P Supply: 6.3M ZARI
DAO Reserve: 8.4M ZARI (40% total)

PhaseControlService.getActivePhase():
├─ Queries DB for active phase config
├─ Queries blockchain for actual asset supply
├─ Calculates: supplySold = totalSupply - daoReserve
├─ Validates: supplyRemaining > 0
└─ Returns: {phase, price, supply, isActive}
```

## 4. ESCROW ARCHITECTURE

```
EscrowService (Singleton Pattern):
├─ Uses BlockchainService (WebSocket to Substrate)
├─ Has escrowAccount (from BAZARICHAIN_SUDO_SEED)
├─ Methods:
│  ├─ lockFunds(order, fromAddress)
│  │  └─ tx = api.tx.[balances|assets].transferKeepAlive(...)
│  │     → blockchainService.signAndSend(tx, escrowAccount)
│  │
│  ├─ releaseFunds(order, toAddress)
│  │  └─ Same pattern, different recipient
│  │
│  ├─ getEscrowBalance(assetType)
│  │  └─ Query blockchain for account balance
│  │
│  └─ verifyEscrowTransaction(txHash)
│     └─ Check if TX in finalized block
```

## 5. DATABASE SCHEMA HIGHLIGHTS

### P2P Models
```
P2POffer
├─ id, ownerId, side (BUY_BZR | SELL_BZR)
├─ assetType (BZR | ZARI)
├─ assetId ('1' for ZARI)
├─ phase ('2A' | '2B' | '3' or null)
├─ priceBRLPerUnit, minBRL, maxBRL
├─ method (PIX), status (ACTIVE | PAUSED | ARCHIVED)
└─ createdAt, updatedAt

P2POrder
├─ id, offerId, makerId, takerId, side
├─ assetType, assetId, phase
├─ amountAsset, amountBRL, priceBRLPerUnit
├─ status (DRAFT → ... → RELEASED)
├─ escrowTxHash, escrowAt
├─ releasedTxHash, releasedAt
├─ pixKeySnapshot, proofUrls
└─ expiresAt, createdAt, updatedAt

P2PMessage
├─ id, orderId, senderId, body, kind
└─ createdAt

P2PReview
├─ orderId (unique), raterId, rateeId
├─ stars (1-5), comment
└─ createdAt

ZARIPhaseConfig
├─ id, phase (unique), priceBZR, supplyLimit
├─ startBlock, endBlock
├─ active (boolean)
└─ createdAt, updatedAt
```

### Affiliate Models
```
ChatStoreAffiliate
├─ storeId (on-chain), promoterId
├─ status (pending | approved | rejected | suspended)
├─ customCommission, monthlySalesCap
├─ Performance: totalSales, totalCommission, salesCount

AffiliateMarketplace
├─ ownerId (Profile.id), name, slug
├─ Branding: logoUrl, bannerUrl, colors, theme
├─ Stats: totalSales, totalRevenue, totalCommission
├─ Status: isActive, isPublic

AffiliateProduct
├─ marketplaceId, storeId, productId
├─ Product info snapshot + custom description
├─ commissionPercent, featured
├─ Analytics: viewCount, clickCount

AffiliateSale
├─ marketplaceId, storeId, buyer, seller, promoter
├─ amount, commissionPercent, commissionAmount
├─ bazariFee, sellerAmount (calculated split)
├─ status (pending | split | failed)
├─ txHash (mock), receiptNftCid
└─ createdAt, settledAt
```

### Delivery Models
```
DeliveryProfile
├─ profileId (1:1), fullName, documentType, documentNumber
├─ Vehicle: type, plate, model, year, color
├─ Capacity: maxWeight, maxVolume, canCarryFragile, etc.
├─ Availability: isAvailable, isOnline, currentLat, currentLng
├─ Service Area: serviceRadius, serviceCities, serviceStates
├─ Stats: totalDeliveries, completedDeliveries, avgRating, onTimeRate
├─ Finance: walletAddress, totalEarnings, pendingEarnings
└─ Verification: isVerified, backgroundCheckCompleted

DeliveryRequest
├─ sourceType (order | direct), orderId
├─ Addresses: pickupAddress, deliveryAddress (JSON)
├─ Sender/Recipient: senderId, senderType, recipientId
├─ Cargo: packageType, weight, dimensions, estimatedValue
├─ Fee & Distance: deliveryFeeBzr, distance
├─ Status: pending → assigned → accepted → picked_up → in_transit → delivered → completed
├─ Delivery: deliveryPersonId, preferredDeliverers, isPrivateNetwork
├─ Timestamps: createdAt, updatedAt, expiresAt, assignedAt, acceptedAt, etc.
├─ Escrow: escrowAddress, paymentTxHash, releaseTxHash
├─ Proof: proofOfDelivery (JSON: signature, photo_urls, timestamp)
└─ Rating: rating (1-5), reviewComment

StoreDeliveryPartner
├─ storeId, deliveryPersonId
├─ status (pending | active | paused | suspended)
├─ priority (order of notification)
├─ Commission: commissionPercent, bonusPerDelivery
├─ Restrictions: maxDailyDeliveries, allowedDays, workingHours
├─ Metrics: totalDeliveries, completedDeliveries, avgRating, onTimeRate
└─ Tracking: requestedAt, approvedAt, rejectedAt, suspendedAt
```

## 6. KEY SERVICES

```
BlockchainService (Singleton)
├─ getInstance() → Static singleton
├─ connect() → WsProvider + Keyring
├─ getApi() → Lazy initialization
├─ getCurrentBlock() → BigInt
├─ signAndSend(tx, signer) → {txHash, blockNumber}
├─ getBalanceBZR(address) → BigInt
├─ getBalanceZARI(address) → BigInt
└─ verifyTransaction(txHash) → Boolean

EscrowService
├─ lockFunds(order, fromAddress) → EscrowLockResult
├─ releaseFunds(order, toAddress) → EscrowReleaseResult
├─ getEscrowBalance(assetType) → bigint
└─ verifyEscrowTransaction(txHash) → boolean

PhaseControlService
├─ getActivePhase() → PhaseInfo
├─ canCreateZARIOffer(amountZARI) → boolean
├─ transitionToNextPhase() → void
├─ getBlockchainApi() → ApiPromise
└─ disconnect() → void

CommissionService (MOCK)
├─ settleSale(data) → SaleResult
├─ settleSaleGroup(data) → GroupSaleResult[]
├─ getStoreOwners(storeIds) → Map<storeId, sellerId>
└─ [Será substituído por pallet de settlement]
```

## 7. WORKERS (Background Jobs)

```
reputation.worker.ts
├─ Cron: every 5 minutes
├─ Finds: P2POrder where status=RELEASED and !reputationSynced
├─ Action: blockchain.signAndSend(adjust_reputation)
└─ Updates: Profile.reputationScore, ReputationEvent

p2pTimeout.ts
├─ Cron: every 1 minute
├─ Finds: P2POrder where expiresAt < now
├─ Action: update status=EXPIRED
└─ Notify: both parties via notifications

paymentsTimeout.ts
├─ Similar pattern for marketplace orders
└─ Trigger escrow refund if payment timeout

affiliate-stats.worker.ts
├─ Cron: hourly
├─ Recalculates: totalSales, totalCommission, salesCount
├─ Updates cache: ChatStoreAffiliate.* metrics
└─ Updates: AffiliateMarketplace stats
```

## 8. API ENDPOINTS SUMMARY

```
Authentication
POST   /auth/siws-message              → Get nonce
POST   /auth/verify                    → Verify signature → JWT

P2P Trading
GET    /p2p/offers                     → List (filters: assetType, side)
POST   /p2p/offers                     → Create (auth required)
GET    /p2p/offers/:id                 → Details
POST   /p2p/offers/:id/orders          → Create order from offer
GET    /p2p/my-orders                  → My orders (auth)
POST   /p2p/orders/:id/escrow-lock     → Lock on blockchain
POST   /p2p/orders/:id/escrow-release  → Release on blockchain
POST   /p2p/orders/:id/mark-paid       → Mark fiat as paid
POST   /p2p/orders/:id/review          → Leave review (after RELEASED)

ZARI Phases
GET    /p2p/zari/phase                 → Current active phase
GET    /p2p/zari/stats                 → Overall stats
POST   /p2p/zari/phase/transition      → Transition to next (admin)

Payment Profiles
GET    /p2p/payment-profile            → My profile (auth)
POST   /p2p/payment-profile            → Create/update (auth)

Affiliates
POST   /affiliates/marketplaces        → Create marketplace (auth)
GET    /affiliates/marketplaces/:slug  → Get marketplace (public)
POST   /affiliates/marketplaces/:id/products → Add product (auth)

Delivery
GET    /delivery-profile               → My profile (auth)
POST   /delivery-profile               → Create (auth)
GET    /delivery                       → Available requests
POST   /delivery/:id/accept            → Accept (auth)
POST   /delivery/:id/mark-delivered    → Mark delivered + proof

Stores & Products
GET    /stores                         → List public stores
POST   /stores                         → Create store (auth)
GET    /products                       → Search products
POST   /me/products                    → Create product (auth)

Chat (E2EE)
POST   /chat/threads                   → Create thread
GET    /chat/messages/:threadId        → Get messages
WebSocket /ws/chat                     → Real-time messages
```

## 9. STACK TECHNICAL DETAILS

```
Frontend Stack:
├─ React 18+
├─ Polkadot.js (@polkadot/api, @polkadot/keyring)
├─ Zustand (state management)
├─ Tailwind CSS
└─ TypeScript 5+

Backend Stack:
├─ Fastify 4.x (server)
├─ Prisma 5.x (ORM)
├─ PostgreSQL 14+ (database)
├─ @polkadot/api (blockchain connection)
├─ Zod (validation)
├─ JWT + SIWS (authentication)
└─ TypeScript 5+

Blockchain Stack:
├─ Substrate (polkadot-sdk v47)
├─ Rust 1.75+
├─ parity-scale-codec 3.7.4
├─ frame-support, frame-system
├─ Aura + Grandpa consensus
└─ 6 second block time

Storage:
├─ PostgreSQL (primary data)
├─ IPFS (metadata, catalogs, chat media)
├─ S3 or LocalFS (user uploads)
└─ OpenSearch (optional full-text search)
```

## 10. WHAT'S IMPLEMENTED ✅

```
Escrow System
✅ BZR multi-asset support
✅ ZARI multi-asset support
✅ Lock/Release mechanisms
✅ TX verification
✅ Timeout handling
❌ Dispute resolution pallet

Orders & Commerce
✅ P2P Orders (full lifecycle)
✅ Marketplace Orders
✅ Delivery Orders
✅ Payment status tracking
✅ Order timeout automation
❌ On-chain order primitive

Reputation & Attestations
✅ Badge system (ProfileBadge)
✅ Reputation scoring
✅ Reputation events (audit log)
✅ On-chain identity pallet
✅ Reputation tier system
⚠️  Automatic sync (worker in progress)

Affiliates & Commission
✅ Affiliate profiles
✅ Commission tracking
✅ Multi-store proposals
✅ Marketplace storefronts
✅ Sales aggregation
❌ On-chain settlement pallet
❌ Receipt NFT minting

Delivery Network
✅ Delivery profiles
✅ Delivery requests with escrow
✅ Proof of delivery (photo + signature)
✅ Performance metrics
✅ Payment release on completion
❌ Advanced routing/optimization
❌ Real-time GPS tracking

Chat & Messaging
✅ E2EE chat (Curve25519)
✅ Order-linked messages
✅ Proposal creation in chat
✅ Real-time WebSocket
❌ Voice/video calls (UI only)
```

## 11. NEXT PRIORITIES

1. **E2E P2P Flow Testing** (BZR + ZARI complete cycle)
2. **Implement Escrow Pallet** (on-chain state machine for disputes)
3. **Reputation Sync Automation** (worker stabilization)
4. **Fulfillment Pallet** (proof of commerce primitives)
5. **Affiliate Settlement Pallet** (on-chain commission split)
6. **Receipt NFT Minting** (using pallet-uniques)
7. **Dispute Resolution** (arbitration mechanism)
8. **Advanced Delivery Routing** (geospatial optimization)

## 12. CRITICAL PATHS

**For Security & Production**:
- [ ] Audit BlockchainService (singleton thread-safety)
- [ ] Audit EscrowService (fund safety)
- [ ] Test reputation worker under load
- [ ] Verify SIWS signature validation
- [ ] Test P2P timeout edge cases
- [ ] Implement proper error recovery

**For Scalability**:
- [ ] Database indexes optimization
- [ ] Cache strategy for phase info
- [ ] Affiliate stats aggregation (bulk queries)
- [ ] Delivery request matching algorithm
- [ ] Chat message pagination

**For UX**:
- [ ] Real-time balance updates
- [ ] TX status polling (block confirmation)
- [ ] Notification system maturity
- [ ] Mobile wallet integration
- [ ] Delivery tracking map

---

**Generated**: 2025-10-28  
**Source**: Code analysis (1622 lines Prisma + 1000+ Rust pallets + 340+ routes)  
**Accuracy**: Based on actual implementation, not documentation
