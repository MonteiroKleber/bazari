/**
 * Hook to check if current user is a Council member
 */

import { useState, useEffect } from 'react';
import { useWallet } from '@/modules/wallet';

export interface UseCouncilStatusReturn {
  isMember: boolean;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useCouncilStatus(): UseCouncilStatusReturn {
  const { active: selectedAccount } = useWallet();
  const [isMember, setIsMember] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    if (!selectedAccount?.address) {
      setIsMember(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/governance/council/is-member/${selectedAccount.address}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setIsMember(data.data.isMember);
    } catch (err) {
      console.error('[useCouncilStatus] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to check council status');
      setIsMember(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [selectedAccount?.address]);

  return {
    isMember,
    isLoading,
    error,
    refetch: fetchStatus,
  };
}
