// path: apps/web/src/hooks/useEffectiveSpec.ts

import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';

export interface CategorySpec {
  jsonSchema: any;
  uiSchema: any;
  indexHints: string[];
  version: string;
  categoryPath?: string[];
}

export function useEffectiveSpec(categoryId?: string | null) {
  const [spec, setSpec] = useState<CategorySpec | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!categoryId) {
      setSpec(null);
      return;
    }

    const fetchSpec = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `${API_BASE_URL}/categories/effective-spec?id=${encodeURIComponent(categoryId)}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch category spec');
        }

        const data = await response.json();
        setSpec(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error loading spec');
        setSpec(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSpec();
  }, [categoryId]);

  return { spec, loading, error };
}