// apps/web/src/components/social/BookmarkButton.tsx

import { useState } from 'react';
import { Bookmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiHelpers } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface BookmarkButtonProps {
  postId: string;
  initialBookmarked: boolean;
}

export function BookmarkButton({ postId, initialBookmarked }: BookmarkButtonProps) {
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [loading, setLoading] = useState(false);

  const handleToggleBookmark = async () => {
    if (loading) return;

    const previousBookmarked = bookmarked;
    setBookmarked(!bookmarked);
    setLoading(true);

    try {
      const response: any = bookmarked
        ? await apiHelpers.unbookmarkPost(postId)
        : await apiHelpers.bookmarkPost(postId);

      setBookmarked(response.bookmarked ?? !previousBookmarked);

      if (!previousBookmarked) {
        toast.success('Post salvo!');
      } else {
        toast.success('Post removido dos salvos');
      }
    } catch (error) {
      setBookmarked(previousBookmarked);
      toast.error('Erro ao salvar post');
      console.error('Bookmark error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleToggleBookmark}
      disabled={loading}
      className={cn(
        "gap-2",
        bookmarked && "text-primary"
      )}
      title={bookmarked ? "Remover dos salvos" : "Salvar post"}
    >
      <Bookmark
        className={cn(
          "h-4 w-4 transition-all",
          bookmarked && "fill-current"
        )}
      />
    </Button>
  );
}
