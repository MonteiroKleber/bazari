import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Grid, List, Star } from 'lucide-react';
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface App {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  rating: number;
  downloads: number;
  price: number | null;
  developer: string;
}

const categoryInfo: Record<string, { name: string; description: string }> = {
  produtividade: {
    name: 'Produtividade',
    description: 'Apps para aumentar sua produtividade e organização',
  },
  financas: {
    name: 'Finanças',
    description: 'Controle financeiro, investimentos e pagamentos',
  },
  social: {
    name: 'Social',
    description: 'Redes sociais, comunicação e networking',
  },
  jogos: {
    name: 'Jogos',
    description: 'Jogos casuais, competitivos e play-to-earn',
  },
  utilidades: {
    name: 'Utilidades',
    description: 'Ferramentas úteis para o dia a dia',
  },
  compras: {
    name: 'Compras',
    description: 'E-commerce, marketplaces e ofertas',
  },
};

// Mock apps data
const mockApps: App[] = [
  {
    id: 'app-1',
    name: 'Task Manager Pro',
    description: 'Gerencie suas tarefas de forma eficiente',
    iconUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=task',
    rating: 4.8,
    downloads: 12500,
    price: null,
    developer: 'DevTeam Inc.',
  },
  {
    id: 'app-2',
    name: 'Budget Tracker',
    description: 'Controle seus gastos e economias',
    iconUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=budget',
    rating: 4.6,
    downloads: 8900,
    price: 5,
    developer: 'FinApps Studio',
  },
  {
    id: 'app-3',
    name: 'Note Keeper',
    description: 'Suas notas sempre organizadas',
    iconUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=notes',
    rating: 4.5,
    downloads: 15600,
    price: null,
    developer: 'SimpleApps',
  },
  {
    id: 'app-4',
    name: 'Calendar Plus',
    description: 'Calendário avançado com lembretes',
    iconUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=calendar',
    rating: 4.7,
    downloads: 22300,
    price: 2.5,
    developer: 'TimeWise Ltd.',
  },
];

export default function CategoryPage() {
  const { category } = useParams<{ category: string }>();
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('popular');

  const info = categoryInfo[category || ''] || {
    name: category || 'Categoria',
    description: 'Apps desta categoria',
  };

  const sortedApps = [...mockApps].sort((a, b) => {
    switch (sortBy) {
      case 'rating':
        return b.rating - a.rating;
      case 'downloads':
        return b.downloads - a.downloads;
      case 'newest':
        return 0; // Would sort by date
      default:
        return b.downloads - a.downloads;
    }
  });

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
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{info.name}</h1>
        <p className="text-muted-foreground">{info.description}</p>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-muted-foreground">
          {sortedApps.length} {t('store.apps', 'apps')}
        </p>

        <div className="flex items-center gap-4">
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="popular">{t('store.sort.popular', 'Mais populares')}</SelectItem>
              <SelectItem value="rating">{t('store.sort.rating', 'Melhor avaliados')}</SelectItem>
              <SelectItem value="downloads">{t('store.sort.downloads', 'Mais downloads')}</SelectItem>
              <SelectItem value="newest">{t('store.sort.newest', 'Mais recentes')}</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex border rounded-lg">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-r-none"
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-l-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Apps Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sortedApps.map((app) => (
            <Link key={app.id} to={`/app/store/${app.id}`}>
              <Card className="h-full hover:border-primary/50 transition-colors">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <img
                      src={app.iconUrl}
                      alt={app.name}
                      className="w-16 h-16 rounded-xl"
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
                        <span className="text-xs text-muted-foreground">
                          {app.downloads.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                    {app.description}
                  </p>
                  <div className="mt-3">
                    {app.price === null ? (
                      <Badge variant="secondary">{t('store.free', 'Grátis')}</Badge>
                    ) : (
                      <Badge>{app.price} BZR</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {sortedApps.map((app) => (
            <Link key={app.id} to={`/app/store/${app.id}`}>
              <Card className="hover:border-primary/50 transition-colors">
                <CardContent className="py-4">
                  <div className="flex items-center gap-4">
                    <img
                      src={app.iconUrl}
                      alt={app.name}
                      className="w-12 h-12 rounded-xl"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{app.name}</h3>
                        {app.price === null ? (
                          <Badge variant="secondary" className="text-xs">
                            {t('store.free', 'Grátis')}
                          </Badge>
                        ) : (
                          <Badge className="text-xs">{app.price} BZR</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{app.developer}</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium">{app.rating}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {app.downloads.toLocaleString()} downloads
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
