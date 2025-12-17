import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface WizardStep {
  id: string;
  label: string;
}

interface WizardStepperProps {
  steps: WizardStep[];
  currentStep: number; // 0-indexed
  onStepClick?: (step: number) => void;
  className?: string;
}

export function WizardStepper({
  steps,
  currentStep,
  onStepClick,
  className,
}: WizardStepperProps) {
  const { t } = useTranslation();

  const handleStepClick = (index: number) => {
    // Only allow clicking on previous steps
    if (onStepClick && index < currentStep) {
      onStepClick(index);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (index < currentStep && onStepClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onStepClick(index);
    }
  };

  return (
    <div className={cn('flex items-center justify-between', className)}>
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;
        const isPending = index > currentStep;
        const isLast = index === steps.length - 1;
        const isClickable = isCompleted && !!onStepClick;

        return (
          <div
            key={step.id}
            className={cn('flex items-center', !isLast && 'flex-1')}
          >
            {/* Step circle */}
            <button
              type="button"
              onClick={() => handleStepClick(index)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              disabled={!isClickable}
              className={cn(
                'flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-all',
                isCompleted && 'bg-primary text-primary-foreground',
                isCurrent && 'bg-primary text-primary-foreground ring-4 ring-primary/20',
                isPending && 'bg-muted text-muted-foreground',
                isClickable && 'cursor-pointer hover:ring-4 hover:ring-primary/20',
                !isClickable && 'cursor-default'
              )}
              aria-label={t('p2p.wizard.step', 'Passo {{number}}: {{label}}', {
                number: index + 1,
                label: step.label,
              })}
              aria-current={isCurrent ? 'step' : undefined}
              tabIndex={isClickable ? 0 : -1}
            >
              {isCompleted ? '✓' : index + 1}
            </button>

            {/* Step label (hidden on mobile) */}
            <span
              className={cn(
                'hidden sm:block ml-2 text-sm whitespace-nowrap',
                isCurrent && 'font-medium text-foreground',
                isCompleted && 'text-foreground',
                isPending && 'text-muted-foreground'
              )}
            >
              {step.label}
            </span>

            {/* Connector line */}
            {!isLast && (
              <div
                className={cn(
                  'flex-1 h-0.5 mx-3',
                  isCompleted ? 'bg-primary' : 'bg-muted'
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
