# PROMPT 01: Criar SaldosPage

## Contexto

Voce vai criar uma nova pagina `SaldosPage.tsx` para a Wallet, extraindo a logica de saldos do `WalletDashboard.tsx` existente.

## REGRAS OBRIGATORIAS

1. **EXTRAIR, NAO REESCREVER** - Copiar codigo existente
2. **NAO MODIFICAR** services, hooks ou stores
3. **NAO CRIAR** novos hooks ou services
4. **MANTER** toda logica de subscriptions intacta

## Arquivos de Referencia

LER PRIMEIRO:
- `apps/web/src/modules/wallet/pages/WalletDashboard.tsx` - Fonte do codigo
- `apps/web/src/modules/wallet/components/TokenList.tsx` - Componente de lista
- `apps/web/src/modules/wallet/services/balances.ts` - Services de balance

## Tarefa

### Passo 1: Criar SaldosPage.tsx

Criar arquivo `apps/web/src/modules/wallet/pages/SaldosPage.tsx`:

1. Copiar imports necessarios do WalletDashboard
2. Copiar estados de balance (balances, refreshNonce)
3. Copiar effects de subscription (native + assets)
4. Copiar displayAddress memo
5. Criar JSX simplificado:
   - Header com titulo
   - Card de endereco compacto (endereco + botoes)
   - Card de saldos com TokenList

### Passo 2: Modificar TokenList

Verificar se `onRemove` eh opcional em TokenList.tsx:
- Se nao for, tornar opcional: `onRemove?: (token: WalletToken) => void`

### Passo 3: Usar useNavigate

Substituir `window.location.href` por `useNavigate`:
```typescript
const navigate = useNavigate();
// ...
onSend={(token) => navigate(`/app/wallet/send?token=${token.assetId}`)}
onReceive={(token) => navigate(`/app/wallet/receive?token=${token.assetId}`)}
onHistory={(token) => navigate(`/app/wallet/history?token=${token.assetId}`)}
```

### Passo 4: Adicionar funcionalidade de copiar

```typescript
const [copied, setCopied] = useState(false);

const handleCopy = useCallback(() => {
  navigator.clipboard.writeText(displayAddress ?? '');
  setCopied(true);
  setTimeout(() => setCopied(false), 2000);
}, [displayAddress]);
```

## Estrutura Esperada

```typescript
// apps/web/src/modules/wallet/pages/SaldosPage.tsx

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowDownToLine, ArrowUpToLine, RefreshCcw, Copy, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Alert, AlertDescription } from '@/components/ui/alert';
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

export function SaldosPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { active, loading } = useVaultAccounts();
  const { props: chainProps, error: chainError } = useChainProps();
  const tokens = useTokens(active?.address);

  const [balances, setBalances] = useState<Record<string, BalanceSnapshot | null>>({});
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [copied, setCopied] = useState(false);

  const activeAddress = active?.address ?? null;

  // displayAddress memo - COPIAR do WalletDashboard
  const displayAddress = useMemo(() => {
    // ...
  }, [activeAddress, chainProps]);

  // Effect native balance - COPIAR INTEIRO do WalletDashboard
  useEffect(() => {
    // ...
  }, [activeAddress, refreshNonce]);

  // Effect asset balances - COPIAR INTEIRO do WalletDashboard
  useEffect(() => {
    // ...
  }, [activeAddress, tokens, refreshNonce]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(displayAddress ?? '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [displayAddress]);

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t('wallet.saldos.title', { defaultValue: 'Saldos' })}
        </h1>
      </header>

      {chainError && (
        <Alert variant="destructive">
          <AlertDescription>{t('wallet.dashboard.chainError')}</AlertDescription>
        </Alert>
      )}

      {/* Card de Endereco */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1 min-w-0">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                {t('wallet.saldos.address', { defaultValue: 'Endereco' })}
              </p>
              <code className="text-sm break-all block">{displayAddress}</code>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Button variant="outline" size="sm" onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
              <Link
                to="/app/wallet/receive"
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                <ArrowDownToLine className="h-4 w-4 mr-1" />
                {t('wallet.saldos.receive', { defaultValue: 'Receber' })}
              </Link>
              <Link
                to="/app/wallet/send"
                className={buttonVariants({ size: 'sm' })}
              >
                <ArrowUpToLine className="h-4 w-4 mr-1" />
                {t('wallet.saldos.send', { defaultValue: 'Enviar' })}
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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setRefreshNonce((n) => n + 1)}
          >
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

## Validacao

Apos implementar, verificar:
- [ ] Saldos nativos carregam
- [ ] Saldos de assets carregam
- [ ] Saldos atualizam em tempo real
- [ ] Botao refresh funciona
- [ ] Copiar endereco funciona
- [ ] Feedback visual de copiado
- [ ] Links Send/Receive navegam
- [ ] Link History navega (para rota que ainda nao existe - OK)
- [ ] Nenhum erro no console
- [ ] Loading state funciona

## NAO FAZER

- NAO modificar WalletDashboard ainda
- NAO modificar services
- NAO modificar hooks
- NAO adicionar novas features
