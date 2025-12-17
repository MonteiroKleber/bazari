# Feature 03: Modal de Configuracoes

## Objetivo

Criar um modal de configuracoes que agrupa Token Management e Account Management, separando configuracoes do uso diario.

## REGRA DE OURO

```
EXTRAIR, NAO REESCREVER
```

Toda a logica ja existe:
- Token management: WalletDashboard.tsx (linhas ~422-527)
- Account management: AccountsPage.tsx (inteiro)

## Estrutura do Modal

```
┌─────────────────────────────────────────────────────────┐
│  ⚙️ Configuracoes da Carteira                     [X]  │
├─────────────────────────────────────────────────────────┤
│  [Tokens]  [Contas]                                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Tab Tokens:                                             │
│    - Adicionar token customizado                        │
│    - Lista de tokens ativos                             │
│    - Remover token                                       │
│                                                          │
│  Tab Contas:                                             │
│    - Conta ativa (trocar)                               │
│    - Criar nova conta                                    │
│    - Importar conta                                      │
│    - Lista de contas                                     │
│    - Exportar/Remover conta                             │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Arquivos a Criar

### 1. WalletSettingsModal.tsx
Container principal com tabs.

### 2. TokenSettings.tsx
Extraido do WalletDashboard - token management.

### 3. AccountsSettings.tsx
Extraido do AccountsPage - account management.

## WalletSettingsModal.tsx

```typescript
// apps/web/src/modules/wallet/components/WalletSettingsModal.tsx

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Settings, X, Coins, Users } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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
    { id: 'tokens', label: t('wallet.settings.tabs.tokens'), icon: <Coins className="h-4 w-4" /> },
    { id: 'accounts', label: t('wallet.settings.tabs.accounts'), icon: <Users className="h-4 w-4" /> },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {t('wallet.settings.title')}
          </DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1 border-b">
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
        <div className="flex-1 overflow-y-auto py-4">
          {activeTab === 'tokens' && <TokenSettings />}
          {activeTab === 'accounts' && <AccountsSettings onClose={() => onOpenChange(false)} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

## TokenSettings.tsx

Extrair EXATAMENTE o card de token management do WalletDashboard:

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

  // Estados COPIADOS do WalletDashboard (linha ~49-53)
  const [assetIdInput, setAssetIdInput] = useState('');
  const [assetPreview, setAssetPreview] = useState<AssetMetadata | null>(null);
  const [assetChecking, setAssetChecking] = useState(false);
  const [assetError, setAssetError] = useState<string | null>(null);
  const [assetSuccess, setAssetSuccess] = useState<string | null>(null);

  // handleCheckAsset COPIADO do WalletDashboard
  const handleCheckAsset = async (event: React.FormEvent) => {
    event.preventDefault();
    // ... copiar INTEIRO do WalletDashboard
  };

  // handleAddToken COPIADO do WalletDashboard
  const handleAddToken = async () => {
    // ... copiar INTEIRO do WalletDashboard
  };

  // handleRemoveToken COPIADO do WalletDashboard
  const handleRemoveToken = (token: WalletToken) => {
    // ... copiar INTEIRO do WalletDashboard
  };

  // JSX COPIADO do card de tokens (linha ~422-527 do WalletDashboard)
  return (
    <div className="space-y-6">
      {/* Adicionar Token */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium">{t('wallet.tokens.addTitle')}</h3>

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
              {assetChecking ? t('wallet.tokens.checking') : t('wallet.tokens.check')}
            </Button>
          </div>
        </form>

        {assetError && (
          <p className="text-xs text-destructive" role="alert">{assetError}</p>
        )}
        {assetSuccess && (
          <p className="text-xs text-emerald-600" role="status">{assetSuccess}</p>
        )}

        {/* Preview - COPIAR do WalletDashboard */}
        {assetPreview && (
          <div className="rounded-md border border-primary/30 bg-primary/5 p-4">
            {/* ... copiar JSX ... */}
          </div>
        )}
      </div>

      {/* Separador */}
      <hr className="border-border" />

      {/* Lista de Tokens Ativos */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">{t('wallet.tokens.activeLabel')}</h3>
          <span className="text-xs text-muted-foreground">{tokens.length || '0'}</span>
        </div>

        {tokens.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t('wallet.tokens.empty')}</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {tokens.map((token) => (
              <li key={token.assetId} className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-foreground">{token.name ?? token.symbol}</p>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {token.symbol}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t('wallet.tokens.assetIdDisplay', { id: token.assetId })}
                  </p>
                </div>
                {token.assetId !== 'native' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 px-2 text-xs text-destructive hover:text-destructive"
                    onClick={() => handleRemoveToken(token)}
                  >
                    {t('wallet.tokens.remove')}
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

## Integracao no WalletHome

Adicionar botao de settings na navegacao:

```typescript
// Em WalletHome.tsx

import { Settings } from 'lucide-react';
import { WalletSettingsModal } from '../components/WalletSettingsModal';

export function WalletHome() {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto px-4 py-10 pt-20">
        <nav className="mb-6">
          <ul className="flex flex-wrap gap-2 rounded-lg border border-border/60 bg-muted/40 p-2 text-sm">
            {/* Tabs existentes */}
            {navigation.map((item) => (/* ... */))}

            {/* Botao Settings */}
            <li className="ml-auto">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSettingsOpen(true)}
                className="flex items-center gap-2"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">{t('wallet.settings.button')}</span>
              </Button>
            </li>
          </ul>
        </nav>

        <Routes>
          {/* ... */}
        </Routes>

        {/* Settings Modal */}
        <WalletSettingsModal
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
        />
      </main>
      <Footer />
    </div>
  );
}
```

## Traducoes Necessarias

```json
{
  "wallet": {
    "settings": {
      "title": "Configuracoes da Carteira",
      "button": "Configuracoes",
      "tabs": {
        "tokens": "Tokens",
        "accounts": "Contas"
      }
    },
    "tokens": {
      "addTitle": "Adicionar Token"
    }
  }
}
```

## Checklist de Validacao

### Modal
- [ ] Modal abre ao clicar em Settings
- [ ] Modal fecha com X ou click fora
- [ ] Tabs funcionam corretamente
- [ ] Scroll interno funciona

### Token Settings
- [ ] Campo de Asset ID funciona
- [ ] Verificar token funciona
- [ ] Preview aparece corretamente
- [ ] Adicionar token funciona
- [ ] Token aparece na lista
- [ ] Remover token funciona
- [ ] Token nativo NAO tem botao remover
- [ ] Erros mostram corretamente
- [ ] Sucesso mostra corretamente

## Dependencias

- `tokens.store.ts` - Usar sem modificar
- `assets.ts` service - Usar sem modificar
- `useVaultAccounts` - Usar sem modificar

## Nao Fazer

- NAO criar novo store
- NAO modificar services existentes
- NAO mudar logica de add/remove token
- NAO mudar validacoes
