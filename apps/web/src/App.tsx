// V-1 (2025-09-18): Add PDP routes for product and service detail pages
// path: apps/web/src/App.tsx

import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, Navigate, useLocation } from 'react-router-dom';

// Initialize BazariOS App Registry
import { initializeAppRegistry } from '@/platform/registry';
initializeAppRegistry();
import { useTranslation } from 'react-i18next';
import { ThemeProvider } from './theme/ThemeProvider';
import { Header } from './components/Header';
import { AppHeader } from './components/AppHeader';
import { Toaster } from 'sonner';
import { HeroManifesto } from './components/landing/HeroManifesto';
import { BZRSection } from './components/landing/BZRSection';
import { MarketplacePreview } from './components/landing/MarketplacePreview';
import { TokenizedStoresSection } from './components/landing/TokenizedStoresSection';
import { EcosystemSection } from './components/landing/EcosystemSection';
import { BlockchainSection } from './components/landing/BlockchainSection';
import { FinalCTA } from './components/landing/FinalCTA';
import { Footer } from './components/Footer';
import { DevPanel } from './components/DevPanel';
import { SearchPage } from './pages/SearchPage';
import ExplorePage from './pages/ExplorePage';
import { NewListingPage } from './pages/NewListingPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { ServiceDetailPage } from './pages/ServiceDetailPage';
import { OrderPage } from './pages/OrderPage';
import { CartPage } from './modules/cart/pages/CartPage';
import { CheckoutPage } from './modules/orders/pages/CheckoutPage';
import { OrderPayPage } from './modules/orders/pages/OrderPayPage';
import EscrowManagementPage from './pages/orders/EscrowManagementPage';
import AdminEscrowDashboard from './pages/admin/AdminEscrowDashboard';
import { CreateAccount } from './pages/auth/CreateAccount';
import { ImportAccount } from './pages/auth/ImportAccount';
import { Unlock } from './pages/auth/Unlock';
import { DeviceLink } from './pages/auth/DeviceLink';
import { WelcomePage } from './pages/auth/WelcomePage';
import { GuestWelcomePage } from './pages/auth/GuestWelcomePage';
import { RecoverPin } from './pages/auth/RecoverPin';
import { SessionBoundary } from './components/auth/SessionBoundary';
import { PinProvider } from './modules/wallet/pin/PinProvider';
import { RequireAuth } from './components/auth/RequireAuth';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { WalletHome } from './modules/wallet/pages/WalletHome';
import { hasEncryptedSeed, isSessionActive } from '@/modules/auth';
import DashboardPage from './pages/DashboardPage';
import ProfileEditPage from './pages/ProfileEditPage';
import ProfilePublicPage from './pages/ProfilePublicPage';
import DiscoverPeoplePage from './pages/DiscoverPeoplePage';
import DiscoverTrendingPage from './pages/DiscoverTrendingPage';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import FeedPage from './pages/FeedPage';
import { PostDetailPage } from './pages/PostDetailPage';
import BookmarksPage from './pages/BookmarksPage';
import { NotificationsPage } from './pages/NotificationsPage';
import SellerSetupPage from './pages/SellerSetupPage';
import SellerPublicPage from './pages/SellerPublicPage';
import SellerManagePage from './pages/SellerManagePage';
import SellersListPage from './pages/SellersListPage';
import P2PHomePage from './modules/p2p/pages/P2PHomePage';
import P2POfferNewPage from './modules/p2p/pages/P2POfferNewPage';
import P2POfferPublicPage from './modules/p2p/pages/P2POfferPublicPage';
import P2POrderRoomPage from './modules/p2p/pages/P2POrderRoomPage';
import P2PMyOrdersPage from './modules/p2p/pages/P2PMyOrdersPage';
import ZARIStatsPage from './modules/p2p/pages/ZARIStatsPage';
import StorePublicPage from './pages/StorePublicPage';
import MarketplacePage from './pages/MarketplacePage';
import AffiliateMarketplacePage from './pages/AffiliateMarketplacePage';
import AffiliateDashboardPage from './pages/AffiliateDashboardPage';
import { InstallPrompt } from './components/pwa/InstallPrompt';
import { UpdatePrompt } from './components/pwa/UpdatePrompt';
import { OfflineIndicator } from './components/pwa/OfflineIndicator';
import { MobileBottomNav } from './components/MobileBottomNav';
import { CreatePostButton } from './components/social/CreatePostButton';
import { FEATURE_FLAGS } from './config';
import { ChatInboxPage } from './pages/chat/ChatInboxPage';
import { ChatThreadPage } from './pages/chat/ChatThreadPage';
import { ChatNewPage } from './pages/chat/ChatNewPage';
import { GroupAdminPage } from './pages/chat/GroupAdminPage';
import { SaleDetailsPage } from './pages/chat/SaleDetailsPage';
import { ReceiptViewerPage } from './pages/chat/ReceiptViewerPage';
import { CommissionPolicyPage } from './pages/seller/CommissionPolicyPage';
import { AffiliatesPage } from './pages/seller/AffiliatesPage';
import { CommissionAnalyticsPage } from './pages/seller/CommissionAnalyticsPage';
import { SaleDetailPage } from './pages/seller/SaleDetailPage';
import { MyAffiliationsPage } from './pages/promoter/MyAffiliationsPage';
import { useChat } from './hooks/useChat';
import { getAccessToken, refreshSession } from './modules/auth/session';

// Delivery pages
import { DeliveryLandingPage } from './pages/delivery/DeliveryLandingPage';
import { RequestDeliveryPage } from './pages/delivery/RequestDeliveryPage';
import { DeliveryProfileSetupPage } from './pages/delivery/DeliveryProfileSetupPage';
import { DeliveryDashboardPage } from './pages/delivery/DeliveryDashboardPage';
import { DeliveryRequestsListPage } from './pages/delivery/DeliveryRequestsListPage';
import { DeliveryRequestDetailPage } from './pages/delivery/DeliveryRequestDetailPage';
import { ActiveDeliveryPage } from './pages/delivery/ActiveDeliveryPage';
import { DeliveryHistoryPage } from './pages/delivery/DeliveryHistoryPage';
import { DeliveryEarningsPage } from './pages/delivery/DeliveryEarningsPage';
import { DeliveryPartnersPage } from './pages/delivery/DeliveryPartnersPage';
import { StoreSearchPage } from './pages/delivery/StoreSearchPage';
import { ComponentsTestPage } from './pages/delivery/ComponentsTestPage';

// Governance pages
import {
  GovernancePage,
  ProposalsListPage,
  ProposalDetailPage,
  ReferendumsPage,
  TreasuryPage,
  CouncilPage,
  MultisigPage,
  CreateProposalPage,
  TreasuryRequestsPage,
  CreateTreasuryRequestPage,
  TreasuryRequestDetailPage,
} from './modules/governance';

// Vesting pages (FASE 9)
import { VestingPage } from './modules/vesting';

// Disputes pages (FASE 7)
import { DisputeDetailPage, MyDisputesPage } from './modules/disputes';

// Testnet access page
import { TestnetAccessPage } from './pages/TestnetAccessPage';

// Rewards pages
import MissionsHubPage from './pages/rewards/MissionsHubPage';
import StreakHistoryPage from './pages/rewards/StreakHistoryPage';
import CashbackDashboardPage from './pages/rewards/CashbackDashboardPage';
import AdminMissionsManagementPage from './pages/rewards/AdminMissionsManagementPage';
import TestRewardsHeader from './pages/TestRewardsHeader';

function LandingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [checkingVault, setCheckingVault] = useState(true);
  const [hasVault, setHasVault] = useState(false);
  const gateRef = useRef<HTMLElement | null>(null);

  console.log('🏠 LandingPage rendered');

  useEffect(() => {
    console.log('🏠 LandingPage mounted');
    let active = true;
    hasEncryptedSeed()
      .then((value) => {
        if (active) {
          console.log('🏠 hasEncryptedSeed result:', value);
          setHasVault(value);
        }
      })
      .finally(() => {
        if (active) {
          setCheckingVault(false);
        }
      });
    return () => {
      console.log('🏠 LandingPage unmounted');
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
        <HeroManifesto onScrollToAuth={scrollToGate} />
        <BZRSection />
        <MarketplacePreview />
        <TokenizedStoresSection />
        <EcosystemSection />
        <BlockchainSection />
        <FinalCTA />

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
      <MobileBottomNav />
    </>
  );
}

// Helper function to check if route is public
function isPublicRoute(pathname: string): boolean {
  const publicRoutes = ['/', '/auth', '/search', '/explore', '/vesting', '/testnet', '/delivery', '/marketplace'];
  return publicRoutes.some(route => pathname === route) ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/product/') ||
    pathname.startsWith('/service/') ||
    pathname.startsWith('/loja/') ||
    pathname.startsWith('/s/') ||
    pathname.startsWith('/m/');
}

// Internal component that uses router hooks
function AppInitializer() {
  const location = useLocation();

  useEffect(() => {
    // Try to restore session and initialize chat
    const initializeApp = async () => {
      console.log('[App] Initializing app...', { pathname: location.pathname });

      // Skip session refresh on public routes
      if (isPublicRoute(location.pathname)) {
        console.log('[App] Public route detected, skipping session refresh');
        return;
      }

      // If no active session, try to refresh from cookie
      if (!isSessionActive()) {
        console.log('[App] No active session, attempting refresh...');
        const refreshed = await refreshSession();
        if (!refreshed) {
          console.log('[App] Session refresh failed, user needs to login');
          return;
        }
        console.log('[App] Session refreshed successfully');
      }

      // Now check if we have an active session
      if (isSessionActive()) {
        console.log('[App] Session active');
        const token = getAccessToken();
        if (token) {
          console.log('[App] Access token found, initializing chat...');
          // Use getState() to access the store directly without creating a dependency
          useChat.getState().initialize(token).catch(err => {
            console.error('[App] Failed to initialize chat:', err);
          });
        } else {
          console.warn('[App] Session active but no access token');
        }
      } else {
        console.log('[App] No active session after refresh attempt');
      }
    };

    initializeApp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  return null;
}

function App() {

  return (
    <ThemeProvider>
      <BrowserRouter>
        <AppInitializer />
        <div className="min-h-screen bg-background">
          <Toaster position="top-right" richColors />
          <SessionBoundary />
          <PinProvider />
          <OfflineIndicator />
          <UpdatePrompt />
          <InstallPrompt />
          <MobileBottomNav />
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
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/marketplace" element={<MarketplacePage />} />
            {/* Product & Service Detail Pages - PUBLIC for SEO and sharing */}
            <Route path="/product/:id" element={<ProductDetailPage />} />
            <Route path="/service/:id" element={<ServiceDetailPage />} />
            {FEATURE_FLAGS.store_branded_v1 && (
              <Route path="/s/:shopSlug" element={<SellerPublicPage mode="branded" />} />
            )}
            <Route path="/loja/:slug" element={<StorePublicPage />} />
            <Route path="/m/:slug" element={<AffiliateMarketplacePage />} />
            {/* Redirects for backwards compatibility - TODO: Remove after migration period (target: 2026-Q1) */}
            <Route path="/store/:id" element={<Navigate to="/loja/:id" replace />} />
            <Route path="/seller/:slug" element={<Navigate to="/loja/:slug" replace />} />
            <Route path="/auth" element={<WelcomePage />} />
            <Route path="/auth/welcome" element={<WelcomePage />} />
            <Route path="/auth/guest-welcome" element={<GuestWelcomePage />} />
            <Route path="/auth/create" element={<CreateAccount />} />
            <Route path="/auth/import" element={<ImportAccount />} />
            <Route path="/auth/unlock" element={<Unlock />} />
            <Route path="/auth/recover-pin" element={<RecoverPin />} />
            <Route path="/auth/device-link" element={<DeviceLink />} />

            {/* Delivery - Public landing page */}
            <Route path="/delivery" element={<DeliveryLandingPage />} />

            {/* Vesting page - PUBLIC (FASE 9) */}
            <Route path="/vesting" element={<VestingPage />} />

            {/* Testnet Access page - PUBLIC */}
            <Route path="/testnet" element={<TestnetAccessPage />} />

            {/* Profile Public - Requires Auth */}
            <Route
              path="/u/:handle"
              element={
                <RequireAuth>
                  <AppLayout>
                    <ProfilePublicPage />
                  </AppLayout>
                </RequireAuth>
              }
            />

            {/* Rotas internas/autenticadas */}
            <Route
              path="/app/*"
              element={
                <RequireAuth>
                  <AppLayout>
                    <Routes>
                      <Route index element={<DashboardPage />} />
                      <Route path="dashboard" element={<DashboardPage />} />
                      <Route path="feed" element={<FeedPage />} />
                      <Route path="notifications" element={<NotificationsPage />} />
                      <Route path="profile/edit" element={<ProfileEditPage />} />
                      <Route path="posts/:postId" element={<PostDetailPage />} />
                      <Route path="bookmarks" element={<BookmarksPage />} />
                      <Route path="discover/people" element={<DiscoverPeoplePage />} />
                      <Route path="discover/trending" element={<DiscoverTrendingPage />} />
                      <Route path="analytics" element={<AnalyticsDashboard />} />
                      <Route path="seller/setup" element={<SellerSetupPage />} />
                      <Route path="sellers" element={<SellersListPage />} />
                      <Route path="sellers/:shopSlug" element={<SellerManagePage />} />
                      <Route path="new" element={<NewListingPage />} />
                      <Route path="cart" element={<CartPage />} />
                      <Route path="checkout" element={<CheckoutPage />} />
                      <Route path="orders/:id/pay" element={<OrderPayPage />} />
                      <Route path="orders/:id" element={<OrderPage />} />
                      <Route path="orders/:orderId/escrow" element={<EscrowManagementPage />} />
                      <Route path="admin/escrows" element={<AdminEscrowDashboard />} />
                      <Route path="p2p" element={<P2PHomePage />} />
                      <Route path="p2p/my-orders" element={<P2PMyOrdersPage />} />
                      <Route path="p2p/offers/new" element={<P2POfferNewPage />} />
                      <Route path="p2p/offers/:id" element={<P2POfferPublicPage />} />
                      <Route path="p2p/orders/:id" element={<P2POrderRoomPage />} />
                      <Route path="p2p/zari/stats" element={<ZARIStatsPage />} />
                      <Route path="chat" element={<ChatInboxPage />} />
                      <Route path="chat/new" element={<ChatNewPage />} />
                      <Route path="chat/:threadId" element={<ChatThreadPage />} />
                      <Route path="chat/group/:groupId/admin" element={<GroupAdminPage />} />
                      <Route path="chat/sales/:saleId" element={<SaleDetailsPage />} />
                      <Route path="receipts/:cid" element={<ReceiptViewerPage />} />
                      <Route path="seller/commission-policy" element={<CommissionPolicyPage />} />
                      <Route path="seller/affiliates" element={<AffiliatesPage />} />
                      <Route path="seller/commissions" element={<CommissionAnalyticsPage />} />
                      <Route path="sales/:saleId" element={<SaleDetailPage />} />
                      <Route path="promoter/affiliates" element={<MyAffiliationsPage />} />
                      <Route path="affiliate/dashboard" element={<AffiliateDashboardPage />} />

                      {/* Delivery routes */}
                      <Route path="delivery/request/new" element={<RequestDeliveryPage />} />
                      <Route path="delivery/profile/setup" element={<DeliveryProfileSetupPage />} />
                      <Route path="delivery/profile/edit" element={<DeliveryProfileSetupPage />} />
                      <Route path="delivery/dashboard" element={<DeliveryDashboardPage />} />
                      <Route path="delivery/requests" element={<DeliveryRequestsListPage />} />
                      <Route path="delivery/requests/:id" element={<DeliveryRequestDetailPage />} />
                      <Route path="delivery/active/:id" element={<ActiveDeliveryPage />} />
                      <Route path="delivery/track/:id" element={<ActiveDeliveryPage />} />
                      <Route path="delivery/history" element={<DeliveryHistoryPage />} />
                      <Route path="delivery/earnings" element={<DeliveryEarningsPage />} />
                      <Route path="delivery/stores" element={<StoreSearchPage />} />
                      <Route path="store/delivery-partners" element={<DeliveryPartnersPage />} />
                      <Route path="delivery/test-components" element={<ComponentsTestPage />} />

                      {/* Governance routes */}
                      <Route path="governance" element={<GovernancePage />} />
                      <Route path="governance/proposals" element={<ProposalsListPage />} />
                      <Route path="governance/proposals/new" element={<CreateProposalPage />} />
                      <Route path="governance/proposals/:type/:id" element={<ProposalDetailPage />} />
                      <Route path="governance/referendums" element={<ReferendumsPage />} />
                      <Route path="governance/referendums/:id" element={<ProposalDetailPage />} />
                      <Route path="governance/treasury" element={<TreasuryPage />} />
                      <Route path="governance/treasury/requests" element={<TreasuryRequestsPage />} />
                      <Route path="governance/treasury/requests/new" element={<CreateTreasuryRequestPage />} />
                      <Route path="governance/treasury/requests/:id" element={<TreasuryRequestDetailPage />} />
                      <Route path="governance/council" element={<CouncilPage />} />
                      <Route path="governance/multisig" element={<MultisigPage />} />

                      {/* Disputes routes (FASE 7) */}
                      <Route path="disputes" element={<MyDisputesPage />} />
                      <Route path="disputes/:disputeId" element={<DisputeDetailPage />} />

                      {/* Rewards routes */}
                      <Route path="rewards/missions" element={<MissionsHubPage />} />
                      <Route path="rewards/streaks" element={<StreakHistoryPage />} />
                      <Route path="rewards/cashback" element={<CashbackDashboardPage />} />
                      <Route path="admin/missions" element={<AdminMissionsManagementPage />} />
                      <Route path="test-rewards-header" element={<TestRewardsHeader />} />

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
