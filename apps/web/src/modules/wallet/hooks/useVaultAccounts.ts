import { useCallback, useEffect, useState } from 'react';
import { getActiveAccount, listAccounts, subscribeVault, type VaultAccountRecord } from '@/modules/auth';

interface VaultState {
  accounts: VaultAccountRecord[];
  active: VaultAccountRecord | null;
  loading: boolean;
}

export function useVaultAccounts(): VaultState {
  const [state, setState] = useState<VaultState>({ accounts: [], active: null, loading: true });

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true }));
    try {
      const [accounts, active] = await Promise.all([listAccounts(), getActiveAccount()]);
      setState({ accounts, active, loading: false });
    } catch (error) {
      console.error('[wallet] Failed to load vault accounts:', error);
      setState({ accounts: [], active: null, loading: false });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const unsubscribe = subscribeVault(() => {
      void load();
    });
    return () => {
      unsubscribe();
    };
  }, [load]);

  return state;
}
