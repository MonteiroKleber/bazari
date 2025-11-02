# Bazari Schema ERD Documentation

This directory contains the comprehensive Entity Relationship Diagram for the Bazari platform.

## Files

### 1. `complete-erd.mmd` (27KB, 1106 lines)
Complete Mermaid ERD diagram with all 64 entities and relationships.

**Statistics:**
- 63 entities with detailed field definitions
- 55+ one-to-many relationships
- 9+ many-to-many relationships
- 17 domain sections

### 2. `complete-erd-summary.md` (15KB)
Detailed documentation and analysis including:
- Domain breakdown (14 functional areas)
- Relationship patterns
- Indexing strategy
- Data precision specifications
- Future considerations

### 3. `README.md` (this file)
Quick reference guide

---

## Viewing the ERD

### Online Viewers

#### Option 1: Mermaid Live Editor (Recommended)
1. Go to https://mermaid.live/
2. Copy contents of `complete-erd.mmd`
3. Paste into editor
4. Explore interactive diagram

#### Option 2: GitHub
1. View in GitHub (auto-renders Mermaid)
2. Or use GitHub gist

#### Option 3: VS Code
1. Install "Markdown Preview Mermaid Support" extension
2. Open `complete-erd.mmd`
3. Right-click → "Open Preview"

### Export Formats

From Mermaid Live Editor, you can export to:
- PNG (high-resolution)
- SVG (vector graphics)
- PDF (print-ready)

---

## Domain Quick Reference

| Domain | Entities | Key Features |
|--------|----------|--------------|
| **Auth** | 3 | SIWE, blockchain addresses |
| **Profile** | 5 | Reputation, badges, handles |
| **Store** | 4 | Multi-store, on-chain sync |
| **Marketplace** | 4 | Categories, products, services |
| **Orders** | 5 | Escrow, multi-item orders |
| **Social** | 6 | Posts, reactions, comments |
| **Notifications** | 1 | Unified queue |
| **P2P** | 7 | BZR/ZARI trading, PIX |
| **Chat** | 12 | E2EE, proposals, missions |
| **Affiliate** | 5 | Commission tracking |
| **Delivery** | 3 | Last-mile logistics |
| **Media** | 1 | File uploads |
| **DAO** | 3 | Governance structures |
| **Gamification** | 4 | Achievements, quests |
| **Moderation** | 3 | Reports, blocks, mutes |
| **Analytics** | 2 | Interactions, trending |
| **Audit** | 1 | Change history |

---

## Key Relationship Patterns

### Hub Entities (High Fan-Out)
These entities have many outgoing relationships:

1. **User** (14 relationships)
   - Profile, SellerProfiles, Notifications, Achievements, etc.

2. **Profile** (16 relationships)
   - Posts, Follows, Badges, DeliveryProfile, Affiliates, etc.

3. **Order** (4 relationships)
   - OrderItems, PaymentIntents, EscrowLogs, DeliveryRequest

4. **ChatThread** (2 relationships)
   - Messages, Proposals

### Bridge Entities (Many-to-Many)
These entities connect two others:

1. **Follow** (Profile ↔ Profile)
2. **UserBlock** (User ↔ User)
3. **ChatStoreAffiliate** (Store ↔ Profile)
4. **StoreDeliveryPartner** (Store ↔ Profile)

### Aggregate Roots
Entities that own complex sub-graphs:

1. **Order** → OrderItem, PaymentIntent, EscrowLog
2. **Post** → PostLike, PostRepost, PostReaction, PostComment
3. **ChatThread** → ChatMessage, ChatProposal
4. **AffiliateMarketplace** → AffiliateProduct, AffiliateSale

---

## Data Flow Examples

### E-Commerce Flow
```
User → Profile → SellerProfile → Product
                               → Category
User → Order → OrderItem → Product
            → PaymentIntent (escrow)
            → DeliveryRequest → DeliveryProfile
```

### Social Flow
```
User → Profile → Post → PostLike
                      → PostComment → PostCommentLike
                      → PostReaction
                → Follow (bidirectional)
```

### P2P Trading Flow
```
User → Profile → P2POffer
User → Profile → P2POrder → P2PMessage
                          → P2PDispute
                          → P2PReview
              → P2PPaymentProfile (PIX)
```

### Affiliate Flow
```
User → Profile → ChatStoreAffiliate → SellerProfile
              → AffiliateMarketplace → AffiliateProduct
ChatProposal → AffiliateSale → AffiliateMarketplace
```

### Delivery Flow
```
Order → DeliveryRequest → DeliveryProfile → Profile
SellerProfile ← StoreDeliveryPartner → Profile
```

---

## Schema Conventions

### Naming
- **Entities:** PascalCase (e.g., `UserAchievement`)
- **Fields:** camelCase (e.g., `createdAt`)
- **Foreign Keys:** `{entity}Id` (e.g., `userId`)
- **Enums:** UPPER_SNAKE_CASE (e.g., `PUBLISHED`)

### ID Strategies
- **UUID:** `@id @default(uuid())` - User, Order, ChatThread
- **CUID:** `@id @default(cuid())` - Most entities
- **String:** `@id` - Category (custom slugs)
- **BigInt:** `@id` - StoreCommissionPolicy (on-chain ID)

### Timestamps
- **DateTime:** Prisma entities (User, Profile, Order)
- **BigInt:** Chat/Delivery entities (millisecond precision)

### Soft Deletes
No `deletedAt` fields. Instead:
- Status enums (e.g., `ARCHIVED`)
- `active` boolean flags
- `revokedAt` timestamps (badges)

---

## Indexing Highlights

### High-Performance Indexes
```sql
-- User lookups
User.address (unique)
Profile.handle (unique)

-- Timeline queries
[authorId, createdAt]
[userId, read, createdAt]

-- Full-text search
Product.title
Product.description
Post.content

-- Array search (GIN)
Category.pathSlugs
Product.attributes
SellerProfile.operatorAddresses
```

### Composite Indexes
Most temporal queries use `[entityId, createdAt]` pattern for efficient pagination.

---

## On-Chain Integration Points

### NFT-Based Identity
- `Profile.onChainProfileId` → Identity pallet
- `SellerProfile.onChainStoreId` → Store pallet

### Blockchain Tracking
- `ProfileReputationEvent.blockNumber`
- `ProfileBadge.blockNumber`
- `StorePublishHistory.blockNumber`

### IPFS Storage
- `Profile.metadataCid`
- `SellerProfile.metadataCid`
- `ChatMessage.mediaCid`
- `AffiliateSale.receiptNftCid`

---

## Migration History

This schema represents the cumulative result of:
- **FASE 0-7:** Core marketplace, social, P2P
- **FASE 8:** Governance, affiliates, multi-store
- **FASE 9:** Vesting system (not in schema yet)
- **FASE 11:** Delivery network (current)

See `/root/bazari/docs/fase002-final/` for detailed phase documentation.

---

## Related Files

- **Prisma Schema:** `/root/bazari/apps/api/prisma/schema.prisma`
- **Migrations:** `/root/bazari/apps/api/prisma/migrations/`
- **Seeds:** `/root/bazari/apps/api/prisma/seed/`

---

## Usage in Development

### Generate TypeScript Types
```bash
cd /root/bazari/apps/api
npm run prisma:generate
```

### View Database
```bash
npm run prisma:studio
```

### Create Migration
```bash
npm run prisma:migrate dev --name description
```

---

## Contributing

When adding new entities:

1. Update `/root/bazari/apps/api/prisma/schema.prisma`
2. Regenerate ERD: (run this prompt again)
3. Update domain sections in `complete-erd.mmd`
4. Document in `complete-erd-summary.md`
5. Add to this README's quick reference

---

## Notes

- This ERD is generated from the live schema
- Field definitions are simplified for readability
- Some derived/computed fields are omitted
- JSON field structures are documented in summary

---

**Last Updated:** 2025-11-02
**Schema Version:** FASE 11 (Delivery Network)
