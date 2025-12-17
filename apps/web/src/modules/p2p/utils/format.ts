/**
 * P2P Module - Formatting Utilities
 */

/**
 * Format a number as BRL currency
 * @param value - Number or string to format
 * @returns Formatted string like "R$ 5,50"
 */
export function formatBRL(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (!Number.isFinite(num)) return 'R$ 0,00';

  return num.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Format an asset amount with proper decimals
 * @param value - Amount as string (may include decimals)
 * @param decimals - Number of decimal places (default 2)
 * @returns Formatted string
 */
export function formatAsset(value: string, decimals = 2): string {
  const num = parseFloat(value);
  if (!Number.isFinite(num)) return '0';

  return num.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

/**
 * Calculate remaining time until expiration
 * @param expiresAt - ISO date string
 * @returns Object with time info
 */
export function getRemainingTime(expiresAt: string): {
  minutes: number;
  seconds: number;
  totalSeconds: number;
  isExpired: boolean;
  isWarning: boolean;
  formatted: string;
} {
  const now = Date.now();
  const target = new Date(expiresAt).getTime();
  const diff = target - now;

  if (diff <= 0) {
    return {
      minutes: 0,
      seconds: 0,
      totalSeconds: 0,
      isExpired: true,
      isWarning: true,
      formatted: 'Expirado',
    };
  }

  const totalSeconds = Math.ceil(diff / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const isWarning = totalSeconds < 300; // Less than 5 minutes

  const formatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return {
    minutes,
    seconds,
    totalSeconds,
    isExpired: false,
    isWarning,
    formatted,
  };
}

/**
 * Truncate a blockchain address for display
 * @param address - Full address
 * @param chars - Number of characters to show on each side (default 6)
 * @returns Truncated address like "5GrwvaEF...4Qh9v"
 */
export function truncateAddress(address: string, chars = 6): string {
  if (!address || address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

/**
 * Format a price per unit
 * @param price - Price value
 * @param asset - Asset symbol (BZR, ZARI)
 * @returns Formatted string like "R$ 5,50 / BZR"
 */
export function formatPricePerUnit(price: string | number, asset = 'BZR'): string {
  return `${formatBRL(price)} / ${asset}`;
}
