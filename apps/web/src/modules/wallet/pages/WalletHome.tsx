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
