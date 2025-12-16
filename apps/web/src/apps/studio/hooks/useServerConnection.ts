import { useState, useEffect, useCallback } from 'react';
import type { ServerStatus } from '../types/studio.types';

const CLI_SERVER_URL = 'http://localhost:4444';

export function useServerConnection() {
  const [status, setStatus] = useState<ServerStatus>({ connected: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkConnection = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${CLI_SERVER_URL}/status`, {
        signal: AbortSignal.timeout(3000),
      });

      if (!response.ok) {
        throw new Error('Server responded with error');
      }

      const data = await response.json();
      setStatus({
        connected: true,
        version: data.version,
        platform: data.platform,
        nodeVersion: data.nodeVersion,
      });
    } catch (err) {
      setStatus({ connected: false });
      setError('CLI Server nao encontrado em localhost:4444');
    } finally {
      setLoading(false);
    }
  }, []);

  // Check on mount
  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  // Retry every 5s if not connected
  useEffect(() => {
    if (!status.connected && !loading) {
      const interval = setInterval(checkConnection, 5000);
      return () => clearInterval(interval);
    }
  }, [status.connected, loading, checkConnection]);

  return { status, loading, error, retry: checkConnection };
}
