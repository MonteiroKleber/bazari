import { useMemo } from 'react';
import { appRegistry } from '../registry/app-registry';
import { useUserAppsStore } from '../store/user-apps.store';
import type { BazariApp, AppCategory } from '../types';

interface UseAppsOptions {
  /** Filtrar por categoria */
  category?: AppCategory;

  /** Filtrar por status de instalação */
  installed?: boolean;

  /** Termo de busca */
  search?: string;

  /** Apenas apps nativos */
  native?: boolean;

  /** Apenas apps em destaque */
  featured?: boolean;

  /** Ordenar resultado */
  sortBy?: 'name' | 'category' | 'installCount' | 'rating' | 'lastUsed';

  /** Direção da ordenação */
  sortDirection?: 'asc' | 'desc';
}

interface UseAppsReturn {
  /** Lista de apps filtrados */
  apps: BazariApp[];

  /** Total de apps disponíveis */
  totalCount: number;

  /** Total após filtros */
  filteredCount: number;

  /** Contagem por categoria */
  countByCategory: Record<AppCategory, number>;

  /** Se está carregando */
  isLoading: boolean;
}

export function useApps(options: UseAppsOptions = {}): UseAppsReturn {
  const { installedApps, lastUsed } = useUserAppsStore();

  const result = useMemo(() => {
    const allApps = appRegistry.getAll();
    let filteredApps = [...allApps];

    // Filtrar por categoria
    if (options.category) {
      filteredApps = filteredApps.filter((app) => app.category === options.category);
    }

    // Filtrar por instalação
    if (options.installed !== undefined) {
      filteredApps = filteredApps.filter((app) =>
        options.installed ? installedApps.includes(app.id) : !installedApps.includes(app.id)
      );
    }

    // Filtrar por busca
    if (options.search) {
      const query = options.search.toLowerCase();
      filteredApps = filteredApps.filter(
        (app) =>
          app.name.toLowerCase().includes(query) ||
          app.description.toLowerCase().includes(query) ||
          app.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    // Filtrar por native
    if (options.native !== undefined) {
      filteredApps = filteredApps.filter((app) => app.native === options.native);
    }

    // Filtrar por featured
    if (options.featured) {
      filteredApps = filteredApps.filter((app) => app.featured);
    }

    // Ordenar
    if (options.sortBy) {
      const direction = options.sortDirection === 'desc' ? -1 : 1;

      filteredApps.sort((a, b) => {
        switch (options.sortBy) {
          case 'name':
            return direction * a.name.localeCompare(b.name);
          case 'category':
            return direction * a.category.localeCompare(b.category);
          case 'installCount':
            return direction * ((a.installCount || 0) - (b.installCount || 0));
          case 'rating':
            return direction * ((a.rating || 0) - (b.rating || 0));
          case 'lastUsed': {
            const aDate = lastUsed[a.id] || '1970-01-01';
            const bDate = lastUsed[b.id] || '1970-01-01';
            return direction * aDate.localeCompare(bDate);
          }
          default:
            return 0;
        }
      });
    }

    // Calcular contagem por categoria
    const countByCategory: Record<AppCategory, number> = {
      finance: 0,
      social: 0,
      commerce: 0,
      tools: 0,
      governance: 0,
      entertainment: 0,
    };

    for (const app of allApps) {
      countByCategory[app.category]++;
    }

    return {
      apps: filteredApps,
      totalCount: allApps.length,
      filteredCount: filteredApps.length,
      countByCategory,
      isLoading: !appRegistry.isInitialized(),
    };
  }, [options, installedApps, lastUsed]);

  return result;
}
