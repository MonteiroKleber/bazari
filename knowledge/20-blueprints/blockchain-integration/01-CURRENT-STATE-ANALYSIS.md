# Current State Analysis - Bazari Blockchain Architecture

**Analista**: Especialista em Sistemas Descentralizados
**Data**: 2025-11-10
**Status**: ✅ Complete

---

## 🎯 RESUMO EXECUTIVO

### Estado Atual do Sistema

- **28% On-Chain** (ideal: 60%)
- **CRÍTICO**: BazChat Commerce é 100% MOCK (PostgreSQL com fake txHash)
- **CRÍTICO**: Marketplace Escrow/PaymentIntent não está on-chain
- **CRÍTICO**: Reputation updates são mutáveis (PostgreSQL, deveriam ser imutáveis on-chain)

### Gaps Identificados

1. ❌ **Commerce**: Orders, Sales, Commissions são MOCK
2. ❌ **Escrow**: PaymentIntent deveria usar on-chain escrow
3. ❌ **Reputation**: Updates em PostgreSQL ao invés de extrinsics imutáveis
4. ❌ **Rewards**: Cashback é número no banco, não token real
5. ❌ **Badges**: Achievement system totalmente off-chain

### Pallets Necessários

| Pallet | Status | Prioridade |
|--------|--------|------------|
| `bazari-identity` | ✅ EXISTS | - |
| `stores` | ✅ EXISTS | - |
| `universal-registry` | ✅ EXISTS | - |
| `bazari-commerce` | ❌ **MISSING** | **P1 - CRITICAL** |
| `bazari-escrow` | ❌ **MISSING** | **P1 - CRITICAL** |
| `bazari-rewards` | ❌ **MISSING** | **P1 - CRITICAL** |
| `bazari-moderation` | ❌ MISSING | P2 |
| `bazari-delivery` | ❌ MISSING | P3 |

---

## 📋 TABELA COMPLETA: OS 71 MODELOS

[Ver tabela completa com análise de cada modelo](https://github.com/bazari/bazari/blob/main/knowledge/20-blueprints/blockchain-integration/MODELS-TABLE.md)

### Resumo por Módulo

| Módulo | Total Modelos | On-Chain Hoje | Deveria Ser On-Chain | Gap |
|--------|---------------|---------------|----------------------|-----|
| Identity & Auth | 8 | 70% | 70% | ✅ OK |
| Marketplace | 11 | 20% | 60% | ❌ **CRITICAL** |
| Social Network | 14 | 0% | 15% | ⚠️ Minor |
| BazChat | 17 | 0% | 40% | ❌ **CRITICAL** |
| P2P Exchange | 8 | 40% | 60% | ⚠️ Partial |
| Delivery | 3 | 0% | 30% | ⚠️ Minor |
| Governance | 4 | 100% | 100% | ✅ OK |
| Gamification | 6 | 0% | 50% | ⚠️ Partial |
| **TOTAL** | **71** | **28%** | **60%** | **❌ Gap: 32%** |

---

## 🚨 PROBLEMAS CRÍTICOS IDENTIFICADOS

### 1. BazChat Commerce - 100% MOCK

**Localização**: `apps/api/src/chat/services/commission.ts`

```typescript
// commission.ts:414 - FAKE TRANSACTION HASH! ❌
private generateMockTxHash(): string {
  return '0x' + crypto.randomBytes(32).toString('hex');
}

// commission.ts:224 - Salva no PostgreSQL, não na chain! ❌
const txHash = this.generateMockTxHash();
const sale = await prisma.affiliateSale.create({
  data: { ...valores, txHash, status: 'split' }
});
```

**Impacto**:
- ❌ Transações não são verificáveis
- ❌ Receitas NFT são FAKE
- ❌ Split de comissão não é auditável
- ❌ Reputação baseada em dados mutáveis

**Solução**: [bazari-commerce pallet](../pallets/bazari-commerce/SPEC.md)

---

### 2. Marketplace Escrow - Não On-Chain

**Localização**: `apps/api/prisma/schema.prisma:399`

```prisma
model PaymentIntent {
  id           String @id
  orderId      String
  provider     String // 'blockchain' | 'stripe' | 'pix'
  status       String // pending, completed, failed
  amount       Decimal
  txHash       String? // ❌ Pode ser NULL ou FAKE
}
```

**Impacto**:
- ❌ Fundos não são protegidos por escrow real
- ❌ Sem garantia de release automático
- ❌ Disputas não têm suporte on-chain

**Solução**: [bazari-escrow pallet](../pallets/bazari-escrow/SPEC.md)

---

### 3. Reputation - Mutável no PostgreSQL

**Localização**: `apps/api/src/chat/services/reputation.ts:46`

```typescript
// reputation.ts:46 - Atualiza PostgreSQL (mutável!) ❌
await prisma.profile.update({
  where: { id: update.profileId },
  data: {
    reputationScore: newReputation, // ❌ Pode ser alterado!
    reputationTier: reputationTier,
  },
});
```

**Impacto**:
- ❌ Reputação pode ser manipulada
- ❌ Histórico não é imutável
- ❌ Sem auditoria on-chain

**Solução**: Integrar com `pallet bazari-identity` existente

---

### 4. Rewards (Cashback) - Não são Tokens Reais

**Localização**: `apps/api/src/chat/services/rewards.ts:47-70`

```typescript
// rewards.ts:47-70 - Cashback é número no banco! ❌
async grantCashback(data: CashbackGrant): Promise<string> {
  const txHash = this.generateMockTxHash(); // ❌ FAKE

  const currentBalance = parseFloat(profile.cashbackBalance || '0');
  const newBalance = currentBalance + parseFloat(data.amount);

  await prisma.profile.update({
    data: { cashbackBalance: newBalance.toString() } // ❌ Não é token real
  });
}
```

**Impacto**:
- ❌ Cashback não pode ser transferido
- ❌ Não é verificável on-chain
- ❌ Sem integração com ZARI token

**Solução**: [bazari-rewards pallet](../pallets/bazari-rewards/SPEC.md)

---

## 📊 ANÁLISE POR PRIORIDADE

### PRIORIDADE 1 - BLOQUEANTE (4-6 semanas)

Requisitos para eliminar MOCK e garantir segurança:

1. **[bazari-commerce](../pallets/bazari-commerce/SPEC.md)** (2-3 semanas)
   - Orders on-chain
   - Sales com txHash real
   - Commission policies imutáveis

2. **[bazari-escrow](../pallets/bazari-escrow/SPEC.md)** (2 semanas)
   - Lock/Release/Refund on-chain
   - Auto-release timeout
   - Multi-asset support (BZR + ZARI)

3. **Reputation Integration** (1 semana)
   - Conectar services com `bazari-identity`
   - Sincronização read-only (chain → PostgreSQL)

4. **[bazari-rewards](../pallets/bazari-rewards/SPEC.md)** (2 semanas)
   - Mintar ZARI tokens reais
   - Missions on-chain
   - Vesting schedules

**Total P1**: 7-8 semanas, 2 devs

---

### PRIORIDADE 2 - IMPORTANTE (6-8 semanas)

Features para Proof of Commerce:

5. **[bazari-attestation](../pallets/bazari-attestation/SPEC.md)** (2-3 semanas)
   - Provas criptográficas
   - Quórum validation

6. **[bazari-fulfillment](../pallets/bazari-fulfillment/SPEC.md)** (1-2 semanas)
   - Courier registry + stake
   - Matching algorithm

7. **[bazari-affiliate](../pallets/bazari-affiliate/SPEC.md)** (1 semana)
   - DAG de comissões
   - Merkle proofs

8. **[bazari-fee](../pallets/bazari-fee/SPEC.md)** (3-5 dias)
   - Split automático

9. **[bazari-dispute](../pallets/bazari-dispute/SPEC.md)** (3-4 semanas)
   - VRF juror selection
   - Commit-reveal voting

**Total P2**: 8-10 semanas, 2 devs

---

### PRIORIDADE 3 - OPCIONAL (4-6 semanas)

Enhancements não-bloqueantes:

10. **[bazari-delivery](../pallets/bazari-delivery/SPEC.md)** (3 semanas)
11. **Badges NFTs** (2 semanas)
12. **Social on-chain** (4 semanas)
13. **Referral tracking** (2 semanas)

**Total P3**: 11 semanas, 1-2 devs

---

## 💰 ESTIMATIVA DE ESFORÇO TOTAL

| Prioridade | Pallets | Esforço | Devs | Dev-Weeks |
|-----------|---------|---------|------|-----------|
| P1 | Commerce + Escrow + Reputation + Rewards | 8 semanas | 2 devs | 16 dev-weeks |
| P2 | Attestation + Fulfillment + Affiliate + Fee + Dispute | 10 semanas | 2 devs | 20 dev-weeks |
| P3 | Delivery + Badges + Social + Referral | 11 semanas | 1-2 devs | 15 dev-weeks |
| **TOTAL** | **10 pallets** | **29 semanas** | **2-3 devs** | **51 dev-weeks** |

**Custo estimado**: $150k - $250k USD (assumindo $2k-4k/dev-week)

---

## 📈 MÉTRICAS DE SUCESSO

### Antes (Hoje)
- ❌ 28% on-chain
- ❌ BazChat commerce 100% MOCK
- ❌ Reputation mutável
- ❌ Cashback não é token real
- ❌ 0 auditable transactions

### Depois (6 meses)
- ✅ 60% on-chain
- ✅ Commerce com transações reais
- ✅ Reputation imutável on-chain
- ✅ ZARI tokens reais mintados
- ✅ Escrow seguro para pagamentos
- ✅ Receipt NFTs verificáveis
- ✅ 100% auditable transactions

---

## 🚀 PRÓXIMOS PASSOS

1. **Aprovar prioridades** com time de produto → [Implementation Roadmap](05-IMPLEMENTATION-ROADMAP.md)
2. **Alocar devs Rust** para P1 (2 devs, 8 semanas)
3. **Criar branch** `feat/on-chain-integration`
4. **Implementar pallets** seguindo ordem P1 → P2 → P3
5. **Testar em testnet** (Rococo/Westend)
6. **Deploy gradual** em produção com feature flags

---

## 📚 REFERÊNCIAS

- [Target Architecture](02-TARGET-ARCHITECTURE.md) - Arquitetura final
- [Unification Strategy](03-UNIFICATION-STRATEGY.md) - Unificação de sistemas
- [Proof of Commerce](04-PROOF-OF-COMMERCE.md) - Protocolo descentralizado
- [Pallets Index](../pallets/00-PALLETS-INDEX.md) - Especificações dos pallets
