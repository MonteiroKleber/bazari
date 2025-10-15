import { useState, useEffect, useMemo } from 'react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../ui/card';
import { Separator } from '../ui/separator';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { X, Store, Info, ShoppingCart, Users, Unlock } from 'lucide-react';
import { ProposalItem } from '@bazari/shared-types';
import { getPublicJSON, getJSON } from '../../lib/api';
import { toast } from 'sonner';
import { AffiliateStatusBanner } from '../affiliates/AffiliateStatusBanner';

// Configuração de mensagens contextuais por filtro
const FILTER_MESSAGES = {
  mine: {
    multiStore: { show: false },
    emptyHint: "Selecione produtos das suas lojas. Você receberá 100% do valor da venda.",
    multiStoreText: ""
  },
  affiliate: {
    multiStore: { show: true },
    emptyHint: "Selecione produtos das lojas que você é afiliado aprovado. Você ganhará comissão na venda.",
    multiStoreText: "Você pode adicionar produtos de até 5 lojas afiliadas"
  },
  followers: {
    multiStore: { show: true },
    emptyHint: "Selecione produtos de lojas cujos donos você segue. Você ganhará comissão na venda.",
    multiStoreText: "Você pode adicionar produtos de até 5 lojas que você segue"
  },
  open: {
    multiStore: { show: true },
    emptyHint: "Selecione produtos de lojas abertas. Você ganhará comissão na venda.",
    multiStoreText: "Você pode adicionar produtos de até 5 lojas abertas"
  }
} as const;

interface ProductSelectorGridProps {
  storeId?: number; // storeId fixo se for vendedor
  selectedItems: ProposalItem[];
  onItemsChange: (items: ProposalItem[]) => void;
  onFilterChange?: (filter: 'mine' | 'affiliate' | 'followers' | 'open') => void; // Callback quando filtro muda
}

interface Product {
  id: string;
  title: string;
  priceBzr?: string | number | null;
  coverUrl?: string | null;
  kind?: 'product' | 'service';
  onChainStoreId?: number | string | null;
  sellerStoreId?: string;
}

interface StoreInfo {
  storeId: number;
  name: string;
  shopSlug: string;
  commission: number;
  mode: 'open' | 'followers' | 'affiliates';
  allowMultiStore?: boolean;
}

interface ExtendedProposalItem extends ProposalItem {
  storeId: number;
  storeName?: string;
}

export function ProductSelectorGrid({ storeId, selectedItems, onItemsChange, onFilterChange }: ProductSelectorGridProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [allowMultiStore, setAllowMultiStore] = useState(true);

  // FASE 1 + 2 + 3 + 4: Filtro de produtos (carregado do localStorage)
  const [productFilter, setProductFilter] = useState<'mine' | 'affiliate' | 'followers' | 'open'>(() => {
    try {
      const saved = localStorage.getItem('bazari:proposalFilter');
      if (saved && ['mine', 'affiliate', 'followers', 'open'].includes(saved)) {
        return saved as 'mine' | 'affiliate' | 'followers' | 'open';
      }
    } catch (e) {
      console.warn('Failed to load filter from localStorage:', e);
    }
    return 'open'; // Default: lojas abertas
  });

  // FASE 3 + 4: Contadores de produtos por filtro
  const [productCounts, setProductCounts] = useState({ mine: 0, affiliate: 0, followers: 0, open: 0 });

  // Store info cache
  const [storeInfoMap, setStoreInfoMap] = useState<Map<number, StoreInfo>>(new Map());

  // Loja travada (para vendedor ou promotor em modo single-store)
  const [lockedStoreId, setLockedStoreId] = useState<number | null>(storeId || null);

  // Notificar quando o filtro mudar
  useEffect(() => {
    onFilterChange?.(productFilter);
  }, [productFilter, onFilterChange]);

  // Carregar produtos
  useEffect(() => {
    loadProducts();
  }, [lockedStoreId, allowMultiStore, productFilter]);

  // FASE 2: Carregar info das lojas dos produtos
  useEffect(() => {
    const loadStoresInfo = async () => {
      const uniqueStoreIds = [...new Set(products.map(p => p.onChainStoreId).filter(Boolean))] as number[];
      for (const storeId of uniqueStoreIds) {
        if (!storeInfoMap.has(storeId)) {
          await loadStoreInfo(storeId);
        }
      }
    };
    if (products.length > 0) {
      loadStoresInfo();
    }
  }, [products]);

  // FASE 3: Salvar filtro no localStorage
  useEffect(() => {
    if (!storeId) {
      try {
        localStorage.setItem('bazari:proposalFilter', productFilter);
      } catch (e) {
        console.warn('Failed to save filter to localStorage:', e);
      }
    }
  }, [productFilter, storeId]);

  // FASE 3 + 4: Buscar contadores de produtos por filtro
  useEffect(() => {
    const loadCounts = async () => {
      try {
        const [mineRes, affiliateRes, followersRes, openRes] = await Promise.all([
          getJSON<{ page?: { total?: number } }>('/search?myStoresOnly=true&limit=1').catch(() => ({ page: { total: 0 } })),
          getJSON<{ page?: { total?: number } }>('/search?affiliateStoresOnly=true&limit=1').catch(() => ({ page: { total: 0 } })),
          getJSON<{ page?: { total?: number } }>('/search?followersStoresOnly=true&limit=1').catch(() => ({ page: { total: 0 } })),
          getPublicJSON<{ page?: { total?: number } }>('/search?openStoresOnly=true&limit=1').catch(() => ({ page: { total: 0 } })),
        ]);

        setProductCounts({
          mine: mineRes.page?.total || 0,
          affiliate: affiliateRes.page?.total || 0,
          followers: followersRes.page?.total || 0,
          open: openRes.page?.total || 0,
        });
      } catch (error) {
        console.error('Failed to load product counts:', error);
      }
    };

    loadCounts();
  }, []); // Carregar apenas uma vez

  const loadProducts = async () => {
    try {
      setLoading(true);

      // FASE 1 + 2 + 3 + 4: Construir URL com filtros
      let url = '/search?limit=100';
      let useAuth = false; // Flag para usar getJSON (autenticado)

      // Se tiver loja travada (vendedor específico)
      if (lockedStoreId && !allowMultiStore) {
        url = `/search?onChainStoreId=${lockedStoreId}&limit=50`;
      }
      // FASE 1: Se filtro "Minhas Lojas" está ativo
      else if (productFilter === 'mine') {
        url = '/search?myStoresOnly=true&limit=100';
        useAuth = true; // Precisa do token para identificar o usuário
      }
      // FASE 2: Se filtro "Afiliado" está ativo
      else if (productFilter === 'affiliate') {
        url = '/search?affiliateStoresOnly=true&limit=100';
        useAuth = true; // Precisa do token para identificar o usuário
      }
      // FASE 3: Se filtro "Seguidores" está ativo
      else if (productFilter === 'followers') {
        url = '/search?followersStoresOnly=true&limit=100';
        useAuth = true; // Precisa do token para identificar o usuário
      }
      // FASE 4: Se filtro "Aberto" está ativo
      else if (productFilter === 'open') {
        url = '/search?openStoresOnly=true&limit=100';
      }

      // Usar getJSON (autenticado) ou getPublicJSON (público)
      const response = useAuth
        ? await getJSON<{ items?: Product[] }>(url)
        : await getPublicJSON<{ items?: Product[] }>(url);
      setProducts(response?.items || []);
    } catch (error) {
      console.error('Failed to load products:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  // Carregar info de uma loja
  const loadStoreInfo = async (storeId: number): Promise<StoreInfo | null> => {
    // Check cache first
    if (storeInfoMap.has(storeId)) {
      return storeInfoMap.get(storeId)!;
    }

    try {
      // Buscar info da loja
      const storeData = await getPublicJSON<any>(`/stores/${storeId}`);

      // Buscar política de comissão
      let commission = 5;
      let mode: 'open' | 'followers' | 'affiliates' = 'open';
      let allowMultiStore = true;

      try {
        const policy = await getPublicJSON<any>(`/api/chat/settings/store/${storeId}`);
        commission = policy.policy?.percent || 5;
        mode = policy.policy?.mode || 'open';
        allowMultiStore = policy.policy?.allowMultiStore !== undefined ? policy.policy.allowMultiStore : true;
      } catch (err) {
        console.warn('No commission policy found, using defaults');
      }

      const info: StoreInfo = {
        storeId,
        name: storeData.name || storeData.shopName || 'Loja',
        shopSlug: storeData.shopSlug || '',
        commission,
        mode,
        allowMultiStore,
      };

      // Update cache
      setStoreInfoMap(prev => new Map(prev).set(storeId, info));

      return info;
    } catch (error) {
      console.error('Failed to load store info:', error);
      return null;
    }
  };

  // Agrupar items por loja
  const groupedItems = useMemo(() => {
    const groups = new Map<number, ExtendedProposalItem[]>();

    (selectedItems as ExtendedProposalItem[]).forEach(item => {
      if (!item.storeId) return; // Skip invalid items

      if (!groups.has(item.storeId)) {
        groups.set(item.storeId, []);
      }
      groups.get(item.storeId)!.push(item);
    });

    return groups;
  }, [selectedItems]);

  const filteredProducts = products.filter(p =>
    !searchQuery ||
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isSelected = (sku: string) => {
    return selectedItems.some(item => item.sku === sku);
  };

  const getQty = (sku: string) => {
    const item = selectedItems.find(item => item.sku === sku);
    return item?.qty || 0;
  };

  const addItem = async (product: Product) => {
    if (!product.onChainStoreId) {
      toast.error('Produto sem loja associada');
      return;
    }

    const productStoreId = typeof product.onChainStoreId === 'string'
      ? parseInt(product.onChainStoreId)
      : Number(product.onChainStoreId);

    // Modo single-store: validar loja
    if (!allowMultiStore) {
      // Primeiro produto: travar loja
      if (!storeId && selectedItems.length === 0) {
        setLockedStoreId(productStoreId);
      }

      // Validar loja travada
      const expectedStoreId = lockedStoreId || storeId;
      if (expectedStoreId && productStoreId !== expectedStoreId) {
        toast.error('Você só pode adicionar produtos da mesma loja nesta proposta');
        return;
      }
    }

    // Modo multi-store: validar limite de 5 lojas
    if (allowMultiStore && !groupedItems.has(productStoreId)) {
      if (groupedItems.size >= 5) {
        toast.error('Máximo de 5 lojas por proposta');
        return;
      }
    }

    // Validar limite de 20 produtos
    if (selectedItems.length >= 20) {
      toast.error('Máximo de 20 produtos por proposta');
      return;
    }

    // Load store info if not cached
    await loadStoreInfo(productStoreId);

    const price = product.priceBzr?.toString() || '0';
    const storeInfo = storeInfoMap.get(productStoreId);

    const newItem: ExtendedProposalItem = {
      sku: product.id,
      name: product.title,
      qty: 1,
      price,
      storeId: productStoreId,
      storeName: storeInfo?.name || 'Loja',
    };

    onItemsChange([...selectedItems, newItem]);
  };

  const increaseQty = (sku: string) => {
    onItemsChange(
      selectedItems.map(item =>
        item.sku === sku ? { ...item, qty: item.qty + 1 } : item
      )
    );
  };

  const decreaseQty = (sku: string) => {
    const item = selectedItems.find(i => i.sku === sku);
    if (item && item.qty > 1) {
      onItemsChange(
        selectedItems.map(i =>
          i.sku === sku ? { ...i, qty: i.qty - 1 } : i
        )
      );
    } else {
      removeItem(sku);
    }
  };

  const removeItem = (sku: string) => {
    onItemsChange(selectedItems.filter(item => item.sku !== sku));
  };

  const clearSelection = () => {
    onItemsChange([]);
    if (!storeId) {
      setLockedStoreId(null);
    }
  };

  const calculateStoreSubtotal = (items: ExtendedProposalItem[]) => {
    return items.reduce((sum, item) => sum + parseFloat(item.price) * item.qty, 0);
  };

  const calculateTotalAmount = () => {
    return selectedItems.reduce((sum, item) => sum + parseFloat(item.price) * item.qty, 0);
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Carregando produtos...</div>;
  }

  return (
    <div className="space-y-4">
      {/* FASE 1 + 2 + 3: Filtros de Produtos com Contadores */}
      <div className="flex gap-2 p-2 bg-muted/30 rounded-lg">
        <Button
          variant={productFilter === 'mine' ? 'default' : 'outline'}
          size="sm"
          className="flex-1 flex-col h-auto py-2"
          onClick={() => setProductFilter('mine')}
        >
          <div className="flex items-center gap-1">
            <Store className="h-4 w-4" />
            <span>Minhas Lojas</span>
          </div>
          {productCounts.mine > 0 && (
            <span className="text-xs opacity-80 mt-0.5">({productCounts.mine})</span>
          )}
        </Button>
        <Button
          variant={productFilter === 'affiliate' ? 'default' : 'outline'}
          size="sm"
          className="flex-1 flex-col h-auto py-2"
          onClick={() => setProductFilter('affiliate')}
        >
          <div className="flex items-center gap-1">
            🤝
            <span>Afiliado</span>
          </div>
          {productCounts.affiliate > 0 && (
            <span className="text-xs opacity-80 mt-0.5">({productCounts.affiliate})</span>
          )}
        </Button>
        <Button
          variant={productFilter === 'followers' ? 'default' : 'outline'}
          size="sm"
          className="flex-1 flex-col h-auto py-2"
          onClick={() => setProductFilter('followers')}
        >
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>Seguidores</span>
          </div>
          {productCounts.followers > 0 && (
            <span className="text-xs opacity-80 mt-0.5">({productCounts.followers})</span>
          )}
        </Button>
        <Button
          variant={productFilter === 'open' ? 'default' : 'outline'}
          size="sm"
          className="flex-1 flex-col h-auto py-2"
          onClick={() => setProductFilter('open')}
        >
          <div className="flex items-center gap-1">
            <Unlock className="h-4 w-4" />
            <span>Aberto</span>
          </div>
          {productCounts.open > 0 && (
            <span className="text-xs opacity-80 mt-0.5">({productCounts.open})</span>
          )}
        </Button>
      </div>

      {/* Toggle Multi-Store (contextual por filtro) */}
      {FILTER_MESSAGES[productFilter].multiStore.show && (
        <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-lg">
          <Checkbox
            id="allow-multistore"
            checked={allowMultiStore}
            onCheckedChange={(checked) => {
              setAllowMultiStore(checked === true);
              if (!checked && groupedItems.size > 1) {
                toast.info('Múltiplas lojas detectadas. Limpe a seleção para mudar de modo.');
              }
            }}
            disabled={groupedItems.size > 1}
          />
          <Label htmlFor="allow-multistore" className="cursor-pointer">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              <span className="font-medium">Permitir múltiplas lojas</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {allowMultiStore
                ? FILTER_MESSAGES[productFilter].multiStoreText
                : 'Apenas produtos de uma loja por proposta'}
            </p>
          </Label>
        </div>
      )}

      {/* Dica inicial (contextual por filtro) */}
      {selectedItems.length === 0 && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            💡 {FILTER_MESSAGES[productFilter].emptyHint}
          </AlertDescription>
        </Alert>
      )}

      {/* FASE 3: Busca com contador de resultados */}
      <div className="space-y-2">
        <Input
          placeholder="Buscar produtos..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <div className="text-xs text-muted-foreground px-1">
            {filteredProducts.length} {filteredProducts.length === 1 ? 'produto encontrado' : 'produtos encontrados'}
            {filteredProducts.length > 0 && ` em ${new Set(filteredProducts.map(p => p.onChainStoreId)).size} ${new Set(filteredProducts.map(p => p.onChainStoreId)).size === 1 ? 'loja' : 'lojas'}`}
          </div>
        )}
      </div>

      {/* Grid de Produtos */}
      <div className="grid grid-cols-3 gap-4 max-h-96 overflow-y-auto border rounded-lg p-4">
        {filteredProducts.length === 0 ? (
          <div className="col-span-3 text-center py-8 text-muted-foreground">
            {searchQuery ? 'Nenhum produto encontrado' : 'Nenhum produto disponível'}
          </div>
        ) : (
          filteredProducts.map(product => {
            const price = product.priceBzr?.toString() || '0';
            const productStoreId = typeof product.onChainStoreId === 'number' ? product.onChainStoreId : null;
            const storeInfo = productStoreId ? storeInfoMap.get(productStoreId) : null;

            return (
              <Card key={product.id} className="cursor-pointer hover:border-primary">
                <CardContent className="p-3">
                  {product.coverUrl && (
                    <img
                      src={product.coverUrl}
                      alt={product.title}
                      className="w-full h-24 object-cover rounded mb-2"
                    />
                  )}
                  {!product.coverUrl && (
                    <div className="w-full h-24 bg-muted rounded mb-2 flex items-center justify-center text-xs text-muted-foreground">
                      Sem imagem
                    </div>
                  )}
                  <p className="text-sm font-medium line-clamp-2 mb-1" title={product.title}>
                    {product.title}
                  </p>

                  {/* FASE 2: Badge de comissão e avisos de política */}
                  {storeInfo && productFilter !== 'mine' && (
                    <div className="space-y-1 mb-1">
                      <div className="flex items-center gap-1">
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-semibold">
                          {storeInfo.commission}% comissão
                        </span>
                        {storeInfo.mode === 'followers' && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                            Seguidor
                          </span>
                        )}
                        {storeInfo.mode === 'affiliates' && (
                          <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                            Afiliados
                          </span>
                        )}
                      </div>
                      {allowMultiStore && !storeInfo.allowMultiStore && (
                        <div className="text-xs text-amber-600 flex items-center gap-1">
                          <Info className="h-3 w-3" />
                          <span>Não permite multi-loja</span>
                        </div>
                      )}
                    </div>
                  )}

                  <p className="text-lg font-bold text-primary mb-2">
                    R$ {parseFloat(price).toFixed(2)}
                  </p>

                  {/* Controle de Quantidade */}
                  {isSelected(product.id) ? (
                    <div className="flex items-center gap-2 justify-center">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => decreaseQty(product.id)}
                      >
                        -
                      </Button>
                      <span className="w-8 text-center font-medium">{getQty(product.id)}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => increaseQty(product.id)}
                      >
                        +
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => addItem(product)}
                    >
                      Adicionar
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Itens Selecionados - Agrupados por Loja */}
      {selectedItems.length > 0 && (
        <>
          <Separator />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-semibold">
                Carrinho ({selectedItems.length} {selectedItems.length === 1 ? 'item' : 'itens'})
              </p>
              {groupedItems.size > 1 && (
                <span className="text-sm text-muted-foreground">
                  {groupedItems.size} lojas
                </span>
              )}
            </div>

            {/* Store Groups */}
            {Array.from(groupedItems.entries()).map(([storeId, items]) => {
              const storeInfo = storeInfoMap.get(storeId);
              const subtotal = calculateStoreSubtotal(items);

              return (
                <Card key={storeId} className="border-l-4 border-l-primary">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Store className="h-4 w-4" />
                      {storeInfo?.name || 'Loja'}
                    </CardTitle>
                    {storeInfo && (
                      <div className="text-xs text-muted-foreground">
                        Comissão: {storeInfo.commission}%
                        {storeInfo.mode !== 'open' && ` • ${storeInfo.mode === 'followers' ? 'Seguidores' : 'Afiliados'}`}
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-2 py-0 pb-3">
                    {items.map(item => (
                      <div key={item.sku} className="flex justify-between items-center p-2 bg-muted/50 rounded text-sm">
                        <span className="flex-1">
                          {item.qty}x {item.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            R$ {(parseFloat(item.price) * item.qty).toFixed(2)}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(item.sku)}
                            className="h-6 w-6 p-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                  <CardFooter className="pt-3 border-t">
                    <div className="w-full flex justify-between items-center">
                      <span className="text-sm font-medium">Subtotal:</span>
                      <span className="font-bold text-lg">
                        R$ {subtotal.toFixed(2)}
                      </span>
                    </div>
                  </CardFooter>

                  {/* Multi-Store Warning */}
                  {groupedItems.size > 1 && storeInfo && storeInfo.allowMultiStore === false && (
                    <div className="px-4 pb-4">
                      <Alert variant="destructive">
                        <Info className="h-4 w-4" />
                        <AlertTitle>Proposta Multi-Loja Bloqueada</AlertTitle>
                        <AlertDescription>
                          Esta loja não permite propostas com produtos de outras lojas. Por favor, remova os produtos de outras lojas ou crie propostas separadas.
                        </AlertDescription>
                      </Alert>
                    </div>
                  )}

                  {/* Affiliate Status Banner per Store */}
                  {!storeId && storeInfo && (
                    <div className="px-4 pb-4">
                      <AffiliateStatusBanner
                        storeId={storeInfo.storeId}
                        mode={storeInfo.mode}
                      />
                    </div>
                  )}
                </Card>
              );
            })}

            {/* Total Geral (se multi-loja) */}
            {groupedItems.size > 1 && (
              <Card className="bg-primary/5 border-primary">
                <CardContent className="py-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">Total Geral:</span>
                    <span className="text-2xl font-bold text-primary">
                      R$ {calculateTotalAmount().toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Dividido entre {groupedItems.size} lojas
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Botão Limpar */}
            <Button
              variant="outline"
              size="sm"
              onClick={clearSelection}
              className="w-full"
            >
              Limpar Seleção
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
