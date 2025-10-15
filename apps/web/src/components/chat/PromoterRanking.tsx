import { useState, useEffect } from 'react';
import { Trophy, TrendingUp, Award } from 'lucide-react';
import api from '@/lib/api';

interface PromoterRankingEntry {
  rank: number;
  profile: {
    id: string;
    handle: string;
    displayName: string;
    avatarUrl?: string;
    reputationScore: number;
    reputationTier: string;
  };
  stats: {
    totalCommission: string;
    salesCount: number;
  };
}

interface PromoterRankingProps {
  period?: '7d' | '30d' | '90d' | 'all';
  limit?: number;
}

const periodLabels = {
  '7d': 'Últimos 7 dias',
  '30d': 'Últimos 30 dias',
  '90d': 'Últimos 90 dias',
  'all': 'Todos os tempos',
};

export function PromoterRanking({ period = '30d', limit = 10 }: PromoterRankingProps) {
  const [ranking, setRanking] = useState<PromoterRankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState(period);

  useEffect(() => {
    fetchRanking();
  }, [selectedPeriod]);

  const fetchRanking = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/chat/ranking/promoters?period=${selectedPeriod}&limit=${limit}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        setRanking(data.data.ranking);
      }
    } catch (error) {
      console.error('Failed to fetch ranking:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (rank === 2) return <Award className="h-5 w-5 text-gray-400" />;
    if (rank === 3) return <Award className="h-5 w-5 text-amber-600" />;
    return <span className="text-sm font-medium text-muted-foreground">#{rank}</span>;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          <h3 className="font-semibold">Ranking de Promotores</h3>
        </div>

        <select
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value as any)}
          className="text-sm px-3 py-1 border rounded-md"
        >
          {Object.entries(periodLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Ranking List */}
      {loading ? (
        <div className="text-center text-sm text-muted-foreground py-8">
          Carregando ranking...
        </div>
      ) : ranking.length === 0 ? (
        <div className="text-center text-sm text-muted-foreground py-8">
          Nenhum promotor encontrado neste período
        </div>
      ) : (
        <div className="space-y-2">
          {ranking.map((entry) => (
            <div
              key={entry.profile.id}
              className={`flex items-center gap-3 p-3 rounded-lg border ${
                entry.rank <= 3 ? 'bg-accent/50' : 'bg-card'
              }`}
            >
              {/* Rank */}
              <div className="flex items-center justify-center w-10">
                {getRankIcon(entry.rank)}
              </div>

              {/* Avatar */}
              <div className="flex-shrink-0">
                {entry.profile.avatarUrl ? (
                  <img
                    src={entry.profile.avatarUrl}
                    alt={entry.profile.displayName}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-xs font-medium">
                      {entry.profile.displayName[0]?.toUpperCase()}
                    </span>
                  </div>
                )}
              </div>

              {/* Profile Info */}
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{entry.profile.displayName}</div>
                <div className="text-xs text-muted-foreground">@{entry.profile.handle}</div>
              </div>

              {/* Stats */}
              <div className="text-right">
                <div className="font-semibold text-green-600">
                  {parseFloat(entry.stats.totalCommission).toFixed(2)} BZR
                </div>
                <div className="text-xs text-muted-foreground">
                  {entry.stats.salesCount} vendas
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
