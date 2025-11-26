import { Progress } from '@/components/ui/progress';

/**
 * MissionProgress - Display mission progress with progress bar
 */

interface MissionProgressProps {
  current: number;
  target: number;
  label?: string;
  showPercentage?: boolean;
  className?: string;
}

export const MissionProgress = ({
  current,
  target,
  label = 'Progress',
  showPercentage = true,
  className = '',
}: MissionProgressProps) => {
  const percentage = Math.min((current / target) * 100, 100);
  const isComplete = current >= target;

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex justify-between items-center text-sm">
        <span className="text-gray-600">{label}</span>
        <div className="flex items-center gap-2">
          <span className={`font-medium ${isComplete ? 'text-green-600' : ''}`}>
            {current} / {target}
          </span>
          {showPercentage && (
            <span className="text-gray-500">({percentage.toFixed(0)}%)</span>
          )}
        </div>
      </div>
      <Progress
        value={percentage}
        className={`h-2 ${isComplete ? 'bg-green-100' : ''}`}
      />
    </div>
  );
};
