# Reputation Module - Use Cases

## UC-01: Complete Order → Reputation Increase
1. Buyer confirms order delivery (Order status → RELEASED)
2. System creates ProfileReputationEvent:
   - `eventCode`: ORDER_COMPLETED
   - `delta`: +3
   - `emittedBy`: marketplace
   - `blockNumber`: current block from chain
3. Profile.reputationScore += 3
4. System recalculates tier: `calculateTier(newScore)`
5. If tier changed (e.g., bronze → prata), update Profile.reputationTier

**Result:** Seller reputation increases, may unlock higher tier benefits

## UC-02: Fraud Detected → Reputation Penalty
1. Moderator confirms fraud report
2. System creates ProfileReputationEvent:
   - `eventCode`: FRAUD_CONFIRMED
   - `delta`: -20
   - `emittedBy`: arbitration
3. Profile.reputationScore -= 20 (minimum 0)
4. Tier may downgrade (e.g., ouro → prata)
5. User notified of penalty via notification system

**Result:** Malicious users penalized, protecting platform integrity

## UC-03: View Reputation History
1. User visits profile page
2. Client requests `GET /api/profiles/:handle/reputation`
3. Server queries ProfileReputationEvent (ordered by createdAt desc)
4. Returns array of events with:
   - eventCode, delta, newTotal
   - reason, emittedBy
   - blockNumber, extrinsicId (on-chain proof)
   - createdAt (timestamp)

**Result:** User sees transparent audit trail of reputation changes

## UC-04: Leaderboard by Reputation
1. User visits leaderboards page
2. Client requests `GET /api/leaderboards/reputation?limit=100`
3. Server queries Profile ordered by reputationScore desc
4. Returns top profiles with:
   - handle, displayName, avatarUrl
   - reputationScore, reputationTier
   - rank (1, 2, 3...)

**Result:** Gamification encourages positive behavior, top users showcased

## UC-05: Store Reputation Sync (Background Worker)
1. Worker runs every 60s (configurable via STORE_REPUTATION_INTERVAL_MS)
2. Fetches all SellerProfile with onChainStoreId
3. For each store:
   - Aggregates off-chain stats (Order.count where status=RELEASED, sum(totalBzr))
   - Estimates feedback buckets from ratingAvg/ratingCount
   - Fetches current on-chain reputation via `stores.reputation(storeId)`
   - Calculates delta (off-chain - on-chain)
   - If delta > 0, submits `stores.bumpReputation(storeId, delta)` extrinsic
4. Worker logs result: { processed, updated, skipped, noops, errors }

**Result:** Store reputation kept in sync between PostgreSQL and blockchain

## UC-06: Rate Limiting Protection
1. User completes 5 orders in 1 day
2. System creates 5 ProfileReputationEvent (ORDER_COMPLETED)
3. User attempts to farm reputation by completing 100+ orders
4. System checks daily limit (ORDER_COMPLETED = 50/day)
5. After 50 events, additional ORDER_COMPLETED events ignored or queued for next day

**Result:** Prevents reputation farming, ensures organic growth

## UC-07: Multi-Context Reputation Display
1. User profile shows aggregated reputationScore
2. Detailed view breaks down by emitter:
   - marketplace: +120 points (40 orders completed)
   - delivery: +50 points (25 deliveries)
   - social: +30 points (30 quality posts)
   - dao: +15 points (15 valid votes)
3. User sees specialization (e.g., strong in marketplace, weak in social)

**Result:** Nuanced reputation profile, encourages diverse platform engagement

**Status:** ✅ Implemented (UC-06 and UC-07 partially implemented)
