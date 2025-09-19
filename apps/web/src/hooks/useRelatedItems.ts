// V-1 (2025-09-18): Hook para buscar itens relacionados na PDP filtrando por categoria e tipo

import { useEffect, useMemo, useState } from 'react';
import { API_BASE_URL } from '../config';

export interface RelatedItem {
  id: string;
  kind: 'product' | 'service';
  title: string;
  description?: string | null;
  priceBzr?: string | null;
  basePriceBzr?: string | null;
  categoryPath?: string[];
  media?: Array<{ id?: string; url?: string }>;
  coverUrl?: string | null;
  daoId?: string | null;
  daoName?: string | null;
}

export type RelatedItemsStatus = 'idle' | 'loading' | 'success' | 'error';

interface RelatedItemsState {
  status: RelatedItemsStatus;
  items: RelatedItem[];
  error: string | null;
}

const MAX_ITEMS = 8;

const normalizeCategoryPath = (path: unknown): string[] => {
  if (!Array.isArray(path)) return [];
  return path.map(value => String(value)).filter(Boolean);
};

const normalizeMedia = (media: unknown): Array<{ id?: string; url?: string }> => {
  if (!Array.isArray(media)) return [];
  return media
    .map((item: any) => {
      if (!item) return null;
      if (typeof item === 'string') {
        return { url: item };
      }
      const id = item?.id ? String(item.id) : undefined;
      const url = item?.url ? String(item.url) : undefined;
      if (!id && !url) return null;
      return { id, url };
    })
    .filter((value): value is { id?: string; url?: string } => Boolean(value));
};

const normalizeItems = (payload: unknown): RelatedItem[] => {
  if (!Array.isArray(payload)) return [];
  return payload
    .map((raw: any) => {
      if (!raw || !raw.id) return null;
      const kind: 'product' | 'service' = raw.kind === 'service' ? 'service' : 'product';
      return {
        id: String(raw.id),
        kind,
        title: String(raw.title ?? ''),
        description: raw.description ?? null,
        priceBzr: raw.priceBzr ? String(raw.priceBzr) : null,
        basePriceBzr: raw.basePriceBzr ? String(raw.basePriceBzr) : null,
        categoryPath: normalizeCategoryPath(raw.categoryPath),
        media: normalizeMedia(raw.media),
        coverUrl: raw.coverUrl ? String(raw.coverUrl) : null,
        daoId: raw.daoId ? String(raw.daoId) : null,
        daoName: raw.daoName ? String(raw.daoName) : null,
      } satisfies RelatedItem;
    })
    .filter((value): value is RelatedItem => Boolean(value))
    .slice(0, MAX_ITEMS);
};

const buildSearchQuery = (categoryPath: string[], kind: 'product' | 'service'): string => {
  const params = new URLSearchParams();
  params.set('kind', kind);
  params.set('limit', String(MAX_ITEMS));
  params.set('offset', '0');
  params.set('sort', 'relevance');
  categoryPath.forEach(segment => {
    if (segment) {
      params.append('categoryPath', segment);
    }
  });
  return params.toString();
};

export function useRelatedItems(categoryPath: string[], kind: 'product' | 'service'): RelatedItemsState {
  const [state, setState] = useState<RelatedItemsState>({ status: 'idle', items: [], error: null });

  const effectivePath = useMemo(() => normalizeCategoryPath(categoryPath), [categoryPath]);
  const queryKey = `${kind}|${effectivePath.join('>')}`;

  useEffect(() => {
    if (effectivePath.length === 0) {
      setState({ status: 'success', items: [], error: null });
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    const fetchRelated = async () => {
      setState(prev => ({ ...prev, status: 'loading', error: null }));

      try {
        const query = buildSearchQuery(effectivePath, kind);
        const response = await fetch(`${API_BASE_URL}/search?${query}`, {
          method: 'GET',
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const payload = await response.json();
        if (cancelled) return;

        const items = normalizeItems(payload?.items ?? []);
        setState({ status: 'success', items, error: null });
      } catch (error: any) {
        if (cancelled || error?.name === 'AbortError') {
          return;
        }
        console.error('[useRelatedItems] failed to fetch related items', error);
        setState({ status: 'error', items: [], error: 'related_items_fetch_failed' });
      }
    };

    fetchRelated();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [queryKey, kind, effectivePath]);

  return state;
}
