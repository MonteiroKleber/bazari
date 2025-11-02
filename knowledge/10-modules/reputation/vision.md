# Reputation Module - Vision & Purpose

## 🎯 Vision
**"Sistema de reputação on-chain transparente que rastreia comportamento de usuários através de eventos verificáveis, calculando score e tier dinâmicos que influenciam acesso a funcionalidades e confiança na plataforma."**

## 📋 Purpose
1. **Event Tracking** - ProfileReputationEvent registra ações positivas/negativas
2. **Score Calculation** - Pontuação acumulativa com limites diários por tipo de evento
3. **Tier System** - Níveis de reputação: bronze, prata, ouro, diamante
4. **On-Chain Sync** - Eventos sincronizados com blockchain via extrinsics
5. **Store Reputation** - Reputação de lojas (sales, positive, negative, volume) on-chain

## 🌟 Key Principles
- **Transparency** - Todos os eventos visíveis e auditáveis
- **Blockchain-First** - Eventos registrados on-chain (ProfileReputationEvent com blockNumber)
- **Progressive Trust** - Reputação aumenta com comportamento positivo consistente
- **Rate Limiting** - Limites diários evitam farming de pontos
- **Multi-Context** - Eventos de múltiplos emitters (marketplace, delivery, social, dao, p2p)

## 📊 Reputation Events
| Event Code         | Points | Daily Limit | Emitter      | Trigger                          |
|--------------------|--------|-------------|--------------|----------------------------------|
| ORDER_COMPLETED    | +3     | 50          | marketplace  | Order marked as RELEASED         |
| DELIVERY_DONE      | +2     | 100         | delivery     | Delivery completed successfully  |
| DISPUTE_RESOLVED   | +5     | 10          | marketplace  | Dispute resolved in favor        |
| DAO_VOTE_VALID     | +1     | 100         | dao          | Valid vote submitted             |
| P2P_ESCROW_OK      | +2     | 50          | p2p          | P2P trade completed successfully |
| SOCIAL_CONTRIB     | +1     | 40          | social       | High-quality post/comment        |
| SPAM_WARN          | -2     | 20          | social       | Content flagged as spam          |
| FRAUD_CONFIRMED    | -20    | 1           | arbitration  | Fraud proven by moderators       |

## 🏆 Tier System
```typescript
function calculateTier(score: number): string {
  if (score >= 1000) return 'diamante';  // 1000+ points
  if (score >= 500)  return 'ouro';      // 500-999 points
  if (score >= 100)  return 'prata';     // 100-499 points
  return 'bronze';                       // 0-99 points
}
```

## 🔄 Store Reputation (On-Chain)
Stores have separate on-chain reputation tracked by `stores` pallet:
- **sales**: Total completed orders
- **positive**: Positive reviews (estimated from ratingAvg)
- **negative**: Negative reviews (estimated from ratingAvg)
- **volumePlanck**: Total sales volume in BZR (planck units)

Synced via background worker (`reputation.worker.ts`) that:
1. Aggregates off-chain data (Order, SellerProfile)
2. Compares with on-chain state
3. Submits `bumpReputation` extrinsic if delta > 0

## 🔮 Future Features
- AI fraud detection
- Decay for inactive accounts
- Context-specific reputation (e.g., delivery vs sales vs social)
- Staking requirements for high-reputation actions
- NFT badges for milestone achievements

**Status:** ✅ Implemented (Hybrid: off-chain events + on-chain store reputation)
