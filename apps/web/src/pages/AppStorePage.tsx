import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AppLauncher,
  AppSearch,
  AppCategoryTabs,
  AppInstallModal,
} from '@/components/platform';
import { useApps, useAppInstall } from '@/platform/hooks';
import type { AppCategory, BazariApp } from '@/platform/types';

export default function AppStorePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<AppCategory | 'all'>('all');
  const [selectedApp, setSelectedApp] = useState<BazariApp | null>(null);

  const { apps: allApps, countByCategory } = useApps({
    installed: false, // Apenas não instalados
  });

  const { apps: featuredApps } = useApps({
    featured: true,
    installed: false,
  });

  // Filtrar apps
  const filteredApps = allApps.filter((app) => {
    const matchesCategory =
      selectedCategory === 'all' || app.category === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const {
    showPermissionModal,
    closePermissionModal,
    confirmInstall,
    isProcessing,
  } = useAppInstall(selectedApp?.id || '');

  const handleAppClick = (app: BazariApp) => {
    setSelectedApp(app);
  };

  return (
    <div className="container max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/app">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">App Store</h1>
          <p className="text-muted-foreground text-sm">
            Descubra novos apps para o seu Bazari
          </p>
        </div>
      </div>

      {/* Search */}
      <AppSearch
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Buscar apps..."
        className="mb-4"
      />

      {/* Categories */}
      <AppCategoryTabs
        selected={selectedCategory}
        onChange={setSelectedCategory}
        counts={{
          all: allApps.length,
          ...countByCategory,
        }}
        className="mb-6"
      />

      {/* Featured Section (only when no search/filter) */}
      {!searchQuery && selectedCategory === 'all' && featuredApps.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">⭐ Em Destaque</h2>
          <AppLauncher
            apps={featuredApps}
            variant="store"
            onAppClick={handleAppClick}
          />
        </div>
      )}

      {/* All Apps */}
      <div>
        <h2 className="text-lg font-semibold mb-4">
          {searchQuery
            ? `Resultados (${filteredApps.length})`
            : selectedCategory === 'all'
            ? 'Todos os Apps'
            : `${selectedCategory} (${filteredApps.length})`}
        </h2>
        <AppLauncher
          apps={filteredApps}
          variant="store"
          emptyMessage="Nenhum app encontrado nesta categoria"
          onAppClick={handleAppClick}
        />
      </div>

      {/* Install Modal */}
      {selectedApp && (
        <AppInstallModal
          app={selectedApp}
          open={showPermissionModal || !!selectedApp}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedApp(null);
              closePermissionModal();
            }
          }}
          onConfirm={(permissions) => {
            confirmInstall(permissions);
            setSelectedApp(null);
          }}
          isProcessing={isProcessing}
        />
      )}
    </div>
  );
}
