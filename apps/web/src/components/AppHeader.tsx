import * as React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, MoreHorizontal, MessageSquare, Newspaper, LogOut, User } from "lucide-react";
import { BaseHeader } from "./BaseHeader";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ApiHealth } from "./ApiHealth";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { CreatePostButton } from "./social/CreatePostButton";
import { UserMenu } from "./UserMenu";
import { GlobalSearchBar } from "./GlobalSearchBar";
import { NotificationCenter } from "./NotificationCenter";
import { ReputationBadge } from "./profile/ReputationBadge";
import { StreakWidgetCompact, CashbackBalanceCompact } from "./rewards/index";
import { logoutSession } from "@/modules/auth/api";
import { clearSession } from "@/modules/auth/session";
import { chatWs } from "@/lib/chat/websocket";
import { toast } from "sonner";
import { apiHelpers } from "@/lib/api";
import { useIsDAOMember } from "@/hooks/useIsDAOMember";
import { useUserAppsStore } from "@/platform/store";
import { useChat } from "@/hooks/useChat";
import { BadgeCounter } from "@/components/ui/badge-counter";
// import { WalletMenu } from "./WalletMenu"; // placeholder futuro

/**
 * AppHeader para área interna/pós-login
 * Mantém o mesmo visual base mas com navegação e ações internas
 */
export function AppHeader() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [profile, setProfile] = React.useState<any>(null);
  const [loadingProfile, setLoadingProfile] = React.useState(true);
  const [loggingOut, setLoggingOut] = React.useState(false);
  const isDAOMember = useIsDAOMember();
  const { isInstalled } = useUserAppsStore();
  const chatUnreadCount = useChat((state) => state.getTotalUnreadCount());

  const isActive = (path: string) => {
    if (path === '/app/hub') {
      return location.pathname === '/app' || location.pathname === '/app/hub' || location.pathname === '/app/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  // Primary navigation - most used features
  const primaryNavLinks = [
    { to: '/app/feed', label: t('nav.feed', { defaultValue: 'Feed' }), icon: Newspaper, checkActive: () => isActive('/app/feed'), badge: 0 },
    { to: '/search', label: t('nav.marketplace', { defaultValue: 'Marketplace' }), checkActive: () => isActive('/search') || isActive('/explore'), badge: 0 },
    { to: '/app/chat', label: t('nav.chat', { defaultValue: 'Chat' }), icon: MessageSquare, checkActive: () => isActive('/app/chat'), badge: chatUnreadCount },
  ];

  // Secondary navigation - accessed via dropdown "Mais"
  // Condiciona links baseado nos apps instalados
  const baseSecondaryLinks = [
    { to: '/app/hub', label: t('nav.home', { defaultValue: 'Home' }), checkActive: () => isActive('/app/hub') },
    // Minhas Lojas - só aparece se o app 'stores' estiver instalado
    ...(isInstalled('stores') ? [{ to: '/app/sellers', label: t('nav.myStores', { defaultValue: 'Minhas Lojas' }), checkActive: () => isActive('/app/sellers') || isActive('/app/seller') }] : []),
    { to: '/app/wallet', label: t('nav.wallet', { defaultValue: 'Wallet' }), checkActive: () => isActive('/app/wallet') },
    { to: '/app/p2p', label: t('nav.p2p', { defaultValue: 'P2P' }), checkActive: () => isActive('/app/p2p') },
  ];

  // Add Admin links for DAO members (Council Members)
  const secondaryNavLinks = isDAOMember
    ? [
        ...baseSecondaryLinks,
        { to: '/app/admin/escrows', label: t('nav.adminEscrows', { defaultValue: 'Admin Escrows' }), checkActive: () => isActive('/app/admin/escrows') },
        { to: '/app/admin/missions', label: t('nav.adminMissions', { defaultValue: 'Admin Panel (DAO)' }), checkActive: () => isActive('/app/admin/missions') },
      ]
    : baseSecondaryLinks;

  // All links for mobile menu
  const allNavLinks = [...primaryNavLinks, ...secondaryNavLinks];

  // Fetch user profile for mobile menu
  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res: any = await apiHelpers.getMeProfile();
        if (active) {
          setProfile(res.profile);
        }
      } catch (error) {
        // Handle error silently
      } finally {
        if (active) setLoadingProfile(false);
      }
    })();
    return () => { active = false; };
  }, []);

  // Handle logout
  const handleLogout = async () => {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      // Desconectar WebSocket imediatamente para marcar como offline
      chatWs.disconnect();

      await logoutSession();
      toast.success(t('auth.logout.success', { defaultValue: 'Logout realizado com sucesso!' }));
      setMobileMenuOpen(false);
      navigate('/');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      clearSession();
      toast.error(t('auth.logout.error', { defaultValue: 'Erro ao fazer logout, mas você foi desconectado localmente.' }));
      setMobileMenuOpen(false);
      navigate('/');
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <BaseHeader
      left={
        <>
          {/* Menu Mobile */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label={t('nav.menu', { defaultValue: 'Menu' })}>
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] sm:w-[320px] flex flex-col p-0">
              <SheetHeader className="px-6 py-4 border-b">
                <SheetTitle>{t('nav.navigation', { defaultValue: 'Navegação' })}</SheetTitle>
              </SheetHeader>

              {/* Scrollable content area */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                {/* User Profile Section */}
                {!loadingProfile && profile && (
                  <div className="p-4 bg-muted/30 rounded-lg mb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                        {profile.avatarUrl ? (
                          <img
                            src={profile.avatarUrl}
                            alt={profile.displayName}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <User className="h-6 w-6 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {profile.displayName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          @{profile.handle}
                        </p>
                        {profile.reputationScore !== undefined && (
                          <div className="mt-1">
                            <ReputationBadge
                              score={profile.reputationScore}
                              tier={profile.reputationTier || 'bronze'}
                              size="sm"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Navigation Links */}
                <nav className="flex flex-col gap-2" aria-label={t('nav.main', { defaultValue: 'Navegação principal' })}>
                  {allNavLinks.map((link) => {
                    const active = link.checkActive();
                    return (
                      <Link
                        key={link.to}
                        to={link.to}
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          "text-sm font-medium transition-colors hover:text-primary px-3 py-2 rounded-md",
                          active
                            ? "bg-primary/10 text-primary"
                            : "text-foreground hover:bg-accent"
                        )}
                        aria-current={active ? 'page' : undefined}
                      >
                        {link.label}
                      </Link>
                    );
                  })}
                </nav>

                {/* Mobile actions */}
                <div className="mt-6 pt-4 border-t space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{t('nav.theme', { defaultValue: 'Tema' })}</span>
                    <ThemeSwitcher />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{t('nav.language', { defaultValue: 'Idioma' })}</span>
                    <LanguageSwitcher />
                  </div>
                  <div>
                    <ApiHealth />
                  </div>
                </div>
              </div>

              {/* Fixed bottom section with Logout */}
              {!loadingProfile && profile && (
                <div className="border-t px-6 py-4 bg-background">
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                    onClick={handleLogout}
                    disabled={loggingOut}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    {loggingOut ? t('auth.logout.loading', { defaultValue: 'Saindo...' }) : t('auth.logout.button', { defaultValue: 'Sair' })}
                  </Button>
                </div>
              )}
            </SheetContent>
          </Sheet>

          {/* Logo - link para Home */}
          <Link to="/app/hub" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold">B</span>
            </div>
            <span className="text-xl font-bold hidden sm:inline">Bazari</span>
          </Link>

          {/* Global Search Bar - Mobile Compact */}
          <div className="md:hidden">
            <GlobalSearchBar variant="compact" />
          </div>
        </>
      }
      nav={
        <div className="hidden md:flex items-center gap-6 flex-1">
          <nav className="flex items-center gap-6 flex-shrink-0" aria-label={t('nav.main', { defaultValue: 'Navegação principal' })}>
            {/* Primary Navigation Links */}
            {primaryNavLinks.map((link) => {
              const active = link.checkActive();
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={cn(
                    "text-sm font-medium transition-colors hover:text-primary whitespace-nowrap relative",
                    active
                      ? "text-foreground border-b-2 border-primary pb-1"
                      : "text-muted-foreground"
                  )}
                  aria-current={active ? 'page' : undefined}
                >
                  {link.label}
                  {link.badge > 0 && (
                    <BadgeCounter count={link.badge} size="sm" className="top-[-8px] right-[-12px]" />
                  )}
                </Link>
              );
            })}

            {/* "Mais" Dropdown Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-sm font-medium text-muted-foreground hover:text-primary whitespace-nowrap">
                  <MoreHorizontal className="h-4 w-4 mr-1" />
                  {t('nav.more', { defaultValue: 'Mais' })}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>{t('nav.otherPages', { defaultValue: 'Outras Páginas' })}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {secondaryNavLinks.map((link) => {
                  const active = link.checkActive();
                  return (
                    <DropdownMenuItem key={link.to} asChild>
                      <Link
                        to={link.to}
                        className={cn(
                          "cursor-pointer",
                          active && "bg-accent text-accent-foreground"
                        )}
                      >
                        {link.label}
                      </Link>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>

          {/* Global Search Bar - Desktop Full */}
          <div className="flex-1 mx-6">
            <GlobalSearchBar variant="full" />
          </div>
        </div>
      }
      right={
        <>
          {/* Ações internas */}
          <div className="hidden md:flex items-center gap-3">
            {/* Rewards Widgets - só aparece se o app 'rewards' estiver instalado */}
            {isInstalled('rewards') && (
              <>
                <Link to="/app/rewards/streaks" className="hover:opacity-80 transition-opacity">
                  <StreakWidgetCompact />
                </Link>
                <Link to="/app/rewards/cashback" className="hover:opacity-80 transition-opacity">
                  <CashbackBalanceCompact />
                </Link>
                <div className="w-px h-6 bg-border" /> {/* Separator */}
              </>
            )}

            <CreatePostButton />
            <ApiHealth />
            <LanguageSwitcher />
            <ThemeSwitcher />
            <NotificationCenter />
            <UserMenu />
            {/* <WalletMenu /> */}
          </div>
        </>
      }
    />
  );
}