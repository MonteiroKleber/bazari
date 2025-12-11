/**
 * Deep linking utilities for BazariOS apps
 */

export interface DeepLink {
  scheme: string;
  host: string;
  path: string;
  params?: Record<string, string>;
}

/**
 * Parses a deep link URL and extracts its components
 *
 * Supported formats:
 * - bazari://app/com.example.myapp/screen?param=value
 * - https://bazari.libervia.xyz/app/store/com.example.myapp
 */
export function parseDeepLink(url: string): DeepLink | null {
  try {
    const parsed = new URL(url);

    // bazari://app/com.example.myapp/screen?param=value
    if (parsed.protocol === 'bazari:') {
      const pathParts = parsed.pathname.split('/').filter(Boolean);
      // Skip 'app' prefix if present
      const startIndex = pathParts[0] === 'app' ? 1 : 0;
      const appId = pathParts[startIndex];
      const path = '/' + pathParts.slice(startIndex + 1).join('/');

      return {
        scheme: 'bazari',
        host: appId || '',
        path: path || '/',
        params: Object.fromEntries(parsed.searchParams),
      };
    }

    // https://bazari.com/app/store/com.example.myapp
    // https://bazari.libervia.xyz/app/store/com.example.myapp
    if (
      parsed.hostname === 'bazari.com' ||
      parsed.hostname === 'bazari.libervia.xyz' ||
      parsed.hostname === 'localhost'
    ) {
      const pathParts = parsed.pathname.split('/').filter(Boolean);

      if (pathParts[0] === 'app' && pathParts[1] === 'store') {
        return {
          scheme: 'https',
          host: pathParts[2] || '', // appId
          path: '/' + pathParts.slice(3).join('/'),
          params: Object.fromEntries(parsed.searchParams),
        };
      }

      // Direct external app route: /app/external/com.example.myapp
      if (pathParts[0] === 'app' && pathParts[1] === 'external') {
        return {
          scheme: 'https',
          host: pathParts[2] || '', // appId
          path: '/' + pathParts.slice(3).join('/'),
          params: Object.fromEntries(parsed.searchParams),
        };
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Creates a bazari:// deep link URL
 */
export function createDeepLink(
  appId: string,
  path: string = '/',
  params?: Record<string, string>
): string {
  const base = `bazari://app/${appId}${path}`;
  if (params && Object.keys(params).length > 0) {
    const searchParams = new URLSearchParams(params);
    return `${base}?${searchParams.toString()}`;
  }
  return base;
}

/**
 * Creates a web-accessible link to an app in the store
 */
export function createWebLink(appId: string): string {
  const baseUrl =
    typeof window !== 'undefined' ? window.location.origin : 'https://bazari.libervia.xyz';
  return `${baseUrl}/app/store/${appId}`;
}

/**
 * Creates a shareable link for an app
 */
export function createShareableLink(appId: string, preferDeepLink = false): string {
  return preferDeepLink ? createDeepLink(appId) : createWebLink(appId);
}

/**
 * Checks if the current platform supports bazari:// deep links
 */
export function supportsDeepLinks(): boolean {
  // In a web context, we can't directly check for bazari:// support
  // This would need platform-specific implementation for mobile apps
  return false;
}

/**
 * Opens a deep link URL
 * Falls back to web link if deep links aren't supported
 */
export function openDeepLink(url: string): void {
  const deepLink = parseDeepLink(url);

  if (!deepLink) {
    console.warn('[DeepLinks] Invalid deep link URL:', url);
    return;
  }

  if (supportsDeepLinks()) {
    window.location.href = url;
  } else {
    // Navigate to the web version
    window.location.href = `/app/external/${deepLink.host}${deepLink.path}`;
  }
}
