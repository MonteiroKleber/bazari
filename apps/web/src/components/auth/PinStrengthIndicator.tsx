import { calculatePinStrength } from '@/modules/auth/pinStrength';
import { cn } from '@/lib/utils';

interface Props {
  pin: string;
}

export function PinStrengthIndicator({ pin }: Props) {
  const strength = calculatePinStrength(pin);

  if (!pin) {
    return null;
  }

  const colorClasses = {
    red: 'bg-red-500',
    orange: 'bg-orange-500',
    yellow: 'bg-yellow-500',
    green: 'bg-green-500',
  };

  const textColorClasses = {
    red: 'text-red-600',
    orange: 'text-orange-600',
    yellow: 'text-yellow-600',
    green: 'text-green-600',
  };

  return (
    <div className="space-y-2 mt-2">
      {/* Barra de força */}
      <div className="flex gap-1">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className={cn(
              'h-1 flex-1 rounded-full transition-all duration-300',
              i < strength.score ? colorClasses[strength.color] : 'bg-muted'
            )}
          />
        ))}
      </div>

      {/* Label de força */}
      <div className="flex items-center justify-between">
        <span className={cn('text-xs font-medium', textColorClasses[strength.color])}>
          {strength.label}
        </span>
      </div>

      {/* Feedback */}
      {strength.feedback.length > 0 && (
        <ul className="text-xs text-muted-foreground space-y-1">
          {strength.feedback.map((msg, i) => (
            <li key={i} className="flex items-start gap-1">
              <span className="text-orange-500 mt-0.5">•</span>
              <span>{msg}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
