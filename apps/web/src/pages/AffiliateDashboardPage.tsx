/**
 * Dashboard do Afiliado
 *
 * Permite gerenciar marketplace pessoal, adicionar produtos e ver estatísticas
 * Rota: /affiliate/dashboard
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiHelpers } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Plus,
  ExternalLink,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Eye,
  Trash2,
  Share2,
} from 'lucide-react';
import CreateMarketplaceDialog from '@/components/affiliates/CreateMarketplaceDialog';
import AddProductDialog from '@/components/affiliates/AddProductDialog';

interface MarketplaceProduct {
  id: string;
  storeId: number;
  productId: string;
  productName: string;
  productImageUrl: string | null;
  productPrice: string;
  commissionPercent: number;
  customDescription: string | null;
  featured: boolean;
  viewCount: number;
  clickCount: number;
  addedAt: number;
}

interface MarketplaceStats {
  totalSales: number;
  totalRevenue: string;
  totalCommission: string;
  productCount: number;
}

interface Marketplace {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  isActive: boolean;
  isPublic: boolean;
  products: MarketplaceProduct[];
  stats: MarketplaceStats;
  createdAt: number;
  updatedAt: number;
}

export default function AffiliateDashboardPage() {
  const navigate = useNavigate();
  const [marketplace, setMarketplace] = useState<Marketplace | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showAddProductDialog, setShowAddProductDialog] = useState(false);

  useEffect(() => {
    loadMarketplace();
  }, []);

  const loadMarketplace = async () => {
    setLoading(true);

    try {
      const response = await apiHelpers.get<{ marketplace: Marketplace | null }>(
        '/api/affiliates/marketplaces/me'
      );

      setMarketplace(response.marketplace);
    } catch (err: any) {
      console.error('Error loading marketplace:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarketplaceCreated = (newMarketplace: Marketplace) => {
    setMarketplace(newMarketplace);
    setShowCreateDialog(false);
  };

  const handleProductAdded = () => {
    setShowAddProductDialog(false);
    loadMarketplace(); // Reload to get updated products
  };

  const handleRemoveProduct = async (productId: string) => {
    if (!marketplace) return;

    if (!confirm('Tem certeza que deseja remover este produto?')) return;

    try {
      await apiHelpers.delete(
        `/api/affiliates/marketplaces/${marketplace.id}/products/${productId}`
      );

      // Reload marketplace
      loadMarketplace();
    } catch (err: any) {
      console.error('Error removing product:', err);
      alert('Erro ao remover produto: ' + err.message);
    }
  };

  const handleShareMarketplace = () => {
    if (!marketplace) return;

    const url = `${window.location.origin}/m/${marketplace.slug}`;

    if (navigator.share) {
      navigator.share({
        title: marketplace.name,
        text: marketplace.description || 'Confira meu marketplace!',
        url,
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(url);
      alert('Link copiado para a área de transferência!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  // No marketplace created yet
  if (!marketplace) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-foreground mb-4">
              Marketplace de Afiliado
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Crie seu marketplace pessoal e ganhe comissões recomendando produtos de
              lojas que você confia.
            </p>
          </div>

          <Card className="p-8">
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <ShoppingBag className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">
                  Escolha Produtos
                </h3>
                <p className="text-sm text-muted-foreground">
                  Selecione produtos de lojas parceiras para promover
                </p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-pink-100 dark:bg-pink-900 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Share2 className="w-6 h-6 text-pink-600 dark:text-pink-400" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">
                  Compartilhe
                </h3>
                <p className="text-sm text-muted-foreground">
                  Divulgue seu marketplace personalizado nas redes sociais
                </p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">
                  Ganhe Comissões
                </h3>
                <p className="text-sm text-muted-foreground">
                  Receba automaticamente quando alguém comprar através do seu link
                </p>
              </div>
            </div>

            <div className="text-center">
              <Button size="lg" onClick={() => setShowCreateDialog(true)}>
                <Plus className="w-5 h-5 mr-2" />
                Criar Meu Marketplace
              </Button>
            </div>
          </Card>
        </div>

        <CreateMarketplaceDialog
          open={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
          onSuccess={handleMarketplaceCreated}
        />
      </div>
    );
  }

  // Marketplace exists - show dashboard
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-2 md:py-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Meu Marketplace
            </h1>
            <p className="text-muted-foreground">
              Gerencie seus produtos e acompanhe suas vendas
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleShareMarketplace}>
              <Share2 className="w-4 h-4 mr-2" />
              Compartilhar
            </Button>
            <Button onClick={() => navigate(`/m/${marketplace.slug}`)}>
              <ExternalLink className="w-4 h-4 mr-2" />
              Ver Vitrine
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Total de Vendas</p>
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-3xl font-bold text-foreground">
              {marketplace.stats?.totalSales || 0}
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Receita Total</p>
              <DollarSign className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-3xl font-bold text-foreground">
              {parseFloat(marketplace.stats?.totalRevenue || '0').toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">BZR</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Comissão Ganha</p>
              <DollarSign className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-green-600">
              {parseFloat(marketplace.stats?.totalCommission || '0').toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">BZR</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Produtos</p>
              <ShoppingBag className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-3xl font-bold text-foreground">
              {marketplace.stats?.productCount || 0}
            </p>
          </Card>
        </div>

        {/* Products */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-foreground">Meus Produtos</h2>
            <Button onClick={() => setShowAddProductDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Produto
            </Button>
          </div>

          {marketplace.products.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-muted-foreground/20 rounded-lg">
              <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                Você ainda não adicionou nenhum produto
              </p>
              <Button onClick={() => setShowAddProductDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Primeiro Produto
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {marketplace.products.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  {/* Image */}
                  <div className="flex-shrink-0 w-16 h-16 bg-muted rounded overflow-hidden">
                    {product.productImageUrl ? (
                      <img
                        src={product.productImageUrl}
                        alt={product.productName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">
                      {product.productName}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      <span>{parseFloat(product.productPrice).toFixed(2)} BZR</span>
                      <span>•</span>
                      <span>Comissão: {product.commissionPercent}%</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {product.viewCount}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        navigate(`/product/${product.productId}`)
                      }
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveProduct(product.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <AddProductDialog
        open={showAddProductDialog}
        onClose={() => setShowAddProductDialog(false)}
        onSuccess={handleProductAdded}
        marketplaceId={marketplace.id}
      />
    </div>
  );
}
