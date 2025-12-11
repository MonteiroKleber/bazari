# FASE 6: P2P ZARI - Frontend (Especificação Técnica)

**Versão**: 1.0
**Data**: 28 de Outubro de 2025
**Status**: Planejamento
**Dependências**: FASE 5 (P2P ZARI Backend) - Completo

---

## 📋 Sumário Executivo

Implementar interface web completa para compra/venda de ZARI (token de governança) no sistema P2P do Bazari, incluindo:
- Seletor de asset (BZR/ZARI) em criação de ofertas
- Filtros por asset e fase ZARI
- Badge de fase com progress bar
- Fluxo de escrow multi-asset (BZR vs ZARI)
- Dashboard de estatísticas ZARI
- Traduções i18n (pt, en, es)

---

## 🎯 Objetivos

### Objetivo Principal
Permitir que usuários criem ofertas ZARI e executem ordens P2P com ZARI via interface web integrada.

### Objetivos Específicos
1. **Extensão de P2POfferNewPage**: Adicionar campo asset type (BZR/ZARI)
2. **Badge de Fase**: Componente visual mostrando fase ativa e progresso
3. **Filtro de Asset**: Filtrar ofertas por BZR/ZARI no P2PHomePage
4. **Fluxo Escrow ZARI**: Adaptar P2POrderRoomPage para assets.transfer_keep_alive
5. **Dashboard Stats**: Página de estatísticas gerais ZARI
6. **Traduções**: i18n completo para pt, en, es

---

## 🏗️ Arquitetura Frontend

```
┌─────────────────────────────────────────────────────┐
│              React Application                       │
│                                                      │
│  ┌───────────────────────────────────────────────┐ │
│  │ Pages (react-router-dom)                      │ │
│  │ - P2PHomePage (extended)                      │ │
│  │ - P2POfferNewPage (extended)                  │ │
│  │ - P2POrderRoomPage (extended)                 │ │
│  │ - ZARIStatsPage (NEW)                         │ │
│  └───────────────────┬───────────────────────────┘ │
│                      │                              │
│  ┌───────────────────▼───────────────────────────┐ │
│  │ Components                                     │ │
│  │ - ZARIPhaseBadge (NEW)                        │ │
│  │ - AssetSelector (NEW)                         │ │
│  │ - ZARIPhaseProgress (NEW)                     │ │
│  └───────────────────┬───────────────────────────┘ │
│                      │                              │
│  ┌───────────────────▼───────────────────────────┐ │
│  │ API Client (p2p/api.ts)                       │ │
│  │ - getZARIPhase()                              │ │
│  │ - getZARIStats()                              │ │
│  │ - escrowLock()                                │ │
│  │ - escrowRelease()                             │ │
│  └───────────────────┬───────────────────────────┘ │
│                      │                              │
└──────────────────────┼──────────────────────────────┘
                       │ HTTPS
┌──────────────────────▼──────────────────────────────┐
│         Backend API (Fastify)                        │
│         /api/p2p/zari/*                              │
└──────────────────────────────────────────────────────┘
```

---

## 📦 Componentes Existentes (Reutilizar)

### 1. P2P API Client (`/root/bazari/apps/web/src/modules/p2p/api.ts`)
**Status**: Existe, precisa extensão

**Interfaces Existentes**:
```typescript
export interface P2POffer {
  id: string;
  side: 'BUY_BZR' | 'SELL_BZR';
  priceBRLPerBZR: string;
  minBRL: string;
  maxBRL: string;
  ownerId: string;
  owner?: { handle?: string; ... };
  ownerStats?: { avgStars?: number; ... };
  status: string;
}

export const p2pApi = {
  listOffers: (params) => getPublicJSON('/p2p/offers', params),
  listMyOffers: (params) => getJSON('/p2p/offers/mine', params),
  createOffer: (payload) => postJSON('/p2p/offers', payload),
  getOrder: (orderId) => getJSON(`/p2p/orders/${orderId}`),
  createOrder: (offerId, payload) => postJSON(`/p2p/offers/${offerId}/orders`, payload),
  escrowIntent: (orderId) => postJSON(`/p2p/orders/${orderId}/escrow-intent`, {}),
  escrowConfirm: (orderId, payload) => postJSON(`/p2p/orders/${orderId}/escrow-confirm`, payload),
  markPaid: (orderId, payload) => postJSON(`/p2p/orders/${orderId}/mark-paid`, payload),
  confirmReceived: (orderId) => postJSON(`/p2p/orders/${orderId}/confirm-received`, {}),
  cancelOrder: (orderId) => postJSON(`/p2p/orders/${orderId}/cancel`, {}),
  sendMessage: (orderId, payload) => postJSON(`/p2p/orders/${orderId}/messages`, payload),
  listMessages: (orderId, params) => getJSON(`/p2p/orders/${orderId}/messages`, params),
  createReview: (orderId, payload) => postJSON(`/p2p/orders/${orderId}/reviews`, payload),
};
```

**Extensões Necessárias**:
```typescript
// Adicionar campos ZARI à interface P2POffer
export interface P2POffer {
  // ... campos existentes
  assetType?: 'BZR' | 'ZARI';
  assetId?: string | null;
  phase?: string | null;
  phasePrice?: string | null;
  priceBRLPerUnit?: string | null;
}

// Novos métodos ZARI
export const p2pApi = {
  // ... métodos existentes
  getZARIPhase: () => getPublicJSON('/p2p/zari/phase'),
  getZARIStats: () => getPublicJSON('/p2p/zari/stats'),
  escrowLock: (orderId, payload) => postJSON(`/p2p/orders/${orderId}/escrow-lock`, payload),
  escrowRelease: (orderId, payload) => postJSON(`/p2p/orders/${orderId}/escrow-release`, payload),
};
```

### 2. P2PHomePage (`/root/bazari/apps/web/src/modules/p2p/pages/P2PHomePage.tsx`)
**Status**: Existe, precisa extensão

**Padrões Existentes**:
- Usa `useState`, `useEffect`, `useMemo`, `useCallback`
- Tabs com `Button` (variant="default" vs "outline")
- Filtros com `Input` (minBRL, maxBRL)
- Cards com `Card`, `CardHeader`, `CardTitle`, `CardContent`
- Badges com `Badge`
- i18n com `useTranslation()`
- Navegação com `useNavigate()`

**Extensões Necessárias**:
1. Adicionar tab "Comprar ZARI" ao lado de "Comprar BZR"
2. Adicionar filtro por fase (2A, 2B, 3)
3. Mostrar badge de fase em ofertas ZARI
4. Adaptar labels: "priceBRLPerBZR" vs "priceBRLPerZARI"
5. Mostrar ZARIPhaseBadge em header quando tab ZARI ativa

### 3. P2POfferNewPage (`/root/bazari/apps/web/src/modules/p2p/pages/P2POfferNewPage.tsx`)
**Status**: Existe, precisa extensão

**Padrões Existentes**:
- Validação PIX obrigatória
- State com `useState`: side, price, minBRL, maxBRL, autoReply
- Submit com `p2pApi.createOffer()`
- Toast com `toast.success()` / `toast.error()`
- Navegação com `navigate('/app/p2p')` após sucesso

**Extensões Necessárias**:
1. Adicionar campo `assetType` (radio: BZR/ZARI)
2. Quando ZARI selecionado:
   - Buscar fase ativa com `p2pApi.getZARIPhase()`
   - Mostrar ZARIPhaseBadge
   - Substituir campo "Preço (R$/BZR)" por "Quantidade ZARI"
   - Calcular preço automaticamente (fase priceBZR)
3. Validação: se fase esgotada, desabilitar submit
4. Labels dinâmicos baseados em assetType

### 4. P2POrderRoomPage (`/root/bazari/apps/web/src/modules/p2p/pages/P2POrderRoomPage.tsx`)
**Status**: Existe, precisa extensão

**Padrões Existentes**:
- Ordem com 10 estados (AWAITING_ESCROW, AWAITING_FIAT_PAYMENT, etc.)
- Escrow flow:
  - `handleEscrowIntent()` → busca instruções
  - `signAndLockEscrow(pin)` → assina TX com Polkadot.js
  - `escrowConfirm()` → confirma TX hash
- Usa `PinService.getPin()` para confirmar TX
- Countdown de expiração
- Chat em tempo real
- Upload de comprovante PIX

**Extensões Necessárias**:
1. Detectar order.assetType (BZR vs ZARI)
2. Se ZARI:
   - Trocar `api.tx.balances.transferKeepAlive()` por `api.tx.assets.transferKeepAlive(1, address, amount)`
   - Adaptar labels: "Travar BZR" → "Travar ZARI"
   - Adaptar escrowIntent response (assetType, assetId, amountZARI)
3. Backend-side escrow:
   - Adicionar botões "Executar Lock via Backend" e "Executar Release via Backend"
   - Chamar `p2pApi.escrowLock()` e `p2pApi.escrowRelease()`
   - Mostrar txHash e blockNumber retornados
4. Mostrar badge de fase ZARI no header

### 5. Wallet Tokens Store (`/root/bazari/apps/web/src/modules/wallet/store/tokens.store.ts`)
**Status**: Existe, já tem suporte ZARI

**Tokens Padrão**:
```typescript
const NATIVE_BZR: WalletToken = {
  assetId: 'native',
  symbol: 'BZR',
  name: 'Bazari Token',
  decimals: 12,
  type: 'native',
  icon: '💎',
};

const ZARI_TOKEN: WalletToken = {
  assetId: '1',
  symbol: 'ZARI',
  name: 'Bazari Governance Token',
  decimals: 12,
  type: 'asset',
  icon: '🏛️',
};
```

**Uso**: `useTokens(address)` retorna `[BZR, ZARI, ...]` automaticamente.

**Ação**: Nenhuma modificação necessária, já suporta ZARI.

---

## 🆕 Componentes Novos

### 1. ZARIPhaseBadge (`/root/bazari/apps/web/src/modules/p2p/components/ZARIPhaseBadge.tsx`)

**Propósito**: Badge visual mostrando fase ZARI ativa e progresso.

**Props**:
```typescript
interface ZARIPhaseBadgeProps {
  variant?: 'compact' | 'full'; // compact: só badge; full: com progress bar
  onPhaseClick?: () => void; // Opcional: navegar para stats page
}
```

**Design (variant="compact")**:
```tsx
<Badge variant="secondary" className="cursor-pointer" onClick={onPhaseClick}>
  🏛️ Fase {phase} · R$ {priceBRL}/ZARI · {remainingPercent}% disponível
</Badge>
```

**Design (variant="full")**:
```tsx
<Card>
  <CardHeader>
    <CardTitle>Fase ZARI Ativa: {phase}</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span>Preço: {priceBRL} BRL/ZARI</span>
        <span>{progressPercent}% vendido</span>
      </div>
      <Progress value={progressPercent} />
      <div className="text-xs text-muted-foreground">
        {supplyRemaining} ZARI restantes de {supplyLimit}
      </div>
    </div>
  </CardContent>
</Card>
```

**Hooks**:
```typescript
const [phase, setPhase] = useState<PhaseInfo | null>(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
  p2pApi.getZARIPhase().then(setPhase).catch(console.error).finally(() => setLoading(false));
}, []);
```

### 2. AssetSelector (`/root/bazari/apps/web/src/modules/p2p/components/AssetSelector.tsx`)

**Propósito**: Radio group para selecionar BZR ou ZARI.

**Props**:
```typescript
interface AssetSelectorProps {
  value: 'BZR' | 'ZARI';
  onChange: (value: 'BZR' | 'ZARI') => void;
  disabled?: boolean;
}
```

**Design**:
```tsx
<div className="flex gap-2" role="radiogroup" aria-label={t('p2p.new.assetType')}>
  <Button
    variant={value === 'BZR' ? 'default' : 'outline'}
    onClick={() => onChange('BZR')}
    disabled={disabled}
    role="radio"
    aria-checked={value === 'BZR'}
  >
    💎 BZR
  </Button>
  <Button
    variant={value === 'ZARI' ? 'default' : 'outline'}
    onClick={() => onChange('ZARI')}
    disabled={disabled}
    role="radio"
    aria-checked={value === 'ZARI'}
  >
    🏛️ ZARI
  </Button>
</div>
```

### 3. ZARIStatsPage (`/root/bazari/apps/web/src/modules/p2p/pages/ZARIStatsPage.tsx`)

**Propósito**: Dashboard público de estatísticas ZARI.

**Layout**:
```tsx
<div className="container mx-auto px-4 py-2 md:py-3 space-y-4">
  <Card>
    <CardHeader>
      <CardTitle>Estatísticas ZARI</CardTitle>
    </CardHeader>
    <CardContent>
      <ZARIPhaseBadge variant="full" />
    </CardContent>
  </Card>

  <Card>
    <CardHeader>
      <CardTitle>Histórico de Fases</CardTitle>
    </CardHeader>
    <CardContent>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fase</TableHead>
            <TableHead>Preço (BRL/ZARI)</TableHead>
            <TableHead>Supply Limite</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {stats.phases.map((p) => (
            <TableRow key={p.phase}>
              <TableCell>{p.phase}</TableCell>
              <TableCell>R$ {p.priceBZR}</TableCell>
              <TableCell>{formatZARI(p.supplyLimit)}</TableCell>
              <TableCell>
                <Badge variant={p.active ? 'default' : 'secondary'}>
                  {p.active ? 'Ativa' : 'Concluída'}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </CardContent>
  </Card>

  <Card>
    <CardHeader>
      <CardTitle>Resumo Geral</CardTitle>
    </CardHeader>
    <CardContent className="grid gap-4 md:grid-cols-3">
      <div>
        <div className="text-sm text-muted-foreground">Total Vendido</div>
        <div className="text-2xl font-bold">{formatZARI(stats.totalSold)}</div>
      </div>
      <div>
        <div className="text-sm text-muted-foreground">Ordens Completas</div>
        <div className="text-2xl font-bold">{stats.completedOrders}</div>
      </div>
      <div>
        <div className="text-sm text-muted-foreground">Progresso Total</div>
        <div className="text-2xl font-bold">{stats.overallProgress}%</div>
      </div>
    </CardContent>
  </Card>
</div>
```

---

## 🔄 Fluxo de Usuário

### Fluxo 1: Criar Oferta ZARI

```
1. Usuário navega para /app/p2p/offers/new
2. Seleciona assetType = "ZARI" via AssetSelector
3. ZARIPhaseBadge carrega fase ativa (ex: Fase 2A, R$0.25/ZARI, 30% disponível)
4. Se fase esgotada → Mostrar alerta "Fase 2A esgotada. Aguarde transição para Fase 2B"
5. Usuário preenche:
   - Quantidade ZARI: 1000
   - Min BRL: 50
   - Max BRL: 500
6. Preço calculado automaticamente: 1000 ZARI × R$0.25 = R$250
7. Submit → POST /api/p2p/offers
8. Sucesso → toast + navigate('/app/p2p')
```

### Fluxo 2: Comprar ZARI (Ordem)

```
1. Usuário navega para /app/p2p
2. Clica tab "Comprar ZARI"
3. Lista filtra ofertas com assetType=ZARI
4. Usuário clica em oferta
5. Navega para /app/p2p/offers/:id (P2POfferPublicPage)
6. Preenche quantidade ZARI ou BRL
7. Cria ordem → POST /api/p2p/offers/:id/orders
8. Redireciona para /app/p2p/orders/:orderId (P2POrderRoomPage)
9. Fluxo escrow ZARI (veja Fluxo 3)
```

### Fluxo 3: Escrow ZARI (Backend-side ou Wallet-side)

**Opção A: Backend-side (Recomendado para MVP)**

```
Order status: AWAITING_ESCROW

1. Maker clica "Executar Lock via Backend"
2. Frontend chama: POST /api/p2p/orders/:id/escrow-lock { makerAddress: "5Grw..." }
3. Backend executa: api.tx.assets.transferKeepAlive(1, escrowAddress, amount)
4. Backend retorna: { txHash, blockNumber, amount, assetType: 'ZARI' }
5. Frontend mostra: "✅ ZARI travado no escrow. TX: 0x123... (bloco #8719)"
6. Order status → AWAITING_FIAT_PAYMENT

---

Order status: AWAITING_FIAT_PAYMENT

7. Taker faz PIX off-chain
8. Taker clica "Marcar como pago" + envia comprovante
9. Order status → AWAITING_CONFIRMATION

---

Order status: AWAITING_CONFIRMATION

10. Maker confirma recebimento PIX
11. Maker clica "Executar Release via Backend"
12. Frontend chama: POST /api/p2p/orders/:id/escrow-release { takerAddress: "5FHn..." }
13. Backend executa: api.tx.assets.transferKeepAlive(1, takerAddress, amount)
14. Backend retorna: { txHash, blockNumber, recipient, assetType: 'ZARI' }
15. Frontend mostra: "✅ ZARI liberado para comprador. TX: 0x456... (bloco #8720)"
16. Order status → RELEASED
```

**Opção B: Wallet-side (Opcional, para usuários avançados)**

```
Mesmo fluxo, mas em vez de botão "Executar via Backend":

1. Maker clica "Travar via Carteira"
2. Frontend detecta assetType = 'ZARI'
3. Frontend constrói TX: api.tx.assets.transferKeepAlive(1, escrowAddress, amountPlanck)
4. PinService solicita PIN
5. Frontend assina TX com keyring
6. Frontend envia TX via signAndSend()
7. Frontend chama escrowConfirm() com txHash
8. Order status → AWAITING_FIAT_PAYMENT
```

---

## 🌍 Traduções (i18n)

### Chaves Necessárias (pt.json)

```json
{
  "p2p": {
    "tabs": {
      "buyBzr": "Comprar BZR",
      "sellBzr": "Vender BZR",
      "buyZari": "Comprar ZARI",
      "sellZari": "Vender ZARI"
    },
    "badge": {
      "selling": "Vendendo BZR",
      "buying": "Comprando BZR",
      "sellingZari": "Vendendo ZARI",
      "buyingZari": "Comprando ZARI"
    },
    "new": {
      "assetType": "Tipo de ativo",
      "assetBZR": "BZR (Token nativo)",
      "assetZARI": "ZARI (Governança)",
      "amountZARI": "Quantidade ZARI",
      "phaseInfo": "Fase ativa: {{phase}} · Preço: R$ {{price}}/ZARI",
      "phaseSoldOut": "Fase {{phase}} esgotada. Aguarde transição para próxima fase.",
      "calculatedPrice": "Preço calculado: R$ {{total}}"
    },
    "room": {
      "status": {
        "awaitingEscrowZari": "Aguardando escrow de ZARI",
        "awaitingFiatZari": "Aguardando pagamento PIX (ZARI)"
      },
      "escrow": {
        "lockZari": "Travar ZARI",
        "lockViaBackend": "Executar Lock via Backend",
        "releaseViaBackend": "Executar Release via Backend",
        "amountZari": "Quantidade a enviar (ZARI)",
        "lockingZari": "Travando ZARI...",
        "releasingZari": "Liberando ZARI...",
        "txSuccess": "Transação executada com sucesso",
        "txHash": "Hash da transação",
        "blockNumber": "Bloco"
      }
    },
    "zari": {
      "stats": {
        "title": "Estatísticas ZARI",
        "activePhase": "Fase Ativa",
        "price": "Preço",
        "supplyLimit": "Limite de Supply",
        "supplyRemaining": "Restante",
        "progress": "Progresso",
        "totalSold": "Total Vendido",
        "completedOrders": "Ordens Completas",
        "overallProgress": "Progresso Total"
      },
      "phase": {
        "title": "Fase ZARI {{phase}}",
        "priceLabel": "R$ {{price}}/ZARI",
        "remaining": "{{remaining}} restantes",
        "soldOut": "Esgotado"
      }
    }
  }
}
```

### Chaves Necessárias (en.json)

```json
{
  "p2p": {
    "tabs": {
      "buyZari": "Buy ZARI",
      "sellZari": "Sell ZARI"
    },
    "badge": {
      "sellingZari": "Selling ZARI",
      "buyingZari": "Buying ZARI"
    },
    "new": {
      "assetType": "Asset type",
      "assetBZR": "BZR (Native token)",
      "assetZARI": "ZARI (Governance)",
      "amountZARI": "ZARI amount",
      "phaseInfo": "Active phase: {{phase}} · Price: R$ {{price}}/ZARI",
      "phaseSoldOut": "Phase {{phase}} sold out. Awaiting transition to next phase.",
      "calculatedPrice": "Calculated price: R$ {{total}}"
    },
    "room": {
      "status": {
        "awaitingEscrowZari": "Awaiting ZARI escrow",
        "awaitingFiatZari": "Awaiting PIX payment (ZARI)"
      },
      "escrow": {
        "lockZari": "Lock ZARI",
        "lockViaBackend": "Execute Lock via Backend",
        "releaseViaBackend": "Execute Release via Backend",
        "amountZari": "Amount to send (ZARI)",
        "lockingZari": "Locking ZARI...",
        "releasingZari": "Releasing ZARI...",
        "txSuccess": "Transaction executed successfully",
        "txHash": "Transaction hash",
        "blockNumber": "Block"
      }
    },
    "zari": {
      "stats": {
        "title": "ZARI Statistics",
        "activePhase": "Active Phase",
        "price": "Price",
        "supplyLimit": "Supply Limit",
        "supplyRemaining": "Remaining",
        "progress": "Progress",
        "totalSold": "Total Sold",
        "completedOrders": "Completed Orders",
        "overallProgress": "Overall Progress"
      },
      "phase": {
        "title": "ZARI Phase {{phase}}",
        "priceLabel": "R$ {{price}}/ZARI",
        "remaining": "{{remaining}} remaining",
        "soldOut": "Sold out"
      }
    }
  }
}
```

### Chaves Necessárias (es.json)

```json
{
  "p2p": {
    "tabs": {
      "buyZari": "Comprar ZARI",
      "sellZari": "Vender ZARI"
    },
    "badge": {
      "sellingZari": "Vendiendo ZARI",
      "buyingZari": "Comprando ZARI"
    },
    "new": {
      "assetType": "Tipo de activo",
      "assetBZR": "BZR (Token nativo)",
      "assetZARI": "ZARI (Gobernanza)",
      "amountZARI": "Cantidad ZARI",
      "phaseInfo": "Fase activa: {{phase}} · Precio: R$ {{price}}/ZARI",
      "phaseSoldOut": "Fase {{phase}} agotada. Esperando transición a la próxima fase.",
      "calculatedPrice": "Precio calculado: R$ {{total}}"
    },
    "room": {
      "status": {
        "awaitingEscrowZari": "Esperando escrow de ZARI",
        "awaitingFiatZari": "Esperando pago PIX (ZARI)"
      },
      "escrow": {
        "lockZari": "Bloquear ZARI",
        "lockViaBackend": "Ejecutar bloqueo via Backend",
        "releaseViaBackend": "Ejecutar liberación via Backend",
        "amountZari": "Cantidad a enviar (ZARI)",
        "lockingZari": "Bloqueando ZARI...",
        "releasingZari": "Liberando ZARI...",
        "txSuccess": "Transacción ejecutada con éxito",
        "txHash": "Hash de transacción",
        "blockNumber": "Bloque"
      }
    },
    "zari": {
      "stats": {
        "title": "Estadísticas ZARI",
        "activePhase": "Fase Activa",
        "price": "Precio",
        "supplyLimit": "Límite de Supply",
        "supplyRemaining": "Restante",
        "progress": "Progreso",
        "totalSold": "Total Vendido",
        "completedOrders": "Órdenes Completadas",
        "overallProgress": "Progreso Total"
      },
      "phase": {
        "title": "Fase ZARI {{phase}}",
        "priceLabel": "R$ {{price}}/ZARI",
        "remaining": "{{remaining}} restantes",
        "soldOut": "Agotado"
      }
    }
  }
}
```

---

## 🔧 Checklist de Implementação

### API Client
- [ ] Estender interface `P2POffer` com campos ZARI
- [ ] Adicionar `getZARIPhase()`
- [ ] Adicionar `getZARIStats()`
- [ ] Adicionar `escrowLock()`
- [ ] Adicionar `escrowRelease()`

### Componentes Novos
- [ ] Criar `ZARIPhaseBadge.tsx` (compact + full)
- [ ] Criar `AssetSelector.tsx`
- [ ] Criar `ZARIStatsPage.tsx`

### Páginas Existentes (Extensões)
- [ ] P2PHomePage: Adicionar tab "Comprar ZARI"
- [ ] P2PHomePage: Filtro por fase ZARI
- [ ] P2PHomePage: Badge de fase em ofertas ZARI
- [ ] P2POfferNewPage: Campo assetType (BZR/ZARI)
- [ ] P2POfferNewPage: Lógica condicional para ZARI
- [ ] P2POfferNewPage: Validação de fase ativa
- [ ] P2POrderRoomPage: Detectar assetType da ordem
- [ ] P2POrderRoomPage: TX multi-asset (balances vs assets)
- [ ] P2POrderRoomPage: Botões backend-side escrow
- [ ] P2POrderRoomPage: Labels dinâmicos (BZR vs ZARI)

### Traduções
- [ ] Adicionar chaves pt.json
- [ ] Adicionar chaves en.json
- [ ] Adicionar chaves es.json

### Testes
- [ ] Criar oferta ZARI via UI
- [ ] Listar ofertas ZARI
- [ ] Criar ordem ZARI
- [ ] Executar escrow ZARI (backend-side)
- [ ] Fluxo completo: lock → PIX → release
- [ ] Testar fase esgotada (exibir alerta)
- [ ] Verificar traduções (pt, en, es)

---

## 📊 Estimativa de Esforço

| Tarefa | Complexidade | Tempo Estimado |
|--------|--------------|----------------|
| **API Client Extension** | Baixa | 1h |
| **ZARIPhaseBadge** | Média | 2h |
| **AssetSelector** | Baixa | 1h |
| **ZARIStatsPage** | Média | 3h |
| **P2PHomePage Extension** | Média | 3h |
| **P2POfferNewPage Extension** | Alta | 4h |
| **P2POrderRoomPage Extension** | Alta | 5h |
| **Traduções (pt, en, es)** | Baixa | 1h |
| **Testes E2E** | Média | 3h |
| **Documentação** | Baixa | 1h |
| **Total** | - | **24h (3 dias)** |

---

## 🧪 Critérios de Aceitação

### 1. Criar Oferta ZARI
- [ ] Usuário pode selecionar asset type (BZR/ZARI)
- [ ] Badge mostra fase ativa e progresso
- [ ] Campo "Quantidade ZARI" visível quando ZARI selecionado
- [ ] Preço calculado automaticamente (fase × quantidade)
- [ ] Submit cria oferta ZARI com sucesso
- [ ] Toast de sucesso exibido
- [ ] Redireciona para /app/p2p

### 2. Listar Ofertas ZARI
- [ ] Tab "Comprar ZARI" disponível
- [ ] Ofertas ZARI listadas com badge de fase
- [ ] Filtro por fase (2A, 2B, 3) funciona
- [ ] Preço exibido como "R$/ZARI" (não "R$/BZR")

### 3. Criar Ordem ZARI
- [ ] Usuário pode criar ordem a partir de oferta ZARI
- [ ] Cálculo BRL ↔ ZARI correto
- [ ] Validação de limites (minBRL, maxBRL) funciona

### 4. Escrow ZARI (Backend-side)
- [ ] Botão "Executar Lock via Backend" visível para maker
- [ ] Lock executa TX com `assets.transferKeepAlive(1, ...)`
- [ ] TX hash e block number exibidos
- [ ] Status atualiza para AWAITING_FIAT_PAYMENT
- [ ] Botão "Executar Release via Backend" visível após pagamento
- [ ] Release executa TX para taker
- [ ] Status atualiza para RELEASED

### 5. Dashboard ZARI
- [ ] Página acessível em /app/p2p/zari/stats
- [ ] Badge de fase completo com progress bar
- [ ] Tabela de fases (2A, 2B, 3) com status
- [ ] Estatísticas gerais (total vendido, ordens completas)

### 6. Traduções
- [ ] Todas as chaves ZARI traduzidas em pt, en, es
- [ ] Não há chaves faltando (sem fallback para inglês)
- [ ] Interpolação de variáveis funciona ({{phase}}, {{price}})

---

## ⚠️ Considerações de Segurança

1. **Validação Client-side**: Sempre validar inputs antes de enviar (minBRL ≤ maxBRL, quantidade > 0)
2. **Backend Authority**: Backend valida fase ativa e supply disponível (frontend não é fonte de verdade)
3. **PIN Protection**: Escrow wallet-side requer PIN via PinService
4. **TX Confirmation**: Aguardar `status.isInBlock` antes de chamar `escrowConfirm()`
5. **Error Handling**: Tratar erros de blockchain (saldo insuficiente, asset não existe)

---

## 📝 Notas Técnicas

### Conversão BRL ↔ ZARI

```typescript
// De FASE 5: PhaseControlService
const priceBRLPerZARI = Number(phase.priceBZR) / 1e12;

// Frontend calculation
const amountBRL = amountZARI * priceBRLPerZARI;
const amountZARI = amountBRL / priceBRLPerZARI;
```

### Conversão ZARI ↔ Planck

```typescript
// 1 ZARI = 10^12 planck (12 decimais)
const planck = BigInt(Math.floor(amountZARI * 1e12));
const zari = Number(planck) / 1e12;
```

### Polkadot.js TX (ZARI)

```typescript
// Lock ZARI no escrow
const tx = api.tx.assets.transferKeepAlive(
  1,                    // assetId
  escrowAddress,        // to
  amountPlanck          // amount
);

// Release ZARI do escrow para taker
const tx = api.tx.assets.transferKeepAlive(
  1,
  takerAddress,
  amountPlanck
);
```

### Formatação ZARI

```typescript
// Reutilizar BZR formatter (mesmos 12 decimais)
import { BZR } from '@/utils/bzr';

const formatZARI = (planck: bigint | string) => {
  const locale = BZR.normalizeLocale(i18n.language);
  return BZR.formatAuto(planck, locale, true).replace('BZR', 'ZARI');
};
```

---

## 📚 Referências

- **FASE 5 Backend**: [FASE-05-README.md](./FASE-05-README.md)
- **API Documentation**: [API-P2P-ZARI.md](./API-P2P-ZARI.md)
- **shadcn/ui Components**: https://ui.shadcn.com
- **Polkadot.js API**: https://polkadot.js.org/docs/api
- **react-i18next**: https://react.i18next.com

---

*Especificação gerada em: 28/Out/2025*
*Versão: 1.0*
*Status: Pronto para Execução*
