import { useState, useEffect } from "react";
import { getJSON } from "../lib/api";

interface Category {
  id: string;
  slug: string;
  level: number;
  pathSlugs: string[];
  namePt: string;
  nameEn: string;
  nameEs: string;
  createdAt: string;
  updatedAt: string;
}

interface CategoriesResponse {
  total: number;
  tree: {
    products: Category[];
    services: Category[];
  };
  flat: Category[];
}

interface UseCategoriesReturn {
  loading: boolean;
  error: Error | null;
  categories: Category[];
}

// Cache simples em memória
let categoriesCache: Category[] | null = null;

export function useCategories(): UseCategoriesReturn {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    const fetchCategories = async () => {
      // Se já tem cache, usa ele
      if (categoriesCache) {
        setCategories(categoriesCache);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        // MUDANÇA AQUI: processar o formato correto
        const response = await getJSON<CategoriesResponse>("/categories");
        
        // Usar o array flat que já vem pronto
        const flatCategories = response.flat || [];
        
        categoriesCache = flatCategories; // Salva no cache
        setCategories(flatCategories);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to load categories"));
        setCategories([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  return {
    loading,
    error,
    categories,
  };
}