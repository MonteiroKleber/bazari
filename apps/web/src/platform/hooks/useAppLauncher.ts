/**
 * Hook para lançamento de apps no BazariOS
 * Abstrai a lógica de navegação para apps internos e externos
 */

import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { BazariApp } from '../types';
import {
  launchExternalApp,
  getInternalAppUrl,
  isExternalApp,
  isIframeApp,
  canLaunchApp,
  type LaunchResult,
} from '../services/app-launcher';

export interface UseAppLauncherReturn {
  /** Lança um app (interno ou externo) */
  launch: (app: BazariApp) => Promise<LaunchResult>;
  /** Se está em processo de lançamento */
  isLaunching: boolean;
  /** Último erro ocorrido */
  error: string | null;
  /** Limpa o erro */
  clearError: () => void;
}

/**
 * Hook para lançar apps do BazariOS
 *
 * @example
 * ```tsx
 * const { launch, isLaunching, error } = useAppLauncher();
 *
 * const handleClick = async () => {
 *   const result = await launch(walletApp);
 *   if (!result.success) {
 *     toast.error(result.error);
 *   }
 * };
 * ```
 */
export function useAppLauncher(): UseAppLauncherReturn {
  const navigate = useNavigate();
  const [isLaunching, setIsLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const launch = useCallback(
    async (app: BazariApp): Promise<LaunchResult> => {
      // Valida se o app pode ser lançado
      if (!canLaunchApp(app)) {
        const errorMsg = `App "${app.name}" não pode ser lançado: configuração inválida`;
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }

      setIsLaunching(true);
      setError(null);

      try {
        // App externo: abre em nova aba com auth
        if (isExternalApp(app)) {
          const result = await launchExternalApp(app);

          if (!result.success) {
            setError(result.error || 'Erro desconhecido');
          }

          return result;
        }

        // App iframe (terceiros via IPFS): navega para /app/external/:slug
        if (isIframeApp(app)) {
          const url = app.entryPoint || `/app/external/${app.slug}`;
          navigate(url);
          return { success: true, url };
        }

        // App interno: navega via router
        const url = getInternalAppUrl(app);
        navigate(url);

        return { success: true, url };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Erro ao lançar app';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      } finally {
        setIsLaunching(false);
      }
    },
    [navigate]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    launch,
    isLaunching,
    error,
    clearError,
  };
}
