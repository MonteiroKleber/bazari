import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../lib/api';

/**
 * useBlockchainQuery - Hook para queries blockchain (read-only)
 *
 * Features:
 * - Auto-refresh em intervalo configurável
 * - Cache manual com invalidação
 * - Loading/error states
 * - Abort requests on unmount
 *
 * @example
 * const { data, isLoading, error, refetch } = useBlockchainQuery<Order>({
 *   endpoint: '/api/blockchain/orders/123',
 *   refetchInterval: 5000, // 5s
 * });
 */

export interface UseBlockchainQueryOptions<T> {
  endpoint: string;
  params?: Record<string, any>;
  enabled?: boolean; // Se false, não executa query
  refetchInterval?: number; // Auto-refresh em ms
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

export interface UseBlockchainQueryResult<T> {
  data: T | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  invalidate: () => void;
}

export function useBlockchainQuery<T = any>(
  options: UseBlockchainQueryOptions<T>
): UseBlockchainQueryResult<T> {
  const {
    endpoint,
    params,
    enabled = true,
    refetchInterval,
    onSuccess,
    onError,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(enabled);
  const [isError, setIsError] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    try {
      // Cancelar request anterior se existir
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      setIsLoading(true);
      setIsError(false);
      setError(null);

      const response = await api.get<T>(endpoint, params);
      setData(response);
      setIsError(false);

      if (onSuccess) {
        onSuccess(response);
      }
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error('Unknown error');
      setError(errorObj);
      setIsError(true);
      setData(null);

      if (onError) {
        onError(errorObj);
      }

      console.error('[useBlockchainQuery] Error:', {
        endpoint,
        params,
        error: errorObj,
      });
    } finally {
      setIsLoading(false);
    }
  }, [endpoint, params, enabled, onSuccess, onError]);

  const invalidate = useCallback(() => {
    setData(null);
    setIsError(false);
    setError(null);
  }, []);

  useEffect(() => {
    // Initial fetch
    fetchData();

    // Setup auto-refresh se configurado
    if (refetchInterval && refetchInterval > 0 && enabled) {
      intervalRef.current = setInterval(fetchData, refetchInterval);
    }

    // Cleanup
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchData, refetchInterval, enabled]);

  return {
    data,
    isLoading,
    isError,
    error,
    refetch: fetchData,
    invalidate,
  };
}

/**
 * useBlockchainOrders - Helper específico para buscar pedidos
 */
export function useBlockchainOrders(filters?: { buyer?: string; seller?: string; status?: string }) {
  return useBlockchainQuery({
    endpoint: '/api/blockchain/orders',
    params: filters,
    refetchInterval: 10000, // 10s
  });
}

/**
 * useBlockchainOrder - Helper para buscar um pedido específico
 */
export function useBlockchainOrder(orderId: number | null, options?: { enabled?: boolean }) {
  return useBlockchainQuery({
    endpoint: `/api/blockchain/orders/${orderId}`,
    enabled: orderId !== null && (options?.enabled !== false),
  });
}

/**
 * useBlockchainProofs - Helper para buscar provas de entrega
 */
export function useBlockchainProofs(orderId: number | null) {
  return useBlockchainQuery({
    endpoint: `/api/blockchain/proofs/${orderId}`,
    enabled: orderId !== null,
  });
}

/**
 * useBlockchainDispute - Helper para buscar disputa
 */
export function useBlockchainDispute(disputeId: number | null) {
  return useBlockchainQuery({
    endpoint: `/api/blockchain/disputes/${disputeId}`,
    enabled: disputeId !== null,
  });
}

/**
 * useBlockchainCourier - Helper para buscar entregador
 */
export function useBlockchainCourier(courierAddress: string | null, options?: { enabled?: boolean }) {
  return useBlockchainQuery({
    endpoint: `/api/blockchain/couriers/${courierAddress}`,
    enabled: courierAddress !== null && (options?.enabled !== false),
    refetchInterval: 30000, // 30s
  });
}

/**
 * useCourierReviews - Helper para buscar reviews de entregador
 */
export function useCourierReviews(
  courierAddress: string | null,
  options?: { limit?: number; offset?: number }
) {
  return useBlockchainQuery({
    endpoint: `/api/blockchain/couriers/${courierAddress}/reviews`,
    params: options,
    enabled: courierAddress !== null,
  });
}
