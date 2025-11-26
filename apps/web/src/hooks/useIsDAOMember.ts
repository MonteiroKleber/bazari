import { useBlockchainQuery } from './useBlockchainQuery';

/**
 * useIsDAOMember - Check if current user is a DAO member
 *
 * Queries the blockchain governance pallet to check if the user
 * has DAO_MEMBER role.
 *
 * Used for:
 * - Showing/hiding Admin Escrows dashboard
 * - Enabling refund actions in EscrowActions
 * - Conditional rendering of admin features
 *
 * @returns Boolean indicating if user is DAO member
 *
 * @example
 * const isDAOMember = useIsDAOMember();
 *
 * if (isDAOMember) {
 *   return <AdminEscrowDashboard />;
 * }
 */
export function useIsDAOMember(): boolean {
  const { data, isLoading, error } = useBlockchainQuery<{ isDAOMember: boolean }>({
    endpoint: '/api/blockchain/governance/is-dao-member',
    refetchInterval: 300000, // 5 minutes (role changes are rare)
  });

  // DEBUG: Log hook state
  console.log('[useIsDAOMember] Hook state:', { data, isLoading, error, result: data?.isDAOMember });

  // Conservative: if loading or error, assume not DAO member
  if (isLoading || error) {
    console.log('[useIsDAOMember] Returning false due to:', { isLoading, error });
    return false;
  }

  const result = data?.isDAOMember ?? false;
  console.log('[useIsDAOMember] Returning:', result);
  return result;
}

/**
 * Alternative: useUserRoles - Get all user roles
 *
 * Returns array of roles for more granular permissions.
 *
 * @example
 * const roles = useUserRoles();
 * const canRefund = roles.includes('DAO_MEMBER');
 * const canModerate = roles.includes('MODERATOR');
 */
export function useUserRoles(): string[] {
  const { data, isLoading, error } = useBlockchainQuery<{ roles: string[] }>({
    endpoint: '/api/blockchain/governance/user-roles',
    refetchInterval: 300000, // 5 minutes
  });

  if (isLoading || error) {
    return [];
  }

  return data?.roles ?? [];
}
