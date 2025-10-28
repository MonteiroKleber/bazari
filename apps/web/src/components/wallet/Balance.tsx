import { formatBzrPlanck } from '@/utils/bzr';
import { useTranslation } from 'react-i18next';

interface BalanceProps {
  /** Balance in planck (smallest unit) */
  amount: string | number | bigint;

  /** Token symbol (default: "BZR") */
  symbol?: string;

  /** Token decimals (default: 12) */
  decimals?: number;

  /** Show symbol prefix */
  withSymbol?: boolean;

  /** Locale for number formatting */
  locale?: string;

  /** Custom className */
  className?: string;
}

/**
 * Componente para exibir balances formatados
 * Usa utils/bzr.ts para formatação consistente
 *
 * @example
 * // BZR nativo
 * <Balance amount={balance.free} />
 *
 * // Asset customizado
 * <Balance amount={assetBalance.free} symbol="ZARI" decimals={12} />
 */
export function Balance({
  amount,
  symbol = 'BZR',
  decimals = 12,
  withSymbol = true,
  locale,
  className = '',
}: BalanceProps) {
  const { i18n } = useTranslation();
  const effectiveLocale = locale || i18n.language || 'en-US';

  // Se não for BZR (asset custom), usar formatação manual
  if (symbol !== 'BZR' || decimals !== 12) {
    const value = typeof amount === 'bigint' ? amount : BigInt(amount);
    const divisor = 10n ** BigInt(decimals);
    const numeric = Number(value) / Number(divisor);

    const formatted = new Intl.NumberFormat(effectiveLocale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(numeric);

    return (
      <span className={`font-mono ${className}`}>
        {withSymbol ? `${symbol} ${formatted}` : formatted}
      </span>
    );
  }

  // BZR usa helper otimizado existente
  // Converter bigint para string se necessário
  const amountStr = typeof amount === 'bigint' ? amount.toString() : amount;
  const formatted = formatBzrPlanck(amountStr, effectiveLocale, withSymbol);

  return (
    <span className={`font-mono ${className}`}>
      {formatted}
    </span>
  );
}
