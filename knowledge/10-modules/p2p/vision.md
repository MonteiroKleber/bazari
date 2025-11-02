# P2P Exchange Module - Vision & Purpose

## 🎯 Vision
**"Criar marketplace P2P descentralizado para troca de BZR/ZARI ↔ BRL via PIX, com escrow on-chain, disputas arbitradas por DAO, e suporte a vendas por fases de ZARI token."**

## 📋 Purpose
1. **Fiat On/Off Ramp** - Usuários compram/vendem BZR com Real (BRL) via PIX
2. **P2P Matching** - Makers criam ofertas, Takers aceitam
3. **Escrow Protection** - Fundos bloqueados on-chain até confirmação de pagamento
4. **ZARI Phase Trading** - Suporte a vendas por fases (2A: 0.25 BZR, 2B: 0.35 BZR, 3: 0.50 BZR)
5. **Dispute Resolution** - Sistema de disputas com evidências e arbitragem
6. **Reputation System** - Reviews e completion rate para traders

## 🌟 Key Principles
- **Non-Custodial** - Plataforma não custodia fundos, apenas escrow on-chain
- **Trust by Design** - Escrow + reviews + dispute system
- **BRL ↔ Crypto** - Bridge entre sistema bancário brasileiro e blockchain
- **Phase-Based ZARI Sales** - Controlled token release em múltiplas fases
- **Permissionless** - Qualquer usuário pode criar ofertas
- **DAO Arbitration** - Disputas resolvidas por votação da comunidade

## 🏗️ Architecture
```
P2POffer (Maker) → P2POrder (Taker aceita)
                         ↓
                  Escrow on-chain
                         ↓
                  PIX payment (off-chain)
                         ↓
                  Proof upload
                         ↓
                  Maker confirms → Release escrow
                         ↓
                  P2PReview → Reputation++
```

## 📊 Order Status Flow
```
DRAFT → AWAITING_ESCROW → AWAITING_FIAT_PAYMENT → AWAITING_CONFIRMATION → RELEASED
   ↓           ↓                    ↓                        ↓
CANCELLED   EXPIRED            DISPUTE_OPEN          DISPUTE_OPEN
                                     ↓
                        DISPUTE_RESOLVED_BUYER | DISPUTE_RESOLVED_SELLER
```

## 💱 Asset Types
1. **BZR** - Native token do Bazari
2. **ZARI** - Governance token com vendas por fases

### ZARI Phase System
```typescript
Phase 2A: 1 ZARI = 0.25 BZR (supply: 2.1M ZARI)
Phase 2B: 1 ZARI = 0.35 BZR (supply: 2.1M ZARI)
Phase 3:  1 ZARI = 0.50 BZR (supply: 2.1M ZARI)
```

## 🔐 Escrow Mechanics
1. Taker aceita oferta → Order criada (status: DRAFT)
2. Maker deposits crypto in escrow address (on-chain)
3. Status → AWAITING_FIAT_PAYMENT
4. Taker sends PIX (off-chain)
5. Taker uploads proof (screenshot, transaction ID)
6. Status → AWAITING_CONFIRMATION
7. Maker verifies payment
8. Maker releases escrow → crypto to Taker
9. Status → RELEASED

## 💬 Communication
- **P2PMessage** - In-order chat entre Maker e Taker
- Messages kinds: `text`, `proof_upload`, `escrow_detected`, `fiat_declared`, `release_request`
- Real-time via WebSocket (opcional)

## ⚖️ Dispute System
1. Taker ou Maker abre disputa
2. Status → DISPUTE_OPEN
3. Partes enviam evidências (proofs, messages)
4. DAO vota (future: on-chain voting)
5. Status → DISPUTE_RESOLVED_BUYER ou DISPUTE_RESOLVED_SELLER
6. Escrow liberado para vencedor

## ⭐ Reputation & Reviews
- **P2PReview** - Stars (1-5) + comment
- **Completion Rate** - % de orders RELEASED vs (RELEASED + CANCELLED + EXPIRED)
- **Volume (30d)** - Total BRL e BZR movimentado no último mês
- Displayed on offer listings for trust

## 📱 Payment Methods
- **PIX** (MVP) - Instant payment system from Brazilian Central Bank
- Future: TED, Bank Transfer, Binance Pay, etc.

## 🔮 Future Features
1. **Multi-Currency Fiat** - USD, EUR, ARS via other payment methods
2. **Escrow Automation** - Auto-release after timeout + no dispute
3. **On-Chain Dispute Voting** - Substrate pallet for arbitration
4. **P2P Lending** - Collateralized loans BZR/ZARI
5. **Reputation NFTs** - Badges for top traders
6. **API for Merchants** - Integrate P2P as payment gateway

**Status:** ✅ Implemented & Production-Ready (ZARI Phase 5 complete)
