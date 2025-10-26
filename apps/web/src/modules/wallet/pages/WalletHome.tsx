import { useMemo } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppHeader } from '@/components/AppHeader';
import { Footer } from '@/components/Footer';
import { WalletDashboard } from './WalletDashboard';
import { AccountsPage } from './AccountsPage';
import { SendPage } from './SendPage';
import { ReceivePage } from './ReceivePage';

export function WalletHome() {
  const { t } = useTranslation();

  const navigation = useMemo(
    () => [
      { to: '/app/wallet', label: t('wallet.nav.overview') },
      { to: '/app/wallet/accounts', label: t('wallet.nav.accounts') },
      { to: '/app/wallet/send', label: t('wallet.nav.send') },
      { to: '/app/wallet/receive', label: t('wallet.nav.receive') },
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
                    `inline-flex items-center rounded-md px-3 py-2 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${isActive ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-background hover:text-foreground'}`
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <Routes>
          <Route index element={<WalletDashboard />} />
          <Route path="accounts" element={<AccountsPage />} />
          <Route path="send" element={<SendPage />} />
          <Route path="receive" element={<ReceivePage />} />
          <Route path="*" element={<Navigate to="." replace />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default WalletHome;
