import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Play, Images } from 'lucide-react';
import { apiHelpers } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MediaItem {
  id: string;
  media: Array<{
    url: string;
    type: 'image' | 'video';
    thumbnail?: string;
  }>;
  createdAt: string;
}

interface MediaGridProps {
  handle: string;
}

function MediaGridSkeleton() {
  return (
    <div className="grid grid-cols-3 md:grid-cols-4 gap-1">
      {Array.from({ length: 12 }).map((_, i) => (
        <Skeleton key={i} className="aspect-square w-full" />
      ))}
    </div>
  );
}

export function MediaGrid({ handle }: MediaGridProps) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  async function loadMedia(cursor?: string) {
    try {
      const res = await apiHelpers.getProfileMedia(handle, cursor ? { cursor } : undefined);
      if (cursor) {
        setItems((prev) => [...prev, ...res.items]);
      } else {
        setItems(res.items);
      }
      setNextCursor(res.nextCursor);
    } catch (error) {
      console.error('Error loading media:', error);
    }
  }

  useEffect(() => {
    setLoading(true);
    setItems([]);
    setNextCursor(null);
    loadMedia().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handle]);

  async function handleLoadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    await loadMedia(nextCursor);
    setLoadingMore(false);
  }

  if (loading) {
    return <MediaGridSkeleton />;
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Images className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>Nenhuma mídia publicada</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 md:grid-cols-4 gap-1">
        {items.map((item) => {
          const firstMedia = item.media[0];
          const isVideo = firstMedia?.type === 'video';
          const hasMultiple = item.media.length > 1;
          const thumbnailUrl = isVideo && firstMedia.thumbnail
            ? firstMedia.thumbnail
            : firstMedia?.url;

          return (
            <Link
              key={item.id}
              to={`/app/posts/${item.id}`}
              className="relative aspect-square group overflow-hidden bg-muted"
            >
              {thumbnailUrl && (
                <img
                  src={thumbnailUrl}
                  alt=""
                  loading="lazy"
                  className={cn(
                    "w-full h-full object-cover transition-transform duration-200",
                    "group-hover:scale-105"
                  )}
                />
              )}

              {/* Video play overlay */}
              {isVideo && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-black/50 rounded-full p-2">
                    <Play className="h-6 w-6 text-white fill-white" />
                  </div>
                </div>
              )}

              {/* Multiple media badge */}
              {hasMultiple && (
                <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded flex items-center gap-1">
                  <Images className="h-3 w-3" />
                  <span>{item.media.length}</span>
                </div>
              )}

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200" />
            </Link>
          );
        })}
      </div>

      {nextCursor && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={handleLoadMore}
            disabled={loadingMore}
          >
            {loadingMore ? 'Carregando...' : 'Carregar mais'}
          </Button>
        </div>
      )}
    </div>
  );
}
