// V-1 (2025-09-18): Add PDP routes for product and service detail pages
// path: apps/web/src/App.tsx

import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ThemeProvider } from './theme/ThemeProvider';
import { Header } from './components/Header';
import { AppHeader } from './components/AppHeader';
import { Hero } from './components/Hero';
import { Features } from './components/Features';
import { Roadmap } from './components/Roadmap';
import { CTASection } from './components/CTASection';
import { Footer } from './components/Footer';
import { ThemeGallery } from './components/ThemeGallery';
import { DevPanel } from './components/DevPanel';
import { SearchPage } from './pages/SearchPage';
import { NewListingPage } from './pages/NewListingPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { ServiceDetailPage } from './pages/ServiceDetailPage';
import { OrderPage } from './pages/OrderPage';
import { CartPage } from './modules/cart/pages/CartPage';
import { CheckoutPage } from './modules/orders/pages/CheckoutPage';
import { OrderPayPage } from './modules/orders/pages/OrderPayPage';
import { CreateAccount } from './pages/auth/CreateAccount';
import { ImportAccount } from './pages/auth/ImportAccount';
import { Unlock } from './pages/auth/Unlock';
import { DeviceLink } from './pages/auth/DeviceLink';
import { SessionBoundary } from './components/auth/SessionBoundary';
import { RequireAuth } from './components/auth/RequireAuth';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { WalletHome } from './modules/wallet/pages/WalletHome';
import { hasEncryptedSeed, isSessionActive } from '@/modules/auth';

function LandingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [checkingVault, setCheckingVault] = useState(true);
  const [hasVault, setHasVault] = useState(false);
  const gateRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let active = true;
    hasEncryptedSeed()
      .then((value) => {
        if (active) {
          setHasVault(value);
        }
      })
      .finally(() => {
        if (active) {
          setCheckingVault(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const scrollToGate = useCallback(() => {
    if (gateRef.current) {
      gateRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      gateRef.current.focus();
    }
  }, []);

  const handleProtectedNavigate = useCallback(() => {
    if (isSessionActive()) {
      navigate('/app');
    } else {
      scrollToGate();
    }
  }, [navigate, scrollToGate]);

  const handleCreateAccount = useCallback(() => navigate('/auth/create'), [navigate]);
  const handleImportAccount = useCallback(() => navigate('/auth/import'), [navigate]);
  const handleUnlock = useCallback(() => navigate('/auth/unlock'), [navigate]);

  return (
    <>
      <Header />
      <main>
        <Hero onPrimaryAction={handleProtectedNavigate} />
        <Features />
        <Roadmap />

        <section
          ref={gateRef}
          tabIndex={-1}
          className="py-16 bg-muted/30 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <Card>
                <CardHeader className="space-y-3 text-center">
                  <CardTitle>{t('landing.authGate.title')}</CardTitle>
                  <CardDescription>{t('landing.authGate.description')}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                  <Button
                    size="lg"
                    onClick={handleCreateAccount}
                    aria-label={t('landing.authGate.createAria')}
                  >
                    {t('landing.authGate.create')}
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={handleImportAccount}
                    aria-label={t('landing.authGate.importAria')}
                  >
                    {t('landing.authGate.import')}
                  </Button>
                  {checkingVault && (
                    <Button size="lg" variant="secondary" disabled aria-live="polite">
                      {t('landing.authGate.checking')}
                    </Button>
                  )}
                  {!checkingVault && hasVault && (
                    <Button
                      size="lg"
                      variant="secondary"
                      onClick={handleUnlock}
                      aria-label={t('landing.authGate.unlockAria')}
                    >
                      {t('landing.authGate.unlock')}
                    </Button>
                  )}
                </CardContent>
                <div className="px-6 pb-6">
                  <p className="text-center text-sm text-muted-foreground" aria-live="polite">
                    {checkingVault
                      ? t('landing.authGate.checkingDetail')
                      : hasVault
                        ? t('landing.authGate.unlockHelperReady')
                        : t('landing.authGate.unlockHelper')}
                  </p>
                </div>
              </Card>
            </div>
          </div>
        </section>

        {/* Theme Gallery Section (opcional - pode remover em produção) */}
        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
                Temas Disponíveis
              </h2>
              <p className="text-center text-muted-foreground mb-12">
                Escolha o tema que mais combina com você
              </p>
              <ThemeGallery />
            </div>
          </div>
        </section>

        <CTASection onPrimaryClick={handleProtectedNavigate} />
      </main>
      <Footer />

      {/* DevPanel - apenas em desenvolvimento */}
      {import.meta.env.DEV && <DevPanel />}
    </>
  );
}

function AppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <AppHeader />
      <main className="min-h-screen pt-16">
        {children}
      </main>
      <Footer />
    </>
  );
}

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-background">
          <SessionBoundary />
          <Routes>
            <Route
              path="/app/wallet/*"
              element={
                <RequireAuth>
                  <WalletHome />
                </RequireAuth>
              }
            />
            {/* Rotas públicas */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/auth/create" element={<CreateAccount />} />
            <Route path="/auth/import" element={<ImportAccount />} />
            <Route path="/auth/unlock" element={<Unlock />} />
            <Route path="/auth/device-link" element={<DeviceLink />} />
            
            {/* Rotas internas/autenticadas */}
            <Route
              path="/app/*"
              element={
                <RequireAuth>
                  <AppLayout>
                    <Routes>
                      <Route path="new" element={<NewListingPage />} />
                      <Route path="product/:id" element={<ProductDetailPage />} />
                      <Route path="service/:id" element={<ServiceDetailPage />} />
                      <Route path="cart" element={<CartPage />} />
                      <Route path="checkout" element={<CheckoutPage />} />
                      <Route path="orders/:id/pay" element={<OrderPayPage />} />
                      <Route path="orders/:id" element={<OrderPage />} />
                      <Route path="order/:id" element={<OrderPage />} />
                      {/* Futuras rotas internas */}
                      {/* <Route path="dashboard" element={<Dashboard />} /> */}
                      {/* <Route path="wallet" element={<Wallet />} /> */}
                      {/* <Route path="dao" element={<DAO />} /> */}
                    </Routes>
                  </AppLayout>
                </RequireAuth>
              }
            />
          </Routes>
        </div>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
