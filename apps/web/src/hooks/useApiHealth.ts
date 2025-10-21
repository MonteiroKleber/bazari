import { useState, useEffect, useRef } from "react";
import { getPublicJSON } from "../lib/api";

interface HealthData {
  ok: boolean;
  version?: string;
  env?: string;
  now?: string;
}

interface UseApiHealthReturn {
  loading: boolean;
  error: Error | null;
  data: HealthData | null;
  ok: boolean;
}

export function useApiHealth(pollInterval?: number): UseApiHealthReturn {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<HealthData | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const checkHealth = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await getPublicJSON<HealthData>("/api/healthz");
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();

    if (pollInterval && pollInterval > 0) {
      const interval = setInterval(checkHealth, pollInterval);
      
      return () => {
        clearInterval(interval);
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
      };
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [pollInterval]);

  return {
    loading,
    error,
    data,
    ok: data?.ok || false,
  };
}