// apps/web/src/components/social/RepostButton.tsx

import { useState } from 'react';
import { Repeat2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiHelpers } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface RepostButtonProps {
  postId: string;
  initialReposted: boolean;
  initialCount: number;
}

export function RepostButton({ postId, initialReposted, initialCount }: RepostButtonProps) {
  const [reposted, setReposted] = useState(initialReposted);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);

  const handleToggleRepost = async () => {
    if (loading) return;

    // Optimistic update
    const previousReposted = reposted;
    const previousCount = count;

    setReposted(!reposted);
    setCount(reposted ? count - 1 : count + 1);
    setLoading(true);

    try {
      const response: any = reposted
        ? await apiHelpers.unrepostPost(postId)
        : await apiHelpers.repostPost(postId);

      // Update with server response
      setReposted(response.reposted || !reposted);
      setCount(response.repostsCount || count);

      if (!previousReposted) {
        toast.success('Post compartilhado!');
      }
    } catch (error) {
      // Revert on error
      setReposted(previousReposted);
      setCount(previousCount);
      toast.error('Erro ao compartilhar post. Tente novamente.');
      console.error('Repost error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleToggleRepost}
      disabled={loading}
      className={cn(
        "gap-2",
        reposted && "text-green-600 hover:text-green-700"
      )}
    >
      <Repeat2
        className={cn(
          "h-4 w-4 transition-all",
          reposted && "stroke-[2.5px]"
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
