/**
 * Mobile optimization utilities
 */

/**
 * Get the appropriate input type for mobile keyboards
 */
export function getMobileInputType(fieldType: 'email' | 'phone' | 'number' | 'url' | 'search' | 'text'): string {
  const inputTypeMap: Record<string, string> = {
    email: 'email',
    phone: 'tel',
    number: 'number',
    url: 'url',
    search: 'search',
    text: 'text',
  };

  return inputTypeMap[fieldType] || 'text';
}

/**
 * Get the appropriate inputmode attribute for better mobile keyboards
 */
export function getInputMode(fieldType: 'email' | 'phone' | 'number' | 'decimal' | 'url' | 'search' | 'text'):
  'none' | 'text' | 'decimal' | 'numeric' | 'tel' | 'search' | 'email' | 'url' {
  const inputModeMap = {
    email: 'email' as const,
    phone: 'tel' as const,
    number: 'numeric' as const,
    decimal: 'decimal' as const,
    url: 'url' as const,
    search: 'search' as const,
    text: 'text' as const,
  };

  return inputModeMap[fieldType] || 'text';
}

/**
 * Get autocomplete attribute for better mobile UX
 */
export function getAutocomplete(fieldName: string): string {
  const autocompleteMap: Record<string, string> = {
    email: 'email',
    username: 'username',
    'current-password': 'current-password',
    'new-password': 'new-password',
    name: 'name',
    'given-name': 'given-name',
    'family-name': 'family-name',
    phone: 'tel',
    'street-address': 'street-address',
    city: 'address-level2',
    state: 'address-level1',
    zip: 'postal-code',
    country: 'country-name',
    'cc-number': 'cc-number',
    'cc-exp': 'cc-exp',
    'cc-csc': 'cc-csc',
  };

  return autocompleteMap[fieldName] || 'off';
}

/**
 * Detect if device is mobile
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;

  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

/**
 * Detect if device is iOS
 */
export function isIOS(): boolean {
  if (typeof window === 'undefined') return false;

  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

/**
 * Detect if device is Android
 */
export function isAndroid(): boolean {
  if (typeof window === 'undefined') return false;

  return /Android/i.test(navigator.userAgent);
}

/**
 * Prevent body scroll (useful for modals on mobile)
 */
export function preventBodyScroll(prevent: boolean) {
  if (typeof document === 'undefined') return;

  if (prevent) {
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
  } else {
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
  }
}

/**
 * Trigger haptic feedback on mobile devices
 */
export function hapticFeedback(type: 'light' | 'medium' | 'heavy' = 'light') {
  if (typeof navigator === 'undefined') return;

  // Vibration API
  if ('vibrate' in navigator) {
    const patterns: Record<string, number> = {
      light: 10,
      medium: 20,
      heavy: 30,
    };

    navigator.vibrate(patterns[type]);
  }
}

/**
 * Check if device supports touch
 */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;

  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-ignore - msMaxTouchPoints is IE specific
    navigator.msMaxTouchPoints > 0
  );
}

/**
 * Get viewport height accounting for mobile browser chrome
 */
export function getActualViewportHeight(): number {
  if (typeof window === 'undefined') return 0;

  return window.visualViewport?.height || window.innerHeight;
}

/**
 * Format phone number for display
 */
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.length === 11) {
    // Brazilian format: (99) 99999-9999
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  } else if (cleaned.length === 10) {
    // Brazilian format: (99) 9999-9999
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  }

  return phone;
}

/**
 * Share content using native share API
 */
export async function shareContent(data: {
  title?: string;
  text?: string;
  url?: string;
}): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.share) {
    return false;
  }

  try {
    await navigator.share(data);
    return true;
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      // User cancelled, not an error
      return false;
    }
    console.error('Error sharing:', error);
    return false;
  }
}

/**
 * Check if native share is supported
 */
export function canShare(): boolean {
  return typeof navigator !== 'undefined' && 'share' in navigator;
}
