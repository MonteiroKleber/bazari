# Implementation Prompts - Bazari Blockchain Integration

**Purpose**: Guias estruturados para implementação em fases dos pallets e integrações backend do Bazari.

**Last Updated**: 2025-11-12
**Total Prompts**: 17 (+ 3 templates)

---

## 📋 Overview

Estes prompts foram criados para guiar Claude Code na implementação completa da integração blockchain do Bazari, seguindo o roadmap de 24 semanas definido em [`05-IMPLEMENTATION-ROADMAP.md`](../../20-blueprints/blockchain-integration/05-IMPLEMENTATION-ROADMAP.md).

Cada prompt é **autocontido** e inclui:
- ✅ Contexto completo do que implementar
- ✅ Checklist de tarefas
- ✅ Anti-patterns a evitar
- ✅ Dependências de outros pallets
- ✅ Prompt pronto para copiar e colar no Claude Code

---

## 🗂️ Estrutura de Pastas

```
/knowledge/99-internal/implementation-prompts/
│
├── 00-README.md                          # Este arquivo
│
├── 01-foundation/                         # Semanas 1-8 (P1)
│   ├── 01-schema-unification.md          # Week 1: Unificar schema Prisma/Substrate
│   ├── 02-bazari-commerce.md             # Week 2-3: Orders + Sales + Commissions
│   ├── 03-bazari-escrow.md               # Week 4-5: Lock/Release/Refund
│   └── 04-bazari-rewards.md              # Week 6-7: Cashback tokens + Missions
│
├── 02-proof-of-commerce/                  # Semanas 9-16 (P2)
│   ├── 01-bazari-attestation.md          # Week 9-11: HandoffProof + DeliveryProof
│   ├── 02-bazari-fulfillment.md          # Week 12-13: Courier registry + staking
│   ├── 03-bazari-affiliate.md            # Week 14: DAG de comissões
│   ├── 04-bazari-fee.md                  # Week 15: Split automático
│   └── 05-bazari-dispute.md              # Week 16-19: Dispute resolution + VRF
│
├── 03-backend-integration/                # Semanas 17-24 (Backend)
│   ├── 01-blockchain-service.md          # Week 17: BlockchainService base
│   ├── 02-review-merkle-service.md       # Week 18: ReviewService + Merkle trees
│   ├── 03-gps-tracking-service.md        # Week 19: DeliveryTrackingService
│   ├── 04-workers-cron.md                # Week 20: Merkle update workers
│   └── 05-frontend-integration.md        # Week 21-24: React hooks + UI components
│
└── 99-templates/                          # Templates reutilizáveis
    ├── pallet-template.md                # Template base para novos pallets
    ├── backend-service-template.md       # Template para services NestJS
    └── testing-template.md               # Template de testes (unit + e2e)
```

---

## 🎯 Como Usar

### Para Implementação Completa (24 semanas)

**Semana 1-8 (Foundation)**:
```bash
# Copiar e colar cada prompt no Claude Code, em ordem:
1. 01-foundation/01-schema-unification.md
2. 01-foundation/02-bazari-commerce.md
3. 01-foundation/03-bazari-escrow.md
4. 01-foundation/04-bazari-rewards.md
```

**Semana 9-16 (Proof of Commerce)**:
```bash
5. 02-proof-of-commerce/01-bazari-attestation.md
6. 02-proof-of-commerce/02-bazari-fulfillment.md
7. 02-proof-of-commerce/03-bazari-affiliate.md
8. 02-proof-of-commerce/04-bazari-fee.md
9. 02-proof-of-commerce/05-bazari-dispute.md
```

**Semana 17-24 (Backend Integration)**:
```bash
10. 03-backend-integration/01-blockchain-service.md
11. 03-backend-integration/02-review-merkle-service.md
12. 03-backend-integration/03-gps-tracking-service.md
13. 03-backend-integration/04-workers-cron.md
14. 03-backend-integration/05-frontend-integration.md
```

---

### Para Implementação Parcial

**Apenas Commerce (P1 Crítico)**:
```bash
1. 01-foundation/01-schema-unification.md
2. 01-foundation/02-bazari-commerce.md
3. 01-foundation/03-bazari-escrow.md
```

**Apenas Proof of Commerce (P2)**:
```bash
# Requer P1 completo primeiro
5. 02-proof-of-commerce/01-bazari-attestation.md
6. 02-proof-of-commerce/02-bazari-fulfillment.md
```

---

## 📝 Formato Padrão dos Prompts

Todos os prompts seguem a mesma estrutura:

```markdown
# [Pallet Name] - Implementation Prompt

## 📋 Contexto
- Descrição do pallet
- Problema que resolve
- Dependências

## 🎯 Objetivo
O que será implementado nesta fase

## ✅ Checklist de Implementação
- [ ] Tarefa 1
- [ ] Tarefa 2
...

## 🚫 Anti-Patterns
Erros comuns a evitar

## 📦 Dependências
Pallets que devem existir antes

## 🔗 Referências
Links para SPECs e guias

## 🤖 Prompt para Claude Code
```
[Prompt pronto para copiar]
```
```

---

## 🔗 Dependências Entre Prompts

### P1 Foundation (Linear)
```
01-schema-unification (Week 1)
  └─ 02-bazari-commerce (Week 2-3)
      ├─ 03-bazari-escrow (Week 4-5)
      └─ 04-bazari-rewards (Week 6-7)
```

### P2 Proof of Commerce (Paralelo após P1)
```
01-bazari-attestation (Week 9-11)
  └─ 02-bazari-fulfillment (Week 12-13)
  └─ 05-bazari-dispute (Week 16-19) ← Requer attestation

03-bazari-affiliate (Week 14) ← Requer commerce
04-bazari-fee (Week 15) ← Requer commerce
```

### Backend Integration (Paralelo após P2)
```
01-blockchain-service (Week 17)
  ├─ 02-review-merkle-service (Week 18) ← Requer fulfillment
  ├─ 03-gps-tracking-service (Week 19) ← Requer fulfillment
  └─ 04-workers-cron (Week 20) ← Requer review-merkle-service

05-frontend-integration (Week 21-24) ← Requer todos os services
```

---

## 🧪 Testing Strategy

Cada prompt inclui:
1. **Unit Tests** (Rust `#[test]` para pallets)
2. **Integration Tests** (NestJS `describe()` para backend)
3. **E2E Tests** (Frontend + Backend + Blockchain)

**Ordem de Testes**:
```bash
# 1. Testar pallet isolado
cd /root/bazari-chain
cargo test -p pallet-bazari-commerce

# 2. Testar backend service
cd /root/bazari
pnpm --filter @bazari/api test src/services/commerce.service.spec.ts

# 3. Testar integração E2E
pnpm --filter @bazari/api test:e2e commerce.e2e-spec.ts
```

---

## 📊 Progress Tracking

Use esta checklist para acompanhar implementação:

### P1 - Foundation ✅
- [ ] Week 1: Schema Unification
- [ ] Week 2-3: bazari-commerce (Orders + Sales)
- [ ] Week 4-5: bazari-escrow (Lock/Release)
- [ ] Week 6-7: bazari-rewards (Cashback ZARI)

### P2 - Proof of Commerce ✅
- [ ] Week 9-11: bazari-attestation (HandoffProof + DeliveryProof)
- [ ] Week 12-13: bazari-fulfillment (Courier registry + Merkle root)
- [ ] Week 14: bazari-affiliate (DAG comissões)
- [ ] Week 15: bazari-fee (Split automático)
- [ ] Week 16-19: bazari-dispute (VRF + jury voting)

### Backend Integration ✅
- [ ] Week 17: BlockchainService base
- [ ] Week 18: ReviewService + Merkle trees
- [ ] Week 19: DeliveryTrackingService (GPS)
- [ ] Week 20: Workers (Merkle update cron)
- [ ] Week 21-24: Frontend integration (React hooks)

---

## 💡 Best Practices

### Para Claude Code
1. **Sempre ler SPECs antes**: Cada prompt referencia `SPEC.md` do pallet
2. **Seguir ordem de dependências**: Não pular etapas
3. **Rodar testes após cada implementação**: `cargo test` + `pnpm test`
4. **Validar integração**: Testar backend + blockchain juntos

### Para Desenvolvedores
1. **Revisar código gerado**: Claude Code é bom, mas não perfeito
2. **Ajustar weights**: Benchmarking deve ser feito manualmente
3. **Auditoria de segurança**: Especialmente para pallets críticos (escrow, dispute)
4. **Documentar desvios**: Se alterar SPECs, atualizar documentação

---

## 🚨 Troubleshooting

### Erro: "Pallet not found"
**Causa**: Pallet não foi adicionado ao `runtime/lib.rs`
**Solução**: Seguir Step 4 do prompt (Configure Runtime)

### Erro: "Type mismatch in Config"
**Causa**: Dependências entre pallets não configuradas
**Solução**: Verificar `impl pallet_bazari_X::Config for Runtime` no runtime

### Erro: "Weight overflow"
**Causa**: Weight estimado muito alto
**Solução**: Simplificar extrinsic ou rodar benchmarking real

### Erro: "Database migration failed"
**Causa**: Mudança no Prisma schema sem migração
**Solução**: Rodar `npx prisma migrate dev --name <nome>`

---

## 📚 Referências Principais

| Documento | Propósito |
|-----------|-----------|
| [00-PALLETS-INDEX.md](../../20-blueprints/pallets/00-PALLETS-INDEX.md) | Índice de todos os pallets |
| [05-IMPLEMENTATION-ROADMAP.md](../../20-blueprints/blockchain-integration/05-IMPLEMENTATION-ROADMAP.md) | Roadmap completo 24 semanas |
| [04-PROOF-OF-COMMERCE.md](../../20-blueprints/blockchain-integration/04-PROOF-OF-COMMERCE.md) | Arquitetura PoC |
| [Substrate Docs](https://docs.substrate.io/) | Documentação oficial Substrate |
| [Polkadot.js Docs](https://polkadot.js.org/docs/) | SDK JavaScript |

---

## 🤝 Como Contribuir

### Adicionar Novo Prompt
1. Copiar template de `99-templates/pallet-template.md`
2. Preencher todas as seções
3. Adicionar à lista acima
4. Atualizar dependências

### Atualizar Prompt Existente
1. Editar arquivo relevante
2. Incrementar versão no rodapé
3. Adicionar nota de changelog

### Reportar Problemas
- **GitHub Issues**: https://github.com/bazari/platform/issues
- **Tag**: `documentation`, `implementation-prompt`

---

## 📜 License

Esta documentação é parte do projeto Bazari Platform (MIT License).

---

**Generated by**: Claude (Senior Software Architect)
**Date**: 2025-11-12
**Version**: 1.0.0
