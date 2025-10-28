# FASE 6: P2P ZARI Frontend - Índice de Documentação

**Data de Criação**: 28 de Outubro de 2025
**Status**: 📝 Planejamento Completo
**Total de Linhas**: 2,590 linhas de documentação

---

## 📋 Documentos Criados

### 1. [FASE-06-README.md](./FASE-06-README.md) - 389 linhas
**Propósito**: Visão geral da FASE 6

**Conteúdo**:
- Objetivo e escopo
- Arquitetura frontend
- Fluxos de usuário
- Checklist de implementação
- Testes manuais

**Para Quem**: Todos (visão geral rápida)

---

### 2. [spec/FASE-06-P2P-ZARI-FRONTEND.md](./spec/FASE-06-P2P-ZARI-FRONTEND.md) - 847 linhas
**Propósito**: Especificação técnica detalhada

**Conteúdo**:
- Componentes existentes para reutilizar
- Componentes novos a criar
- Interfaces TypeScript completas
- Fluxos de usuário detalhados
- Traduções i18n (pt, en, es)
- Considerações de segurança
- Notas técnicas (conversões, formatação)

**Para Quem**: Arquitetos, desenvolvedores seniores, revisores técnicos

**Seções Principais**:
1. Componentes Existentes (Reutilizar)
   - P2P API Client (extensão)
   - P2PHomePage (extensão)
   - P2POfferNewPage (extensão)
   - P2POrderRoomPage (extensão)
   - Wallet Tokens Store (já pronto)

2. Componentes Novos
   - ZARIPhaseBadge (compact + full)
   - AssetSelector (radio group)
   - ZARIStatsPage (dashboard)

3. Fluxos de Usuário
   - Criar Oferta ZARI
   - Comprar ZARI (Ordem)
   - Escrow ZARI (Backend-side ou Wallet-side)

4. Traduções (i18n)
   - 50+ chaves pt.json
   - 50+ chaves en.json
   - 50+ chaves es.json

---

### 3. [spec/FASE-06-PROMPT.md](./spec/FASE-06-PROMPT.md) - 1,354 linhas
**Propósito**: Prompts de execução sequenciais

**Conteúdo**:
- 7 prompts detalhados (24h total)
- Código completo para cada prompt
- Validações passo a passo
- Checklist final

**Para Quem**: Desenvolvedores implementando a FASE 6, Claude Code Agent

**Prompts**:
1. **PROMPT 1**: API Client Extension (1h)
2. **PROMPT 2**: Componentes Base ZARI (3h)
3. **PROMPT 3**: P2POfferNewPage Extension (4h)
4. **PROMPT 4**: P2PHomePage Extension (3h)
5. **PROMPT 5**: P2POrderRoomPage Extension (5h)
6. **PROMPT 6**: ZARIStatsPage (3h)
7. **PROMPT 7**: Traduções i18n (1h)

---

## 🎯 Objetivo da FASE 6

Implementar interface web completa para compra/venda de ZARI (token de governança) no sistema P2P do Bazari, com:

1. **Seletor de Asset**: BZR vs ZARI
2. **Badge de Fase**: Visual mostrando fase ativa (2A, 2B, 3) e progresso
3. **Filtros**: Por asset type e fase ZARI
4. **Escrow Multi-Asset**: Suporte a BZR (balances) e ZARI (assets)
5. **Dashboard Stats**: Estatísticas gerais ZARI
6. **Traduções**: i18n completo (pt, en, es)

---

## 📊 Métricas

| Métrica | Valor |
|---------|-------|
| **Documentação Total** | 2,590 linhas |
| **Componentes Novos** | 3 (AssetSelector, ZARIPhaseBadge, ZARIStatsPage) |
| **Páginas Modificadas** | 3 (P2PHomePage, P2POfferNewPage, P2POrderRoomPage) |
| **Endpoints API** | 4 novos métodos |
| **Traduções** | 50+ chaves × 3 idiomas = 150+ traduções |
| **Tempo Estimado** | 24 horas (3 dias) |
| **Prompts de Execução** | 7 |

---

## 🗺️ Roadmap de Execução

### Fase Atual: FASE 6 (24h)
```
PROMPT 1: API Client Extension          [1h]  ⬜
PROMPT 2: Componentes Base ZARI          [3h]  ⬜
PROMPT 3: P2POfferNewPage Extension      [4h]  ⬜
PROMPT 4: P2PHomePage Extension          [3h]  ⬜
PROMPT 5: P2POrderRoomPage Extension     [5h]  ⬜
PROMPT 6: ZARIStatsPage                  [3h]  ⬜
PROMPT 7: Traduções i18n                 [1h]  ⬜
─────────────────────────────────────────────────
Total:                                   [24h]  0%
```

### Fases Anteriores
- ✅ **FASE 1-4**: Wallet multi-token (COMPLETO)
- ✅ **FASE 5**: P2P ZARI Backend (COMPLETO - 33h)

### Próximas Fases
- ⬜ **FASE 7**: Governança DAO (2 semanas)
- ⬜ **FASE 8**: SubDAOs (2 semanas)

---

## 🏗️ Arquitetura (Resumo)

```
┌─────────────────────────────────────────┐
│         React Frontend (Web)            │
│                                         │
│  Pages:                                 │
│  - P2PHomePage (EXTENDED)              │
│  - P2POfferNewPage (EXTENDED)          │
│  - P2POrderRoomPage (EXTENDED)         │
│  - ZARIStatsPage (NEW)                 │
│                                         │
│  Components:                            │
│  - AssetSelector (NEW)                 │
│  - ZARIPhaseBadge (NEW)                │
│                                         │
│  API Client:                            │
│  - getZARIPhase()                      │
│  - getZARIStats()                      │
│  - escrowLock()                        │
│  - escrowRelease()                     │
└─────────────────┬───────────────────────┘
                  │ HTTPS
┌─────────────────▼───────────────────────┐
│       Backend API (Fastify)             │
│       /api/p2p/zari/*                   │
│       (FASE 5 - Completo)               │
└─────────────────┬───────────────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
        ▼                   ▼
┌─────────────┐     ┌─────────────────┐
│  PostgreSQL │     │  Bazari Chain   │
│  (Prisma)   │     │  (Polkadot.js)  │
└─────────────┘     └─────────────────┘
```

---

## 🔄 Fluxo Completo P2P ZARI

```
1. 🏛️ Usuário acessa /app/p2p/offers/new
   → Seleciona "ZARI"
   → ZARIPhaseBadge mostra: Fase 2A, R$0.25/ZARI, 30% disponível
   → Preenche: 1000 ZARI, R$50-500
   → Submit → Oferta criada

2. 💰 Comprador acessa /app/p2p
   → Tab "Comprar ZARI"
   → Filtra por "Fase 2A"
   → Clica em oferta
   → Cria ordem: 500 ZARI (R$125)

3. 🔒 Vendedor (Maker) tranca ZARI
   → Clica "Executar Lock via Backend"
   → Backend: api.tx.assets.transferKeepAlive(1, escrow, 500)
   → TX confirmado: 0x123... (bloco #8719)
   → Status: AWAITING_FIAT_PAYMENT

4. 💸 Comprador (Taker) faz PIX
   → Transfere R$125 via PIX off-chain
   → Clica "Marcar como pago" + anexa comprovante
   → Status: AWAITING_CONFIRMATION

5. ✅ Vendedor confirma recebimento
   → Clica "Executar Release via Backend"
   → Backend: api.tx.assets.transferKeepAlive(1, taker, 500)
   → TX confirmado: 0x456... (bloco #8720)
   → Status: RELEASED
   → 500 ZARI transferidos para comprador ✅
```

---

## 📚 Como Usar Esta Documentação

### Para Entender o Escopo
1. Leia [FASE-06-README.md](./FASE-06-README.md) (5 minutos)
2. Navegue pelos fluxos de usuário

### Para Implementar
1. Leia [spec/FASE-06-P2P-ZARI-FRONTEND.md](./spec/FASE-06-P2P-ZARI-FRONTEND.md) (30 minutos)
2. Execute [spec/FASE-06-PROMPT.md](./spec/FASE-06-PROMPT.md) sequencialmente
3. Valide cada prompt antes de avançar

### Para Revisar
1. Use spec para verificar requisitos
2. Use checklist final em PROMPT.md
3. Execute testes manuais do README.md

---

## ✅ Checklist de Preparação

Antes de começar a FASE 6:

### Dependências
- [x] FASE 5 (Backend) completa e funcionando
- [x] API endpoints ZARI testados
- [x] Blockchain com ZARI asset (ID=1)
- [x] Wallet frontend com suporte multi-token

### Ferramentas
- [ ] Node.js 18+ instalado
- [ ] pnpm instalado
- [ ] VSCode com TypeScript LSP
- [ ] React DevTools (extensão browser)

### Conhecimento
- [ ] React Hooks (useState, useEffect, useCallback)
- [ ] react-router-dom (navigate, useParams)
- [ ] react-i18next (useTranslation)
- [ ] shadcn/ui (Button, Card, Badge, Input)
- [ ] TypeScript (interfaces, tipos)
- [ ] Polkadot.js API (tx.assets, tx.balances)

---

## 🎓 Conceitos-Chave

### Multi-Asset Escrow
```typescript
// BZR (native token)
tx = api.tx.balances.transferKeepAlive(address, amount);

// ZARI (asset ID=1)
tx = api.tx.assets.transferKeepAlive(1, address, amount);
```

### Backend-side vs Wallet-side
```
Backend-side (Recomendado para MVP):
- Backend assina TX com conta escrow
- Usuário não precisa de PIN
- Mais simples, menos seguro

Wallet-side (Avançado):
- Usuário assina TX com sua carteira
- Requer PIN via PinService
- Mais complexo, mais seguro
```

### Phase-based Pricing
```
Fase 2A: 0.25 BZR/ZARI (2.1M ZARI)
Fase 2B: 0.35 BZR/ZARI (2.1M ZARI)
Fase 3:  0.50 BZR/ZARI (2.1M ZARI)

Total P2P: 6.3M ZARI (30% do supply)
```

---

## 📞 Suporte

**Issues**: https://github.com/bazari/bazari/issues
**Docs**: https://docs.bazari.xyz
**Discord**: https://discord.gg/bazari

---

## 📄 Licença

Proprietary - Bazari Platform

---

*Índice gerado em: 28/Out/2025*
*Versão: 1.0*
*Status: 📝 Planejamento Completo*
