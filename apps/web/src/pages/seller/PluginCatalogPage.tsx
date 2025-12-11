/**
 * Plugin Catalog Page
 *
 * Catalogo de plugins disponiveis para instalacao
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Star, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PluginConfigModal } from '@/components/plugins/seller/PluginConfigModal';
import {
  fetchAvailablePlugins,
  fetchSellerPlugins,
  type PluginDefinition,
} from '@/api/plugins';

const categories = [
  { value: 'all', label: 'Todos' },
  { value: 'ENGAGEMENT', label: 'Engajamento' },
  { value: 'MARKETING', label: 'Marketing' },
  { value: 'OPERATIONS', label: 'Operacoes' },
  { value: 'PAYMENTS', label: 'Pagamentos' },
  { value: 'ANALYTICS', label: 'Analytics' },
];

export default function PluginCatalogPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [installPlugin, setInstallPlugin] = useState<string | null>(null);

  // Buscar plugins disponiveis
  const { data: catalogData } = useQuery({
    queryKey: ['plugin-catalog', category],
    queryFn: () =>
      fetchAvailablePlugins(category === 'all' ? undefined : category),
  });

  // Buscar plugins ja instalados
  const { data: installedData } = useQuery({
    queryKey: ['seller-plugins'],
    queryFn: fetchSellerPlugins,
  });

  const availablePlugins = catalogData?.plugins || [];
  const installedSlugs = new Set(
    (installedData?.plugins || []).map((p) => p.plugin.slug)
  );

  // Filtrar por busca
  const filteredPlugins = availablePlugins.filter(
    (plugin) =>
      plugin.name.toLowerCase().includes(search.toLowerCase()) ||
      plugin.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Catalogo de Plugins</h1>
          <p className="text-muted-foreground">
            Descubra recursos para potencializar sua loja
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar plugins..."
            className="pl-9"
          />
        </div>
        <Tabs value={category} onValueChange={setCategory}>
          <TabsList className="flex-wrap h-auto">
            {categories.map((cat) => (
              <TabsTrigger key={cat.value} value={cat.value}>
                {cat.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Grid de plugins */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPlugins.map((plugin) => {
          const isInstalled = installedSlugs.has(plugin.slug);

          return (
            <PluginCatalogCard
              key={plugin.id}
              plugin={plugin}
              isInstalled={isInstalled}
              onInstall={() => setInstallPlugin(plugin.slug)}
            />
          );
        })}
      </div>

      {filteredPlugins.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>Nenhum plugin encontrado</p>
          {search && (
            <Button
              variant="link"
              onClick={() => setSearch('')}
              className="mt-2"
            >
              Limpar busca
            </Button>
          )}
        </div>
      )}

      {/* Modal de instalacao/configuracao */}
      {installPlugin && (
        <PluginConfigModal
          pluginSlug={installPlugin}
          isNew={true}
          onClose={() => setInstallPlugin(null)}
          onSave={() => {
            setInstallPlugin(null);
            navigate('/app/seller/plugins');
          }}
        />
      )}
    </div>
  );
}

function PluginCatalogCard({
  plugin,
  isInstalled,
  onInstall,
}: {
  plugin: PluginDefinition;
  isInstalled: boolean;
  onInstall: () => void;
}) {
  return (
    <Card
      className={`relative overflow-hidden ${
        isInstalled ? 'ring-2 ring-primary' : ''
      }`}
    >
      {plugin.isOfficial && (
        <div className="absolute top-2 right-2">
          <Badge variant="secondary" className="gap-1">
            <Star className="h-3 w-3 fill-current" />
            Oficial
          </Badge>
        </div>
      )}

      <CardContent className="p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="p-3 bg-primary/10 rounded-xl">
            <img
              src={plugin.iconUrl || '/plugins/default-icon.svg'}
              alt=""
              className="h-8 w-8"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/plugins/default-icon.svg';
              }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{plugin.name}</h3>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {plugin.description}
            </p>
          </div>
        </div>

        {/* Categoria e Preco */}
        <div className="flex items-center justify-between">
          <Badge variant="outline">{getCategoryLabel(plugin.category)}</Badge>
          <PricingBadge
            pricing={plugin.pricingType}
            price={plugin.priceMonthly}
          />
        </div>

        {/* Acao */}
        {isInstalled ? (
          <Button variant="secondary" className="w-full" disabled>
            <Check className="h-4 w-4 mr-2" />
            Instalado
          </Button>
        ) : (
          <Button className="w-full" onClick={onInstall}>
            Instalar
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function PricingBadge({
  pricing,
  price,
}: {
  pricing: string;
  price?: number;
}) {
  switch (pricing) {
    case 'FREE':
      return (
        <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
          Gratis
        </Badge>
      );
    case 'FREEMIUM':
      return <Badge variant="secondary">A partir de gratis</Badge>;
    case 'PAID':
      return <Badge>{price} BZR/mes</Badge>;
    default:
      return null;
  }
}

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    ENGAGEMENT: 'Engajamento',
    MARKETING: 'Marketing',
    OPERATIONS: 'Operacoes',
    PAYMENTS: 'Pagamentos',
    ANALYTICS: 'Analytics',
    COMMUNICATION: 'Comunicacao',
  };
  return labels[category] || category;
}
