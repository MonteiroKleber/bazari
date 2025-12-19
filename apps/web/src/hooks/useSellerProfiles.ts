// path: apps/web/src/hooks/useSellerProfiles.ts
// Hook to fetch user's seller profiles (stores)

import { useState, useEffect } from 'react';
import { apiHelpers } from '@/lib/api';

interface SellerProfile {
  id: string;
  shopName: string;
  shopSlug: string;
  avatarUrl: string | null;
  isDefault: boolean;
}

interface UseSellerProfilesReturn {
  profiles: SellerProfile[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useSellerProfiles(): UseSellerProfilesReturn {
  const [profiles, setProfiles] = useState<SellerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiHelpers.get<{ stores: SellerProfile[] }>('/me/stores');
      setProfiles(response.stores || []);
    } catch (err) {
      console.error('Error fetching seller profiles:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar lojas');
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  return {
    profiles,
    loading,
    error,
    refetch: fetchProfiles,
  };
}
