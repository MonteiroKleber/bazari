import * as React from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import { BaseHeader } from "./BaseHeader";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ApiHealth } from "./ApiHealth";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { CreatePostButton } from "./social/CreatePostButton";
import { UserMenu } from "./UserMenu";
import { GlobalSearchBar } from "./GlobalSearchBar";
import { NotificationCenter } from "./NotificationCenter";
// import { WalletMenu } from "./WalletMenu"; // placeholder futuro

/**
 * AppHeader para área interna/pós-login
 * Mantém o mesmo visual base mas com navegação e ações internas
 */
export function AppHeader() {
  const { t } = useTranslation();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const isActive = (path: string) => {
    if (path === '/app') {
      return location.pathname === '/app' || location.pathname === '/app/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  const navLinks = [
    { to: '/app', label: t('nav.dashboard', { defaultValue: 'Dashboard' }), checkActive: () => isActive('/app') && !location.pathname.includes('/sellers') && !location.pathname.includes('/wallet') && !location.pathname.includes('/p2p') },
    { to: '/search', label: t('nav.marketplace', { defaultValue: 'Marketplace' }), checkActive: () => isActive('/search') || isActive('/explore') },
    { to: '/app/sellers', label: t('nav.myStores', { defaultValue: 'Minhas Lojas' }), checkActive: () => isActive('/app/sellers') || isActive('/app/seller') },
    { to: '/app/p2p', label: t('nav.p2p', { defaultValue: 'P2P' }), checkActive: () => isActive('/app/p2p') },
    { to: '/app/wallet', label: t('nav.wallet', { defaultValue: 'Wallet' }), checkActive: () => isActive('/app/wallet') },
  ];

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
            <SheetContent side="left" className="w-[280px] sm:w-[320px]">
              <SheetHeader>
                <SheetTitle>{t('nav.navigation', { defaultValue: 'Navegação' })}</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-4 mt-6" aria-label={t('nav.main', { defaultValue: 'Navegação principal' })}>
                {navLinks.map((link) => {
                  const active = link.checkActive();
                  return (
                    <Link
                      key={link.to}
                      to={link.to}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "text-base font-medium transition-colors hover:text-primary px-2 py-2 rounded-md",
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
              <div className="mt-8 pt-6 border-t flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t('nav.theme', { defaultValue: 'Tema' })}</span>
                  <ThemeSwitcher />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t('nav.language', { defaultValue: 'Idioma' })}</span>
                  <LanguageSwitcher />
                </div>
                <div className="mt-2">
                  <ApiHealth />
                </div>
              </div>
            </SheetContent>
          </Sheet>

          {/* Logo - link para dashboard */}
          <Link to="/app" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold">B</span>
            </div>
            <span className="text-xl font-bold">Bazari</span>
          </Link>
        </>
      }
      nav={
        <>
          <nav className="hidden md:flex items-center gap-6" aria-label={t('nav.main', { defaultValue: 'Navegação principal' })}>
            {navLinks.map((link) => {
              const active = link.checkActive();
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={cn(
                    "text-sm font-medium transition-colors hover:text-primary",
                    active
                      ? "text-foreground border-b-2 border-primary pb-1"
                      : "text-muted-foreground"
                  )}
                  aria-current={active ? 'page' : undefined}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Global Search Bar */}
          <div className="hidden md:block flex-1 max-w-md mx-4">
            <GlobalSearchBar />
          </div>
        </>
      }
      right={
        <>
          {/* Ações internas */}
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-3">
              {/* Futuramente adicionar: Search, Notifications, Wallet */}
              <CreatePostButton />
              <ApiHealth />
              <LanguageSwitcher />
              <ThemeSwitcher />
              <NotificationCenter />
              <UserMenu />
              {/* <WalletMenu /> */}
            </div>
          </div>
        </>
      }
    />
  );
}