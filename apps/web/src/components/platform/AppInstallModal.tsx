import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AppIcon } from './AppIcon';
import { PermissionList } from './PermissionList';
import { PERMISSIONS_CATALOG } from '@/platform/types';
import type { BazariApp, PermissionId, PermissionDefinition } from '@/platform/types';

interface AppInstallModalProps {
  app: BazariApp;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (grantedPermissions: PermissionId[]) => void;
  isProcessing?: boolean;
}

export function AppInstallModal({
  app,
  open,
  onOpenChange,
  onConfirm,
  isProcessing = false,
}: AppInstallModalProps) {
  const [selectedOptional, setSelectedOptional] = useState<string[]>([]);

  const { requiredPermissions, optionalPermissions } = useMemo(() => {
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
  }, [app.permissions]);

  const handleConfirm = () => {
    const allGranted = [
      ...requiredPermissions.map((p) => p.id),
      ...selectedOptional,
    ] as PermissionId[];
    onConfirm(allGranted);
  };

  const hasHighRisk = [...requiredPermissions, ...optionalPermissions.filter(
    p => selectedOptional.includes(p.id)
  )].some((p) => p.risk === 'high' || p.risk === 'critical');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <AppIcon app={app} size="lg" />
            <div>
              <DialogTitle>Instalar {app.name}</DialogTitle>
              <DialogDescription className="mt-1">
                {app.description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {requiredPermissions.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">
                Permissões necessárias
              </h4>
              <PermissionList permissions={requiredPermissions} />
            </div>
          )}

          {optionalPermissions.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">
                Permissões opcionais
              </h4>
              <PermissionList
                permissions={optionalPermissions}
                selectable
                selected={selectedOptional}
                onSelect={setSelectedOptional}
              />
            </div>
          )}

          {hasHighRisk && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <p className="text-sm text-orange-800">
                ⚠️ Este app solicita permissões sensíveis. Certifique-se de
                confiar no desenvolvedor.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={isProcessing}>
            {isProcessing ? 'Instalando...' : 'Instalar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
