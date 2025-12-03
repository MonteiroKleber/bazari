import { useMemo } from 'react';
import { appRegistry } from '../registry/app-registry';
import { useUserAppsStore } from '../store/user-apps.store';
import type { BazariApp } from '../types';

interface UseInstalledAppsReturn {
  /** Apps instalados ordenados */
  apps: BazariApp[];

  /** Apps fixados */
  pinnedApps: BazariApp[];

  /** Apps não fixados */
  unpinnedApps: BazariApp[];

  /** IDs dos apps instalados */
  installedIds: string[];

  /** Total de apps instalados */
  count: number;

  /** Se está carregando */
  isLoading: boolean;
}

export function useInstalledApps(): UseInstalledAppsReturn {
  const { getOrderedApps, pinnedApps: pinnedIds, installedApps } = useUserAppsStore();

  return useMemo(() => {
    const orderedIds = getOrderedApps();

    const apps = orderedIds
      .map((id) => appRegistry.get(id))
      .filter((app): app is BazariApp => app !== undefined);

    const pinnedApps = apps.filter((app) => pinnedIds.includes(app.id));
    const unpinnedApps = apps.filter((app) => !pinnedIds.includes(app.id));

    return {
      apps,
      pinnedApps,
      unpinnedApps,
      installedIds: installedApps,
      count: apps.length,
      isLoading: !appRegistry.isInitialized(),
    };
  }, [getOrderedApps, pinnedIds, installedApps]);
}
