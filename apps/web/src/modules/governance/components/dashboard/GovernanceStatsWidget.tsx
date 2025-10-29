import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { useEffect, useState } from 'react';

export interface GovernanceStatsWidgetProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    period: string;
    trend?: 'up' | 'down';
  };
  icon: React.ReactNode;
  color?: 'blue' | 'green' | 'red' | 'amber' | 'purple';
  onClick?: () => void;
  loading?: boolean;
}

const colorClasses = {
  blue: 'text-blue-500',
  green: 'text-green-500',
  red: 'text-red-500',
  amber: 'text-amber-500',
  purple: 'text-purple-500',
};

/**
 * Animated number counter component
 */
function AnimatedNumber({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const duration = 1000; // 1 second
    const steps = 60;
    const stepValue = value / steps;
    const stepDuration = duration / steps;

    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      if (currentStep >= steps) {
        setDisplayValue(value);
        clearInterval(interval);
      } else {
        setDisplayValue(Math.floor(stepValue * currentStep));
      }
    }, stepDuration);

    return () => clearInterval(interval);
  }, [value]);

  return <span>{displayValue}</span>;
}

/**
 * FASE 8: Enhanced Stats Widget
 *
 * Features:
 * - Animated number counting
 * - Trend indicators (up/down arrows)
 * - Hover effects
 * - Click navigation
 * - Loading states
 * - Responsive design
 */
export function GovernanceStatsWidget({
  title,
  value,
  change,
  icon,
  color = 'blue',
  onClick,
  loading = false,
}: GovernanceStatsWidgetProps) {
  const isClickable = !!onClick;
  const numericValue = typeof value === 'number' ? value : parseFloat(value as string);
  const isNumeric = !isNaN(numericValue);

  // Determine trend if not explicitly set
  const trend = change?.trend || (change && change.value > 0 ? 'up' : 'down');
  const trendColor = trend === 'up' ? 'text-green-500' : 'text-red-500';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={isClickable ? { y: -4, transition: { duration: 0.2 } } : {}}
    >
      <Card
        className={`
          ${isClickable ? 'cursor-pointer hover:border-primary transition-all' : ''}
          ${loading ? 'opacity-50' : ''}
        `}
        onClick={onClick}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {title}
          </CardTitle>
          <div className={colorClasses[color]}>
            {icon}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <div className="h-8 w-24 bg-muted animate-pulse rounded" />
              <div className="h-4 w-32 bg-muted animate-pulse rounded" />
            </div>
          ) : (
            <>
              <div className="text-2xl font-bold">
                {isNumeric ? (
                  <AnimatedNumber value={numericValue} />
                ) : (
                  value
                )}
              </div>

              {change && (
                <div className="flex items-center gap-1 mt-1">
                  <div className={`flex items-center text-xs font-medium ${trendColor}`}>
                    {trend === 'up' ? (
                      <ArrowUp className="h-3 w-3" />
                    ) : (
                      <ArrowDown className="h-3 w-3" />
                    )}
                    <span>{Math.abs(change.value)}%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {change.period}
                  </p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
