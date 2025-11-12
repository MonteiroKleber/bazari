# Blockchain Integration - Overview

**Status**: 🎯 Active Development
**Last Updated**: 2025-11-11
**Owner**: Bazari Core Team

---

## 🎯 Objetivo

Transformar Bazari de **28% on-chain** para **60% on-chain**, implementando:

1. **Commerce real** (substituir MOCK)
2. **Escrow on-chain** (segurança de pagamentos)
3. **Proof of Commerce (PoC)** (protocolo descentralizado)
4. **Unificação de sistemas** (eliminar duplicação BazChat-Marketplace)

---

## 📚 Documentos

| # | Documento | Descrição | Status |
|---|-----------|-----------|--------|
| 1 | [Current State Analysis](01-CURRENT-STATE-ANALYSIS.md) | Análise dos 71 modelos (on-chain vs off-chain) | ✅ Complete |
| 2 | [Target Architecture](02-TARGET-ARCHITECTURE.md) | Arquitetura final (Blockchain → PostgreSQL → IPFS) | ✅ Complete |
| 3 | [Unification Strategy](03-UNIFICATION-STRATEGY.md) | Unificação BazChat-Marketplace (eliminar duplicação) | ✅ Complete |
| 4 | [Proof of Commerce](04-PROOF-OF-COMMERCE.md) | Protocolo descentralizado (co-assinaturas + escrow) | ✅ Complete |
| 5 | [Implementation Roadmap](05-IMPLEMENTATION-ROADMAP.md) | Roadmap unificado (3 fases, 24 semanas) | ✅ Complete |

---

## 🔧 Pallets

Ver [Pallets Index](../pallets/00-PALLETS-INDEX.md) para especificações detalhadas.

### Prioridade 1 - CRÍTICO (Semanas 1-8)
- [bazari-commerce](../pallets/bazari-commerce/) - Orders + Sales + Commissions
- [bazari-escrow](../pallets/bazari-escrow/) - Lock/Release/Refund on-chain
- [bazari-rewards](../pallets/bazari-rewards/) - ZARI tokens + Missions

### Prioridade 2 - PoC (Semanas 9-16)
- [bazari-attestation](../pallets/bazari-attestation/) - Provas criptográficas
- [bazari-fulfillment](../pallets/bazari-fulfillment/) - Matching de couriers
- [bazari-affiliate](../pallets/bazari-affiliate/) - DAG de comissões
- [bazari-fee](../pallets/bazari-fee/) - Split automático
- [bazari-dispute](../pallets/bazari-dispute/) - Jurors + VRF

### Prioridade 3 - Enhancements (Semanas 17-24)
- [bazari-delivery](../pallets/bazari-delivery/) - Tracking on-chain
- Badges, Moderation, Social on-chain

---

## 📊 Estado Atual vs Estado Final

### Antes (Hoje)
- ❌ **28% on-chain**
- ❌ BazChat commerce 100% MOCK (fake txHash)
- ❌ Reputation mutável (PostgreSQL)
- ❌ Cashback não é token real
- ❌ Duplicação Order/ChatProposal (~1800 linhas)

### Depois (6 meses)
- ✅ **60% on-chain**
- ✅ Commerce com transações reais
- ✅ Reputation imutável on-chain
- ✅ ZARI tokens reais mintados
- ✅ Escrow seguro para pagamentos
- ✅ Sistema unificado (33% menos código)

---

## ⏱️ Timeline

```
FASE 1 (Semanas 1-8): Foundation
├─ Unificação de schemas (Order/ChatProposal)
├─ bazari-commerce pallet
├─ bazari-escrow pallet
└─ bazari-rewards pallet

FASE 2 (Semanas 9-16): Proof of Commerce
├─ bazari-attestation (provas criptográficas)
├─ bazari-fulfillment (matching)
├─ bazari-affiliate (comissões)
└─ bazari-dispute (VRF + jurors)

FASE 3 (Semanas 17-24): Enhancements
├─ bazari-delivery
├─ Badges NFTs
└─ Social on-chain
```

---

## 💰 Investimento

| Fase | Esforço | Devs | Custo |
|------|---------|------|-------|
| FASE 1 | 8 semanas | 2 devs | $48k-80k |
| FASE 2 | 8 semanas | 2 devs | $48k-80k |
| FASE 3 | 8 semanas | 1-2 devs | $24k-40k |
| **TOTAL** | **24 semanas** | **2-3 devs** | **$120k-200k** |

---

## 🎯 Métricas de Sucesso

1. **Eliminar MOCK**: 0 fake txHash em produção
2. **Aumentar on-chain**: 28% → 60%
3. **Reduzir duplicação**: -33% código (~600 linhas)
4. **Aumentar segurança**: 100% escrow real
5. **Aumentar confiança**: Receipt NFTs verificáveis

---

## 🚀 Quick Start

1. **Entender estado atual**: Ler [Current State Analysis](01-CURRENT-STATE-ANALYSIS.md)
2. **Ver arquitetura final**: Ler [Target Architecture](02-TARGET-ARCHITECTURE.md)
3. **Escolher pallet**: Ver [Pallets Index](../pallets/00-PALLETS-INDEX.md)
4. **Implementar**: Seguir [Implementation Roadmap](05-IMPLEMENTATION-ROADMAP.md)

---

## 📞 Contato

- **Tech Lead**: Bazari Core Team
- **Docs**: `/knowledge/20-blueprints/blockchain-integration/`
- **Issues**: [GitHub Issues](https://github.com/bazari/bazari/issues)
