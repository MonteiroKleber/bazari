import { useState, useEffect, useCallback } from 'react';
import { BazariSDK, SDKUser } from '@bazari.libervia.xyz/app-sdk';

interface UseBazariReturn {
  sdk: BazariSDK | null;
  user: SDKUser | null;
  balance: string;
  isLoading: boolean;
  error: string | null;
  isInBazari: boolean;
  refetch: () => Promise<void>;
}

export function useBazari(): UseBazariReturn {
  const [sdk, setSdk] = useState<BazariSDK | null>(null);
  const [user, setUser] = useState<SDKUser | null>(null);
  const [balance, setBalance] = useState<string>('0');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInBazari, setIsInBazari] = useState(false);

  const fetchData = useCallback(async (sdkInstance: BazariSDK) => {
    try {
      // Get current user
      const currentUser = await sdkInstance.auth.getCurrentUser();
      setUser(currentUser);

      // Get balance if user is connected
      if (currentUser?.id) {
        const balances = await sdkInstance.wallet.getBalance();
        // SDKBalance has bzr and zari properties
        if (balances) {
          setBalance(balances.formatted?.bzr || balances.bzr || '0');
        }
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, []);

  const refetch = useCallback(async () => {
    if (sdk && isInBazari) {
      setIsLoading(true);
      await fetchData(sdk);
      setIsLoading(false);
    }
  }, [sdk, isInBazari, fetchData]);

  useEffect(() => {
    const initSDK = async () => {
      try {
        // API Key from environment variable (required for production)
        // In development/preview mode, API Key is optional
        const sdkInstance = new BazariSDK({
          apiKey: import.meta.env.VITE_BAZARI_API_KEY,
          debug: import.meta.env.DEV,
        });
        setSdk(sdkInstance);

        // Check if running inside Bazari
        const inBazari = sdkInstance.isInBazari();
        setIsInBazari(inBazari);

        if (inBazari) {
          // Fetch data when inside Bazari
          await fetchData(sdkInstance);
        }
      } catch (err) {
        console.error('SDK initialization error:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize SDK');
      } finally {
        setIsLoading(false);
      }
    };

    initSDK();
  }, [fetchData]);

  return {
    sdk,
    user,
    balance,
    isLoading,
    error,
    isInBazari,
    refetch,
  };
}
