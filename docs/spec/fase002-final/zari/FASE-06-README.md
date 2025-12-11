# FASE 6: P2P ZARI Frontend

**Status**: 📝 Planejamento Completo
**Data**: 28 de Outubro de 2025
**Duração Estimada**: 24 horas (3 dias)
**Progresso**: 0% (0/7 prompts executados)

---

## 🎯 Objetivo

Implementar interface web completa para compra/venda de ZARI (token de governança) no sistema P2P do Bazari.

---

## 📦 O Que Será Implementado

### 1. Componentes Novos
- ✅ **AssetSelector**: Radio group BZR/ZARI
- ✅ **ZARIPhaseBadge**: Badge visual de fase ativa (compact + full)
- ✅ **ZARIStatsPage**: Dashboard público de estatísticas ZARI

### 2. Extensões de Páginas Existentes
- ✅ **P2PHomePage**: Tab "Comprar ZARI", filtro por fase
- ✅ **P2POfferNewPage**: Campo assetType, validação de fase
- ✅ **P2POrderRoomPage**: Escrow multi-asset (BZR vs ZARI)

### 3. API Client
- ✅ Extensão de `P2POffer` interface
- ✅ Métodos `getZARIPhase()`, `getZARIStats()`
- ✅ Métodos `escrowLock()`, `escrowRelease()`

### 4. Traduções
- ✅ i18n completo (pt, en, es)
- ✅ Interpolação de variáveis ({{phase}}, {{price}})

---

## 🏗️ Arquitetura

```
React App (Web)
│
├── Pages
│   ├── P2PHomePage (EXTENDED)
│   │   - Tab "Comprar ZARI"
│   │   - Filtro por fase (2A, 2B, 3)
│   │   - Badge de fase em ofertas ZARI
│   │
│   ├── P2POfferNewPage (EXTENDED)
│   │   - AssetSelector (BZR/ZARI)
│   │   - ZARIPhaseBadge (fase ativa)
│   │   - Quantidade ZARI vs Preço BZR
│   │   - Validação de fase esgotada
│   │
│   ├── P2POrderRoomPage (EXTENDED)
│   │   - Detecta assetType (BZR/ZARI)
│   │   - Escrow multi-asset:
│   │     - BZR: balances.transferKeepAlive()
│   │     - ZARI: assets.transferKeepAlive(1, ...)
│   │   - Botões backend-side:
│   │     - "Executar Lock via Backend"
│   │     - "Executar Release via Backend"
│   │
│   └── ZARIStatsPage (NEW)
│       - ZARIPhaseBadge (full)
│       - Tabela de fases (2A, 2B, 3)
│       - Estatísticas gerais
│
├── Components
│   ├── AssetSelector (NEW)
│   │   - Radio group: BZR / ZARI
│   │
│   └── ZARIPhaseBadge (NEW)
│       - Variant compact: badge inline
│       - Variant full: card com progress bar
│
└── API Client (EXTENDED)
    - getZARIPhase(): PhaseInfo
    - getZARIStats(): ZARIStats
    - escrowLock(orderId, { makerAddress })
    - escrowRelease(orderId, { takerAddress })
```

---

## 🔄 Fluxo de Usuário

### Criar Oferta ZARI

```
1. Usuário acessa /app/p2p/offers/new
2. Seleciona "ZARI" no AssetSelector
3. ZARIPhaseBadge carrega:
   - Fase 2A
   - Preço: R$0.25/ZARI
   - 30% disponível (progress bar)
4. Usuário preenche:
   - Quantidade ZARI: 1000
   - Min BRL: 50
   - Max BRL: 500
5. Preço calculado: R$250 (1000 × 0.25)
6. Submit → POST /api/p2p/offers
7. Toast de sucesso → Navega para /app/p2p
```

### Comprar ZARI (Ordem)

```
1. Usuário acessa /app/p2p
2. Clica tab "Comprar ZARI"
3. Lista de ofertas ZARI:
   - Badge: 🏛️ Fase 2A
   - Preço: R$0.25/ZARI
   - Range: R$50 - R$500
4. Clica em oferta → /app/p2p/offers/:id
5. Cria ordem:
   - Quantidade ZARI: 500
   - BRL calculado: R$125
6. Submit → POST /api/p2p/offers/:id/orders
7. Redireciona para /app/p2p/orders/:orderId
```

### Escrow ZARI (Backend-side)

```
Order Status: AWAITING_ESCROW

1. Maker clica "Executar Lock via Backend"
2. Frontend chama: POST /api/p2p/orders/:id/escrow-lock
   { "makerAddress": "5Grw..." }
3. Backend executa TX:
   api.tx.assets.transferKeepAlive(1, escrowAddress, 500_000000000000)
4. Backend retorna:
   {
     "txHash": "0x123...",
     "blockNumber": "8719",
     "amount": "500000000000000",
     "assetType": "ZARI"
   }
5. Frontend mostra:
   "✅ ZARI travado no escrow. TX: 0x123... (bloco #8719)"
6. Order status → AWAITING_FIAT_PAYMENT

---

Order Status: AWAITING_FIAT_PAYMENT

7. Taker faz PIX off-chain
8. Taker clica "Marcar como pago" + anexa comprovante
9. Order status → AWAITING_CONFIRMATION

---

Order Status: AWAITING_CONFIRMATION

10. Maker confirma recebimento PIX
11. Maker clica "Executar Release via Backend"
12. Frontend chama: POST /api/p2p/orders/:id/escrow-release
    { "takerAddress": "5FHn..." }
13. Backend executa TX:
    api.tx.assets.transferKeepAlive(1, takerAddress, 500_000000000000)
14. Backend retorna:
    {
      "txHash": "0x456...",
      "blockNumber": "8720",
      "recipient": "5FHn...",
      "assetType": "ZARI"
    }
15. Frontend mostra:
    "✅ ZARI liberado para comprador. TX: 0x456... (bloco #8720)"
16. Order status → RELEASED
```

---

## 📊 Prompts de Execução

### PROMPT 1: API Client Extension (1h)
- Estender interface `P2POffer` com campos ZARI
- Adicionar métodos `getZARIPhase()`, `getZARIStats()`, `escrowLock()`, `escrowRelease()`

### PROMPT 2: Componentes Base ZARI (3h)
- Criar `AssetSelector.tsx`
- Criar `ZARIPhaseBadge.tsx` (compact + full)

### PROMPT 3: P2POfferNewPage Extension (4h)
- Adicionar AssetSelector
- Lógica condicional BZR vs ZARI
- Validação de fase ativa

### PROMPT 4: P2PHomePage Extension (3h)
- Adicionar tabs ZARI (Comprar/Vender)
- Filtro por fase (2A, 2B, 3)
- Badge de fase em ofertas

### PROMPT 5: P2POrderRoomPage Extension (5h)
- Detectar assetType (BZR/ZARI)
- Adaptar TX blockchain (balances vs assets)
- Botões backend-side escrow

### PROMPT 6: ZARIStatsPage (3h)
- Criar dashboard de estatísticas
- Tabela de fases
- Métricas gerais

### PROMPT 7: Traduções i18n (1h)
- Adicionar chaves pt, en, es
- Testar interpolação

**Total**: 24 horas (3 dias)

---

## 📚 Documentação

| Documento | Localização |
|-----------|-------------|
| **Especificação Técnica** | [FASE-06-P2P-ZARI-FRONTEND.md](./spec/FASE-06-P2P-ZARI-FRONTEND.md) |
| **Prompts de Execução** | [FASE-06-PROMPT.md](./spec/FASE-06-PROMPT.md) |
| **API Backend (Referência)** | [API-P2P-ZARI.md](./API-P2P-ZARI.md) |
| **FASE 5 Backend** | [FASE-05-README.md](./FASE-05-README.md) |

---

## 🧪 Como Testar (Após Implementação)

### 1. Criar Oferta ZARI

```bash
# Via UI:
1. Acesse https://bazari.libervia.xyz/app/p2p/offers/new
2. Selecione "ZARI"
3. Preencha: 1000 ZARI, R$50-500
4. Clique "Salvar"
5. Verifique toast de sucesso
```

### 2. Listar Ofertas ZARI

```bash
# Via UI:
1. Acesse https://bazari.libervia.xyz/app/p2p
2. Clique tab "Comprar ZARI"
3. Verifique ofertas com badge 🏛️ Fase 2A
4. Teste filtro por fase (2A, 2B, 3)
```

### 3. Criar Ordem ZARI

```bash
# Via UI:
1. Clique em oferta ZARI
2. Preencha quantidade: 500 ZARI
3. Verifique cálculo: R$125 (se fase 2A)
4. Clique "Comprar"
5. Aguarde redirecionamento para sala de ordem
```

### 4. Escrow ZARI (Backend-side)

```bash
# Via UI (Order Room):
1. Maker: clica "Executar Lock via Backend"
2. Aguarda TX (3-5 segundos)
3. Verifica mensagem: "✅ ZARI travado no escrow. TX: 0x..."
4. Status atualiza para "Aguardando pagamento PIX"

5. Taker: faz PIX off-chain
6. Taker: clica "Marcar como pago" + anexa comprovante
7. Status atualiza para "Aguardando confirmação"

8. Maker: confirma recebimento PIX
9. Maker: clica "Executar Release via Backend"
10. Aguarda TX (3-5 segundos)
11. Verifica mensagem: "✅ ZARI liberado para comprador. TX: 0x..."
12. Status atualiza para "Liberado"
```

### 5. Dashboard ZARI

```bash
# Via UI:
1. Acesse https://bazari.libervia.xyz/app/p2p/zari/stats
2. Verifique badge de fase ativa
3. Verifique tabela de fases (2A, 2B, 3)
4. Verifique estatísticas (total vendido, ordens completas)
```

---

## ⚠️ Problemas Conhecidos (Potenciais)

### 1. Fase Esgotada
**Situação**: Fase 2A já vendeu todo o supply (2.1M ZARI)
**Solução**: Sistema detecta e mostra alerta "Fase 2A esgotada. Aguarde transição para Fase 2B"
**Ação Admin**: Transicionar para fase 2B via `POST /api/p2p/zari/phase/transition`

### 2. Endereço do Taker Não Encontrado
**Situação**: Backend-side release precisa de endereço blockchain do taker
**Solução**: Garantir que `takerProfile.address` está disponível na ordem
**Workaround**: Se endereço não disponível, usar wallet-side escrow (usuário assina TX)

### 3. Saldo Insuficiente para Escrow
**Situação**: Maker não tem ZARI suficiente
**Solução**: Frontend valida antes de criar oferta (verificar balance via polkadot.js)
**Fallback**: Backend retorna erro 400 com mensagem clara

---

## 📈 Próximas Fases

### FASE 7: Governança DAO (2 semanas)
- [ ] Proposals on-chain
- [ ] Voting com ZARI
- [ ] Execução de proposals
- [ ] Interface web

### FASE 8: SubDAOs (2 semanas)
- [ ] Criação de SubDAOs
- [ ] Tokens de SubDAO
- [ ] Governança de SubDAO
- [ ] Marketplace de SubDAO

---

## ✅ Checklist de Implementação

### API Client
- [ ] Estender interface `P2POffer`
- [ ] Adicionar `getZARIPhase()`
- [ ] Adicionar `getZARIStats()`
- [ ] Adicionar `escrowLock()`
- [ ] Adicionar `escrowRelease()`

### Componentes Novos
- [ ] Criar `AssetSelector.tsx`
- [ ] Criar `ZARIPhaseBadge.tsx` (compact)
- [ ] Criar `ZARIPhaseBadge.tsx` (full)
- [ ] Criar `ZARIStatsPage.tsx`

### Páginas Existentes (Extensões)
- [ ] P2PHomePage: Tab "Comprar ZARI"
- [ ] P2PHomePage: Filtro por fase
- [ ] P2PHomePage: Badge de fase em ofertas
- [ ] P2POfferNewPage: AssetSelector
- [ ] P2POfferNewPage: Lógica ZARI
- [ ] P2POfferNewPage: Validação fase
- [ ] P2POrderRoomPage: Detectar assetType
- [ ] P2POrderRoomPage: TX multi-asset
- [ ] P2POrderRoomPage: Botões backend-side
- [ ] P2POrderRoomPage: Labels dinâmicos

### Traduções
- [ ] Adicionar chaves pt.json
- [ ] Adicionar chaves en.json
- [ ] Adicionar chaves es.json

### Testes
- [ ] Criar oferta ZARI via UI
- [ ] Listar ofertas ZARI
- [ ] Filtrar por fase
- [ ] Criar ordem ZARI
- [ ] Executar lock backend-side
- [ ] Executar release backend-side
- [ ] Fluxo completo E2E
- [ ] Verificar traduções (pt, en, es)

---

## 👥 Equipe

**Especificação**: Claude Code Agent
**Desenvolvimento**: Pendente
**Revisão**: Pendente

---

## 📞 Suporte

**Issues**: https://github.com/bazari/bazari/issues
**Docs**: https://docs.bazari.xyz
**Discord**: https://discord.gg/bazari

---

*README gerado em: 28/Out/2025*
*Versão: 1.0*
*Status: 📝 Planejamento Completo - Pronto para Execução*
