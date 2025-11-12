# Implementation Roadmap - Unificado

**Status**: 🎯 Active Planning
**Last Updated**: 2025-11-11
**Duration**: 24 semanas (6 meses)
**Team Size**: 2-3 devs Rust/Substrate

---

## 🎯 OBJETIVO GERAL

Transformar Bazari de **28% on-chain** para **60% on-chain** através de 3 fases:

1. **FASE 1**: Foundation (Semanas 1-8) - Unificação + Pallets Críticos
2. **FASE 2**: Proof of Commerce (Semanas 9-16) - Protocolo Descentralizado
3. **FASE 3**: Enhancements (Semanas 17-24) - Features Avançadas

---

## 📊 VISÃO GERAL DAS FASES

```
┌─────────────────────────────────────────────────────────────┐
│ FASE 1: FOUNDATION (8 semanas)                              │
│ ├─ Unificar Order/ChatProposal (eliminar duplicação)        │
│ ├─ bazari-commerce (orders + sales on-chain)                │
│ ├─ bazari-escrow (lock/release real)                        │
│ └─ bazari-rewards (ZARI tokens reais)                       │
├─────────────────────────────────────────────────────────────┤
│ FASE 2: PROOF OF COMMERCE (8 semanas)                       │
│ ├─ bazari-attestation (provas criptográficas)               │
│ ├─ bazari-fulfillment (matching de couriers)                │
│ ├─ bazari-affiliate (DAG de comissões)                      │
│ ├─ bazari-fee (split automático)                            │
│ └─ bazari-dispute (jurors + VRF)                            │
├─────────────────────────────────────────────────────────────┤
│ FASE 3: ENHANCEMENTS (8 semanas)                            │
│ ├─ bazari-delivery (tracking on-chain)                      │
│ ├─ Badges NFTs (gamification)                               │
│ ├─ Social on-chain (posts/reviews)                          │
│ └─ Referral tracking                                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 FASE 1: FOUNDATION (Semanas 1-8)

**Objetivo**: Eliminar MOCK e criar base sólida on-chain

### Sprint 1-2: Schema Unification (Semanas 1-2)

**Origem**: Documento 3 (Unificação BazChat-Marketplace)

**Tasks**:
- [ ] **S1.1**: Criar novos models Prisma
  - `Order` estendido (adicionar campos BazChat: source, threadId, isMultiStore)
  - `AffiliateSplit` (substituir AffiliateSale)
  - `OrderSource` enum (MARKETPLACE | BAZCHAT)
  - `OrderStatus` estendido
  ```prisma
  model Order {
    // ... campos existentes
    source          OrderSource @default(MARKETPLACE)
    threadId        String?
    isMultiStore    Boolean     @default(false)
    storeGroups     Json?
    affiliateSplits AffiliateSplit[]
  }
  ```

- [ ] **S1.2**: Escrever migration SQL
  - Script: `apps/api/prisma/migrations/YYYYMMDD_unify_orders.sql`
  - Migrar `ChatProposal` → `Order`
  - Migrar `AffiliateSale` → `AffiliateSplit`
  - Marcar txHash MOCK como NULL (para re-processamento)

- [ ] **S1.3**: Testar migration em testnet
  - Backup completo
  - Executar migration
  - Validar dados migrados (comparar counts)

**Deliverable**: Schema unificado + dados migrados

**Estimativa**: 2 semanas, 1 dev

---

### Sprint 3-4: UnifiedOrderService (Semanas 3-4)

**Origem**: Documento 3 (Unificação)

**Tasks**:
- [ ] **S3.1**: Implementar `UnifiedOrderService`
  - `createOrder(dto)` - unifica criação marketplace + BazChat
  - `checkout(orderId)` - unifica payment intent
  - `createAffiliateSplit(order, group)` - split por loja
  - `executeSplit(splitId)` - executa split on-chain (preparar para blockchain)

- [ ] **S3.2**: Atualizar rotas existentes
  - `POST /orders` aceita `source: 'MARKETPLACE' | 'BAZCHAT'`
  - `POST /chat/proposals` → alias para `/orders` (compatibilidade)
  - `POST /chat/checkout` → usa `UnifiedOrderService`

- [ ] **S3.3**: Atualizar frontend
  - Marketplace: usar novo schema
  - BazChat: usar novo schema
  - Manter compatibilidade com interface existente

- [ ] **S3.4**: Testes E2E
  - Criar order via marketplace
  - Criar order via BazChat
  - Checkout multi-loja
  - Validar dados em ambos os fluxos

**Deliverable**: Service unificado + APIs atualizadas + testes

**Estimativa**: 2 semanas, 1-2 devs

---

### Sprint 5-6: bazari-commerce Pallet (Semanas 5-6)

**Origem**: Documento 1 (Prioridade 1)

**Tasks**:
- [ ] **S5.1**: Criar pallet structure
  ```bash
  cd /root/bazari-chain
  cargo generate --git https://github.com/substrate-developer-hub/substrate-node-template pallets/bazari-commerce
  ```

- [ ] **S5.2**: Implementar Storage
  - `Orders<T>` - StorageMap de orders on-chain
  - `CommissionPolicies<T>` - Políticas por store
  - `Sales<T>` - Registro de vendas
  - Ver [spec completa](../pallets/bazari-commerce/SPEC.md)

- [ ] **S5.3**: Implementar Extrinsics
  - `create_order()` - Cria order on-chain
  - `complete_sale()` - Processa venda + split
  - `set_commission_policy()` - Configura política da store

- [ ] **S5.4**: Implementar Events
  - `OrderCreated`
  - `SaleCompleted`
  - `CommissionPolicySet`

- [ ] **S5.5**: Testes unitários
  - Coverage ≥80%
  - Mock de dependências (pallet-stores, pallet-balances)

- [ ] **S5.6**: Integrar com runtime
  - Adicionar em `runtime/src/lib.rs`
  - Configurar weights
  - Testar em testnet local

**Deliverable**: Pallet funcional + testes

**Estimativa**: 2-3 semanas, 1 dev Rust

---

### Sprint 7: bazari-escrow Pallet (Semana 7)

**Origem**: Documento 1 + Documento 2 (PoC)

**Tasks**:
- [ ] **S7.1**: Criar pallet structure

- [ ] **S7.2**: Implementar Storage
  - `Escrows<T>` - StorageMap de escrows
  - `EscrowData` struct (asset_type, amount, status)

- [ ] **S7.3**: Implementar Extrinsics
  - `lock_funds()` - Lock BZR ou ZARI
  - `release_funds()` - Release com split multi-recipient
  - `refund()` - Devolve para buyer
  - `auto_release_timeout()` - Release automático após timeout

- [ ] **S7.4**: Implementar multi-asset support
  - BZR (nativo via pallet-balances)
  - ZARI (via pallet-assets)

- [ ] **S7.5**: Testes unitários + integração

**Deliverable**: Pallet escrow funcional

**Estimativa**: 2 semanas, 1 dev Rust

---

### Sprint 8: Reputation + Rewards Integration (Semana 8)

**Origem**: Documento 1 (Prioridade 1)

**Tasks**:

#### Reputation (usar pallet existente)
- [ ] **S8.1**: Integrar com `bazari-identity`
  - Substituir `reputationService.updateReputationMock()`
  - Usar extrinsics: `incrementReputation()`, `decrementReputation()`
  - Sincronizar chain → PostgreSQL (read-only)

#### Rewards (criar novo pallet)
- [ ] **S8.2**: Implementar `bazari-rewards`
  - Storage: `Missions<T>`, `MissionCompletions<T>`
  - Extrinsics: `grant_cashback()`, `complete_mission()`
  - Integração com ZARI (pallet-assets)

- [ ] **S8.3**: Substituir MOCK no backend
  - `rewardsService.grantCashback()` → chamar pallet real
  - Mintar ZARI tokens reais
  - Sincronizar saldo (chain → PostgreSQL)

**Deliverable**: Reputation + Rewards 100% on-chain

**Estimativa**: 1-2 semanas, 1 dev Rust + 1 dev TypeScript

---

### 📊 FASE 1 - Resumo

| Sprint | Semanas | Foco | Devs | Deliverable |
|--------|---------|------|------|-------------|
| 1-2 | 1-2 | Schema Unification | 1 | Schema unificado + migration |
| 3-4 | 3-4 | UnifiedOrderService | 1-2 | Service + APIs atualizadas |
| 5-6 | 5-6 | bazari-commerce | 1 Rust | Pallet commerce funcional |
| 7 | 7 | bazari-escrow | 1 Rust | Pallet escrow funcional |
| 8 | 8 | Reputation + Rewards | 2 | 100% on-chain |

**Total FASE 1**: 8 semanas, 2-3 devs, **Elimina 100% dos MOCKs**

---

## 🔐 FASE 2: PROOF OF COMMERCE (Semanas 9-16)

**Objetivo**: Implementar protocolo descentralizado com provas criptográficas

**Origem**: Documento 2 (Visão Técnica PoC)

### Sprint 9-11: Core PoC Pallets (Semanas 9-11)

#### bazari-attestation (Semanas 9-10)
- [ ] **S9.1**: Implementar Storage
  - `Attestations<T>` - StorageDoubleMap (OrderId, Step)
  - `AttestationData` (payload_hash, signers, ipfs_cid)
  - Steps: `OrderCreated`, `HandoffSellerToCourier`, `DeliveredCourierToBuyer`

- [ ] **S9.2**: Implementar Extrinsics
  - `submit_attestation()` - Ancora hash de prova
  - `get_quorum_status()` - Valida quórum completo
  - Validação de signers por step

- [ ] **S9.3**: Integrar com backend
  - `AttestationService.submit()` - Upload IPFS + submit on-chain
  - `AttestationService.coSign()` - Co-assinatura multi-party
  - Modal de co-assinatura (frontend)

#### bazari-fulfillment (Semana 11)
- [ ] **S11.1**: Implementar Storage
  - `CourierProfiles<T>` - Registro de couriers
  - `CourierStakes<T>` - Stakes por courier

- [ ] **S11.2**: Implementar Extrinsics
  - `register_courier()` - Registra + lock stake
  - `lock_stake_for_order()` - Lock adicional para order
  - `slash_courier()` - Penalidade por fraude

- [ ] **S11.3**: Matching algorithm (backend)
  - `FulfillmentService.findAvailableCouriers()` - Geo + reputação
  - `FulfillmentService.lockStake()` - Calcula e lock stake

**Deliverable**: Attestation + Fulfillment funcionais

**Estimativa**: 3 semanas, 1-2 devs Rust + 1 dev TypeScript

---

### Sprint 12-13: Affiliate + Fee (Semanas 12-13)

#### bazari-affiliate (Semana 12)
- [ ] **S12.1**: Implementar Storage
  - `Campaigns<T>` - Campanhas de afiliados
  - Merkle root de caminhos permitidos

- [ ] **S12.2**: Implementar Extrinsics
  - `create_campaign()` - Cria campanha
  - `validate_path()` - Valida Merkle proof

#### bazari-fee (Semana 13)
- [ ] **S13.1**: Implementar Storage
  - `FeeConfig<T>` - Configuração de taxas (DAO-governed)

- [ ] **S13.2**: Implementar Extrinsics
  - `calculate_split()` - Calcula split automático
  - `update_fee_config()` - Atualiza via governance

**Deliverable**: Affiliate + Fee funcionais

**Estimativa**: 2 semanas, 1 dev Rust

---

### Sprint 14-16: Dispute + Testing (Semanas 14-16)

#### bazari-dispute (Semanas 14-15)
- [ ] **S14.1**: Implementar Storage
  - `Disputes<T>` - StorageMap de disputas
  - `JurorPool<T>` - Pool de jurors elegíveis
  - `Votes<T>` - Commit-reveal votes

- [ ] **S14.2**: Implementar VRF juror selection
  - Integrar `pallet-randomness` ou BABE VRF
  - Selecionar N jurors aleatórios

- [ ] **S14.3**: Implementar Extrinsics
  - `open_dispute()` - Abre disputa + upload evidence
  - `commit_vote()` - Juror vota (commit hash)
  - `reveal_vote()` - Juror revela voto
  - `execute_ruling()` - Executa decisão (release/refund/slashing)

- [ ] **S14.4**: Frontend para jurors
  - `JurorVoting.tsx` - Interface de votação
  - Exibir evidências (IPFS)
  - Commit-reveal workflow

#### Testing Rigoroso (Semana 16)
- [ ] **S16.1**: Testnet completa
  - Deploy todos os pallets em testnet (Rococo/Westend)
  - Criar 100+ orders sintéticos
  - Simular disputas (10+ casos)

- [ ] **S16.2**: Testes de stress
  - 50 orders simultâneos
  - 10 disputas simultâneas
  - Medir latência (≤2s por extrinsic)

- [ ] **S16.3**: Auditoria de segurança
  - Code review por 2+ devs seniors
  - Fuzz testing (100k+ tx aleatórios)
  - Verificar invariantes críticos

**Deliverable**: Sistema PoC completo + testado

**Estimativa**: 3 semanas, 2 devs Rust + 1 dev Frontend

---

### 📊 FASE 2 - Resumo

| Sprint | Semanas | Foco | Devs | Deliverable |
|--------|---------|------|------|-------------|
| 9-11 | 9-11 | Attestation + Fulfillment | 2 | Provas + Matching |
| 12-13 | 12-13 | Affiliate + Fee | 1 | Comissões + Split |
| 14-16 | 14-16 | Dispute + Testing | 2-3 | PoC completo + auditado |

**Total FASE 2**: 8 semanas, 2-3 devs, **Protocolo PoC funcional**

---

## 🌟 FASE 3: ENHANCEMENTS (Semanas 17-24)

**Objetivo**: Features avançadas não-bloqueantes

### Sprint 17-19: Delivery + Badges (Semanas 17-19)

#### bazari-delivery (Semanas 17-18)
- [ ] **S17.1**: Implementar Storage
  - `DeliveryRequests<T>` - Tracking on-chain
  - `DeliveryProofs<T>` - Provas de entrega (IPFS CID)

- [ ] **S17.2**: Implementar Extrinsics
  - `create_delivery_request()` - Cria request
  - `accept_delivery()` - Courier aceita
  - `complete_delivery()` - Submete proof

#### Badges NFTs (Semana 19)
- [ ] **S19.1**: Implementar `bazari-gamification`
  - Storage: `Badges<T>` - Badge definitions
  - Extrinsics: `mint_badge()` - Mintar badge NFT (via pallet-nfts)

**Deliverable**: Delivery tracking + Badges NFTs

**Estimativa**: 3 semanas, 1 dev Rust

---

### Sprint 20-22: Social On-Chain (Semanas 20-22)

- [ ] **S20.1**: Post hashes on-chain
  - Storage: `PostHashes<T>` - Hash/CID de posts
  - Censorship resistance

- [ ] **S21.1**: Review hashes on-chain
  - Storage: `ReviewHashes<T>` - Hash de reviews
  - Immutability

- [ ] **S22.1**: Content em IPFS/Arweave
  - Upload automático para IPFS
  - Backup em Arweave (permanente)

**Deliverable**: Social on-chain (posts + reviews)

**Estimativa**: 3 semanas, 1 dev Rust + 1 dev Frontend

---

### Sprint 23-24: Referral + Optimizations (Semanas 23-24)

#### Referral Tracking (Semana 23)
- [ ] **S23.1**: Implementar `pallet-referral`
  - Storage: `ReferralCodes<T>`, `ReferralRewards<T>`
  - Extrinsics: `create_referral_code()`, `claim_referral_reward()`

#### Optimizations (Semana 24)
- [ ] **S24.1**: Sharding de queues por região
- [ ] **S24.2**: Canais de pagamento (state channels)
- [ ] **S24.3**: Parachain migration study

**Deliverable**: Referral + Sistema otimizado

**Estimativa**: 2 semanas, 1-2 devs

---

### 📊 FASE 3 - Resumo

| Sprint | Semanas | Foco | Devs | Deliverable |
|--------|---------|------|------|-------------|
| 17-19 | 17-19 | Delivery + Badges | 1 | Tracking + NFTs |
| 20-22 | 20-22 | Social on-chain | 2 | Posts/Reviews |
| 23-24 | 23-24 | Referral + Optimizations | 1-2 | Sistema completo |

**Total FASE 3**: 8 semanas, 1-2 devs, **Sistema escalável**

---

## 💰 INVESTIMENTO TOTAL

| Fase | Duração | Devs | Dev-Weeks | Custo Estimado |
|------|---------|------|-----------|----------------|
| FASE 1 | 8 semanas | 2-3 devs | 20 dev-weeks | $60k-100k |
| FASE 2 | 8 semanas | 2-3 devs | 20 dev-weeks | $60k-100k |
| FASE 3 | 8 semanas | 1-2 devs | 12 dev-weeks | $36k-60k |
| **TOTAL** | **24 semanas** | **2-3 devs** | **52 dev-weeks** | **$156k-260k** |

**Assumindo**: $3k-5k/dev-week (Rust/Substrate seniors)

---

## 📈 MÉTRICAS DE SUCESSO

### Após FASE 1 (Semana 8)
- ✅ 0 fake txHash em produção
- ✅ 100% escrow real
- ✅ Sistema unificado (-33% código)
- ✅ Reputation imutável on-chain
- ✅ ZARI tokens reais

### Após FASE 2 (Semana 16)
- ✅ Provas criptográficas funcionais
- ✅ Disputas descentralizadas (VRF + jurors)
- ✅ 100 orders testados em testnet
- ✅ Auditoria de segurança aprovada

### Após FASE 3 (Semana 24)
- ✅ 60% on-chain (vs 28% inicial)
- ✅ Tracking de entregas on-chain
- ✅ Badges NFTs funcionais
- ✅ Sistema escalável (1000+ orders/dia)

---

## 🚨 RISCOS E MITIGAÇÕES

### Risco 1: Complexidade dos Pallets
**Probabilidade**: ALTA
**Impacto**: ALTO

**Mitigação**:
- Contratar 1 especialista Substrate (consultor)
- Code review semanal
- Testes rigorosos (≥80% coverage)

---

### Risco 2: Migration Failure
**Probabilidade**: MÉDIA
**Impacto**: CRÍTICO

**Mitigação**:
- Backup completo antes de migration
- Testar em testnet com dados reais
- Rollback script pronto
- Feature flags para rollout gradual

---

### Risco 3: Performance Degradation
**Probabilidade**: BAIXA
**Impacto**: MÉDIO

**Mitigação**:
- Load testing antes de cada fase
- Índices otimizados (PostgreSQL)
- Cache de queries frequentes
- Monitoramento 24/7

---

## 🎯 CONCLUSÃO

Este roadmap unifica os 3 documentos originais em um plano executável de **24 semanas**:

✅ **FASE 1** elimina 100% dos MOCKs e cria base sólida
✅ **FASE 2** implementa protocolo PoC completo
✅ **FASE 3** adiciona features avançadas

**Resultado esperado**:
- Sistema 60% on-chain (vs 28% hoje)
- 0 fake txHash
- Protocolo descentralizado funcional
- Base para futuras features (ZK, BLS, IA)

**Investimento**: $156k-260k, 6 meses, 2-3 devs

---

## 📚 REFERÊNCIAS

- [Current State Analysis](01-CURRENT-STATE-ANALYSIS.md)
- [Target Architecture](02-TARGET-ARCHITECTURE.md)
- [Unification Strategy](03-UNIFICATION-STRATEGY.md)
- [Proof of Commerce](04-PROOF-OF-COMMERCE.md)
- [Pallets Index](../pallets/00-PALLETS-INDEX.md)
