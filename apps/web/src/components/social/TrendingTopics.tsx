import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus, Hash } from 'lucide-react';

interface TrendingTopic {
  tag: string;
  count: number;
  score: number;
  growthRate?: number | null;
}

export function TrendingTopics() {
  const [topics, setTopics] = useState<TrendingTopic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTopics();

    // Refresh a cada 5 minutos
    const interval = setInterval(loadTopics, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadTopics = async () => {
    try {
      const response = await api.get<{ items: TrendingTopic[] }>('/feed/trending', {
        limit: '10',
      });
      setTopics(response.items);
    } catch (error) {
      console.error('Error loading trending topics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Trending Topics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded animate-pulse w-2/3" />
                <div className="h-3 bg-muted rounded animate-pulse w-1/3" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (topics.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Trending Topics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {topics.map((topic, index) => (
          <TrendingTopicItem key={topic.tag} topic={topic} rank={index + 1} />
        ))}

        <Link to="/app/discover/trending">
          <button className="w-full text-sm text-primary hover:underline py-2">
            Ver todos os trending
          </button>
        </Link>
      </CardContent>
    </Card>
  );
}

interface TrendingTopicItemProps {
  topic: TrendingTopic;
  rank: number;
}

function TrendingTopicItem({ topic, rank }: TrendingTopicItemProps) {
  const growthRate = topic.growthRate || 0;

  const getGrowthIcon = () => {
    if (growthRate > 10) {
      return <TrendingUp className="w-4 h-4 text-green-500" />;
    } else if (growthRate < -10) {
      return <TrendingDown className="w-4 h-4 text-red-500" />;
    } else {
      return <Minus className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getGrowthColor = () => {
    if (growthRate > 10) return 'text-green-500';
    if (growthRate < -10) return 'text-red-500';
    return 'text-muted-foreground';
  };

  return (
    <Link
      to={`/search?q=${encodeURIComponent(`#${topic.tag}`)}`}
      className="block hover:bg-muted/50 rounded-lg p-2 -mx-2 transition-colors"
    >
      <div className="flex items-start gap-3">
        <div className="text-sm font-medium text-muted-foreground w-6">{rank}</div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <Hash className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm truncate">{topic.tag}</span>
          </div>

          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground">{topic.count} posts</span>

            {growthRate !== 0 && (
              <div className="flex items-center gap-1">
                {getGrowthIcon()}
                <span className={`text-xs font-medium ${getGrowthColor()}`}>
                  {Math.abs(growthRate).toFixed(0)}%
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
