# PROMPT 03: Criar WalletSettingsModal e TokenSettings

## Contexto

Voce vai criar o modal de configuracoes da Wallet e o componente de gerenciamento de tokens.

## REGRAS OBRIGATORIAS

1. **EXTRAIR, NAO REESCREVER** - Copiar codigo existente
2. **NAO MODIFICAR** services, hooks ou stores
3. **MANTER** toda logica de add/remove token intacta

## Arquivos de Referencia

LER PRIMEIRO:
- `apps/web/src/modules/wallet/pages/WalletDashboard.tsx` - Fonte do token management
- `apps/web/src/modules/wallet/store/tokens.store.ts` - Token store
- `apps/web/src/modules/wallet/services/assets.ts` - Asset metadata service

## Tarefa

### Passo 1: Criar WalletSettingsModal.tsx

Criar arquivo `apps/web/src/modules/wallet/components/WalletSettingsModal.tsx`:

```typescript
// apps/web/src/modules/wallet/components/WalletSettingsModal.tsx

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Settings, Coins, Users } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { TokenSettings } from './TokenSettings';
import { AccountsSettings } from './AccountsSettings';

interface WalletSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type SettingsTab = 'tokens' | 'accounts';

export function WalletSettingsModal({ open, onOpenChange }: WalletSettingsModalProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<SettingsTab>('tokens');

  const tabs: Array<{ id: SettingsTab; label: string; icon: React.ReactNode }> = [
    {
      id: 'tokens',
      label: t('wallet.settings.tabs.tokens', { defaultValue: 'Tokens' }),
      icon: <Coins className="h-4 w-4" />,
    },
    {
      id: 'accounts',
      label: t('wallet.settings.tabs.accounts', { defaultValue: 'Contas' }),
      icon: <Users className="h-4 w-4" />,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {t('wallet.settings.title', { defaultValue: 'Configuracoes da Carteira' })}
          </DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1 px-6 border-b">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors',
                'border-b-2 -mb-px',
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'tokens' && <TokenSettings />}
          {activeTab === 'accounts' && (
            <AccountsSettings onClose={() => onOpenChange(false)} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### Passo 2: Criar TokenSettings.tsx

Extrair o gerenciamento de tokens do WalletDashboard:

```typescript
// apps/web/src/modules/wallet/components/TokenSettings.tsx

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useVaultAccounts } from '../hooks/useVaultAccounts';
import { addToken, removeToken, useTokens, type WalletToken } from '../store/tokens.store';
import { fetchAssetMetadata, type AssetMetadata } from '../services/assets';

export function TokenSettings() {
  const { t } = useTranslation();
  const { active } = useVaultAccounts();
  const tokens = useTokens(active?.address);

  // Estados - COPIAR do WalletDashboard (linhas ~49-53)
  const [assetIdInput, setAssetIdInput] = useState('');
  const [assetPreview, setAssetPreview] = useState<AssetMetadata | null>(null);
  const [assetChecking, setAssetChecking] = useState(false);
  const [assetError, setAssetError] = useState<string | null>(null);
  const [assetSuccess, setAssetSuccess] = useState<string | null>(null);

  // handleCheckAsset - COPIAR INTEIRO do WalletDashboard
  const handleCheckAsset = async (event: React.FormEvent) => {
    event.preventDefault();

    const trimmedId = assetIdInput.trim();
    if (!trimmedId) {
      setAssetError(t('wallet.tokens.errorEmpty', { defaultValue: 'Digite o ID do asset' }));
      return;
    }

    // Verificar se ja existe
    if (tokens.some((token) => token.assetId === trimmedId)) {
      setAssetError(t('wallet.tokens.errorAlreadyAdded', { defaultValue: 'Token ja adicionado' }));
      return;
    }

    setAssetChecking(true);
    setAssetError(null);
    setAssetPreview(null);

    try {
      const metadata = await fetchAssetMetadata(trimmedId);
      if (metadata) {
        setAssetPreview(metadata);
      } else {
        setAssetError(t('wallet.tokens.errorNotFound', { defaultValue: 'Asset nao encontrado' }));
      }
    } catch (error) {
      console.error('[wallet] failed to fetch asset metadata', error);
      setAssetError(t('wallet.tokens.errorFetch', { defaultValue: 'Erro ao buscar asset' }));
    } finally {
      setAssetChecking(false);
    }
  };

  // handleAddToken - COPIAR INTEIRO do WalletDashboard
  const handleAddToken = async () => {
    if (!assetPreview || !active?.address) return;

    addToken(active.address, {
      assetId: assetPreview.assetId,
      symbol: assetPreview.symbol,
      name: assetPreview.name ?? undefined,
      decimals: assetPreview.decimals,
    });

    setAssetSuccess(
      t('wallet.tokens.successAdded', {
        symbol: assetPreview.symbol,
        defaultValue: `${assetPreview.symbol} adicionado!`,
      })
    );
    setAssetPreview(null);
    setAssetIdInput('');
  };

  // handleRemoveToken - COPIAR INTEIRO do WalletDashboard
  const handleRemoveToken = (token: WalletToken) => {
    if (!active?.address) return;
    if (token.assetId === 'native') return; // Nao permitir remover nativo
    removeToken(active.address, token.assetId);
  };

  return (
    <div className="space-y-6">
      {/* Adicionar Token */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium">
          {t('wallet.tokens.addTitle', { defaultValue: 'Adicionar Token' })}
        </h3>

        <form className="grid gap-3 sm:grid-cols-[1fr_auto]" onSubmit={handleCheckAsset}>
          <div className="space-y-2">
            <Label htmlFor="asset-id">{t('wallet.tokens.assetIdLabel')}</Label>
            <Input
              id="asset-id"
              value={assetIdInput}
              onChange={(event) => {
                setAssetIdInput(event.target.value);
                setAssetError(null);
                setAssetSuccess(null);
              }}
              placeholder={t('wallet.tokens.assetPlaceholder')}
            />
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={assetChecking} className="w-full sm:w-auto">
              {assetChecking
                ? t('wallet.tokens.checking', { defaultValue: 'Verificando...' })
                : t('wallet.tokens.check', { defaultValue: 'Verificar' })}
            </Button>
          </div>
        </form>

        {assetError && (
          <p className="text-xs text-destructive" role="alert">
            {assetError}
          </p>
        )}
        {assetSuccess && (
          <p className="text-xs text-emerald-600" role="status">
            {assetSuccess}
          </p>
        )}

        {/* Preview */}
        {assetPreview && (
          <div className="rounded-md border border-primary/30 bg-primary/5 p-4">
            <p className="text-sm font-medium text-foreground">
              {t('wallet.tokens.previewTitle', {
                symbol: assetPreview.symbol,
                defaultValue: `Token: ${assetPreview.symbol}`,
              })}
            </p>
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              <li>
                {t('wallet.tokens.previewId', {
                  id: assetPreview.assetId,
                  defaultValue: `ID: ${assetPreview.assetId}`,
                })}
              </li>
              <li>
                {t('wallet.tokens.previewDecimals', {
                  decimals: assetPreview.decimals,
                  defaultValue: `Decimais: ${assetPreview.decimals}`,
                })}
              </li>
              {assetPreview.name && (
                <li>
                  {t('wallet.tokens.previewName', {
                    name: assetPreview.name,
                    defaultValue: `Nome: ${assetPreview.name}`,
                  })}
                </li>
              )}
            </ul>
            <div className="mt-3 flex gap-2">
              <Button size="sm" onClick={handleAddToken}>
                <Plus className="mr-2 h-4 w-4" />
                {t('wallet.tokens.addConfirm', { defaultValue: 'Adicionar' })}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setAssetPreview(null);
                  setAssetSuccess(null);
                }}
              >
                {t('wallet.tokens.cancelPreview', { defaultValue: 'Cancelar' })}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Separador */}
      <hr className="border-border" />

      {/* Lista de Tokens Ativos */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">
            {t('wallet.tokens.activeLabel', { defaultValue: 'Tokens Rastreados' })}
          </h3>
          <span className="text-xs text-muted-foreground">{tokens.length || '0'}</span>
        </div>

        {tokens.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            {t('wallet.tokens.empty', { defaultValue: 'Nenhum token configurado' })}
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {tokens.map((token) => (
              <li
                key={token.assetId}
                className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-foreground">{token.name ?? token.symbol}</p>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {token.symbol}
                    </span>
                    {token.assetId === 'native' && (
                      <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs">
                        Nativo
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t('wallet.tokens.assetIdDisplay', {
                      id: token.assetId,
                      defaultValue: `Asset ID: ${token.assetId}`,
                    })}
                  </p>
                </div>
                {token.assetId !== 'native' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 px-2 text-xs text-destructive hover:text-destructive"
                    onClick={() => handleRemoveToken(token)}
                  >
                    {t('wallet.tokens.remove', { defaultValue: 'Remover' })}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
```

### Passo 3: Criar placeholder AccountsSettings.tsx

Por enquanto, criar um placeholder (sera implementado no proximo prompt):

```typescript
// apps/web/src/modules/wallet/components/AccountsSettings.tsx

import { useTranslation } from 'react-i18next';

interface AccountsSettingsProps {
  onClose?: () => void;
}

export function AccountsSettings({ onClose }: AccountsSettingsProps) {
  const { t } = useTranslation();

  return (
    <div className="text-center py-8 text-muted-foreground">
      <p>{t('wallet.accounts.comingSoon', { defaultValue: 'Em construcao...' })}</p>
      <p className="text-xs mt-2">
        {t('wallet.accounts.useOldPage', {
          defaultValue: 'Use a pagina de Contas na navegacao principal',
        })}
      </p>
    </div>
  );
}
```

### Passo 4: Atualizar WalletHome.tsx

Adicionar botao de settings e modal:

```typescript
// Em WalletHome.tsx

import { useState } from 'react';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WalletSettingsModal } from '../components/WalletSettingsModal';

export function WalletHome() {
  const { t } = useTranslation();
  const [settingsOpen, setSettingsOpen] = useState(false);

  // navigation existente...

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto px-4 py-10 pt-20">
        <nav aria-label={t('wallet.nav.aria')} className="mb-6">
          <ul className="flex flex-wrap gap-2 rounded-lg border border-border/60 bg-muted/40 p-2 text-sm">
            {navigation.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/app/wallet'}
                  className={({ isActive }) =>
                    `inline-flex items-center rounded-md px-3 py-2 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:bg-background hover:text-foreground'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}

            {/* Botao Settings */}
            <li className="ml-auto">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSettingsOpen(true)}
                className="flex items-center gap-2 rounded-md px-3 py-2"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {t('wallet.settings.button', { defaultValue: 'Configuracoes' })}
                </span>
              </Button>
            </li>
          </ul>
        </nav>

        <Routes>
          {/* ... rotas existentes ... */}
        </Routes>

        {/* Settings Modal */}
        <WalletSettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
      </main>
      <Footer />
    </div>
  );
}
```

## Validacao

Apos implementar, verificar:

### Modal
- [ ] Botao Settings aparece na navegacao
- [ ] Modal abre ao clicar
- [ ] Modal fecha com X
- [ ] Modal fecha clicando fora
- [ ] Tabs Tokens/Contas funcionam
- [ ] Scroll interno funciona

### Token Settings
- [ ] Campo de Asset ID funciona
- [ ] Verificar token funciona
- [ ] Erro se campo vazio
- [ ] Erro se token ja adicionado
- [ ] Erro se asset nao existe
- [ ] Preview aparece corretamente
- [ ] Adicionar token funciona
- [ ] Token aparece na lista
- [ ] Token aparece nos saldos (SaldosPage)
- [ ] Remover token funciona
- [ ] Token nativo NAO tem botao remover
- [ ] Badge "Nativo" aparece no BZR

## NAO FAZER

- NAO modificar WalletDashboard ainda
- NAO modificar tokens.store.ts
- NAO modificar assets.ts service
- NAO implementar AccountsSettings ainda (proximo prompt)
