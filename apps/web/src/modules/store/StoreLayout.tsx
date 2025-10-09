import { PropsWithChildren, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils';

export type StoreTheme = {
  bg?: string;
  ink?: string;
  brand?: string;
  accent?: string;
  layoutVariant?: 'classic' | 'branded-hero';
};

interface StoreLayoutProps {
  theme?: StoreTheme | null;
  layout?: 'classic' | 'branded-hero';
  className?: string;
}

export function StoreLayout({ theme, layout, className, children }: PropsWithChildren<StoreLayoutProps>) {
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

  const activeLayout = layout || theme?.layoutVariant || 'classic';

  if (activeLayout === 'branded-hero') {
    return (
      <div
        className={cn('store-layout-branded', className)}
        style={style as CSSProperties}
      >
        <div className="hero-section bg-store-brand text-store-bg py-16 px-4">
          <div className="container mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-4">
              Bem-vindo à nossa loja
            </h1>
            <p className="text-lg md:text-xl opacity-90">
              Produtos de qualidade com atendimento excepcional
            </p>
          </div>
        </div>
        <div className="content-section bg-store-bg text-store-ink">
          {children}
        </div>
      </div>
    );
  }

  // Classic layout (default)
  return (
    <div
      className={cn('store-layout-classic bg-store-bg text-store-ink', className)}
      style={style as CSSProperties}
    >
      {children}
    </div>
  );
}

export default StoreLayout;
