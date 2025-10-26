import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Newspaper, MessageSquare, Users, Truck } from 'lucide-react';

export function EcosystemSection() {
  const { t } = useTranslation();

  const modules = [
    {
      icon: Newspaper,
      emoji: '📱',
      title: t('ecosystem.feed_title', { defaultValue: 'Feed Social' }),
      description: t('ecosystem.feed_desc', { defaultValue: 'Poste, conecte, venda' }),
      color: 'from-primary to-secondary'
    },
    {
      icon: MessageSquare,
      emoji: '💬',
      title: t('ecosystem.chat_title', { defaultValue: 'BazChat' }),
      description: t('ecosystem.chat_desc', { defaultValue: 'Chat Web3 criptografado com clientes' }),
      color: 'from-secondary to-accent'
    },
    {
      icon: Users,
      emoji: '🤝',
      title: t('ecosystem.affiliates_title', { defaultValue: 'Afiliados' }),
      description: t('ecosystem.affiliates_desc', { defaultValue: 'Crie seu marketplace de afiliados' }),
      color: 'from-accent to-primary'
    },
    {
      icon: Truck,
      emoji: '🚚',
      title: t('ecosystem.delivery_title', { defaultValue: 'Entregadores' }),
      description: t('ecosystem.delivery_desc', { defaultValue: 'Associe entregadores a lojas' }),
      color: 'from-primary to-accent'
    }
  ];

  return (
    <section className="py-20 md:py-28 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Title */}
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              {t('ecosystem.title', { defaultValue: '🌐 Muito Além de um Marketplace' })}
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              {t('ecosystem.subtitle', {
                defaultValue: 'Bazari é um Super App com tudo que você precisa para vender, conectar e crescer.'
              })}
            </p>
          </div>

          {/* Modules Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {modules.map((module, index) => {
              const Icon = module.icon;
              return (
                <Card
                  key={index}
                  className="group hover:shadow-xl transition-all duration-300 border-2 hover:border-primary/50"
                >
                  <CardContent className="pt-6 text-center">
                    <div className={`inline-flex p-4 rounded-full bg-gradient-to-br ${module.color} mb-4 group-hover:scale-110 transition-transform`}>
                      <Icon className="h-8 w-8 text-primary-foreground" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">
                      {module.emoji} {module.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {module.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Special Features */}
          <div className="space-y-6">
            {/* Affiliates Feature */}
            <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5">
              <CardContent className="pt-6 pb-6">
                <div className="flex flex-col md:flex-row items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-3xl">
                      💼
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-2">
                      {t('ecosystem.affiliates_feature_title', {
                        defaultValue: 'Afiliados com Marketplace Próprio'
                      })}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {t('ecosystem.affiliates_feature', {
                        defaultValue:
                          'Crie sua rede de afiliados e dê a eles um marketplace personalizado para vender seus produtos. Comissões automáticas em BZR.'
                      })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Delivery Feature */}
            <Card className="border-2 border-secondary/20 bg-gradient-to-r from-secondary/5 to-accent/5">
              <CardContent className="pt-6 pb-6">
                <div className="flex flex-col md:flex-row items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="h-16 w-16 rounded-full bg-gradient-to-br from-secondary to-accent flex items-center justify-center text-3xl">
                      🚚
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-2">
                      {t('ecosystem.delivery_feature_title', {
                        defaultValue: 'Entregadores Associados a Lojistas'
                      })}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {t('ecosystem.delivery_feature', {
                        defaultValue:
                          'Lojistas contratam entregadores direto na plataforma. Pagamentos em BZR, sem burocracia.'
                      })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
