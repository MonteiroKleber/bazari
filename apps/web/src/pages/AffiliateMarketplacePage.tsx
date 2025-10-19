/**
 * Página Pública do Marketplace de Afiliado
 *
 * Exibe a vitrine pública de um marketplace de afiliado
 * Rota: /m/:slug
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiHelpers } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, ExternalLink, ShoppingCart, TrendingUp } from 'lucide-react';

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

interface MarketplaceOwner {
  id: string;
  displayName: string;
  avatarUrl: string | null;
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
  owner: MarketplaceOwner;
  products: MarketplaceProduct[];
  stats: MarketplaceStats;
}

export default function AffiliateMarketplacePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [marketplace, setMarketplace] = useState<Marketplace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMarketplace();
  }, [slug]);

  const loadMarketplace = async () => {
    if (!slug) return;

    setLoading(true);
    setError(null);

    try {
      const response = await apiHelpers.getPublic<{ marketplace: Marketplace }>(
        `/api/affiliates/marketplaces/${slug}`
      );

      setMarketplace(response.marketplace);
    } catch (err: any) {
      console.error('Error loading marketplace:', err);
      setError(err.message || 'Failed to load marketplace');
    } finally {
      setLoading(false);
    }
  };

  const handleProductClick = (product: MarketplaceProduct) => {
    // Incrementar clickCount (opcional - pode ser feito no backend)
    // TODO: Track click analytics

    // Redirecionar para página do produto
    navigate(`/app/product/${product.productId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando marketplace...</p>
        </div>
      </div>
    );
  }

  if (error || !marketplace) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Marketplace não encontrado
          </h1>
          <p className="text-muted-foreground mb-6">
            {error || 'O marketplace que você procura não existe ou não está disponível.'}
          </p>
          <Button onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao Início
          </Button>
        </div>
      </div>
    );
  }

  const primaryColor = marketplace.primaryColor || '#7C3AED';
  const secondaryColor = marketplace.secondaryColor || '#EC4899';

  return (
    <div className="min-h-screen bg-background">
      {/* Banner */}
      <div
        className="relative h-64 bg-gradient-to-r from-purple-600 to-pink-600"
        style={{
          background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
        }}
      >
        {marketplace.bannerUrl && (
          <img
            src={marketplace.bannerUrl}
            alt={marketplace.name}
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* Header Info */}
      <div className="max-w-6xl mx-auto px-4 -mt-20 relative z-10">
        <div className="bg-card rounded-lg shadow-lg p-6 mb-8">
          <div className="flex items-start gap-6">
            {/* Logo */}
            <div className="flex-shrink-0">
              {marketplace.logoUrl ? (
                <img
                  src={marketplace.logoUrl}
                  alt={marketplace.name}
                  className="w-24 h-24 rounded-lg object-cover border-4 border-background shadow-lg"
                />
              ) : (
                <div
                  className="w-24 h-24 rounded-lg border-4 border-background shadow-lg flex items-center justify-center text-white font-bold text-2xl"
                  style={{ backgroundColor: primaryColor }}
                >
                  {marketplace.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-foreground mb-2">
                {marketplace.name}
              </h1>
              {marketplace.description && (
                <p className="text-muted-foreground mb-4">
                  {marketplace.description}
                </p>
              )}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <img
                    src={marketplace.owner.avatarUrl || '/default-avatar.png'}
                    alt={marketplace.owner.displayName}
                    className="w-6 h-6 rounded-full"
                  />
                  <span>por {marketplace.owner.displayName}</span>
                </div>
                <div className="flex items-center gap-1">
                  <ShoppingCart className="w-4 h-4" />
                  <span>{marketplace.stats.productCount} produtos</span>
                </div>
                {marketplace.stats.totalSales > 0 && (
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" />
                    <span>{marketplace.stats.totalSales} vendas</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        <div className="pb-12">
          <h2 className="text-2xl font-bold text-foreground mb-6">
            Produtos em Destaque
          </h2>

          {marketplace.products.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-lg">
              <p className="text-muted-foreground">
                Nenhum produto disponível no momento.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {marketplace.products.map((product) => (
                <Card
                  key={product.id}
                  className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => handleProductClick(product)}
                >
                  {/* Product Image */}
                  <div className="relative h-48 bg-muted">
                    {product.productImageUrl ? (
                      <img
                        src={product.productImageUrl}
                        alt={product.productName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingCart className="w-12 h-12 text-muted-foreground" />
                      </div>
                    )}
                    {product.featured && (
                      <div className="absolute top-2 right-2 bg-yellow-500 text-white px-2 py-1 rounded text-xs font-bold">
                        DESTAQUE
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="p-4">
                    <h3 className="font-semibold text-foreground mb-2 line-clamp-2">
                      {product.productName}
                    </h3>
                    {product.customDescription && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {product.customDescription}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-2xl font-bold text-foreground">
                          {parseFloat(product.productPrice).toFixed(2)} BZR
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Comissão: {product.commissionPercent}%
                        </p>
                      </div>
                      <Button size="sm">
                        <ExternalLink className="w-4 h-4 mr-1" />
                        Ver
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
