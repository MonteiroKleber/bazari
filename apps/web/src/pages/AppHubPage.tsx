import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppLauncher, AppSearch } from '@/components/platform';
import { useInstalledApps } from '@/platform/hooks';
import { useUserAppsStore } from '@/platform/store';

export default function AppHubPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const { apps, pinnedApps, unpinnedApps, count } = useInstalledApps();
  const { recordAppUsage } = useUserAppsStore();

  // Filtrar por busca
  const filteredApps = searchQuery
    ? apps.filter(
        (app) =>
          app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          app.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : null;

  const handleAppClick = (appId: string) => {
    recordAppUsage(appId);
  };

  return (
    <div className="container max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Meus Apps</h1>
          <p className="text-muted-foreground text-sm">
            {count} apps instalados
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" asChild>
            <Link to="/app/settings/apps">
              <Settings className="w-4 h-4" />
            </Link>
          </Button>
          <Button asChild>
            <Link to="/app/store">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar
            </Link>
          </Button>
        </div>
      </div>

      {/* Search */}
      <AppSearch
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Buscar nos seus apps..."
        className="mb-6"
      />

      {/* Search Results */}
      {filteredApps ? (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">
            Resultados ({filteredApps.length})
          </h2>
          <AppLauncher
            apps={filteredApps}
            columns={3}
            emptyMessage="Nenhum app encontrado"
            onAppClick={(app) => handleAppClick(app.id)}
          />
        </div>
      ) : (
        <>
          {/* Pinned Apps */}
          {pinnedApps.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-4">📌 Fixados</h2>
              <AppLauncher
                apps={pinnedApps}
                columns={3}
                onAppClick={(app) => handleAppClick(app.id)}
              />
            </div>
          )}

          {/* All Apps */}
          <div>
            <h2 className="text-lg font-semibold mb-4">
              {pinnedApps.length > 0 ? 'Todos os Apps' : 'Apps'}
            </h2>
            <AppLauncher
              apps={unpinnedApps.length > 0 ? unpinnedApps : apps}
              columns={3}
              emptyMessage="Nenhum app instalado. Adicione apps na loja!"
              onAppClick={(app) => handleAppClick(app.id)}
            />
          </div>
        </>
      )}

      {/* Empty State */}
      {count === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📱</div>
          <h3 className="text-xl font-semibold mb-2">Nenhum app instalado</h3>
          <p className="text-muted-foreground mb-4">
            Explore a App Store e instale os apps que você precisa.
          </p>
          <Button asChild>
            <Link to="/app/store">Explorar App Store</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
