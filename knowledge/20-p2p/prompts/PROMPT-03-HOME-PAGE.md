# Prompt 03: Refatorar P2PHomePage

## Contexto

Os componentes base e avancados ja foram criados. Agora vamos refatorar a pagina principal do P2P para usar a nova UX.

## Pre-requisitos

Verifique que existem:
- `apps/web/src/modules/p2p/components/AssetCard.tsx`
- `apps/web/src/modules/p2p/components/OfferCard.tsx`
- `apps/web/src/modules/p2p/components/UserBadge.tsx`
- `apps/web/src/modules/p2p/components/FilterSheet.tsx`

## Arquivos de Referencia

- `knowledge/20-p2p/02-NOVA-UX-SPEC.md` - Layout da nova HomePage
- `apps/web/src/modules/p2p/pages/P2PHomePage.tsx` - Codigo atual
- `apps/web/src/modules/p2p/api.ts` - API existente

## Tarefa

Refatorar `apps/web/src/modules/p2p/pages/P2PHomePage.tsx` com a nova UX.

### Mudancas Principais

1. **Remover 4 tabs** (BUY_BZR, SELL_BZR, BUY_ZARI, SELL_ZARI)
2. **Adicionar AssetCard** para selecionar BZR ou ZARI
3. **Adicionar toggle** Comprar/Vender
4. **Usar OfferCard** para cada oferta
5. **Mover filtros** para dropdown/bottom sheet
6. **Adicionar "Minhas Negociacoes"** como preview

### Novo Layout

**Desktop:**
```
┌─────────────────────────────────────────────────────────────────────┐
│  HEADER                                                              │
│  P2P Exchange                                       [+ Nova Oferta]  │
│  Negocie BZR e ZARI diretamente com outros usuarios                 │
├─────────────────────────────────────────────────────────────────────┤
│  ASSET SELECTOR (grid 2 cols)                                        │
│  ┌───────────────────────────┐  ┌───────────────────────────┐       │
│  │      💰 BZR               │  │      🏛️ ZARI              │       │
│  │   Token Nativo            │  │   Governanca              │       │
│  │   R$ 5.50                 │  │   Fase 2A: R$ 1.38        │       │
│  └───────────────────────────┘  └───────────────────────────┘       │
├─────────────────────────────────────────────────────────────────────┤
│  CONTROLS                                                            │
│  [  Comprar  ][  Vender  ]              [🔍 Filtros]  [↕️ Ordenar]  │
├─────────────────────────────────────────────────────────────────────┤
│  OFFERS LIST                                                         │
│  12 ofertas disponiveis                                              │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ <OfferCard />                                                    ││
│  └─────────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ <OfferCard />                                                    ││
│  └─────────────────────────────────────────────────────────────────┘│
│  ...                                                                 │
│                        [Carregar mais]                               │
├─────────────────────────────────────────────────────────────────────┤
│  MY ORDERS PREVIEW                                                   │
│  📋 Minhas Negociacoes                                [Ver todas →] │
│  • #a1b2c3 · Comprando 500 BZR · ⏳ Aguardando PIX    [Abrir]       │
│  • #d4e5f6 · Vendendo 1000 BZR · ✅ Concluida                       │
└─────────────────────────────────────────────────────────────────────┘
```

**Mobile:**
```
┌─────────────────────────┐
│ P2P Exchange    [+ Nova]│
├─────────────────────────┤
│ ┌─────────┐ ┌─────────┐ │
│ │ 💰 BZR  │ │ 🏛️ ZARI │ │
│ │ R$5.50  │ │ R$1.38  │ │
│ └─────────┘ └─────────┘ │
├─────────────────────────┤
│ [ Comprar ][ Vender ]   │
├─────────────────────────┤
│ 🔍 Filtrar       ↕️ Ord │
├─────────────────────────┤
│ 12 ofertas              │
│ ┌─────────────────────┐ │
│ │ <OfferCard />       │ │
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ <OfferCard />       │ │
│ └─────────────────────┘ │
│ [Carregar mais]         │
├─────────────────────────┤
│ 📋 Minhas (2)  [Ver →]  │
│ • #a1b2 ⏳ Aguard. PIX  │
└─────────────────────────┘
```

### Estado do Componente

```tsx
// Estado simplificado
const [selectedAsset, setSelectedAsset] = useState<'BZR' | 'ZARI'>('BZR');
const [actionType, setActionType] = useState<'buy' | 'sell'>('buy');
const [filters, setFilters] = useState<{
  minBRL?: string;
  maxBRL?: string;
  minRating?: number;
  phase?: string;  // Para ZARI
}>({});
const [filterOpen, setFilterOpen] = useState(false);

// Ofertas
const [offers, setOffers] = useState<P2POffer[]>([]);
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

// Minhas ordens (preview)
const [myOrders, setMyOrders] = useState<Order[]>([]);
```

### Logica de Listagem

```tsx
// Converter estado para parametros da API
const getApiParams = () => {
  const params: any = {
    method: 'PIX',
    assetType: selectedAsset,
  };

  if (selectedAsset === 'BZR') {
    // Se usuario quer COMPRAR, mostrar quem esta VENDENDO
    params.side = actionType === 'buy' ? 'SELL_BZR' : 'BUY_BZR';
  }

  if (filters.minBRL) params.minBRL = Number(filters.minBRL);
  if (filters.maxBRL) params.maxBRL = Number(filters.maxBRL);
  if (filters.phase && selectedAsset === 'ZARI') params.phase = filters.phase;

  return params;
};
```

### Componentes a Usar

```tsx
import { AssetCard } from '../components/AssetCard';
import { OfferCard } from '../components/OfferCard';
import { FilterSheet } from '../components/FilterSheet';
import { ZARIPhaseBadge } from '../components/ZARIPhaseBadge';
```

### Skeleton Loading

Adicionar skeleton enquanto carrega:

```tsx
function OfferCardSkeleton() {
  return (
    <div className="border rounded-lg p-4 animate-pulse">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-muted rounded-full" />
        <div className="flex-1">
          <div className="h-4 bg-muted rounded w-1/3 mb-2" />
          <div className="h-3 bg-muted rounded w-1/4" />
        </div>
      </div>
      <div className="h-8 bg-muted rounded w-1/2 mb-4" />
      <div className="h-4 bg-muted rounded w-2/3 mb-4" />
      <div className="h-10 bg-muted rounded w-32 ml-auto" />
    </div>
  );
}
```

### Empty State

```tsx
function EmptyState() {
  const { t } = useTranslation();
  return (
    <div className="text-center py-12">
      <div className="text-4xl mb-4">📭</div>
      <h3 className="text-lg font-medium mb-2">
        {t('p2p.empty.title', 'Nenhuma oferta encontrada')}
      </h3>
      <p className="text-muted-foreground mb-4">
        {t('p2p.empty.description', 'Tente ajustar os filtros ou criar sua propria oferta.')}
      </p>
      <Button onClick={() => navigate('/app/p2p/offers/new')}>
        {t('p2p.cta.createOffer', 'Criar oferta')}
      </Button>
    </div>
  );
}
```

### Preview de Minhas Ordens

```tsx
function MyOrdersPreview({ orders, onViewAll }: { orders: Order[]; onViewAll: () => void }) {
  const { t } = useTranslation();

  if (orders.length === 0) return null;

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <CardTitle className="text-base flex items-center gap-2">
          📋 {t('p2p.my.title', 'Minhas Negociacoes')}
          <Badge variant="secondary">{orders.length}</Badge>
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={onViewAll}>
          {t('common.viewAll', 'Ver todas')} →
        </Button>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {orders.slice(0, 3).map((order) => (
            <OrderPreviewItem key={order.id} order={order} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

### Responsividade

```tsx
// Grid para AssetCards
<div className="grid grid-cols-2 gap-4">
  <AssetCard asset="BZR" ... />
  <AssetCard asset="ZARI" ... />
</div>

// Toggle Comprar/Vender
<div className="flex gap-2">
  <Button
    variant={actionType === 'buy' ? 'default' : 'outline'}
    onClick={() => setActionType('buy')}
    className="flex-1 sm:flex-none"
  >
    {t('p2p.actions.buy', 'Comprar')}
  </Button>
  <Button
    variant={actionType === 'sell' ? 'default' : 'outline'}
    onClick={() => setActionType('sell')}
    className="flex-1 sm:flex-none"
  >
    {t('p2p.actions.sell', 'Vender')}
  </Button>
</div>

// Lista de ofertas
<div className="space-y-4">
  {offers.map((offer) => (
    <OfferCard
      key={offer.id}
      offer={offer}
      actionType={actionType}
      onAction={() => navigate(`/app/p2p/offers/${offer.id}`)}
    />
  ))}
</div>
```

## Instrucoes

1. Fazer backup do codigo atual (comentar ou copiar)
2. Reescrever o componente com a nova estrutura
3. Manter a mesma API (`p2pApi.listOffers`, etc.)
4. Usar os novos componentes criados
5. Adicionar skeleton loading
6. Adicionar empty state
7. Testar em mobile (Chrome DevTools)
8. Verificar acessibilidade (tab navigation, aria-labels)

## Validacao

```bash
pnpm --filter @bazari/web exec tsc --noEmit
pnpm --filter @bazari/web build
```

Testar fluxo:
1. Selecionar BZR/ZARI
2. Alternar Comprar/Vender
3. Aplicar filtros
4. Clicar em oferta
5. Ver preview de minhas ordens
