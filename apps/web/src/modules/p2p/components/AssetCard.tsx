import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface AssetCardProps {
  asset: 'BZR' | 'ZARI';
  selected?: boolean;
  onClick?: () => void;
  priceInfo?: string;
  disabled?: boolean;
  className?: string;
}

const assetConfig = {
  BZR: {
    icon: '💰',
    name: 'BZR',
    descriptionKey: 'p2p.asset.bzr.description',
    defaultDescription: 'Token Nativo',
  },
  ZARI: {
    icon: '🏛️',
    name: 'ZARI',
    descriptionKey: 'p2p.asset.zari.description',
    defaultDescription: 'Governança',
  },
};

export function AssetCard({
  asset,
  selected = false,
  onClick,
  priceInfo,
  disabled = false,
  className,
}: AssetCardProps) {
  const { t } = useTranslation();
  const config = assetConfig[asset];

  const handleClick = () => {
    if (!disabled && onClick) {
      onClick();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!disabled && onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      className={cn(
        'flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all text-center',
        'hover:border-primary/50 hover:bg-primary/5',
        'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
        selected && 'border-primary bg-primary/10',
        !selected && 'border-border',
        disabled && 'opacity-50 cursor-not-allowed hover:border-border hover:bg-transparent',
        !disabled && 'cursor-pointer',
        className
      )}
      role="radio"
      aria-checked={selected}
      aria-label={t('p2p.asset.select', 'Selecionar {{asset}}', { asset: config.name })}
    >
      <span className="text-3xl mb-2" role="img" aria-hidden>
        {config.icon}
      </span>

      <span className="text-lg font-semibold">{config.name}</span>

      <span className="text-sm text-muted-foreground">
        {t(config.descriptionKey, config.defaultDescription)}
      </span>

      {priceInfo && (
        <>
          <div className="w-full border-t border-border/50 my-2" />
          <span className="text-sm text-muted-foreground">{priceInfo}</span>
        </>
      )}
    </button>
  );
}
