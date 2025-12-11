/**
 * Auth Handlers - Handle SDK auth-related messages
 * Provides user authentication state and permissions to apps
 */

import { getSessionUser, isSessionActive, getAccessToken } from '@/modules/auth/session';
import { useUserAppsStore } from '../store/user-apps.store';
import type { PermissionId } from '../types';

/**
 * SDK User type - matches @bazari.libervia.xyz/app-sdk SDKUser
 */
export interface SDKUser {
  id: string;
  handle: string;
  displayName: string;
  avatar?: string;
  roles: string[];
}

export interface SDKPermissions {
  granted: PermissionId[];
  canRequest: PermissionId[];
}

// Cache for user profile
let cachedProfile: SDKUser | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60000; // 1 minute

/**
 * Handler for auth:getCurrentUser
 * Returns current authenticated user info in SDKUser format
 */
export async function handleGetCurrentUser(
  _appId: string,
  _payload: unknown
): Promise<SDKUser | null> {
  const user = getSessionUser();

  if (!user || !isSessionActive()) {
    cachedProfile = null;
    return null;
  }

  // Check cache
  if (cachedProfile && Date.now() - cacheTimestamp < CACHE_TTL) {
    return cachedProfile;
  }

  // Fetch profile from API
  try {
    const token = getAccessToken();
    const response = await fetch('/me/profile', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      // Return minimal user info if profile fetch fails
      return {
        id: user.id,
        handle: user.address.slice(0, 8),
        displayName: `User ${user.address.slice(0, 6)}`,
        roles: [],
      };
    }

    const profile = await response.json();

    cachedProfile = {
      id: user.id,
      handle: profile.handle || user.address.slice(0, 8),
      displayName: profile.displayName || profile.handle || `User ${user.address.slice(0, 6)}`,
      avatar: profile.avatar,
      roles: profile.roles || [],
    };
    cacheTimestamp = Date.now();

    return cachedProfile;
  } catch (error) {
    console.error('[auth-handler] Failed to fetch profile:', error);
    // Return minimal user info on error
    return {
      id: user.id,
      handle: user.address.slice(0, 8),
      displayName: `User ${user.address.slice(0, 6)}`,
      roles: [],
    };
  }
}

/**
 * Handler for auth:getPermissions
 * Returns permissions granted to the app
 */
export async function handleGetPermissions(
  appId: string,
  _payload: unknown
): Promise<SDKPermissions> {
  const store = useUserAppsStore.getState();
  const granted = store.getAppPermissions(appId);

  // All possible permissions that can be requested
  const allPermissions: PermissionId[] = [
    'user.profile.read',
    'wallet.balance.read',
    'wallet.history.read',
    'wallet.transfer.request',
    'storage.app',
    'notifications',
    'location',
    'blockchain.sign',
  ];

  // Permissions that are not yet granted
  const canRequest = allPermissions.filter(p => !granted.includes(p));

  return {
    granted,
    canRequest,
  };
}
