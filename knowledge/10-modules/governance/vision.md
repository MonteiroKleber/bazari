# Governance Module - Vision & Purpose

## 🎯 Vision
**"Criar sistema de governança DAO on-chain com democracy, treasury, council e technical committee, permitindo participação direta de holders ZARI em decisões sobre protocolos, tesouraria e evolução da plataforma."**

## 📋 Purpose
1. **On-Chain Governance** - Todas as decisões registradas na blockchain
2. **Treasury Management** - Gestão descentralizada de fundos do tesouro
3. **Democracy Pallet** - Referendos públicos com voto proporcional ao stake
4. **Council** - Representantes eleitos para propostas rápidas
5. **Technical Committee** - Especialistas para emergências e upgrades
6. **Multisig Support** - Transações multi-assinatura para segurança

## 🌟 Key Principles
- **Transparency** - Todas as propostas e votos visíveis on-chain
- **Stake-Weighted Voting** - 1 ZARI = 1 voto (conviction voting)
- **Progressive Decentralization** - Transição gradual de controle para comunidade
- **Treasury Automation** - Spend proposals automáticos via referendos
- **Emergency Powers** - Technical Committee pode fast-track upgrades críticos

## 🏗️ Architecture (Substrate Pallets)
```
Democracy Pallet → Public Referendums
Treasury Pallet → Funding Proposals
Council Pallet → Representative Proposals
TechnicalCommittee Pallet → Emergency Actions
Multisig Pallet → Multi-Signature Wallets
```

## 📊 Governance Structure

### 1. Democracy (Public Referendums)
- **Anyone can propose** (requires deposit)
- **Token holders vote** (1 ZARI = 1 vote)
- **Conviction voting** - Lock tokens longer = more voting power
- **Voting periods** - Typically 7-28 days
- **Enactment delay** - Grace period before execution

### 2. Treasury
- **Funding source** - Transaction fees, slashing, inflation
- **Spend proposals** - Anyone can request funds
- **Council approval** - Council votes on proposals
- **Burn rate** - Unspent funds burned periodically

### 3. Council
- **Elected members** - Token holders elect representatives
- **Fast proposals** - Can bypass public referendums
- **Veto power** - Can cancel malicious referendums
- **Term limits** - Re-election required

### 4. Technical Committee
- **Appointed experts** - Selected by council
- **Emergency actions** - Fast-track critical updates
- **No veto** - Cannot stop council/democracy decisions
- **Runtime upgrades** - Approve code changes

## 🗳️ Voting Mechanics

### Conviction Voting
```
Conviction Level | Lock Period | Vote Multiplier
-----------------|-------------|----------------
None             | 0 days      | 0.1x
1x               | 7 days      | 1x
2x               | 14 days     | 2x
3x               | 28 days     | 3x
4x               | 56 days     | 4x
5x               | 112 days    | 5x
6x               | 224 days    | 6x
```

**Example:**
- Alice has 1000 ZARI
- Locks for 28 days (3x conviction)
- Her vote counts as 3000 ZARI

### Delegation
- Users can delegate voting power to trusted accounts
- Delegation is revocable anytime
- Delegates cannot move delegated tokens

## 💰 Treasury Proposals

### Proposal Workflow
```
1. Submit proposal (requires 5% deposit)
2. Council reviews
3. Council approves → Scheduled for payment
4. Enactment period → Funds released
5. If rejected → Deposit slashed
```

### Spend Limits
- Small spends: < 10,000 BZR (council only)
- Large spends: > 10,000 BZR (referendum required)

## 🏛️ Council Mechanics

### Election
- **Phragmén method** - Proportional representation
- **Continuous** - New elections every era
- **Seats** - 7-13 members (configurable)

### Powers
- Propose referendums
- Veto malicious proposals
- Control treasury spending (< threshold)
- Appoint technical committee

## 🔧 Technical Committee

### Responsibilities
- Fast-track runtime upgrades
- Emergency fixes
- Cancel malicious proposals
- Whitelist safe calls

### Restrictions
- Cannot force proposals through
- Decisions logged on-chain
- Accountable to council

## 🔐 Multisig Integration

### Use Cases
- Treasury management (multisig account)
- Council treasury
- Critical protocol parameters
- Emergency funds

### Configuration
- Minimum signatures (M-of-N)
- Timelock period
- Call weight limits

## 📈 Governance Roadmap

### Phase 1: Foundation (Current)
- ✅ Treasury operational
- ✅ Democracy pallet active
- ✅ Council elected
- ✅ Technical committee appointed

### Phase 2: Conviction Voting
- [ ] Implement conviction multipliers
- [ ] Delegation system
- [ ] Referendum cancellation

### Phase 3: OpenGov
- [ ] Multiple tracks (treasury, protocol, etc.)
- [ ] Different voting thresholds
- [ ] Parallel referendums

### Phase 4: Full Decentralization
- [ ] Remove sudo key
- [ ] Community-driven upgrades
- [ ] DAO-managed treasury

## 🔮 Future Features
1. **Governance Forum** - Off-chain discussion + on-chain voting
2. **Quadratic Voting** - Prevent whale dominance
3. **Futarchy** - Prediction markets for governance
4. **Sub-DAOs** - Specialized governance committees
5. **NFT Voting** - Reputation-based voting power

**Status:** ✅ Implemented & Production-Ready (Substrate Native)
