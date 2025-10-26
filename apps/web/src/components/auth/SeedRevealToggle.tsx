import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff } from 'lucide-react';

interface SeedRevealToggleProps {
  mnemonic: string[];
  className?: string;
}

export function SeedRevealToggle({ mnemonic, className }: SeedRevealToggleProps) {
  const { t } = useTranslation();
  const [isRevealed, setIsRevealed] = useState(false);

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">
          {t('auth.create.seed.title', { defaultValue: '🔐 Suas 12 Palavras Secretas' })}
        </h3>
        <Button
          variant={isRevealed ? 'default' : 'outline'}
          size="sm"
          onClick={() => setIsRevealed(!isRevealed)}
          className="gap-2"
        >
          {isRevealed ? (
            <>
              <EyeOff className="h-4 w-4" />
              {t('auth.create.seed.hide', { defaultValue: 'Ocultar' })}
            </>
          ) : (
            <>
              <Eye className="h-4 w-4" />
              {t('auth.create.seed.reveal', { defaultValue: 'Revelar Palavras' })}
            </>
          )}
        </Button>
      </div>

      <ol className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3 bg-muted/30 rounded-lg p-3 sm:p-4">
        {mnemonic.map((word, index) => (
          <li
            key={word + index}
            className="flex items-center gap-2 sm:gap-3 rounded-md bg-background px-2 sm:px-3 py-2 shadow-sm min-h-[40px]"
          >
            <span className="text-xs sm:text-sm font-medium text-muted-foreground flex-shrink-0">
              {index + 1}.
            </span>
            <span className={`font-semibold tracking-wide text-sm sm:text-base transition-all duration-200 ${
              isRevealed ? 'opacity-100' : 'opacity-0 select-none'
            }`}>
              {isRevealed ? word.toUpperCase() : '••••••'}
            </span>
          </li>
        ))}
      </ol>

      {!isRevealed && (
        <p className="text-xs sm:text-sm text-muted-foreground text-center mt-3">
          {t('auth.create.seed.clickToReveal', { defaultValue: '👆 Clique em "Revelar Palavras" para visualizar' })}
        </p>
      )}
    </div>
  );
}
