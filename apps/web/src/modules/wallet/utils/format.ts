import { decodeAddress, encodeAddress } from '@polkadot/util-crypto';

export function shortenAddress(address: string, size = 6) {
  if (address.length <= size * 2 + 3) {
    return address;
  }
  return `${address.slice(0, size)}…${address.slice(-size)}`;
}

// Overload signatures
export function formatBalance(value: bigint, decimals: number, precision?: number): string;
export function formatBalance(value: string, decimals?: number, precision?: number): string;

// Implementation
export function formatBalance(value: bigint | string | undefined | null, decimals: number = 12, precision = 4): string {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return '0';
  }

  // Handle string input (legacy format for governance)
  if (typeof value === 'string') {
    // If value is empty or invalid, return '0'
    if (!value || value === '0') {
      return '0';
    }
    // Check if it's already a formatted number (with commas/decimals)
    if (value.includes(',') || value.includes('.')) {
      return value;
    }
    // Convert string to bigint if it's a valid number
    try {
      const bigintValue = BigInt(value);
      value = bigintValue;
    } catch {
      // If conversion fails, return '0'
      return '0';
    }
  }

  // Original bigint implementation
  const negative = value < 0n;
  const absolute = negative ? -value : value;
  const base = 10n ** BigInt(decimals);
  const integer = absolute / base;
  const fraction = absolute % base;

  let fractionStr = fraction.toString().padStart(decimals, '0');
  if (decimals === 0) {
    fractionStr = '';
  } else {
    fractionStr = fractionStr.slice(0, precision).replace(/0+$/, '');
  }

  const integerStr = integer.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const formatted = fractionStr ? `${integerStr}.${fractionStr}` : integerStr;
  return negative ? `-${formatted}` : formatted;
}

export function parseAmountToPlanck(amount: string, decimals: number): bigint {
  const normalized = amount.trim();
  if (!normalized) {
    throw new Error('Amount required');
  }

  if (!/^\d*(\.\d*)?$/.test(normalized)) {
    throw new Error('Invalid amount');
  }

  const [integerPart, rawFraction = ''] = normalized.split('.');
  const fractionPart = rawFraction.padEnd(decimals, '0');
  if (fractionPart.length > decimals) {
    const trimmed = rawFraction.slice(0, decimals);
    return parseAmountToPlanck(`${integerPart}.${trimmed}`, decimals);
  }

  const integer = BigInt(integerPart || '0');
  const fraction = BigInt((fractionPart || '').slice(0, decimals) || '0');
  const scale = 10n ** BigInt(decimals);
  return integer * scale + fraction;
}

export function normaliseAddress(address: string, ss58Prefix: number) {
  const decoded = decodeAddress(address);
  return encodeAddress(decoded, ss58Prefix);
}

export function isValidAddress(address: string) {
  try {
    decodeAddress(address);
    return true;
  } catch (error) {
    console.warn('[wallet] Invalid address provided:', error);
    return false;
  }
}
