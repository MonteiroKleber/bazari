import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { ThemeSwitcher } from './ThemeSwitcher';
import { LanguageSwitcher } from './LanguageSwitcher';
import { BaseHeader } from './BaseHeader';
import { Button } from './ui/button';

/**
 * Header para páginas de autenticação
 * - Logo clicável que retorna para landing page
 * - Desktop: Logo + Theme + Language switchers
 * - Mobile: Logo + Menu hambúrguer (igual landing page)
 */
export function AuthHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>
      <BaseHeader
        left={
          <a href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold">B</span>
            </div>
            <span className="text-xl font-bold">Bazari</span>
          </a>
        }
        right={
          <div className="flex items-center gap-4">
            {/* Desktop: Theme e Language switchers */}
            <div className="hidden md:flex items-center gap-3">
              <LanguageSwitcher />
              <ThemeSwitcher />
            </div>

            {/* Mobile: Menu hambúrguer */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        }
      />

      {/* Menu mobile expansível */}
      {isMenuOpen && (
        <div className="md:hidden fixed top-16 left-0 right-0 z-40 bg-background border-b">
          <div className="container mx-auto px-4 py-4">
            <div className="flex flex-col gap-3">
              <LanguageSwitcher />
              <ThemeSwitcher />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default AuthHeader;
