# Bazari Complete Entity Relationship Diagram - Summary

**Generated:** 2025-11-02
**Source:** `/root/bazari/apps/api/prisma/schema.prisma` (1622 lines)
**Diagram:** `/root/bazari/knowledge/20-blueprints/schema/complete-erd.mmd`

---

## Overview

This comprehensive ERD represents the complete Bazari platform schema, encompassing all microservices and domains into a unified master diagram.

### Statistics

- **Total Entities:** 64 models
- **Total Relationships:** 120+ edges
- **Enums:** 10 types
- **Domains:** 14 functional areas

---

## Domain Breakdown

### 1. AUTH DOMAIN (3 entities)
Authentication and session management.

**Entities:**
- `User` - Core user entity (blockchain address-based)
- `AuthNonce` - SIWE nonce management
- `RefreshToken` - JWT refresh token storage

**Key Relationships:**
- User → Profile (1:1)
- User → SellerProfile (1:N)
- User → RefreshToken (1:N)

---

### 2. PROFILE & SOCIAL DOMAIN (5 entities)
User profiles, reputation, and social features.

**Entities:**
- `Profile` - User profile with reputation system
- `Follow` - Following/follower relationships
- `ProfileBadge` - NFT-based badges
- `ProfileReputationEvent` - On-chain reputation events
- `HandleHistory` - Handle change history

**Key Features:**
- On-chain profile NFT integration
- Reputation scoring system (bronze → diamond tiers)
- E2EE chat public key storage
- Badge issuance and revocation tracking

**Key Relationships:**
- Profile → Follow (N:M self-referential)
- Profile → Post (1:N)
- Profile → DeliveryProfile (1:1)

---

### 3. STORE DOMAIN (4 entities)
Seller store management and on-chain synchronization.

**Entities:**
- `SellerProfile` - Store entity with on-chain sync
- `StorePublishHistory` - Version history of store publications
- `StoreSnapshot` - Cached store state
- `StoreCommissionPolicy` - Commission configuration

**Key Features:**
- Multi-store support (users can have multiple stores)
- On-chain synchronization with Substrate pallet
- IPFS metadata storage (CID tracking)
- Version control for store data
- Pickup address management

**Key Relationships:**
- SellerProfile → Product (1:N)
- SellerProfile → ServiceOffering (1:N)
- SellerProfile → StorePublishHistory (1:N)

---

### 4. MARKETPLACE DOMAIN (4 entities)
Product/service listings and category management.

**Entities:**
- `Category` - Hierarchical category tree (4 levels)
- `CategorySpec` - Dynamic category specifications (JSON Schema)
- `Product` - Physical goods listings
- `ServiceOffering` - Service listings

**Key Features:**
- Multilingual support (pt/en/es)
- JSON Schema validation for category attributes
- On-chain store ID integration
- Full-text search capabilities
- Dynamic pricing in BZR

**Key Relationships:**
- Category → Product (1:N)
- Category → ServiceOffering (1:N)
- Product → SellerProfile (N:1)

---

### 5. ORDERS & PAYMENTS DOMAIN (5 entities)
Order processing and escrow management.

**Entities:**
- `Order` - Order aggregate root
- `OrderItem` - Individual line items
- `PaymentIntent` - Escrow payment tracking
- `EscrowLog` - Escrow event audit trail
- `CartItem` - Shopping cart (isolated)

**Key Features:**
- Multi-item orders
- BZR-based pricing (planck precision)
- On-chain escrow integration
- Shipping address and options
- Order status workflow (CREATED → RELEASED)

**Key Relationships:**
- Order → OrderItem (1:N)
- Order → PaymentIntent (1:N)
- Order → DeliveryRequest (1:1)

---

### 6. SOCIAL FEED DOMAIN (6 entities)
Social media features (posts, reactions, comments).

**Entities:**
- `Post` - User-generated content
- `PostLike` - Simple likes
- `PostRepost` - Shares/retweets
- `PostReaction` - Emoji reactions (love/laugh/wow/sad/angry)
- `PostComment` - Nested comments
- `PostCommentLike` - Comment likes

**Key Features:**
- Multi-type posts (text/image/link)
- Nested comment threads
- Multiple reaction types
- Draft/published workflow

**Key Relationships:**
- Post → PostComment (1:N)
- PostComment → PostComment (1:N self-referential)
- Profile → Post (1:N)

---

### 7. NOTIFICATIONS DOMAIN (1 entity)
User notification system.

**Entities:**
- `Notification` - Unified notification queue

**Key Features:**
- Multiple notification types (follow, like, repost, badge, etc.)
- Actor tracking (who triggered)
- Read/unread state
- Flexible metadata JSON

**Key Relationships:**
- User → Notification (1:N)
- Profile → Notification (1:N as actor)

---

### 8. P2P TRADING DOMAIN (7 entities)
Peer-to-peer BZR/ZARI trading with fiat.

**Entities:**
- `P2POffer` - Buy/sell offers (maker side)
- `P2POrder` - Executed trades (taker side)
- `P2PMessage` - Order chat messages
- `P2PDispute` - Dispute resolution
- `P2PReview` - Trader ratings
- `P2PPaymentProfile` - PIX payment details
- `ZARIPhaseConfig` - ZARI token phase configuration

**Key Features:**
- Multi-asset support (BZR, ZARI)
- ZARI phase pricing (2A/2B/3)
- PIX integration (Brazil)
- Escrow integration
- Auto-reply messages
- Dispute system

**Key Relationships:**
- P2POffer → P2POrder (1:N conceptual)
- P2POrder → P2PMessage (1:N)
- P2POrder → P2PDispute (1:1)

---

### 9. CHAT DOMAIN (12 entities)
E2EE messaging and group chat system.

**Entities:**
- `ChatThread` - Conversation container
- `ChatMessage` - E2EE encrypted messages
- `ChatGroup` - Group chat metadata
- `ChatGroupMember` - Group membership
- `ChatProposal` - In-chat checkout proposals
- `ChatMission` - Gamified missions
- `ChatMissionCompletion` - Mission progress
- `ChatOpportunity` - Job postings
- `ChatTrustBadge` - Trust level NFT badges
- `ChatReport` - Content reports
- `ChatReportVote` - Community moderation votes
- `ChatGroupPoll` - Group polls

**Key Features:**
- End-to-end encryption (ciphertext storage)
- Multi-store proposals
- Mission rewards system
- Community-driven moderation
- DM/store/order/group thread types

**Key Relationships:**
- ChatThread → ChatMessage (1:N)
- ChatThread → ChatProposal (1:N)
- ChatProposal → AffiliateSale (1:N)

---

### 10. AFFILIATE SYSTEM DOMAIN (5 entities)
Affiliate marketing and commission management.

**Entities:**
- `ChatStoreAffiliate` - Approved promoters
- `ChatAffiliateInvite` - Invite codes
- `AffiliateMarketplace` - Custom storefronts
- `AffiliateProduct` - Curated product displays
- `AffiliateSale` - Commission-tracked sales

**Key Features:**
- Per-store affiliate approval
- Custom commission rates
- Invite code system
- Personalized marketplaces
- Sale tracking and splits
- Multi-store proposal support

**Key Relationships:**
- Profile → ChatStoreAffiliate (1:N)
- Profile → AffiliateMarketplace (1:N)
- AffiliateMarketplace → AffiliateProduct (1:N)
- ChatProposal → AffiliateSale (1:N)

---

### 11. DELIVERY NETWORK DOMAIN (3 entities)
Last-mile delivery logistics.

**Entities:**
- `DeliveryRequest` - Delivery job
- `DeliveryProfile` - Deliverer profile/stats
- `StoreDeliveryPartner` - Store-deliverer partnerships

**Key Features:**
- Order-linked and direct deliveries
- Private delivery networks
- Priority-based assignment
- Real-time GPS tracking
- Vehicle capacity matching
- Escrow payment integration
- Proof of delivery
- Performance metrics

**Key Relationships:**
- Order → DeliveryRequest (1:1)
- Profile → DeliveryProfile (1:1)
- Profile → StoreDeliveryPartner (1:N)
- DeliveryRequest → Profile (N:1 as deliverer)

---

### 12. MEDIA DOMAIN (1 entity)
File upload management.

**Entities:**
- `MediaAsset` - Uploaded files (images, videos, docs)

**Key Features:**
- Content hash deduplication
- Polymorphic ownership (ownerType/ownerId)
- Filesystem and S3 support
- MIME type tracking

---

### 13. DAO & GOVERNANCE DOMAIN (3 entities)
Decentralized organization structures.

**Entities:**
- `Dao` - Top-level DAO
- `SubDao` - Sub-DAOs
- `ProfileSubDao` - Membership and roles

**Key Features:**
- Hierarchical DAO structure
- Role-based access (owner/admin/member)
- Slug-based routing

---

### 14. GAMIFICATION DOMAIN (4 entities)
Achievements and daily quests.

**Entities:**
- `Achievement` - Unlockable achievements
- `UserAchievement` - User progress
- `Quest` - Daily/recurring quests
- `UserQuest` - Quest completion

**Key Features:**
- Multi-tier achievements (bronze → diamond)
- Progress tracking
- Reward system
- Date-based quest tracking

**Key Relationships:**
- Achievement → UserAchievement (1:N)
- Quest → UserQuest (1:N)

---

### 15. MODERATION & SAFETY DOMAIN (3 entities)
Content moderation and user blocking.

**Entities:**
- `ContentReport` - Content reports
- `UserBlock` - User blocking
- `UserMute` - User muting

**Key Features:**
- Multi-reason reporting
- Admin review workflow
- Block/mute relationships

**Key Relationships:**
- User → ContentReport (1:N as reporter)
- User → ContentReport (1:N as reviewer)
- User → UserBlock (N:M self-referential)

---

### 16. ANALYTICS & TRENDING DOMAIN (2 entities)
User behavior and trending topics.

**Entities:**
- `UserInteraction` - Interaction tracking
- `TrendingTopic` - Trending tags/topics

**Key Features:**
- Weighted interactions
- Growth rate calculation
- Multi-target tracking (post/profile/product)

---

### 17. AUDIT DOMAIN (1 entity)
System audit logging.

**Entities:**
- `AuditLog` - Entity change history

**Key Features:**
- Diff tracking
- IP/UA logging
- Actor tracking

---

## Key Technical Patterns

### 1. On-Chain Integration
Multiple entities track on-chain state:
- `Profile.onChainProfileId` (NFT-based identity)
- `SellerProfile.onChainStoreId` (store pallet)
- `Product.onChainStoreId` (marketplace pallet)
- `ProfileReputationEvent.blockNumber` (reputation events)

### 2. IPFS/CID Storage
Content-addressed storage:
- `SellerProfile.metadataCid` (store metadata)
- `Profile.metadataCid` (profile data)
- `ChatMessage.mediaCid` (encrypted media)
- `AffiliateSale.receiptNftCid` (NFT receipts)

### 3. Multilingual Support
Multiple entities support i18n:
- `Category` (namePt/nameEn/nameEs)
- `ProfileBadge.label` (JSON multilang)

### 4. Soft Delete / Status Enums
Most entities use status fields instead of hard deletes:
- `ProductStatus` (DRAFT/PUBLISHED/ARCHIVED)
- `OrderStatus` (CREATED → RELEASED)
- `P2POrderStatus` (complex workflow)

### 5. JSON Flexibility
Many entities use JSON for extensibility:
- `Product.attributes` (category-specific data)
- `Order.shippingAddress` (address structure)
- `DeliveryRequest.pickupAddress` (pickup details)
- `ChatMessage.meta` (message metadata)

### 6. Polymorphic Relationships
Some entities use type discriminators:
- `MediaAsset` (ownerType/ownerId)
- `OrderItem.kind` (product/service)
- `DeliveryRequest.senderType` (store/profile)

### 7. Self-Referential Relationships
Entities that reference themselves:
- `PostComment.parentId` (nested comments)
- `Follow` (follower/following)
- `UserBlock` (blocker/blocked)

---

## Relationship Cardinalities

### One-to-One (||--||)
- User ↔ Profile
- Profile ↔ DeliveryProfile
- Order ↔ DeliveryRequest
- P2POrder ↔ P2PDispute (optional)

### One-to-Many (||--o{)
- User → SellerProfile (multi-store)
- SellerProfile → Product
- Order → OrderItem
- Post → PostComment
- ChatThread → ChatMessage
- Profile → Post

### Many-to-Many (}o--o{)
- Profile ↔ Profile (via Follow)
- User ↔ User (via UserBlock)
- Store ↔ Profile (via ChatStoreAffiliate)

---

## Indexing Strategy

The schema includes extensive indexing:

1. **Primary Access Patterns:**
   - User address lookups
   - Profile handle lookups
   - Category slug lookups
   - Order buyer/seller queries

2. **Temporal Queries:**
   - `createdAt` indexes on most entities
   - `updatedAt` for change tracking
   - Date-based quest tracking

3. **Full-Text Search:**
   - Product title/description
   - Post content
   - Service offerings

4. **Array/JSON Indexes (GIN):**
   - Category.pathSlugs
   - Product.attributes
   - SellerProfile.operatorAddresses

5. **Composite Indexes:**
   - `[userId, createdAt]` for user timelines
   - `[status, createdAt]` for filtered queries
   - `[storeId, status]` for store management

---

## Data Precision

### High-Precision Decimals
BZR amounts use `@db.Decimal(30, 0)` for planck precision (12 decimals):
- Order totals
- Payment intents
- Escrow amounts

### Standard Decimals
Fiat and standard pricing use `@db.Decimal(20, 8)`:
- P2P fiat prices
- Affiliate commissions
- Delivery fees

### BigInt Usage
Blockchain values use `@db.BigInt`:
- Block numbers
- On-chain IDs
- Unix timestamps (milliseconds)

---

## Unique Constraints

Key unique constraints across the schema:

1. **User Identity:**
   - `User.address` (blockchain address)
   - `Profile.handle` (username)
   - `Profile.userId` (1:1 with User)

2. **Store Identity:**
   - `SellerProfile.shopSlug` (store URL)
   - `SellerProfile.onChainStoreId` (blockchain ID)

3. **Business Logic:**
   - `Follow[followerId, followingId]` (no duplicate follows)
   - `PostLike[postId, profileId]` (one like per user)
   - `ChatStoreAffiliate[storeId, promoterId]` (one affiliate entry)

4. **Versioning:**
   - `CategorySpec[categoryId, version]`
   - `StoreSnapshot[storeId, version]`

---

## Enums

10 enum types for type safety:

1. `OrderStatus` - Order lifecycle (8 states)
2. `PaymentIntentStatus` - Payment states (6 states)
3. `ProductStatus` - Publication status (3 states)
4. `PostStatus` - Post visibility (3 states)
5. `NotificationType` - Notification types (9 types)
6. `P2POfferSide` - BUY_BZR | SELL_BZR
7. `P2POfferStatus` - Offer states (3 states)
8. `P2POrderStatus` - Order workflow (11 states)
9. `P2PPaymentMethod` - PIX (extensible)
10. `P2PAssetType` - BZR | ZARI
11. `ReportReason` - Report categories (6 types)
12. `ReportStatus` - Moderation workflow (4 states)

---

## Future Considerations

### 1. Sharding Candidates
High-volume entities that may need sharding:
- `ChatMessage` (billions of messages)
- `UserInteraction` (analytics data)
- `AuditLog` (audit trail)
- `AffiliateSale` (transaction history)

### 2. Archive/Cold Storage
Historical data candidates:
- Old notifications (>90 days)
- Completed orders (>1 year)
- Inactive chat threads
- Old audit logs

### 3. Caching Layers
Entities with cache fields:
- `Profile` (counters: followers/following/posts)
- `SellerProfile` (ratings)
- `DeliveryProfile` (performance metrics)
- `AffiliateMarketplace` (statistics)

### 4. Event Sourcing
Entities that could benefit:
- `Order` (complex state machine)
- `P2POrder` (dispute resolution)
- `DeliveryRequest` (multi-stage workflow)

---

## Related Documentation

- **Prisma Schema:** `/root/bazari/apps/api/prisma/schema.prisma`
- **ERD Diagram:** `/root/bazari/knowledge/20-blueprints/schema/complete-erd.mmd`
- **Phase Documentation:**
  - FASE 8: Governance & Social
  - FASE 9: Vesting System
  - FASE 11: Delivery Network (in progress)

---

## Version History

- **2025-11-02:** Initial complete ERD generation
  - 64 entities mapped
  - 14 domains identified
  - 120+ relationships documented

---

**Note:** This ERD represents the current state of the schema. As new features are added (e.g., vesting, governance pallets), the diagram should be updated accordingly.
