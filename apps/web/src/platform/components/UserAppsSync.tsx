import { useEffect } from 'react';
import { getSessionUser, subscribeSession } from '@/modules/auth/session';
import { useUserAppsStore, initializeUserAppsStore } from '../store/user-apps.store';

/**
 * Component that synchronizes the user apps store with the current session.
 * Should be placed near the root of the app, inside the BrowserRouter.
 */
export function UserAppsSync() {
  const storeAddress = useUserAppsStore((state) => state.currentUserAddress);

  // Initialize on mount and sync when session changes
  useEffect(() => {
    const user = getSessionUser();
    const sessionAddress = user?.address ?? null;

    // Always sync on mount - compare session with store
    if (sessionAddress !== storeAddress) {
      console.log(
        '[UserAppsSync] Syncing store with session:',
        `store=${storeAddress?.slice(0, 8) || 'guest'}`,
        `session=${sessionAddress?.slice(0, 8) || 'guest'}`
      );
      initializeUserAppsStore(sessionAddress);
    }
  }, []); // Only on mount

  // Subscribe to session logout events
  useEffect(() => {
    const unsubscribe = subscribeSession((event) => {
      if (event === 'expired' || event === 'cleared') {
        console.log('[UserAppsSync] Session ended, switching to guest preferences');
        initializeUserAppsStore(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // Poll for session changes (for login events which don't trigger subscribeSession)
  useEffect(() => {
    const checkSession = () => {
      const user = getSessionUser();
      const sessionAddress = user?.address ?? null;
      const currentStoreAddress = useUserAppsStore.getState().currentUserAddress;

      if (sessionAddress !== currentStoreAddress) {
        console.log(
          '[UserAppsSync] Session user changed:',
          `${currentStoreAddress?.slice(0, 8) || 'guest'} -> ${sessionAddress?.slice(0, 8) || 'guest'}`
        );
        initializeUserAppsStore(sessionAddress);
      }
    };

    // Check every 2 seconds (lightweight polling for login detection)
    const interval = setInterval(checkSession, 2000);

    return () => clearInterval(interval);
  }, []);

  return null;
}
