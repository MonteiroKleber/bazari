// V-15 (2025-09-12): Corrige definitivamente a exibição de imagens na SearchPage SEM tocar em api.ts.
//  - Usa fetch nativo com API_BASE_URL (sem depender de exports de api.ts).
//  - Normaliza URLs relativas de mídia para absolutas (ex.: "/static/..." -> "http://localhost:3000/static/...").
//  - Enriquecimento: quando o item não traz URL de mídia mas tem mediaIds, busca GET /media/:id/url e injeta media[0].url/coverUrl.
//  - Mantém assinatura do hook, filtros, paginação, facets e tratamento de erro i18n.
//
// path: apps/web/src/hooks/useSearch.ts

import { useState, useCallback, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../config';

export interface SearchFilters {
  q?: string;
  kind?: 'product' | 'service' | 'all';
  categoryPath?: string[];
  priceMin?: string;
  priceMax?: string;
  attrs?: Record<string, string | string[]>;
  limit?: number;
  offset?: number;
  sort?: 'relevance' | 'priceAsc' | 'priceDesc' | 'createdDesc';
}

export interface SearchResults {
  items: any[];
  facets?: any;
  page?: { offset: number; limit: number; total: number };
  [key: string]: any;
}

type UseSearchReturn = {
  filters: SearchFilters;
  results: SearchResults | null;
  loading: boolean;
  error: string | null;
  search: (newFilters?: SearchFilters) => Promise<void>;
  updateFilters: (patch: Partial<SearchFilters>) => void;
  clearFilters: () => void;
};

const DEFAULT_LIMIT = 20;

const absolutize = (u?: string): string => {
  if (!u) return '';
  if (/^https?:\/\//i.test(u)) return u; // já é absoluta
  const base =
    (API_BASE_URL as string | undefined) ||
    // @ts-ignore – fallback via Vite, se existir
    ((typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_BASE_URL)
      ? (import.meta as any).env.VITE_API_BASE_URL as string
      : undefined) ||
    'http://localhost:3000';
  return `${base}${u.startsWith('/') ? u : '/' + u}`;
};

const buildQueryString = (filters: SearchFilters): string => {
  const p = new URLSearchParams();
  if (filters.q) p.set('q', String(filters.q));
  if (filters.kind && filters.kind !== 'all') p.set('kind', String(filters.kind));
  if (Array.isArray(filters.categoryPath)) {
    for (const path of filters.categoryPath) {
      p.append('categoryPath', path);
    }
  }
  if (filters.priceMin) p.set('priceMin', String(filters.priceMin));
  if (filters.priceMax) p.set('priceMax', String(filters.priceMax));
  if (filters.sort) p.set('sort', String(filters.sort));
  if (typeof filters.limit === 'number') p.set('limit', String(filters.limit));
  if (typeof filters.offset === 'number') p.set('offset', String(filters.offset));
  if (filters.attrs && typeof filters.attrs === 'object') {
    for (const [k, v] of Object.entries(filters.attrs)) {
      if (Array.isArray(v)) {
        v.forEach(val => p.append(`attrs.${k}`, String(val)));
      } else if (v != null) {
        p.set(`attrs.${k}`, String(v));
      }
    }
  }
  return p.toString();
};

// Busca URL de mídia por ID usando a rota da API
async function fetchMediaUrlById(id: string, signal?: AbortSignal): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/media/${id}/url`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal,
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.url) return absolutize(String(data.url));
  } catch {
    // enriquecimento é best-effort
  }
  return null;
}

export function useSearch(initial?: SearchFilters): UseSearchReturn {
  const [filters, setFilters] = useState<SearchFilters>(() => ({
    q: initial?.q,
    kind: initial?.kind ?? 'all',
    categoryPath: initial?.categoryPath ?? [],
    priceMin: initial?.priceMin,
    priceMax: initial?.priceMax,
    attrs: initial?.attrs,
    limit: initial?.limit ?? DEFAULT_LIMIT,
    offset: initial?.offset ?? 0,
    sort: initial?.sort ?? 'relevance',
  }));
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const filtersRef = useRef<SearchFilters>(filters);
  useEffect(() => { filtersRef.current = filters; }, [filters]);

  const [error, setError] = useState<string | null>(null);
  const currentController = useRef<AbortController | null>(null);

  const search = useCallback(async (newFilters?: SearchFilters) => { const effective = newFilters ?? filtersRef.current;
    setLoading(true);
    setError(null);

    try {
      // Cancela request anterior (se houver)
      if (currentController.current) {
        currentController.current.abort();
      }
      const controller = new AbortController();
      currentController.current = controller;

      const qs = buildQueryString(effective);
      const url = `${API_BASE_URL}/search?${qs}`;

      const res = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `HTTP ${res.status}`);
      }
      const data = await res.json();

      // 1) Normalização: absolutiza qualquer URL de mídia presente
      let normalized: SearchResults = {
        ...data,
        items: Array.isArray(data?.items) ? data.items.map((it: any) => {
          // normaliza array 'media'
          const media = Array.isArray(it?.media)
            ? it.media.map((m: any) => {
                const raw = m?.url ?? m?.path ?? m?.href ?? null;
                return raw ? { ...m, url: absolutize(String(raw)) } : m;
              })
            : [];

          // auxiliares de capa comuns
          const coverUrl =
            it?.coverUrl ? absolutize(String(it.coverUrl)) :
            (Array.isArray(it?.images) && it.images.length > 0
              ? absolutize(typeof it.images[0] === 'string' ? it.images[0] : String(it.images[0]?.url ?? ''))
              : it?.thumbnailUrl ? absolutize(String(it.thumbnailUrl)) :
                it?.imageUrl ? absolutize(String(it.imageUrl)) :
                  it?.mediaUrl ? absolutize(String(it.mediaUrl)) :
                    undefined);

          return { ...it, media, ...(coverUrl ? { coverUrl } : null) };
        }) : [],
        page: data?.page ?? {
          offset: 0,
          limit: effective.limit ?? DEFAULT_LIMIT,
          total: Array.isArray(data?.items) ? data.items.length : 0
        },
      };

      // 2) Enriquecimento: se item não tem mídia utilizável mas tem mediaIds, buscar a 1ª URL
      const ids: string[] = [];
      const indexById = new Map<string, number[]>();

      normalized.items.forEach((it: any, idx: number) => {
        const hasUsable =
          (Array.isArray(it.media) && it.media.some((m: any) => m?.url)) ||
          !!it.coverUrl;

        if (!hasUsable && Array.isArray(it.mediaIds) && it.mediaIds.length > 0) {
          const id = String(it.mediaIds[0]);
          ids.push(id);
          const arr = indexById.get(id) || [];
          arr.push(idx);
          indexById.set(id, arr);
        }
      });

      if (ids.length > 0) {
        const uniq = Array.from(new Set(ids));
        const lookups = await Promise.all(uniq.map(id => fetchMediaUrlById(id, currentController.current?.signal)));
        const idToUrl = new Map<string, string>();
        uniq.forEach((id, i) => {
          const u = lookups[i];
          if (u) idToUrl.set(id, u);
        });

        if (idToUrl.size > 0) {
          const items = normalized.items.map((it: any) => {
            const hasUsable =
              (Array.isArray(it.media) && it.media.some((m: any) => m?.url)) ||
              !!it.coverUrl;

            if (hasUsable) return it;

            if (Array.isArray(it.mediaIds) && it.mediaIds.length > 0) {
              const id = String(it.mediaIds[0]);
              const url = idToUrl.get(id);
              if (url) {
                return {
                  ...it,
                  media: [{ id, url }],
                  coverUrl: url,
                };
              }
            }
            return it;
          });

          normalized = { ...normalized, items };
        }
      }

      setResults(normalized);
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        // busca cancelada — não sinaliza erro
        return;
      }
      console.error('[useSearch] error:', err);
      setResults({ items: [], facets: {}, page: { offset: 0, limit: effective.limit ?? DEFAULT_LIMIT, total: 0 } });
      setError('search.error_generic'); // i18n na tela
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    // dispara busca na montagem e quando filtros mudarem via updateFilters
    search();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.q,
    filters.kind,
    JSON.stringify(filters.categoryPath),
    filters.priceMin,
    filters.priceMax,
    filters.sort,
    filters.limit,
    filters.offset
  ]);

  const updateFilters = useCallback((patch: Partial<SearchFilters>) => {
    setFilters(prev => ({
      ...prev,
      ...patch,
      // zera offset quando filtros-chave mudam
      offset:
        (patch.q !== undefined ||
         patch.kind !== undefined ||
         patch.categoryPath !== undefined ||
         patch.priceMin !== undefined ||
         patch.priceMax !== undefined ||
         patch.attrs !== undefined)
          ? 0
          : (patch.offset ?? prev.offset ?? 0),
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
    setResults(null);
  }, []);

  return {
    filters,
    results,
    loading,
    error,
    search,
    updateFilters,
    clearFilters
  };
}