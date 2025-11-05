# Governance Module - API Reference

## Overview
The Governance module provides **read-only REST API** for querying on-chain governance data from Substrate pallets. All write operations (voting, proposing, etc.) are performed directly on-chain via wallet signers (Polkadot.js, SubWallet, etc.).

---

## Democracy Lifecycle: Proposals vs Referendums

**IMPORTANT**: Understanding the difference between Democracy Proposals and Democracy Referendums is crucial for proper API usage.

### 📋 Democracy Proposals (Public Props Queue)
- **Endpoint**: `GET /api/governance/democracy/proposals`
- **State**: Waiting in queue to become a referendum
- **Voting**: Not yet votable by public
- **Data**: Contains `[id, proposalHash, proposer]`
- **Status**: `PROPOSED`
- **Use Case**: Display proposals waiting to enter voting phase

### 🗳️ Democracy Referendums
- **Endpoint**: `GET /api/governance/democracy/referendums`
- **State**: Active voting or already finished
- **Voting**: Public can vote (if ongoing)
- **Data**: Contains voting tallies, threshold, end block
- **Status**: `STARTED` (ongoing) or `PASSED`/`NOT_PASSED` (finished)
- **Use Case**: Display active/past referendums with voting results

### Flow Diagram
```
1. Proposal Created (democracy.propose)
   ↓
2. Proposal in Public Props Queue (/democracy/proposals)
   ↓
3. Proposal becomes Referendum (/democracy/referendums)
   ↓
4. Public Voting Period (status: ongoing)
   ↓
5. Referendum Finishes (status: finished)
   ↓
6. Execution (if passed)
```

### Frontend Mapping
When building detail pages, use the correct endpoint:
- **URL**: `/app/governance/proposals/democracy/:id` → Use `getDemocracyProposals()`
- **URL**: `/app/governance/referendums/democracy/:id` → Use `getDemocracyReferendums()`

---

## 1. Get Treasury Proposals
**`GET /api/governance/treasury/proposals`** (Public)

```http
GET /api/governance/treasury/proposals
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "proposer": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
      "value": "1000000000000000000",
      "beneficiary": "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
      "bond": "50000000000000000"
    }
  ]
}
```

**Fields:**
- `id`: Proposal index
- `proposer`: SS58 address who submitted
- `value`: Amount requested in planck
- `beneficiary`: Who receives funds
- `bond`: 5% deposit in planck

---

## 2. Get Treasury Approvals
**`GET /api/governance/treasury/approvals`** (Public)

```http
GET /api/governance/treasury/approvals
```

**Response:**
```json
{
  "success": true,
  "data": [1, 3, 5]
}
```

Returns array of proposal IDs approved and awaiting payment.

---

## 3. Get Active Referendums
**`GET /api/governance/democracy/referendums`** (Public)

```http
GET /api/governance/democracy/referendums
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 0,
      "info": {
        "ongoing": {
          "proposalHash": "0xabc123...",
          "threshold": "SimpleMajority",
          "end": 150000,
          "delay": 28800,
          "tally": {
            "ayes": "5000000000000000000",
            "nays": "1000000000000000000",
            "turnout": "6000000000000000000"
          }
        }
      }
    }
  ]
}
```

**Info Types:**
- `ongoing`: Active referendum
- `finished`: Completed (approved or rejected)

---

## 4. Get Public Proposals (Democracy Queue)
**`GET /api/governance/democracy/proposals`** (Public)

```http
GET /api/governance/democracy/proposals
```

**Response:**
```json
{
  "success": true,
  "data": [
    [
      0,
      "0xabc123...",
      "5GrwvaEF..."
    ]
  ]
}
```

Returns array of `[proposalIndex, proposalHash, proposer]`.

---

## 5. Get Referendum Votes
**`GET /api/governance/democracy/referendums/:id/votes`** (Public)

```http
GET /api/governance/democracy/referendums/0/votes
```

**Response:**
```json
{
  "success": true,
  "referendumId": 0,
  "info": {
    "ongoing": {
      "proposalHash": "0xabc123...",
      "threshold": "SimpleMajority",
      "end": 150000,
      "tally": {
        "ayes": "5000000000000000000",
        "nays": "1000000000000000000",
        "turnout": "6000000000000000000"
      }
    }
  },
  "votes": [
    {
      "voter": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
      "voting": {
        "direct": {
          "votes": [
            [
              0,
              {
                "standard": {
                  "vote": "0x81",
                  "balance": "1000000000000000000"
                }
              }
            ]
          ]
        }
      }
    }
  ]
}
```

**Vote Decoding:**
- `vote`: Hex byte (0x80 = nay, 0x81 = aye, last 3 bits = conviction)
- `balance`: Amount voted with in planck

---

## 6. Get Council Members
**`GET /api/governance/council/members`** (Public)

```http
GET /api/governance/council/members
```

**Response:**
```json
{
  "success": true,
  "data": [
    "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
    "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
    "5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy"
  ]
}
```

---

## 7. Get Council Proposals
**`GET /api/governance/council/proposals`** (Public)

```http
GET /api/governance/council/proposals
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "hash": "0xdef456...",
      "proposal": {
        "callIndex": "0x0500",
        "args": {
          "value": "1000000000000000000",
          "beneficiary": "5FHneW..."
        }
      },
      "voting": {
        "threshold": 4,
        "ayes": ["5GrwvaEF...", "5FHneW..."],
        "nays": [],
        "end": 145000
      }
    }
  ]
}
```

---

## 8. Get Technical Committee Members
**`GET /api/governance/tech-committee/members`** (Public)

```http
GET /api/governance/tech-committee/members
```

**Response:**
```json
{
  "success": true,
  "data": [
    "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
    "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty"
  ]
}
```

---

## 9. Get Technical Committee Proposals
**`GET /api/governance/tech-committee/proposals`** (Public)

```http
GET /api/governance/tech-committee/proposals
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "hash": "0xabc789...",
      "proposal": {
        "callIndex": "0x0700",
        "args": {
          "code": "0x..."
        }
      },
      "voting": {
        "threshold": 3,
        "ayes": ["5GrwvaEF..."],
        "nays": [],
        "end": 146000
      }
    }
  ]
}
```

---

## 10. Get Multisig Transactions
**`GET /api/governance/multisig/:address`** (Public)

```http
GET /api/governance/multisig/5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY
```

**Response:**
```json
{
  "success": true,
  "address": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
  "data": [
    {
      "account": "5GrwvaEF...",
      "callHash": "0xabc123...",
      "multisig": {
        "when": {
          "height": 140000,
          "index": 5
        },
        "deposit": "1000000000",
        "depositor": "5FHneW...",
        "approvals": ["5FHneW...", "5DAAnrj..."]
      }
    }
  ]
}
```

---

## 11. Get Governance Statistics
**`GET /api/governance/stats`** (Public)

```http
GET /api/governance/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "treasury": {
      "proposalCount": 5,
      "balance": "10000000000000000000"
    },
    "democracy": {
      "referendumCount": 3,
      "activeReferendums": 1
    },
    "council": {
      "memberCount": 7
    },
    "techCommittee": {
      "memberCount": 3
    }
  }
}
```

**Fields:**
- `treasury.balance`: Available treasury funds in planck
- `activeReferendums`: Currently ongoing referendums

---

## On-Chain Extrinsics (Via Wallet)

### Submit Treasury Proposal
```typescript
import { ApiPromise } from '@polkadot/api';

const api = await ApiPromise.create();
// NOTE: Substrate v10+ usa spendLocal ao invés de proposeSpend
const tx = api.tx.treasury.spendLocal(
  '1000000000000000000', // 1000 BZR in planck
  '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty' // beneficiary
);

await tx.signAndSend(signer);

// Evento emitido: treasury.SpendApproved
```

### Vote on Referendum
```typescript
const tx = api.tx.democracy.vote(
  0, // referendum index
  {
    Standard: {
      vote: { aye: true, conviction: 'Locked3x' },
      balance: '1000000000000000000'
    }
  }
);

await tx.signAndSend(signer);
```

### Delegate Voting Power
```typescript
const tx = api.tx.democracy.delegate(
  '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty', // delegate
  'Locked3x', // conviction
  '5000000000000000000' // 5000 BZR
);

await tx.signAndSend(signer);
```

### Council Member Proposes
```typescript
const proposal = api.tx.treasury.approveProposal(1);
const tx = api.tx.council.propose(
  4, // threshold
  proposal,
  proposal.encodedLength
);

await tx.signAndSend(councilMember);
```

### Execute Multisig
```typescript
const call = api.tx.balances.transfer(recipient, amount);
const tx = api.tx.multisig.asMulti(
  2, // threshold
  [signer2, signer3], // other signatories
  null, // timepoint (first approval)
  call,
  maxWeight
);

await tx.signAndSend(signer1);
```

---

## Conviction Voting Formula

```typescript
function calculateVotingPower(
  balance: bigint,
  conviction: Conviction
): bigint {
  const multipliers = {
    None: 0.1,
    Locked1x: 1,
    Locked2x: 2,
    Locked3x: 3,
    Locked4x: 4,
    Locked5x: 5,
    Locked6x: 6,
  };

  return BigInt(
    Number(balance) * multipliers[conviction]
  );
}
```

**Example:**
- Balance: 1000 ZARI
- Conviction: Locked3x
- Voting Power: 3000 ZARI
- Lock Period: 28 days

---

## Vote Threshold Types

### SimpleMajority
```
Approval = ayes / (ayes + nays) > 0.5
```

### SuperMajorityApprove
```
Approval = ayes / sqrt(turnout) > 0.5
```

### SuperMajorityAgainst
```
Approval = nays / sqrt(turnout) < 0.5
```

---

## Error Handling

All endpoints return errors in this format:

```json
{
  "success": false,
  "error": "Referendum not found"
}
```

**Common Errors:**
- `404`: Referendum/proposal not found
- `500`: Substrate node connection error
- `503`: Chain sync in progress

---

## WebSocket Support (Future)

Real-time governance events:

```typescript
// Subscribe to new referendums
ws.on('governance.referendum.new', (event) => {
  console.log('New referendum:', event.referendumIndex);
});

// Subscribe to votes
ws.on('governance.vote', (event) => {
  console.log('New vote:', event.voter, event.referendumIndex);
});
```

**Status:** ✅ Implemented (Read-Only API, On-Chain Writes)
