import { useState, useCallback } from 'react';
import { appRegistry } from '../registry/app-registry';
import { useUserAppsStore } from '../store/user-apps.store';
import type { BazariApp, PermissionId } from '../types';

interface UseAppInstallReturn {
  /** O app em questão */
  app: BazariApp | undefined;

  /** Se está instalado */
  isInstalled: boolean;

  /** Se está processando */
  isProcessing: boolean;

  /** Se o modal de permissões deve ser exibido */
  showPermissionModal: boolean;

  /** Abre o modal de permissões */
  openPermissionModal: () => void;

  /** Fecha o modal de permissões */
  closePermissionModal: () => void;

  /** Inicia processo de instalação */
  install: () => void;

  /** Confirma instalação com permissões */
  confirmInstall: (grantedPermissions: PermissionId[]) => Promise<void>;

  /** Desinstala o app */
  uninstall: () => Promise<void>;
}

export function useAppInstall(appId: string): UseAppInstallReturn {
  const app = appRegistry.get(appId);
  const { installApp, uninstallApp, isInstalled } = useUserAppsStore();

  const [isProcessing, setIsProcessing] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);

  const install = useCallback(() => {
    if (!app) return;

    // Se app tem permissões não-opcionais, mostrar modal
    const requiredPermissions = app.permissions.filter((p) => !p.optional);
    if (requiredPermissions.length > 0) {
      setShowPermissionModal(true);
      return;
    }

    // Instalar direto se não tem permissões
    installApp(appId, []);
  }, [app, appId, installApp]);

  const confirmInstall = useCallback(
    async (grantedPermissions: PermissionId[]) => {
      setIsProcessing(true);
      try {
        // Aqui poderia ter lógica assíncrona (sync com servidor, etc)
        installApp(appId, grantedPermissions);
        setShowPermissionModal(false);
      } finally {
        setIsProcessing(false);
      }
    },
    [appId, installApp]
  );

  const uninstall = useCallback(async () => {
    setIsProcessing(true);
    try {
      // Aqui poderia ter lógica assíncrona
      uninstallApp(appId);
    } finally {
      setIsProcessing(false);
    }
  }, [appId, uninstallApp]);

  return {
    app,
    isInstalled: isInstalled(appId),
    isProcessing,
    showPermissionModal,
    openPermissionModal: () => setShowPermissionModal(true),
    closePermissionModal: () => setShowPermissionModal(false),
    install,
    confirmInstall,
    uninstall,
  };
}
