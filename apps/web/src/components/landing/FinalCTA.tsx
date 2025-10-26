import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ShoppingBag, Store, ArrowRight } from 'lucide-react';

export function FinalCTA() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <section className="py-20 md:py-28 bg-gradient-to-br from-primary/5 to-secondary/5">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          {/* Title */}
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-5xl font-black mb-4">
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                {t('final_cta.title', { defaultValue: 'Junte-se à Revolução Econômica' })}
              </span>
            </h2>
            <p className="text-lg text-muted-foreground">
              {t('final_cta.social_proof', { defaultValue: 'Mais de 10.000 pessoas já estão usando Bazari' })}
            </p>
          </div>

          {/* Journey Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Buyer Journey */}
            <Card className="border-2 border-primary/30 hover:border-primary/60 hover:shadow-xl transition-all duration-300 group">
              <CardContent className="pt-8 pb-8 text-center">
                <div className="inline-flex p-6 rounded-full bg-gradient-to-br from-primary to-primary/70 mb-6 group-hover:scale-110 transition-transform">
                  <ShoppingBag className="h-12 w-12 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-2">
                  {t('final_cta.buyer_title', { defaultValue: '🎯 Comprador' })}
                </h3>
                <p className="text-muted-foreground mb-6">
                  {t('final_cta.buyer_subtitle', { defaultValue: 'Explorar Marketplace' })}
                </p>
                <Button
                  size="lg"
                  className="w-full group"
                  onClick={() => navigate('/search?sort=relevance')}
                >
                  {t('final_cta.buyer_cta', { defaultValue: 'Começar' })}
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </CardContent>
            </Card>

            {/* Seller Journey */}
            <Card className="border-2 border-secondary/30 hover:border-secondary/60 hover:shadow-xl transition-all duration-300 group">
              <CardContent className="pt-8 pb-8 text-center">
                <div className="inline-flex p-6 rounded-full bg-gradient-to-br from-secondary to-secondary/70 mb-6 group-hover:scale-110 transition-transform">
                  <Store className="h-12 w-12 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-2">
                  {t('final_cta.seller_title', { defaultValue: '🏪 Vendedor' })}
                </h3>
                <p className="text-muted-foreground mb-6">
                  {t('final_cta.seller_subtitle', { defaultValue: 'Criar Loja Tokenizada' })}
                </p>
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full border-2 border-secondary/50 hover:bg-secondary/10 group"
                  onClick={() => navigate('/auth/create')}
                >
                  {t('final_cta.seller_cta', { defaultValue: 'Começar' })}
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Alternative CTA */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-3">
              {t('final_cta.alternative', { defaultValue: 'Ou comece comprando BZR:' })}
            </p>
            <Button
              variant="link"
              className="text-primary hover:text-primary/80 font-semibold group"
              onClick={() => navigate('/app/p2p')}
            >
              {t('final_cta.alternative_cta', { defaultValue: '💰 Ver Ofertas P2P' })}
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>

          {/* Trust Badges */}
          <div className="mt-12 pt-8 border-t border-border">
            <div className="flex flex-wrap justify-center items-center gap-8 text-muted-foreground text-sm">
              <div className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>Código Aberto</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>Sem Taxas Mensais</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>100% Descentralizado</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>Soberania Total</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
