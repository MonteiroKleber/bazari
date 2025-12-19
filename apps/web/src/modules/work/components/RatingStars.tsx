// path: apps/web/src/modules/work/components/RatingStars.tsx
// Componente de estrelas para avaliação

import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RatingStarsProps {
  value: number;
  onChange?: (value: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
}

const sizeClasses = {
  sm: 'h-3 w-3',
  md: 'h-5 w-5',
  lg: 'h-7 w-7',
};

export function RatingStars({
  value,
  onChange,
  readonly = false,
  size = 'md',
  showValue = false,
}: RatingStarsProps) {
  const stars = [1, 2, 3, 4, 5];

  const handleClick = (rating: number) => {
    if (!readonly && onChange) {
      // Se clicar na mesma estrela, deseleciona
      onChange(rating === value ? 0 : rating);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, rating: number) => {
    if (!readonly && onChange && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onChange(rating === value ? 0 : rating);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {stars.map((star) => {
          const isFilled = star <= value;
          const isHalf = star - 0.5 === value;

          return (
            <button
              key={star}
              type="button"
              onClick={() => handleClick(star)}
              onKeyDown={(e) => handleKeyDown(e, star)}
              disabled={readonly}
              className={cn(
                'focus:outline-none transition-colors',
                !readonly && 'cursor-pointer hover:scale-110',
                readonly && 'cursor-default'
              )}
              tabIndex={readonly ? -1 : 0}
              aria-label={`${star} estrela${star > 1 ? 's' : ''}`}
            >
              <Star
                className={cn(
                  sizeClasses[size],
                  'transition-colors',
                  isFilled
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'fill-transparent text-muted-foreground/40'
                )}
              />
            </button>
          );
        })}
      </div>
      {showValue && value > 0 && (
        <span className="text-sm font-medium ml-1">{value.toFixed(1)}</span>
      )}
    </div>
  );
}

export default RatingStars;
