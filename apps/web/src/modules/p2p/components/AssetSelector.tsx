import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

interface AssetSelectorProps {
  value: 'BZR' | 'ZARI';
  onChange: (value: 'BZR' | 'ZARI') => void;
  disabled?: boolean;
}

export function AssetSelector({ value, onChange, disabled }: AssetSelectorProps) {
  const { t } = useTranslation();

  return (
    <div className="flex gap-2" role="radiogroup" aria-label={t('p2p.new.assetType')}>
      <Button
        variant={value === 'BZR' ? 'default' : 'outline'}
        onClick={() => onChange('BZR')}
        disabled={disabled}
        role="radio"
        aria-checked={value === 'BZR'}
      >
        💎 {t('p2p.new.assetBZR', 'BZR')}
      </Button>
      <Button
        variant={value === 'ZARI' ? 'default' : 'outline'}
        onClick={() => onChange('ZARI')}
        disabled={disabled}
        role="radio"
        aria-checked={value === 'ZARI'}
      >
        🏛️ {t('p2p.new.assetZARI', 'ZARI')}
      </Button>
    </div>
  );
}
