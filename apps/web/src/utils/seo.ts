// V-1 (2025-09-18): Utilitários de SEO e JSON-LD para PDPs de produto e serviço

import type { ProductDetail } from '../hooks/useProductDetail';
import type { ServiceDetail } from '../hooks/useServiceDetail';
import { API_BASE_URL } from '../config';

const toAbsoluteUrl = (candidate?: string | null): string | undefined => {
  if (!candidate) return undefined;
  try {
    return new URL(candidate).toString();
  } catch {
    try {
      const base = API_BASE_URL ?? 'http://localhost:3000';
      const normalized = candidate.startsWith('/') ? candidate : `/${candidate}`;
      return new URL(normalized, base).toString();
    } catch {
      return undefined;
    }
  }
};

const sanitiseDescription = (value?: string | null): string | undefined => {
  if (!value) return undefined;
  const compact = value.replace(/\s+/g, ' ').trim();
  return compact.length > 0 ? compact : undefined;
};

const normalisePrice = (value?: string | null): string | undefined => {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return undefined;
  return numeric.toFixed(2);
};

const collectImages = (media?: Array<{ url?: string }>, fallback?: string | null): string[] => {
  const images = Array.isArray(media)
    ? media
        .map(item => toAbsoluteUrl(item?.url))
        .filter((url): url is string => typeof url === 'string')
    : [];

  if (fallback) {
    const resolved = toAbsoluteUrl(fallback);
    if (resolved) {
      images.unshift(resolved);
    }
  }

  return Array.from(new Set(images));
};

export function generateProductSchema(item: ProductDetail) {
  const images = collectImages(item.media, undefined);
  const price = normalisePrice(item.priceBzr ?? null);

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: item.title,
    description: sanitiseDescription(item.description),
  };

  if (images.length > 0) {
    schema.image = images;
  }

  if (price) {
    schema.offers = {
      priceCurrency: 'BZR',
      price,
    };
  }

  return schema;
}

export function generateServiceSchema(item: ServiceDetail) {
  const images = collectImages(item.media, undefined);
  const price = normalisePrice(item.basePriceBzr ?? null);

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: item.title,
    description: sanitiseDescription(item.description),
  };

  if (images.length > 0) {
    schema.image = images;
  }

  if (price) {
    schema.offers = {
      priceCurrency: 'BZR',
      price,
    };
  }

  return schema;
}
