import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

/**
 * useIsAdmin - Check if current user has ADMIN role
 *
 * Queries the API to check if the user has User.role === 'ADMIN'.
 *
 * Used for:
 * - App Store review dashboard
 * - Admin features (TODO: integrate with governance/conselho)
 *
 * @returns Boolean indicating if user is Admin
 *
 * @example
 * const isAdmin = useIsAdmin();
 *
 * if (isAdmin) {
 *   return <AdminAppReviewPage />;
 * }
 */
export function useIsAdmin(): boolean {
  const { data, isLoading, error } = useQuery({
    queryKey: ['user', 'profile'],
    queryFn: async () => {
      // api.get already returns the JSON response directly (not { data: ... })
      const profile = await api.get<{ id: string; role?: string }>('/developer/profile');
      return profile;
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Conservative: if loading or error, assume not admin
  if (isLoading || error) {
    return false;
  }

  // Check if user has ADMIN role
  // TODO: Integrar com governance/conselho
  return data?.role === 'ADMIN';
}

/**
 * useCanReviewApps - Check if user can review apps
 *
 * Returns true if user is either:
 * - DAO member (via blockchain governance)
 * - Admin (via User.role in database)
 *
 * TODO: This should be unified when governance is integrated
 */
export function useCanReviewApps(): boolean {
  const isAdmin = useIsAdmin();
  // For now, just return isAdmin
  // Later: const isDAOMember = useIsDAOMember();
  // return isAdmin || isDAOMember;
  return isAdmin;
}
