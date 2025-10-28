import { useEffect, useState, useCallback } from 'react';
import { deliveryApi } from '@/lib/api/delivery';
import type { DeliveryProfile } from '@/types/delivery';

interface UseDeliveryProfileReturn {
  profile: DeliveryProfile | null;
  loading: boolean;
  error: string | null;
  hasProfile: boolean;
  toggleAvailability: () => Promise<void>;
  refetch: () => Promise<void>;
}

/**
 * Hook to manage delivery profile for the current user
 * Automatically loads profile on mount
 */
export function useDeliveryProfile(): UseDeliveryProfileReturn {
  const [profile, setProfile] = useState<DeliveryProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await deliveryApi.getProfile();
      setProfile(data);
    } catch (err: any) {
      // 404 means user doesn't have a profile yet (not an error)
      if (err.status === 404) {
        setProfile(null);
        setError(null);
      } else {
        setError(err.message || 'Erro ao carregar perfil');
        console.error('Error loading delivery profile:', err);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  const toggleAvailability = useCallback(async () => {
    if (!profile) {
      throw new Error('Perfil não encontrado');
    }

    try {
      const newAvailability = !profile.isAvailable;
      const updated = await deliveryApi.updateAvailability(newAvailability);
      setProfile(updated);
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar disponibilidade');
      throw err;
    }
  }, [profile]);

  const refetch = useCallback(async () => {
    await loadProfile();
  }, [loadProfile]);

  return {
    profile,
    loading,
    error,
    hasProfile: profile !== null,
    toggleAvailability,
    refetch,
  };
}
