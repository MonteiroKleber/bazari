import { useTranslation } from 'react-i18next';
import { ThemeSwitcher } from './ThemeSwitcher';
import { LanguageSwitcher } from './LanguageSwitcher';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from './ui/button';
import { BaseHeader } from './BaseHeader';

export function Header() {
  const { t } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navItems = [
    { label: t('header.about'), href: '#about' },
    { label: t('header.modules'), href: '#modules' },
    { label: t('header.roadmap'), href: '#roadmap' },
    { label: t('header.contact'), href: '#contact' },
  ];

  const renderNavLinks = () => {
    return navItems.map((item) => (
      <a key={item.href} href={item.href} className="text-sm font-medium transition-colors hover:text-primary">
        {item.label}
      </a>
    ));
  };

  return (
    <>
      <BaseHeader
        left={
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold">B</span>
            </div>
            <span className="text-xl font-bold">Bazari</span>
          </div>
        }
        nav={
          <nav className="hidden md:flex items-center gap-6">
            {renderNavLinks()}
          </nav>
        }
        right={
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-3">
              <LanguageSwitcher />
              <ThemeSwitcher />
            </div>
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

      {isMenuOpen && (
        <div className="md:hidden py-4 border-t">
          <div className="container mx-auto px-4">
            <nav className="flex flex-col gap-3">
              {navItems.map((item) => (
                <a key={item.href} href={item.href} className="text-sm font-medium transition-colors hover:text-primary px-2 py-1" onClick={() => setIsMenuOpen(false)}>
                  {item.label}
                </a>
              ))}
            </nav>
            <div className="flex flex-col gap-3 mt-4 pt-4 border-t">
              <LanguageSwitcher />
              <ThemeSwitcher />
            </div>
          </div>
        </div>
      )}
    </>
  );
}