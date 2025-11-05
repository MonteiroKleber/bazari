/**
 * Hook to fetch and manage Treasury requests
 */

import { useState, useEffect, useCallback } from 'react';

export interface TreasuryRequest {
  id: number;
  title: string;
  description: string;
  value: string;
  beneficiary: string;
  proposer: string;
  status: string;
  councilMotionHash: string | null;
  councilMotionIndex: number | null;
  spendId: number | null;
  txHash: string | null;
  blockNumber: number | null;
  signature: string;
  createdAt: string;
  reviewedAt: string | null;
  approvedAt: string | null;
  paidOutAt: string | null;
}

export interface UseTreasuryRequestsOptions {
  status?: string;
  proposer?: string;
  limit?: number;
  offset?: number;
  autoFetch?: boolean;
}

export interface UseTreasuryRequestsReturn {
  requests: TreasuryRequest[];
  total: number;
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  refetch: () => Promise<void>;
}

export function useTreasuryRequests(
  options: UseTreasuryRequestsOptions = {}
): UseTreasuryRequestsReturn {
  const { status, proposer, limit = 50, offset = 0, autoFetch = true } = options;

  const [requests, setRequests] = useState<TreasuryRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (proposer) params.append('proposer', proposer);
      params.append('limit', limit.toString());
      params.append('offset', offset.toString());

      const response = await fetch(`/api/governance/treasury/requests?${params}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setRequests(data.data);
        setTotal(data.pagination.total);
        setHasMore(data.pagination.hasMore);
      } else {
        throw new Error(data.error || 'Failed to fetch requests');
      }
    } catch (err) {
      console.error('[useTreasuryRequests] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch treasury requests');
      setRequests([]);
      setTotal(0);
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  }, [status, proposer, limit, offset]);

  useEffect(() => {
    if (autoFetch) {
      fetchRequests();
    }
  }, [autoFetch, fetchRequests]);

  return {
    requests,
    total,
    isLoading,
    error,
    hasMore,
    refetch: fetchRequests,
  };
}
