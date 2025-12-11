import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Star, ArrowLeft, Sparkles, TrendingUp, Award } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface App {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  rating: number;
  downloads: number;
  price: number | null;
  developer: string;
  featured?: boolean;
}

// Mock featured apps
const editorsPicks: App[] = [
  {
    id: 'app-1',
    name: 'Bazari Wallet',
    description: 'A carteira oficial do ecossistema Bazari com suporte a BZR e tokens',
    iconUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=wallet',
    rating: 4.9,
    downloads: 150000,
    price: null,
    developer: 'Bazari Team',
    featured: true,
  },
  {
    id: 'app-2',
    name: 'DeliveryNow',
    description: 'Entrega rápida com rastreamento em tempo real',
    iconUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=delivery',
    rating: 4.7,
    downloads: 45000,
    price: null,
    developer: 'FastLogistics Inc.',
  },
];

const trending: App[] = [
  {
    id: 'app-3',
    name: 'NFT Gallery',
    description: 'Visualize e gerencie sua coleção de NFTs',
    iconUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=nft',
    rating: 4.5,
    downloads: 23000,
    price: null,
    developer: 'NFT Studios',
  },
  {
    id: 'app-4',
    name: 'Crypto News',
    description: 'Notícias e atualizações do mundo cripto',
    iconUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=news',
    rating: 4.3,
    downloads: 18000,
    price: null,
    developer: 'CryptoMedia',
  },
  {
    id: 'app-5',
    name: 'DeFi Dashboard',
    description: 'Monitore seus investimentos DeFi em um só lugar',
    iconUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=defi',
    rating: 4.6,
    downloads: 12000,
    price: 3,
    developer: 'DeFi Labs',
  },
];

const newAndNoteworthy: App[] = [
  {
    id: 'app-6',
    name: 'AI Assistant',
    description: 'Assistente pessoal com IA para produtividade',
    iconUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=ai',
    rating: 4.8,
    downloads: 5600,
    price: 5,
    developer: 'AI Corp',
  },
  {
    id: 'app-7',
    name: 'Fitness Tracker',
    description: 'Acompanhe suas atividades e conquistas fitness',
    iconUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=fitness',
    rating: 4.4,
    downloads: 3200,
    price: null,
    developer: 'HealthApps',
  },
  {
    id: 'app-8',
    name: 'Language Learn',
    description: 'Aprenda novos idiomas com gamificação',
    iconUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=language',
    rating: 4.7,
    downloads: 8900,
    price: 2,
    developer: 'EduTech',
  },
];

export default function FeaturedAppsPage() {
  const { t } = useTranslation();

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Back Button */}
      <Button asChild variant="ghost" className="mb-4">
        <Link to="/app/store">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('store.backToStore', 'Voltar para a Loja')}
        </Link>
      </Button>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Sparkles className="h-8 w-8 text-primary" />
          {t('store.featured.title', 'Apps em Destaque')}
        </h1>
        <p className="text-muted-foreground mt-2">
          {t('store.featured.description', 'Os melhores apps selecionados pela equipe Bazari')}
        </p>
      </div>

      {/* Editor's Picks */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <Award className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">
            {t('store.featured.editorsPicks', 'Escolhas do Editor')}
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {editorsPicks.map((app) => (
            <Link key={app.id} to={`/app/store/${app.id}`}>
              <Card className="h-full hover:border-primary/50 transition-colors overflow-hidden">
                {app.featured && (
                  <div className="bg-gradient-to-r from-primary to-primary/70 text-primary-foreground text-xs px-3 py-1">
                    App Oficial
                  </div>
                )}
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <img
                      src={app.iconUrl}
                      alt={app.name}
                      className="w-20 h-20 rounded-2xl"
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{app.name}</h3>
                      <p className="text-sm text-muted-foreground">{app.developer}</p>
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                        {app.description}
                      </p>
                      <div className="flex items-center gap-3 mt-3">
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-medium">{app.rating}</span>
                        </div>
                        <span className="text-muted-foreground text-sm">
                          {app.downloads.toLocaleString()} downloads
                        </span>
                        {app.price === null ? (
                          <Badge variant="secondary">{t('store.free', 'Grátis')}</Badge>
                        ) : (
                          <Badge>{app.price} BZR</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Trending */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-green-500" />
          <h2 className="text-xl font-semibold">
            {t('store.featured.trending', 'Em Alta')}
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {trending.map((app, index) => (
            <Link key={app.id} to={`/app/store/${app.id}`}>
              <Card className="h-full hover:border-primary/50 transition-colors">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-bold text-muted-foreground/50">
                      #{index + 1}
                    </span>
                    <img
                      src={app.iconUrl}
                      alt={app.name}
                      className="w-14 h-14 rounded-xl"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{app.name}</h3>
                      <p className="text-sm text-muted-foreground truncate">
                        {app.developer}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-xs">{app.rating}</span>
                        </div>
                        {app.price === null ? (
                          <Badge variant="secondary" className="text-xs">
                            {t('store.free', 'Grátis')}
                          </Badge>
                        ) : (
                          <Badge className="text-xs">{app.price} BZR</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* New & Noteworthy */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-yellow-500" />
          <h2 className="text-xl font-semibold">
            {t('store.featured.newNoteworthy', 'Novos e Notáveis')}
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {newAndNoteworthy.map((app) => (
            <Link key={app.id} to={`/app/store/${app.id}`}>
              <Card className="h-full hover:border-primary/50 transition-colors">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <img
                      src={app.iconUrl}
                      alt={app.name}
                      className="w-20 h-20 rounded-2xl mx-auto mb-3"
                    />
                    <h3 className="font-medium">{app.name}</h3>
                    <p className="text-sm text-muted-foreground">{app.developer}</p>
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                      {app.description}
                    </p>
                    <div className="flex items-center justify-center gap-3 mt-3">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span>{app.rating}</span>
                      </div>
                      {app.price === null ? (
                        <Badge variant="secondary">{t('store.free', 'Grátis')}</Badge>
                      ) : (
                        <Badge>{app.price} BZR</Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
