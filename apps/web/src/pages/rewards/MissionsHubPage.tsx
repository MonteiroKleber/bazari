import { useState } from 'react';
import { useMissions } from '@/hooks/blockchain/useRewards';
import {
  MissionCard,
  MissionCardSkeleton,
  MissionFilters,
  StreakWidget,
  CashbackBalance,
  type MissionFilter,
} from '@/components/rewards';
import { Input } from '@/components/ui/input';
import { Search, Target, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { Mission } from '@/hooks/blockchain/useRewards';

/**
 * MissionsHubPage - Main missions dashboard
 *
 * Route: /app/rewards/missions
 *
 * Features:
 * - View all active missions
 * - Filter by status (All, Active, Completed)
 * - Search missions by name
 * - See streak widget
 * - See ZARI balance
 * - Real-time updates
 */

export const MissionsHubPage = () => {
  const { data: missions, isLoading, refetch } = useMissions();
  const [filter, setFilter] = useState<MissionFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter missions by status and search query
  const filteredMissions = missions?.filter((mission: Mission) => {
    // Filter by completion status
    if (filter === 'active' && mission.completionCount >= mission.maxCompletions) {
      return false;
    }
    if (filter === 'completed' && mission.completionCount < mission.maxCompletions) {
      return false;
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return (
        mission.name.toLowerCase().includes(query) ||
        mission.description.toLowerCase().includes(query)
      );
    }

    return true;
  });

  // Count missions by status
  const counts = {
    all: missions?.length || 0,
    active: missions?.filter((m: Mission) => m.completionCount < m.maxCompletions).length || 0,
    completed: missions?.filter((m: Mission) => m.completionCount >= m.maxCompletions).length || 0,
  };

  // Stats
  const totalRewards = missions?.reduce((sum: number, m: Mission) => sum + m.rewardAmount, 0) || 0;
  const activeMissions = counts.active;

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold flex items-center gap-3 mb-2">
              <Target className="text-purple-600" size={36} />
              Missions Hub
            </h1>
            <p className="text-gray-600">
              Complete missions to earn ZARI tokens and unlock rewards
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Active Missions</p>
                  <p className="text-3xl font-bold text-purple-600">{activeMissions}</p>
                </div>
                <Target className="text-purple-200" size={48} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Rewards</p>
                  <p className="text-3xl font-bold text-yellow-600">
                    {totalRewards.toLocaleString()}
                  </p>
                </div>
                <TrendingUp className="text-yellow-200" size={48} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Completion Rate</p>
                  <p className="text-3xl font-bold text-green-600">
                    {counts.all > 0
                      ? `${((counts.completed / counts.all) * 100).toFixed(0)}%`
                      : '0%'}
                  </p>
                </div>
                <div className="text-green-200 text-5xl font-bold">%</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Widgets Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <StreakWidget />
        <CashbackBalance
          onViewHistory={() => (window.location.href = '/app/rewards/cashback')}
        />
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <Input
            placeholder="Search missions by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <MissionFilters value={filter} onChange={setFilter} counts={counts} />
      </div>

      {/* Missions Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <MissionCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredMissions && filteredMissions.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMissions.map((mission: Mission) => (
            <MissionCard key={mission.id} mission={mission} onClaimed={refetch} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="mb-4">
            <Target className="mx-auto text-gray-300" size={64} />
          </div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            {searchQuery ? 'No missions found' : 'No missions available'}
          </h3>
          <p className="text-gray-500">
            {searchQuery
              ? 'Try adjusting your search or filters'
              : 'Check back soon for new missions!'}
          </p>
        </div>
      )}
    </div>
  );
};

export default MissionsHubPage;
