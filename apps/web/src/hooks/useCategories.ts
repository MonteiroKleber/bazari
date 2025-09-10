import { useState, useEffect } from 'react';
import { api } from '../lib/api';

interface Category {
  id: string;
  slug: string;
  parentId: string | null;
  kind: string;
  level: number;
  namePt: string;
  nameEn: string;
  nameEs: string;
  pathSlugs: string[];
  pathNamesPt: string[];
  pathNamesEn: string[];
  pathNamesEs: string[];
  active: boolean;
  sort: number;
  createdAt: string;
  updatedAt: string;
}

type CategoriesResponse =
  | Category[]                                        // ✅ formato que a API atual retorna (array direto)
  | { items?: Category[]; results?: Category[]; data?: Category[] } // wrappers comuns
  | { pages?: Category[][] }                          // casos onde vem paginado em páginas (array de arrays)
  | any;                                              // fallback (defensivo)

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  // ---------- helpers internos (defensivos) ----------
  const isCategory = (x: any): x is Category =>
    x && typeof x === 'object' && typeof x.id === 'string' && typeof x.level === 'number';

  const normalizeToArray = (resp: CategoriesResponse): Category[] => {
    // 1) array direto
    if (Array.isArray(resp)) {
      return resp.filter(isCategory);
    }
    // 2) wrappers comuns
    if (resp && typeof resp === 'object') {
      if (Array.isArray(resp.items)) return resp.items.filter(isCategory);
      if (Array.isArray(resp.results)) return resp.results.filter(isCategory);
      if (Array.isArray(resp.data)) return resp.data.filter(isCategory);

      // 3) páginas: { pages: Category[][] }
      if (Array.isArray((resp as any).pages)) {
        const pages = (resp as any).pages as any[];
        // usa .flat() se existir, senão concatena manualmente (evita "resp.flat is not a function")
        const flattened: any[] =
          typeof (pages as any).flat === 'function'
            ? (pages as any).flat()
            : ([] as any[]).concat(...pages);
        return flattened.filter(isCategory);
      }
    }
    // 4) formato inesperado -> vazio (evita exception)
    return [];
  };

  const fetchCategories = async () => {
    try {
      setLoading(true);

      // A API do projeto retorna todas as categorias em /categories (sem wrapper .data)
      const response = await api.get<CategoriesResponse>('/categories');

      const list = normalizeToArray(response);

      // (opcional) sanity: se vier vazio, loga para debug sem quebrar a UI
      if (!Array.isArray(list)) {
        console.warn('Formato de categorias inesperado (não-array). Valor:', response);
        setCategories([]);
      } else {
        setCategories(list);
      }

      setError(null);
    } catch (err) {
      console.error('Erro ao carregar categorias:', err);
      setError('Erro ao carregar categorias');
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryByPath = (pathSlugs: string[]): Category | undefined => {
    return categories.find(
      (cat) => JSON.stringify(cat.pathSlugs) === JSON.stringify(pathSlugs)
    );
  };

  const getCategoryById = (id: string): Category | undefined => {
    return categories.find((cat) => cat.id === id);
  };

  const getChildCategories = (parentId: string): Category[] => {
    const parent = categories.find((cat) => cat.id === parentId);
    if (!parent) return [];
    return categories.filter(
      (cat) => cat.id.startsWith(parent.id + '-') && cat.level === parent.level + 1
    );
  };

  const getRootCategories = (kind: 'product' | 'service'): Category[] => {
    return categories.filter((cat) => cat.kind === kind && cat.level === 1);
  };

  return {
    categories,
    loading,
    error,
    refetch: fetchCategories,
    getCategoryByPath,
    getCategoryById,
    getChildCategories,
    getRootCategories,
  };
}
