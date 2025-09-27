import { PropsWithChildren, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils';

export type StoreTheme = {
  bg?: string;
  ink?: string;
  brand?: string;
  accent?: string;
};

interface StoreLayoutProps {
  theme?: StoreTheme | null;
  className?: string;
}

export function StoreLayout({ theme, className, children }: PropsWithChildren<StoreLayoutProps>) {
  const style = useMemo(() => {
    const vars: Record<string, string> = {};
    const bg = theme?.bg ?? 'var(--background)';
    const ink = theme?.ink ?? 'var(--foreground)';
    const brand = theme?.brand ?? 'var(--primary)';
    const accent = theme?.accent ?? 'var(--accent)';

    vars['--store-bg'] = bg;
    vars['--store-ink'] = ink;
    vars['--store-brand'] = brand;
    vars['--store-accent'] = accent;

    if (theme?.bg) vars['--background'] = theme.bg;
    if (theme?.ink) vars['--foreground'] = theme.ink;
    if (theme?.brand) vars['--primary'] = theme.brand;
    if (theme?.accent) vars['--accent'] = theme.accent;
    return vars;
  }, [theme?.accent, theme?.bg, theme?.brand, theme?.ink]);

  return (
    <div
      className={cn('store-layout bg-store-bg text-store-ink', className)}
      style={style as CSSProperties}
    >
      {children}
    </div>
  );
}

export default StoreLayout;
