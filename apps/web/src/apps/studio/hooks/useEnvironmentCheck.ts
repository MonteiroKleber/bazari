import { useState, useEffect, useCallback } from 'react';
import type { EnvironmentStatus } from '../types/studio.types';

const CLI_SERVER_URL = 'http://localhost:4444';

export function useEnvironmentCheck(serverConnected: boolean) {
  const [status, setStatus] = useState<EnvironmentStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkEnvironment = useCallback(async () => {
    if (!serverConnected) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${CLI_SERVER_URL}/status/tools`);

      if (!response.ok) {
        throw new Error('Failed to check tools');
      }

      const data = await response.json();
      setStatus(data);
    } catch (err) {
      setError('Falha ao verificar ferramentas instaladas');
    } finally {
      setLoading(false);
    }
  }, [serverConnected]);

  useEffect(() => {
    if (serverConnected) {
      checkEnvironment();
    }
  }, [serverConnected, checkEnvironment]);

  // Ambiente minimo OK = node + npm instalados
  const isReady = status?.node.installed && status?.npm.installed;

  // Ambiente completo = inclui rust + cargo-contract
  const isFullyReady =
    isReady && status?.rust.installed && status?.cargoContract.installed;

  return {
    status,
    loading,
    error,
    isReady: isReady ?? false,
    isFullyReady: isFullyReady ?? false,
    retry: checkEnvironment,
  };
}
