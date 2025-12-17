# Feature 01: Nova Tab Saldos

## Objetivo

Criar uma pagina dedicada para exibicao de saldos, extraindo a logica existente do WalletDashboard.

## REGRA DE OURO

```
EXTRAIR, NAO REESCREVER
```

Toda a logica de saldos ja existe em WalletDashboard.tsx. O trabalho eh COPIAR o codigo existente.

## O Que Extrair do WalletDashboard

### 1. Imports Necessarios
```typescript
// De WalletDashboard.tsx - COPIAR EXATAMENTE
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownToLine, ArrowUpToLine, RefreshCcw, Copy, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useVaultAccounts } from '../hooks/useVaultAccounts';
import { useChainProps } from '../hooks/useChainProps';
import { useTokens } from '../store/tokens.store';
import {
  getNativeBalance,
  subscribeNativeBalance,
  getAssetBalance,
  subscribeAssetBalance,
  type BalanceSnapshot,
} from '../services/balances';
import { normaliseAddress } from '../utils/format';
import { TokenList } from '../components/TokenList';
```

### 2. Estados a Extrair
```typescript
// Linha ~36-47 do WalletDashboard
const { active, accounts, loading } = useVaultAccounts();
const { props: chainProps, error: chainError } = useChainProps();
const tokens = useTokens(active?.address);

const [balances, setBalances] = useState<Record<string, BalanceSnapshot | null>>({});
const [refreshNonce, setRefreshNonce] = useState(0);

const activeAddress = active?.address ?? null;
const displayAddress = useMemo(() => { /* copiar logica */ }, [activeAddress, chainProps]);
```

### 3. Effects a Extrair
```typescript
// Effect para native balance (linha ~80-113)
useEffect(() => {
  // Copiar INTEIRO do WalletDashboard
}, [activeAddress, refreshNonce]);

// Effect para asset balances (linha ~115-155)
useEffect(() => {
  // Copiar INTEIRO do WalletDashboard
}, [activeAddress, tokens, refreshNonce]);
```

### 4. JSX a Extrair

#### Account Card (simplificado)
```tsx
// Extrair o card de conta (linha ~362-420)
// Simplificar: apenas endereco + botoes Send/Receive
<Card>
  <CardContent>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs text-muted-foreground">Endereco</p>
        <code className="text-sm">{displayAddress}</code>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={copyAddress}>
          <Copy className="h-4 w-4" />
        </Button>
        <Link to="/app/wallet/receive">Receber</Link>
        <Link to="/app/wallet/send">Enviar</Link>
      </div>
    </div>
  </CardContent>
</Card>
```

#### Balances Card
```tsx
// Extrair o card de saldos (linha ~530-561)
<Card>
  <CardHeader>
    <CardTitle>{t('wallet.balances.title')}</CardTitle>
    <Button onClick={() => setRefreshNonce(n => n + 1)}>
      <RefreshCcw /> Atualizar
    </Button>
  </CardHeader>
  <CardContent>
    <TokenList
      tokens={tokens}
      balances={balances}
      onReceive={(token) => navigate(`/app/wallet/receive?token=${token.assetId}`)}
      onSend={(token) => navigate(`/app/wallet/send?token=${token.assetId}`)}
      onHistory={(token) => navigate(`/app/wallet/history?token=${token.assetId}`)}
      onRemove={undefined}  // REMOVER - vai para Settings
      loading={loading}
    />
  </CardContent>
</Card>
```

## O Que NAO Incluir

1. **Token Management** (add/remove) → Vai para Settings
2. **History Table** → Vai para HistoryPage
3. **Account Status** (loading, count) → Vai para Settings

## Estrutura do Novo Arquivo

```typescript
// apps/web/src/modules/wallet/pages/SaldosPage.tsx

import { /* imports copiados */ } from '...';

export function SaldosPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Estados copiados do WalletDashboard
  const { active, accounts, loading } = useVaultAccounts();
  const { props: chainProps, error: chainError } = useChainProps();
  const tokens = useTokens(active?.address);
  const [balances, setBalances] = useState<Record<string, BalanceSnapshot | null>>({});
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [copied, setCopied] = useState(false);

  // displayAddress memo copiado
  const displayAddress = useMemo(() => { /* ... */ }, []);

  // Effects copiados INTEIROS
  useEffect(() => { /* native balance */ }, []);
  useEffect(() => { /* asset balances */ }, []);

  // Handler para copiar
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(displayAddress ?? '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [displayAddress]);

  // JSX simplificado
  return (
    <section className="space-y-6">
      {/* Header simples */}
      <header>
        <h1 className="text-2xl font-semibold">{t('wallet.saldos.title')}</h1>
      </header>

      {/* Erro de conexao */}
      {chainError && <Alert variant="destructive">...</Alert>}

      {/* Card de Endereco Compacto */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                {t('wallet.saldos.address')}
              </p>
              <code className="text-sm break-all">{displayAddress}</code>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Button variant="outline" size="sm" onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
              <Link to="/app/wallet/receive" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                <ArrowDownToLine className="h-4 w-4 mr-1" />
                {t('wallet.saldos.receive')}
              </Link>
              <Link to="/app/wallet/send" className={buttonVariants({ size: 'sm' })}>
                <ArrowUpToLine className="h-4 w-4 mr-1" />
                {t('wallet.saldos.send')}
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card de Saldos */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{t('wallet.balances.title')}</CardTitle>
            <CardDescription>{t('wallet.balances.description')}</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setRefreshNonce(n => n + 1)}>
            <RefreshCcw className="h-4 w-4 mr-2" />
            {t('wallet.balances.refresh')}
          </Button>
        </CardHeader>
        <CardContent>
          <TokenList
            tokens={tokens}
            balances={balances}
            onReceive={(token) => navigate(`/app/wallet/receive?token=${token.assetId}`)}
            onSend={(token) => navigate(`/app/wallet/send?token=${token.assetId}`)}
            onHistory={(token) => navigate(`/app/wallet/history?token=${token.assetId}`)}
            loading={loading}
          />
        </CardContent>
      </Card>
    </section>
  );
}

export default SaldosPage;
```

## Modificacoes no TokenList

O componente TokenList atual tem `onRemove` prop. Para SaldosPage, passar `onRemove={undefined}` ou criar prop opcional.

Verificar em `TokenList.tsx`:
- Se `onRemove` ja eh opcional → OK
- Se nao → Tornar opcional com `onRemove?: (token) => void`

## Traducoes Necessarias

Adicionar em `locales/pt/translation.json`:
```json
{
  "wallet": {
    "saldos": {
      "title": "Saldos",
      "address": "Endereco",
      "receive": "Receber",
      "send": "Enviar"
    }
  }
}
```

## Checklist de Validacao

- [ ] Saldos nativos carregam
- [ ] Saldos de assets carregam
- [ ] Saldos atualizam em tempo real (subscription)
- [ ] Botao refresh funciona
- [ ] Copiar endereco funciona
- [ ] Link para Send funciona
- [ ] Link para Receive funciona
- [ ] Link para History funciona (vai para nova tab)
- [ ] Nenhum erro no console
- [ ] Loading state funciona

## Dependencias

- `TokenList.tsx` - Verificar se onRemove eh opcional
- `useVaultAccounts` - Usar sem modificar
- `useChainProps` - Usar sem modificar
- `useTokens` - Usar sem modificar
- `balances.ts` services - Usar sem modificar

## Nao Fazer

- NAO criar novos hooks
- NAO criar novos services
- NAO modificar TokenList (exceto tornar onRemove opcional)
- NAO adicionar novas features
- NAO mudar logica de subscriptions
