import { useEffect, useState } from 'react';
import { getChainProps, type ChainProps } from '../services';

export function useChainProps() {
  const [props, setProps] = useState<ChainProps | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;
    getChainProps()
      .then((result) => {
        if (mounted) {
          setProps(result);
        }
      })
      .catch((err) => {
        if (mounted) {
          console.error('[wallet] Failed to load chain properties:', err);
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  return { props, error };
}
