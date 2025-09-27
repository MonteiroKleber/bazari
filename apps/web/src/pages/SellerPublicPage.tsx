import { useEffect, useMemo, useState, useLayoutEffect, useRef } from 'react';
import type { SyntheticEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import type { VirtualItem } from '@tanstack/react-virtual';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSearch } from '@/hooks/useSearch';
import { useCategories } from '@/hooks/useCategories';
import { sellerApi, type SellerProfileDto } from '@/modules/seller/api';
import { StoreLayout, type StoreTheme } from '@/modules/store/StoreLayout';
import { StoreHeader, type StoreOwner, type StoreProfile } from '@/modules/store/StoreHeader';
import { StoreSearchBar } from '@/modules/store/StoreSearchBar';
import { StoreSearchAdvanced } from '@/modules/store/StoreSearchAdvanced';
import { StoreControls, type StoreKind, type StoreSort } from '@/modules/store/StoreControls';
import { StoreSidebar } from '@/modules/store/StoreSidebar';
import { StoreSidebarAdvanced } from '@/modules/store/StoreSidebarAdvanced';
import { StoreFiltersDrawer } from '@/modules/store/StoreFiltersDrawer';
import { StoreTopBar } from '@/modules/store/StoreTopBar';
import { applyPageSeo, buildStoreJsonLd, injectJsonLd } from '@/lib/seo';
import { API_BASE_URL, FEATURE_FLAGS } from '@/config';
import { useElementSize } from '@/modules/store/useElementSize';

interface StorePolicies {
  storeTheme?: Partial<StoreTheme> | null;
  primaryCategories?: unknown;
}

type PublicStoreProfile = SellerProfileDto & { policies?: StorePolicies | null };

type FilterChip = {
  key: string;
  label: string;
  onRemove?: () => void;
};

type CategoryFacet = { path: string[]; count: number };

const SORT_STORAGE_KEY = (slug: string) => `store:${slug}:sort`;
const VIEW_STORAGE_KEY = (slug: string) => `store:${slug}:view`;
const IMAGE_FALLBACK =
  'data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="%2399A1B7" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><rect x="1.5" y="3" width="21" height="18" rx="2" ry="2"/><path d="M3 17l5-5 4 4 5-6 4 5"/></svg>';

function toStoreTheme(theme: unknown): StoreTheme | undefined {
  if (!theme || typeof theme !== 'object') return undefined;
  const maybe = theme as Record<string, string>;
  const bg = typeof maybe.bg === 'string' ? maybe.bg : undefined;
  const ink = typeof maybe.ink === 'string' ? maybe.ink : undefined;
  const brand = typeof maybe.brand === 'string' ? maybe.brand : undefined;
  const accent = typeof maybe.accent === 'string' ? maybe.accent : undefined;
  if (!bg && !ink && !brand && !accent) return undefined;
  return { bg, ink, brand, accent };
}

function isStringPathArray(value: unknown): value is string[][] {
  if (!Array.isArray(value)) return false;
  return value.every((item) => Array.isArray(item) && item.every((part) => typeof part === 'string'));
}

function resolveMediaUrl(u?: string | null): string | undefined {
  if (!u) return undefined;
  try {
    return new URL(u).toString();
  } catch {
    const base = API_BASE_URL || 'http://localhost:3000';
    return new URL(u.startsWith('/') ? u : `/${u}`, base).toString();
  }
}

function extractCoverUrl(item: any): string | undefined {
  if (!item) return undefined;
  const mediaArray = Array.isArray(item.media) ? item.media : [];
  if (mediaArray.length > 0 && mediaArray[0]?.url) {
    return resolveMediaUrl(mediaArray[0].url);
  }
  const candidates = ['coverUrl', 'thumbnailUrl', 'imageUrl', 'mediaUrl'];
  for (const key of candidates) {
    if (typeof item[key] === 'string' && item[key].length > 0) {
      return resolveMediaUrl(item[key]);
    }
  }
  if (Array.isArray(item.images) && item.images.length > 0) {
    const first = item.images[0];
    return resolveMediaUrl(typeof first === 'string' ? first : first?.url);
  }
  return undefined;
}

function formatPrice(value: string | number | undefined, locale: string): string | null {
  if (value == null) return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  try {
    const formatter = new Intl.NumberFormat(locale || 'pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${formatter.format(numeric)} BZR`;
  } catch {
    return `${numeric.toFixed(2)} BZR`;
  }
}

function buildSrcSet(url: string): string | undefined {
  try {
    const widths = [320, 480, 640, 960, 1280];
    const entries = widths.map((width) => {
      const variant = new URL(url);
      variant.searchParams.set('w', String(width));
      return `${variant.toString()} ${width}w`;
    });
    entries.push(`${url} 1400w`);
    return Array.from(new Set(entries)).join(', ');
  } catch {
    return undefined;
  }
}

function getImageSizes(viewMode: 'grid' | 'list') {
  if (viewMode === 'list') {
    return '(min-width: 1280px) 40vw, (min-width: 1024px) 50vw, (min-width: 768px) 70vw, 100vw';
  }
  return '(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw';
}

function handleImageError(event: SyntheticEvent<HTMLImageElement, Event>) {
  const img = event.currentTarget;
  const fallback = img.dataset.fallback;
  if (fallback && img.src !== fallback) {
    img.srcset = '';
    img.sizes = '';
    img.src = fallback;
    return;
  }
  img.onerror = null;
  img.src = IMAGE_FALLBACK;
}

export interface SellerPublicPageProps {
  mode?: 'default' | 'branded';
}

export default function SellerPublicPage({ mode = 'default' }: SellerPublicPageProps) {
  const { shopSlug = '' } = useParams();
  const { t, i18n } = useTranslation();
  const advancedUX = FEATURE_FLAGS.store_ux_v2;
  const [profile, setProfile] = useState<PublicStoreProfile | null>(null);
  const [owner, setOwner] = useState<StoreOwner | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [filtersDrawerOpen, setFiltersDrawerOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    if (typeof window === 'undefined' || !advancedUX || !shopSlug) return 'grid';
    const saved = localStorage.getItem(VIEW_STORAGE_KEY(shopSlug));
    return saved === 'list' ? 'list' : 'grid';
  });

  const {
    filters,
    results,
    loading: searchLoading,
    error: searchError,
    updateFilters,
    clearFilters
  } = useSearch({
    storeSlug: shopSlug || undefined,
    limit: 24,
    kind: 'all'
  });
  const { categories: prefetchedCategories } = useCategories();

  useEffect(() => {
    let active = true;
    setProfileLoading(true);
    setProfileError(null);
    (async () => {
      try {
        const data = await sellerApi.getPublic(shopSlug);
        if (!active) return;
        setProfile(data.sellerProfile as PublicStoreProfile);
        setOwner(data.owner as StoreOwner | null);
      } catch (error: any) {
        if (!active) return;
        setProfileError(error?.message || t('errors.generic'));
        setProfile(null);
        setOwner(null);
      } finally {
        if (active) setProfileLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [shopSlug, t]);

  useEffect(() => {
    setSearchInput(filters.q ?? '');
  }, [filters.q]);

  useEffect(() => {
    if (shopSlug && filters.storeSlug !== shopSlug) {
      updateFilters({ storeSlug: shopSlug });
    }
  }, [filters.storeSlug, shopSlug, updateFilters]);

  useEffect(() => {
    if (profile?.id && filters.storeId !== profile.id) {
      updateFilters({ storeId: profile.id });
    }
  }, [filters.storeId, profile?.id, updateFilters]);

  useEffect(() => {
    if (!advancedUX || !shopSlug) return;
    const saved = localStorage.getItem(VIEW_STORAGE_KEY(shopSlug));
    if (saved === 'list' || saved === 'grid') {
      setViewMode(saved);
    }
  }, [advancedUX, shopSlug]);

  useEffect(() => {
    if (!advancedUX || !shopSlug) return;
    localStorage.setItem(VIEW_STORAGE_KEY(shopSlug), viewMode);
  }, [viewMode, advancedUX, shopSlug]);

  const sortInitialized = useRef(false);
  useEffect(() => {
    if (!advancedUX || !shopSlug) return;
    if (sortInitialized.current) return;
    const saved = localStorage.getItem(SORT_STORAGE_KEY(shopSlug));
    if (saved && typeof saved === 'string' && saved !== filters.sort) {
      updateFilters({ sort: saved as StoreSort });
    }
    sortInitialized.current = true;
  }, [advancedUX, filters.sort, shopSlug, updateFilters]);

  useEffect(() => {
    if (!advancedUX || !shopSlug || !filters.sort) return;
    localStorage.setItem(SORT_STORAGE_KEY(shopSlug), filters.sort);
  }, [advancedUX, filters.sort, shopSlug]);

  const isBranded = mode === 'branded';

  useEffect(() => {
    if (!isBranded || !profile) return;
    const cleanup = applyPageSeo({
      title: `${profile.shopName} • Bazari`,
      description: profile.about ?? null,
      canonical: `${window.location.origin}/s/${profile.shopSlug}`
    });
    return cleanup;
  }, [isBranded, profile]);

  const storeTheme = useMemo(() => toStoreTheme(profile?.policies?.storeTheme ?? null), [profile?.policies?.storeTheme]);
  const primaryCategories = useMemo(() => {
    const raw = profile?.policies?.primaryCategories;
    if (isStringPathArray(raw)) {
      return raw.slice(0, 6);
    }
    return [];
  }, [profile?.policies?.primaryCategories]);

  const items = useMemo(() => (Array.isArray(results?.items) ? results!.items : []), [results?.items]);
  const fallbackCategoryFacets = useMemo<CategoryFacet[]>(() => {
    if (!primaryCategories || primaryCategories.length === 0) {
      return [];
    }

    const candidates = primaryCategories
      .map((path) => (Array.isArray(path) ? path.slice(0, 4) : []))
      .filter((path) => path.length > 0);

    if (!prefetchedCategories || prefetchedCategories.length === 0) {
      return candidates.map((path) => ({ path, count: 0 }));
    }

    const prefetchedIndex = new Map<string, CategoryFacet>();
    for (const category of prefetchedCategories) {
      const normalized = Array.isArray(category.pathSlugs) ? category.pathSlugs.slice(0, 4) : [];
      if (normalized.length === 0) continue;
      prefetchedIndex.set(normalized.join('>'), { path: normalized, count: 0 });
    }

    return candidates.map((path) => prefetchedIndex.get(path.join('>')) ?? { path, count: 0 });
  }, [prefetchedCategories, primaryCategories]);

  const categoryFacets: CategoryFacet[] = useMemo(() => {
    if (results?.facets?.categories && Array.isArray(results.facets.categories) && results.facets.categories.length > 0) {
      return results.facets.categories as CategoryFacet[];
    }
    return fallbackCategoryFacets;
  }, [results?.facets?.categories, fallbackCategoryFacets]);

  useEffect(() => {
    if (!isBranded || !profile) return;
    if (typeof window === 'undefined') return;

    const storeUrl = `${window.location.origin}/s/${profile.shopSlug}`;
    const productSources = items.slice(0, 20).map((item: any) => {
      const itemPath = item?.kind === 'service' ? `/app/service/${item.id}` : `/app/product/${item.id}`;
      const itemUrl = `${window.location.origin}${itemPath}`;
      return {
        id: item.id,
        title: item.title,
        description: item.description,
        priceBzr: item.priceBzr ?? item.basePriceBzr ?? null,
        image: extractCoverUrl(item) ?? null,
        url: itemUrl,
      };
    });

    const cleanup = injectJsonLd(
      `store-${profile.shopSlug}-graph`,
      buildStoreJsonLd(
        {
          storeName: profile.shopName,
          storeDescription: profile.about,
          storeUrl,
          storeLogo: resolveMediaUrl(profile.avatarUrl),
          storeImage: resolveMediaUrl(profile.bannerUrl),
        },
        productSources
      )
    );

    return cleanup;
  }, [isBranded, profile, items]);

  const total = results?.page?.total ?? 0;
  const limit = results?.page?.limit ?? filters.limit ?? 24;
  const offset = results?.page?.offset ?? filters.offset ?? 0;
  const canPrevious = offset > 0;
  const canNext = offset + limit < total;

  const gridContainerRef = useRef<HTMLDivElement | null>(null);
  const gridSize = useElementSize(gridContainerRef.current);
  const [scrollMargin, setScrollMargin] = useState(0);

  const virtualizationEnabled = advancedUX && viewMode === 'grid' && total > 100 && items.length > 0;
  const columnCount = useMemo(() => {
    if (viewMode === 'list') return 1;
    const width = gridSize.width || 0;
    if (width >= 1400) return 4;
    if (width >= 1100) return 3;
    if (width >= 768) return 2;
    if (width >= 640) return 2;
    return 1;
  }, [gridSize.width, viewMode]);

  const estimatedRowSize = viewMode === 'list' ? 220 : 380;
  const rowCount = columnCount > 0 ? Math.ceil(items.length / columnCount) : 0;

  const rowVirtualizer = useWindowVirtualizer({
    count: virtualizationEnabled ? rowCount : 0,
    estimateSize: () => estimatedRowSize,
    overscan: 8,
    scrollMargin,
  });

  useLayoutEffect(() => {
    if (!virtualizationEnabled) return;
    const updateMargin = () => {
      if (!gridContainerRef.current) return;
      const rect = gridContainerRef.current.getBoundingClientRect();
      const offsetTop = window.scrollY + rect.top;
      setScrollMargin(offsetTop);
    };
    updateMargin();
    window.addEventListener('resize', updateMargin);
    return () => window.removeEventListener('resize', updateMargin);
  }, [virtualizationEnabled, items.length, viewMode, columnCount]);

  useEffect(() => {
    if (!virtualizationEnabled) return;
    rowVirtualizer.scrollToIndex(0, { align: 'start' });
  }, [virtualizationEnabled, filters, rowVirtualizer]);

  const gridAnchorRef = useRef<HTMLDivElement | null>(null);
  const firstRender = useRef(true);
  useEffect(() => {
    if (!advancedUX) return;
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (gridAnchorRef.current) {
      gridAnchorRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [advancedUX, filters.kind, filters.categoryPath, filters.priceMin, filters.priceMax, filters.attrs, filters.sort]);

  const handleKindChange = (kind: StoreKind) => updateFilters({ kind });
  const handleSortChange = (sort: StoreSort) => updateFilters({ sort });
  const handleCategoryChange = (path?: string[]) => {
    updateFilters({ categoryPath: path && path.length > 0 ? path : [] });
    if (advancedUX) setFiltersDrawerOpen(false);
  };
  const handlePriceChange = (range: { min?: string; max?: string } | null) => {
    updateFilters({ priceMin: range?.min, priceMax: range?.max });
    if (advancedUX) setFiltersDrawerOpen(false);
  };
  const handlePageChange = (nextOffset: number) => updateFilters({ offset: nextOffset });

  const handleSearchSubmit = (term: string) => {
    setSearchInput(term);
    updateFilters({ q: term || undefined });
  };

  const handleClearAll = () => {
    clearFilters();
    setSearchInput('');
    if (advancedUX) {
      setViewMode('grid');
      setFiltersDrawerOpen(false);
    }
  };

  const appliedFilters = useMemo<FilterChip[]>(() => {
    const chips: FilterChip[] = [];

    if (filters.q) {
      chips.push({
        key: 'q',
        label: `“${filters.q}”`,
        onRemove: () => {
          updateFilters({ q: undefined });
          setSearchInput('');
        }
      });
    }

    if (filters.kind && filters.kind !== 'all') {
      chips.push({
        key: `kind-${filters.kind}`,
        label: filters.kind === 'product' ? t('search.products') : t('search.services'),
        onRemove: () => updateFilters({ kind: 'all' })
      });
    }

    if (filters.categoryPath && filters.categoryPath.length > 0) {
      chips.push({
        key: `category-${filters.categoryPath.join('>')}`,
        label: filters.categoryPath.join(' / '),
        onRemove: () => handleCategoryChange(undefined)
      });
    }

    if (filters.priceMin || filters.priceMax) {
      const min = filters.priceMin ?? '0';
      const max = filters.priceMax ?? '∞';
      chips.push({
        key: `price-${min}-${max}`,
        label: `${min} - ${max} BZR`,
        onRemove: () => handlePriceChange(null)
      });
    }

    if (filters.attrs && typeof filters.attrs === 'object') {
      for (const [attrKey, attrValue] of Object.entries(filters.attrs)) {
        const values = Array.isArray(attrValue) ? attrValue : [attrValue];
        values
          .filter((val): val is string => typeof val === 'string')
          .forEach((val) => {
            chips.push({
              key: `attr-${attrKey}-${val}`,
              label: `${attrKey}: ${val}`,
              onRemove: () => {
                const nextAttrs = { ...(filters.attrs || {}) } as Record<string, string | string[]>;
                const existing = nextAttrs[attrKey];
                if (Array.isArray(existing)) {
                  const next = existing.filter((entry) => entry !== val);
                  if (next.length === 0) {
                    delete nextAttrs[attrKey];
                  } else {
                    nextAttrs[attrKey] = next;
                  }
                } else {
                  delete nextAttrs[attrKey];
                }
                updateFilters({ attrs: nextAttrs });
              }
            });
          });
      }
    }

    return chips;
  }, [advancedUX, clearFilters, filters, handleCategoryChange, handlePriceChange, t, updateFilters]);

  const resolvedSearchError = searchError ? t(searchError, { defaultValue: searchError }) : null;

  const renderCard = (item: any) => {
    const cover = extractCoverUrl(item);
    const priceLabel = formatPrice(item.priceBzr, i18n.language);
    const href = item?.kind === 'service' ? `/app/service/${item.id}` : `/app/product/${item.id}`;
    const kindLabel = item.kind === 'service' ? t('search.services') : t('search.products');
    const srcSet = cover ? buildSrcSet(cover) : undefined;
    const sizes = getImageSizes(viewMode);

    if (viewMode === 'list') {
      return (
        <Card key={item.id} className="flex flex-col gap-4 border border-store-ink/15 bg-store-bg/95 p-4 transition hover:shadow-md md:flex-row">
          {cover ? (
            <div className="h-40 w-full overflow-hidden rounded-md bg-store-brand/10 md:w-48">
              <img
                src={cover}
                srcSet={srcSet}
                sizes={sizes}
                loading="lazy"
                decoding="async"
                data-fallback={cover}
                onError={handleImageError}
                alt={item.title}
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div className="h-40 w-full rounded-md border border-dashed border-store-ink/20 bg-store-brand/5 md:w-48" />
          )}
          <div className="flex flex-1 flex-col justify-between">
            <div className="space-y-2">
              <Link to={href} className="text-lg font-semibold text-store-ink hover:underline">
                {item.title}
              </Link>
              {item.description && (
                <p className="text-sm text-store-ink/70 line-clamp-2">{item.description}</p>
              )}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge variant="outline" className="border-store-ink/20 text-store-ink/90">
                  {kindLabel}
                </Badge>
                {Array.isArray(item.categoryPath) && item.categoryPath.length > 0 && (
                  <Badge variant="secondary" className="border-store-ink/10 bg-store-brand/10 text-store-ink">
                    {item.categoryPath[item.categoryPath.length - 1]}
                  </Badge>
                )}
              </div>
            </div>
            {priceLabel && <p className="text-lg font-semibold text-store-brand">{priceLabel}</p>}
          </div>
        </Card>
      );
    }

    return (
      <Card key={item.id} className="overflow-hidden border border-store-ink/10 bg-store-bg/95 transition hover:shadow-md">
        <Link to={href} className="block h-full focus:outline-none focus:ring-2 focus:ring-store-brand/60">
          {cover ? (
            <div className="aspect-video w-full bg-store-brand/10">
              <img
                src={cover}
                srcSet={srcSet}
                sizes={sizes}
                loading="lazy"
                decoding="async"
                data-fallback={cover}
                onError={handleImageError}
                alt={item.title}
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div className="aspect-video w-full rounded-md border border-dashed border-store-ink/20 bg-store-brand/5" />
          )}
          <CardContent className="space-y-3 p-4">
            <div>
              <h3 className="line-clamp-2 text-base font-semibold text-store-ink">{item.title}</h3>
              {item.description && (
                <p className="line-clamp-2 text-sm text-store-ink/70">{item.description}</p>
              )}
            </div>
            {priceLabel && <p className="text-lg font-semibold text-store-brand">{priceLabel}</p>}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge variant="outline" className="border-store-ink/20 text-store-ink/90">
                {kindLabel}
              </Badge>
              {Array.isArray(item.categoryPath) && item.categoryPath.length > 0 && (
                <Badge variant="secondary" className="border-store-ink/10 bg-store-brand/10 text-store-ink">
                  {item.categoryPath[item.categoryPath.length - 1]}
                </Badge>
              )}
            </div>
          </CardContent>
        </Link>
      </Card>
    );
  };

  const renderGridContent = () => {
    if (virtualizationEnabled) {
      const virtualItems = rowVirtualizer.getVirtualItems();
      const templateColumns = viewMode === 'grid' ? `repeat(${Math.max(columnCount, 1)}, minmax(0, 1fr))` : '1fr';
      const gap = viewMode === 'grid' ? '1.25rem' : '1rem';

      return (
        <div
          ref={gridContainerRef}
          className="relative"
          style={{ height: rowVirtualizer.getTotalSize() }}
        >
          <div style={{ height: rowVirtualizer.getTotalSize(), position: 'relative' }}>
            {virtualItems.map((virtualRow: VirtualItem) => {
              const rowStart = virtualRow.index * columnCount;
              const rowItems = items.slice(rowStart, rowStart + columnCount);
              return (
                <div
                  key={virtualRow.key}
                  style={{
                    position: 'absolute',
                    top: virtualRow.start,
                    left: 0,
                    right: 0,
                    height: virtualRow.size,
                    paddingBottom: gap,
                  }}
                >
                  <div
                    className="grid"
                    style={{
                      gridTemplateColumns: templateColumns,
                      gap,
                    }}
                  >
                    {rowItems.map((item) => renderCard(item))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    if (viewMode === 'list') {
      return (
        <div ref={gridContainerRef} className="flex flex-col gap-4">
          {items.map((item) => renderCard(item))}
        </div>
      );
    }

    return (
      <div
        ref={gridContainerRef}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
      >
        {items.map((item) => renderCard(item))}
      </div>
    );
  };

  const sidebarComponent = advancedUX ? (
    <StoreSidebarAdvanced
      loading={searchLoading && !results}
      categories={categoryFacets}
      price={results?.facets?.price}
      activeCategory={filters.categoryPath}
      priceFilter={{ min: filters.priceMin, max: filters.priceMax }}
      onSelectCategory={handleCategoryChange}
      onPriceRangeChange={handlePriceChange}
      onClearFilters={handleClearAll}
    />
  ) : (
    <StoreSidebar
      loading={searchLoading && !results}
      categories={categoryFacets}
      price={results?.facets?.price}
      activeCategory={filters.categoryPath}
      priceFilter={{ min: filters.priceMin, max: filters.priceMax }}
      onSelectCategory={handleCategoryChange}
      onPriceRangeChange={handlePriceChange}
      onClearFilters={handleClearAll}
    />
  );

  return (
    <>
      {isBranded ? (
        <StoreTopBar slug={shopSlug} theme={storeTheme} />
      ) : (
        <Header />
      )}
      <StoreLayout theme={storeTheme} className="min-h-screen">
        <main className="container mx-auto flex flex-col gap-8 px-4 py-8">
          {profileLoading ? (
            <div className="h-48 animate-pulse rounded-xl border border-store-ink/15 bg-store-brand/10" />
          ) : profileError ? (
            <Alert variant="destructive">
              <AlertDescription>{profileError}</AlertDescription>
            </Alert>
          ) : (
            <StoreHeader
              seller={profile as StoreProfile | null}
              owner={owner}
              primaryCategories={primaryCategories}
            />
          )}

          <section className="space-y-6" ref={gridAnchorRef}>
            {advancedUX ? (
              <StoreSearchAdvanced
                storeSlug={shopSlug}
                initialValue={searchInput}
                categories={categoryFacets}
                onSubmit={handleSearchSubmit}
                onCategorySelect={(path) => handleCategoryChange(path)}
              />
            ) : (
              <StoreSearchBar
                value={searchInput}
                onChange={setSearchInput}
                onDebouncedChange={(value) => updateFilters({ q: value.trim() || undefined })}
                onSubmit={(value) => handleSearchSubmit(value.trim())}
              />
            )}

            <StoreControls
              kind={filters.kind ?? 'all'}
              sort={filters.sort ?? 'relevance'}
              offset={offset}
              limit={limit}
              total={total}
              loading={searchLoading}
              onKindChange={handleKindChange}
              onSortChange={handleSortChange}
              onClearFilters={handleClearAll}
              viewMode={advancedUX ? viewMode : undefined}
              onViewModeChange={advancedUX ? (mode) => setViewMode(mode) : undefined}
            />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
              <div className="hidden lg:block">
                {sidebarComponent}
              </div>
              <div className="lg:col-span-3 space-y-6">
                {appliedFilters.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    {appliedFilters.map((chip) => (
                      <Badge
                        key={chip.key}
                        variant="secondary"
                        className="flex items-center gap-2 border-store-ink/10 bg-store-brand/10 text-store-ink"
                      >
                        <span>{chip.label}</span>
                        {chip.onRemove && (
                          <button
                            type="button"
                            className="text-store-ink/60 hover:text-store-ink"
                            onClick={chip.onRemove}
                          >
                            ×
                          </button>
                        )}
                      </Badge>
                    ))}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-store-ink/70 hover:bg-store-brand/10"
                      onClick={handleClearAll}
                    >
                      {t('search.clear')}
                    </Button>
                  </div>
                )}

                {searchLoading && !results ? (
                  <div className="space-y-4">
                    <div className="h-4 w-48 animate-pulse rounded bg-store-brand/10" />
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {Array.from({ length: 6 }).map((_, index) => (
                        <div key={`skeleton-${index}`} className="space-y-3 rounded-lg border border-store-ink/10 bg-store-brand/10 p-4" />
                      ))}
                    </div>
                  </div>
                ) : resolvedSearchError ? (
                  <Alert variant="destructive">
                    <AlertDescription>{resolvedSearchError}</AlertDescription>
                  </Alert>
                ) : items.length > 0 ? (
                  <div className="space-y-4">
                    <p className="text-sm text-store-ink/70">
                      {t('search.showing_results', {
                        start: offset + 1,
                        end: Math.min(offset + limit, total),
                        total
                      })}
                    </p>
                    {renderGridContent()}

                    {total > limit && (
                      <div className="flex items-center justify-center gap-3 pt-2">
                        <Button
                          variant="outline"
                          onClick={() => handlePageChange(Math.max(0, offset - limit))}
                          disabled={!canPrevious || searchLoading}
                        >
                          {t('common.previous', { defaultValue: 'Anterior' })}
                        </Button>
                        <span className="text-sm text-store-ink/70">
                          {Math.floor(offset / limit) + 1} / {Math.max(1, Math.ceil(total / limit))}
                        </span>
                        <Button
                          variant="outline"
                          onClick={() => handlePageChange(offset + limit)}
                          disabled={!canNext || searchLoading}
                        >
                          {t('common.next', { defaultValue: 'Próximo' })}
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-12 text-center text-store-ink/60">
                    {t('store.results.empty', {
                      defaultValue: filters.q
                        ? t('search.no_results', { defaultValue: 'Nenhum resultado encontrado.' })
                        : t('store.results.start', { defaultValue: 'Digite algo para explorar a loja.' })
                    })}
                  </div>
                )}
              </div>
            </div>
          </section>
        </main>
      </StoreLayout>
      {!isBranded && <Footer />}

      {advancedUX && (
        <>
          <StoreFiltersDrawer open={filtersDrawerOpen} onOpenChange={setFiltersDrawerOpen}>
            {sidebarComponent}
          </StoreFiltersDrawer>
          <Button
            className="fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-store-brand px-4 py-2 text-store-ink shadow-lg hover:bg-store-brand/90 lg:hidden"
            onClick={() => setFiltersDrawerOpen(true)}
          >
            Filtros
          </Button>
        </>
      )}
    </>
  );
}
