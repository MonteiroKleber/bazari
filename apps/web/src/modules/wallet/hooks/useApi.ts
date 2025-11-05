import { useState, useEffect } from 'react';
import { ApiPromise } from '@polkadot/api';
import { getApi } from '../services/polkadot';

export function useApi() {
  const [api, setApi] = useState<ApiPromise | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    getApi()
      .then((apiInstance) => {
        if (mounted) {
          setApi(apiInstance);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err);
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  return { api, isLoading, error };
}
