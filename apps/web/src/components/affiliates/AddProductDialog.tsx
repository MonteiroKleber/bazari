/**
 * Dialog para adicionar produto ao marketplace de afiliado
 * Versão melhorada com seleção visual de loja e produto
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { apiHelpers } from '@/lib/api';
import { Loader2, Store, Package, Search } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface AddProductDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  marketplaceId: string;
}

interface AffiliatedStore {
  id: string;
  storeId: number;
  storeName: string;
  storeLogoUrl: string | null;
  commissionPercent: number;
  status: string;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: string;
  imageUrl: string | null;
  category: string;
}

export default function AddProductDialog({
  open,
  onClose,
  onSuccess,
  marketplaceId,
}: AddProductDialogProps) {
  const [step, setStep] = useState<'stores' | 'products' | 'customize'>('stores');
  const [stores, setStores] = useState<AffiliatedStore[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedStore, setSelectedStore] = useState<AffiliatedStore | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingStores, setLoadingStores] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Customização
  const [customDescription, setCustomDescription] = useState('');
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [featured, setFeatured] = useState(false);

  useEffect(() => {
    if (open) {
      loadAffiliatedStores();
      setStep('stores');
      setSelectedStore(null);
      setSelectedProduct(null);
      setCustomDescription('');
      setCustomImageUrl('');
      setFeatured(false);
    }
  }, [open]);

  const loadAffiliatedStores = async () => {
    setLoadingStores(true);
    try {
      // Buscar afiliações aprovadas do usuário
      const response = await apiHelpers.get<{ affiliations: any[] }>(
        '/api/chat/affiliates/me'
      );

      // Mapear para o formato esperado
      const affiliatedStores: AffiliatedStore[] = response.affiliations
        .filter((a: any) => a.status === 'approved')
        .map((a: any) => ({
          id: a.id,
          storeId: parseInt(a.storeId),
          storeName: a.storeName || `Loja #${a.storeId}`,
          storeLogoUrl: a.storeAvatar || null,
          commissionPercent: a.customCommission || 5,
          status: a.status,
        }));

      setStores(affiliatedStores);
    } catch (err: any) {
      console.error('Error loading stores:', err);
      alert('Erro ao carregar lojas: ' + err.message);
    } finally {
      setLoadingStores(false);
    }
  };

  const loadStoreProducts = async (storeId: number) => {
    setLoadingProducts(true);
    try {
      // Buscar produtos da loja
      const response = await apiHelpers.get<{ data: any[] }>(
        `/api/products?sellerId=${storeId}`
      );

      const mappedProducts: Product[] = response.data.map((p: any) => ({
        id: p.id,
        name: p.title || p.name,
        description: p.description || '',
        price: p.priceBzr?.toString() || '0',
        imageUrl: p.images?.[0] || p.imageUrl || null,
        category: p.category?.namePt || 'Produto',
      }));

      setProducts(mappedProducts);
    } catch (err: any) {
      console.error('Error loading products:', err);
      alert('Erro ao carregar produtos: ' + err.message);
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleSelectStore = (store: AffiliatedStore) => {
    setSelectedStore(store);
    setStep('products');
    loadStoreProducts(store.storeId);
  };

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setStep('customize');
  };

  const handleSubmit = async () => {
    if (!selectedStore || !selectedProduct) return;

    setSubmitting(true);

    try {
      await apiHelpers.post(
        `/api/affiliates/marketplaces/${marketplaceId}/products`,
        {
          storeId: selectedStore.storeId,
          productId: selectedProduct.id,
          customDescription: customDescription.trim() || undefined,
          customImageUrl: customImageUrl.trim() || undefined,
          featured,
        }
      );

      onSuccess();
      handleClose();
    } catch (err: any) {
      console.error('Error adding product:', err);
      if (err.message.includes('already added')) {
        alert('Este produto já foi adicionado ao seu marketplace');
      } else {
        alert('Erro ao adicionar produto: ' + err.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      onClose();
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 'stores' && 'Selecione uma Loja'}
            {step === 'products' && `Produtos - ${selectedStore?.storeName}`}
            {step === 'customize' && 'Personalizar Produto'}
          </DialogTitle>
          <DialogDescription>
            {step === 'stores' && 'Escolha uma loja da qual você é afiliado'}
            {step === 'products' && 'Selecione o produto que deseja promover'}
            {step === 'customize' && 'Customize como o produto aparecerá no seu marketplace'}
          </DialogDescription>
        </DialogHeader>

        {/* STEP 1: Select Store */}
        {step === 'stores' && (
          <div className="space-y-4">
            {loadingStores ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">Carregando lojas...</p>
              </div>
            ) : stores.length === 0 ? (
              <div className="text-center py-12">
                <Store className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  Você ainda não está afiliado a nenhuma loja
                </p>
                <Button variant="outline" onClick={handleClose}>
                  Fechar
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stores.map((store) => (
                  <Card
                    key={store.id}
                    className="p-4 cursor-pointer hover:border-primary transition-colors"
                    onClick={() => handleSelectStore(store)}
                  >
                    <div className="flex items-center gap-4">
                      {store.storeLogoUrl ? (
                        <img
                          src={store.storeLogoUrl}
                          alt={store.storeName}
                          className="w-16 h-16 rounded object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded bg-muted flex items-center justify-center">
                          <Store className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">
                          {store.storeName}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Comissão: {store.commissionPercent}%
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* STEP 2: Select Product */}
        {step === 'products' && (
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar produto..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {loadingProducts ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">Carregando produtos...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  {searchQuery ? 'Nenhum produto encontrado' : 'Esta loja não tem produtos'}
                </p>
                <Button variant="outline" onClick={() => setStep('stores')}>
                  Voltar
                </Button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                  {filteredProducts.map((product) => (
                    <Card
                      key={product.id}
                      className="p-4 cursor-pointer hover:border-primary transition-colors"
                      onClick={() => handleSelectProduct(product)}
                    >
                      <div className="flex gap-4">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-20 h-20 rounded object-cover"
                          />
                        ) : (
                          <div className="w-20 h-20 rounded bg-muted flex items-center justify-center">
                            <Package className="w-8 h-8 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground truncate">
                            {product.name}
                          </h3>
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                            {product.description}
                          </p>
                          <p className="text-lg font-bold text-foreground">
                            {parseFloat(product.price).toFixed(2)} BZR
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
                <Button variant="outline" onClick={() => setStep('stores')}>
                  Voltar
                </Button>
              </>
            )}
          </div>
        )}

        {/* STEP 3: Customize */}
        {step === 'customize' && selectedProduct && (
          <div className="space-y-4">
            {/* Preview */}
            <Card className="p-4">
              <h3 className="font-semibold mb-2">Preview do Produto</h3>
              <div className="flex gap-4">
                <img
                  src={customImageUrl || selectedProduct.imageUrl || '/placeholder.png'}
                  alt={selectedProduct.name}
                  className="w-24 h-24 rounded object-cover"
                />
                <div className="flex-1">
                  <h4 className="font-semibold">{selectedProduct.name}</h4>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {customDescription || selectedProduct.description}
                  </p>
                  <p className="text-lg font-bold mt-2">
                    {parseFloat(selectedProduct.price).toFixed(2)} BZR
                  </p>
                  {selectedStore && (
                    <p className="text-xs text-muted-foreground">
                      Comissão: {selectedStore.commissionPercent}%
                    </p>
                  )}
                </div>
              </div>
            </Card>

            {/* Custom Description */}
            <div>
              <Label htmlFor="customDescription">Descrição Personalizada (Opcional)</Label>
              <Textarea
                id="customDescription"
                value={customDescription}
                onChange={(e) => setCustomDescription(e.target.value)}
                placeholder="Por que você recomenda este produto..."
                rows={3}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Deixe em branco para usar a descrição original
              </p>
            </div>

            {/* Custom Image URL */}
            <div>
              <Label htmlFor="customImageUrl">URL da Imagem Personalizada (Opcional)</Label>
              <Input
                id="customImageUrl"
                type="url"
                value={customImageUrl}
                onChange={(e) => setCustomImageUrl(e.target.value)}
                placeholder="https://exemplo.com/imagem.png"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Deixe em branco para usar a imagem original
              </p>
            </div>

            {/* Featured */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="featured"
                checked={featured}
                onCheckedChange={(checked) => setFeatured(checked as boolean)}
              />
              <Label htmlFor="featured" className="text-sm font-normal cursor-pointer">
                Marcar como produto em destaque
              </Label>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('products')}>
                Voltar
              </Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Adicionar Produto
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
