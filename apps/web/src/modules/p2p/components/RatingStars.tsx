import { useTranslation } from 'react-i18next';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RatingStarsProps {
  value: number;
  onChange?: (value: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
  totalReviews?: number;
  className?: string;
}

const sizeClasses = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

const textSizeClasses = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

export function RatingStars({
  value,
  onChange,
  readonly = true,
  size = 'md',
  showValue = false,
  totalReviews,
  className,
}: RatingStarsProps) {
  const { t } = useTranslation();
  const stars = [1, 2, 3, 4, 5];

  const handleClick = (star: number) => {
    if (!readonly && onChange) {
      onChange(star);
    }
  };

  const handleKeyDown = (star: number, e: React.KeyboardEvent) => {
    if (!readonly && onChange && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onChange(star);
    }
  };

  // For readonly display with a decimal value
  if (readonly && showValue) {
    return (
      <div className={cn('flex items-center gap-1', className)}>
        <Star
          className={cn(sizeClasses[size], 'fill-yellow-400 text-yellow-400')}
        />
        <span className={cn(textSizeClasses[size], 'font-medium')}>
          {value.toFixed(1)}
        </span>
        {totalReviews !== undefined && (
          <span className={cn(textSizeClasses[size], 'text-muted-foreground')}>
            ({totalReviews})
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn('flex items-center gap-0.5', className)}
      role={readonly ? 'img' : 'group'}
      aria-label={
        readonly
          ? t('p2p.rating.label', { value: value.toFixed(1) })
          : t('p2p.rating.select', 'Selecione uma avaliação')
      }
    >
      {stars.map((star) => {
        const isFilled = star <= Math.round(value);

        return (
          <button
            key={star}
            type="button"
            onClick={() => handleClick(star)}
            onKeyDown={(e) => handleKeyDown(star, e)}
            disabled={readonly}
            className={cn(
              'transition-colors',
              !readonly && 'cursor-pointer hover:scale-110',
              readonly && 'cursor-default'
            )}
            aria-label={t('p2p.rating.star', { star })}
            tabIndex={readonly ? -1 : 0}
          >
            <Star
              className={cn(
                sizeClasses[size],
                isFilled
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'fill-transparent text-muted-foreground'
              )}
            />
          </button>
        );
      })}

      {showValue && (
        <span className={cn(textSizeClasses[size], 'ml-1 text-muted-foreground')}>
          {value.toFixed(1)}
          {totalReviews !== undefined && ` (${totalReviews})`}
        </span>
      )}
    </div>
  );
}
