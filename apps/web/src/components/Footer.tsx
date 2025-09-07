import { useTranslation } from 'react-i18next';
import { Github, FileText, Mail } from 'lucide-react';

export function Footer() {
  const { t } = useTranslation();

  const links = [
    { icon: Github, label: t('footer.github'), href: '#' },
    { icon: FileText, label: t('footer.docs'), href: '#' },
    { icon: Mail, label: t('footer.contact'), href: '#contact' },
  ];

  return (
    <footer className="border-t bg-card">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xs">B</span>
            </div>
            <span className="font-semibold">Bazari</span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6">
            {links.map((link, index) => {
              const Icon = link.icon;
              return (
                <a
                  key={index}
                  href={link.href}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </a>
              );
            })}
          </div>

          {/* Copyright */}
          <div className="text-sm text-muted-foreground">
            {t('footer.rights')}
          </div>
        </div>
      </div>
    </footer>
  );
}