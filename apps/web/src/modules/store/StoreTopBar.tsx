import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { isSessionActive } from '@/modules/auth';
import { cn } from '@/lib/utils';
import type { StoreTheme } from './StoreLayout';

interface StoreTopBarProps {
  slug: string;
  className?: string;
  theme?: StoreTheme | null;
}

export function StoreTopBar({ slug, className, theme }: StoreTopBarProps) {
  const navigate = useNavigate();
  const [walletConnected, setWalletConnected] = useState(false);

  useEffect(() => {
    setWalletConnected(isSessionActive());
  }, []);

  const style = useMemo(() => {
    const vars: Record<string, string> = {};
    vars['--store-bg'] = theme?.bg ?? 'var(--background)';
    vars['--store-ink'] = theme?.ink ?? 'var(--foreground)';
    vars['--store-brand'] = theme?.brand ?? 'var(--primary)';
    vars['--store-accent'] = theme?.accent ?? 'var(--accent)';
    return vars;
  }, [theme?.accent, theme?.bg, theme?.brand, theme?.ink]);

  return (
    <div
      className={cn(
        'sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-store-ink/10 bg-store-brand/90 px-4 text-sm text-store-ink backdrop-blur',
        className
      )}
      style={style}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium uppercase tracking-wide text-xs text-store-ink/80">Powered by Bazari</span>
        <span className="hidden sm:inline text-store-ink/70">•</span>
        <span className="hidden sm:inline text-store-ink/80">Pagamento em BZR</span>
        <span className="hidden sm:inline text-store-ink/70">•</span>
        <span className={`font-medium ${walletConnected ? 'text-store-ink' : 'text-store-ink/80'}`}>
          {walletConnected ? 'Wallet conectada' : 'Wallet offline'}
        </span>
      </div>
      <Button
        size="sm"
        variant="secondary"
        className="bg-store-accent text-store-ink hover:bg-store-accent/80"
        onClick={() => navigate(`/seller/${slug}`)}
      >
        Voltar
      </Button>
    </div>
  );
}

export default StoreTopBar;
