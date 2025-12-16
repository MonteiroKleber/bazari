import { useState, useEffect, useCallback } from 'react';
import { BazariSDK, SDKUser } from '@bazari.libervia.xyz/app-sdk';

interface UseBazariReturn {
  sdk: BazariSDK | null;
  user: SDKUser | null;
  balance: string;
  isLoading: boolean;
  error: string | null;
  isInBazari: boolean;
  isDevMode: boolean;
  refetch: () => Promise<void>;
}

/**
 * Verifies if we're actually running inside Bazari by attempting
 * a quick handshake with the host. This prevents false positives
 * when running in development mode (e.g., Studio preview).
 */
async function verifyBazariHost(sdkInstance: BazariSDK): Promise<boolean> {
  try {
    // Try to get current user with a short timeout
    // If we're in a real Bazari iframe, this should respond quickly
    const timeoutPromise = new Promise<null>((_, reject) => {
      setTimeout(() => reject(new Error('timeout')), 2000);
    });

    await Promise.race([
      sdkInstance.auth.getCurrentUser(),
      timeoutPromise,
    ]);

    return true;
  } catch {
    // Timeout or error means we're not in a real Bazari environment
    return false;
  }
}

export function useBazari(): UseBazariReturn {
  const [sdk, setSdk] = useState<BazariSDK | null>(null);
  const [user, setUser] = useState<SDKUser | null>(null);
  const [balance, setBalance] = useState<string>('0');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInBazari, setIsInBazari] = useState(false);
  const [isDevMode, setIsDevMode] = useState(false);

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
        // Check if running standalone (not in any iframe)
        if (typeof window !== 'undefined' && window.parent === window) {
          // Running standalone - development mode
          setIsDevMode(true);
          setIsInBazari(false);
          setIsLoading(false);

          // Still create SDK instance for mock/dev features
          const sdkInstance = new BazariSDK({
            apiKey: import.meta.env.VITE_BAZARI_API_KEY,
            debug: true,
          });
          setSdk(sdkInstance);
          return;
        }

        // API Key from environment variable (required for production)
        // In development/preview mode, API Key is optional
        const sdkInstance = new BazariSDK({
          apiKey: import.meta.env.VITE_BAZARI_API_KEY,
          debug: import.meta.env.DEV,
        });
        setSdk(sdkInstance);

        // Check if SDK thinks we're inside Bazari
        const maybeInBazari = sdkInstance.isInBazari();

        if (maybeInBazari) {
          // Verify by actually trying to communicate with host
          // This prevents false positives when in Studio preview iframe
          const actuallyInBazari = await verifyBazariHost(sdkInstance);

          if (actuallyInBazari) {
            setIsInBazari(true);
            // Fetch full data since we're confirmed to be in Bazari
            await fetchData(sdkInstance);
          } else {
            // In iframe but not Bazari (e.g., Studio preview)
            setIsDevMode(true);
            setIsInBazari(false);
            console.log('[useBazari] Running in development mode (iframe without Bazari host)');
          }
        } else {
          // Not in iframe at all
          setIsDevMode(true);
          setIsInBazari(false);
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
    isDevMode,
    refetch,
  };
}
