import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { HandshakeIcon, Vault, Zap, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';

interface P2POffer {
  id: string;
  username: string;
  amount: number;
  price: number;
  type: 'buy' | 'sell';
}

export function BZRSection() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [offers, setOffers] = useState<P2POffer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch recent P2P offers
    const fetchOffers = async () => {
      try {
        const response = await api.get('/p2p/offers?limit=3');
        setOffers(response.data.offers || []);
      } catch (error) {
        console.error('Failed to fetch P2P offers:', error);
        // Fallback to mock data
        setOffers([
          { id: '1', username: 'maria_sp', amount: 1000, price: 0.05, type: 'sell' },
          { id: '2', username: 'joao_rj', amount: 500, price: 0.048, type: 'buy' },
          { id: '3', username: 'ana_mg', amount: 2000, price: 0.0475, type: 'sell' },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchOffers();
  }, []);

  return (
    <section className="py-20 md:py-28 bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Title */}
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                💰 {t('bzr_section.title', { defaultValue: 'BZR - A Moeda do Povo' })}
              </span>
            </h2>
          </div>

          {/* 3 Benefits */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <Card className="border-2 border-primary/20 hover:border-primary/30 hover:shadow-lg transition-all">
              <CardContent className="pt-6 text-center">
                <div className="inline-flex p-4 rounded-full bg-gradient-to-br from-primary to-secondary mb-4">
                  <HandshakeIcon className="h-8 w-8 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-bold mb-2">
                  {t('bzr_section.p2p_title', { defaultValue: '🤝 P2P' })}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {t('bzr_section.p2p_desc', {
                    defaultValue: 'Compre e venda BZR diretamente com outras pessoas'
                  })}
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-primary/20 hover:border-primary/30 hover:shadow-lg transition-all">
              <CardContent className="pt-6 text-center">
                <div className="inline-flex p-4 rounded-full bg-gradient-to-br from-primary to-secondary mb-4">
                  <Vault className="h-8 w-8 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-bold mb-2">
                  {t('bzr_section.sovereignty_title', { defaultValue: '🏦 Sua Moeda é SUA' })}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {t('bzr_section.sovereignty_desc', {
                    defaultValue: 'Sem bancos, sem bloqueios, sem intermediários'
                  })}
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-primary/20 hover:border-primary/30 hover:shadow-lg transition-all">
              <CardContent className="pt-6 text-center">
                <div className="inline-flex p-4 rounded-full bg-gradient-to-br from-primary to-secondary mb-4">
                  <Zap className="h-8 w-8 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-bold mb-2">
                  {t('bzr_section.fast_title', { defaultValue: '⚡ Rápida e Barata' })}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {t('bzr_section.fast_desc', {
                    defaultValue: 'Pagamentos instantâneos e baixo custo'
                  })}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Live P2P Offers */}
          <Card className="border-2 border-primary/30 bg-card/50 backdrop-blur">
            <CardContent className="pt-8 pb-8">
              <div className="text-center mb-6">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-primary-foreground font-bold shadow-lg"
                  onClick={() => navigate('/app/p2p')}
                >
                  💱 {t('bzr_section.cta', { defaultValue: 'Comprar/Vender BZR Agora' })}
                </Button>
              </div>

              <div className="text-center mb-4">
                <p className="text-sm text-muted-foreground font-medium">
                  {t('bzr_section.live_offers', { defaultValue: 'Veja ofertas disponíveis:' })}
                </p>
              </div>

              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Carregando ofertas...
                </div>
              ) : (
                <div className="space-y-3 mb-6">
                  {offers.map((offer) => (
                    <div
                      key={offer.id}
                      className="flex items-center justify-between p-4 bg-background rounded-lg border hover:border-primary/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-primary-foreground font-bold">
                          {offer.username[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium">
                            @{offer.username}{' '}
                            <span className="text-muted-foreground">
                              {offer.type === 'sell' ? 'vende' : 'compra'}
                            </span>
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {offer.amount.toLocaleString('pt-BR')} BZR {offer.type === 'sell' ? 'por' : 'a'} R${' '}
                            {offer.price.toFixed(3)}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-primary/50 hover:bg-primary/10"
                        onClick={() => navigate(`/app/p2p/offer/${offer.id}`)}
                      >
                        {offer.type === 'sell' ? 'Comprar' : 'Vender'}
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="text-center">
                <Button
                  variant="link"
                  className="text-primary group"
                  onClick={() => navigate('/app/p2p')}
                >
                  {t('bzr_section.cta_all_offers', { defaultValue: '👉 Ver todas as ofertas P2P' })}
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
