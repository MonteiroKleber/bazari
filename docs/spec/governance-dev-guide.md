# Governance Developer Guide

## Table of Contents

1. [Introduction](#introduction)
2. [Architecture Overview](#architecture-overview)
3. [Runtime Pallets](#runtime-pallets)
4. [Frontend Integration](#frontend-integration)
5. [Backend API](#backend-api)
6. [Authentication Flow](#authentication-flow)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)
9. [Runtime Upgrades](#runtime-upgrades)

---

## Introduction

This guide provides technical documentation for developers working with Bazari's governance system. It covers runtime architecture, API integration, testing, and common development workflows.

### Prerequisites

- Understanding of Substrate/Polkadot architecture
- Familiarity with React/TypeScript
- Knowledge of cryptographic signatures
- Basic understanding of blockchain governance

---

## Architecture Overview

Bazari's governance system consists of three layers:

```
┌─────────────────────────────────────────────┐
│          Frontend (React/TypeScript)         │
│  - Pages: Proposals, Treasury, Council, etc │
│  - Components: VoteModal, ProposalCard, etc │
│  - Auth: PIN + useKeyring (custodial)       │
└──────────────────┬──────────────────────────┘
                   │ HTTP/REST
┌──────────────────┴──────────────────────────┐
│         Backend API (Node.js/Fastify)        │
│  - REST endpoints for governance queries     │
│  - Event listeners for chain events          │
│  - Signature verification                    │
└──────────────────┬──────────────────────────┘
                   │ RPC/WebSocket
┌──────────────────┴──────────────────────────┐
│      Substrate Runtime (Rust)                │
│  - Pallets: Democracy, Treasury, Council,    │
│    Multisig, Scheduler, Preimage             │
└──────────────────────────────────────────────┘
```

### Key Design Decisions

1. **Custodial Wallet Model**: Users' mnemonics are encrypted with PIN (no browser extension needed)
2. **4-Step Signing Flow**: PIN → Decrypt → Sign → Submit
3. **Event-Driven Backend**: Listens to chain events for real-time updates
4. **Type-Safe Frontend**: Full TypeScript coverage with strict types

---

## Runtime Pallets

### Configured Pallets

The Bazari runtime includes the following governance pallets:

```rust
// In runtime/src/lib.rs
construct_runtime!(
    pub struct Runtime {
        // ... other pallets
        Democracy: pallet_democracy,
        Treasury: pallet_treasury,
        Council: pallet_collective::<Instance1>,
        TechnicalCommittee: pallet_collective::<Instance2>,
        Scheduler: pallet_scheduler,
        Preimage: pallet_preimage,
        Multisig: pallet_multisig,
    }
);
```

### Democracy Configuration

```rust
impl pallet_democracy::Config for Runtime {
    type RuntimeEvent = RuntimeEvent;
    type Currency = Balances;
    type EnactmentPeriod = EnactmentPeriod; // 7 days
    type LaunchPeriod = LaunchPeriod; // 7 days
    type VotingPeriod = VotingPeriod; // 7 days
    type MinimumDeposit = MinimumDeposit; // 100 BZR
    type FastTrackVotingPeriod = FastTrackVotingPeriod; // 3 hours
    type CooloffPeriod = CooloffPeriod; // 7 days
    type Slash = Treasury;
    type InstantAllowed = frame_support::traits::ConstBool<true>;
    type Scheduler = Scheduler;
    type MaxVotes = MaxVotes; // 100
    type PalletsOrigin = OriginCaller;
    type WeightInfo = pallet_democracy::weights::SubstrateWeight<Runtime>;
    type MaxProposals = MaxProposals; // 100
    type Preimages = Preimage;
    type MaxDeposits = ConstU32<100>;
    type MaxBlacklisted = ConstU32<100>;
    // ... other types
}
```

### Treasury Configuration

```rust
impl pallet_treasury::Config for Runtime {
    type RuntimeEvent = RuntimeEvent;
    type Currency = Balances;
    type ApproveOrigin = EnsureRootOrHalfCouncil;
    type RejectOrigin = EnsureRootOrHalfCouncil;
    type SpendPeriod = SpendPeriod; // 24 days
    type Burn = Burn; // 1% of unspent funds
    type BurnDestination = ();
    type SpendFunds = ();
    type WeightInfo = pallet_treasury::weights::SubstrateWeight<Runtime>;
    type MaxApprovals = ConstU32<100>;
    type SpendOrigin = frame_support::traits::NeverEnsureOrigin<Balance>;
    // ... other types
}
```

### Multisig Configuration

```rust
impl pallet_multisig::Config for Runtime {
    type RuntimeEvent = RuntimeEvent;
    type RuntimeCall = RuntimeCall;
    type Currency = Balances;
    type DepositBase = DepositBase; // 1 BZR
    type DepositFactor = DepositFactor; // 0.1 BZR per signatory
    type MaxSignatories = MaxSignatories; // 20
    type WeightInfo = pallet_multisig::weights::SubstrateWeight<Runtime>;
}
```

---

## Frontend Integration

### Module Structure

```
apps/web/src/modules/governance/
├── api/
│   └── index.ts              # API client (12 methods)
├── types/
│   └── index.ts              # TypeScript definitions
├── pages/
│   ├── GovernancePage.tsx    # Dashboard
│   ├── ProposalsListPage.tsx # All proposals
│   ├── ProposalDetailPage.tsx# Single proposal view
│   ├── TreasuryPage.tsx      # Treasury management
│   ├── CouncilPage.tsx       # Council/Tech committee
│   ├── MultisigPage.tsx      # Multisig accounts
│   └── CreateProposalPage.tsx# Proposal creation
├── components/
│   ├── ProposalCard.tsx      # Reusable card
│   ├── VoteModal.tsx         # Voting modal with PIN
│   ├── ConvictionSelector.tsx# Conviction dropdown
│   ├── CouncilMemberCard.tsx # Council member card
│   ├── MultisigApprovalFlow.tsx # Multisig approvals
│   └── TreasuryStats.tsx     # Treasury stats widget
└── index.ts                  # Public exports
```

### API Client

The governance API client provides 12 methods:

```typescript
// apps/web/src/modules/governance/api/index.ts
import { fetchJSON } from '@/lib/api';

export const governanceApi = {
  // Treasury (2 methods)
  getTreasuryProposals: () => fetchJSON('/governance/treasury/proposals'),
  getTreasuryApprovals: () => fetchJSON('/governance/treasury/approvals'),

  // Democracy (3 methods)
  getDemocracyReferendums: () => fetchJSON('/governance/democracy/referendums'),
  getDemocracyProposals: () => fetchJSON('/governance/democracy/proposals'),
  getReferendumVotes: (id: number) => fetchJSON(`/governance/democracy/referendums/${id}/votes`),

  // Council (2 methods)
  getCouncilMembers: () => fetchJSON('/governance/council/members'),
  getCouncilProposals: () => fetchJSON('/governance/council/proposals'),

  // Tech Committee (2 methods)
  getTechCommitteeMembers: () => fetchJSON('/governance/tech-committee/members'),
  getTechCommitteeProposals: () => fetchJSON('/governance/tech-committee/proposals'),

  // Multisig (1 method)
  getMultisigAccount: (address: string) => fetchJSON(`/governance/multisig/${address}`),

  // Stats (1 method)
  getGovernanceStats: () => fetchJSON('/governance/stats'),
};
```

### Type Definitions

```typescript
// apps/web/src/modules/governance/types/index.ts
export type ProposalType = 'DEMOCRACY' | 'TREASURY' | 'COUNCIL' | 'TECHNICAL';
export type ProposalStatus =
  | 'PROPOSED'
  | 'TABLED'
  | 'STARTED'
  | 'PASSED'
  | 'NOT_PASSED'
  | 'CANCELLED'
  | 'EXECUTED';
export type Conviction = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface GovernanceProposal {
  id: number;
  type: ProposalType;
  proposer: string;
  title?: string;
  description?: string;
  status: ProposalStatus;
  deposit?: string;
  value?: string;
  beneficiary?: string;
  preimageHash?: string;
  votingStartBlock?: number;
  votingEndBlock?: number;
  ayeVotes?: string;
  nayVotes?: string;
  turnout?: string;
  createdAt: string;
}

export interface GovernanceStats {
  treasury: {
    balance: string;
    proposalCount: number;
    approvedCount: number;
    spendPeriod: number;
    nextBurn: string;
  };
  democracy: {
    referendumCount: number;
    activeReferendums: number;
    proposalCount: number;
  };
  council: {
    memberCount: number;
    proposalCount: number;
  };
  techCommittee: {
    memberCount: number;
    proposalCount: number;
  };
}
```

---

## Backend API

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/governance/stats` | Get governance statistics |
| GET | `/api/governance/democracy/referendums` | List all referendums |
| GET | `/api/governance/democracy/proposals` | List democracy proposals |
| GET | `/api/governance/democracy/referendums/:id/votes` | Get votes for referendum |
| POST | `/api/governance/democracy/propose` | Create democracy proposal |
| POST | `/api/governance/democracy/vote` | Vote on referendum |
| GET | `/api/governance/treasury/proposals` | List treasury proposals |
| GET | `/api/governance/treasury/approvals` | List approved treasuryproposals |
| POST | `/api/governance/treasury/propose` | Create treasury proposal |
| GET | `/api/governance/council/members` | List council members |
| GET | `/api/governance/council/proposals` | List council proposals |
| POST | `/api/governance/council/propose` | Create council proposal |
| GET | `/api/governance/tech-committee/members` | List tech committee members |
| GET | `/api/governance/tech-committee/proposals` | List tech proposals |
| POST | `/api/governance/tech-committee/propose` | Create tech proposal |
| GET | `/api/governance/multisig/:address` | Get multisig account info |
| POST | `/api/governance/multisig/approve` | Approve multisig transaction |

### Event Listeners

The backend listens to chain events for real-time updates:

```typescript
// Example event listener structure
api.query.system.events((events) => {
  events.forEach((record) => {
    const { event } = record;

    if (api.events.democracy.Proposed.is(event)) {
      const [proposalIndex, deposit] = event.data;
      // Update database with new proposal
    }

    if (api.events.democracy.Voted.is(event)) {
      const [voter, refIndex, vote] = event.data;
      // Update vote records
    }

    if (api.events.treasury.Proposed.is(event)) {
      const [proposalIndex] = event.data;
      // Update treasury proposal records
    }
  });
});
```

---

## Authentication Flow

Bazari uses a custom PIN + useKeyring architecture (NO Polkadot.js extension):

### 4-Step Signing Flow

```typescript
// Example from VoteModal.tsx
const handleVote = async () => {
  // Step 1: Get PIN with validation
  const pin = await PinService.getPin({
    title: 'Confirm Vote',
    description: `Voting ${voteDirection} on proposal #${proposal.id}`,
    transaction: {
      type: 'governance_vote',
      proposal: `${proposal.type} #${proposal.id}`,
      direction: voteDirection,
      amount: `${amount} BZR`,
      conviction: conviction.toString(),
    },
    validate: async (candidatePin: string) => {
      try {
        await decryptMnemonic(
          account.cipher,
          account.iv,
          account.salt,
          candidatePin,
          account.iterations
        );
        return null; // ✅ Valid PIN
      } catch {
        return 'Invalid PIN'; // ❌ Try again
      }
    },
  });

  // Step 2: Decrypt mnemonic with validated PIN
  const mnemonic = await decryptMnemonic(
    account.cipher,
    account.iv,
    account.salt,
    pin,
    account.iterations
  );

  // Step 3: Prepare and sign transaction
  const txData = JSON.stringify({
    type: 'democracy.vote',
    referendumId: proposal.id,
    vote: {
      Standard: {
        vote: { aye: voteDirection === 'AYE', conviction },
        balance: amount,
      },
    },
    timestamp: new Date().toISOString(),
  });

  const signature = await signMessage(mnemonic, txData);

  // Step 4: Clean memory and submit
  const mnemonicArray = new TextEncoder().encode(mnemonic);
  mnemonicArray.fill(0); // Zero out mnemonic in memory

  // Submit to backend
  const response = await fetch('/api/governance/democracy/vote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      referendumId: proposal.id,
      vote: { aye: voteDirection === 'AYE', conviction },
      balance: amount,
      signature,
      address: account.address,
    }),
  });
};
```

### Security Considerations

1. **PIN Validation**: PIN is validated by attempting decryption (no separate PIN storage)
2. **Memory Cleanup**: Mnemonic is zeroed out immediately after use
3. **Encryption**: AES-256-GCM with PBKDF2 (150k iterations)
4. **Signature Verification**: Backend verifies sr25519 signatures before submitting

---

## Testing

### Unit Tests

```bash
# Test runtime pallets
cd bazari-chain
cargo test -p pallet-democracy
cargo test -p pallet-treasury
cargo test -p pallet-multisig

# Test frontend components
cd apps/web
pnpm test -- governance
```

### Integration Tests

```typescript
// Example integration test
describe('Governance Flow', () => {
  it('should create and vote on proposal', async () => {
    // 1. Create proposal
    const proposal = await governanceApi.createProposal({
      type: 'DEMOCRACY',
      title: 'Test Proposal',
      description: 'Test Description',
    });

    // 2. Vote on proposal
    const vote = await governanceApi.vote({
      proposalId: proposal.id,
      direction: 'AYE',
      amount: '100',
      conviction: 1,
    });

    // 3. Verify vote recorded
    const votes = await governanceApi.getReferendumVotes(proposal.id);
    expect(votes).toContainEqual(expect.objectContaining({
      voter: testAccount.address,
      direction: 'AYE',
    }));
  });
});
```

### E2E Tests

```bash
# Run E2E tests with Playwright
pnpm test:e2e -- governance
```

---

## Troubleshooting

### Common Issues

#### 1. Transaction Fails with "Bad Origin"

**Cause**: Incorrect signature or unauthorized account

**Solution**:
```typescript
// Verify account has necessary permissions
const hasPermission = await api.query.democracy.votingOf(address);

// Check signature format
const isValidSignature = signature.startsWith('0x') && signature.length === 130;
```

#### 2. Proposal Not Appearing

**Cause**: Event listener not catching new proposals

**Solution**:
```bash
# Check backend logs
journalctl -u bazari-api -f | grep "democracy.Proposed"

# Manually trigger event sync
curl -X POST http://localhost:3000/api/governance/sync
```

#### 3. Vote Not Counted

**Cause**: Insufficient balance or already voted

**Solution**:
```typescript
// Check voter's free balance
const balance = await api.query.system.account(address);
console.log('Free balance:', balance.data.free.toString());

// Check if already voted
const vote = await api.query.democracy.votingOf(address);
console.log('Current votes:', vote.toHuman());
```

#### 4. PIN Decryption Fails

**Cause**: Incorrect PIN or corrupted encrypted data

**Solution**:
```typescript
// Verify encrypted data integrity
const hasRequiredFields = !!(
  account.cipher &&
  account.iv &&
  account.salt &&
  account.iterations
);

// Test with recovery phrase instead
if (!hasRequiredFields) {
  // Guide user to recovery flow
  navigate('/auth/recover-pin');
}
```

---

## Runtime Upgrades

### Performing a Runtime Upgrade via Governance

1. **Build New Runtime**:
```bash
cd bazari-chain
cargo build --release -p solochain-template-node-runtime
```

2. **Generate Runtime WASM**:
```bash
# WASM is generated in target/release/wbuild/
cp target/release/wbuild/solochain-template-node-runtime/solochain_template_node_runtime.compact.compressed.wasm runtime-upgrade.wasm
```

3. **Submit Preimage**:
```typescript
const preimage = api.tx.system.setCode(runtimeWasm);
const preimageHash = await api.rpc.state.getStorageHash(preimage.toHex());
await api.tx.preimage.notePreimage(preimage.toHex()).signAndSend(sudo);
```

4. **Create Democracy Proposal**:
```typescript
await api.tx.democracy.propose(
  preimageHash,
  minDeposit
).signAndSend(proposer);
```

5. **Vote and Execute**:
- Community votes on referendum
- If passed, runtime upgrade executes automatically
- Network upgrades without downtime

### Testing Runtime Upgrades

```bash
# Test on local network first
./target/release/solochain-template-node --dev

# Deploy to testnet
./target/release/solochain-template-node --chain=testnet

# Monitor upgrade
polkadot-js-api query.system.lastRuntimeUpgrade
```

---

## Additional Resources

- **Substrate Documentation**: https://docs.substrate.io
- **Polkadot Democracy**: https://wiki.polkadot.network/docs/learn-governance
- **Bazari Runtime Code**: `/root/bazari-chain/runtime/`
- **Frontend Source**: `/root/bazari/apps/web/src/modules/governance/`

---

**Last Updated**: 2025-01-XX
**Version**: 1.0.0
