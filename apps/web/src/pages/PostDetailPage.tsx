// apps/web/src/pages/PostDetailPage.tsx

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PostCard } from '@/components/social/PostCard';
import { CommentSection } from '@/components/social/CommentSection';
import { apiHelpers } from '@/lib/api';
import { toast } from 'sonner';

interface Post {
  id: string;
  author: {
    handle: string;
    displayName: string;
    avatarUrl?: string | null;
    badges?: Array<{ slug: string; name: string; description: string; tier: number }>;
  };
  content: string;
  media?: Array<{ url: string; type: string }>;
  createdAt: string;
  likesCount?: number;
  commentsCount?: number;
  repostsCount?: number;
  isLiked?: boolean;
  isReposted?: boolean;
}

export function PostDetailPage() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<Post | null>(null);
  const [currentUserHandle, setCurrentUserHandle] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [postId]);

  const loadData = async () => {
    if (!postId) {
      setError('ID do post não fornecido');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Carregar post e usuário atual em paralelo
      const [postResponse, userResponse] = await Promise.allSettled([
        apiHelpers.getPostById(postId),
        apiHelpers.getMeProfile()
      ]);

      // Processar post
      if (postResponse.status === 'fulfilled') {
        const postData: any = postResponse.value;
        setPost(postData.post || postData);
      } else {
        throw new Error('Post não encontrado');
      }

      // Processar usuário atual
      if (userResponse.status === 'fulfilled') {
        const userData: any = userResponse.value;
        setCurrentUserHandle(userData.profile?.handle || userData.handle);
      }
      // Se falhar a busca do usuário, continua (usuário não logado)

    } catch (err: any) {
      console.error('Error loading post:', err);
      setError(err?.message || 'Erro ao carregar post');
      toast.error('Erro ao carregar post');
    } finally {
      setLoading(false);
    }
  };

  const handlePostDeleted = () => {
    toast.success('Post excluído com sucesso');
    navigate('/feed');
  };

  if (loading) {
    return (
      <div className="container max-w-2xl mx-auto p-4">
        <div className="space-y-4">
          <div className="h-10 w-24 bg-muted animate-pulse rounded" />
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex gap-3">
                <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                  <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-4 w-full bg-muted animate-pulse rounded" />
                <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="container max-w-2xl mx-auto p-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground mb-4">
              {error || 'Post não encontrado'}
            </p>
            <Button onClick={() => navigate('/feed')}>
              Ir para o Feed
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto px-4 py-2 md:py-3">
      {/* Botão Voltar */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate(-1)}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Voltar
      </Button>

      {/* Post Principal */}
      <div className="mb-4">
        <PostCard
          post={post}
          currentUserHandle={currentUserHandle}
          onDeleted={handlePostDeleted}
          onUpdated={(updatedPost) => {
            setPost(updatedPost);
          }}
        />
      </div>

      {/* Seção de Comentários */}
      <Card>
        <CardContent className="p-4">
          <h2 className="font-semibold text-lg mb-4">Comentários</h2>
          <CommentSection postId={post.id} />
        </CardContent>
      </Card>
    </div>
  );
}
