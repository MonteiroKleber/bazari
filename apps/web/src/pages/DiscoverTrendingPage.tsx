import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus, Hash, MessageSquare } from 'lucide-react';

interface TrendingTopic {
  tag: string;
  count: number;
  score: number;
  growthRate?: number | null;
  samplePosts?: Array<{
    id: string;
    content: string;
    createdAt: string;
    author: {
      handle: string;
      displayName: string;
      avatarUrl?: string | null;
    };
  }>;
}

export default function DiscoverTrendingPage() {
  const [topics, setTopics] = useState<TrendingTopic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTopics();
  }, []);

  const loadTopics = async () => {
    try {
      const response = await api.get<{ items: TrendingTopic[] }>('/feed/trending', {
        limit: '20',
      });
      setTopics(response.items);
    } catch (error) {
      console.error('Error loading trending topics:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-2 md:py-3 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <TrendingUp className="w-8 h-8" />
          Trending Topics
        </h1>
        <p className="text-muted-foreground">
          Descubra os assuntos mais comentados nas últimas 24 horas
        </p>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="h-6 bg-muted rounded animate-pulse w-1/3" />
                  <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
                  <div className="h-20 bg-muted rounded animate-pulse" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Topics List */}
      {!loading && topics.length > 0 && (
        <div className="space-y-4">
          {topics.map((topic, index) => (
            <TrendingTopicCard key={topic.tag} topic={topic} rank={index + 1} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && topics.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <TrendingUp className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum trending topic</h3>
            <p className="text-muted-foreground">
              Seja o primeiro a criar posts com hashtags!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface TrendingTopicCardProps {
  topic: TrendingTopic;
  rank: number;
}

function TrendingTopicCard({ topic, rank }: TrendingTopicCardProps) {
  const growthRate = topic.growthRate || 0;

  const getGrowthIcon = () => {
    if (growthRate > 10) {
      return <TrendingUp className="w-5 h-5 text-green-500" />;
    } else if (growthRate < -10) {
      return <TrendingDown className="w-5 h-5 text-red-500" />;
    } else {
      return <Minus className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getGrowthColor = () => {
    if (growthRate > 10) return 'text-green-500';
    if (growthRate < -10) return 'text-red-500';
    return 'text-muted-foreground';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-4">
          <div className="text-2xl font-bold text-muted-foreground w-8">{rank}</div>

          <div className="flex-1">
            <Link
              to={`/search?q=${encodeURIComponent(`#${topic.tag}`)}`}
              className="inline-flex items-center gap-2 group"
            >
              <Hash className="w-6 h-6 text-primary" />
              <CardTitle className="text-2xl group-hover:underline">{topic.tag}</CardTitle>
            </Link>

            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <MessageSquare className="w-4 h-4" />
                <span>{topic.count} posts</span>
              </div>

              {growthRate !== 0 && (
                <div className="flex items-center gap-1">
                  {getGrowthIcon()}
                  <span className={`text-sm font-semibold ${getGrowthColor()}`}>
                    {growthRate > 0 ? '+' : ''}
                    {growthRate.toFixed(0)}%
                  </span>
                  <span className="text-xs text-muted-foreground">vs 24h</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      {topic.samplePosts && topic.samplePosts.length > 0 && (
        <CardContent className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">Posts recentes:</p>

          {topic.samplePosts.map((post) => (
            <Link
              key={post.id}
              to={`/search?q=${encodeURIComponent(`#${topic.tag}`)}`}
              className="block p-3 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start gap-2 mb-2">
                <span className="font-semibold text-sm">@{post.author.handle}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(post.createdAt).toLocaleDateString('pt-BR')}
                </span>
              </div>
              <p className="text-sm line-clamp-2">{post.content}</p>
            </Link>
          ))}

          <Link
            to={`/search?q=${encodeURIComponent(`#${topic.tag}`)}`}
            className="inline-block text-sm text-primary hover:underline"
          >
            Ver todos os posts →
          </Link>
        </CardContent>
      )}
    </Card>
  );
}
