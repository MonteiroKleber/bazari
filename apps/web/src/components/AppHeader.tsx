import * as React from "react";
import { BaseHeader } from "./BaseHeader";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { LanguageSwitcher } from "./LanguageSwitcher";
// import { ApiHealth } from "./ApiHealth"; // versão detalhada (futuro)
// import { UserMenu } from "./UserMenu";   // placeholder futuro
// import { WalletMenu } from "./WalletMenu"; // placeholder futuro
// import { Search } from "lucide-react"; // placeholder futuro

/**
 * AppHeader para área interna/pós-login
 * Mantém o mesmo visual base mas com navegação e ações internas
 */
export function AppHeader() {
  return (
    <BaseHeader
      left={
        <>
          {/* Logo - igual ao público */}
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold">B</span>
            </div>
            <span className="text-xl font-bold">Bazari</span>
          </div>
        </>
      }
      nav={
        <>
          {/* Nav interna - deixando vazia por enquanto */}
          {/* Futuramente adicionar: Dashboard, DAO, Marketplace, Admin, etc. */}
          <nav className="hidden md:flex items-center gap-6">
            {/* Links internos serão adicionados aqui quando houver rotas internas */}
          </nav>
        </>
      }
      right={
        <>
          {/* Ações internas */}
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-3">
              {/* Futuramente adicionar: Search, Notifications, UserMenu, Wallet */}
              <LanguageSwitcher />
              <ThemeSwitcher />
              {/* <ApiHealth /> versão detalhada com ambiente/versão */}
              {/* <UserMenu /> */}
              {/* <WalletMenu /> */}
            </div>
          </div>
        </>
      }
    />
  );
}