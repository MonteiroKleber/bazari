# Current Modules Map - Mapeamento dos Módulos Atuais

**Versão:** 1.0.0
**Data:** 2024-12-03
**Baseado em:** Análise do repositório /root/bazari

---

## Visão Geral da Estrutura Atual

```
apps/web/src/
├── pages/              # 71 arquivos .tsx
├── modules/            # 12 módulos
├── components/         # 210+ componentes
├── hooks/              # Hooks globais
├── lib/                # Utilitários
└── stores/             # Zustand stores
```

---

## Quick Actions Atuais (Dashboard)

Localização: `components/dashboard/QuickActionsGrid.tsx`

| # | Módulo | Ícone | Rota | Categoria |
|---|--------|-------|------|-----------|
| 1 | Feed Social | Newspaper | `/app/feed` | Social |
| 2 | Rewards & Missões | Trophy | `/app/rewards/missions` | Entertainment |
| 3 | BazChat | MessageCircle | `/app/chat` | Social |
| 4 | Analytics | BarChart3 | `/app/analytics` | Tools |
| 5 | Wallet | Wallet | `/app/wallet` | Finance |
| 6 | Descobrir | Compass | `/app/discover/people` | Social |
| 7 | Minhas Lojas | Store | `/app/sellers` | Commerce |
| 8 | Afiliações | UserCheck | `/app/promoter/affiliates` | Commerce |
| 9 | Meu Marketplace | ShoppingBag | `/app/affiliate/dashboard` | Commerce |
| 10 | P2P | ArrowLeftRight | `/app/p2p` | Finance |
| 11 | Governança | Vote | `/app/governance` | Governance |
| 12 | Vesting | TrendingUp | `/vesting` | Finance |
| 13 | Entregas* | Truck | `/app/delivery/dashboard` | Tools |
| 14 | Admin* | Shield | `/app/admin/*` | Tools |
| 15 | Bazari VR | Glasses | custom onClick | Entertainment |

*Condicionais baseados em role/profile

---

## Mapeamento Detalhado por Módulo

### 1. Wallet

**Categoria:** Finance
**Prioridade de Migração:** Alta
**Complexidade:** Média

#### Arquivos Atuais

```
modules/wallet/
├── index.ts            # Entry point
├── WalletHome.tsx      # Página principal
├── components/
│   ├── BalanceCard.tsx
│   ├── TokenList.tsx
│   └── TransactionHistory.tsx
└── hooks/
    └── useWalletBalance.ts

components/wallet/
├── SendTokenModal.tsx
├── ReceiveModal.tsx
├── WalletCard.tsx
└── ...

pages/
├── WalletHome.tsx (redirect)
```

#### Rotas Atuais

- `/app/wallet` - Home
- `/app/wallet/send` - Enviar
- `/app/wallet/receive` - Receber
- `/app/wallet/history` - Histórico

#### Dependências

- Blockchain service
- useAuth hook
- useBalance hook (blockchain)

---

### 2. Feed Social

**Categoria:** Social
**Prioridade de Migração:** Alta
**Complexidade:** Baixa

#### Arquivos Atuais

```
pages/
├── FeedPage.tsx        # Página principal

components/social/
├── PostCard.tsx
├── PostComposer.tsx
├── LikeButton.tsx
├── CommentSection.tsx
├── RepostButton.tsx
└── ...

modules/social/ (se existir)
```

#### Rotas Atuais

- `/app/feed` - Feed principal

#### Dependências

- API client
- useAuth
- Media upload service

---

### 3. BazChat

**Categoria:** Social
**Prioridade de Migração:** Média
**Complexidade:** Alta

#### Arquivos Atuais

```
pages/chat/
├── ChatInboxPage.tsx
├── ChatConversationPage.tsx
└── ...

components/chat/
├── ChatList.tsx
├── MessageBubble.tsx
├── ChatInput.tsx
├── EncryptionIndicator.tsx
└── ...

modules/chat/ (se existir)
```

#### Rotas Atuais

- `/app/chat` - Inbox
- `/app/chat/:conversationId` - Conversa

#### Dependências

- WebSocket service
- E2E encryption
- Signal protocol

---

### 4. Marketplace

**Categoria:** Commerce
**Prioridade de Migração:** Alta
**Complexidade:** Média

#### Arquivos Atuais

```
pages/
├── AffiliateDashboardPage.tsx
├── ProductDetailPage.tsx
├── NewListingPage.tsx
└── ...

modules/marketplace/ (se existir)

components/commerce/
├── ProductCard.tsx
├── ProductGrid.tsx
├── PriceTag.tsx
└── ...
```

#### Rotas Atuais

- `/app/affiliate/dashboard` - Dashboard do marketplace
- `/app/products/:id` - Detalhe de produto
- `/app/products/new` - Criar produto

#### Dependências

- Cart module
- Orders module
- Store module

---

### 5. Governance

**Categoria:** Governance
**Prioridade de Migração:** Média
**Complexidade:** Média

#### Arquivos Atuais

```
modules/governance/
├── index.ts
├── pages/
│   ├── GovernancePage.tsx
│   ├── ProposalDetailPage.tsx
│   └── ...
├── components/
│   ├── ProposalCard.tsx
│   ├── VotingPanel.tsx
│   └── ...
└── hooks/
    └── useGovernance.ts

pages/governance/ (se existir)
```

#### Rotas Atuais

- `/app/governance` - Lista de propostas
- `/app/governance/proposals/:id` - Detalhe
- `/app/governance/referendums/:id` - Referendo

#### Dependências

- Blockchain (Democracy pallet)
- useIsDAOMember hook

---

### 6. P2P Exchange

**Categoria:** Finance
**Prioridade de Migração:** Baixa
**Complexidade:** Alta

#### Arquivos Atuais

```
modules/p2p/
├── index.ts
├── pages/
│   ├── P2PHomePage.tsx
│   ├── CreateOfferPage.tsx
│   ├── TradeDetailPage.tsx
│   └── ...
├── components/
│   ├── OfferCard.tsx
│   ├── TradeChat.tsx
│   └── ...
```

#### Rotas Atuais

- `/app/p2p` - Home
- `/app/p2p/create` - Criar oferta
- `/app/p2p/trade/:id` - Trade ativo

#### Dependências

- Escrow service
- Chat service
- Blockchain

---

### 7. Vesting

**Categoria:** Finance
**Prioridade de Migração:** Baixa
**Complexidade:** Baixa

#### Arquivos Atuais

```
modules/vesting/
├── index.ts
├── VestingPage.tsx
└── components/
    ├── VestingSchedule.tsx
    └── ClaimButton.tsx
```

#### Rotas Atuais

- `/vesting` - Página principal

#### Dependências

- Blockchain (Vesting pallet)

---

### 8. Analytics

**Categoria:** Tools
**Prioridade de Migração:** Baixa
**Complexidade:** Baixa

#### Arquivos Atuais

```
pages/
├── AnalyticsPage.tsx

components/analytics/ (se existir)
```

#### Rotas Atuais

- `/app/analytics` - Dashboard

#### Dependências

- API para métricas

---

### 9. Rewards/Missions

**Categoria:** Entertainment
**Prioridade de Migração:** Média
**Complexidade:** Média

#### Arquivos Atuais

```
pages/rewards/
├── MissionsHubPage.tsx
├── StreakHistoryPage.tsx
├── CashbackDashboardPage.tsx
└── ...

components/rewards/
├── MissionCard.tsx
├── StreakCounter.tsx
└── ...
```

#### Rotas Atuais

- `/app/rewards/missions` - Hub de missões
- `/app/rewards/streaks` - Streaks
- `/app/rewards/cashback` - Cashback

#### Dependências

- Gamification service
- Blockchain (rewards)

---

### 10. Delivery

**Categoria:** Tools
**Prioridade de Migração:** Baixa
**Complexidade:** Média

#### Arquivos Atuais

```
pages/delivery/
├── DeliveryDashboardPage.tsx
├── DeliveryProfileSetupPage.tsx
└── ...

components/delivery/
├── DeliveryMap.tsx
├── DeliveryCard.tsx
└── ...
```

#### Rotas Atuais

- `/app/delivery/dashboard` - Dashboard
- `/app/delivery/profile/setup` - Setup

#### Dependências

- Location services
- Maps API

---

### 11. Stores/Sellers

**Categoria:** Commerce
**Prioridade de Migração:** Média
**Complexidade:** Média

#### Arquivos Atuais

```
pages/
├── MySellersPage.tsx
├── SellerOrdersPage.tsx
└── ...

modules/store/
modules/seller/

components/store/
```

#### Rotas Atuais

- `/app/sellers` - Minhas lojas
- `/app/seller/:id/orders` - Pedidos

---

### 12. Discover

**Categoria:** Social
**Prioridade de Migração:** Baixa
**Complexidade:** Baixa

#### Arquivos Atuais

```
pages/
├── DiscoverPeoplePage.tsx
├── TrendingPage.tsx
```

#### Rotas Atuais

- `/app/discover/people` - Pessoas
- `/app/discover/trending` - Tendências

---

### 13. Affiliates

**Categoria:** Commerce
**Prioridade de Migração:** Baixa
**Complexidade:** Baixa

#### Arquivos Atuais

```
pages/promoter/
├── AffiliatesPage.tsx
└── ...

modules/affiliates/
```

#### Rotas Atuais

- `/app/promoter/affiliates` - Dashboard

---

### 14. Bazari VR

**Categoria:** Entertainment
**Prioridade de Migração:** Baixa
**Complexidade:** Alta

#### Arquivos Atuais

```
Projeto separado: apps/vr-client/
Ou em: pages/VREntryPage.tsx
```

#### Rotas Atuais

- `/vr` ou popup

---

## Componentes Compartilhados

Estes NÃO devem ser movidos para apps específicos:

```
components/
├── ui/               # Shadcn components
├── AppHeader.tsx     # Header global
├── MobileBottomNav.tsx
├── common/
│   ├── Avatar.tsx
│   ├── Badge.tsx
│   └── ...
```

---

## Hooks Compartilhados

Estes NÃO devem ser movidos:

```
hooks/
├── useAuth.ts
├── useApi.ts
├── useBlockchain.ts
├── useMediaUpload.ts
├── useToast.ts
└── ...
```

---

## Stores Compartilhados

```
stores/
├── auth.store.ts
├── cart.store.ts
└── ...
```

---

## Resumo de Migração

| Módulo | Arquivos | Componentes | Hooks | Complexidade |
|--------|----------|-------------|-------|--------------|
| Wallet | ~5 | ~10 | ~3 | Média |
| Feed | ~2 | ~8 | ~2 | Baixa |
| BazChat | ~5 | ~15 | ~5 | Alta |
| Marketplace | ~8 | ~12 | ~4 | Média |
| Governance | ~5 | ~8 | ~3 | Média |
| P2P | ~6 | ~10 | ~4 | Alta |
| Vesting | ~2 | ~3 | ~1 | Baixa |
| Analytics | ~1 | ~5 | ~1 | Baixa |
| Rewards | ~4 | ~6 | ~2 | Média |
| Delivery | ~3 | ~5 | ~2 | Média |
| Stores | ~4 | ~6 | ~2 | Média |
| Discover | ~2 | ~3 | ~1 | Baixa |
| Affiliates | ~2 | ~4 | ~1 | Baixa |
| VR | Separado | - | - | Alta |

---

**Documento:** CURRENT-MODULES-MAP.md
**Versão:** 1.0.0
