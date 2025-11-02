# Chat Module - Use Cases

## UC-01: Start DM Conversation
1. User navigates to another user's profile
2. User clicks "Send Message"
3. Client requests `POST /api/chat/threads`
4. System creates ChatThread (kind: dm)
5. Thread opens for messaging

## UC-02: Send Encrypted Message
1. User types message
2. Client encrypts with recipient's public key (Curve25519)
3. Client sends `POST /api/chat/messages` with ciphertext
4. System stores encrypted message
5. Recipient decrypts with private key
6. Message displayed

## UC-03: Order Chat
1. Buyer creates order
2. System auto-creates ChatThread (kind: order)
3. Buyer and Seller can chat about order
4. Messages encrypted E2EE

## UC-04: Store Chat
1. User visits store page
2. User clicks "Contact Seller"
3. System creates/opens ChatThread (kind: store)
4. Buyer can ask questions before purchasing

## UC-05: Send In-Chat Checkout Proposal
1. Seller discusses products with buyer
2. Seller creates proposal: `POST /api/chat/proposals`
3. System generates ChatProposal with items, prices
4. Proposal appears as special message in chat
5. Buyer can accept → redirected to checkout

## UC-06: Join Community Group
1. User discovers public group
2. User clicks "Join Group"
3. Client requests `POST /api/chat/groups/:id/join`
4. System adds user to memberIds[]
5. User can send/receive group messages

## UC-07: Complete Mission for Rewards
1. User sees active missions
2. User performs task (share, review, referral)
3. System tracks progress in ChatMissionCompletion
4. When goal reached → mission completed
5. BZR reward sent to user's wallet

## UC-08: Earn Trust Badge
1. User completes X successful orders
2. System evaluates reputation
3. System issues ChatTrustBadge (bronze/silver/gold/platinum)
4. Badge displayed on profile
5. Higher trust = better trading opportunities

## UC-09: Report Malicious Message
1. User sees spam/scam message
2. User clicks "Report"
3. Client requests `POST /api/chat/reports`
4. System creates ChatReport
5. Community votes on report
6. If approved → user warned/suspended/banned

## UC-10: Vote on Report
1. User sees pending report
2. User reviews evidence
3. User votes: approve or reject
4. System records ChatReportVote
5. If majority approves → action taken

**Status:** ✅ Implemented
