import { useMemo, useCallback } from 'react';
import { appRegistry } from '../registry/app-registry';
import { useUserAppsStore } from '../store/user-apps.store';
import type { PermissionId, PermissionDefinition } from '../types';
import { PERMISSIONS_CATALOG, groupPermissionsByRisk } from '../types';

interface UseAppPermissionsReturn {
  /** Permissões requeridas pelo app */
  requiredPermissions: PermissionDefinition[];

  /** Permissões opcionais do app */
  optionalPermissions: PermissionDefinition[];

  /** Permissões concedidas ao app */
  grantedPermissions: PermissionId[];

  /** Permissões agrupadas por risco */
  permissionsByRisk: ReturnType<typeof groupPermissionsByRisk>;

  /** Verifica se app tem uma permissão */
  hasPermission: (permissionId: PermissionId) => boolean;

  /** Concede uma permissão */
  grantPermission: (permissionId: PermissionId) => void;

  /** Revoga uma permissão */
  revokePermission: (permissionId: PermissionId) => void;
}

export function useAppPermissions(appId: string): UseAppPermissionsReturn {
  const app = appRegistry.get(appId);
  const {
    hasPermission: checkPermission,
    grantPermission: grant,
    revokePermission: revoke,
    getAppPermissions,
  } = useUserAppsStore();

  const grantedPermissions = getAppPermissions(appId);

  const { requiredPermissions, optionalPermissions } = useMemo(() => {
    if (!app) {
      return { requiredPermissions: [], optionalPermissions: [] };
    }

    const required: PermissionDefinition[] = [];
    const optional: PermissionDefinition[] = [];

    for (const perm of app.permissions) {
      const def = PERMISSIONS_CATALOG[perm.id as PermissionId];
      if (def) {
        if (perm.optional) {
          optional.push(def);
        } else {
          required.push(def);
        }
      }
    }

    return { requiredPermissions: required, optionalPermissions: optional };
  }, [app]);

  const allPermissionIds = useMemo(() => {
    return [...requiredPermissions, ...optionalPermissions].map((p) => p.id);
  }, [requiredPermissions, optionalPermissions]);

  const permissionsByRisk = useMemo(() => {
    return groupPermissionsByRisk(allPermissionIds);
  }, [allPermissionIds]);

  const hasPermission = useCallback(
    (permissionId: PermissionId) => {
      return checkPermission(appId, permissionId);
    },
    [appId, checkPermission]
  );

  const grantPermission = useCallback(
    (permissionId: PermissionId) => {
      grant(appId, permissionId);
    },
    [appId, grant]
  );

  const revokePermission = useCallback(
    (permissionId: PermissionId) => {
      revoke(appId, permissionId);
    },
    [appId, revoke]
  );

  return {
    requiredPermissions,
    optionalPermissions,
    grantedPermissions,
    permissionsByRisk,
    hasPermission,
    grantPermission,
    revokePermission,
  };
}
