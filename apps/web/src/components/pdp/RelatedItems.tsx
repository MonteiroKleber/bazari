// V-1 (2025-09-18): Lista de itens relacionados reutilizando tokens de tema e acessibilidade básica

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '../ui/card';
import { cn } from '../../lib/utils';
import { API_BASE_URL } from '../../config';
import type { RelatedItem } from '../../hooks/useRelatedItems';

interface RelatedItemsProps {
  items: RelatedItem[];
  kind: 'product' | 'service';
}

const resolveImageUrl = (candidate?: string | null): string | null => {
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    return url.toString();
  } catch {
    const base = API_BASE_URL ?? 'http://localhost:3000';
    try {
      const normalized = candidate.startsWith('/') ? candidate : `/${candidate}`;
      return new URL(normalized, base).toString();
    } catch {
      return null;
    }
  }
};

const extractImage = (item: RelatedItem): string | null => {
  const mediaUrl = item.media?.find(media => media?.url)?.url;
  if (typeof mediaUrl === 'string' && mediaUrl.length > 0) {
    return resolveImageUrl(mediaUrl);
  }
  if (typeof item.coverUrl === 'string') {
    return resolveImageUrl(item.coverUrl);
  }
  return null;
};

const coercePrice = (price?: string | null): number | null => {
  if (!price) return null;
  const value = Number(price);
  return Number.isFinite(value) ? value : null;
};

export function RelatedItems({ items, kind }: RelatedItemsProps) {
  const { t, i18n } = useTranslation();

  const list = useMemo(() => {
    if (!Array.isArray(items)) return [];
    return items.filter(item => Boolean(item?.id && item?.title)).slice(0, 8);
  }, [items]);

  if (list.length === 0) {
    return null;
  }

  const formatter = (price: number) => {
    try {
      const nf = new Intl.NumberFormat(i18n.language || 'pt-BR', {
        style: 'currency',
        currency: 'BZR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      return nf.format(price);
    } catch {
      return `${price.toFixed(2)} BZR`;
    }
  };

  return (
    <section aria-labelledby="pdp-related-heading" className="mt-12">
      <div className="space-y-4">
        <h2 id="pdp-related-heading" className="text-2xl font-semibold text-foreground">
          {t('pdp.related', { defaultValue: 'Produtos Relacionados' })}
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {list.map(item => {
            const href = kind === 'service' ? `/service/${item.id}` : `/product/${item.id}`;
            const priceCandidate = coercePrice(item.priceBzr ?? item.basePriceBzr ?? null);
            const imageUrl = extractImage(item);

            return (
              <Card
                key={item.id}
                className={cn(
                  'group h-full overflow-hidden rounded-2xl border border-border bg-card text-foreground shadow-sm',
                  'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background'
                )}
              >
                <Link
                  to={href}
                  className="flex h-full flex-col focus:outline-none"
                  aria-label={item.title}
                >
                  {imageUrl ? (
                    <div className="aspect-video w-full overflow-hidden bg-muted">
                      <img
                        src={imageUrl}
                        alt={item.title}
                        className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <div className="aspect-video w-full bg-muted" aria-hidden />
                  )}

                  <CardContent className="flex flex-1 flex-col gap-2 p-4">
                    <h3 className="line-clamp-2 text-base font-semibold text-foreground">{item.title}</h3>
                    {item.description ? (
                      <p className="line-clamp-2 text-sm text-muted-foreground">{item.description}</p>
                    ) : null}
                    {priceCandidate !== null ? (
                      <p className="mt-auto text-sm font-medium text-foreground">
                        {formatter(priceCandidate)}
                      </p>
                    ) : null}
                  </CardContent>
                </Link>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default RelatedItems;
