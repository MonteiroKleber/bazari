// apps/web/src/components/social/LikeButton.tsx

import { useState } from 'react';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiHelpers } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface LikeButtonProps {
  postId: string;
  initialLiked: boolean;
  initialCount: number;
}

export function LikeButton({ postId, initialLiked, initialCount }: LikeButtonProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);

  const handleToggleLike = async () => {
    if (loading) return;

    // Optimistic update
    const previousLiked = liked;
    const previousCount = count;

    setLiked(!liked);
    setCount(liked ? count - 1 : count + 1);
    setLoading(true);

    try {
      const response: any = liked
        ? await apiHelpers.unlikePost(postId)
        : await apiHelpers.likePost(postId);

      // Update with server response
      setLiked(response.liked);
      setCount(response.likesCount);
    } catch (error) {
      // Revert on error
      setLiked(previousLiked);
      setCount(previousCount);
      toast.error('Erro ao curtir post. Tente novamente.');
      console.error('Like error:', error);
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
        "gap-2",
        liked && "text-red-500 hover:text-red-600"
      )}
    >
      <Heart
        className={cn(
          "h-4 w-4 transition-all",
          liked && "fill-current"
        )}
      />
      {count > 0 && (
        <span className="text-sm tabular-nums">
          {count}
        </span>
      )}
    </Button>
  );
}
