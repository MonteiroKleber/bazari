# P2P Exchange Module - Use Cases

## UC-01: Create P2P Offer (Maker)
1. User wants to buy/sell BZR or ZARI for BRL
2. User navigates to `/app/p2p/create-offer`
3. User fills form:
   - Asset type: BZR or ZARI
   - Side: BUY_BZR or SELL_BZR
   - Price: R$/BZR or R$/ZARI
   - Min/Max BRL range
   - Payment method: PIX
   - PIX key
4. Client requests `POST /api/p2p/offers`
5. System creates P2POffer (status: ACTIVE)
6. Offer visible in marketplace

## UC-02: Browse P2P Offers (Public)
1. User navigates to `/app/p2p`
2. Client requests `GET /api/p2p/offers?assetType=BZR&side=SELL_BZR`
3. System returns offers with:
   - Price, min/max BRL
   - Owner profile (handle, avatar)
   - Owner reputation (stars, completion rate, volume)
4. User sees list of offers sorted by best price

## UC-03: Accept Offer and Create Order (Taker)
1. User clicks "Accept" on offer
2. User enters amount in BRL (within min/max)
3. Client calculates `amountAsset = amountBRL / priceBRLPerUnit`
4. Client requests `POST /api/p2p/orders`
5. System creates P2POrder (status: DRAFT)
6. System sends notification to Maker
7. Order page opens with chat and escrow instructions

## UC-04: Deposit Crypto to Escrow (Maker)
1. Maker sees order (status: AWAITING_ESCROW)
2. Maker copies escrow address from order page
3. Maker sends `amountAsset` to escrow address on-chain
4. Blockchain confirms transaction
5. Maker updates order: `POST /api/p2p/orders/:id/escrow`
6. System validates `escrowTxHash` on-chain
7. Status → AWAITING_FIAT_PAYMENT
8. Taker receives notification

## UC-05: Send PIX Payment (Taker)
1. Taker sees order (status: AWAITING_FIAT_PAYMENT)
2. Taker copies PIX key from order
3. Taker opens bank app and sends `amountBRL` via PIX
4. Taker takes screenshot of payment
5. Taker uploads proof: `POST /api/p2p/orders/:id/proof`
6. System stores proof URL
7. Status → AWAITING_CONFIRMATION
8. Maker receives notification

## UC-06: Confirm Payment and Release Escrow (Maker)
1. Maker sees order (status: AWAITING_CONFIRMATION)
2. Maker checks bank account for PIX receipt
3. Maker reviews proof uploaded by Taker
4. Maker confirms: `POST /api/p2p/orders/:id/release`
5. System creates release transaction on-chain
6. Escrow funds sent to Taker
7. Status → RELEASED
8. Both parties can now leave reviews

## UC-07: Leave Review After Trade
1. User sees completed order (status: RELEASED)
2. User clicks "Leave Review"
3. User rates counterparty (1-5 stars)
4. User writes optional comment
5. Client requests `POST /api/p2p/reviews`
6. System creates P2PReview
7. Review visible on user's P2P profile

## UC-08: Open Dispute
1. Taker sent PIX but Maker not responding (48h)
2. Taker clicks "Open Dispute"
3. Taker writes reason
4. Taker uploads additional evidence
5. Client requests `POST /api/p2p/disputes`
6. System creates P2PDispute
7. Status → DISPUTE_OPEN
8. Maker notified, can submit counter-evidence
9. DAO moderators review case

## UC-09: Resolve Dispute (DAO)
1. DAO moderator reviews dispute
2. Moderator reviews all evidence (proofs, messages, blockchain data)
3. Moderator votes: favor buyer or seller
4. Client requests `PUT /api/p2p/disputes/:id/resolve`
5. System updates dispute status
6. Escrow released to winner
7. Loser's reputation penalized

## UC-10: Send Message in Order Chat
1. User is on order page
2. User types message
3. Client requests `POST /api/p2p/orders/:id/messages`
4. System creates P2PMessage
5. Message appears in chat
6. Counterparty receives real-time notification (WebSocket)

## UC-11: Create ZARI Phase Offer (Phase 2A)
1. User wants to sell ZARI at Phase 2A price (0.25 BZR)
2. User navigates to `/app/p2p/create-offer`
3. User selects:
   - Asset: ZARI
   - Phase: 2A (auto-fills price: 0.25 BZR per ZARI)
   - Converts to BRL: priceBRLPerUnit = 0.25 * currentBZRPrice
4. Client requests `POST /api/p2p/offers`
5. System validates phase is active
6. System creates offer with phase = '2A'
7. Offer visible with "Phase 2A" badge

## UC-12: Transition ZARI Phase (Admin)
1. Phase 2A supply exhausted (2.1M ZARI sold)
2. Admin triggers phase transition
3. Client requests `POST /api/p2p/zari/phases/transition`
4. System:
   - Deactivates Phase 2A
   - Activates Phase 2B
   - Updates ZARIPhaseConfig
5. New offers use Phase 2B price (0.35 BZR)
6. Existing orders continue with original price

## UC-13: Cancel Order (Before Escrow)
1. Taker created order but changed mind
2. Order status: DRAFT or AWAITING_ESCROW
3. Taker clicks "Cancel Order"
4. Client requests `POST /api/p2p/orders/:id/cancel`
5. System updates status → CANCELLED
6. No escrow involved, no penalties

## UC-14: Order Expires (Timeout)
1. Order created 48h ago
2. Status still AWAITING_FIAT_PAYMENT or AWAITING_CONFIRMATION
3. Worker cron job runs
4. System updates status → EXPIRED
5. If escrow locked, refund to Maker
6. Both parties notified

## UC-15: View P2P Profile Statistics
1. User clicks on trader's handle
2. Client requests `GET /api/p2p/profile/:userId`
3. System returns:
   - Total trades completed
   - Completion rate %
   - Average rating (stars)
   - 30-day volume (BRL and BZR)
   - Reviews list
4. User sees reputation before accepting offer

**Status:** ✅ Implemented
