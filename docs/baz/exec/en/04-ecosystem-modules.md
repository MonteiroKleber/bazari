## 04. Bazari Ecosystem Modules

---

## Table of Contents
1. [Architecture Overview](#1-architecture-overview)
2. [Marketplace](#2-marketplace)
3. [BazChat](#3-bazchat)
4. [Wallet](#4-wallet)
5. [My Stores](#5-my-stores)
6. [My Marketplace](#6-my-marketplace)
7. [Become a Courier](#7-become-a-courier)
8. [P2P (Peer-to-Peer Exchange)](#8-p2p-peer-to-peer-exchange)
9. [DAO (Governance)](#9-dao-governance)
10. [Social Feed](#10-social-feed)
11. [Social Profile](#11-social-profile)
12. [Interconnection Diagram](#12-interconnection-diagram)

---

## 1. Architecture Overview

### 1.1 Design Philosophy

The Bazari ecosystem is not a single application, but a **set of interconnected modules** that form a cohesive experience. Each module:

- ✅ Is **autonomous** (can function independently)
- ✅ Is **composable** (integrates naturally with other modules)
- ✅ **Queries the same on-chain state** (BazariChain)
- ✅ Can have **multiple implementations** (different frontends)

```
┌─────────────────────────────────────────────────┐
│             APPLICATION LAYER                   │
│  (Frontend Modules - Web/Mobile/Desktop)        │
├─────────────────────────────────────────────────┤
│                                                 │
│  Marketplace │ BazChat │ Wallet │ P2P │ DAO    │
│     │            │         │       │       │    │
│     └────────────┴─────────┴───────┴───────┘    │
│                       │                          │
├───────────────────────┼──────────────────────────┤
│               DATA LAYER                         │
│              BazariChain (Substrate)             │
│  ┌──────────────────────────────────────────┐   │
│  │ Pallets: Order, Escrow, Attestation,     │   │
│  │ Fulfillment, Affiliate, Reputation, DAO  │   │
│  └──────────────────────────────────────────┘   │
├─────────────────────────────────────────────────┤
│          INFRASTRUCTURE LAYER                   │
│  IPFS (media) │ libp2p (p2p) │ Storage (db)    │
└─────────────────────────────────────────────────┘
```

---

## 2. Marketplace

### 2.1 Description

The **Marketplace** is the main module where users **discover, buy and sell products**. It's the entry point for most users.

**Features**:
- Browse by categories (Electronics, Fashion, Home, Food, Services)
- Search (text, filters, sorting)
- Product page (photos, description, reviews, seller's PoC Score)
- Shopping cart
- Checkout (Order creation + Escrow deposit)
- Order tracking (timeline with on-chain proofs)

---

### 2.2 Connection with Proof of Commerce

```
User searches "Nike Shoes"
    ↓
Marketplace queries on-chain:
  - Listed products (pallet-product)
  - SellerScore for each merchant (pallet-reputation)
  - Ranking algorithm (open source)
    ↓
Display sorted results
    ↓
User clicks "Buy"
    ↓
Marketplace calls Wallet:
  - Creates Order on-chain (pallet-order::create_order)
  - Deposits escrow (pallet-escrow::deposit)
    ↓
Order ID created (e.g.: 0xABC123)
    ↓
User is redirected to tracking timeline
```

**Innovation vs. Traditional Marketplaces**:

| Feature | Traditional Marketplace | Bazari Marketplace |
|---------|-------------------------|--------------------|
| Search | Secret algorithm | Open source auditable code |
| Ranking | Ad auction-based | Based on PoC reputation + quality |
| Payment | Fiat (card) via gateway | Crypto (BZR) via on-chain escrow |
| Tracking | Opaque internal system | Immutable on-chain proofs (attestations) |
| Dispute | Centralized support | Decentralized jury |

---

### 2.3 UX Flow Example

**Scenario**: Maria wants to buy a dress.

1. **Discovery**
   ```
   Maria opens Marketplace → category "Women's Fashion"
   Filters: Price $50-150, Size M, Color Green
   Sort: "Best reputation"
   ```

2. **Product Analysis**
   ```
   Product: Green Dress - $89
   Seller: @ModaAutoral (SellerScore: 850/1000)
   Reviews: 4.8/5 (127 sales)
   Location: São Paulo - SP
   Shipping: $12 (1-day delivery by Courier Score 920)
   ```

3. **Purchase**
   ```
   Maria clicks "Buy Now"
   Wallet opens modal:
     Total: 89 + 12 = 101 BZR
     Balance: 250 BZR ✅
     [Confirm Purchase]
   ```

4. **Proof of Commerce Initiates**
   ```
   Order #0xABC created
   Escrow locked: 101 BZR
   Seller notified via BazChat
   Timeline displayed:
     ✅ Order created (now)
     ⏳ Awaiting seller acceptance
   ```

---

### 2.4 Integration with Other Modules

| Module | Integration |
|--------|-----------|
| **Wallet** | Marketplace calls Wallet for on-chain transactions |
| **BazChat** | "Talk to seller" button opens chat |
| **My Stores** | Seller manages products via dashboard |
| **Become a Courier** | Couriers see available orders in Marketplace |
| **Social Feed** | Products can be shared on Feed |
| **DAO** | Users can propose changes to ranking algorithm |

---

## 3. BazChat

### 3.1 Description

**BazChat** is the **P2P messaging** module built on libp2p. It serves multiple functions:

1. **Chat** between Buyer/Seller/Courier
2. **Co-signing of proofs** (Handoff, Delivery)
3. **Negotiation** (offer/counteroffer)
4. **Community support** (group chat for learning)

**Technical Characteristics**:
- Protocol: libp2p/gossipsub
- Encryption: E2EE (end-to-end encryption) with wallet keys
- Storage: Messages in local storage (don't go to blockchain)
- Media: Photos/videos via IPFS

---

### 3.2 Connection with Proof of Commerce

**Primary Use: Co-Signing Proofs**

```
┌──────────────────────────────────────────────────┐
│        HANDOFF: Seller delivers to Courier       │
├──────────────────────────────────────────────────┤
│                                                  │
│  BazChat opens special screen:                   │
│    [Camera]  Take photo of sealed package        │
│    [Geo]     Location captured: Store XYZ        │
│    [Weight]  1.2 kg (optional, if scale available)│
│    [QR Code] Ephemeral code for validation       │
│                                                  │
│  Seller sees preview:                            │
│    [Sign Handoff] ← Clicks here                  │
│                                                  │
│  Courier sees preview:                           │
│    [Sign Handoff] ← Clicks here                  │
│                                                  │
│  When BOTH sign:                                 │
│    → HandoffProof JSON is generated              │
│    → Hash is anchored on-chain (pallet-attestation)│
│    → Media uploads to IPFS                       │
│    → Order changes to IN_TRANSIT                 │
│                                                  │
└──────────────────────────────────────────────────┘
```

**Same process for DeliveryProof** (Courier + Buyer).

---

### 3.3 Social Features

**1-on-1 Chat**:
```
Buyer: Hi, do you have the dress in blue?
Seller: Hello! Yes, I have blue in size M and L. Which do you prefer?
Buyer: M, please. Can you ship tomorrow?
Seller: I can! I'll update the order to blue and confirm in 10 min.
```

**Group Chat** (e.g.: "Artisan Sellers MG"):
```
User1: Anyone know how to set up affiliate campaigns?
User2: Yes! Go to My Stores → Campaigns → Create New
User3: Sharing tutorial: ipfs://QmTutorial...
```

**Smart Notifications**:
```
🔔 @ModaAutoral accepted your order #0xABC
🔔 Courier @Motoboy123 was selected
🔔 📦 Handoff confirmed! Your order is on the way
🔔 Courier is 2km from you (geo update via libp2p)
🔔 📬 Order delivered! Confirm receipt in BazChat
```

---

### 3.4 Privacy and Security

**E2E Encryption**:
```rust
// Message sent by Seller to Buyer
let shared_secret = ecdh(seller_privkey, buyer_pubkey);
let encrypted_msg = aes_gcm_encrypt(message, shared_secret);

// Published via gossipsub
topic: /bazari/order/0xABC
payload: encrypted_msg

// Only Buyer can decrypt
let decrypted = aes_gcm_decrypt(encrypted_msg, shared_secret);
```

**No Central Server**:
- No server "reads" your messages
- Not even Bazari developers have access
- Message logs stay only on participants' devices

**Integration with PoC**:
- Co-signed proofs have **on-chain timestamp** (immutable)
- Regular messages **don't go to blockchain** (privacy)
- Sensitive media can be stored in private IPFS (only those with CID can access)

---

### 3.5 Integration with Other Modules

| Module | Integration |
|--------|-----------|
| **Marketplace** | "Talk to seller" button on any product |
| **Wallet** | BazChat uses Wallet identity (account_id) |
| **My Stores** | Seller responds to multiple buyer inquiries |
| **Become a Courier** | Courier coordinates pickup/delivery via chat |
| **Social Profile** | Messages can reference Feed posts |

---

## 4. Wallet

### 4.1 Description

**Wallet** is the **crypto asset management** module. It's the bridge between the user and the blockchain.

**Features**:
- Create/Import account (12/24-word mnemonic)
- View balance (BZR, other tokens)
- Send/Receive (on-chain transfers)
- Sign transactions (order creation, attestations, DAO votes)
- History (all account transactions)
- Hardware wallet integration (Ledger, Trezor - Phase 2)

---

### 4.2 Connection with Proof of Commerce

**Wallet is the Control Point for All On-Chain Activity**:

```rust
// Examples of transactions Wallet signs:

// 1. Create Order (Buyer)
pallet_order::create_order(
    origin: signed(buyer_account),
    product_id,
    escrow_amount: 100 BZR
)

// 2. Deposit Stake (Courier)
pallet_fulfillment::deposit_stake(
    origin: signed(courier_account),
    order_id,
    stake: 20 BZR
)

// 3. Submit Attestation (Seller + Courier)
pallet_attestation::submit_attestation(
    origin: signed(seller_account),  // can be any of the signers
    order_id,
    step: HANDOFF,
    payload_hash,
    signatures: [
        (seller_account, seller_sig),
        (courier_account, courier_sig)
    ]
)

// 4. Vote on DAO Proposal
pallet_dao::vote(
    origin: signed(token_holder),
    proposal_id,
    vote: Aye | Nay,
    voting_power: amount_of_BZR_staked
)
```

---

### 4.3 UX Interface

**Main Screen**:
```
┌────────────────────────────────────────┐
│            Bazari Wallet               │
├────────────────────────────────────────┤
│                                        │
│  Account: 5FHneW... [Copy] [QR]       │
│                                        │
│  💰 Total Balance                      │
│      1,247.50 BZR                      │
│      ≈ $6,237.50 (P2P rate)            │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │ [Send] [Receive] [History]       │ │
│  └──────────────────────────────────┘ │
│                                        │
│  🔒 Locked Funds                       │
│      Escrows: 150 BZR (3 orders)       │
│      Stakes: 60 BZR (as courier)       │
│                                        │
│  📊 Reputations                        │
│      Seller Score:  850/1000           │
│      Courier Score: 920/1000           │
│      Buyer Score:   750/1000           │
│                                        │
└────────────────────────────────────────┘
```

**Transaction Flow**:
```
User clicks [Send]
    ↓
Modal opens:
  To: 5Recipient... (or scan QR)
  Amount: 50 BZR
  Fee: 0.01 BZR (gas fee)
  [Confirm]
    ↓
Wallet generates transaction:
  balances::transfer(dest, 50 BZR)
    ↓
User sees preview:
  From: 5FHneW...
  To: 5Dest...
  Amount: 50 BZR
  Fee: 0.01 BZR
  ─────────────
  Total: 50.01 BZR
  [Sign with Password/Biometrics]
    ↓
Transaction broadcast to network
    ↓
Confirmation in ~12s (2 blocks)
    ↓
Notification: ✅ Sent! TxHash: 0xTx123...
```

---

### 4.4 Security

**Custody**:
- ✅ **Non-custodial**: User controls private keys
- ❌ Bazari **never** has access to keys
- ✅ Mnemonic can recover account in any compatible wallet (Polkadot.js, Talisman, SubWallet)

**Protections**:
```
Private key encrypted with strong password
    ↓
Stored in Keychain (iOS) / Keystore (Android) / Encrypted storage (Web)
    ↓
Signing requires authentication:
  • Password (default)
  • Biometrics (Face ID, Touch ID) - optional
  • Hardware wallet (Ledger via USB/Bluetooth) - Phase 2
```

**Multi-Sig** (Phase 2, for businesses):
```rust
// Multi-sig account requires 2 of 3 signatures
let multisig_account = create_multisig([alice, bob, charlie], threshold: 2);

// Large value transaction (e.g.: 10,000 BZR)
pallet_multisig::as_multi(
    signatories: [alice, bob, charlie],
    threshold: 2,
    call: balances::transfer(dest, 10_000 BZR)
);

// Alice and Bob sign → transaction executes
// If only Alice signs → stays pending
```

---

### 4.5 Integration with Other Modules

| Module | Integration |
|--------|-----------|
| **All** | Wallet is used by **all modules** to sign transactions |
| **Marketplace** | Checkout uses Wallet for escrow |
| **BazChat** | Proof co-signatures via Wallet |
| **P2P** | Wallet manages BZR ↔ Fiat buy/sell orders |
| **DAO** | Wallet locks BZR for voting power |

---

## 5. My Stores

### 5.1 Description

**My Stores** is the **seller management** module. It's the control panel for those selling on Bazari.

**Features**:
- List products (title, description, photos, price, stock)
- Manage orders (accept, cancel, view timeline)
- Affiliate campaigns (create, configure commissions)
- Analytics (sales, revenue, best-selling products)
- Reputation (view SellerScore, review history)
- Settings (return policy, shipping time)

---

### 5.2 Connection with Proof of Commerce

**Product Lifecycle**:

```
Seller creates product:
  Title: "Handmade T-shirt - Tie Dye"
  Description: "100% cotton t-shirt, hand-dyed..."
  Photos: [img1.jpg, img2.jpg]
  Price: 45 BZR
  Stock: 10 units
  Category: Fashion > T-shirts
    ↓
My Stores calls:
  pallet_product::create_product(
      seller_account,
      metadata_cid: "QmProduct123" (JSON on IPFS),
      price: 45 BZR,
      stock: 10
  )
    ↓
On-chain Product ID: #0xProd456
    ↓
Appears in Marketplace for everyone
```

**Order Management**:

```
Seller sees dashboard:

┌────────────────────────────────────────┐
│         Pending Orders                 │
├────────────────────────────────────────┤
│                                        │
│  Order #0xABC - $89                    │
│    Product: Green Dress                │
│    Buyer: @Maria (BuyerScore 750)      │
│    [Accept] [Decline]                  │
│                                        │
│  Order #0xDEF - $120                   │
│    Product: Artisan Bag                │
│    Buyer: @João (BuyerScore 890)       │
│    [Accept] [Decline]                  │
│                                        │
└────────────────────────────────────────┘

Seller clicks [Accept] on #0xABC
    ↓
My Stores calls:
  pallet_order::accept_order(seller_account, order_id)
    ↓
Order changes to ACCEPTED
    ↓
Notification sent:
  • To Buyer: "Your order was accepted!"
  • To nearby Couriers: "New order available in São Paulo"
```

---

### 5.3 Affiliate Campaigns

**Campaign Creation**:

```
Seller wants to incentivize sharing
    ↓
My Stores > Campaigns > [New Campaign]
    ↓
Form:
  Product(s): Green Dress, Blue Dress
  Total commission rate: 5%
  Level decay: 50% (level 2 receives half of level 1)
  Max. hops: 5
  Affiliate minimum stake: 10 BZR
  Duration: 30 days
    ↓
My Stores calls:
  pallet_affiliate::create_campaign(
      seller_account,
      products: [0xProd456, 0xProd789],
      rate: 500,  // 5% in basis points
      max_hops: 5,
      decay: 50,
      min_stake: 10 BZR,
      duration: 30 * DAYS
  )
    ↓
Campaign ID: #0xCampaign123
DAG root published on-chain
    ↓
Seller can share link:
  bazari.app/product/0xProd456?campaign=0xCampaign123
```

**When Someone Shares**:
```
Affiliate1 gets link and shares on Instagram
    ↓
Affiliate2 sees post, opens link, gets their affiliate link
    ↓
Affiliate2 shares on WhatsApp
    ↓
Buyer clicks Affiliate2's link and purchases
    ↓
Order created with AffiliatePath: [Affiliate1, Affiliate2]
    ↓
On finalization, automatic split:
  Seller: 42.75 BZR (45 - 5%)
  Affiliate1 (level 1): 1.50 BZR (3.33% of total)
  Affiliate2 (level 2): 0.75 BZR (1.67% of total)
```

---

### 5.4 Analytics

**Seller Dashboard**:

```
┌────────────────────────────────────────┐
│            Analytics                   │
├────────────────────────────────────────┤
│                                        │
│  📊 Last 30 days                       │
│                                        │
│  Sales:   47 orders                    │
│  Revenue:  4,230 BZR (+18% vs. previous month)│
│  Average ticket: 90 BZR                │
│  Conversion rate: 12% (visitors → purchases)│
│                                        │
│  🏆 Best-selling products              │
│    1. Green Dress (18 sales)           │
│    2. Artisan Bag (12 sales)           │
│    3. Tie Dye T-shirt (9 sales)        │
│                                        │
│  ⭐ Reputation                          │
│    SellerScore: 850/1000 (↑ 20 pts)   │
│    Reviews: 4.8/5 (127 reviews)        │
│    Dispute rate: 0.8% (low)            │
│                                        │
│  🌐 Affiliates                          │
│    Affiliate conversions: 23 (48%)     │
│    Top affiliate: @Influencer (12 sales)│
│                                        │
└────────────────────────────────────────┘
```

---

### 5.5 Integration with Other Modules

| Module | Integration |
|--------|-----------|
| **Marketplace** | Products created in My Stores appear in Marketplace |
| **BazChat** | Seller responds to inquiries via integrated chat |
| **Wallet** | Sales revenue goes directly to Wallet |
| **Social Feed** | Seller can post about new products |
| **DAO** | Seller can propose changes (e.g.: reduce fee) |

---

## 6. My Marketplace

### 6.1 Description

**My Marketplace** is the module that allows **sellers to create their own customized storefront**.

**Difference from My Stores**:
- **My Stores**: Backend/control panel (management)
- **My Marketplace**: Frontend/showcase (for customers)

**Features**:
- Custom design (logo, colors, banner)
- Own domain (e.g.: modaautoral.bazari.app or modaautoral.com)
- Filtered catalog (only this seller's products)
- "About" page (brand story, values)
- Social media integration

---

### 6.2 Connection with Proof of Commerce

**My Marketplace consumes the same on-chain data as the global Marketplace**:

```
modaautoral.bazari.app
    ↓
Custom frontend (Next.js/React)
    ↓
Queries BazariChain:
  pallet_product::get_products_by_seller(seller_account)
    ↓
Returns list of this seller's products
    ↓
Renders with personalized design
```

**Advantage**:
- ✅ Seller has **full control** over appearance
- ✅ **On-chain reputation** remains valid (SellerScore visible)
- ✅ Checkout uses **same PoC protocol** (backend unchanged)

---

### 6.3 Customization Example

**Seller: "Artesanato Mineiro"**

```
┌────────────────────────────────────────┐
│   🏔️ Artesanato Mineiro (Logo)        │
│   "Tradition from the Mountains"       │
├────────────────────────────────────────┤
│                                        │
│  [Banner: Photo of Minas Gerais]      │
│                                        │
│  🏺 Our Products                       │
│    ┌────┬────┬────┬────┐              │
│    │Vase│Pot │Bowl│Jar │              │
│    │$45 │$30 │$25 │$60 │              │
│    └────┴────┴────┴────┘              │
│                                        │
│  📖 About Us                           │
│    "We are a cooperative of 20..."     │
│                                        │
│  ⭐ SellerScore: 920/1000              │
│    4.9/5 - 342 sales                   │
│                                        │
│  📱 Social Media                       │
│    Instagram | Facebook | WhatsApp     │
│                                        │
└────────────────────────────────────────┘
```

**Own Domain**:
```
Seller configures DNS:
  artesanatomineiro.com → CNAME modaautoral.bazari.app

Result:
  Customers access artesanatomineiro.com
  But checkout uses BazariChain
  Seller maintains own SEO and branding
```

---

### 6.4 Ready-Made Templates

**To Facilitate Adoption**:

| Template | Description | Ideal For |
|----------|-----------|------------|
| **Minimalist** | Clean, photo-focused | Photography, Art |
| **Vintage** | Earth tones, classic typography | Crafts, Antiques |
| **Tech** | Dark mode, geometry | Electronics, Gadgets |
| **Organic** | Green, nature | Organic foods, Natural cosmetics |
| **Fashion** | Photo grid, hover effects | Fashion, Accessories |

---

### 6.5 Integration with Other Modules

| Module | Integration |
|--------|-----------|
| **My Stores** | My Marketplace is the "showcase" of what's managed in My Stores |
| **Marketplace** | Products appear in both (global and own storefront) |
| **Social Feed** | Feed posts can link to My Marketplace |
| **BazChat** | Chat embedded in storefront |

---

## 7. Become a Courier

### 7.1 Description

**Become a Courier** is the module for those who want to **offer delivery services** and participate in PoC as a Courier.

**Features**:
- Register as courier (profile, vehicle, availability)
- View available orders (geographic matching)
- Apply for deliveries (price and timeframe bid)
- Route tracking (optimization)
- Earnings (delivery history and earnings)
- CourierScore (reputation)

---

### 7.2 Connection with Proof of Commerce

**Complete Courier Flow**:

```
João registers as courier:
  Name: @Motoboy_JP
  Vehicle: Motorcycle
  Region: East Zone SP
  Availability: 8am-6pm (Mon-Fri)
  Initial stake deposited: 50 BZR
    ↓
Become a Courier calls:
  pallet_fulfillment::register_courier(
      account: joao_account,
      profile_cid: "QmCourierProfile",
      initial_stake: 50 BZR
  )
    ↓
Initial CourierScore: 500/1000 (default for new)
    ↓
João becomes "available" in courier pool
```

**Order Matching**:

```
Order #0xABC created (Product in SP - East Zone)
    ↓
System sends push notification to couriers:
  • Within 10 km radius of store
  • With CourierScore >= 400
  • Available at the time
    ↓
João receives notification:
  🚚 New Order Available
  Pickup: ModaAutoral Store (3 km from you)
  Deliver: Neighborhood X (5 km from store)
  Suggested shipping: $12
  Deadline: Until 6pm today
  [View Details] [Apply]
    ↓
João clicks [Apply]
    ↓
Form:
  My shipping offer: $10 (can offer less to compete)
  Deadline: I'll deliver by 5pm
  [Confirm]
    ↓
Become a Courier calls:
  pallet_fulfillment::apply_as_courier(
      joao_account,
      order_id: 0xABC,
      bid: 10 BZR,
      delivery_time: 5pm
  )
    ↓
Seller sees applications:
  • @Motoboy_JP: $10, by 5pm (CourierScore 820)
  • @Bike_Delivery: $8, by 7pm (CourierScore 650)
    ↓
Seller chooses @Motoboy_JP (better reputation and deadline)
    ↓
João is notified:
  ✅ You were selected!
  Stake of 20 BZR will be locked (20% of 100 BZR order value)
  [Accept] [Decline]
    ↓
João accepts:
  pallet_fulfillment::deposit_stake(joao_account, 0xABC, 20 BZR)
    ↓
Order changes to COURIER_ASSIGNED
```

**Handoff and Delivery**:

```
João arrives at store
    ↓
BazChat opens Handoff screen
    ↓
João and Seller take photo of package, both sign
    ↓
HandoffProof anchored on-chain
    ↓
João starts delivery (optimized route shown in app)
    ↓
João arrives at Buyer's address
    ↓
BazChat opens Delivery screen
    ↓
João and Buyer take photo, digital signature, both sign
    ↓
DeliveryProof anchored on-chain
    ↓
Order automatically finalizes:
  • João receives 10 BZR (shipping) + 20 BZR (stake returned)
  • CourierScore +15 points
  • Notification: "Delivery completed successfully! 💰 30 BZR received"
```

---

### 7.3 Earnings Dashboard

```
┌────────────────────────────────────────┐
│       My Earnings (João)               │
├────────────────────────────────────────┤
│                                        │
│  💰 Today                              │
│     8 deliveries - 92 BZR earned       │
│                                        │
│  📊 This Week                          │
│     47 deliveries - 520 BZR            │
│     Average: 11 BZR/delivery           │
│                                        │
│  🏆 CourierScore: 920/1000             │
│     ↑ +35 points this month            │
│     Success rate: 98%                  │
│     Reviews: 4.9/5 (156 deliveries)    │
│                                        │
│  📍 Most Profitable Routes             │
│     1. Downtown → East Zone ($15)      │
│     2. Mall → Neighborhood Y ($12)     │
│                                        │
│  🎯 Monthly Goal                       │
│     200 deliveries (23 remaining)      │
│     Bonus if achieved: +50 BZR         │
│                                        │
└────────────────────────────────────────┘
```

---

### 7.4 Gamification

**Courier Ranks**:

| CourierScore | Rank | Benefits |
|--------------|------|------------|
| 0-200 | Novice | High stake, limited orders |
| 200-500 | Bronze | Medium stake, access to more orders |
| 500-750 | Silver | Reduced stake, priority in matching |
| 750-900 | Gold | Low stake, per-delivery bonus, featured |
| 900-1000 | Diamond | Minimum stake, premium routes, 2x bonus |

**Achievements**:
- 🏅 "First Delivery" (+10 points)
- 🚀 "100 Deliveries" (+50 points + badge)
- ⚡ "Lightning Delivery" (< 1h) (+20 points)
- 🌟 "No Disputes (100 deliveries)" (+100 points)

---

### 7.5 Integration with Other Modules

| Module | Integration |
|--------|-----------|
| **Marketplace** | Couriers see available orders in Marketplace |
| **BazChat** | Pickup/delivery coordination via chat |
| **Wallet** | Earnings go directly to Wallet |
| **Social Feed** | Courier can share achievements |
| **DAO** | Courier can vote on proposals (e.g.: change shipping fee) |

---

## 8. P2P (Peer-to-Peer Exchange)

### 8.1 Description

**P2P Exchange** is the module for **buying and selling BZR for fiat currency** (Real, Dollar, etc.) without centralized intermediaries.

**Features**:
- Create buy/sell orders (P2P order book)
- Automatic matching (best offers)
- Automatic escrow (BZR locked until fiat payment confirmation)
- Payment methods (PIX, Wire, PayPal, etc.)
- Trader reputation (P2PScore)
- Dispute resolution (jury, if necessary)

---

### 8.2 Connection with Proof of Commerce

**P2P uses the same Escrow and Attestations logic as PoC**:

```
Alice wants to sell 100 BZR for $500 (rate: 5 USD/BZR)
    ↓
Alice creates order:
  pallet_p2p::create_sell_order(
      alice_account,
      amount: 100 BZR,
      fiat_currency: USD,
      rate: 5,
      payment_methods: [Wire, PayPal],
      escrow: 100 BZR  // locked
  )
    ↓
Bob wants to buy BZR and sees Alice's order
    ↓
Bob accepts:
  pallet_p2p::accept_order(bob_account, order_id)
    ↓
System shows instructions:
  Bob, transfer $500 via Wire to:
  Alice's account: alice@bank.com
  Order: #0xP2P123
    ↓
Bob makes transfer and clicks [I Confirmed Payment]
    ↓
Alice receives notification:
  "Bob claims to have sent $500. Confirm receipt."
    ↓
Alice checks bank account, sees $500 arriving
    ↓
Alice clicks [I Confirm Receipt]
    ↓
System releases escrow:
  • Bob receives 100 BZR
  • Alice receives stake back + reputation +5
  • Event: P2PTradeCompleted
```

**If There's a Dispute**:
```
Alice doesn't confirm receipt (even having received $500)
    ↓
Bob waits 24h (timeout)
    ↓
Bob opens dispute:
  pallet_p2p::open_dispute(bob_account, order_id, evidence: "receipt.pdf")
    ↓
Jury analyzes:
  • Receipt shows transfer to Alice's account
  • Timestamp correct
  • Amount correct ($500)
    ↓
Ruling: Release to Bob
    ↓
Alice loses reputation (-50 pts) + possible slashing
```

---

### 8.3 P2P Order Book

**BZR Purchase Screen**:

```
┌────────────────────────────────────────┐
│         Buy BZR (P2P)                  │
├────────────────────────────────────────┤
│                                        │
│  I want to buy: [____] BZR             │
│  Paying in: [▼ USD (Dollar)]          │
│                                        │
│  📊 Best Offers                        │
│  ┌──────────────────────────────────┐ │
│  │ Seller        │Rate│Limit │Score│ │
│  ├──────────────────────────────────┤ │
│  │ @Alice        │5.0 │100BZR│890  │ │
│  │ Methods: Wire, PayPal            │ │
│  │ [Buy]                            │ │
│  ├──────────────────────────────────┤ │
│  │ @Carlos       │5.1 │500BZR│920  │ │
│  │ Methods: Wire                    │ │
│  │ [Buy]                            │ │
│  ├──────────────────────────────────┤ │
│  │ @Dana         │5.2 │50BZR │750  │ │
│  │ Methods: Wire, PayPal            │ │
│  │ [Buy]                            │ │
│  └──────────────────────────────────┘ │
│                                        │
│  Or create your own order:             │
│  [Create Buy Order]                    │
│                                        │
└────────────────────────────────────────┘
```

---

### 8.4 P2P Reputation

**P2PScore** is separate from SellerScore/CourierScore, but uses same logic:

```rust
struct P2PScore {
    trades_completed: u32,      // +10 per trade
    avg_confirmation_time: u64, // faster = more points
    disputes_opened_against: u32, // -50 per lost dispute
    volume_traded: Balance,     // +1 point per 1000 BZR traded
}
```

**High Score Benefits**:
- Higher limits (new traders have 100 BZR/day limit)
- Lower fees (DAO can give discount to high-volume traders)
- Featured in order book

---

### 8.5 Integration with Other Modules

| Module | Integration |
|--------|-----------|
| **Wallet** | BZR purchased via P2P goes directly to Wallet |
| **Marketplace** | User buys BZR via P2P and uses in Marketplace |
| **BazChat** | Chat to coordinate fiat payment |
| **DAO** | DAO defines parameters (P2P fees, timeouts) |

---

## 9. DAO (Governance)

### 9.1 Description

**DAO** (Decentralized Autonomous Organization) is the **community governance** module. BZR token holders decide the protocol's future.

**Features**:
- Propose changes (parameters, features, treasury)
- Vote on proposals (weight proportional to stake)
- View active/historical proposals
- Delegate votes (liquid democracy - Phase 2)
- Execute approved proposals (automatic via runtime)

---

### 9.2 Connection with Proof of Commerce

**DAO DOES NOT decide individual orders** (that would be centralization). DAO decides **general rules**:

**Proposal Examples**:

| Proposal | Description | On-Chain Parameter |
|----------|-----------|-------------------|
| "Reduce DAO fee from 2% to 1.5%" | Lower cost for sellers | `FeeConfig::dao_fee_percent` |
| "Increase delivery timeout from 7 to 10 days" | More flexibility for long deliveries | `OrderConfig::delivery_timeout` |
| "Add new category: NFTs" | Expand marketplace | `pallet_product::categories` |
| "Allocate 10,000 BZR from Treasury for marketing" | Protocol growth | `Treasury::spend()` |
| "Runtime upgrade (add ZK-PoD)" | New functionality | `System::set_code()` |

---

### 9.3 Proposal Flow

```
User has idea: "Let's reduce fee to attract more sellers"
    ↓
Creates proposal:
  pallet_dao::propose(
      proposer: user_account,
      title: "Reduce DAO fee to 1.5%",
      description: "Argumentation...",
      proposed_change: SetFeeConfig { dao_fee_percent: 150 },  // 1.5% in basis points
      deposit: 100 BZR  // stake to prevent spam
  )
    ↓
Proposal enters discussion period (7 days):
  • Community debates in Forum (off-chain)
  • Proposer can edit
    ↓
After 7 days, voting starts (duration: 14 days):
  pallet_dao::vote(
      voter: alice_account,
      proposal_id,
      vote: Aye,
      voting_power: 500 BZR  // Alice has 500 BZR staked
  )
    ↓
All token holders with stake vote (Aye/Nay)
    ↓
End of voting:
  Total Aye: 15,000 BZR
  Total Nay: 3,000 BZR
  Quorum: 10% of supply (reached)
  Supermajority: 2/3 (15k / 18k = 83% > 66% ✅)
    ↓
Proposal APPROVED
    ↓
Automatic execution (after 48h timelock):
  FeeConfig::dao_fee_percent = 150
    ↓
Notification to all:
  "✅ Proposal #42 executed! DAO fee is now 1.5%"
```

---

### 9.4 Proposal Types

| Type | Quorum | Supermajority | Timelock | Examples |
|------|--------|--------------|----------|----------|
| **Parametric** | 10% | 2/3 | 48h | Fees, timeouts, stakes |
| **Treasury** | 15% | 2/3 | 7 days | Treasury spending |
| **Upgrade** | 20% | 3/4 | 14 days | Runtime change (code) |
| **Emergency** | 5% | 3/4 | 0h | Pause protocol (catastrophe only) |

---

### 9.5 Delegation (Liquid Democracy - Phase 2)

**Problem**: Not all token holders have time/knowledge to vote.

**Solution**:
```rust
// Alice delegates her votes to Bob (economics expert)
pallet_dao::delegate(
    alice_account,
    delegate_to: bob_account,
    scope: Economics  // only economic proposals
);

// When there's an economic proposal:
// Bob's vote counts as 500 (Bob's stake) + 300 (delegated by Alice)

// Alice can remove delegation anytime
// Alice can vote directly (overrides delegation)
```

---

### 9.6 DAO Interface

**Proposals Screen**:

```
┌────────────────────────────────────────┐
│         Bazari DAO Governance          │
├────────────────────────────────────────┤
│                                        │
│  🗳️ Active Proposals                   │
│                                        │
│  #42: Reduce DAO fee to 1.5%           │
│    Status: 🟢 Voting (8 days left)     │
│    Aye: 15,000 BZR (83%)               │
│    Nay: 3,000 BZR (17%)                │
│    [Vote Yes] [Vote No] [Details]      │
│                                        │
│  #43: Add NFTs category                │
│    Status: 🟡 Discussion (3 days left) │
│    [View Discussion] [Comment]         │
│                                        │
│  ──────────────────────────────────    │
│                                        │
│  ✅ Recently Approved Proposals        │
│    #40: Increase delivery timeout      │
│    #38: Marketing budget 10k BZR       │
│                                        │
│  ❌ Rejected Proposals                 │
│    #41: Remove affiliate fee           │
│                                        │
│  [Create New Proposal]                 │
│                                        │
└────────────────────────────────────────┘
```

---

### 9.7 Integration with Other Modules

| Module | Integration |
|--------|-----------|
| **All** | DAO defines parameters affecting all modules |
| **Wallet** | Voting requires BZR stake (locked during voting) |
| **Social Feed** | Proposals can be shared/discussed on Feed |
| **BazChat** | Discussion chat per proposal |

---

## 10. Social Feed

### 10.1 Description

**Social Feed** is the **decentralized social network** module integrated into the Bazari ecosystem. Inspiration: Twitter/Instagram, but with identity tied to on-chain reputation.

**Features**:
- Post updates (text, photos, videos)
- Share products (links to Marketplace)
- Like/comment/repost
- Follow sellers/couriers/affiliates
- Algorithmic + chronological feed
- Hashtags (#crafts, #sustainableFashion)

---

### 10.2 Connection with Proof of Commerce

**Social Feed is the Organic Discovery Layer**:

```
Seller @ModaAutoral posts:
  "🎉 New product! Sustainable dress made with recycled fabric.
   Buy here: bazari.app/product/0xVest123
   #SustainableFashion #Bazari"
    ↓
Post includes:
  • Photo of dress
  • Link to product (deeplink to Marketplace)
  • SellerScore visible (850/1000) - trust badge
    ↓
Followers see in feed:
  • @Maria likes and shares
  • @João comments: "Beautiful! What's the delivery time?"
  • @Influencer reposted (has 50k followers)
    ↓
Link clicks go to Marketplace with @Influencer's affiliate_id
    ↓
If someone buys, @Influencer receives commission automatically
```

**Reputation Badges**:
```
@ModaAutoral ⭐ Gold Seller (SellerScore 850)
@Motoboy_JP 🚚 Diamond Courier (CourierScore 920)
@Influencer 🔗 Top Affiliate (AffiliateScore 780)
```

---

### 10.3 Feed Algorithm

**Transparent and Customizable**:

```rust
// User can choose:
enum FeedAlgorithm {
    Chronological,   // Most recent first
    Reputation,      // Posts from high-reputation accounts
    Engagement,      // Most likes/comments
    Personalized,    // Based on who you follow + interests
}

// Score for each post:
fn calculate_post_score(post: &Post, viewer: &AccountId) -> f64 {
    let author_rep = get_total_score(post.author) as f64 / 1000.0;
    let engagement = (post.likes + post.comments * 2 + post.reposts * 3) as f64;
    let recency = 1.0 / (1.0 + (now() - post.created_at) as f64 / HOUR);
    let follows_author = viewer.follows(post.author) as u8 as f64;

    author_rep * 0.3
        + engagement.ln() * 0.3
        + recency * 0.2
        + follows_author * 0.2
}
```

---

### 10.4 Community Moderation

**No Central Censorship, But With Spam Control**:

```
Post with spam/scam can be reported:
  10+ reports from accounts with score > 500
      ↓
  Post enters community review (similar to jury)
      ↓
  5 random moderators (VRF) analyze
      ↓
  If 3/5 agree it's spam:
      Post is "downranked" (not deleted, but invisible in main feed)
      Author loses -20 reputation points
```

---

### 10.5 Native Monetization

**Content Creators Can Earn BZR**:

**A) Embedded Affiliation**:
```
Every product link in Social Feed automatically becomes affiliate link
    ↓
If someone buys via your link:
  You receive commission (set by seller)
```

**B) Tips (Tipping)**:
```
User liked the post:
  [❤️ Like]  [💬 Comment]  [💰 Tip]
      ↓
  Modal: Send how many BZR? [____]
      ↓
  Direct transfer to author's wallet
```

**C) Sponsored Posts (Optional)**:
```
Seller can "boost" post:
  Pays 10 BZR to increase reach
      ↓
  DAO receives 10% fee
  90% goes to "Creators Fund" pool (distributed to top creators)
```

---

### 10.6 Integration with Other Modules

| Module | Integration |
|--------|-----------|
| **Marketplace** | Posts can link products directly |
| **My Stores** | Seller automatically posts new products |
| **Become a Courier** | Courier posts achievements ("100 deliveries! 🏆") |
| **DAO** | DAO proposals can be discussed on Feed |
| **Social Profile** | Posts appear on author's profile |

---

## 11. Social Profile

### 11.1 Description

**Social Profile** is the public page for each user, aggregating **on-chain reputation + social activity**.

**Features**:
- View reputations (SellerScore, CourierScore, BuyerScore)
- Activity history (sales, deliveries, purchases) - anonymized or public (user's choice)
- Social Feed posts
- Products for sale (if seller)
- Reviews received
- Badges/Achievements

---

### 11.2 Connection with Proof of Commerce

**Profile is the "On-Chain Identity Card"**:

```
Profile: @ModaAutoral (5SellerABC...)

┌────────────────────────────────────────┐
│         @ModaAutoral                   │
│  "Sustainable and artisan fashion"     │
├────────────────────────────────────────┤
│                                        │
│  📊 Reputations                        │
│    ⭐ Seller Score: 850/1000 (Gold)    │
│    🏆 342 completed sales              │
│    ⚡ Member since: Jan/2025           │
│                                        │
│  🎖️ Badges                             │
│    ✅ Verified by Cooperative X        │
│    🌱 Carbon Neutral (eco deliveries)  │
│    💎 Top 1% Sellers                   │
│                                        │
│  ⭐ Reviews (4.9/5)                    │
│    "Excellent product, fast delivery!" │
│    "Impeccable service"                │
│    [View all]                          │
│                                        │
│  🏪 Products for Sale (8)              │
│    [View Store]                        │
│                                        │
│  📰 Recent Posts                       │
│    [View all on Feed]                  │
│                                        │
│  📈 Public Statistics                  │
│    Average sale value: 87 BZR          │
│    Response rate: 95%                  │
│    Average shipping time: 1.2 days     │
│                                        │
└────────────────────────────────────────┘
```

---

### 11.3 Configurable Privacy

**User Controls What is Public**:

```rust
struct PrivacySettings {
    show_total_sales: bool,        // Show total sales volume?
    show_buyer_history: bool,      // Show purchase history? (default: private)
    show_location_region: bool,    // Show region (not address)?
    show_social_links: bool,       // Instagram, Twitter, etc.?
    allow_direct_messages: enum {  // Who can send DM?
        Everyone,
        FollowersOnly,
        RepScoreAbove(u32),        // Only accounts with score > X
        None,
    }
}
```

---

### 11.4 Identity Verification (Optional)

**DID/VC (Decentralized Identifiers / Verifiable Credentials)**:

```
Seller can have verifications:
  ✅ National ID verified by Authority X (VC issued)
  ✅ Physical address confirmed (courier visited)
  ✅ Cooperative member (badge issued by coop)

Buyer sees:
  @ModaAutoral ✅ (3 verifications)
      ↓
  Clicks to see details:
    • National ID verified by Brasil.ID (DID)
    • Address in São Paulo confirmed
    • Member of Artesanato MG Cooperative
```

**Benefits**:
- Increases trust (more sales)
- Allows access to premium features (e.g.: higher limits)
- But remains optional (preserves privacy for those wanting anonymity)

---

### 11.5 Integration with Other Modules

| Module | Integration |
|--------|-----------|
| **Marketplace** | Seller profile is linked on product page |
| **Social Feed** | User's posts appear on profile |
| **BazChat** | "Send Message" button opens chat |
| **My Stores** | Seller's products listed on profile |
| **Become a Courier** | CourierScore and delivery statistics visible |
| **DAO** | Voting history and created proposals |

---

## 12. Interconnection Diagram

### 12.1 Complete Ecosystem Map

```
┌─────────────────────────────────────────────────────────────────┐
│                     BAZARI ECOSYSTEM                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐     │
│  │ MARKETPLACE  │◄───┤   BAZCHAT    │───►│    WALLET    │     │
│  │              │    │              │    │              │     │
│  │ • Search     │    │ • P2P Chat   │    │ • Balances   │     │
│  │ • Products   │    │ • Co-sign    │    │ • Transactions│    │
│  │ • Checkout   │    │ • Notifs     │    │ • Stakes     │     │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘     │
│         │                   │                   │              │
│         │                   │                   │              │
│         ▼                   ▼                   ▼              │
│  ┌─────────────────────────────────────────────────┐          │
│  │          BAZARICHAIN (Substrate)                │          │
│  │  ┌───────────────────────────────────────────┐ │          │
│  │  │ Pallets: Order, Escrow, Attestation,     │ │          │
│  │  │ Fulfillment, Reputation, DAO, P2P        │ │          │
│  │  └───────────────────────────────────────────┘ │          │
│  └─────────────────────────────────────────────────┘          │
│         │                   │                   │              │
│         ▼                   ▼                   ▼              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐     │
│  │  MY STORES   │    │MY MARKETPLACE│    │BECOME COURIER│     │
│  │              │    │              │    │              │     │
│  │ • Products   │───►│ • Storefront │    │ • Matching   │     │
│  │ • Orders     │    │ • Custom DNS │    │ • Earnings   │     │
│  │ • Analytics  │    │ • Branding   │    │ • Score      │     │
│  └──────────────┘    └──────────────┘    └──────────────┘     │
│         │                                        │              │
│         │                                        │              │
│         ▼                                        ▼              │
│  ┌──────────────┐                        ┌──────────────┐     │
│  │ SOCIAL FEED  │◄──────────────────────►│SOCIAL PROFILE│     │
│  │              │                        │              │     │
│  │ • Posts      │                        │ • Reputation │     │
│  │ • Hashtags   │                        │ • Badges     │     │
│  │ • Affiliation│                        │ • History    │     │
│  └──────┬───────┘                        └──────┬───────┘     │
│         │                                        │              │
│         └────────────┬───────────────────────────┘              │
│                      ▼                                          │
│               ┌──────────────┐                                 │
│               │      DAO     │                                 │
│               │              │                                 │
│               │ • Proposals  │                                 │
│               │ • Voting     │                                 │
│               │ • Execution  │                                 │
│               └──────────────┘                                 │
│                      ▲                                          │
│                      │                                          │
│               ┌──────────────┐                                 │
│               │     P2P      │                                 │
│               │              │                                 │
│               │ • BZR↔Fiat   │                                 │
│               │ • Order Book │                                 │
│               │ • Escrow     │                                 │
│               └──────────────┘                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

UNDERLYING INFRASTRUCTURE:
├─ IPFS (media storage)
├─ libp2p (P2P messaging)
├─ Substrate (blockchain framework)
└─ PostgreSQL/MongoDB (off-chain indexing for fast search)
```

---

### 12.2 Complete Value Flow

```
USER BUYS BZR (P2P)
    ↓
SEARCHES PRODUCT (Marketplace)
    ↓
PURCHASES (Wallet creates Order + Escrow)
    ↓
SELLER ACCEPTS (My Stores)
    ↓
COURIER TAKES (Become a Courier)
    ↓
HANDOFF (BazChat: Seller + Courier)
    ↓
DELIVERY (BazChat: Courier + Buyer)
    ↓
FINALIZE (PoCEngine: Automatic split)
    ↓
REVIEW (Social Profile: Buyer reviews)
    ↓
SHARING (Social Feed: Buyer posts product photo)
    ↓
VIRALIZATION (Affiliates share)
    ↓
GOVERNANCE (DAO: Community adjusts fees)
    ↓
CYCLE RESTARTS WITH MORE USERS
```

---

## Conclusion

The Bazari ecosystem is **modular, interconnected and community-governed**. Each module:

- ✅ Serves a clear purpose
- ✅ Integrates naturally with others
- ✅ Queries the same on-chain state (BazariChain)
- ✅ Can evolve independently (via DAO)

**Next steps**: Understand the detailed technical architecture and implementation roadmap.

---

## Next Documents

- **[05-architecture.md](./05-architecture.md)**: Complete technical architecture, Substrate pallets, schemas
- **[06-roadmap.md](./06-roadmap.md)**: 3-phase roadmap and future evolution (ZK-PoD, BLS, AI)

---

**Bazari** — An ecosystem where each module strengthens the others, creating an unstoppable network effect.
