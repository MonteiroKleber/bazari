import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useStreakData } from '@/hooks/blockchain/useRewards';
import { Skeleton } from '@/components/ui/skeleton';
import { Flame, Award, TrendingUp } from 'lucide-react';

/**
 * StreakWidget - Display daily streak with fire icon and milestones
 */

const STREAK_MILESTONES = [
  { days: 7, reward: 1000, label: '1 Week' },
  { days: 30, reward: 5000, label: '1 Month' },
  { days: 100, reward: 20000, label: '100 Days' },
  { days: 365, reward: 100000, label: '1 Year' },
];

export const StreakWidget = () => {
  const { data: streakData, isLoading } = useStreakData();

  if (isLoading) {
    return (
      <Card className="p-4">
        <Skeleton className="h-32 w-full" />
      </Card>
    );
  }

  const currentStreak = streakData?.currentStreak || 0;
  const longestStreak = streakData?.longestStreak || 0;

  // Find next milestone
  const nextMilestone = STREAK_MILESTONES.find((m) => m.days > currentStreak);
  const milestoneProgress = nextMilestone
    ? (currentStreak / nextMilestone.days) * 100
    : 100;

  // Streak intensity color
  const getStreakColor = (days: number) => {
    if (days >= 100) return 'from-red-500 to-orange-500';
    if (days >= 30) return 'from-orange-500 to-yellow-500';
    if (days >= 7) return 'from-yellow-500 to-orange-400';
    return 'from-orange-400 to-red-400';
  };

  const streakColor = getStreakColor(currentStreak);

  return (
    <Card className={`p-5 bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 border-2 ${currentStreak >= 7 ? 'border-orange-300' : 'border-gray-200'}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full bg-gradient-to-br ${streakColor}`}>
            <Flame size={28} className="text-white" />
          </div>
          <div>
            <h3 className="font-bold text-3xl bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
              {currentStreak}
            </h3>
            <p className="text-xs text-gray-600 font-medium">Day Streak</p>
          </div>
        </div>

        <div className="text-right">
          <div className="flex items-center gap-1 justify-end">
            <TrendingUp size={14} className="text-gray-500" />
            <p className="text-xs text-gray-600">Best</p>
          </div>
          <p className="font-semibold text-xl text-gray-700">{longestStreak}</p>
        </div>
      </div>

      {nextMilestone && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 font-medium">
              Next: {nextMilestone.label}
            </span>
            <span className="font-semibold text-orange-600">
              {nextMilestone.days - currentStreak} days
            </span>
          </div>

          <Progress
            value={milestoneProgress}
            className="h-2 bg-orange-100"
          />

          <div className="flex items-center gap-2 text-xs text-gray-600 bg-yellow-50 px-3 py-2 rounded-lg border border-yellow-200">
            <Award size={14} className="text-yellow-600" />
            <span>
              Unlock: <span className="font-semibold text-yellow-700">{nextMilestone.reward.toLocaleString()} ZARI</span>
            </span>
          </div>
        </div>
      )}

      {currentStreak === 0 && (
        <div className="text-center py-2 text-sm text-gray-600">
          Start your streak today! Complete any mission to begin.
        </div>
      )}
    </Card>
  );
};

/**
 * StreakWidgetCompact - Compact version for navbar/header
 */
export const StreakWidgetCompact = () => {
  const { data: streakData } = useStreakData();
  const currentStreak = streakData?.currentStreak || 0;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 rounded-full border border-orange-200">
      <Flame size={16} className="text-orange-500" />
      <span className="font-semibold text-sm text-orange-700">
        {currentStreak}
      </span>
    </div>
  );
};
