import { useState, useCallback, useRef } from 'react';
import { api } from '../lib/api';

/**
 * useBlockchainTx - Hook para transações blockchain (write operations)
 *
 * Features:
 * - Loading/error/success states
 * - Optimistic updates
 * - Error handling
 * - Success/error callbacks
 *
 * @example
 * const { sendTx, isLoading, isSuccess, error } = useBlockchainTx({
 *   onSuccess: (data) => console.log('TX sent:', data.txHash),
 *   onError: (err) => console.error('TX failed:', err),
 * });
 *
 * await sendTx({
 *   endpoint: '/api/blockchain/orders',
 *   method: 'POST',
 *   data: { buyer, seller, items },
 * });
 */

export interface BlockchainTxRequest {
  endpoint: string;
  method?: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  data?: any;
}

export interface BlockchainTxResponse {
  txHash?: string;
  blockNumber?: number | bigint;
  success: boolean;
  message?: string;
  [key: string]: any;
}

export interface UseBlockchainTxOptions {
  onSuccess?: (data: BlockchainTxResponse) => void;
  onError?: (error: Error) => void;
  onSettled?: () => void; // Chamado sempre (sucesso ou erro)
}

export interface UseBlockchainTxResult {
  sendTx: (request: BlockchainTxRequest) => Promise<BlockchainTxResponse | null>;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: Error | null;
  data: BlockchainTxResponse | null;
  reset: () => void;
}

export function useBlockchainTx(
  options: UseBlockchainTxOptions = {}
): UseBlockchainTxResult {
  const { onSuccess, onError, onSettled } = options;

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<BlockchainTxResponse | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const sendTx = useCallback(
    async (request: BlockchainTxRequest): Promise<BlockchainTxResponse | null> => {
      const { endpoint, method = 'POST', data: txData } = request;

      try {
        // Cancelar request anterior se existir
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }

        setIsLoading(true);
        setIsSuccess(false);
        setIsError(false);
        setError(null);
        setData(null);

        let response: BlockchainTxResponse;

        // Executar transação conforme método
        switch (method) {
          case 'POST':
            response = await api.post<BlockchainTxResponse>(endpoint, txData);
            break;
          case 'PUT':
            response = await api.put<BlockchainTxResponse>(endpoint, txData);
            break;
          case 'PATCH':
            response = await api.put<BlockchainTxResponse>(endpoint, txData); // ApiClient não tem patch, usa put
            break;
          case 'DELETE':
            response = await api.delete<BlockchainTxResponse>(endpoint);
            break;
          default:
            throw new Error(`Unsupported method: ${method}`);
        }

        setData(response);
        setIsSuccess(true);
        setIsError(false);

        if (onSuccess) {
          onSuccess(response);
        }

        return response;
      } catch (err) {
        const errorObj = err instanceof Error ? err : new Error('Transaction failed');
        setError(errorObj);
        setIsError(true);
        setIsSuccess(false);
        setData(null);

        if (onError) {
          onError(errorObj);
        }

        console.error('[useBlockchainTx] Error:', {
          endpoint,
          method,
          error: errorObj,
        });

        return null;
      } finally {
        setIsLoading(false);

        if (onSettled) {
          onSettled();
        }
      }
    },
    [onSuccess, onError, onSettled]
  );

  const reset = useCallback(() => {
    setIsLoading(false);
    setIsSuccess(false);
    setIsError(false);
    setError(null);
    setData(null);
  }, []);

  return {
    sendTx,
    isLoading,
    isSuccess,
    isError,
    error,
    data,
    reset,
  };
}

/**
 * useCreateOrder - Helper específico para criar pedidos
 */
export function useCreateOrder(options?: UseBlockchainTxOptions) {
  const { sendTx, ...rest } = useBlockchainTx(options);

  const createOrder = useCallback(
    async (orderData: {
      buyer: string;
      seller: string;
      marketplace: number;
      items: any[];
      totalAmount: string;
    }) => {
      return sendTx({
        endpoint: '/api/blockchain/orders',
        method: 'POST',
        data: orderData,
      });
    },
    [sendTx]
  );

  return {
    createOrder,
    ...rest,
  };
}

/**
 * useSubmitProof - Helper para submeter prova de entrega
 */
export function useSubmitProof(options?: UseBlockchainTxOptions) {
  const { sendTx, ...rest } = useBlockchainTx(options);

  const submitProof = useCallback(
    async (proofData: {
      orderId: number;
      proofCid: string;
      attestor: string;
    }) => {
      return sendTx({
        endpoint: '/api/blockchain/proofs',
        method: 'POST',
        data: proofData,
      });
    },
    [sendTx]
  );

  return {
    submitProof,
    ...rest,
  };
}

/**
 * useOpenDispute - Helper para abrir disputa
 */
export function useOpenDispute(options?: UseBlockchainTxOptions) {
  const { sendTx, ...rest } = useBlockchainTx(options);

  const openDispute = useCallback(
    async (disputeData: {
      orderId: number;
      plaintiff: string;
      defendant: string;
      evidenceCid: string;
    }) => {
      return sendTx({
        endpoint: '/api/blockchain/disputes',
        method: 'POST',
        data: disputeData,
      });
    },
    [sendTx]
  );

  return {
    openDispute,
    ...rest,
  };
}

/**
 * useRegisterCourier - Helper para registrar entregador
 */
export function useRegisterCourier(options?: UseBlockchainTxOptions) {
  const { sendTx, ...rest } = useBlockchainTx(options);

  const registerCourier = useCallback(
    async (courierData: {
      courierAddress: string;
      stake: string;
      serviceAreas: number[];
    }) => {
      return sendTx({
        endpoint: '/api/blockchain/couriers',
        method: 'POST',
        data: courierData,
      });
    },
    [sendTx]
  );

  return {
    registerCourier,
    ...rest,
  };
}

/**
 * useSubmitReview - Helper para submeter review de entregador
 */
export function useSubmitReview(options?: UseBlockchainTxOptions) {
  const { sendTx, ...rest } = useBlockchainTx(options);

  const submitReview = useCallback(
    async (reviewData: {
      deliveryRequestId: string;
      courierId: string;
      rating: number;
      comment?: string;
    }) => {
      return sendTx({
        endpoint: '/api/blockchain/reviews',
        method: 'POST',
        data: reviewData,
      });
    },
    [sendTx]
  );

  return {
    submitReview,
    ...rest,
  };
}

/**
 * useRecordWaypoint - Helper para registrar GPS waypoint
 */
export function useRecordWaypoint(options?: UseBlockchainTxOptions) {
  const { sendTx, ...rest } = useBlockchainTx(options);

  const recordWaypoint = useCallback(
    async (waypointData: {
      deliveryRequestId: string;
      latitude: number;
      longitude: number;
      accuracy?: number;
      speed?: number;
    }) => {
      return sendTx({
        endpoint: '/api/blockchain/gps/waypoints',
        method: 'POST',
        data: waypointData,
      });
    },
    [sendTx]
  );

  return {
    recordWaypoint,
    ...rest,
  };
}
