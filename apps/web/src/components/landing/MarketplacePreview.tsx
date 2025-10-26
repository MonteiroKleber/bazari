import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, Star, Store } from 'lucide-react';
import { api } from '@/lib/api';

interface Product {
  id: string;
  title: string;
  price: number;
  images: string[];
  rating?: number;
  type: 'product' | 'service';
}

export function MarketplacePreview() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await api.get('/listings/recent?limit=4');
        setProducts(response.data.listings || []);
      } catch (error) {
        console.error('Failed to fetch products:', error);
        // Fallback to mock data
        setProducts([
          {
            id: '1',
            title: 'iPhone 13 Pro',
            price: 3500,
            images: ['/placeholder-phone.jpg'],
            rating: 5,
            type: 'product'
          },
          {
            id: '2',
            title: 'Camisa Polo',
            price: 120,
            images: ['/placeholder-shirt.jpg'],
            rating: 4,
            type: 'product'
          },
          {
            id: '3',
            title: 'Maçãs Orgânicas',
            price: 50,
            images: ['/placeholder-apple.jpg'],
            rating: 5,
            type: 'product'
          },
          {
            id: '4',
            title: 'Serviços de TI',
            price: 200,
            images: ['/placeholder-service.jpg'],
            rating: 4,
            type: 'service'
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}&sort=relevance`);
    } else {
      navigate('/search?sort=relevance');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <section className="py-20 md:py-28 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Title */}
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              🛍️ {t('marketplace_section.title', { defaultValue: 'Marketplace Aberto e Público' })}
            </h2>
            <p className="text-lg text-muted-foreground">
              {t('marketplace_section.subtitle', {
                defaultValue: 'Compre e venda agora mesmo. Sem cadastro obrigatório para navegar.'
              })}
            </p>
          </div>

          {/* Product Grid */}
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              Carregando produtos...
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
              {products.map((product) => (
                <Card
                  key={product.id}
                  className="group cursor-pointer hover:shadow-xl transition-all duration-300 overflow-hidden"
                  onClick={() => navigate(`/${product.type}/${product.id}`)}
                >
                  <div className="aspect-square bg-muted relative overflow-hidden">
                    {product.images[0] ? (
                      <img
                        src={product.images[0]}
                        alt={product.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900">
                        <Store className="h-16 w-16 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-sm mb-2 line-clamp-2 min-h-[2.5rem]">
                      {product.title}
                    </h3>
                    <p className="text-lg font-bold text-primary mb-2">
                      {product.price.toLocaleString('pt-BR')} BZR
                    </p>
                    {product.rating && (
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3 w-3 ${
                              i < product.rating!
                                ? 'fill-secondary text-secondary'
                                : 'text-muted-foreground/20'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mb-8">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder={t('marketplace_section.search_placeholder', {
                    defaultValue: 'O que você está procurando?'
                  })}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="pl-10 h-12 text-base"
                />
              </div>
              <Button size="lg" onClick={handleSearch}>
                {t('marketplace_section.search', { defaultValue: 'Buscar' })}
              </Button>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center">
            <Button
              size="lg"
              className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg min-w-[280px]"
              onClick={() => navigate('/search?sort=relevance')}
            >
              🏪 {t('marketplace_section.cta', { defaultValue: 'Entrar no Marketplace Completo' })}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
