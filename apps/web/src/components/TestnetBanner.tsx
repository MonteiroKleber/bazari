import { useTranslation } from 'react-i18next';
import { Badge } from './ui/badge';

export function TestnetBanner() {
  const { t } = useTranslation();

  return (
    <div className="mb-4 rounded-lg border-2 border-amber-500/30 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 px-4 py-2.5 animate-in fade-in slide-in-from-top-2 duration-500">
      <div className="flex items-center justify-center gap-2 flex-wrap">
        <Badge
          variant="outline"
          className="border-amber-600 text-amber-700 dark:text-amber-400 font-bold text-xs whitespace-nowrap"
        >
          ⚠️ TESTNET
        </Badge>
        <span className="text-xs text-muted-foreground text-center">
          {t('testnet.banner.message')}
        </span>
      </div>
    </div>
  );
}
