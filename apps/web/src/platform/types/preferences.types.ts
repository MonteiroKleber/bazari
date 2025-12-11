import type { PermissionId } from './permission.types';

/**
 * Preferências de apps do usuário
 */
export interface UserAppPreferences {
  /** IDs dos apps instalados */
  installedApps: string[];

  /** IDs dos apps fixados no topo */
  pinnedApps: string[];

  /** Ordem customizada dos apps (appId -> posição) */
  appOrder: Record<string, number>;

  /** Permissões concedidas por app */
  grantedPermissions: Record<string, PermissionId[]>;

  /** Configurações específicas por app */
  appSettings: Record<string, Record<string, unknown>>;

  /** Último uso de cada app (ISO date string) */
  lastUsed: Record<string, string>;

  /** Versão do schema de preferências */
  version: number;
}

/**
 * Preferências padrão para novos usuários
 */
export const DEFAULT_USER_PREFERENCES: UserAppPreferences = {
  installedApps: ['wallet', 'marketplace', 'feed', 'bazchat', 'p2p', 'stores'],
  pinnedApps: [],
  appOrder: {},
  grantedPermissions: {},
  appSettings: {},
  lastUsed: {},
  version: 1,
};

/**
 * Ações disponíveis para modificar preferências
 */
export interface UserAppPreferencesActions {
  /** Instalar um app */
  installApp: (appId: string, grantedPermissions?: PermissionId[]) => void;

  /** Desinstalar um app */
  uninstallApp: (appId: string) => void;

  /** Fixar app no topo */
  pinApp: (appId: string) => void;

  /** Remover app do topo */
  unpinApp: (appId: string) => void;

  /** Reordenar apps */
  reorderApps: (orderedAppIds: string[]) => void;

  /** Conceder permissão a um app */
  grantPermission: (appId: string, permissionId: PermissionId) => void;

  /** Revogar permissão de um app */
  revokePermission: (appId: string, permissionId: PermissionId) => void;

  /** Atualizar configuração de um app */
  setAppSetting: (appId: string, key: string, value: unknown) => void;

  /** Registrar uso de um app */
  recordAppUsage: (appId: string) => void;

  /** Resetar todas as preferências */
  resetPreferences: () => void;
}

/**
 * Queries sobre preferências
 */
export interface UserAppPreferencesQueries {
  /** Verifica se app está instalado */
  isInstalled: (appId: string) => boolean;

  /** Verifica se app está fixado */
  isPinned: (appId: string) => boolean;

  /** Verifica se app tem permissão */
  hasPermission: (appId: string, permissionId: PermissionId) => boolean;

  /** Obtém todas as permissões de um app */
  getAppPermissions: (appId: string) => PermissionId[];

  /** Obtém configuração de um app */
  getAppSetting: <T>(appId: string, key: string, defaultValue: T) => T;

  /** Obtém apps ordenados */
  getOrderedApps: () => string[];
}
