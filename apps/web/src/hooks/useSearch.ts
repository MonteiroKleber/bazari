// V-3: useSearch hook with real API data only - 2025-09-11
// No mocks, no fallbacks, uses apiFetch
// path: apps/web/src/hooks/useSearch.ts

import { useState, useEffect, useCallback, useRef } from 'react';
import { searchProducts, SearchParams, SearchResponse } from '../lib/api';
import { DEBOUNCE_DELAY } from '../lib/config';

interface UseSearchReturn {
  data: SearchResponse | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useSearch(params: SearchParams): UseSearchReturn {
  const [data, setData] = useState<SearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    // Cancel previous request if exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Debounce search query
    const shouldDebounce = params.q !== undefined;
    const delay = shouldDebounce ? DEBOUNCE_DELAY : 0;

    debounceTimerRef.current = setTimeout(async () => {
      setIsLoading(true);
      setError(null);

      try {
        abortControllerRef.current = new AbortController();
        
        const response = await searchProducts(params);
        
        // Check if request was aborted
        if (!abortControllerRef.current.signal.aborted) {
          setData(response);
        }
      } catch (err) {
        // Ignore abort errors
        if (err instanceof Error && err.name !== 'AbortError') {
          setError(err);
          setData(null);
        }
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    }, delay);
  }, [params]);

  // Fetch on params change
  useEffect(() => {
    fetchData();

    // Cleanup
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [fetchData]);

  const refetch = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  return {
    data,
    isLoading,
    error,
    refetch
  };
}