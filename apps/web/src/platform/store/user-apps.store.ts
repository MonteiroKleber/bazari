import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  UserAppPreferences,
  UserAppPreferencesActions,
  UserAppPreferencesQueries,
  PermissionId,
} from '../types';
import { DEFAULT_USER_PREFERENCES } from '../types';

type UserAppsStore = UserAppPreferences & UserAppPreferencesActions & UserAppPreferencesQueries;

export const useUserAppsStore = create<UserAppsStore>()(
  persist(
    (set, get) => ({
      // Estado inicial
      ...DEFAULT_USER_PREFERENCES,

      // Ações
      installApp: (appId: string, grantedPermissions: PermissionId[] = []) => {
        set((state) => {
          if (state.installedApps.includes(appId)) {
            return state; // Já instalado
          }
          return {
            installedApps: [...state.installedApps, appId],
            grantedPermissions: {
              ...state.grantedPermissions,
              [appId]: grantedPermissions,
            },
          };
        });
      },

      uninstallApp: (appId: string) => {
        set((state) => {
          const { [appId]: _permissions, ...restPermissions } = state.grantedPermissions;
          const { [appId]: _settings, ...restSettings } = state.appSettings;
          const { [appId]: _lastUsed, ...restLastUsed } = state.lastUsed;
          const { [appId]: _order, ...restOrder } = state.appOrder;

          return {
            installedApps: state.installedApps.filter((id) => id !== appId),
            pinnedApps: state.pinnedApps.filter((id) => id !== appId),
            grantedPermissions: restPermissions,
            appSettings: restSettings,
            lastUsed: restLastUsed,
            appOrder: restOrder,
          };
        });
      },

      pinApp: (appId: string) => {
        set((state) => {
          if (state.pinnedApps.includes(appId)) {
            return state;
          }
          return {
            pinnedApps: [...state.pinnedApps, appId],
          };
        });
      },

      unpinApp: (appId: string) => {
        set((state) => ({
          pinnedApps: state.pinnedApps.filter((id) => id !== appId),
        }));
      },

      reorderApps: (orderedAppIds: string[]) => {
        set(() => {
          const newOrder: Record<string, number> = {};
          orderedAppIds.forEach((appId, index) => {
            newOrder[appId] = index;
          });
          return { appOrder: newOrder };
        });
      },

      grantPermission: (appId: string, permissionId: PermissionId) => {
        set((state) => {
          const currentPermissions = state.grantedPermissions[appId] || [];
          if (currentPermissions.includes(permissionId)) {
            return state;
          }
          return {
            grantedPermissions: {
              ...state.grantedPermissions,
              [appId]: [...currentPermissions, permissionId],
            },
          };
        });
      },

      revokePermission: (appId: string, permissionId: PermissionId) => {
        set((state) => {
          const currentPermissions = state.grantedPermissions[appId] || [];
          return {
            grantedPermissions: {
              ...state.grantedPermissions,
              [appId]: currentPermissions.filter((id) => id !== permissionId),
            },
          };
        });
      },

      setAppSetting: (appId: string, key: string, value: unknown) => {
        set((state) => ({
          appSettings: {
            ...state.appSettings,
            [appId]: {
              ...(state.appSettings[appId] || {}),
              [key]: value,
            },
          },
        }));
      },

      recordAppUsage: (appId: string) => {
        set((state) => ({
          lastUsed: {
            ...state.lastUsed,
            [appId]: new Date().toISOString(),
          },
        }));
      },

      resetPreferences: () => {
        set(DEFAULT_USER_PREFERENCES);
      },

      // Queries
      isInstalled: (appId: string) => {
        return get().installedApps.includes(appId);
      },

      isPinned: (appId: string) => {
        return get().pinnedApps.includes(appId);
      },

      hasPermission: (appId: string, permissionId: PermissionId) => {
        const permissions = get().grantedPermissions[appId] || [];
        return permissions.includes(permissionId);
      },

      getAppPermissions: (appId: string) => {
        return get().grantedPermissions[appId] || [];
      },

      getAppSetting: <T>(appId: string, key: string, defaultValue: T): T => {
        const settings = get().appSettings[appId];
        if (!settings || !(key in settings)) {
          return defaultValue;
        }
        return settings[key] as T;
      },

      getOrderedApps: () => {
        const { installedApps, pinnedApps, appOrder } = get();

        // Ordenar: pinned primeiro, depois por ordem customizada, depois alfabético
        return [...installedApps].sort((a, b) => {
          const aIsPinned = pinnedApps.includes(a);
          const bIsPinned = pinnedApps.includes(b);

          // Pinned primeiro
          if (aIsPinned && !bIsPinned) return -1;
          if (!aIsPinned && bIsPinned) return 1;

          // Depois por ordem customizada
          const aOrder = appOrder[a] ?? Infinity;
          const bOrder = appOrder[b] ?? Infinity;

          return aOrder - bOrder;
        });
      },
    }),
    {
      name: 'bazari-user-apps',
      storage: createJSONStorage(() => localStorage),
      version: 1,
      migrate: (persistedState, _version) => {
        // Futuras migrações de schema aqui
        return persistedState as UserAppsStore;
      },
    }
  )
);
