import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EnhancedPinStrengthIndicatorProps {
  pin: string;
  minLength?: number;
}

interface PinChecks {
  minLength: boolean;
  noSequence: boolean;
  noRepeat: boolean;
  hasVariety: boolean;
}

export function EnhancedPinStrengthIndicator({ pin, minLength = 8 }: EnhancedPinStrengthIndicatorProps) {
  const { t } = useTranslation();

  const analysis = useMemo(() => {
    const checks: PinChecks = {
      minLength: pin.length >= minLength,
      noSequence: !/0123|1234|2345|3456|4567|5678|6789|7890|9876|8765|7654|6543|5432|4321|3210|2109/.test(pin),
      noRepeat: !/(\d)\1{2,}/.test(pin), // 111, 222, 333, etc
      hasVariety: new Set(pin.split('')).size >= 4, // At least 4 different digits
    };

    const passedChecks = Object.values(checks).filter(Boolean).length;
    const strength = Math.min(Math.floor((passedChecks / 4) * 12), 12);

    let strengthLabel = '';
    let strengthColor = '';

    if (passedChecks === 0 || pin.length === 0) {
      strengthLabel = '';
      strengthColor = '';
    } else if (passedChecks <= 1) {
      strengthLabel = t('auth.pin.strength.weak', { defaultValue: 'Fraco' });
      strengthColor = 'text-red-500';
    } else if (passedChecks === 2) {
      strengthLabel = t('auth.pin.strength.fair', { defaultValue: 'Razoável' });
      strengthColor = 'text-orange-500';
    } else if (passedChecks === 3) {
      strengthLabel = t('auth.pin.strength.good', { defaultValue: 'Bom' });
      strengthColor = 'text-yellow-500';
    } else {
      strengthLabel = t('auth.pin.strength.strong', { defaultValue: 'Forte! 💪' });
      strengthColor = 'text-green-500';
    }

    return { checks, strength, strengthLabel, strengthColor };
  }, [pin, minLength, t]);

  if (pin.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Barra de Força */}
      <div className="space-y-1">
        <div className="flex gap-0.5">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-2 flex-1 rounded-sm transition-all duration-300',
                i < analysis.strength
                  ? analysis.strength <= 3
                    ? 'bg-red-500'
                    : analysis.strength <= 6
                    ? 'bg-orange-500'
                    : analysis.strength <= 9
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
                  : 'bg-muted'
              )}
            />
          ))}
        </div>
        {analysis.strengthLabel && (
          <p className={cn('text-sm font-medium', analysis.strengthColor)}>
            {t('auth.pin.strength.label', { defaultValue: 'Força' })}: {analysis.strengthLabel}
          </p>
        )}
      </div>

      {/* Checklist de Requisitos */}
      <div className="space-y-2 text-xs sm:text-sm">
        <div className="flex items-center gap-2">
          {analysis.checks.minLength ? (
            <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
          ) : (
            <X className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          )}
          <span className={analysis.checks.minLength ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}>
            {t('auth.pin.rules.minLength', { min: minLength, defaultValue: `Mínimo ${minLength} dígitos` })}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {analysis.checks.noSequence ? (
            <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
          ) : (
            <X className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          )}
          <span className={analysis.checks.noSequence ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}>
            {t('auth.pin.rules.noSequence', { defaultValue: 'Sem sequências (1234, 9876)' })}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {analysis.checks.noRepeat ? (
            <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
          ) : (
            <X className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          )}
          <span className={analysis.checks.noRepeat ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}>
            {t('auth.pin.rules.noRepeat', { defaultValue: 'Sem repetições (111, 222)' })}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {analysis.checks.hasVariety ? (
            <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
          ) : (
            <X className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          )}
          <span className={analysis.checks.hasVariety ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}>
            {t('auth.pin.rules.variety', { defaultValue: 'Dígitos variados' })}
          </span>
        </div>
      </div>
    </div>
  );
}
