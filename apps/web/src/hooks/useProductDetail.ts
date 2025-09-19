// V-4 (2025-09-18): Normaliza mídia do produto em mediaNormalized preservando fallback seguro
// V-3 (2025-09-18): Enriquecimento da PDP (categoryId, seller, rating normalizado)

import { useEffect, useState } from 'react';
import { apiHelpers, ApiError } from '../lib/api';
import { API_BASE_URL } from '../config';

export interface ProductDetail {
  id: string;
  daoId: string;
  daoName?: string | null;
  title: string;
  description?: string | null;
  priceBzr?: string | null;
  categoryId?: string | null;
  categoryPath: string[];
  attributes: Record<string, unknown>;
  media: Array<{ id: string; url: string }>;
  mediaNormalized: Array<{ id?: string; url: string }>;
  ratingValue?: number | null;
  ratingCount?: number | null;
  sellerReputation?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export type DetailStatus = 'idle' | 'loading' | 'success' | 'error';
export type DetailError = 'not_found' | 'server' | null;

interface DetailState<T> {
  status: DetailStatus;
  data?: T;
  error: DetailError;
}

const toNumberOrNull = (value: unknown): number | null => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const toAbsoluteUrl = (candidate: unknown): string | null => {
  if (typeof candidate !== 'string') return null;
  const value = candidate.trim();
  if (!value) return null;
  try {
    return new URL(value).toString();
  } catch {
    if (!API_BASE_URL) return null;
    try {
      const normalized = value.startsWith('/') ? value : `/${value}`;
      return new URL(normalized, API_BASE_URL).toString();
    } catch {
      return null;
    }
  }
};

const normalizeMedia = (item: any): Array<{ id?: string; url: string }> => {
  if (!item) return [];

  const fromMediaArray = () => {
    if (!Array.isArray(item.media)) return [];
    const mapped = item.media
      .map((entry: any) => {
        const rawUrl = typeof entry?.url === 'string' ? entry.url : null;
        if (!rawUrl) return null;
        const absolute = toAbsoluteUrl(rawUrl) ?? rawUrl;
        const id = entry?.id ?? entry?.mediaId;
        return id != null ? { id: String(id), url: absolute } : { url: absolute };
      })
      .filter((entry): entry is { id?: string; url: string } => Boolean(entry?.url));
    return mapped;
  };

  const fromImagesArray = () => {
    if (!Array.isArray(item.images)) return [];
    return item.images
      .map((entry: any, index: number) => {
        const rawUrl = typeof entry === 'string'
          ? entry
          : typeof entry?.url === 'string'
            ? entry.url
            : null;
        if (!rawUrl) return null;
        const absolute = toAbsoluteUrl(rawUrl) ?? rawUrl;
        return { id: entry?.id != null ? String(entry.id) : String(index), url: absolute };
      })
      .filter((entry): entry is { id?: string; url: string } => Boolean(entry?.url));
  };

  const fromImageUrl = () => {
    if (typeof item.imageUrl !== 'string' || !item.imageUrl.trim()) return [];
    const absolute = toAbsoluteUrl(item.imageUrl) ?? item.imageUrl;
    return [{ url: absolute }];
  };

  const fromPathFields = () => {
    const candidate = typeof item.mediaPath === 'string' && item.mediaPath.trim()
      ? item.mediaPath
      : typeof item.imagePath === 'string' && item.imagePath.trim()
        ? item.imagePath
        : null;
    if (!candidate) return [];
    const absolute = toAbsoluteUrl(candidate);
    return absolute ? [{ url: absolute }] : [];
  };

  const strategies = [fromMediaArray, fromImagesArray, fromImageUrl, fromPathFields];
  for (const fn of strategies) {
    const result = fn();
    if (Array.isArray(result) && result.length > 0) {
      return result;
    }
  }

  return [];
};

export function useProductDetail(id?: string) {
  const [state, setState] = useState<DetailState<ProductDetail>>({
    status: id ? 'loading' : 'error',
    data: undefined,
    error: id ? null : 'not_found',
  });

  useEffect(() => {
    if (!id) {
      setState({ status: 'error', data: undefined, error: 'not_found' });
      return;
    }

    let cancelled = false;
    setState({ status: 'loading', data: undefined, error: null });

    apiHelpers
      .getProduct(id)
      .then((data: any) => {
        if (cancelled) return;
        const mediaNormalized = normalizeMedia(data);
        const normalized: ProductDetail = {
          id: data.id,
          daoId: data.daoId,
          daoName: data.daoName ?? data.sellerName ?? null,
          title: data.title,
          description: data.description,
          priceBzr: data.priceBzr,
          categoryId: data.categoryId ?? data.category?.id ?? null,
          categoryPath: Array.isArray(data.categoryPath) ? data.categoryPath : [],
          attributes: data.attributes || {},
          media: Array.isArray(data.media)
            ? data.media
                .map((item: any) => ({ id: String(item?.id ?? ''), url: String(item?.url ?? '') }))
                .filter(entry => entry.url.length > 0)
            : [],
          mediaNormalized,
          ratingValue: toNumberOrNull(data.ratingValue ?? data.sellerRating ?? data.reputation),
          ratingCount: toNumberOrNull(data.ratingCount ?? data.reviewCount),
          sellerReputation: toNumberOrNull(data.reputation ?? data.sellerReputation),
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        };
        setState({ status: 'success', data: normalized, error: null });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 404) {
          setState({ status: 'error', data: undefined, error: 'not_found' });
          return;
        }
        setState({ status: 'error', data: undefined, error: 'server' });
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  return state;
}
