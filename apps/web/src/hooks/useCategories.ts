// path: apps/web/src/hooks/useCategories.ts

import { useState, useEffect } from 'react';
import { getJSON } from '../lib/api';

export function useCategories() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCategories() {
      try {
        setLoading(true);
        const data = await getJSON('/categories');
        
        // A API retorna {total, tree, flat}
        // Precisamos do array flat
        if (data.flat) {
          setCategories(data.flat);
        } else if (Array.isArray(data)) {
          setCategories(data);
        } else {
          setCategories([]);
        }
        
        setError(null);
      } catch (err) {
        console.error('Erro ao carregar categorias:', err);
        setError('Erro ao carregar categorias');
        setCategories([]);
      } finally {
        setLoading(false);
      }
    }

    fetchCategories();
  }, []);

  return { categories, loading, error };
}