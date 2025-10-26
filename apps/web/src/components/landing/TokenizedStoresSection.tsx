import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Lock, TrendingUp, Coins, RefreshCw, Store } from 'lucide-react';

export function TokenizedStoresSection() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const benefits = [
    {
      icon: Lock,
      title: t('tokenized_stores.ownership_title', { defaultValue: '🔐 Propriedade On-Chain' }),
      description: t('tokenized_stores.ownership_desc', {
        defaultValue: 'Sua loja é registrada na blockchain. Você é o dono de verdade.'
      }),
      color: 'from-primary to-secondary'
    },
    {
      icon: TrendingUp,
      title: t('tokenized_stores.reputation_title', { defaultValue: '📊 Reputação = Valor' }),
      description: t('tokenized_stores.reputation_desc', {
        defaultValue: 'Cada venda, cada 5 estrelas aumenta o valor da sua loja. É patrimônio real.'
      }),
      color: 'from-secondary to-accent'
    },
    {
      icon: Coins,
      title: t('tokenized_stores.sellable_title', { defaultValue: '💰 Vendável na DEX' }),
      description: t('tokenized_stores.sellable_desc', {
        defaultValue: 'Loja com 500 vendas? Venda na DEX ou negocie direto com investidores.'
      }),
      color: 'from-accent to-primary'
    },
    {
      icon: RefreshCw,
      title: t('tokenized_stores.transferable_title', { defaultValue: '🔄 Transferível' }),
      description: t('tokenized_stores.transferable_desc', {
        defaultValue: 'Transfira para sócios, família ou compradores via transação on-chain.'
      }),
      color: 'from-primary to-accent'
    }
  ];

  return (
    <section className="py-20 md:py-28 bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Title */}
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                {t('tokenized_stores.title', { defaultValue: '🏪 Lojas Tokenizadas: Seu Patrimônio On-Chain' })}
              </span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              {t('tokenized_stores.subtitle', {
                defaultValue: 'Sua loja não é só um cadastro. É um ATIVO que você realmente possui e pode vender.'
              })}
            </p>
          </div>

          {/* Benefits Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <Card
                  key={index}
                  className="border-2 border-primary/20 hover:border-primary/30 hover:shadow-lg transition-all duration-300 group"
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-lg bg-gradient-to-br ${benefit.color} flex-shrink-0`}>
                        <Icon className="h-6 w-6 text-primary-foreground" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold mb-2 group-hover:text-primary transition-colors">
                          {benefit.title}
                        </h3>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                          {benefit.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Example Card */}
          <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-secondary/5 mb-10">
            <CardContent className="pt-8 pb-8">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="flex-shrink-0">
                  <div className="h-24 w-24 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                    <Store className="h-12 w-12 text-primary-foreground" />
                  </div>
                </div>
                <div className="flex-1 text-center md:text-left">
                  <p className="text-sm text-muted-foreground mb-2">
                    {t('tokenized_stores.example_label', { defaultValue: '📈 Exemplo Real:' })}
                  </p>
                  <h3 className="text-2xl font-bold mb-1">
                    {t('tokenized_stores.example', {
                      defaultValue: 'Loja "Padaria do João"'
                    })}
                  </h3>
                  <p className="text-muted-foreground mb-3">
                    1.200 vendas • ⭐⭐⭐⭐⭐ • Reputação 98%
                  </p>
                  <p className="text-3xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    {t('tokenized_stores.example_value', { defaultValue: 'Valor estimado: 50.000 BZR' })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CTA */}
          <div className="text-center">
            <Button
              size="lg"
              className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-primary-foreground shadow-lg shadow-primary/30 min-w-[280px]"
              onClick={() => navigate('/auth/create')}
            >
              🏗️ {t('tokenized_stores.cta', { defaultValue: 'Criar Minha Loja Tokenizada' })}
            </Button>
            <p className="text-sm text-muted-foreground mt-3">
              {t('tokenized_stores.cta_subtitle', { defaultValue: 'Comece gratuitamente. Sem taxas mensais.' })}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
