import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const languages = [
    { code: 'pt', name: '🇧🇷 PT' },
    { code: 'en', name: '🇺🇸 EN' },
    { code: 'es', name: '🇪🇸 ES' },
  ];

  const handleChange = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('bazari:lang', lang);
  };

  return (
    <div className="inline-flex items-center gap-2">
      <Globe className="h-4 w-4 text-muted-foreground" />
      <select
        className="border border-input px-3 py-1 rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        value={i18n.language}
        onChange={(e) => handleChange(e.target.value)}
      >
        {languages.map(lang => (
          <option key={lang.code} value={lang.code}>{lang.name}</option>
        ))}
      </select>
    </div>
  );
}