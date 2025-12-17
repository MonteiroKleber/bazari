import { useTranslation } from 'react-i18next';
import { Check, Clock, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Step {
  id: string;
  label: string;
  description?: string;
}

interface StatusStepperProps {
  steps: Step[];
  currentStep: number; // 0-indexed
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export function StatusStepper({
  steps,
  currentStep,
  orientation = 'vertical',
  className,
}: StatusStepperProps) {
  const { t } = useTranslation();

  const getStepStatus = (index: number): 'completed' | 'current' | 'pending' => {
    if (index < currentStep) return 'completed';
    if (index === currentStep) return 'current';
    return 'pending';
  };

  const getStepIcon = (status: 'completed' | 'current' | 'pending') => {
    switch (status) {
      case 'completed':
        return <Check className="h-4 w-4" />;
      case 'current':
        return <Clock className="h-4 w-4" />;
      default:
        return <Circle className="h-4 w-4" />;
    }
  };

  if (orientation === 'horizontal') {
    return (
      <div className={cn('flex items-center justify-between', className)}>
        {steps.map((step, index) => {
          const status = getStepStatus(index);
          const isLast = index === steps.length - 1;

          return (
            <div key={step.id} className="flex items-center flex-1">
              {/* Step indicator */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors',
                    status === 'completed' && 'bg-primary border-primary text-primary-foreground',
                    status === 'current' && 'border-primary text-primary bg-primary/10',
                    status === 'pending' && 'border-muted-foreground/30 text-muted-foreground'
                  )}
                  aria-label={t('p2p.stepper.step', 'Passo {{number}}: {{label}}', {
                    number: index + 1,
                    label: step.label,
                  })}
                >
                  {getStepIcon(status)}
                </div>
                <span
                  className={cn(
                    'text-xs mt-1 text-center max-w-[80px]',
                    status === 'current' && 'font-medium text-primary',
                    status === 'pending' && 'text-muted-foreground'
                  )}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {!isLast && (
                <div
                  className={cn(
                    'flex-1 h-0.5 mx-2',
                    status === 'completed' ? 'bg-primary' : 'bg-muted-foreground/30'
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // Vertical orientation
  return (
    <div className={cn('space-y-0', className)}>
      {steps.map((step, index) => {
        const status = getStepStatus(index);
        const isLast = index === steps.length - 1;

        return (
          <div key={step.id} className="flex">
            {/* Left: icon and line */}
            <div className="flex flex-col items-center mr-4">
              <div
                className={cn(
                  'flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors',
                  status === 'completed' && 'bg-primary border-primary text-primary-foreground',
                  status === 'current' && 'border-primary text-primary bg-primary/10',
                  status === 'pending' && 'border-muted-foreground/30 text-muted-foreground'
                )}
                aria-label={t('p2p.stepper.step', 'Passo {{number}}: {{label}}', {
                  number: index + 1,
                  label: step.label,
                })}
              >
                {getStepIcon(status)}
              </div>

              {/* Connector line */}
              {!isLast && (
                <div
                  className={cn(
                    'w-0.5 flex-1 min-h-[24px]',
                    status === 'completed' ? 'bg-primary' : 'bg-muted-foreground/30'
                  )}
                />
              )}
            </div>

            {/* Right: content */}
            <div className={cn('pb-6', isLast && 'pb-0')}>
              <h4
                className={cn(
                  'text-sm font-medium leading-8',
                  status === 'current' && 'text-primary',
                  status === 'pending' && 'text-muted-foreground'
                )}
              >
                {step.label}
              </h4>
              {step.description && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {step.description}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
