import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, Star, SlidersHorizontal, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

interface App {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  rating: number;
  downloads: number;
  price: number | null;
  developer: string;
  category: string;
}

// Mock apps data
const allApps: App[] = [
  {
    id: 'app-1',
    name: 'Task Manager Pro',
    description: 'Gerencie suas tarefas de forma eficiente com IA',
    iconUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=task',
    rating: 4.8,
    downloads: 12500,
    price: null,
    developer: 'DevTeam Inc.',
    category: 'produtividade',
  },
  {
    id: 'app-2',
    name: 'Budget Tracker',
    description: 'Controle seus gastos e economias com gráficos',
    iconUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=budget',
    rating: 4.6,
    downloads: 8900,
    price: 5,
    developer: 'FinApps Studio',
    category: 'financas',
  },
  {
    id: 'app-3',
    name: 'Crypto Portfolio',
    description: 'Acompanhe seus investimentos em criptomoedas',
    iconUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=crypto',
    rating: 4.4,
    downloads: 6700,
    price: null,
    developer: 'CryptoApps',
    category: 'financas',
  },
  {
    id: 'app-4',
    name: 'Social Connect',
    description: 'Conecte-se com pessoas ao redor do mundo',
    iconUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=social',
    rating: 4.3,
    downloads: 45000,
    price: null,
    developer: 'SocialNet Inc.',
    category: 'social',
  },
  {
    id: 'app-5',
    name: 'Puzzle Master',
    description: 'Jogos de puzzle para exercitar seu cérebro',
    iconUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=puzzle',
    rating: 4.7,
    downloads: 23000,
    price: 2,
    developer: 'GameStudio',
    category: 'jogos',
  },
];

const categories = [
  { id: 'produtividade', name: 'Produtividade' },
  { id: 'financas', name: 'Finanças' },
  { id: 'social', name: 'Social' },
  { id: 'jogos', name: 'Jogos' },
  { id: 'utilidades', name: 'Utilidades' },
  { id: 'compras', name: 'Compras' },
];

export default function SearchAppsPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [freeOnly, setFreeOnly] = useState(false);
  const [minRating, setMinRating] = useState<number | null>(null);

  const filteredApps = allApps.filter((app) => {
    // Search query
    if (query) {
      const searchLower = query.toLowerCase();
      const matchesSearch =
        app.name.toLowerCase().includes(searchLower) ||
        app.description.toLowerCase().includes(searchLower) ||
        app.developer.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }

    // Category filter
    if (selectedCategories.length > 0 && !selectedCategories.includes(app.category)) {
      return false;
    }

    // Free only filter
    if (freeOnly && app.price !== null) {
      return false;
    }

    // Min rating filter
    if (minRating && app.rating < minRating) {
      return false;
    }

    return true;
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams(query ? { q: query } : {});
  };

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((c) => c !== categoryId)
        : [...prev, categoryId]
    );
  };

  const clearFilters = () => {
    setSelectedCategories([]);
    setFreeOnly(false);
    setMinRating(null);
  };

  const hasFilters = selectedCategories.length > 0 || freeOnly || minRating !== null;

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Search Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-4">{t('store.search.title', 'Buscar Apps')}</h1>

        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('store.search.placeholder', 'Buscar apps, desenvolvedores...')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button type="submit">{t('common.search', 'Buscar')}</Button>

          {/* Filters Sheet (Mobile) */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="md:hidden">
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>{t('store.search.filters', 'Filtros')}</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-6">
                <FilterContent
                  categories={categories}
                  selectedCategories={selectedCategories}
                  toggleCategory={toggleCategory}
                  freeOnly={freeOnly}
                  setFreeOnly={setFreeOnly}
                  minRating={minRating}
                  setMinRating={setMinRating}
                />
              </div>
            </SheetContent>
          </Sheet>
        </form>
      </div>

      <div className="flex gap-6">
        {/* Sidebar Filters (Desktop) */}
        <aside className="w-64 hidden md:block shrink-0">
          <div className="sticky top-20">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-medium">{t('store.search.filters', 'Filtros')}</h2>
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  {t('common.clear', 'Limpar')}
                </Button>
              )}
            </div>
            <FilterContent
              categories={categories}
              selectedCategories={selectedCategories}
              toggleCategory={toggleCategory}
              freeOnly={freeOnly}
              setFreeOnly={setFreeOnly}
              minRating={minRating}
              setMinRating={setMinRating}
            />
          </div>
        </aside>

        {/* Results */}
        <div className="flex-1">
          {/* Active Filters */}
          {hasFilters && (
            <div className="flex flex-wrap gap-2 mb-4">
              {selectedCategories.map((cat) => {
                const category = categories.find((c) => c.id === cat);
                return (
                  <Badge
                    key={cat}
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() => toggleCategory(cat)}
                  >
                    {category?.name}
                    <X className="h-3 w-3 ml-1" />
                  </Badge>
                );
              })}
              {freeOnly && (
                <Badge
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() => setFreeOnly(false)}
                >
                  {t('store.freeOnly', 'Somente grátis')}
                  <X className="h-3 w-3 ml-1" />
                </Badge>
              )}
              {minRating && (
                <Badge
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() => setMinRating(null)}
                >
                  {minRating}+ estrelas
                  <X className="h-3 w-3 ml-1" />
                </Badge>
              )}
            </div>
          )}

          <p className="text-sm text-muted-foreground mb-4">
            {filteredApps.length} {t('store.results', 'resultados')}
            {query && ` para "${query}"`}
          </p>

          {/* Results Grid */}
          <div className="grid gap-4 md:grid-cols-2">
            {filteredApps.map((app) => (
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
                    <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                      {app.description}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {filteredApps.length === 0 && (
            <div className="text-center py-12">
              <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {t('store.search.noResults', 'Nenhum app encontrado')}
              </h3>
              <p className="text-muted-foreground">
                {t('store.search.tryDifferent', 'Tente uma busca diferente ou ajuste os filtros')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Filter Content Component
function FilterContent({
  categories,
  selectedCategories,
  toggleCategory,
  freeOnly,
  setFreeOnly,
  minRating,
  setMinRating,
}: {
  categories: { id: string; name: string }[];
  selectedCategories: string[];
  toggleCategory: (id: string) => void;
  freeOnly: boolean;
  setFreeOnly: (v: boolean) => void;
  minRating: number | null;
  setMinRating: (v: number | null) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      {/* Categories */}
      <div>
        <h3 className="font-medium mb-3">{t('store.search.categories', 'Categorias')}</h3>
        <div className="space-y-2">
          {categories.map((category) => (
            <label
              key={category.id}
              className="flex items-center gap-2 cursor-pointer"
            >
              <Checkbox
                checked={selectedCategories.includes(category.id)}
                onCheckedChange={() => toggleCategory(category.id)}
              />
              <span className="text-sm">{category.name}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Price */}
      <div>
        <h3 className="font-medium mb-3">{t('store.search.price', 'Preço')}</h3>
        <label className="flex items-center gap-2 cursor-pointer">
          <Checkbox checked={freeOnly} onCheckedChange={(c) => setFreeOnly(!!c)} />
          <span className="text-sm">{t('store.freeOnly', 'Somente grátis')}</span>
        </label>
      </div>

      {/* Rating */}
      <div>
        <h3 className="font-medium mb-3">{t('store.search.rating', 'Avaliação')}</h3>
        <div className="space-y-2">
          {[4, 3, 2].map((rating) => (
            <label key={rating} className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={minRating === rating}
                onCheckedChange={(c) => setMinRating(c ? rating : null)}
              />
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                <span className="text-sm">{rating}+ estrelas</span>
              </div>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
