import { useStreakData } from '@/hooks/blockchain/useRewards';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StreakCalendar, StreakWidget } from '@/components/rewards';
import { Skeleton } from '@/components/ui/skeleton';
import { Flame, TrendingUp, Award, Trophy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

/**
 * StreakHistoryPage - Streak tracking and milestones
 *
 * Route: /app/rewards/streaks
 *
 * Features:
 * - Current and longest streak display
 * - 30-day activity calendar
 * - Milestone tracking
 * - Streak statistics
 */

const STREAK_MILESTONES = [
  {
    days: 7,
    reward: 1000,
    label: '1 Week Streak',
    icon: '🔥',
    description: 'Keep it up for 7 days straight',
  },
  {
    days: 30,
    reward: 5000,
    label: '1 Month Streak',
    icon: '🚀',
    description: 'Maintain activity for 30 consecutive days',
  },
  {
    days: 100,
    reward: 20000,
    label: '100 Day Streak',
    icon: '💪',
    description: 'Epic dedication - 100 days in a row',
  },
  {
    days: 365,
    reward: 100000,
    label: '1 Year Streak',
    icon: '👑',
    description: 'Legendary commitment - a full year!',
  },
];

export const StreakHistoryPage = () => {
  const { data: streakData, isLoading } = useStreakData();

  const currentStreak = streakData?.currentStreak || 0;
  const longestStreak = streakData?.longestStreak || 0;

  // Calculate which milestones are achieved
  const achievedMilestones = STREAK_MILESTONES.filter((m) => longestStreak >= m.days);
  const nextMilestone = STREAK_MILESTONES.find((m) => m.days > currentStreak);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <Skeleton className="h-12 w-64 mb-6" />
        <div className="space-y-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-4xl font-bold flex items-center gap-3 mb-2">
          <Flame className="text-orange-500" size={36} />
          Streak History
        </h1>
        <p className="text-gray-600">
          Track your daily activity and maintain your winning streak
        </p>
      </div>

      {/* Streak Widget */}
      <div className="mb-6">
        <StreakWidget />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-2">
              <Flame className="text-orange-500" size={24} />
              <span className="text-sm text-gray-600 font-medium">Current Streak</span>
            </div>
            <p className="text-4xl font-bold text-orange-600">{currentStreak} days</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="text-green-500" size={24} />
              <span className="text-sm text-gray-600 font-medium">Longest Streak</span>
            </div>
            <p className="text-4xl font-bold text-green-600">{longestStreak} days</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-2">
              <Trophy className="text-purple-500" size={24} />
              <span className="text-sm text-gray-600 font-medium">Milestones</span>
            </div>
            <p className="text-4xl font-bold text-purple-600">
              {achievedMilestones.length} / {STREAK_MILESTONES.length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Calendar */}
      <div className="mb-6">
        <StreakCalendar days={30} />
      </div>

      {/* Milestones */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award size={24} className="text-yellow-600" />
            Milestones & Rewards
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {STREAK_MILESTONES.map((milestone, idx) => {
              const isAchieved = longestStreak >= milestone.days;
              const isCurrent = nextMilestone?.days === milestone.days;

              return (
                <div
                  key={idx}
                  className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                    isAchieved
                      ? 'bg-green-50 border-green-300'
                      : isCurrent
                      ? 'bg-blue-50 border-blue-300'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`text-4xl ${
                        isAchieved ? 'grayscale-0' : 'grayscale opacity-50'
                      }`}
                    >
                      {milestone.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg">{milestone.label}</h3>
                        {isAchieved && (
                          <Badge variant="default" className="bg-green-600">
                            Achieved
                          </Badge>
                        )}
                        {isCurrent && (
                          <Badge variant="secondary" className="bg-blue-600 text-white">
                            In Progress
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{milestone.description}</p>
                      {isCurrent && (
                        <p className="text-sm font-semibold text-blue-600 mt-1">
                          {milestone.days - currentStreak} more days to unlock
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <Trophy
                        className={`${
                          isAchieved ? 'text-yellow-600' : 'text-gray-400'
                        }`}
                        size={20}
                      />
                      <span className="font-bold text-xl text-yellow-600">
                        {milestone.reward.toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">ZARI</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Tips */}
      <Card className="mt-6 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200">
        <CardContent className="pt-6">
          <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
            <Flame className="text-orange-500" />
            How to Maintain Your Streak
          </h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-blue-600">•</span>
              <span>
                <strong>Daily Activity:</strong> Complete at least one mission or transaction
                each day
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600">•</span>
              <span>
                <strong>Set Reminders:</strong> Enable notifications to never miss a day
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600">•</span>
              <span>
                <strong>Weekend Activity:</strong> Streaks count every day - don't forget
                weekends!
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600">•</span>
              <span>
                <strong>Milestone Bonuses:</strong> Earn bonus ZARI for reaching streak
                milestones
              </span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default StreakHistoryPage;
