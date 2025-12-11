import { create } from 'zustand';
import type {
  UserAppPreferences,
  UserAppPreferencesActions,
  UserAppPreferencesQueries,
  PermissionId,
} from '../types';
import { DEFAULT_USER_PREFERENCES } from '../types';

type UserAppsStore = UserAppPreferences &
  UserAppPreferencesActions &
  UserAppPreferencesQueries & {
    /** Current user address (null if not logged in) */
    currentUserAddress: string | null;
    /** Switch to a different user's preferences */
    switchUser: (address: string | null) => void;
  };

const STORAGE_KEY_PREFIX = 'bazari-user-apps';
const LEGACY_STORAGE_KEY = 'bazari-user-apps'; // Old key without user suffix

/**
 * Check if legacy data exists and needs migration
 */
function checkAndMigrateLegacyData(userAddress: string): UserAppPreferences | null {
  try {
    const legacyData = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!legacyData) return null;

    const parsed = JSON.parse(legacyData);
    const state = parsed.state || parsed;

    // Check if it looks like valid preferences data
    if (!state.installedApps || !Array.isArray(state.installedApps)) {
      return null;
    }

    console.log('[UserAppsStore] Found legacy preferences data, migrating to user-specific key');

    const prefs: UserAppPreferences = {
      installedApps: state.installedApps || DEFAULT_USER_PREFERENCES.installedApps,
      pinnedApps: state.pinnedApps || DEFAULT_USER_PREFERENCES.pinnedApps,
      appOrder: state.appOrder || DEFAULT_USER_PREFERENCES.appOrder,
      grantedPermissions: state.grantedPermissions || DEFAULT_USER_PREFERENCES.grantedPermissions,
      appSettings: state.appSettings || DEFAULT_USER_PREFERENCES.appSettings,
      lastUsed: state.lastUsed || DEFAULT_USER_PREFERENCES.lastUsed,
      version: state.version || DEFAULT_USER_PREFERENCES.version,
    };

    // Save to user-specific key
    const userKey = getStorageKey(userAddress);
    localStorage.setItem(userKey, JSON.stringify({ state: prefs, version: 1 }));

    // Remove legacy data (rename to backup just in case)
    localStorage.setItem(`${LEGACY_STORAGE_KEY}-backup`, legacyData);
    localStorage.removeItem(LEGACY_STORAGE_KEY);

    console.log('[UserAppsStore] Migration complete for user:', userAddress.slice(0, 8));

    return prefs;
  } catch (e) {
    console.warn('[UserAppsStore] Failed to migrate legacy data:', e);
    return null;
  }
}

/**
 * Get storage key for a specific user
 */
function getStorageKey(address: string | null): string {
  if (!address) {
    return `${STORAGE_KEY_PREFIX}-guest`;
  }
  // Use first 8 and last 6 chars of address for a shorter but unique key
  const shortAddress = `${address.slice(0, 8)}...${address.slice(-6)}`;
  return `${STORAGE_KEY_PREFIX}-${shortAddress}`;
}

/**
 * Load preferences from localStorage for a specific user
 */
function loadUserPreferences(address: string | null): UserAppPreferences {
  const key = getStorageKey(address);
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Extract just the state portion (zustand persist wraps it)
      const state = parsed.state || parsed;
      return {
        installedApps: state.installedApps || DEFAULT_USER_PREFERENCES.installedApps,
        pinnedApps: state.pinnedApps || DEFAULT_USER_PREFERENCES.pinnedApps,
        appOrder: state.appOrder || DEFAULT_USER_PREFERENCES.appOrder,
        grantedPermissions: state.grantedPermissions || DEFAULT_USER_PREFERENCES.grantedPermissions,
        appSettings: state.appSettings || DEFAULT_USER_PREFERENCES.appSettings,
        lastUsed: state.lastUsed || DEFAULT_USER_PREFERENCES.lastUsed,
        version: state.version || DEFAULT_USER_PREFERENCES.version,
      };
    }

    // No user-specific data found, try to migrate legacy data
    if (address) {
      const migratedPrefs = checkAndMigrateLegacyData(address);
      if (migratedPrefs) {
        return migratedPrefs;
      }
    }
  } catch (e) {
    console.warn('[UserAppsStore] Failed to load preferences for', address, e);
  }
  return { ...DEFAULT_USER_PREFERENCES };
}

/**
 * Save preferences to localStorage for a specific user
 */
function saveUserPreferences(address: string | null, preferences: UserAppPreferences): void {
  const key = getStorageKey(address);
  try {
    // Save in zustand persist format for compatibility
    localStorage.setItem(key, JSON.stringify({ state: preferences, version: 1 }));
  } catch (e) {
    console.warn('[UserAppsStore] Failed to save preferences for', address, e);
  }
}

/**
 * Get the current session user address from localStorage (sync read).
 * This is used to initialize the store with the correct user's preferences.
 */
function getInitialUserAddress(): string | null {
  try {
    const sessionData = localStorage.getItem('bazari_session');
    if (!sessionData) return null;

    const parsed = JSON.parse(sessionData);
    // Check if session is expired
    if (parsed.expiresAt && parsed.expiresAt < Date.now()) {
      return null;
    }
    return parsed.user?.address ?? null;
  } catch {
    return null;
  }
}

// Get initial user and their preferences at store creation time
const initialUserAddress = getInitialUserAddress();
const initialPreferences = loadUserPreferences(initialUserAddress);

console.log('[UserAppsStore] Initializing with user:', initialUserAddress?.slice(0, 8) || 'guest');

export const useUserAppsStore = create<UserAppsStore>()((set, get) => ({
  // Initial state - load from current session user
  ...initialPreferences,
  currentUserAddress: initialUserAddress,

  // Switch user - loads preferences for the new user
  switchUser: (address: string | null) => {
    const currentAddress = get().currentUserAddress;

    // Save current preferences before switching (if we have a user)
    if (currentAddress !== null) {
      const { currentUserAddress: _, switchUser: __, ...currentPrefs } = get();
      // Remove action methods from preferences
      const prefsToSave: UserAppPreferences = {
        installedApps: currentPrefs.installedApps,
        pinnedApps: currentPrefs.pinnedApps,
        appOrder: currentPrefs.appOrder,
        grantedPermissions: currentPrefs.grantedPermissions,
        appSettings: currentPrefs.appSettings,
        lastUsed: currentPrefs.lastUsed,
        version: currentPrefs.version,
      };
      saveUserPreferences(currentAddress, prefsToSave);
    }

    // Load preferences for the new user
    const newPreferences = loadUserPreferences(address);
    console.log('[UserAppsStore] Switching user:', address ? `${address.slice(0, 8)}...` : 'guest');

    set({
      ...newPreferences,
      currentUserAddress: address,
    });
  },

  // Ações
  installApp: (appId: string, grantedPermissions: PermissionId[] = []) => {
    set((state) => {
      if (state.installedApps.includes(appId)) {
        return state; // Já instalado
      }
      const newState = {
        installedApps: [...state.installedApps, appId],
        grantedPermissions: {
          ...state.grantedPermissions,
          [appId]: grantedPermissions,
        },
      };
      // Auto-save after change
      const fullState = { ...state, ...newState };
      saveUserPreferences(state.currentUserAddress, {
        installedApps: fullState.installedApps,
        pinnedApps: fullState.pinnedApps,
        appOrder: fullState.appOrder,
        grantedPermissions: fullState.grantedPermissions,
        appSettings: fullState.appSettings,
        lastUsed: fullState.lastUsed,
        version: fullState.version,
      });
      return newState;
    });
  },

  uninstallApp: (appId: string) => {
    set((state) => {
      const { [appId]: _permissions, ...restPermissions } = state.grantedPermissions;
      const { [appId]: _settings, ...restSettings } = state.appSettings;
      const { [appId]: _lastUsed, ...restLastUsed } = state.lastUsed;
      const { [appId]: _order, ...restOrder } = state.appOrder;

      const newState = {
        installedApps: state.installedApps.filter((id) => id !== appId),
        pinnedApps: state.pinnedApps.filter((id) => id !== appId),
        grantedPermissions: restPermissions,
        appSettings: restSettings,
        lastUsed: restLastUsed,
        appOrder: restOrder,
      };
      // Auto-save after change
      const fullState = { ...state, ...newState };
      saveUserPreferences(state.currentUserAddress, {
        installedApps: fullState.installedApps,
        pinnedApps: fullState.pinnedApps,
        appOrder: fullState.appOrder,
        grantedPermissions: fullState.grantedPermissions,
        appSettings: fullState.appSettings,
        lastUsed: fullState.lastUsed,
        version: fullState.version,
      });
      return newState;
    });
  },

  pinApp: (appId: string) => {
    set((state) => {
      if (state.pinnedApps.includes(appId)) {
        return state;
      }
      const newState = {
        pinnedApps: [...state.pinnedApps, appId],
      };
      // Auto-save
      const fullState = { ...state, ...newState };
      saveUserPreferences(state.currentUserAddress, {
        installedApps: fullState.installedApps,
        pinnedApps: fullState.pinnedApps,
        appOrder: fullState.appOrder,
        grantedPermissions: fullState.grantedPermissions,
        appSettings: fullState.appSettings,
        lastUsed: fullState.lastUsed,
        version: fullState.version,
      });
      return newState;
    });
  },

  unpinApp: (appId: string) => {
    set((state) => {
      const newState = {
        pinnedApps: state.pinnedApps.filter((id) => id !== appId),
      };
      // Auto-save
      const fullState = { ...state, ...newState };
      saveUserPreferences(state.currentUserAddress, {
        installedApps: fullState.installedApps,
        pinnedApps: fullState.pinnedApps,
        appOrder: fullState.appOrder,
        grantedPermissions: fullState.grantedPermissions,
        appSettings: fullState.appSettings,
        lastUsed: fullState.lastUsed,
        version: fullState.version,
      });
      return newState;
    });
  },

  reorderApps: (orderedAppIds: string[]) => {
    set((state) => {
      const newOrder: Record<string, number> = {};
      orderedAppIds.forEach((appId, index) => {
        newOrder[appId] = index;
      });
      const newState = { appOrder: newOrder };
      // Auto-save
      const fullState = { ...state, ...newState };
      saveUserPreferences(state.currentUserAddress, {
        installedApps: fullState.installedApps,
        pinnedApps: fullState.pinnedApps,
        appOrder: fullState.appOrder,
        grantedPermissions: fullState.grantedPermissions,
        appSettings: fullState.appSettings,
        lastUsed: fullState.lastUsed,
        version: fullState.version,
      });
      return newState;
    });
  },

  grantPermission: (appId: string, permissionId: PermissionId) => {
    set((state) => {
      const currentPermissions = state.grantedPermissions[appId] || [];
      if (currentPermissions.includes(permissionId)) {
        return state;
      }
      const newState = {
        grantedPermissions: {
          ...state.grantedPermissions,
          [appId]: [...currentPermissions, permissionId],
        },
      };
      // Auto-save
      const fullState = { ...state, ...newState };
      saveUserPreferences(state.currentUserAddress, {
        installedApps: fullState.installedApps,
        pinnedApps: fullState.pinnedApps,
        appOrder: fullState.appOrder,
        grantedPermissions: fullState.grantedPermissions,
        appSettings: fullState.appSettings,
        lastUsed: fullState.lastUsed,
        version: fullState.version,
      });
      return newState;
    });
  },

  revokePermission: (appId: string, permissionId: PermissionId) => {
    set((state) => {
      const currentPermissions = state.grantedPermissions[appId] || [];
      const newState = {
        grantedPermissions: {
          ...state.grantedPermissions,
          [appId]: currentPermissions.filter((id) => id !== permissionId),
        },
      };
      // Auto-save
      const fullState = { ...state, ...newState };
      saveUserPreferences(state.currentUserAddress, {
        installedApps: fullState.installedApps,
        pinnedApps: fullState.pinnedApps,
        appOrder: fullState.appOrder,
        grantedPermissions: fullState.grantedPermissions,
        appSettings: fullState.appSettings,
        lastUsed: fullState.lastUsed,
        version: fullState.version,
      });
      return newState;
    });
  },

  setAppSetting: (appId: string, key: string, value: unknown) => {
    set((state) => {
      const newState = {
        appSettings: {
          ...state.appSettings,
          [appId]: {
            ...(state.appSettings[appId] || {}),
            [key]: value,
          },
        },
      };
      // Auto-save
      const fullState = { ...state, ...newState };
      saveUserPreferences(state.currentUserAddress, {
        installedApps: fullState.installedApps,
        pinnedApps: fullState.pinnedApps,
        appOrder: fullState.appOrder,
        grantedPermissions: fullState.grantedPermissions,
        appSettings: fullState.appSettings,
        lastUsed: fullState.lastUsed,
        version: fullState.version,
      });
      return newState;
    });
  },

  recordAppUsage: (appId: string) => {
    set((state) => {
      const newState = {
        lastUsed: {
          ...state.lastUsed,
          [appId]: new Date().toISOString(),
        },
      };
      // Auto-save
      const fullState = { ...state, ...newState };
      saveUserPreferences(state.currentUserAddress, {
        installedApps: fullState.installedApps,
        pinnedApps: fullState.pinnedApps,
        appOrder: fullState.appOrder,
        grantedPermissions: fullState.grantedPermissions,
        appSettings: fullState.appSettings,
        lastUsed: fullState.lastUsed,
        version: fullState.version,
      });
      return newState;
    });
  },

  resetPreferences: () => {
    set((state) => {
      saveUserPreferences(state.currentUserAddress, DEFAULT_USER_PREFERENCES);
      return {
        ...DEFAULT_USER_PREFERENCES,
        currentUserAddress: state.currentUserAddress,
      };
    });
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
}));

/**
 * Initialize the store with the current user's address.
 * Call this when the app starts and when the user logs in/out.
 */
export function initializeUserAppsStore(userAddress: string | null): void {
  useUserAppsStore.getState().switchUser(userAddress);
}
