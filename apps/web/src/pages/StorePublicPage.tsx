import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ApiError, getPublicJSON } from '@/lib/api';
import { API_BASE_URL } from '@/config';
import {
  resolveIpfsUrl,
  type NormalizedOnChainStore,
  type NormalizedLink,
} from '@/modules/store/onchain';
import { StoreLayout } from '@/modules/store/StoreLayout';
import { Loader2, AlertCircle, ExternalLink, Copy, Store as StoreIcon, Layers } from 'lucide-react';
import { SyncBadge } from '@/components/SyncBadge';
import { useStoreFilters } from '@/hooks/useStoreFilters';
import { useStoreCatalog } from '@/hooks/useStoreCatalog';
import { useStoreFacets } from '@/hooks/useStoreFacets';
import {
  SearchBar,
  SortDropdown,
  FilterButton,
  FilterSidebar,
  FilterModal,
  ActiveFiltersBadges,
  CatalogPagination,
  ResultsCounter,
  CatalogSkeleton,
  EmptyState,
} from '@/components/store';

interface CatalogItem {
  id: string;
  title: string;
  kind?: 'product' | 'service';
  description?: string | null;
  priceBzr?: string | number | null;
  coverUrl?: string | null;
  media?: Array<{ url?: string | null }>;
  mediaIds?: Array<string | number>;
  categoryPath?: string[];
}


const MAX_LINKS = 8;

function copyToClipboard(value?: string | null) {
  if (!value) return;
  if (typeof navigator === 'undefined' || !navigator.clipboard) return;
  void navigator.clipboard.writeText(value).catch(() => undefined);
}

function absolutize(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  try {
    return new URL(url, API_BASE_URL || 'http://localhost:3000').toString();
  } catch {
    return url;
  }
}

function pickCover(item: CatalogItem): string | undefined {
  if (item.coverUrl) {
    const ipfsResolved = resolveIpfsUrl(item.coverUrl);
    return absolutize(ipfsResolved || item.coverUrl);
  }
  if (Array.isArray(item.media)) {
    for (const entry of item.media) {
      const url = entry?.url;
      if (!url) continue;
      const ipfsResolved = resolveIpfsUrl(url);
      const absoluteUrl = absolutize(ipfsResolved || url);
      if (absoluteUrl) return absoluteUrl;
    }
  }
  return undefined;
}

function formatPrice(value: CatalogItem['priceBzr'], locale: string): string | null {
  if (value == null) return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  try {
    const formatter = new Intl.NumberFormat(locale || 'pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${formatter.format(numeric)} BZR`;
  } catch {
    return `${numeric.toFixed(2)} BZR`;
  }
}

function normalizeLinkLabel(entry: NormalizedLink): string {
  const parts = entry.key.split('.').map((part) => part.replace(/[-_]/g, ' '));
  return parts.map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1)).join(' / ');
}

function resolveGatewayLink(cid: string | null): string | undefined {
  if (!cid) return undefined;
  // Não gerar link para fake CIDs (usados quando IPFS não está configurado)
  if (cid.startsWith('bafydev')) return undefined;
  // Usa função centralizada que respeita VITE_IPFS_GATEWAY_URL
  return resolveIpfsUrl(cid);
}

function formatBigInt(value: string | null | undefined): string {
  if (!value) return '0';
  try {
    const digits = BigInt(value).toString();
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  } catch {
    return String(value);
  }
}


export default function StorePublicPage() {
  const { t, i18n } = useTranslation();
  const { slug = '' } = useParams<{ slug: string }>();
  const normalizedSlug = slug.trim();
  const isValidSlug = normalizedSlug.length > 0;

  const [store, setStore] = useState<NormalizedOnChainStore | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterModalOpen, setFilterModalOpen] = useState(false);

  // Filter hooks
  const { filters, updateFilter, clearFilter, clearAllFilters, activeFiltersCount } = useStoreFilters();
  const { items: catalogItems, loading: catalogLoading, error: catalogError, page } = useStoreCatalog(
    store?.payload?.storeId || '',
    filters
  );
  const facets = useStoreFacets(store?.payload?.storeId || '', filters);

  useEffect(() => {
    let active = true;

    if (!isValidSlug) {
      setStore(null);
      setLoading(false);
      setError(t('store.onchain.invalidSlug', { defaultValue: 'Slug de loja inválido.' }));
      return () => {
        active = false;
      };
    }

    setLoading(true);
    setError(null);
    setStore(null);

    // Use the by-slug endpoint which handles fallback internally
    getPublicJSON<any>(`/stores/by-slug/${normalizedSlug}`)
      .then((storeData) => {
        if (!active) return;

        // Normalizar resposta da API para o formato esperado pelo frontend
        // API retorna: {store, onChain, sync, categories, products, ...}
        // Frontend espera: {metadata, payload}
        const storeJson = storeData.store || {};

        const normalized: NormalizedOnChainStore = {
          metadata: {
            name: storeJson.name || storeJson.slug || 'Loja sem nome',
            description: storeJson.description || '',
            coverUrl: storeJson.cover?.url || storeJson.coverUrl || undefined,
            categories: storeData.categories || [],
            links: [], // TODO: processar links se houver
            theme: storeData.theme || undefined,
            raw: storeJson,
          },
          payload: {
            // IMPORTANTE: Usar onChain.instanceId como prioridade pois é o ID correto da blockchain
            // storeJson.id pode estar desatualizado no IPFS
            storeId: storeData.onChain?.instanceId || storeData.id || '0',
            owner: storeData.onChain?.owner || '',
            operators: storeData.onChain?.operators || [],
            cid: storeData.onChain?.metadataCid || '',
            reputation: storeData.onChain?.reputation || null,
            sync: storeData.sync || { status: 'unknown', source: 'unknown' },
          },
        };

        setStore(normalized);
      })
      .catch((err) => {
        if (!active) return;
        if (err instanceof ApiError) {
          if (err.status === 404) {
            setError(t('store.onchain.notFound', { defaultValue: 'Loja on-chain não encontrada.' }));
          } else if (err.status === 503) {
            setError(t('store.onchain.chainUnavailable', { defaultValue: 'Chain indisponível no momento.' }));
          } else {
            setError(err.message || t('errors.generic'));
          }
        } else if (err instanceof Error) {
          setError(err.message);
        } else {
          setError(t('errors.generic'));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isValidSlug, normalizedSlug, t]);


  const metadata = store?.metadata;
  const owner = store?.payload?.owner;
  const operators = store?.payload?.operators ?? [];
  const cid = store?.payload?.cid;
  const links = useMemo(() => metadata?.links?.slice(0, MAX_LINKS) ?? [], [metadata?.links]);
  const reputation = store?.payload?.reputation;

  const cidGatewayLink = resolveGatewayLink(cid ?? null);

  const renderCatalog = () => {
    if (!isValidSlug) return null;

    if (catalogLoading) {
      return <CatalogSkeleton count={6} />;
    }

    if (catalogError) {
      return (
        <Alert variant="destructive" className="border-destructive/40 bg-destructive/10 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{catalogError}</AlertDescription>
        </Alert>
      );
    }

    if (catalogItems.length === 0) {
      // Check if any filters are active
      const hasActiveFilters =
        filters.q !== '' ||
        filters.kind !== 'all' ||
        filters.categoryPath.length > 0 ||
        filters.priceMin !== '' ||
        filters.priceMax !== '' ||
        Object.keys(filters.attrs).length > 0;

      return (
        <EmptyState
          hasFilters={hasActiveFilters}
          searchTerm={filters.q || undefined}
          onClearFilters={clearAllFilters}
        />
      );
    }

    return (
      <motion.div
        className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        initial="hidden"
        animate="visible"
        variants={{
          visible: {
            transition: {
              staggerChildren: 0.05,
            },
          },
        }}
      >
        <AnimatePresence mode="popLayout">
          {catalogItems.map((item) => {
            const cover = pickCover(item);
            const priceLabel = formatPrice(item.priceBzr, i18n.language);
            const href = item.kind === 'service' ? `/app/service/${item.id}` : `/app/product/${item.id}`;
            return (
              <motion.div
                key={item.id}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 },
                }}
                transition={{
                  duration: 0.3,
                  ease: [0.25, 0.1, 0.25, 1],
                }}
                exit={{ opacity: 0, scale: 0.95 }}
                layout
              >
                <Card className="flex h-full flex-col overflow-hidden border border-store-ink/15 bg-store-bg/95 shadow-sm">
              {cover ? (
                <div className="aspect-video w-full bg-store-brand/10">
                  <img src={cover} alt={item.title} loading="lazy" className="h-full w-full object-cover" />
                </div>
              ) : (
                <div className="aspect-video w-full border border-dashed border-store-ink/20 bg-store-brand/5" />
              )}
              <CardContent className="flex flex-1 flex-col gap-3 p-4">
                <div>
                  <h3 className="text-base font-semibold text-store-ink">{item.title}</h3>
                  {item.description && (
                    <p className="mt-1 line-clamp-3 text-sm text-store-ink/70">{item.description}</p>
                  )}
                </div>
                <div className="mt-auto flex flex-wrap items-center gap-2 text-xs text-store-ink/70">
                  <Badge variant="outline" className="border-store-ink/20 text-store-ink">
                    {item.kind === 'service'
                      ? t('store.onchain.kindService', { defaultValue: 'Serviço' })
                      : t('store.onchain.kindProduct', { defaultValue: 'Produto' })}
                  </Badge>
                  {Array.isArray(item.categoryPath) && item.categoryPath.length > 0 && (
                    <Badge variant="secondary" className="border-store-ink/10 bg-store-brand/15 text-store-ink">
                      {item.categoryPath[item.categoryPath.length - 1]}
                    </Badge>
                  )}
                </div>
                {priceLabel && <p className="text-lg font-semibold text-store-brand">{priceLabel}</p>}
                <Link to={href} className="mt-2 inline-flex">
                  <Button variant="outline" size="sm">
                    {t('store.onchain.viewItem', { defaultValue: 'Ver item' })}
                  </Button>
                </Link>
              </CardContent>
              </Card>
            </motion.div>
          );
        })}
        </AnimatePresence>
      </motion.div>
    );
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1 bg-muted/20 py-8">
        <div className="container mx-auto px-4">
          {loading ? (
            <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              {t('store.onchain.loading', { defaultValue: 'Carregando loja on-chain...' })}
            </div>
          ) : error ? (
            <Alert variant="destructive" className="mx-auto max-w-2xl border-destructive/40 bg-destructive/10 text-destructive">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-4 w-4" />
                <div className="space-y-1">
                  <div className="text-sm font-semibold">
                    {t('store.onchain.errorTitle', { defaultValue: 'Não foi possível carregar a loja' })}
                  </div>
                  <AlertDescription>{error}</AlertDescription>
                </div>
              </div>
            </Alert>
          ) : store && metadata ? (
            <StoreLayout theme={metadata.theme} layout={metadata.theme?.layoutVariant}>
              <div className="space-y-10">
                <section className="overflow-hidden rounded-2xl border border-store-ink/15 bg-store-bg/95 shadow-sm">
                  {metadata.coverUrl && (
                    <div className="h-48 w-full bg-store-brand/10 sm:h-56">
                      <img
                        src={metadata.coverUrl}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  )}
                  <div className="flex flex-col gap-6 p-6 sm:p-8">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2 text-sm text-store-ink/60">
                          <StoreIcon className="h-4 w-4" />
                          <span>{t('store.onchain.storeIdLabel', { defaultValue: 'Loja on-chain' })} #{store.payload.storeId}</span>
                          {(() => {
                            const syncStatus = (store.payload as any)?.sync?.status;
                            const syncSource = (store.payload as any)?.sync?.source;
                            return syncStatus ? (
                              <SyncBadge
                                status={syncStatus.toUpperCase()}
                                source={syncSource}
                              />
                            ) : null;
                          })()}
                          {(() => {
                            const hasCatalog = !!(metadata.raw as any)?.catalog;
                            console.log('[store-public] metadata.raw:', metadata.raw);
                            console.log('[store-public] hasCatalog:', hasCatalog);
                            return hasCatalog ? (
                              <Badge variant="secondary" className="border-store-ink/20 bg-store-brand/20 text-store-ink">
                                <Layers className="mr-1 h-3 w-3" />
                                {t('store.onchain.catalogPublished', { defaultValue: 'Catálogo publicado on-chain' })}
                              </Badge>
                            ) : null;
                          })()}
                        </div>
                        <h1 className="text-3xl font-bold text-store-ink sm:text-4xl">{metadata.name}</h1>
                        {metadata.description && (
                          <p className="max-w-3xl whitespace-pre-line text-sm text-store-ink/80 sm:text-base">
                            {metadata.description}
                          </p>
                        )}
                      </div>
                      {cid && (
                        <div className="flex min-w-0 flex-col gap-2 text-xs text-store-ink/70">
                          <span className="font-medium uppercase tracking-wide text-store-ink/60">
                            {t('store.onchain.metadataCid', { defaultValue: 'CID dos metadados' })}
                          </span>
                          <code className="rounded bg-store-brand/10 px-2 py-1 text-[11px] text-store-ink">
                            {cid}
                          </code>
                          {cidGatewayLink && (
                            <a
                              href={cidGatewayLink}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center text-sm font-medium text-store-brand underline"
                            >
                              {t('store.onchain.openInGateway', { defaultValue: 'Abrir no gateway IPFS' })}
                              <ExternalLink className="ml-1 h-3 w-3" />
                            </a>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-6 lg:flex-row">
                      <div className="flex-1 space-y-4">
                        <div className="space-y-2">
                          <span className="text-xs font-medium uppercase tracking-wide text-store-ink/60">
                            {t('store.onchain.owner', { defaultValue: 'Owner' })}
                          </span>
                          <div className="flex items-center gap-2 text-sm text-store-ink/80">
                            <code className="rounded bg-store-brand/10 px-2 py-1 text-xs text-store-ink">
                              {owner}
                            </code>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-store-ink/70"
                              onClick={() => copyToClipboard(owner)}
                              aria-label={t('store.onchain.copyOwner', { defaultValue: 'Copiar owner' })}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <span className="text-xs font-medium uppercase tracking-wide text-store-ink/60">
                            {t('store.onchain.operators', { defaultValue: 'Operadores' })}
                          </span>
                          {operators.length > 0 ? (
                            <div className="flex flex-col gap-1">
                              {operators.map((op) => (
                                <div key={op} className="flex items-center gap-2 text-sm text-store-ink/80">
                                  <code className="rounded bg-store-brand/10 px-2 py-1 text-xs text-store-ink">
                                    {op}
                                  </code>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-store-ink/70"
                                    onClick={() => copyToClipboard(op)}
                                    aria-label={t('store.onchain.copyOperator', { defaultValue: 'Copiar operador' })}
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-store-ink/60">
                              {t('store.onchain.noOperators', { defaultValue: 'Nenhum operador configurado.' })}
                            </p>
                          )}
                        </div>
                      </div>

                      <Separator orientation="vertical" className="hidden lg:block" />

                      <div className="flex-1 space-y-4">
                        <div>
                          <span className="text-xs font-medium uppercase tracking-wide text-store-ink/60">
                            {t('store.onchain.reputation', { defaultValue: 'Reputação' })}
                          </span>
                          {reputation ? (
                            <div className="mt-2 grid grid-cols-2 gap-3 text-sm text-store-ink/80">
                              <div>
                                <p className="text-lg font-semibold text-store-ink">{reputation.sales}</p>
                                <p className="text-xs text-store-ink/60">
                                  {t('store.onchain.repSales', { defaultValue: 'Vendas' })}
                                </p>
                              </div>
                              <div>
                                <p className="text-lg font-semibold text-green-500">{reputation.positive}</p>
                                <p className="text-xs text-store-ink/60">
                                  {t('store.onchain.repPositive', { defaultValue: 'Feedback positivo' })}
                                </p>
                              </div>
                              <div>
                                <p className="text-lg font-semibold text-red-500">{reputation.negative}</p>
                                <p className="text-xs text-store-ink/60">
                                  {t('store.onchain.repNegative', { defaultValue: 'Feedback negativo' })}
                                </p>
                              </div>
                              <div>
                                <p className="text-lg font-semibold text-store-ink">
                                  {formatBigInt(reputation.volumePlanck)}
                                </p>
                                <p className="text-xs text-store-ink/60">
                                  {t('store.onchain.repVolume', { defaultValue: 'Volume (planck)' })}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <p className="mt-2 text-sm text-store-ink/60">
                              {t('store.onchain.repUnavailable', { defaultValue: 'Reputação ainda não disponível.' })}
                            </p>
                          )}
                        </div>

                        {links.length > 0 && (
                          <div className="space-y-2">
                            <span className="text-xs font-medium uppercase tracking-wide text-store-ink/60">
                              {t('store.onchain.links', { defaultValue: 'Links' })}
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {links.map((link) => (
                                <a
                                  key={link.key}
                                  href={link.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-2 rounded border border-store-ink/20 px-3 py-1 text-sm text-store-ink transition hover:bg-store-brand/10"
                                >
                                  {normalizeLinkLabel(link)}
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-store-ink/15 bg-store-bg/95 p-6 shadow-sm">
                  <div className="flex items-center gap-2 text-store-ink mb-6">
                    <Layers className="h-4 w-4" />
                    <h2 className="text-xl font-semibold">
                      {t('store.onchain.catalogTitle', { defaultValue: 'Catálogo da loja' })}
                    </h2>
                  </div>

                  {/* Mobile: Search bar + filter button */}
                  <div className="block lg:hidden mb-4 space-y-2">
                    <SearchBar
                      value={filters.q}
                      onChange={(value) => updateFilter('q', value)}
                    />
                    <div className="flex gap-2">
                      <FilterButton
                        activeCount={activeFiltersCount}
                        onClick={() => setFilterModalOpen(true)}
                      />
                      <SortDropdown
                        value={filters.sort}
                        onChange={(value) => updateFilter('sort', value)}
                      />
                    </div>
                  </div>

                  {/* Desktop: 2-column layout */}
                  <div className="lg:grid lg:grid-cols-[280px_1fr] lg:gap-6">
                    {/* Desktop sidebar */}
                    <FilterSidebar
                      storeId={store?.payload?.storeId || ''}
                      filters={filters}
                      facets={{
                        categories: facets.categories,
                        priceRange: facets.priceRange,
                        priceBuckets: facets.priceBuckets,
                        attributes: facets.attributes,
                      }}
                      loading={facets.loading}
                      onFilterChange={updateFilter}
                      onClearAll={clearAllFilters}
                    />

                    {/* Catalog area */}
                    <div>
                      {/* Desktop: Search bar + sort */}
                      <div className="hidden lg:flex gap-4 mb-4">
                        <SearchBar
                          value={filters.q}
                          onChange={(value) => updateFilter('q', value)}
                        />
                        <SortDropdown
                          value={filters.sort}
                          onChange={(value) => updateFilter('sort', value)}
                        />
                      </div>

                      {/* Active filters badges */}
                      <div className="mb-4">
                        <ActiveFiltersBadges
                          filters={filters}
                          onRemoveFilter={clearFilter}
                          onUpdateFilter={updateFilter}
                          onClearAll={clearAllFilters}
                        />
                      </div>

                      {/* Results counter */}
                      <div className="mb-4">
                        <ResultsCounter
                          totalItems={page.total}
                          hasActiveFilters={
                            filters.q !== '' ||
                            filters.kind !== 'all' ||
                            filters.categoryPath.length > 0 ||
                            filters.priceMin !== '' ||
                            filters.priceMax !== '' ||
                            Object.keys(filters.attrs).length > 0
                          }
                          loading={catalogLoading}
                        />
                      </div>

                      {/* Catalog grid */}
                      {renderCatalog()}

                      {/* Pagination */}
                      {!catalogLoading && !catalogError && catalogItems.length > 0 && (
                        <CatalogPagination
                          currentPage={filters.page}
                          totalPages={Math.ceil(page.total / page.limit)}
                          totalItems={page.total}
                          itemsPerPage={page.limit}
                          onPageChange={(newPage) => updateFilter('page', newPage)}
                        />
                      )}
                    </div>
                  </div>

                  {/* Mobile filter modal */}
                  <FilterModal
                    open={filterModalOpen}
                    onOpenChange={setFilterModalOpen}
                    storeId={store?.payload?.storeId || ''}
                    filters={filters}
                    facets={{
                      categories: facets.categories,
                      priceRange: facets.priceRange,
                      priceBuckets: facets.priceBuckets,
                      attributes: facets.attributes,
                    }}
                    loading={facets.loading}
                    onFilterChange={updateFilter}
                    onClearAll={clearAllFilters}
                    resultsCount={page.total}
                  />
                </section>
              </div>
            </StoreLayout>
          ) : null}
        </div>
      </main>
      <Footer />
    </div>
  );
}
