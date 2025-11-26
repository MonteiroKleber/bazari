import { Card } from '@/components/ui/card';
import { useStreakHistory } from '@/hooks/blockchain/useRewards';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

/**
 * StreakCalendar - 30-day activity heatmap
 */

interface StreakCalendarProps {
  days?: number;
  className?: string;
}

export const StreakCalendar = ({ days = 30, className = '' }: StreakCalendarProps) => {
  const { data: history, isLoading } = useStreakHistory(days);

  if (isLoading) {
    return (
      <Card className={`p-6 ${className}`}>
        <Skeleton className="h-48 w-full" />
      </Card>
    );
  }

  const activityData = history || [];
  const totalActive = activityData.filter((d) => d.active).length;
  const activityRate = activityData.length > 0
    ? ((totalActive / activityData.length) * 100).toFixed(0)
    : '0';

  // Group by weeks for display
  const weeks: typeof activityData[] = [];
  for (let i = 0; i < activityData.length; i += 7) {
    weeks.push(activityData.slice(i, i + 7));
  }

  const getIntensityColor = (active: boolean) => {
    if (!active) return 'bg-gray-100 border-gray-200';
    return 'bg-green-500 border-green-600';
  };

  const getFormattedDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar size={20} className="text-gray-600" />
          <h2 className="font-semibold text-lg">Activity Calendar</h2>
        </div>
        <div className="text-sm text-gray-600">
          <span className="font-semibold text-green-600">{activityRate}%</span> active
        </div>
      </div>

      <div className="space-y-2">
        <TooltipProvider>
          <div className="grid grid-cols-7 gap-2">
            {activityData.map((day, idx) => (
              <Tooltip key={idx}>
                <TooltipTrigger asChild>
                  <div
                    className={`aspect-square rounded-md border-2 transition-all cursor-pointer hover:scale-110 ${getIntensityColor(
                      day.active
                    )}`}
                    aria-label={`${getFormattedDate(day.date)} - ${
                      day.active ? 'Active' : 'Inactive'
                    }`}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs">
                    <p className="font-semibold">{getFormattedDate(day.date)}</p>
                    <p>{day.active ? 'Active' : 'No activity'}</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-4 text-xs text-gray-600">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm bg-gray-100 border border-gray-200" />
              <span>Inactive</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm bg-green-500 border border-green-600" />
              <span>Active</span>
            </div>
          </div>
          <div className="text-xs text-gray-600">
            Last {days} days
          </div>
        </div>
      </div>
    </Card>
  );
};
