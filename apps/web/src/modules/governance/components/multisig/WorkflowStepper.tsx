import { motion } from 'framer-motion';
import { CheckCircle, Clock, XCircle, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistance } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { WorkflowStep } from '../../types';

export interface WorkflowStepperProps {
  steps: WorkflowStep[];
  className?: string;
}

const stepStatusColors = {
  completed: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500',
  active: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500 animate-pulse',
  pending: 'bg-muted text-muted-foreground border-border',
  rejected: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500',
};

const connectorColors = {
  completed: 'bg-green-500',
  active: 'bg-blue-500',
  pending: 'bg-border',
  rejected: 'bg-red-500',
};

/**
 * Format relative time
 */
function formatRelativeTime(timestamp?: string): string {
  if (!timestamp) return '';

  try {
    const date = new Date(timestamp);
    return formatDistance(date, new Date(), {
      addSuffix: true,
      locale: ptBR,
    });
  } catch {
    return timestamp;
  }
}

/**
 * Format address for display
 */
function formatAddress(address?: string): string {
  if (!address) return '';
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * FASE 8: Workflow Stepper Component
 *
 * Visual stepper for multi-sig approval workflow with:
 * - Step status indicators (completed, active, pending, rejected)
 * - Connecting lines between steps
 * - Timestamps and actor information
 * - Responsive design (horizontal on desktop, vertical on mobile)
 * - Animations
 *
 * @example
 * ```tsx
 * const steps = [
 *   { id: '1', label: 'Criada', status: 'completed', timestamp: '2025-01-29T10:00:00Z', actor: '5Grw...' },
 *   { id: '2', label: 'Aprovação 1/3', status: 'active', actor: '5Hgx...' },
 *   { id: '3', label: 'Aprovação 2/3', status: 'pending' },
 *   { id: '4', label: 'Executar', status: 'pending' },
 * ];
 *
 * <WorkflowStepper steps={steps} />
 * ```
 */
export function WorkflowStepper({ steps, className }: WorkflowStepperProps) {
  if (!steps || steps.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        Nenhum passo definido
      </div>
    );
  }

  return (
    <div className={cn('w-full', className)}>
      {/* Desktop: Horizontal Layout */}
      <div className="hidden md:flex items-start justify-between">
        {steps.map((step, idx) => (
          <div key={step.id} className="flex items-start flex-1">
            <div className="flex flex-col items-center flex-1">
              {/* Step Circle */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: idx * 0.1, duration: 0.3 }}
                className={cn(
                  'w-12 h-12 rounded-full flex items-center justify-center border-2 flex-shrink-0',
                  stepStatusColors[step.status]
                )}
              >
                {step.status === 'completed' ? (
                  <CheckCircle className="h-6 w-6" />
                ) : step.status === 'active' ? (
                  <Clock className="h-6 w-6" />
                ) : step.status === 'rejected' ? (
                  <XCircle className="h-6 w-6" />
                ) : (
                  <Circle className="h-6 w-6" />
                )}
              </motion.div>

              {/* Step Label */}
              <div className="mt-3 text-center max-w-[120px]">
                <p className="text-sm font-medium leading-tight">
                  {step.label}
                </p>
                {step.description && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {step.description}
                  </p>
                )}
                {step.timestamp && (
                  <time className="text-xs text-muted-foreground block mt-1">
                    {formatRelativeTime(step.timestamp)}
                  </time>
                )}
                {step.actor && (
                  <p className="text-xs text-muted-foreground font-mono mt-1">
                    {formatAddress(step.actor)}
                  </p>
                )}
              </div>
            </div>

            {/* Connector Line */}
            {idx < steps.length - 1 && (
              <div className="flex items-center px-2 pt-6">
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: idx * 0.1 + 0.2, duration: 0.3 }}
                  className={cn(
                    'h-0.5 w-full min-w-[40px]',
                    connectorColors[step.status]
                  )}
                  style={{ originX: 0 }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Mobile: Vertical Layout */}
      <div className="md:hidden space-y-4">
        {steps.map((step, idx) => (
          <motion.div
            key={step.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1, duration: 0.3 }}
            className="flex gap-4"
          >
            {/* Step Circle and Connector */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center border-2 flex-shrink-0',
                  stepStatusColors[step.status]
                )}
              >
                {step.status === 'completed' ? (
                  <CheckCircle className="h-5 w-5" />
                ) : step.status === 'active' ? (
                  <Clock className="h-5 w-5" />
                ) : step.status === 'rejected' ? (
                  <XCircle className="h-5 w-5" />
                ) : (
                  <Circle className="h-5 w-5" />
                )}
              </div>
              {idx < steps.length - 1 && (
                <div
                  className={cn(
                    'w-0.5 flex-1 min-h-[40px] mt-2',
                    connectorColors[step.status]
                  )}
                />
              )}
            </div>

            {/* Step Content */}
            <div className="flex-1 pb-4">
              <p className="text-sm font-medium">{step.label}</p>
              {step.description && (
                <p className="text-xs text-muted-foreground mt-1">
                  {step.description}
                </p>
              )}
              <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
                {step.timestamp && (
                  <time>{formatRelativeTime(step.timestamp)}</time>
                )}
                {step.actor && (
                  <span className="font-mono">{formatAddress(step.actor)}</span>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
