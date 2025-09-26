// Utility to format BZR amounts consistently across the app

const BZR_DECIMALS = 12; // avoid BigInt for legacy/browser compat

export function normalizeLocale(lang?: string): string {
  switch ((lang || '').toLowerCase()) {
    case 'pt':
    case 'pt-br':
      return 'pt-BR';
    case 'es':
    case 'es-es':
      return 'es-ES';
    case 'en':
    case 'en-us':
    default:
      return 'en-US';
  }
}

export function formatBzrDecimal(value: string | number, locale = 'en-US', withPrefix = true) {
  const n = typeof value === 'string' ? Number(value) : value;
  const formatted = Number.isFinite(n)
    ? new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
    : '0.00';
  return withPrefix ? `BZR ${formatted}` : formatted;
}

export function formatBzrPlanck(planck: string | number, locale = 'en-US', withPrefix = true) {
  try {
    const rawStr = String(planck).replace(/[^0-9-]/g, '');
    const negative = rawStr.startsWith('-');
    const absStr = negative ? rawStr.slice(1) : rawStr;
    // Pad left to ensure at least BZR_DECIMALS digits
    const padded = absStr.padStart(BZR_DECIMALS + 1, '0');
    const intPart = padded.slice(0, padded.length - BZR_DECIMALS);
    const fracPart = padded.slice(padded.length - BZR_DECIMALS);
    const num = Number(intPart) + Number(`0.${fracPart}`);
    const signed = negative ? -num : num;
    const formatted = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
      Number.isFinite(signed) ? signed : 0
    );
    return withPrefix ? `BZR ${formatted}` : formatted;
  } catch {
    const fallback = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(0);
    return withPrefix ? `BZR ${fallback}` : fallback;
  }
}

export function formatBzrAuto(value: unknown, locale = 'en-US', withPrefix = true) {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (/[\.,]/.test(trimmed)) {
      return formatBzrDecimal(trimmed.replace(',', '.'), locale, withPrefix);
    }
    if (/^-?\d+$/.test(trimmed)) {
      return formatBzrPlanck(trimmed, locale, withPrefix);
    }
  }
  if (typeof value === 'number') {
    return formatBzrDecimal(value, locale, withPrefix);
  }
  try {
    return formatBzrPlanck(String(value ?? '0'), locale, withPrefix);
  } catch {
    return formatBzrDecimal(0, locale, withPrefix);
  }
}

export const BZR = {
  formatDecimal: formatBzrDecimal,
  formatPlanck: formatBzrPlanck,
  formatAuto: formatBzrAuto,
  normalizeLocale,
};
