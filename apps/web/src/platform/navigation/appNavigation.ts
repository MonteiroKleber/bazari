import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserAppsStore } from '../store/user-apps.store';
import { parseDeepLink, createDeepLink, createWebLink } from './deepLinks';

/**
 * Mapping of native app IDs to their internal routes
 */
const nativeAppRoutes: Record<string, string> = {
  'com.bazari.wallet': '/app/wallet',
  'com.bazari.marketplace': '/marketplace',
  'com.bazari.p2p': '/app/p2p',
  'com.bazari.chat': '/app/chat',
  'com.bazari.governance': '/app/governance',
  'com.bazari.delivery': '/app/delivery',
  'com.bazari.rewards': '/app/rewards/missions',
  'com.bazari.feed': '/app/feed',
  'com.bazari.vesting': '/vesting',
};

/**
 * Gets the internal route for a native app
 */
function getNativeAppRoute(appId: string): string | null {
  return nativeAppRoutes[appId] || null;
}

/**
 * Hook for app navigation within BazariOS
 */
export function useAppNavigation() {
  const navigate = useNavigate();
  const installedApps = useUserAppsStore((s) => s.installedApps);

  /**
   * Navigates to an installed app
   * - Native apps: navigate to internal route
   * - External apps: navigate to sandbox
   * - Not installed: navigate to store page
   */
  const openApp = useCallback(
    (appId: string, path?: string, params?: Record<string, string>) => {
      const isInstalled = installedApps.includes(appId);

      if (!isInstalled) {
        // App not installed, go to store
        navigate(`/app/store/${appId}`);
        return;
      }

      // Check if it's a native app
      const nativeRoute = getNativeAppRoute(appId);
      if (nativeRoute) {
        // Native app - use internal route
        const fullPath = path ? `${nativeRoute}${path}` : nativeRoute;
        navigate(fullPath);
        return;
      }

      // External app - open in sandbox
      navigate(`/app/external/${appId}`, {
        state: { path, params },
      });
    },
    [installedApps, navigate]
  );

  /**
   * Processes a deep link URL and navigates accordingly
   */
  const handleDeepLink = useCallback(
    (url: string) => {
      const deepLink = parseDeepLink(url);
      if (deepLink && deepLink.host) {
        openApp(deepLink.host, deepLink.path, deepLink.params);
      }
    },
    [openApp]
  );

  /**
   * Generates a shareable deep link for an app
   */
  const getShareableLink = useCallback((appId: string): string => {
    return createDeepLink(appId);
  }, []);

  /**
   * Generates a web link for an app (for sharing on social media, etc.)
   */
  const getWebLink = useCallback((appId: string): string => {
    return createWebLink(appId);
  }, []);

  /**
   * Checks if an app is installed
   */
  const isAppInstalled = useCallback(
    (appId: string): boolean => {
      return installedApps.includes(appId);
    },
    [installedApps]
  );

  /**
   * Checks if an app is a native BazariOS app
   */
  const isNativeApp = useCallback((appId: string): boolean => {
    return appId in nativeAppRoutes;
  }, []);

  return {
    openApp,
    handleDeepLink,
    getShareableLink,
    getWebLink,
    isAppInstalled,
    isNativeApp,
  };
}
