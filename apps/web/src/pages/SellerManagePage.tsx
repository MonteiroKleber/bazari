import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { sellerApi } from '@/modules/seller/api';
import { Package, ShoppingCart, Settings, Truck } from 'lucide-react';
import { DeliveryPartnersPage } from './delivery/DeliveryPartnersPage';

type Status = 'ALL' | 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export default function SellerManagePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { shopSlug = '' } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab ativo (com sincronização via URL)
  const activeTab = searchParams.get('tab') || 'products';

  // Estados para produtos
  const [status, setStatus] = useState<Status>('ALL');
  const [products, setProducts] = useState<any[]>([]);
  const [productsNextCursor, setProductsNextCursor] = useState<string | null>(null);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);

  // Estados para pedidos
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersNextCursor, setOrdersNextCursor] = useState<string | null>(null);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState<string | null>(null);

  // Carregar produtos
  async function loadProducts(reset = false) {
    const params: any = { limit: 20 };
    if (status !== 'ALL') params.status = status;
    if (!reset && productsNextCursor) params.cursor = productsNextCursor;
    const res = await sellerApi.listStoreProducts(shopSlug, params);
    setProducts((prev) => reset ? res.items : [...prev, ...res.items]);
    setProductsNextCursor(res.nextCursor ?? null);
  }

  // Carregar pedidos
  async function loadOrders(cursor?: string) {
    const res = await sellerApi.listStoreOrders(shopSlug, cursor ? { cursor } : undefined);
    setOrders((prev) => cursor ? [...prev, ...res.items] : res.items);
    setOrdersNextCursor(res.nextCursor ?? null);
  }

  // Carregar produtos ao mudar status
  useEffect(() => {
    if (activeTab !== 'products') return;
    setProductsLoading(true);
    setProductsError(null);
    setProducts([]);
    setProductsNextCursor(null);
    loadProducts(true)
      .catch((e) => setProductsError(e?.message || t('errors.generic')))
      .finally(() => setProductsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, activeTab]);

  // Carregar pedidos ao entrar na tab
  useEffect(() => {
    if (activeTab !== 'orders') return;
    setOrdersLoading(true);
    setOrdersError(null);
    loadOrders()
      .catch((e) => setOrdersError(e?.message || t('errors.generic')))
      .finally(() => setOrdersLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  async function onPublish(id: string) {
    try {
      await sellerApi.publishMyProduct(id);
      setProducts((prev) => prev.map((p) => p.id === id ? { ...p, status: 'PUBLISHED' } : p));
    } catch {}
  }

  async function onArchive(id: string) {
    try {
      await sellerApi.archiveMyProduct(id);
      setProducts((prev) => prev.map((p) => p.id === id ? { ...p, status: 'ARCHIVED' } : p));
    } catch {}
  }

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  return (
    <div className="container mx-auto px-4 py-2 md:py-3">
      <Breadcrumbs items={[
        { label: t('nav.dashboard', { defaultValue: 'Dashboard' }), href: '/app' },
        { label: t('nav.myStores', { defaultValue: 'Minhas Lojas' }), href: '/app/sellers' },
        { label: shopSlug }
      ]} />

      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-1">
          {t('seller.manage.title', { defaultValue: 'Gerenciar Loja' })}
        </h1>
        <p className="text-muted-foreground">@{shopSlug}</p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
          <TabsTrigger value="products" className="gap-2">
            <Package className="h-4 w-4" />
            {t('seller.manage.products', { defaultValue: 'Produtos' })}
          </TabsTrigger>
          <TabsTrigger value="orders" className="gap-2">
            <ShoppingCart className="h-4 w-4" />
            {t('seller.manage.orders', { defaultValue: 'Pedidos' })}
          </TabsTrigger>
          <TabsTrigger value="delivery" className="gap-2">
            <Truck className="h-4 w-4" />
            {t('seller.manage.delivery', { defaultValue: 'Entregadores' })}
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="h-4 w-4" />
            {t('seller.manage.settings', { defaultValue: 'Configurações' })}
          </TabsTrigger>
        </TabsList>

        {/* Tab: Produtos */}
        <TabsContent value="products" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {(['ALL', 'DRAFT', 'PUBLISHED', 'ARCHIVED'] as const).map((s) => (
                <Button
                  key={s}
                  variant={status === s ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatus(s)}
                >
                  {s}
                </Button>
              ))}
            </div>
            <Link to="/app/new">
              <Button>
                {t('seller.products.new', { defaultValue: 'Cadastrar' })}
              </Button>
            </Link>
          </div>

          {productsLoading && products.length === 0 ? (
            <div className="text-muted-foreground">{t('common.loading')}</div>
          ) : productsError ? (
            <div className="text-destructive">{productsError}</div>
          ) : products.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Package className="h-16 w-16 text-muted-foreground mb-4" />
                <h2 className="text-xl font-semibold mb-2">
                  {t('seller.products.empty.title', { defaultValue: 'Nenhum produto cadastrado' })}
                </h2>
                <p className="text-muted-foreground text-center mb-6">
                  {t('seller.products.empty.description', { defaultValue: 'Comece cadastrando seu primeiro produto' })}
                </p>
                <Link to="/app/new">
                  <Button>
                    {t('seller.products.new', { defaultValue: 'Cadastrar' })}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((p) => (
                <Card key={p.id}>
                  <CardHeader>
                    <CardTitle className="text-base">{p.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">{p.priceBzr} BZR</div>
                      <Badge
                        variant={
                          p.status === 'PUBLISHED'
                            ? 'default'
                            : p.status === 'DRAFT'
                            ? 'secondary'
                            : 'outline'
                        }
                      >
                        {p.status}
                      </Badge>
                    </div>
                    <div className="mt-3 flex gap-2">
                      {p.status !== 'PUBLISHED' && (
                        <Button size="sm" onClick={() => onPublish(p.id)}>
                          {t('seller.products.publish', { defaultValue: 'Publicar' })}
                        </Button>
                      )}
                      {p.status !== 'ARCHIVED' && (
                        <Button size="sm" variant="outline" onClick={() => onArchive(p.id)}>
                          {t('seller.products.archive', { defaultValue: 'Arquivar' })}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {productsNextCursor && (
            <div className="flex justify-center mt-6">
              <Button variant="outline" onClick={() => loadProducts(false)}>
                {t('profile.seeMore', { defaultValue: 'Ver mais' })}
              </Button>
            </div>
          )}
        </TabsContent>

        {/* Tab: Pedidos */}
        <TabsContent value="orders" className="space-y-4">
          {ordersLoading && orders.length === 0 ? (
            <div className="text-muted-foreground">{t('common.loading')}</div>
          ) : ordersError ? (
            <div className="text-destructive">{ordersError}</div>
          ) : orders.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <ShoppingCart className="h-16 w-16 text-muted-foreground mb-4" />
                <h2 className="text-xl font-semibold mb-2">
                  {t('seller.orders.empty.title', { defaultValue: 'Nenhum pedido recebido' })}
                </h2>
                <p className="text-muted-foreground text-center">
                  {t('seller.orders.empty.description', { defaultValue: 'Seus pedidos aparecerão aqui' })}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {orders.map((o) => (
                <Card key={o.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">#{o.id.slice(-8)}</CardTitle>
                      <Badge>{o.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground">Total: {o.totalBzr} planck</div>
                    <ul className="mt-2 text-sm list-disc ml-5">
                      {o.items.map((i: any) => (
                        <li key={i.listingId}>
                          {i.titleSnapshot} × {i.qty}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3">
                      <Link to={`/app/orders/${o.id}`}>
                        <Button size="sm">
                          {t('seller.orders.view', { defaultValue: 'Ver pedido' })}
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {ordersNextCursor && (
            <div className="flex justify-center mt-6">
              <Button variant="outline" onClick={() => loadOrders(ordersNextCursor!)}>
                {t('profile.seeMore', { defaultValue: 'Ver mais' })}
              </Button>
            </div>
          )}
        </TabsContent>

        {/* Tab: Entregadores */}
        <TabsContent value="delivery" className="space-y-4">
          <DeliveryPartnersPage embedded={true} />
        </TabsContent>

        {/* Tab: Configurações */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('seller.settings.title', { defaultValue: 'Configurações da Loja' })}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2">
                  {t('seller.settings.general', { defaultValue: 'Configurações Gerais' })}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {t('seller.settings.description', { defaultValue: 'Configure dados, tema e categorias da sua loja' })}
                </p>
                <Button onClick={() => navigate(`/app/seller/setup?store=${shopSlug}`)}>
                  {t('seller.settings.edit', { defaultValue: 'Editar configurações' })}
                </Button>
              </div>

              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2">
                  {t('seller.settings.commission', { defaultValue: 'Política de Comissão' })}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {t('seller.settings.commissionDescription', { defaultValue: 'Configure como promotores podem ganhar comissões vendendo seus produtos' })}
                </p>
                <Button variant="outline" onClick={() => navigate('/app/seller/commission-policy')}>
                  {t('seller.settings.configureCommission', { defaultValue: 'Configurar Comissões' })}
                </Button>
              </div>

              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2">
                  {t('seller.settings.commissionAnalytics', { defaultValue: 'Análise de Comissões' })}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {t('seller.settings.commissionAnalyticsDescription', { defaultValue: 'Visualize estatísticas, tendências e histórico de comissões pagas aos afiliados' })}
                </p>
                <Button variant="outline" onClick={() => navigate('/app/seller/commissions')}>
                  {t('seller.settings.viewCommissionAnalytics', { defaultValue: 'Ver Analytics de Comissões' })}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('seller.settings.affiliates', { defaultValue: 'Programa de Afiliados' })}</CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <p className="text-sm text-muted-foreground mb-4">
                  {t('seller.settings.affiliatesDescription', { defaultValue: 'Gerencie promotores aprovados para vender produtos da sua loja' })}
                </p>
                <Button variant="outline" onClick={() => navigate('/app/seller/affiliates')}>
                  {t('seller.settings.manageAffiliates', { defaultValue: 'Gerenciar Afiliados' })}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
