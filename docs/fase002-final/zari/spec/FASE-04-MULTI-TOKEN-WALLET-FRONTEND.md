# FASE 4: Multi-Token Wallet (Frontend)

**Data de Criação**: 2025-10-27
**Status**: 📋 ESPECIFICAÇÃO TÉCNICA + UX/UI DESIGN
**Dependências**:
- ✅ FASE 1: BZR Rename (Blockchain) - COMPLETA
- ✅ FASE 3: ZARI Token (Blockchain) - COMPLETA
**Duração Estimada**: 1.5 semanas (60 horas)
**Nível de Risco**: 🟢 BAIXO

---

## 🎯 OBJETIVO

Estender o frontend da wallet Bazari para suportar **múltiplos tokens** (BZR nativo + ZARI e futuros assets), exibindo balances, permitindo transações e mostrando histórico separado por token, tudo com **UX/UI consistente** com o design system existente.

---

## 🔍 CONTEXTO

### Por Que Após FASE 3?

1. **ZARI existe on-chain**: Asset ID=1 está criado e funcional
2. **APIs prontas**: `api.query.assets.*` disponíveis via RPC
3. **Infraestrutura existente**: Services de balance e history já implementados
4. **Component Balance criado**: FASE 2 preparou componente reutilizável

### Arquitetura Frontend Atual (Análise Completa)

```
apps/web/src/
├── components/
│   ├── ui/                          # shadcn/ui components
│   │   ├── card.tsx                 # Card system (usado em wallet)
│   │   ├── button.tsx               # 6 variants (default, destructive, outline...)
│   │   ├── badge.tsx                # Tags e labels
│   │   ├── tabs.tsx                 # Navegação em abas
│   │   ├── select.tsx               # Dropdown seletor
│   │   ├── skeleton.tsx             # Loading placeholders
│   │   └── tooltip.tsx              # Tooltips informativos
│   └── wallet/
│       └── Balance.tsx              # FASE 2: Componente genérico
│
├── modules/wallet/
│   ├── pages/
│   │   ├── WalletDashboard.tsx      # 🎯 Principal (modificar)
│   │   ├── SendPage.tsx             # 🎯 Enviar (modificar)
│   │   ├── ReceivePage.tsx          # (sem mudança)
│   │   └── WalletHome.tsx           # (sem mudança)
│   ├── services/
│   │   ├── balances.ts              # getNativeBalance, getAssetBalance
│   │   ├── assets.ts                # fetchAssetMetadata
│   │   └── history.ts               # fetchRecentTransfers
│   ├── hooks/
│   │   ├── useVaultAccounts.ts      # Active account
│   │   └── useChainProps.ts         # Chain metadata (BZR, ss58, etc)
│   └── store/
│       └── tokens.store.ts          # 🎯 Token management (modificar)
│
└── lib/
    ├── blockchain/
    │   └── polkadot.ts              # API connection
    └── utils.ts                     # cn() helper (classnames)
```

**Design System Existente**:
- **Framework**: Tailwind CSS + CSS Variables
- **Components**: shadcn/ui (primitives React)
- **Themes**: 6 temas via CSS custom properties (`--primary`, `--background`, etc)
- **Typography**: 2xl/xl/lg sizes, semibold weights
- **Spacing**: p-6/pt-0 padding, space-y-1.5 gaps
- **Colors**: HSL-based (`hsl(var(--primary))`)
- **Radius**: lg/xl/2xl border-radius
- **Animations**: Smooth transitions (via Tailwind)

---

## 📦 ESCOPO TÉCNICO

### Resumo das Mudanças

| Componente | Tipo | Complexidade | Tempo |
|------------|------|--------------|-------|
| **TokenList Component** | Novo | Médio | 8h |
| **TokenSelector Component** | Novo | Baixo | 4h |
| **TokenBalance Component** | Estender (FASE 2) | Baixo | 2h |
| **WalletDashboard Page** | Modificar | Alto | 16h |
| **SendPage** | Modificar | Médio | 10h |
| **tokens.store.ts** | Estender | Médio | 6h |
| **services/assets.ts** | Estender | Baixo | 4h |
| **i18n (PT/EN/ES)** | Estender | Baixo | 4h |
| **Testes** | E2E | Médio | 6h |

**Total**: ~60 horas (1.5 semanas)

---

## 🎨 UX/UI DESIGN

### Princípios de Design

1. **Consistência**: Reutilizar componentes shadcn/ui existentes
2. **Clareza**: Token nativo (BZR) sempre destacado
3. **Progressividade**: Mostrar BZR por padrão, ZARI quando usuário adicionar
4. **Responsividade**: Mobile-first (320px-1920px)
5. **Acessibilidade**: ARIA labels, keyboard navigation
6. **Performance**: Lazy loading, virtualized lists (para 100+ tokens futuros)

---

### Wireframe 1: WalletDashboard - Lista de Tokens

```
╔════════════════════════════════════════════════════════════════╗
║  Wallet                                           [Refresh ↻]  ║
╠════════════════════════════════════════════════════════════════╣
║                                                                 ║
║  Address: 5GrwvaEF5z...cNoHGKutQY           [📋 Copy] [QR 📷] ║
║                                                                 ║
║  ┌───────────────────────────────────────────────────────────┐ ║
║  │  My Tokens                                   [+ Add Token] │ ║
║  ├───────────────────────────────────────────────────────────┤ ║
║  │                                                            │ ║
║  │  ┌─────────────────────────────────────────────────────┐ │ ║
║  │  │ 💎 BZR (Native Asset)                              │ │ ║
║  │  │ ───────────────────────────────────────────────────│ │ ║
║  │  │ Balance:     1,234,567.89 BZR                      │ │ ║
║  │  │ Reserved:    10.00 BZR                             │ │ ║
║  │  │ Available:   1,234,557.89 BZR                      │ │ ║
║  │  │                                                     │ │ ║
║  │  │ [↓ Receive]  [↑ Send]  [📊 History]                │ │ ║
║  │  └─────────────────────────────────────────────────────┘ │ ║
║  │                                                            │ ║
║  │  ┌─────────────────────────────────────────────────────┐ │ ║
║  │  │ 🏛️ ZARI (Governance Token)                         │ │ ║
║  │  │ ───────────────────────────────────────────────────│ │ ║
║  │  │ Balance:     500,000.00 ZARI                       │ │ ║
║  │  │ Reserved:    0.00 ZARI                             │ │ ║
║  │  │ Available:   500,000.00 ZARI                       │ │ ║
║  │  │                                                     │ │ ║
║  │  │ [↓ Receive]  [↑ Send]  [📊 History]  [✖ Remove]    │ │ ║
║  │  └─────────────────────────────────────────────────────┘ │ ║
║  │                                                            │ ║
║  └───────────────────────────────────────────────────────────┘ ║
║                                                                 ║
║  ┌───────────────────────────────────────────────────────────┐ ║
║  │  Recent Activity (All Tokens)             [Filter ▼]      │ ║
║  ├───────────────────────────────────────────────────────────┤ ║
║  │  🔽 Received 100.00 BZR from 5FHne...M694ty              │ ║
║  │     2 minutes ago                                         │ ║
║  │  ─────────────────────────────────────────────────────── │ ║
║  │  🔼 Sent 50.00 ZARI to 5FLSi...Sg2mp                     │ ║
║  │     1 hour ago                                            │ ║
║  │  ─────────────────────────────────────────────────────── │ ║
║  │  🔽 Received 1,000.00 ZARI from 5GrwvaEF...utQY          │ ║
║  │     Yesterday                                             │ ║
║  │                                                            │ ║
║  │  [Load More...]                                           │ ║
║  └───────────────────────────────────────────────────────────┘ ║
╚════════════════════════════════════════════════════════════════╝
```

**Decisões de UX**:

1. **BZR sempre primeiro**: Token nativo tem prioridade visual
2. **Card expansível**: Cada token em Card separado para clareza
3. **Badge de tipo**: "Native Asset" vs "Governance Token" (i18n)
4. **Ações inline**: Botões de ação dentro do card (não dropdown)
5. **Reserved destacado**: Mostra balance total E disponível (transparência)
6. **Remove apenas ZARI**: BZR nativo não pode ser removido

---

### Wireframe 2: SendPage - Token Selector

```
╔════════════════════════════════════════════════════════════════╗
║  Send                                          [← Back]         ║
╠════════════════════════════════════════════════════════════════╣
║                                                                 ║
║  ┌───────────────────────────────────────────────────────────┐ ║
║  │  Select Token                                              │ ║
║  ├───────────────────────────────────────────────────────────┤ ║
║  │                                                            │ ║
║  │  ╔══════════════════════════════════════════════════════╗ │ ║
║  │  ║  💎 BZR (Native Asset)                    [Selected] ║ │ ║
║  │  ║  Available: 1,234,557.89 BZR                         ║ │ ║
║  │  ╚══════════════════════════════════════════════════════╝ │ ║
║  │                                                            │ ║
║  │  ┌──────────────────────────────────────────────────────┐ │ ║
║  │  │  🏛️ ZARI (Governance Token)                          │ │ ║
║  │  │  Available: 500,000.00 ZARI                          │ │ ║
║  │  └──────────────────────────────────────────────────────┘ │ ║
║  │                                                            │ ║
║  └───────────────────────────────────────────────────────────┘ ║
║                                                                 ║
║  ┌───────────────────────────────────────────────────────────┐ ║
║  │  Transfer Details                                          │ ║
║  ├───────────────────────────────────────────────────────────┤ ║
║  │                                                            │ ║
║  │  To Address                                               │ ║
║  │  ┌────────────────────────────────────────────────────┐  │ ║
║  │  │ 5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty   │  │ ║
║  │  └────────────────────────────────────────────────────┘  │ ║
║  │  [📷 Scan QR] [📋 Paste] [📖 Address Book]               │ ║
║  │                                                            │ ║
║  │  Amount (BZR)                                             │ ║
║  │  ┌────────────────────────────────────────────────────┐  │ ║
║  │  │ 100.00                                              │  │ ║
║  │  └────────────────────────────────────────────────────┘  │ ║
║  │  [Max] Available: 1,234,557.89 BZR                       │ ║
║  │                                                            │ ║
║  │  Transaction Fee: ~0.01 BZR                               │ ║
║  │                                                            │ ║
║  │  ┌────────────────────────────────────────────────────┐  │ ║
║  │  │                  [Send 100.00 BZR]                  │  │ ║
║  │  └────────────────────────────────────────────────────┘  │ ║
║  │                                                            │ ║
║  └───────────────────────────────────────────────────────────┘ ║
╚════════════════════════════════════════════════════════════════╝
```

**Decisões de UX**:

1. **Token selection no topo**: Escolha de token antes de endereço (fluxo lógico)
2. **Selected state visível**: Border destacado + badge "Selected"
3. **Available balance inline**: Usuário vê saldo disponível ao selecionar token
4. **Label dinâmico**: "Amount (BZR)" ou "Amount (ZARI)" conforme seleção
5. **Fee em BZR sempre**: Mesmo enviando ZARI, fee é pago em BZR nativo
6. **Max button**: Atalho para enviar todo saldo disponível

---

### Wireframe 3: Token Add Dialog

```
╔═══════════════════════════════════════════════════════════╗
║  Add Token                                        [✖ Close] ║
╠═══════════════════════════════════════════════════════════╣
║                                                            ║
║  Add a custom token to your wallet by entering its        ║
║  Asset ID. You can find Asset IDs in the Polkadot.js      ║
║  Apps explorer.                                            ║
║                                                            ║
║  ┌────────────────────────────────────────────────────┐  ║
║  │  Asset ID                                           │  ║
║  │  ┌──────────────────────────────────────────────┐  │  ║
║  │  │ 1                                             │  │  ║
║  │  └──────────────────────────────────────────────┘  │  ║
║  │  Enter asset ID (e.g., 1, 2, 3...)                 │  ║
║  └────────────────────────────────────────────────────┘  ║
║                                                            ║
║  [Check Asset]                                             ║
║                                                            ║
║  ┌────────────────────────────────────────────────────┐  ║
║  │  Preview                                            │  ║
║  ├────────────────────────────────────────────────────┤  ║
║  │  ✅ Asset Found                                     │  ║
║  │                                                     │  ║
║  │  🏛️ Bazari Governance Token (ZARI)                 │  ║
║  │  Decimals: 12                                       │  ║
║  │  Supply: 21,000,000.00 ZARI                        │  ║
║  │  Owner: 5GrwvaEF5z...cNoHGKutQY                    │  ║
║  │                                                     │  ║
║  │  Your Balance: 0.00 ZARI                           │  ║
║  └────────────────────────────────────────────────────┘  ║
║                                                            ║
║  [Cancel]                            [Add ZARI to Wallet] ║
║                                                            ║
╚═══════════════════════════════════════════════════════════╝
```

**Decisões de UX**:

1. **Two-step process**: Check antes de Add (evita adicionar IDs inválidos)
2. **Preview completo**: Mostra metadata ANTES de confirmar
3. **Balance inicial**: Exibe balance mesmo se zero (transparência)
4. **Error states**: "Asset not found", "Invalid ID", "Already added"
5. **Success feedback**: Toast notification ao adicionar

---

### Wireframe 4: Mobile - Tokens List (320px width)

```
┌──────────────────────────┐
│  Wallet          [↻]     │
├──────────────────────────┤
│                          │
│ 5GrwvaEF5z...utQY [📋]  │
│                          │
│ ┌────────────────────── │
│ │ My Tokens   [+]      │
│ ├──────────────────────┤
│ │                      │
│ │ ┌───────────────────┐│
│ │ │💎 BZR            ││
│ │ │ 1,234,567.89 BZR  ││
│ │ │ [↓][↑][📊]       ││
│ │ └───────────────────┘│
│ │                      │
│ │ ┌───────────────────┐│
│ │ │🏛️ ZARI           ││
│ │ │ 500,000.00 ZARI   ││
│ │ │ [↓][↑][📊][✖]   ││
│ │ └───────────────────┘│
│ │                      │
│ └──────────────────────┘
│                          │
│ ┌────────────────────── │
│ │ Activity     [▼]     │
│ ├──────────────────────┤
│ │ 🔽 +100 BZR         │
│ │    2 min ago         │
│ │ ────────────────────│
│ │ 🔼 -50 ZARI         │
│ │    1h ago            │
│ └──────────────────────┘
│                          │
└──────────────────────────┘
```

**Decisões de UX Mobile**:

1. **Stack layout**: Cards empilhados (não grid)
2. **Botões icônicos**: Sem labels para economizar espaço
3. **Address truncado**: Mostra apenas início/fim
4. **Scrollable**: Lista vertical (não tabs horizontais)

---

## 🔧 IMPLEMENTAÇÃO TÉCNICA

### 1. Novo Componente: TokenList

**Arquivo**: `/root/bazari/apps/web/src/modules/wallet/components/TokenList.tsx`

**Props Interface**:
```typescript
interface TokenListProps {
  /** Lista de tokens a exibir */
  tokens: WalletToken[];
  /** Balances mapeados por assetId */
  balances: Record<string, BalanceSnapshot | null>;
  /** Callback ao clicar em Receive */
  onReceive: (token: WalletToken) => void;
  /** Callback ao clicar em Send */
  onSend: (token: WalletToken) => void;
  /** Callback ao clicar em History */
  onHistory: (token: WalletToken) => void;
  /** Callback ao remover token (apenas assets, não native) */
  onRemove?: (token: WalletToken) => void;
  /** Loading state */
  loading?: boolean;
}
```

**Estrutura JSX**:
```tsx
<div className="space-y-4">
  {tokens.map((token) => (
    <Card key={token.assetId}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {/* Icon (Diamond for BZR, Building for ZARI) */}
            <div className="text-3xl">{getTokenIcon(token)}</div>
            <div>
              <CardTitle className="text-xl">
                {token.symbol}
                <Badge className="ml-2">{token.type}</Badge>
              </CardTitle>
              <CardDescription>{token.name}</CardDescription>
            </div>
          </div>
          {token.assetId !== 'native' && onRemove && (
            <Button variant="ghost" size="sm" onClick={() => onRemove(token)}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <Skeleton className="h-20 w-full" />
        ) : (
          <div className="space-y-2">
            <BalanceRow
              label={t('wallet.balance')}
              amount={balance.free + balance.reserved}
              symbol={token.symbol}
              decimals={token.decimals}
            />
            {balance.reserved > 0n && (
              <BalanceRow
                label={t('wallet.reserved')}
                amount={balance.reserved}
                symbol={token.symbol}
                decimals={token.decimals}
                muted
              />
            )}
            <BalanceRow
              label={t('wallet.available')}
              amount={balance.free}
              symbol={token.symbol}
              decimals={token.decimals}
              highlight
            />
          </div>
        )}
      </CardContent>

      <CardFooter className="gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onReceive(token)}
        >
          <ArrowDownToLine className="mr-2 h-4 w-4" />
          {t('wallet.receive')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onSend(token)}
        >
          <ArrowUpToLine className="mr-2 h-4 w-4" />
          {t('wallet.send')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onHistory(token)}
        >
          <History className="mr-2 h-4 w-4" />
          {t('wallet.history')}
        </Button>
      </CardFooter>
    </Card>
  ))}
</div>
```

**Helpers**:
```typescript
function getTokenIcon(token: WalletToken): string {
  if (token.assetId === 'native') return '💎'; // Diamond for BZR
  if (token.symbol === 'ZARI') return '🏛️'; // Classical building for governance
  return '🪙'; // Generic coin for other assets
}
```

---

### 2. Novo Componente: TokenSelector

**Arquivo**: `/root/bazari/apps/web/src/modules/wallet/components/TokenSelector.tsx`

**Props Interface**:
```typescript
interface TokenSelectorProps {
  /** Lista de tokens disponíveis */
  tokens: WalletToken[];
  /** Token atualmente selecionado */
  selectedToken: WalletToken | null;
  /** Callback ao selecionar token */
  onSelect: (token: WalletToken) => void;
  /** Balances para mostrar available */
  balances: Record<string, BalanceSnapshot | null>;
  /** Label customizado */
  label?: string;
}
```

**Estrutura JSX**:
```tsx
<div className="space-y-2">
  <Label>{label || t('wallet.selectToken')}</Label>
  <div className="grid gap-3">
    {tokens.map((token) => {
      const isSelected = selectedToken?.assetId === token.assetId;
      const balance = balances[token.assetId];

      return (
        <button
          key={token.assetId}
          onClick={() => onSelect(token)}
          className={cn(
            "flex items-center justify-between p-4",
            "border rounded-lg transition-all",
            "hover:bg-accent hover:text-accent-foreground",
            isSelected && "border-primary border-2 bg-primary/5"
          )}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">{getTokenIcon(token)}</span>
            <div className="text-left">
              <div className="font-semibold flex items-center gap-2">
                {token.symbol}
                {isSelected && (
                  <Badge variant="default" className="text-xs">
                    {t('wallet.selected')}
                  </Badge>
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                {token.name}
              </div>
            </div>
          </div>

          {balance && (
            <div className="text-right">
              <div className="text-sm text-muted-foreground">
                {t('wallet.available')}
              </div>
              <div className="font-mono">
                {formatBalance(balance.free, balance.decimals)} {token.symbol}
              </div>
            </div>
          )}
        </button>
      );
    })}
  </div>
</div>
```

---

### 3. Estender: tokens.store.ts

**Arquivo**: `/root/bazari/apps/web/src/modules/wallet/store/tokens.store.ts`

**Adicionar ao State**:
```typescript
export interface WalletToken {
  assetId: string;           // 'native' ou '1', '2', etc
  symbol: string;            // 'BZR', 'ZARI', etc
  name: string;              // Full name
  decimals: number;          // 12 for BZR/ZARI
  type: 'native' | 'asset';  // Tipo do token
  icon?: string;             // Emoji icon (optional)
}

interface TokensState {
  // Tokens por address
  tokens: Record<string, WalletToken[]>;

  // Actions
  addToken: (address: string, token: WalletToken) => void;
  removeToken: (address: string, assetId: string) => void;
  getTokens: (address: string) => WalletToken[];
  hasToken: (address: string, assetId: string) => boolean;
}
```

**Implementação**:
```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useTokensStore = create<TokensState>()(
  persist(
    (set, get) => ({
      tokens: {},

      addToken: (address, token) => {
        set((state) => {
          const existing = state.tokens[address] || [];

          // Evitar duplicatas
          if (existing.some((t) => t.assetId === token.assetId)) {
            return state;
          }

          return {
            tokens: {
              ...state.tokens,
              [address]: [...existing, token],
            },
          };
        });
      },

      removeToken: (address, assetId) => {
        set((state) => {
          const existing = state.tokens[address] || [];

          // Não permitir remover native
          if (assetId === 'native') {
            return state;
          }

          return {
            tokens: {
              ...state.tokens,
              [address]: existing.filter((t) => t.assetId !== assetId),
            },
          };
        });
      },

      getTokens: (address) => {
        const tokens = get().tokens[address] || [];

        // BZR nativo sempre presente e primeiro
        const native: WalletToken = {
          assetId: 'native',
          symbol: 'BZR',
          name: 'Bazari Token',
          decimals: 12,
          type: 'native',
          icon: '💎',
        };

        // Se BZR já não está na lista, adicionar
        if (!tokens.some((t) => t.assetId === 'native')) {
          return [native, ...tokens];
        }

        // Garantir BZR primeiro
        const sorted = [...tokens];
        sorted.sort((a, b) => {
          if (a.assetId === 'native') return -1;
          if (b.assetId === 'native') return 1;
          return 0;
        });

        return sorted;
      },

      hasToken: (address, assetId) => {
        const tokens = get().tokens[address] || [];
        return tokens.some((t) => t.assetId === assetId);
      },
    }),
    {
      name: 'bazari-wallet-tokens', // LocalStorage key
    }
  )
);

// Hooks convenientes
export const useTokens = (address: string | null) => {
  const getTokens = useTokensStore((state) => state.getTokens);
  return address ? getTokens(address) : [];
};

export const useHasToken = (address: string | null, assetId: string) => {
  const hasToken = useTokensStore((state) => state.hasToken);
  return address ? hasToken(address, assetId) : false;
};

export const addToken = useTokensStore.getState().addToken;
export const removeToken = useTokensStore.getState().removeToken;
```

---

### 4. Estender: services/assets.ts

**Arquivo**: `/root/bazari/apps/web/src/modules/wallet/services/assets.ts`

**Adicionar Queries**:
```typescript
import { getApi } from './polkadot';

export interface AssetMetadata {
  assetId: string;
  name: string;
  symbol: string;
  decimals: number;
  supply?: bigint;
  owner?: string;
  isSufficient?: boolean;
}

/**
 * Busca metadata de um asset
 */
export async function fetchAssetMetadata(
  assetId: string | number
): Promise<AssetMetadata | null> {
  try {
    const api = await getApi();
    const id = assetId.toString();

    // Query metadata
    const metadata: any = await api.query.assets.metadata(id);

    if (!metadata || metadata.isEmpty) {
      return null;
    }

    // Query asset details (para supply e owner)
    const details: any = await api.query.assets.asset(id);

    return {
      assetId: id,
      name: metadata.name?.toUtf8() || '',
      symbol: metadata.symbol?.toUtf8() || '',
      decimals: metadata.decimals?.toNumber() || 0,
      supply: details.isSome ? BigInt(details.unwrap().supply.toString()) : undefined,
      owner: details.isSome ? details.unwrap().owner.toString() : undefined,
      isSufficient: details.isSome ? details.unwrap().isSufficient?.isTrue : undefined,
    };
  } catch (error) {
    console.error('[assets] Failed to fetch metadata:', error);
    return null;
  }
}

/**
 * Lista todos os assets existentes (limit 100 para não travar UI)
 */
export async function listAssets(limit = 100): Promise<AssetMetadata[]> {
  try {
    const api = await getApi();

    // Query assets entries (limitado)
    const entries = await api.query.assets.asset.entries();

    const assets: AssetMetadata[] = [];

    for (let i = 0; i < Math.min(entries.length, limit); i++) {
      const [key, value] = entries[i];
      const assetId = key.args[0].toString();

      const metadata = await fetchAssetMetadata(assetId);
      if (metadata) {
        assets.push(metadata);
      }
    }

    return assets;
  } catch (error) {
    console.error('[assets] Failed to list assets:', error);
    return [];
  }
}
```

---

### 5. Modificar: WalletDashboard.tsx

**Mudanças Principais**:

1. **Importar novos componentes**:
```typescript
import { TokenList } from '../components/TokenList';
import { TokenSelector } from '../components/TokenSelector';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
```

2. **State para Add Token Dialog**:
```typescript
const [addTokenOpen, setAddTokenOpen] = useState(false);
const [assetIdInput, setAssetIdInput] = useState('');
const [assetPreview, setAssetPreview] = useState<AssetMetadata | null>(null);
const [assetChecking, setAssetChecking] = useState(false);
const [assetError, setAssetError] = useState<string | null>(null);
```

3. **Substituir balance display por TokenList**:
```tsx
{/* ANTES: Balance simples */}
<Card>
  <CardHeader>
    <CardTitle>Balance</CardTitle>
  </CardHeader>
  <CardContent>
    <div>{nativeBalance ? formatBalance(nativeBalance.free) : '...'}</div>
  </CardContent>
</Card>

{/* DEPOIS: TokenList completo */}
<Card>
  <CardHeader>
    <div className="flex items-center justify-between">
      <CardTitle>{t('wallet.myTokens')}</CardTitle>
      <Button variant="outline" size="sm" onClick={() => setAddTokenOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        {t('wallet.addToken')}
      </Button>
    </div>
  </CardHeader>
  <CardContent>
    <TokenList
      tokens={tokens}
      balances={balances}
      onReceive={(token) => navigate(`/app/wallet/receive?token=${token.assetId}`)}
      onSend={(token) => navigate(`/app/wallet/send?token=${token.assetId}`)}
      onHistory={(token) => {/* filter history */}}
      onRemove={(token) => removeToken(activeAddress!, token.assetId)}
      loading={loading}
    />
  </CardContent>
</Card>
```

4. **Add Token Dialog**:
```tsx
<Dialog open={addTokenOpen} onOpenChange={setAddTokenOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>{t('wallet.addToken')}</DialogTitle>
    </DialogHeader>

    <div className="space-y-4">
      <div>
        <Label htmlFor="assetId">{t('wallet.assetId')}</Label>
        <Input
          id="assetId"
          type="number"
          placeholder="1"
          value={assetIdInput}
          onChange={(e) => setAssetIdInput(e.target.value)}
        />
        <p className="text-sm text-muted-foreground mt-1">
          {t('wallet.assetIdHelp')}
        </p>
      </div>

      <Button
        onClick={handleCheckAsset}
        disabled={!assetIdInput || assetChecking}
      >
        {assetChecking ? t('common.checking') : t('wallet.checkAsset')}
      </Button>

      {assetPreview && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('wallet.preview')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="default">{t('common.found')}</Badge>
            </div>
            <div>
              <strong>{assetPreview.name}</strong> ({assetPreview.symbol})
            </div>
            <div className="text-sm text-muted-foreground">
              {t('wallet.decimals')}: {assetPreview.decimals}
            </div>
            {assetPreview.supply && (
              <div className="text-sm text-muted-foreground">
                {t('wallet.supply')}: {formatBalance(assetPreview.supply, assetPreview.decimals)}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {assetError && (
        <Alert variant="destructive">
          <AlertDescription>{assetError}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => setAddTokenOpen(false)}>
          {t('common.cancel')}
        </Button>
        <Button
          onClick={handleAddToken}
          disabled={!assetPreview}
        >
          {t('wallet.addToWallet', { symbol: assetPreview?.symbol })}
        </Button>
      </div>
    </div>
  </DialogContent>
</Dialog>
```

5. **Handler functions**:
```typescript
const handleCheckAsset = async () => {
  setAssetChecking(true);
  setAssetError(null);
  setAssetPreview(null);

  try {
    const metadata = await fetchAssetMetadata(assetIdInput);

    if (!metadata) {
      setAssetError(t('wallet.assetNotFound'));
      return;
    }

    // Verificar se já foi adicionado
    if (hasToken(activeAddress!, metadata.assetId)) {
      setAssetError(t('wallet.assetAlreadyAdded'));
      return;
    }

    setAssetPreview(metadata);
  } catch (error) {
    setAssetError(t('wallet.assetCheckFailed'));
  } finally {
    setAssetChecking(false);
  }
};

const handleAddToken = () => {
  if (!assetPreview || !activeAddress) return;

  const token: WalletToken = {
    assetId: assetPreview.assetId,
    symbol: assetPreview.symbol,
    name: assetPreview.name,
    decimals: assetPreview.decimals,
    type: 'asset',
    icon: assetPreview.symbol === 'ZARI' ? '🏛️' : '🪙',
  };

  addToken(activeAddress, token);

  // Success toast
  toast.success(t('wallet.tokenAdded', { symbol: token.symbol }));

  // Reset dialog
  setAddTokenOpen(false);
  setAssetIdInput('');
  setAssetPreview(null);
};
```

---

### 6. Modificar: SendPage.tsx

**Mudanças Principais**:

1. **Query param para pre-select token**:
```typescript
const [searchParams] = useSearchParams();
const preselectedTokenId = searchParams.get('token') || 'native';
```

2. **State para token selecionado**:
```typescript
const [selectedToken, setSelectedToken] = useState<WalletToken | null>(null);
```

3. **Adicionar TokenSelector no início do form**:
```tsx
<TokenSelector
  tokens={tokens}
  selectedToken={selectedToken}
  onSelect={setSelectedToken}
  balances={balances}
  label={t('wallet.selectToken')}
/>

{selectedToken && (
  <>
    {/* Existing form fields... */}
    <div>
      <Label htmlFor="address">{t('wallet.toAddress')}</Label>
      <Input id="address" placeholder="5FHne..." />
    </div>

    <div>
      <Label htmlFor="amount">
        {t('wallet.amount', { symbol: selectedToken.symbol })}
      </Label>
      <Input id="amount" type="number" placeholder="0.00" />
      <div className="flex justify-between mt-1 text-sm text-muted-foreground">
        <Button variant="link" size="sm">
          {t('wallet.max')}
        </Button>
        <span>
          {t('wallet.available')}: {formatBalance(availableBalance)} {selectedToken.symbol}
        </span>
      </div>
    </div>

    {/* Fee sempre em BZR */}
    <div className="text-sm text-muted-foreground">
      {t('wallet.transactionFee')}: ~0.01 BZR
    </div>

    <Button size="lg" className="w-full">
      {t('wallet.send', { amount: formattedAmount, symbol: selectedToken.symbol })}
    </Button>
  </>
)}
```

4. **Lógica de submit**:
```typescript
const handleSubmit = async () => {
  if (!selectedToken || !activeAddress) return;

  try {
    const api = await getApi();

    if (selectedToken.assetId === 'native') {
      // BZR transfer (existing logic)
      await api.tx.balances
        .transferKeepAlive(recipientAddress, amountPlanck)
        .signAndSend(activeAddress);
    } else {
      // Asset transfer (ZARI ou outros)
      await api.tx.assets
        .transfer(selectedToken.assetId, recipientAddress, amountPlanck)
        .signAndSend(activeAddress);
    }

    toast.success(t('wallet.transferSuccess'));
    navigate('/app/wallet');
  } catch (error) {
    toast.error(t('wallet.transferFailed'));
  }
};
```

---

### 7. i18n Updates

**Arquivo**: `/root/bazari/apps/web/src/i18n/pt.json`

**Adicionar strings**:
```json
{
  "wallet": {
    "myTokens": "Meus Tokens",
    "addToken": "Adicionar Token",
    "selectToken": "Selecionar Token",
    "selected": "Selecionado",
    "assetId": "Asset ID",
    "assetIdHelp": "Digite o ID do asset (ex: 1, 2, 3...)",
    "checkAsset": "Verificar Asset",
    "preview": "Preview",
    "decimals": "Decimais",
    "supply": "Supply Total",
    "assetNotFound": "Asset não encontrado",
    "assetAlreadyAdded": "Token já adicionado",
    "assetCheckFailed": "Falha ao verificar asset",
    "tokenAdded": "{{symbol}} adicionado com sucesso",
    "addToWallet": "Adicionar {{symbol}} à Carteira",
    "nativeAsset": "Ativo Nativo",
    "governanceToken": "Token de Governança",
    "amount": "Valor ({{symbol}})",
    "send": "Enviar {{amount}} {{symbol}}",
    "balance": "Saldo",
    "reserved": "Reservado",
    "available": "Disponível",
    "transactionFee": "Taxa de Transação"
  }
}
```

**Arquivo**: `/root/bazari/apps/web/src/i18n/en.json`

```json
{
  "wallet": {
    "myTokens": "My Tokens",
    "addToken": "Add Token",
    "selectToken": "Select Token",
    "selected": "Selected",
    "assetId": "Asset ID",
    "assetIdHelp": "Enter the asset ID (e.g., 1, 2, 3...)",
    "checkAsset": "Check Asset",
    "preview": "Preview",
    "decimals": "Decimals",
    "supply": "Total Supply",
    "assetNotFound": "Asset not found",
    "assetAlreadyAdded": "Token already added",
    "assetCheckFailed": "Failed to check asset",
    "tokenAdded": "{{symbol}} added successfully",
    "addToWallet": "Add {{symbol}} to Wallet",
    "nativeAsset": "Native Asset",
    "governanceToken": "Governance Token",
    "amount": "Amount ({{symbol}})",
    "send": "Send {{amount}} {{symbol}}",
    "balance": "Balance",
    "reserved": "Reserved",
    "available": "Available",
    "transactionFee": "Transaction Fee"
  }
}
```

**Arquivo**: `/root/bazari/apps/web/src/i18n/es.json`

```json
{
  "wallet": {
    "myTokens": "Mis Tokens",
    "addToken": "Añadir Token",
    "selectToken": "Seleccionar Token",
    "selected": "Seleccionado",
    "assetId": "ID del Asset",
    "assetIdHelp": "Ingresa el ID del asset (ej: 1, 2, 3...)",
    "checkAsset": "Verificar Asset",
    "preview": "Vista Previa",
    "decimals": "Decimales",
    "supply": "Suministro Total",
    "assetNotFound": "Asset no encontrado",
    "assetAlreadyAdded": "Token ya añadido",
    "assetCheckFailed": "Error al verificar asset",
    "tokenAdded": "{{symbol}} añadido con éxito",
    "addToWallet": "Añadir {{symbol}} a la Billetera",
    "nativeAsset": "Activo Nativo",
    "governanceToken": "Token de Gobernanza",
    "amount": "Cantidad ({{symbol}})",
    "send": "Enviar {{amount}} {{symbol}}",
    "balance": "Saldo",
    "reserved": "Reservado",
    "available": "Disponible",
    "transactionFee": "Tasa de Transacción"
  }
}
```

---

## 🧪 TESTES E VALIDAÇÃO

### Checklist de Testes

#### Funcionalidade (Unit Tests)

**tokens.store.ts**:
- [ ] `addToken()` adiciona token corretamente
- [ ] `addToken()` evita duplicatas (mesmo assetId)
- [ ] `removeToken()` remove asset (mas não native)
- [ ] `getTokens()` sempre retorna BZR primeiro
- [ ] LocalStorage persistence funciona

**services/assets.ts**:
- [ ] `fetchAssetMetadata(1)` retorna ZARI correto
- [ ] `fetchAssetMetadata(999)` retorna null (não existe)
- [ ] `listAssets()` retorna lista limitada (max 100)

#### UI/UX (E2E Tests - Playwright)

**WalletDashboard**:
- [ ] BZR card aparece primeiro
- [ ] ZARI card aparece após adicionar
- [ ] Botão "Add Token" abre dialog
- [ ] Dialog "Check Asset" valida ID
- [ ] Dialog "Add to Wallet" adiciona com sucesso
- [ ] Botão "Remove" remove ZARI (mas não BZR)
- [ ] Balances atualizam em tempo real (subscriptions)

**SendPage**:
- [ ] TokenSelector mostra BZR + ZARI
- [ ] Selecionar BZR mostra "Amount (BZR)"
- [ ] Selecionar ZARI mostra "Amount (ZARI)"
- [ ] Fee sempre mostra "~0.01 BZR"
- [ ] Botão "Max" preenche saldo disponível
- [ ] Submit BZR usa `balances.transferKeepAlive`
- [ ] Submit ZARI usa `assets.transfer`

#### Responsividade (Visual Tests)

- [ ] Desktop (1920px): Grid 2 columns
- [ ] Tablet (768px): Grid 1 column, cards maiores
- [ ] Mobile (375px): Stack vertical, botões icônicos
- [ ] Mobile landscape (667px): Cards compactos

#### Acessibilidade (a11y Tests)

- [ ] TokenSelector: Keyboard navigation (Tab, Enter)
- [ ] Dialog: Escape fecha, Focus trap funciona
- [ ] Cards: Hover states claros
- [ ] Buttons: ARIA labels corretos
- [ ] Color contrast: WCAG AA compliant (4.5:1)

#### Temas (Visual Regression)

- [ ] Bazari theme: Red + Gold colors
- [ ] Night theme: Dark background
- [ ] Sandstone theme: Light paper colors
- [ ] Emerald theme: Green accents
- [ ] Royal theme: Purple/Blue
- [ ] Cyber theme: Neon colors

---

## 📋 CHECKLIST DE CONCLUSÃO

### Pré-Execução
- [ ] FASE 3 validada manualmente (ZARI existe on-chain)
- [ ] Node dev rodando e acessível
- [ ] Frontend compila sem erros

### Durante Execução
- [ ] TokenList component criado e testado
- [ ] TokenSelector component criado e testado
- [ ] tokens.store.ts estendido com persist
- [ ] services/assets.ts com fetchAssetMetadata
- [ ] WalletDashboard.tsx modificado (Add Token dialog)
- [ ] SendPage.tsx modificado (Token selector)
- [ ] i18n atualizado (PT/EN/ES)
- [ ] Código compila sem erros TypeScript
- [ ] Testes unitários passam
- [ ] Testes E2E passam

### Validação Manual
- [ ] Wallet mostra BZR primeiro
- [ ] "Add Token" dialog funciona
- [ ] ZARI adicionado com sucesso
- [ ] Balances BZR + ZARI corretos
- [ ] Send BZR funciona
- [ ] Send ZARI funciona
- [ ] Remove ZARI funciona (mas não BZR)
- [ ] Mobile responsive
- [ ] 6 temas funcionam

### Pós-Execução
- [ ] Commit das mudanças
- [ ] Tag de versão: `v0.4.0-multi-token-wallet`
- [ ] Relatório de execução criado
- [ ] Screenshots/video de demo criados

---

## ⚠️ RISCOS E MITIGAÇÕES

### Risco 1: Performance com Muitos Tokens (Baixo)

**Descrição**: Usuário adiciona 50+ tokens, UI fica lenta.

**Mitigação**:
- Usar `react-window` para virtualização de lista (se > 20 tokens)
- Lazy load balances (apenas tokens visíveis)
- Debounce subscriptions (max 1 update/segundo)

**Plano B**: Limitar a 20 tokens por wallet, mostrar warning.

---

### Risco 2: Asset Metadata Inválido (Médio)

**Descrição**: Asset existe mas metadata está corrompido.

**Mitigação**:
- Try/catch em `fetchAssetMetadata`
- Fallback: mostrar "Unknown Token (Asset #1)"
- Validação: decimals entre 0-18, symbol max 10 chars

**Plano B**: Permitir edição manual de metadata (localStorage override).

---

### Risco 3: Regressão BZR (Baixo)

**Descrição**: Mudanças quebram funcionalidade BZR existente.

**Mitigação**:
- Testes de regressão automatizados
- BZR sempre primeiro na lista (hard-coded)
- Não permitir remoção de BZR

**Plano B**: Rollback para branch anterior se detectado.

---

### Risco 4: UX Confusa para Iniciantes (Médio)

**Descrição**: Usuários não entendem diferença BZR/ZARI.

**Mitigação**:
- Badges explicativos: "Native Asset", "Governance Token"
- Tooltip em "Add Token" explicando o que é
- Tutorial opcional (first-time user)

**Plano B**: Esconder "Add Token" por padrão, mostrar apenas após user request.

---

## 📚 REFERÊNCIAS

### Design System
- **shadcn/ui**: https://ui.shadcn.com/docs/components
- **Tailwind CSS**: https://tailwindcss.com/docs
- **Radix UI**: https://www.radix-ui.com/primitives (base de shadcn)

### Padrões de UX
- **Multi-currency wallets**: MetaMask, Trust Wallet, Phantom
- **Token lists**: Uniswap token selector
- **Balance display**: Polkadot.js Apps

### Arquivos do Projeto
- WalletDashboard atual: `/root/bazari/apps/web/src/modules/wallet/pages/WalletDashboard.tsx`
- Balance services: `/root/bazari/apps/web/src/modules/wallet/services/balances.ts`
- Tailwind config: `/root/bazari/apps/web/tailwind.config.js`

---

## 🎬 PRÓXIMA FASE

**FASE 5: P2P Extension (Backend)**

**Dependências**:
- ✅ FASE 1: BZR Rename (Blockchain)
- ✅ FASE 3: ZARI Token (Blockchain)
- ✅ FASE 4: Multi-Token Wallet (Frontend) ← Esta fase

**Escopo**:
- Backend suporta ofertas ZARI além de BZR
- Schema Prisma estendido (assetType, offerType, daoControlled)
- API `/api/p2p/offers?assetType=ZARI`
- Lógica de preços por fase (2A: 0.25, 2B: 0.35, 3: 0.50 BZR)
- Escrow multi-asset

**Duração**: 2 semanas
**Risco**: 🟡 Médio

---

*Especificação criada em: 27/Out/2025*
*Versão: 1.0*
*Autor: Claude Code Agent*
