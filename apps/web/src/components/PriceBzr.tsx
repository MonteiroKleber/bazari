// V-2 (2025-09-18): Padroniza exports (nomeado + default) para PriceBzr

interface PriceBzrProps {
  value?: string | number | null;
  className?: string;
}

const formatBzr = (value: string | number) => {
  const numericValue = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(numericValue)) {
    return '';
  }
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericValue);
};

export function PriceBzr({ value, className = '' }: PriceBzrProps) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const formatted = formatBzr(value);
  if (!formatted) {
    return null;
  }

  return (
    <span className={`inline-flex items-baseline gap-1 text-2xl font-semibold text-foreground ${className}`}>
      <span>BZR</span>
      <span aria-label={`Valor em BZR ${formatted}`}>{formatted}</span>
    </span>
  );
}

export default PriceBzr;
