import { useEffect, useMemo, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Plus, ArrowRight, ArrowUpDown } from 'lucide-react';
import { p2pApi, type P2POffer, type Order } from '../api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AssetCard } from '../components/AssetCard';
import { OfferCard, OfferCardSkeleton } from '../components/OfferCard';
import { FilterSheet, FilterTrigger, type FilterValues } from '../components/FilterSheet';
import { ZARIPhaseBadge } from '../components/ZARIPhaseBadge';
import { CountdownTimer } from '../components/CountdownTimer';

type SortOption = 'price_asc' | 'price_desc' | 'rating_desc' | 'recent';

export default function P2PHomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Asset and action selection
  const [selectedAsset, setSelectedAsset] = useState<'BZR' | 'ZARI'>('BZR');
  const [actionType, setActionType] = useState<'buy' | 'sell'>('buy');

  // Filters
  const [filters, setFilters] = useState<FilterValues>({});
  const [filterOpen, setFilterOpen] = useState(false);
  const [phaseFilter, setPhaseFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortOption>('rating_desc');

  // Offers data
  const [offers, setOffers] = useState<P2POffer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // My orders preview
  const [myOrders, setMyOrders] = useState<Order[]>([]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.minBRL) count++;
    if (filters.maxBRL) count++;
    if (filters.minRating && filters.minRating > 0) count++;
    return count;
  }, [filters]);

  // Load offers
  const loadOffers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, unknown> = {
        method: 'PIX',
        assetType: selectedAsset,
      };

      if (selectedAsset === 'BZR') {
        // If user wants to BUY, show offers from people SELLING
        params.side = actionType === 'buy' ? 'SELL_BZR' : 'BUY_BZR';
      }

      if (selectedAsset === 'ZARI' && phaseFilter) {
        params.phase = phaseFilter;
      }

      if (filters.minBRL) params.minBRL = Number(filters.minBRL);
      if (filters.maxBRL) params.maxBRL = Number(filters.maxBRL);

      const res = await p2pApi.listOffers(params);

      // Sort offers
      let sortedOffers = [...res.items];
      switch (sortBy) {
        case 'price_asc':
          sortedOffers.sort((a, b) => {
            const priceA = Number(a.priceBRLPerBZR || a.priceBRLPerUnit || 0);
            const priceB = Number(b.priceBRLPerBZR || b.priceBRLPerUnit || 0);
            return priceA - priceB;
          });
          break;
        case 'price_desc':
          sortedOffers.sort((a, b) => {
            const priceA = Number(a.priceBRLPerBZR || a.priceBRLPerUnit || 0);
            const priceB = Number(b.priceBRLPerBZR || b.priceBRLPerUnit || 0);
            return priceB - priceA;
          });
          break;
        case 'rating_desc':
          sortedOffers.sort((a, b) => {
            const ratingA = a.ownerStats?.avgStars || 0;
            const ratingB = b.ownerStats?.avgStars || 0;
            return ratingB - ratingA;
          });
          break;
        case 'recent':
          // Assume items are already sorted by recent from API
          break;
      }

      // Filter by minimum rating if set
      if (filters.minRating && filters.minRating > 0) {
        sortedOffers = sortedOffers.filter(
          (o) => (o.ownerStats?.avgStars || 0) >= (filters.minRating || 0)
        );
      }

      setOffers(sortedOffers);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [selectedAsset, actionType, filters, phaseFilter, sortBy]);

  // Load my active orders (preview)
  const loadMyOrders = useCallback(async () => {
    try {
      const res = await p2pApi.listMyOrders({ limit: 5 });
      // Filter for active orders only
      const activeOrders = res.items.filter((o: Order) =>
        ['AWAITING_ESCROW', 'AWAITING_FIAT_PAYMENT', 'AWAITING_CONFIRMATION'].includes(o.status)
      );
      setMyOrders(activeOrders.slice(0, 3));
    } catch {
      // Silently fail - user may not be logged in
      setMyOrders([]);
    }
  }, []);

  useEffect(() => {
    loadOffers();
  }, [loadOffers]);

  useEffect(() => {
    loadMyOrders();
  }, [loadMyOrders]);

  const handleApplyFilters = (newFilters: FilterValues) => {
    setFilters(newFilters);
  };

  const handleClearFilters = () => {
    setFilters({});
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      AWAITING_ESCROW: t('p2p.status.awaitingEscrow', 'Aguardando Escrow'),
      AWAITING_FIAT_PAYMENT: t('p2p.status.awaitingPayment', 'Aguardando PIX'),
      AWAITING_CONFIRMATION: t('p2p.status.awaitingConfirmation', 'Aguardando Confirmação'),
      RELEASED: t('p2p.status.released', 'Concluída'),
      CANCELLED: t('p2p.status.cancelled', 'Cancelada'),
      EXPIRED: t('p2p.status.expired', 'Expirada'),
    };
    return labels[status] || status;
  };

  return (
    <div className="container mx-auto px-4 py-3 md:py-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('p2p.home.title', 'P2P Exchange')}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t('p2p.home.subtitle', 'Negocie BZR e ZARI diretamente com outros usuários')}
          </p>
        </div>
        <Button onClick={() => navigate('/app/p2p/offers/new')} className="shrink-0">
          <Plus className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">{t('p2p.cta.createOffer', 'Nova Oferta')}</span>
          <span className="sm:hidden">{t('p2p.cta.new', 'Nova')}</span>
        </Button>
      </div>

      {/* Asset Selector */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <AssetCard
          asset="BZR"
          selected={selectedAsset === 'BZR'}
          onClick={() => setSelectedAsset('BZR')}
          priceInfo="R$ 5,50"
        />
        <AssetCard
          asset="ZARI"
          selected={selectedAsset === 'ZARI'}
          onClick={() => setSelectedAsset('ZARI')}
          priceInfo="Fase 2A: R$ 1,38"
        />
      </div>

      {/* ZARI Phase Badge - only shown when ZARI is selected */}
      {selectedAsset === 'ZARI' && (
        <div className="space-y-3">
          <ZARIPhaseBadge variant="full" onPhaseClick={() => navigate('/app/p2p/zari/stats')} />
          <div className="flex flex-wrap gap-2">
            <Button
              variant={phaseFilter === '' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPhaseFilter('')}
            >
              {t('p2p.filters.allPhases', 'Todas')}
            </Button>
            <Button
              variant={phaseFilter === '2A' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPhaseFilter('2A')}
            >
              2A
            </Button>
            <Button
              variant={phaseFilter === '2B' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPhaseFilter('2B')}
            >
              2B
            </Button>
            <Button
              variant={phaseFilter === '3' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPhaseFilter('3')}
            >
              3
            </Button>
          </div>
        </div>
      )}

      {/* Buy/Sell Toggle + Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Buy/Sell Toggle */}
        <div className="flex gap-2">
          <Button
            variant={actionType === 'buy' ? 'default' : 'outline'}
            onClick={() => setActionType('buy')}
            className="flex-1 sm:flex-none"
          >
            {t('p2p.actions.buy', 'Comprar')} {selectedAsset}
          </Button>
          <Button
            variant={actionType === 'sell' ? 'default' : 'outline'}
            onClick={() => setActionType('sell')}
            className="flex-1 sm:flex-none"
          >
            {t('p2p.actions.sell', 'Vender')} {selectedAsset}
          </Button>
        </div>

        {/* Filters & Sort */}
        <div className="flex gap-2">
          <FilterTrigger
            onClick={() => setFilterOpen(true)}
            activeCount={activeFilterCount}
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <ArrowUpDown className="h-4 w-4 mr-2" />
                {t('p2p.sort.title', 'Ordenar')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSortBy('rating_desc')}>
                {t('p2p.sort.ratingDesc', 'Melhor avaliação')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('price_asc')}>
                {t('p2p.sort.priceAsc', 'Menor preço')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('price_desc')}>
                {t('p2p.sort.priceDesc', 'Maior preço')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('recent')}>
                {t('p2p.sort.recent', 'Mais recentes')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Offers Count */}
      <div className="text-sm text-muted-foreground">
        {loading ? (
          t('common.loading', 'Carregando...')
        ) : (
          t('p2p.home.offersCount', '{{count}} ofertas disponíveis', { count: offers.length })
        )}
      </div>

      {/* Offers List */}
      <div className="space-y-4">
        {error && (
          <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950/20 p-3 rounded-lg" role="alert">
            {error}
          </div>
        )}

        {loading ? (
          // Skeleton loading
          <>
            <OfferCardSkeleton />
            <OfferCardSkeleton />
            <OfferCardSkeleton />
          </>
        ) : offers.length > 0 ? (
          offers.map((offer) => (
            <OfferCard
              key={offer.id}
              offer={offer}
              actionType={actionType}
              onAction={() => navigate(`/app/p2p/offers/${offer.id}`)}
            />
          ))
        ) : (
          // Empty state
          <EmptyState onCreateOffer={() => navigate('/app/p2p/offers/new')} />
        )}
      </div>

      {/* My Orders Preview */}
      {myOrders.length > 0 && (
        <MyOrdersPreview
          orders={myOrders}
          onViewAll={() => navigate('/app/p2p/my-orders')}
          getStatusLabel={getStatusLabel}
        />
      )}

      {/* Filter Sheet (Mobile) */}
      <FilterSheet
        open={filterOpen}
        onOpenChange={setFilterOpen}
        filters={filters}
        onApply={handleApplyFilters}
        onClear={handleClearFilters}
      />
    </div>
  );
}

// Empty State Component
function EmptyState({ onCreateOffer }: { onCreateOffer: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="text-center py-12 border rounded-lg bg-muted/20">
      <div className="text-4xl mb-4">📭</div>
      <h3 className="text-lg font-medium mb-2">
        {t('p2p.empty.title', 'Nenhuma oferta encontrada')}
      </h3>
      <p className="text-muted-foreground mb-4 max-w-sm mx-auto">
        {t('p2p.empty.description', 'Tente ajustar os filtros ou criar sua própria oferta.')}
      </p>
      <Button onClick={onCreateOffer}>
        <Plus className="h-4 w-4 mr-2" />
        {t('p2p.cta.createOffer', 'Criar oferta')}
      </Button>
    </div>
  );
}

// My Orders Preview Component
function MyOrdersPreview({
  orders,
  onViewAll,
  getStatusLabel,
}: {
  orders: Order[];
  onViewAll: () => void;
  getStatusLabel: (status: string) => string;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <CardTitle className="text-base flex items-center gap-2">
          <span>📋</span>
          {t('p2p.my.title', 'Minhas Negociações')}
          <Badge variant="secondary">{orders.length}</Badge>
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={onViewAll}>
          {t('common.viewAll', 'Ver todas')}
          <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="divide-y">
          {orders.map((order) => (
            <div
              key={order.id}
              className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="font-mono text-sm text-muted-foreground">
                  #{order.id.slice(0, 6)}
                </span>
                <span className="text-sm truncate">
                  {order.side === 'SELL_BZR' ? 'Vendendo' : 'Comprando'}{' '}
                  {order.amountBZR} {order.assetType || 'BZR'}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {order.expiresAt && ['AWAITING_ESCROW', 'AWAITING_FIAT_PAYMENT', 'AWAITING_CONFIRMATION'].includes(order.status) && (
                  <CountdownTimer expiresAt={order.expiresAt} size="sm" />
                )}
                <Badge variant="outline" className="text-xs">
                  {getStatusLabel(order.status)}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/app/p2p/orders/${order.id}`)}
                >
                  {t('common.open', 'Abrir')}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
