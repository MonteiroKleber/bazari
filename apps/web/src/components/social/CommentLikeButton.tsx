import { useState } from 'react';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiHelpers } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CommentLikeButtonProps {
  postId: string;
  commentId: string;
  initialLiked: boolean;
  initialCount: number;
}

export function CommentLikeButton({
  postId,
  commentId,
  initialLiked,
  initialCount,
}: CommentLikeButtonProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);

  const handleToggleLike = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Evitar propagação se comentário for clicável

    if (loading) return;

    // Optimistic update
    const previousLiked = liked;
    const previousCount = count;

    setLiked(!liked);
    setCount(liked ? count - 1 : count + 1);
    setLoading(true);

    try {
      const response: any = liked
        ? await apiHelpers.unlikeComment(postId, commentId)
        : await apiHelpers.likeComment(postId, commentId);

      // Update com resposta do servidor
      setLiked(response.liked);
      setCount(response.likesCount);
    } catch (error) {
      // Rollback em caso de erro
      setLiked(previousLiked);
      setCount(previousCount);
      toast.error('Erro ao curtir comentário');
      console.error('Comment like error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleToggleLike}
      disabled={loading}
      className={cn(
        "gap-1 h-auto py-1 px-2 text-xs",
        liked && "text-red-600 hover:text-red-700"
      )}
    >
      <Heart
        className={cn(
          "h-3 w-3 transition-all",
          liked && "fill-current"
        )}
      />
      {count > 0 && (
        <span className="tabular-nums">
          {count}
        </span>
      )}
    </Button>
  );
}
