import { useState, useEffect } from 'react';
import { governanceApi } from '../api';
import { transformVotesToChartData } from '../utils/chartHelpers';
import type { VotingChartData, GovernanceVote } from '../types';

export interface UseVotingDataOptions {
  /**
   * Proposal IDs to fetch voting data for
   */
  proposalIds: number[];

  /**
   * Whether to automatically fetch on mount
   * @default true
   */
  autoFetch?: boolean;

  /**
   * Refresh interval in milliseconds (0 = no auto-refresh)
   * @default 0
   */
  refreshInterval?: number;
}

export interface UseVotingDataReturn {
  /**
   * Chart-ready voting data
   */
  data: VotingChartData[];

  /**
   * Raw vote data
   */
  rawVotes: Map<number, GovernanceVote[]>;

  /**
   * Loading state
   */
  loading: boolean;

  /**
   * Error message if any
   */
  error: string | null;

  /**
   * Manually trigger a refresh
   */
  refresh: () => Promise<void>;
}

/**
 * FASE 8: Hook for fetching and transforming voting data
 *
 * Features:
 * - Fetches votes for multiple proposals in parallel
 * - Transforms data into chart-ready format
 * - Auto-refresh support
 * - Error handling
 * - Loading states
 *
 * @example
 * ```tsx
 * const { data, loading, error } = useVotingData({
 *   proposalIds: [1, 2, 3],
 *   refreshInterval: 30000, // Refresh every 30s
 * });
 *
 * if (loading) return <Spinner />;
 * if (error) return <Error message={error} />;
 *
 * return <VotingChart data={data} type="bar" />;
 * ```
 */
export function useVotingData({
  proposalIds,
  autoFetch = true,
  refreshInterval = 0,
}: UseVotingDataOptions): UseVotingDataReturn {
  const [data, setData] = useState<VotingChartData[]>([]);
  const [rawVotes, setRawVotes] = useState<Map<number, GovernanceVote[]>>(new Map());
  const [loading, setLoading] = useState(autoFetch);
  const [error, setError] = useState<string | null>(null);

  const fetchVotingData = async () => {
    if (!proposalIds || proposalIds.length === 0) {
      setData([]);
      setRawVotes(new Map());
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch votes for all proposals in parallel
      const promises = proposalIds.map(id =>
        governanceApi.getReferendumVotes(id)
      );

      const results = await Promise.all(promises);

      // Store raw votes - extract votes array from API response
      const votesMap = new Map<number, GovernanceVote[]>();
      proposalIds.forEach((id, idx) => {
        const result = results[idx];
        // API returns { referendumId, info, votes } or { success, data: { votes } }
        const votes = result?.data?.votes || result?.votes || [];
        votesMap.set(id, votes);
      });
      setRawVotes(votesMap);

      // Transform to chart data
      const chartData = proposalIds.map((id, idx) => {
        const result = results[idx];
        const votes = result?.data?.votes || result?.votes || [];
        return transformVotesToChartData(id, votes, `Proposta #${id}`);
      });

      setData(chartData);
    } catch (err) {
      console.error('Error fetching voting data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch voting data');
      setData([]);
      setRawVotes(new Map());
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    if (autoFetch) {
      fetchVotingData();
    }
  }, [proposalIds.join(','), autoFetch]);

  // Auto-refresh
  useEffect(() => {
    if (refreshInterval > 0) {
      const intervalId = setInterval(fetchVotingData, refreshInterval);
      return () => clearInterval(intervalId);
    }
  }, [proposalIds.join(','), refreshInterval]);

  return {
    data,
    rawVotes,
    loading,
    error,
    refresh: fetchVotingData,
  };
}
