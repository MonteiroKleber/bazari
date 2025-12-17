# PROMPT 05: Atualizar Navegacao e Limpeza

## Contexto

Apos todos os componentes criados e testados, atualizar a navegacao do WalletHome e fazer limpeza dos arquivos antigos.

## PRE-REQUISITOS

**EXECUTAR APENAS APOS**:
- [ ] SaldosPage testada e funcionando
- [ ] HistoryPage testada e funcionando
- [ ] WalletSettingsModal testado e funcionando
- [ ] TokenSettings testado e funcionando
- [ ] AccountsSettings testado e funcionando

## Tarefa

### Passo 1: Atualizar WalletHome.tsx

```typescript
// apps/web/src/modules/wallet/pages/WalletHome.tsx

import { useMemo, useState } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Settings } from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';

// Novas paginas
import { SaldosPage } from './SaldosPage';
import { HistoryPage } from './HistoryPage';

// Paginas mantidas
import { SendPage } from './SendPage';
import { ReceivePage } from './ReceivePage';

// Modal de settings
import { WalletSettingsModal } from '../components/WalletSettingsModal';

export function WalletHome() {
  const { t } = useTranslation();
  const [settingsOpen, setSettingsOpen] = useState(false);

  // NOVA NAVEGACAO
  const navigation = useMemo(
    () => [
      { to: '/app/wallet', label: t('wallet.nav.saldos', { defaultValue: 'Saldos' }) },
      { to: '/app/wallet/send', label: t('wallet.nav.send') },
      { to: '/app/wallet/receive', label: t('wallet.nav.receive') },
      { to: '/app/wallet/history', label: t('wallet.nav.history', { defaultValue: 'Historico' }) },
    ],
    [t]
  );

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
                className="flex items-center gap-2 rounded-md px-3 py-2 text-muted-foreground hover:text-foreground"
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
          {/* NOVAS ROTAS */}
          <Route index element={<SaldosPage />} />
          <Route path="history" element={<HistoryPage />} />

          {/* ROTAS MANTIDAS */}
          <Route path="send" element={<SendPage />} />
          <Route path="receive" element={<ReceivePage />} />

          {/* Redirect de rotas antigas */}
          <Route path="accounts" element={<Navigate to="/app/wallet" replace />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="." replace />} />
        </Routes>

        {/* Settings Modal */}
        <WalletSettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
      </main>
      <Footer />
    </div>
  );
}

export default WalletHome;
```

### Passo 2: Adicionar Traducoes

Verificar/adicionar em `locales/pt/translation.json`:

```json
{
  "wallet": {
    "nav": {
      "saldos": "Saldos",
      "send": "Enviar",
      "receive": "Receber",
      "history": "Historico",
      "aria": "Navegacao da carteira"
    },
    "saldos": {
      "title": "Saldos",
      "address": "Endereco",
      "receive": "Receber",
      "send": "Enviar"
    },
    "settings": {
      "title": "Configuracoes da Carteira",
      "button": "Configuracoes",
      "tabs": {
        "tokens": "Tokens",
        "accounts": "Contas"
      }
    },
    "history": {
      "filterActive": "Filtrando por {{token}}"
    }
  }
}
```

### Passo 3: Validacao Final

Testar TODAS as funcionalidades:

#### Saldos (/)
- [ ] Saldos carregam
- [ ] Saldos atualizam em tempo real
- [ ] Refresh funciona
- [ ] Copiar endereco funciona
- [ ] Links Send/Receive funcionam
- [ ] Link History funciona

#### Enviar (/send)
- [ ] Formulario funciona
- [ ] Selecao de token funciona
- [ ] Fee estimation funciona
- [ ] Transacao completa funciona
- [ ] PIN confirmation funciona

#### Receber (/receive)
- [ ] QR code aparece
- [ ] Endereco correto
- [ ] Copiar funciona
- [ ] Compartilhar funciona

#### Historico (/history)
- [ ] Lista carrega
- [ ] Paginacao funciona
- [ ] Filtro por token funciona
- [ ] Limpar filtro funciona

#### Settings Modal
- [ ] Modal abre
- [ ] Tab Tokens funciona
- [ ] Adicionar token funciona
- [ ] Remover token funciona
- [ ] Tab Contas funciona
- [ ] Criar conta funciona
- [ ] Importar conta funciona
- [ ] Exportar conta funciona
- [ ] Ativar conta funciona
- [ ] Remover conta funciona

### Passo 4: Limpeza (APENAS APOS VALIDACAO COMPLETA)

Somente apos TODOS os testes passarem:

```bash
# Remover arquivos antigos
rm apps/web/src/modules/wallet/pages/WalletDashboard.tsx
rm apps/web/src/modules/wallet/pages/AccountsPage.tsx
```

### Passo 5: Atualizar Exports

Verificar `apps/web/src/modules/wallet/index.ts`:

```typescript
// Paginas
export { WalletHome } from './pages/WalletHome';
export { SaldosPage } from './pages/SaldosPage';
export { HistoryPage } from './pages/HistoryPage';
export { SendPage } from './pages/SendPage';
export { ReceivePage } from './pages/ReceivePage';

// Componentes
export { WalletSettingsModal } from './components/WalletSettingsModal';
export { TokenSettings } from './components/TokenSettings';
export { AccountsSettings } from './components/AccountsSettings';
export { TokenList } from './components/TokenList';
export { TokenSelector } from './components/TokenSelector';
export { AddressQr } from './components/AddressQr';
export { Scanner } from './components/Scanner';

// Hooks
export { useVaultAccounts } from './hooks/useVaultAccounts';
export { useChainProps } from './hooks/useChainProps';
export { useApi } from './hooks/useApi';

// Store
export { useTokens, addToken, removeToken } from './store/tokens.store';

// PIN
export { PinProvider } from './pin/PinProvider';
```

## Rollback

Se algo falhar apos limpeza:

```bash
git checkout HEAD~1 -- apps/web/src/modules/wallet/pages/WalletDashboard.tsx
git checkout HEAD~1 -- apps/web/src/modules/wallet/pages/AccountsPage.tsx
```

## Checklist Final

- [ ] Navegacao nova funcionando
- [ ] Todas as 4 tabs acessiveis
- [ ] Settings modal funcionando
- [ ] Criar conta funciona
- [ ] Importar conta funciona
- [ ] Exportar conta funciona
- [ ] Ativar conta funciona
- [ ] Remover conta funciona
- [ ] Adicionar token funciona
- [ ] Remover token funciona
- [ ] Ver saldos funciona
- [ ] Enviar TX funciona
- [ ] Receber funciona
- [ ] Ver historico funciona
- [ ] Filtrar historico funciona
- [ ] Nenhum erro no console
- [ ] Build passa sem erros
