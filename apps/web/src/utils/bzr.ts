// Utility to format BZR amounts consistently across the app

const BZR_DECIMALS = 12n;

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

export function formatBzrPlanck(planck: string | bigint, locale = 'en-US', withPrefix = true) {
  try {
    const raw = typeof planck === 'bigint' ? planck : BigInt(String(planck).replace(/[^0-9-]/g, ''));
    const divisor = 10n ** BZR_DECIMALS;
    const integer = raw / divisor;
    const fraction = raw % divisor;
    const num = Number(integer) + Number(fraction) / Number(divisor);
    const formatted = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
      Number.isFinite(num) ? num : 0
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
