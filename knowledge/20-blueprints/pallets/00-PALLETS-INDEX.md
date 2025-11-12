# Pallets Index

**Status**: 🎯 Active Development
**Last Updated**: 2025-11-11

---

## 📋 Overview

Este diretório contém as especificações de todos os pallets Substrate necessários para transformar Bazari em um sistema 60% on-chain.

---

## 🚨 Prioridade 1 - CRÍTICO (Semanas 1-8)

### 1. [bazari-commerce](bazari-commerce/)
**Status**: ⚠️ Not Implemented (MOCK em produção)
**Esforço**: 2-3 semanas
**Depende de**: `pallet-stores`, `pallet-balances`

**Problema**: BazChat commerce usa fake txHash
**Solução**: Orders + Sales + Commissions on-chain

**Arquivos**:
- [SPEC.md](bazari-commerce/SPEC.md) - Especificação completa
- [IMPLEMENTATION.md](bazari-commerce/IMPLEMENTATION.md) - Guia de implementação
- [INTEGRATION.md](bazari-commerce/INTEGRATION.md) - Integração backend

---

### 2. [bazari-escrow](bazari-escrow/)
**Status**: ⚠️ Partial (PaymentIntent não usa on-chain)
**Esforço**: 2 semanas
**Depende de**: `pallet-balances`, `pallet-assets`

**Problema**: Escrow MOCK ou NULL
**Solução**: Lock/Release/Refund on-chain

**Arquivos**:
- [SPEC.md](bazari-escrow/SPEC.md)
- [IMPLEMENTATION.md](bazari-escrow/IMPLEMENTATION.md)
- [INTEGRATION.md](bazari-escrow/INTEGRATION.md)

---

### 3. [bazari-rewards](bazari-rewards/)
**Status**: ⚠️ Not Implemented (Cashback é número no banco)
**Esforço**: 2 semanas
**Depende de**: `pallet-assets` (ZARI)

**Problema**: Cashback não é token real
**Solução**: Mintar ZARI tokens + Missions

**Arquivos**:
- [SPEC.md](bazari-rewards/SPEC.md)
- [IMPLEMENTATION.md](bazari-rewards/IMPLEMENTATION.md)
- [INTEGRATION.md](bazari-rewards/INTEGRATION.md)

---

## 🔧 Prioridade 2 - Proof of Commerce (Semanas 9-16)

### 4. [bazari-attestation](bazari-attestation/)
**Status**: 🆕 New (PoC específico)
**Esforço**: 2-3 semanas
**Depende de**: `bazari-commerce`

**Objetivo**: Ancorar provas criptográficas (HandoffProof, DeliveryProof)
**Features**: Co-assinaturas, quórum validation, IPFS CID

**Arquivos**:
- [SPEC.md](bazari-attestation/SPEC.md)
- [IMPLEMENTATION.md](bazari-attestation/IMPLEMENTATION.md)

---

### 5. [bazari-fulfillment](bazari-fulfillment/)
**Status**: 🆕 New (PoC específico)
**Esforço**: 1-2 semanas
**Depende de**: `bazari-identity`

**Objetivo**: Matching de couriers (stake + reputation)
**Features**: Courier registry, stake locking, slashing

**Arquivos**:
- [SPEC.md](bazari-fulfillment/SPEC.md)
- [IMPLEMENTATION.md](bazari-fulfillment/IMPLEMENTATION.md)

---

### 6. [bazari-affiliate](bazari-affiliate/)
**Status**: 🆕 New (PoC específico)
**Esforço**: 1 semana
**Depende de**: `bazari-commerce`

**Objetivo**: DAG de comissões (Merkle proofs)
**Features**: Campanhas, validação de caminhos, decay

**Arquivos**:
- [SPEC.md](bazari-affiliate/SPEC.md)
- [IMPLEMENTATION.md](bazari-affiliate/IMPLEMENTATION.md)

---

### 7. [bazari-fee](bazari-fee/)
**Status**: 🆕 New (PoC específico)
**Esforço**: 3-5 dias
**Depende de**: `bazari-commerce`

**Objetivo**: Split automático de pagamentos
**Features**: Configuração DAO, cálculo de split

**Arquivos**:
- [SPEC.md](bazari-fee/SPEC.md)
- [IMPLEMENTATION.md](bazari-fee/IMPLEMENTATION.md)

---

### 8. [bazari-dispute](bazari-dispute/)
**Status**: 🆕 New (PoC específico)
**Esforço**: 3-4 semanas
**Depende de**: `bazari-attestation`, `pallet-randomness` (VRF)

**Objetivo**: Disputas descentralizadas (jurors + stake)
**Features**: VRF juror selection, commit-reveal voting, ruling execution

**Arquivos**:
- [SPEC.md](bazari-dispute/SPEC.md)
- [IMPLEMENTATION.md](bazari-dispute/IMPLEMENTATION.md)

---

## 📦 Prioridade 3 - Enhancements (Semanas 17-24)

### 9. [bazari-delivery](bazari-delivery/)
**Status**: 🆕 New
**Esforço**: 3 semanas
**Depende de**: `bazari-fulfillment`

**Objetivo**: Tracking on-chain de entregas
**Features**: DeliveryRequest, proof upload, ratings

**Arquivos**:
- [SPEC.md](bazari-delivery/SPEC.md)
- [IMPLEMENTATION.md](bazari-delivery/IMPLEMENTATION.md)

---

## 📊 Resumo

| Pallet | Prioridade | Status | Esforço | Início |
|--------|-----------|--------|---------|--------|
| bazari-commerce | P1 | ⚠️ MOCK | 2-3 sem | Semana 1 |
| bazari-escrow | P1 | ⚠️ Partial | 2 sem | Semana 4 |
| bazari-rewards | P1 | ⚠️ MOCK | 2 sem | Semana 6 |
| bazari-attestation | P2 | 🆕 New | 2-3 sem | Semana 9 |
| bazari-fulfillment | P2 | 🆕 New | 1-2 sem | Semana 12 |
| bazari-affiliate | P2 | 🆕 New | 1 sem | Semana 14 |
| bazari-fee | P2 | 🆕 New | 3-5 dias | Semana 15 |
| bazari-dispute | P2 | 🆕 New | 3-4 sem | Semana 16 |
| bazari-delivery | P3 | 🆕 New | 3 sem | Semana 21 |

**Total**: 9 pallets, ~18-22 semanas de implementação

---

## 🎯 Relacionamentos

```
bazari-identity (EXISTS)
  └─ bazari-fulfillment (courier profiles)
  └─ bazari-rewards (reputation)

pallet-stores (EXISTS)
  └─ bazari-commerce (store_id FK)

bazari-commerce (NEW)
  ├─ bazari-escrow (order_id FK)
  ├─ bazari-attestation (order_id FK)
  ├─ bazari-affiliate (campaign_id FK)
  └─ bazari-fee (split calculation)

bazari-attestation (NEW)
  └─ bazari-dispute (evidence)

bazari-fulfillment (NEW)
  └─ bazari-delivery (courier assignment)
```

---

## 🚀 Quick Start

1. **Escolha um pallet**: Ver tabela de prioridades acima
2. **Leia SPEC.md**: Entender problema + solução
3. **Siga IMPLEMENTATION.md**: Passo a passo de implementação
4. **Integre com backend**: Seguir INTEGRATION.md

---

## 📚 Referências

- [Blockchain Integration Overview](../blockchain-integration/00-OVERVIEW.md)
- [Current State Analysis](../blockchain-integration/01-CURRENT-STATE-ANALYSIS.md)
- [Implementation Roadmap](../blockchain-integration/05-IMPLEMENTATION-ROADMAP.md)
