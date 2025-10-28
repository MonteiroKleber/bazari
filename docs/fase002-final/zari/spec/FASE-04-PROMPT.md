# 🤖 PROMPT EXECUTÁVEL: FASE 4 - Multi-Token Wallet (Frontend)

**Para**: Claude Code Agent
**Contexto**: Estender wallet para suportar BZR + ZARI + assets futuros
**Tempo Estimado**: 8-12 horas de execução
**Pré-requisito**: FASE 3 completa (ZARI no blockchain)

---

## 📋 CONTEXTO RÁPIDO

**Objetivo**: Wallet mostra BZR + ZARI, permite adicionar tokens via Asset ID, enviar qualquer token.

**Design System**: shadcn/ui + Tailwind + 6 temas CSS variables

**Arquivos Chave**:
- `modules/wallet/pages/WalletDashboard.tsx` - Principal (modificar)
- `modules/wallet/pages/SendPage.tsx` - Enviar (modificar)
- `modules/wallet/store/tokens.store.ts` - Token management (estender)
- `modules/wallet/services/assets.ts` - Asset queries (estender)

---

## 🎯 PASSOS DE EXECUÇÃO

### PASSO 1: Criar TokenList Component (2h)

**Arquivo**: `apps/web/src/modules/wallet/components/TokenList.tsx`

**Interface**:
```typescript
interface TokenListProps {
  tokens: WalletToken[];
  balances: Record<string, BalanceSnapshot | null>;
  onReceive: (token: WalletToken) => void;
  onSend: (token: WalletToken) => void;
  onHistory: (token: WalletToken) => void;
  onRemove?: (token: WalletToken) => void;
  loading?: boolean;
}
```

**Estrutura JSX** (seguir spec FASE-04 seção "1. Novo Componente: TokenList"):
- Card por token
- Icon (💎 BZR, 🏛️ ZARI, 🪙 outros)
- Badge com tipo ("Native Asset", "Governance Token")
- Balance: Free + Reserved + Available
- Botões: Receive, Send, History, Remove (só assets)
- Skeleton loading state

**Imports**:
```typescript
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowDownToLine, ArrowUpToLine, History, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { WalletToken, BalanceSnapshot } from '../types';
```

**Validação**: Componente compila e renderiza vazio sem erros.

---

### PASSO 2: Criar TokenSelector Component (1.5h)

**Arquivo**: `apps/web/src/modules/wallet/components/TokenSelector.tsx`

**Interface**:
```typescript
interface TokenSelectorProps {
  tokens: WalletToken[];
  selectedToken: WalletToken | null;
  onSelect: (token: WalletToken) => void;
  balances: Record<string, BalanceSnapshot | null>;
  label?: string;
}
```

**Estrutura JSX** (seguir spec FASE-04 seção "2. Novo Componente: TokenSelector"):
- Botões clicáveis (não Select/Dropdown)
- Border destaque quando selecionado
- Badge "Selected"
- Available balance no canto direito
- Responsive (stack em mobile)

**Validação**: Componente compila e permite seleção.

---

### PASSO 3: Estender tokens.store.ts (2h)

**Arquivo**: `apps/web/src/modules/wallet/store/tokens.store.ts`

**Adicionar**:

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface WalletToken {
  assetId: string;
  symbol: string;
  name: string;
  decimals: number;
  type: 'native' | 'asset';
  icon?: string;
}

interface TokensState {
  tokens: Record<string, WalletToken[]>;
  addToken: (address: string, token: WalletToken) => void;
  removeToken: (address: string, assetId: string) => void;
  getTokens: (address: string) => WalletToken[];
  hasToken: (address: string, assetId: string) => boolean;
}

export const useTokensStore = create<TokensState>()(
  persist(
    (set, get) => ({
      tokens: {},

      addToken: (address, token) => {
        set((state) => {
          const existing = state.tokens[address] || [];
          if (existing.some((t) => t.assetId === token.assetId)) return state;
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
          if (assetId === 'native') return state;
          const existing = state.tokens[address] || [];
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
        const native: WalletToken = {
          assetId: 'native',
          symbol: 'BZR',
          name: 'Bazari Token',
          decimals: 12,
          type: 'native',
          icon: '💎',
        };

        if (!tokens.some((t) => t.assetId === 'native')) {
          return [native, ...tokens];
        }

        return [...tokens].sort((a, b) =>
          a.assetId === 'native' ? -1 : b.assetId === 'native' ? 1 : 0
        );
      },

      hasToken: (address, assetId) => {
        return (get().tokens[address] || []).some((t) => t.assetId === assetId);
      },
    }),
    { name: 'bazari-wallet-tokens' }
  )
);

export const useTokens = (address: string | null) => {
  const getTokens = useTokensStore((state) => state.getTokens);
  return address ? getTokens(address) : [];
};

export const addToken = useTokensStore.getState().addToken;
export const removeToken = useTokensStore.getState().removeToken;
```

**Validação**: Store persiste em localStorage, BZR sempre primeiro.

---

### PASSO 4: Estender services/assets.ts (1.5h)

**Arquivo**: `apps/web/src/modules/wallet/services/assets.ts`

**Adicionar funções**:

```typescript
import { getApi } from './polkadot';

export interface AssetMetadata {
  assetId: string;
  name: string;
  symbol: string;
  decimals: number;
  supply?: bigint;
  owner?: string;
}

export async function fetchAssetMetadata(
  assetId: string | number
): Promise<AssetMetadata | null> {
  try {
    const api = await getApi();
    const id = assetId.toString();

    const metadata: any = await api.query.assets.metadata(id);
    if (!metadata || metadata.isEmpty) return null;

    const details: any = await api.query.assets.asset(id);

    return {
      assetId: id,
      name: metadata.name?.toUtf8() || '',
      symbol: metadata.symbol?.toUtf8() || '',
      decimals: metadata.decimals?.toNumber() || 0,
      supply: details.isSome ? BigInt(details.unwrap().supply.toString()) : undefined,
      owner: details.isSome ? details.unwrap().owner.toString() : undefined,
    };
  } catch (error) {
    console.error('[assets] Failed to fetch metadata:', error);
    return null;
  }
}
```

**Validação**: `fetchAssetMetadata(1)` retorna ZARI corretamente.

---

### PASSO 5: Modificar WalletDashboard.tsx (3h)

**Arquivo**: `apps/web/src/modules/wallet/pages/WalletDashboard.tsx`

**Mudanças**:

1. **Imports novos**:
```typescript
import { TokenList } from '../components/TokenList';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { fetchAssetMetadata } from '../services/assets';
import { addToken, removeToken, useTokens } from '../store/tokens.store';
import { toast } from 'sonner';
```

2. **State novo**:
```typescript
const [addTokenOpen, setAddTokenOpen] = useState(false);
const [assetIdInput, setAssetIdInput] = useState('');
const [assetPreview, setAssetPreview] = useState<AssetMetadata | null>(null);
const [assetChecking, setAssetChecking] = useState(false);
const [assetError, setAssetError] = useState<string | null>(null);

const tokens = useTokens(activeAddress);
```

3. **Substituir balance display**:
```tsx
{/* Antes: Balance simples */}
{/* Depois: */}
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
      onHistory={(token) => {/* TODO: filter history */}}
      onRemove={(token) => removeToken(activeAddress!, token.assetId)}
      loading={loading}
    />
  </CardContent>
</Card>
```

4. **Add Token Dialog** (seguir spec FASE-04 seção "5. Modificar: WalletDashboard.tsx"):
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
      </div>

      <Button onClick={handleCheckAsset} disabled={!assetIdInput || assetChecking}>
        {assetChecking ? t('common.checking') : t('wallet.checkAsset')}
      </Button>

      {assetPreview && (
        <Card>
          {/* Preview content */}
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
        <Button onClick={handleAddToken} disabled={!assetPreview}>
          {t('wallet.addToWallet')}
        </Button>
      </div>
    </div>
  </DialogContent>
</Dialog>
```

5. **Handlers** (seguir spec FASE-04 seção "5.5 Handler functions").

**Validação**: Dashboard compila, "Add Token" abre dialog, consegue adicionar ZARI.

---

### PASSO 6: Modificar SendPage.tsx (2h)

**Arquivo**: `apps/web/src/modules/wallet/pages/SendPage.tsx`

**Mudanças**:

1. **Imports novos**:
```typescript
import { TokenSelector } from '../components/TokenSelector';
import { useTokens } from '../store/tokens.store';
```

2. **State novo**:
```typescript
const [searchParams] = useSearchParams();
const preselectedTokenId = searchParams.get('token') || 'native';
const [selectedToken, setSelectedToken] = useState<WalletToken | null>(null);

const tokens = useTokens(activeAddress);

// Preselect token do query param
useEffect(() => {
  const token = tokens.find((t) => t.assetId === preselectedTokenId);
  if (token) setSelectedToken(token);
}, [tokens, preselectedTokenId]);
```

3. **Adicionar TokenSelector antes do form**:
```tsx
<TokenSelector
  tokens={tokens}
  selectedToken={selectedToken}
  onSelect={setSelectedToken}
  balances={balances}
/>

{selectedToken && (
  <form onSubmit={handleSubmit}>
    {/* Existing address + amount fields */}
    {/* Label dinâmico: Amount ({selectedToken.symbol}) */}
    {/* Fee: sempre "~0.01 BZR" */}
  </form>
)}
```

4. **Lógica de submit** (seguir spec FASE-04 seção "6.4 Lógica de submit"):
```typescript
if (selectedToken.assetId === 'native') {
  // BZR transfer
  await api.tx.balances.transferKeepAlive(recipient, amount).signAndSend(address);
} else {
  // Asset transfer
  await api.tx.assets.transfer(selectedToken.assetId, recipient, amount).signAndSend(address);
}
```

**Validação**: SendPage compila, permite selecionar BZR/ZARI, envia corretamente.

---

### PASSO 7: Atualizar i18n (1h)

**Arquivos**: `apps/web/src/i18n/{pt,en,es}.json`

**Adicionar strings** (seguir spec FASE-04 seção "7. i18n Updates"):

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
    "tokenAdded": "{{symbol}} adicionado com sucesso",
    "addToWallet": "Adicionar {{symbol}} à Carteira",
    "nativeAsset": "Ativo Nativo",
    "governanceToken": "Token de Governança",
    "amount": "Valor ({{symbol}})",
    "send": "Enviar {{amount}} {{symbol}}"
  }
}
```

**Repetir para EN e ES** (traduções na spec).

**Validação**: Strings aparecem traduzidas em PT/EN/ES.

---

### PASSO 8: Testes e Validação (1.5h)

#### 8.1: TypeScript Check

```bash
pnpm --filter @bazari/web typecheck
```

**Esperado**: Sem erros TypeScript.

#### 8.2: Build

```bash
pnpm --filter @bazari/web build
```

**Esperado**: Build completo sem erros.

#### 8.3: Testes Manuais

**Iniciar dev server**:
```bash
pnpm --filter @bazari/web dev
```

**Checklist**:
- [ ] `/app/wallet` mostra BZR card primeiro
- [ ] Botão "Adicionar Token" abre dialog
- [ ] Inserir "1" e "Verificar Asset" mostra ZARI preview
- [ ] "Adicionar ZARI à Carteira" adiciona com sucesso
- [ ] ZARI card aparece abaixo de BZR
- [ ] Clicar "Enviar" no BZR abre SendPage com BZR pré-selecionado
- [ ] Clicar "Enviar" no ZARI abre SendPage com ZARI pré-selecionado
- [ ] SendPage permite trocar entre BZR/ZARI
- [ ] Label muda "Valor (BZR)" ou "Valor (ZARI)"
- [ ] Fee sempre mostra "~0.01 BZR"
- [ ] Enviar BZR funciona (transaction submitted)
- [ ] Enviar ZARI funciona (transaction submitted)
- [ ] Remover ZARI funciona (card desaparece)
- [ ] BZR não tem botão remover
- [ ] Mobile (375px): Layout stack vertical
- [ ] Temas: Testar Bazari, Night, Sandstone

---

## ✅ CRITÉRIOS DE VALIDAÇÃO

### Compilação
- [ ] TypeScript sem erros
- [ ] Build produção completo
- [ ] Sem warnings críticos

### Funcionalidade
- [ ] TokenList renderiza BZR + ZARI
- [ ] TokenSelector permite seleção
- [ ] Add Token dialog funciona end-to-end
- [ ] Send BZR funciona
- [ ] Send ZARI funciona
- [ ] Remove ZARI funciona (mas não BZR)
- [ ] LocalStorage persiste tokens adicionados

### UX/UI
- [ ] Consistent com shadcn/ui design
- [ ] Responsive (320px - 1920px)
- [ ] Temas funcionam (6 temas)
- [ ] Loading states (Skeleton)
- [ ] Error states (Alert)
- [ ] Success feedback (Toast)

---

## 📝 ENTREGÁVEIS

### 1. Código Completo
- [ ] TokenList.tsx criado
- [ ] TokenSelector.tsx criado
- [ ] tokens.store.ts estendido
- [ ] services/assets.ts estendido
- [ ] WalletDashboard.tsx modificado
- [ ] SendPage.tsx modificado
- [ ] i18n atualizado (PT/EN/ES)

### 2. Relatório de Execução
**Arquivo**: `/root/bazari/docs/fase002-final/zari/spec/FASE-04-RELATORIO-EXECUCAO.md`

**Conteúdo**:
```markdown
# FASE 4: Multi-Token Wallet - Relatório de Execução

**Data**: [DATA]
**Status**: ✅ COMPLETA

## Resumo
[Descrição do que foi feito]

## Componentes Criados
- TokenList.tsx
- TokenSelector.tsx

## Arquivos Modificados
[Lista completa]

## Testes Executados
[Checklist acima]

## Screenshots
[Opcional: prints de wallet com BZR+ZARI]

## Próxima Fase
FASE 5: P2P Extension (Backend)
```

---

## ⚠️ TRATAMENTO DE ERROS

### Erro: `api.query.assets` não existe

**Causa**: Blockchain não tem pallet-assets

**Solução**: Executar FASE 3 primeiro (implementa ZARI no blockchain)

---

### Erro: Types incompatíveis (WalletToken vs Balance)

**Causa**: Interface não match

**Solução**: Verificar `BalanceSnapshot.assetId` é `string`, não `number`

---

### Erro: LocalStorage não persiste

**Causa**: Zustand persist não configurado

**Solução**: Verificar `{ name: 'bazari-wallet-tokens' }` em `persist()`

---

## 🎯 RESULTADO ESPERADO

Ao final, o frontend terá:

✅ **TokenList** mostrando BZR + ZARI lado a lado
✅ **Add Token** dialog funcional
✅ **TokenSelector** em SendPage
✅ **Transfers** BZR e ZARI funcionando
✅ **LocalStorage** persistence
✅ **UX consistente** com design system
✅ **Responsive** (mobile + desktop)
✅ **i18n completo** (PT/EN/ES)

**Próximo Passo**: FASE 5 - Backend suportará ofertas P2P de ZARI.

---

*Prompt criado em: 27/Out/2025*
*Versão: 1.0*
*Para: Claude Code Agent*
