import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, MessageCircle, ArrowRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Post {
  id: string;
  content: string;
  createdAt: string;
  likesCount: number;
  commentsCount: number;
}

interface RecentActivityProps {
  profileId?: string;
}

export function RecentActivity({ profileId }: RecentActivityProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profileId) {
      setLoading(false);
      return;
    }

    const fetchRecentPosts = async () => {
      try {
        // Primeiro, buscar o handle do perfil
        const { apiHelpers } = await import('@/lib/api');
        const profileRes = await apiHelpers.getMeProfile();

        if (!profileRes.profile?.handle) {
          setPosts([]);
          return;
        }

        // Buscar últimos 3 posts do usuário
        const response = await apiHelpers.getProfilePosts(profileRes.profile.handle, { limit: 3 });

        if (response.items && response.items.length > 0) {
          setPosts(response.items.map((item: any) => ({
            id: item.id,
            content: item.content,
            createdAt: item.createdAt,
            likesCount: item.likesCount ?? 0,
            commentsCount: item.commentsCount ?? 0,
          })));
        } else {
          setPosts([]);
        }
      } catch (error) {
        console.error('Failed to fetch recent posts:', error);
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentPosts();
  }, [profileId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Atividade Recente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (posts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Atividade Recente</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Você ainda não fez nenhum post
          </p>
          <Button asChild className="w-full" variant="outline">
            <Link to="/app/feed">Ir para o Feed</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Atividade Recente</CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link to="/app/feed" className="gap-1">
              Ver todos
              <ArrowRight className="h-3 w-3" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {posts.map((post) => (
          <div key={post.id} className="space-y-2 pb-4 border-b last:border-0 last:pb-0">
            <p className="text-sm line-clamp-2">{post.content}</p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Heart className="h-3 w-3" />
                {post.likesCount}
              </span>
              <span className="flex items-center gap-1">
                <MessageCircle className="h-3 w-3" />
                {post.commentsCount}
              </span>
              <span>
                {formatDistanceToNow(new Date(post.createdAt), {
                  addSuffix: true,
                  locale: ptBR,
                })}
              </span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
