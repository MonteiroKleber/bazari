import { useTranslation } from 'react-i18next';
import { 
  Wallet, 
  ShoppingCart, 
  Users, 
  ArrowLeftRight, 
  TrendingUp, 
  MessageSquare, 
  Code2 
} from 'lucide-react';

export function Features() {
  const { t } = useTranslation();

  const modules = [
    { 
      icon: Wallet, 
      title: t('modules.wallet'), 
      description: t('modules.wallet_desc'),
      color: 'text-primary'
    },
    { 
      icon: ShoppingCart, 
      title: t('modules.marketplace'), 
      description: t('modules.marketplace_desc'),
      color: 'text-secondary'
    },
    { 
      icon: Users, 
      title: t('modules.dao'), 
      description: t('modules.dao_desc'),
      color: 'text-accent'
    },
    { 
      icon: ArrowLeftRight, 
      title: t('modules.p2p'), 
      description: t('modules.p2p_desc'),
      color: 'text-primary'
    },
    { 
      icon: TrendingUp, 
      title: t('modules.dex'), 
      description: t('modules.dex_desc'),
      color: 'text-secondary'
    },
    { 
      icon: MessageSquare, 
      title: t('modules.social'), 
      description: t('modules.social_desc'),
      color: 'text-accent'
    },
    { 
      icon: Code2, 
      title: t('modules.studio'), 
      description: t('modules.studio_desc'),
      color: 'text-primary'
    },
  ];

  return (
    <section id="modules" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* About Section */}
        <div id="about" className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t('about.title')}
          </h2>
          <p className="text-lg text-muted-foreground">
            {t('about.text')}
          </p>
        </div>

        {/* Modules */}
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            {t('modules.title')}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {modules.map((module, index) => {
              const Icon = module.icon;
              return (
                <div
                  key={index}
                  className="group relative bg-card rounded-xl p-6 border transition-all hover:scale-[1.02] hover:shadow-lg"
                >
                  <div className={`inline-flex p-3 rounded-lg bg-background mb-4 ${module.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{module.title}</h3>
                  <p className="text-sm text-muted-foreground">{module.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}