import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MissionTypeIcon, getMissionTypeName } from './MissionTypeIcon';
import { MissionProgress } from './MissionProgress';
import { ClaimRewardButton } from './ClaimRewardButton';
import { useUserMissionProgress } from '@/hooks/blockchain/useRewards';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Trophy, Users } from 'lucide-react';
import type { Mission } from '@/hooks/blockchain/useRewards';

/**
 * MissionCard - Display mission with progress bar and claim button
 */

interface MissionCardProps {
  mission: Mission;
  onClaimed?: () => void;
}

export const MissionCard = ({ mission, onClaimed }: MissionCardProps) => {
  const { data: userProgress, isLoading } = useUserMissionProgress(mission.id);

  const progressPercent = userProgress
    ? Math.min((userProgress.progress / mission.targetValue) * 100, 100)
    : 0;

  const canClaim = userProgress?.completed && !userProgress?.rewardsClaimed;
  const isClaimed = userProgress?.rewardsClaimed;
  const isCompleted = userProgress?.completed;

  const availableSpots = mission.maxCompletions - mission.completionCount;
  const isNearlyFull = availableSpots > 0 && availableSpots <= 10;

  return (
    <Card className="hover:shadow-lg transition-shadow h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <MissionTypeIcon type={mission.missionType} size={40} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-lg truncate">{mission.name}</h3>
                {isCompleted && (
                  <Badge variant={isClaimed ? 'default' : 'secondary'} className="shrink-0">
                    {isClaimed ? 'Claimed' : 'Complete'}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-gray-600 line-clamp-2">
                {mission.description}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {getMissionTypeName(mission.missionType)}
              </p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 flex-1">
        {/* Progress Bar */}
        {isLoading ? (
          <Skeleton className="h-12 w-full" />
        ) : (
          <MissionProgress
            current={userProgress?.progress || 0}
            target={mission.targetValue}
            label="Your Progress"
          />
        )}

        {/* Reward Amount */}
        <div className="flex items-center justify-between py-3 px-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-600" />
            <span className="text-sm font-medium text-gray-700">Reward</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-2xl font-bold text-yellow-600">
              {mission.rewardAmount.toLocaleString()}
            </span>
            <span className="text-sm text-gray-600">ZARI</span>
          </div>
        </div>

        {/* Mission Info */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          {mission.expiresAt && (
            <div className="flex items-center gap-1 text-gray-600">
              <Calendar className="h-3 w-3" />
              <span>
                Expires: {new Date(mission.expiresAt * 1000).toLocaleDateString()}
              </span>
            </div>
          )}
          <div className="flex items-center gap-1 text-gray-600">
            <Users className="h-3 w-3" />
            <span>
              {mission.completionCount} / {mission.maxCompletions} claimed
            </span>
          </div>
        </div>

        {isNearlyFull && (
          <Badge variant="destructive" className="w-full justify-center">
            Only {availableSpots} spots left!
          </Badge>
        )}
      </CardContent>

      <CardFooter>
        {canClaim ? (
          <ClaimRewardButton
            missionId={mission.id}
            rewardAmount={mission.rewardAmount}
            onSuccess={onClaimed}
            className="w-full"
          />
        ) : isClaimed ? (
          <Badge variant="default" className="w-full justify-center py-3">
            Reward Claimed
          </Badge>
        ) : availableSpots <= 0 ? (
          <Badge variant="secondary" className="w-full justify-center py-3">
            Mission Full
          </Badge>
        ) : (
          <div className="w-full text-center py-2 text-sm text-gray-600">
            {progressPercent.toFixed(0)}% Complete - Keep going!
          </div>
        )}
      </CardFooter>
    </Card>
  );
};

/**
 * MissionCardSkeleton - Loading skeleton for mission card
 */
export const MissionCardSkeleton = () => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-16 w-full rounded-lg" />
      </CardContent>
      <CardFooter>
        <Skeleton className="h-10 w-full" />
      </CardFooter>
    </Card>
  );
};
