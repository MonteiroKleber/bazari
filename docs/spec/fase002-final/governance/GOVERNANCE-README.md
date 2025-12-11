# Bazari Governance - FASE 7 Overview

Complete on-chain governance system for the Bazari network, including democracy, treasury, council, technical committee, and multisig functionality.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Documentation](#documentation)
- [API Endpoints](#api-endpoints)
- [Frontend Routes](#frontend-routes)
- [Development](#development)

---

## Overview

FASE 7 implements a complete governance system for Bazari, allowing BZR token holders to:

- ✅ Propose and vote on network changes (Democracy)
- ✅ Request and manage treasury funds
- ✅ Participate in council elections and motions
- ✅ Create and manage multisig accounts
- ✅ Schedule automated execution of approved proposals

### Key Highlights

- **No Browser Extension Required**: Uses custom PIN + useKeyring authentication
- **Custodial Wallet Model**: User-friendly, mobile-optimized
- **Full TypeScript Coverage**: Type-safe frontend with strict types
- **Real-time Updates**: Event-driven backend for instant notifications
- **Multi-language Support**: pt/en/es translations included

---

## Features

### 🗳️ Democracy

- Public referendums for network decisions
- Conviction voting (0-6x multipliers)
- Proposal queuing and scheduling
- Automatic execution of passed proposals

### 💰 Treasury

- Network fund management
- Proposal-based funding requests
- Automatic spend periods
- Burn mechanism for unused funds

### 👥 Council

- Elected council members
- Fast-track important proposals
- Treasury approval authority
- Motion-based decision making

### 🔧 Technical Committee

- Technical oversight
- Emergency proposal fast-tracking
- Veto power for dangerous proposals
- Technical upgrades management

### 🔐 Multisig

- Multi-signature accounts (n-of-m)
- Threshold-based approvals
- Transaction queuing
- Collective fund management

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Frontend Layer                         │
│  React + TypeScript + shadcn/ui + i18n (pt/en/es)       │
│                                                           │
│  Pages:                                                   │
│  • GovernancePage         - Dashboard                     │
│  • ProposalsListPage      - All proposals with filters    │
│  • ProposalDetailPage     - Single proposal + voting      │
│  • TreasuryPage           - Treasury management           │
│  • CouncilPage            - Council & Tech Committee      │
│  • MultisigPage           - Multisig accounts             │
│  • CreateProposalPage     - Proposal creation             │
│                                                           │
│  Components:                                              │
│  • VoteModal              - PIN + useKeyring voting       │
│  • ProposalCard           - Reusable proposal card        │
│  • ConvictionSelector     - Democracy conviction picker   │
│  • CouncilMemberCard      - Council member display        │
│  • MultisigApprovalFlow   - Multisig approval workflow    │
│  • TreasuryStats          - Treasury statistics widget    │
└────────────────────┬──────────────────────────────────────┘
                     │ REST API (JSON)
┌────────────────────┴──────────────────────────────────────┐
│                    Backend Layer                          │
│  Node.js + Fastify + Polkadot.js                         │
│                                                           │
│  12 API Endpoints:                                        │
│  • /governance/stats                                      │
│  • /governance/democracy/*                                │
│  • /governance/treasury/*                                 │
│  • /governance/council/*                                  │
│  • /governance/tech-committee/*                           │
│  • /governance/multisig/*                                 │
│                                                           │
│  Event Listeners:                                         │
│  • democracy.Proposed                                     │
│  • democracy.Voted                                        │
│  • treasury.Proposed                                      │
│  • council.Proposed                                       │
│  • multisig.MultisigExecuted                              │
└────────────────────┬──────────────────────────────────────┘
                     │ RPC/WebSocket
┌────────────────────┴──────────────────────────────────────┐
│                    Runtime Layer                          │
│  Substrate Runtime (Rust)                                 │
│                                                           │
│  Governance Pallets:                                      │
│  • pallet-democracy        - Public referendums           │
│  • pallet-treasury         - Network funds                │
│  • pallet-collective       - Council (2 instances)        │
│  • pallet-scheduler        - Delayed execution            │
│  • pallet-preimage         - Proposal data storage        │
│  • pallet-multisig         - Multi-signature accounts     │
└──────────────────────────────────────────────────────────┘
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+
- Rust 1.70+ (for runtime)
- PostgreSQL 14+ (for backend)

### Installation

```bash
# Clone repository
git clone https://github.com/your-org/bazari.git
cd bazari

# Install dependencies
pnpm install

# Setup environment variables
cp .env.example .env
# Edit .env with your configuration

# Build runtime (if needed)
cd bazari-chain
cargo build --release

# Start backend API
cd ..
pnpm --filter @bazari/api start

# Start frontend
pnpm --filter @bazari/web dev
```

### Quick Start

1. **Access Governance**: Navigate to `/app/governance` in your browser
2. **View Proposals**: Browse active proposals and referendums
3. **Create Proposal**: Click "Create Proposal" and fill in the form
4. **Vote**: Click on any active proposal and cast your vote with conviction
5. **Treasury**: Request funds or view treasury statistics

---

## Documentation

### User Guides

- **[Governance User Guide](../../governance-user-guide.md)**: Complete guide for end users
  - What is on-chain governance
  - How to create proposals
  - How to vote (including conviction voting)
  - Treasury funding requests
  - Council participation
  - Multisig account management
  - FAQ

### Developer Guides

- **[Governance Developer Guide](../../governance-dev-guide.md)**: Technical documentation
  - Architecture overview
  - Runtime pallet configuration
  - Frontend integration patterns
  - Backend API implementation
  - Authentication flow (PIN + useKeyring)
  - Testing strategies
  - Troubleshooting
  - Runtime upgrades via governance

### Specifications

- **[FASE-07-PROMPT.md](./spec/FASE-07-PROMPT.md)**: Detailed implementation prompts
  - 10 sequential prompts covering all aspects
  - Runtime configuration
  - Backend API design
  - Frontend pages and components
  - Translations and documentation

---

## API Endpoints

### Statistics

```
GET /api/governance/stats
```

Returns governance statistics including treasury balance, active proposals, and council info.

### Democracy

```
GET  /api/governance/democracy/referendums
GET  /api/governance/democracy/proposals
GET  /api/governance/democracy/referendums/:id/votes
POST /api/governance/democracy/propose
POST /api/governance/democracy/vote
```

### Treasury

```
GET  /api/governance/treasury/proposals
GET  /api/governance/treasury/approvals
POST /api/governance/treasury/propose
```

### Council

```
GET  /api/governance/council/members
GET  /api/governance/council/proposals
POST /api/governance/council/propose
```

### Technical Committee

```
GET  /api/governance/tech-committee/members
GET  /api/governance/tech-committee/proposals
POST /api/governance/tech-committee/propose
```

### Multisig

```
GET  /api/governance/multisig/:address
POST /api/governance/multisig/approve
```

---

## Frontend Routes

All routes are protected by authentication and require an active session:

```
/app/governance                        - Dashboard
/app/governance/proposals              - List all proposals
/app/governance/proposals/new          - Create new proposal
/app/governance/proposals/:type/:id    - Proposal details
/app/governance/treasury               - Treasury page
/app/governance/council                - Council & Tech Committee
/app/governance/multisig               - Multisig management
```

---

## Development

### Project Structure

```
bazari/
├── apps/
│   └── web/
│       └── src/
│           ├── modules/
│           │   └── governance/
│           │       ├── api/            # API client
│           │       ├── types/          # TypeScript types
│           │       ├── pages/          # 7 pages
│           │       ├── components/     # 6 components
│           │       └── index.ts        # Public exports
│           └── i18n/
│               ├── pt.json             # Portuguese
│               ├── en.json             # English
│               └── es.json             # Spanish
├── bazari-chain/
│   └── runtime/
│       └── src/
│           ├── lib.rs                  # Runtime configuration
│           └── configs/
│               ├── democracy.rs
│               ├── treasury.rs
│               ├── council.rs
│               └── multisig.rs
└── docs/
    ├── governance-user-guide.md        # User documentation
    ├── governance-dev-guide.md         # Developer documentation
    └── fase002-final/
        └── governance/
            ├── GOVERNANCE-README.md    # This file
            └── spec/
                └── FASE-07-PROMPT.md   # Implementation spec
```

### Running Tests

```bash
# Frontend tests
pnpm --filter @bazari/web test

# Runtime tests
cd bazari-chain
cargo test -p pallet-democracy
cargo test -p pallet-treasury
cargo test -p pallet-multisig

# E2E tests
pnpm test:e2e
```

### Building for Production

```bash
# Build frontend
pnpm --filter @bazari/web build

# Build runtime
cd bazari-chain
cargo build --release

# Build backend
pnpm --filter @bazari/api build
```

---

## Implementation Summary

FASE 7 was implemented in 10 sequential prompts:

| Prompt | Component | Status | Duration |
|--------|-----------|--------|----------|
| 1 | Runtime Dependencies & Basic Config | ✅ | 12h |
| 2 | Scheduler & Preimage | ✅ | 16h |
| 3 | Treasury | ✅ | 20h |
| 4 | Multisig | ✅ | 18h |
| 5 | Collective (Council + Technical) | ✅ | 24h |
| 6 | Democracy | ✅ | 28h |
| 7 | Build & Deploy Testnet | ✅ | 8h |
| 8 | Backend API | ✅ | 48h |
| 9 | Frontend Pages | ✅ | 32h |
| 10 | Translations & Docs | ✅ | 8h |
| **Total** | | | **214h (~27 days)** |

---

## Key Achievements

### Runtime (Prompts 1-7)

- ✅ 6 governance pallets configured and tested
- ✅ Runtime compiles and runs on testnet
- ✅ All unit tests passing
- ✅ Genesis config with initial values

### Backend (Prompt 8)

- ✅ 12 REST API endpoints implemented
- ✅ Event listeners for real-time updates
- ✅ Signature verification (sr25519)
- ✅ PostgreSQL database schema

### Frontend (Prompt 9)

- ✅ 7 pages fully implemented
- ✅ 6 reusable components
- ✅ PIN + useKeyring integration (4-step flow)
- ✅ Mobile-responsive design
- ✅ Full TypeScript coverage

### Documentation (Prompt 10)

- ✅ User guide (comprehensive)
- ✅ Developer guide (technical)
- ✅ Translations (pt/en/es)
- ✅ This README

---

## Authentication Architecture

Bazari uses a **custom custodial wallet** approach instead of browser extensions:

### Why No Polkadot.js Extension?

1. **Mobile Support**: Browser extensions don't work on mobile
2. **User Experience**: Simpler onboarding for non-crypto users
3. **Security**: PIN-protected encrypted mnemonics
4. **Portability**: Cross-device account access

### 4-Step Signing Flow

```typescript
// 1. Get PIN (with validation)
const pin = await PinService.getPin({
  validate: async (pin) => {
    try {
      await decryptMnemonic(account.cipher, account.iv, account.salt, pin);
      return null; // Valid
    } catch {
      return 'Invalid PIN';
    }
  },
});

// 2. Decrypt mnemonic
const mnemonic = await decryptMnemonic(account.cipher, account.iv, account.salt, pin);

// 3. Sign transaction
const signature = await useKeyring.signMessage(mnemonic, txData);

// 4. Clean memory
mnemonicBytes.fill(0);

// Submit to backend
await submitTransaction({ signature, ... });
```

### Security Features

- **AES-256-GCM encryption** for mnemonic storage
- **PBKDF2** key derivation (150k iterations)
- **Memory cleanup** after signing
- **sr25519 signatures** verified on backend
- **PIN attempt limiting** to prevent brute force

---

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## Support

- **Documentation**: https://docs.bazari.com
- **Community Forum**: https://forum.bazari.com
- **Discord**: https://discord.gg/bazari
- **Email**: support@bazari.com

---

## License

This project is licensed under the MIT License - see the [LICENSE](../../../LICENSE) file for details.

---

## Acknowledgments

- **Substrate/Polkadot**: For the excellent blockchain framework
- **Parity Technologies**: For governance pallet implementations
- **Bazari Community**: For feedback and testing

---

**Last Updated**: 2025-01-XX
**Version**: 1.0.0
**FASE**: 7 (Governance)
