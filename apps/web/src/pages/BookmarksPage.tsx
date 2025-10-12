// apps/web/src/pages/BookmarksPage.tsx

import { useEffect, useState } from 'react';
import { apiHelpers } from '../lib/api';
import { PostCard } from '../components/social/PostCard';
import { PostCardSkeleton } from '../components/social/PostCardSkeleton';
import { SkeletonList } from '../components/SkeletonList';
import { Button } from '../components/ui/button';
import { Bookmark } from 'lucide-react';

export default function BookmarksPage() {
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<any[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ handle: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res: any = await apiHelpers.getMeProfile();
        setCurrentUser(res.profile);
      } catch (e) {
        setCurrentUser(null);
      }
    })();

    loadBookmarks();
  }, []);

  const loadBookmarks = async (cursor?: string) => {
    try {
      if (cursor) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const res: any = await apiHelpers.getMyBookmarks(cursor ? { cursor } : undefined);

      if (cursor) {
        setPosts(prev => [...prev, ...res.items]);
      } else {
        setPosts(res.items);
      }

      setNextCursor(res.nextCursor || null);
    } catch (error) {
      console.error('Error loading bookmarks:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <h1 className="text-2xl font-bold mb-6">Posts Salvos</h1>
        <SkeletonList count={5} SkeletonComponent={PostCardSkeleton} />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Bookmark className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Posts Salvos</h1>
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-12">
          <Bookmark className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold mb-2">Nenhum post salvo</h2>
          <p className="text-muted-foreground">
            Posts salvos aparecerão aqui
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUserHandle={currentUser?.handle}
              onDeleted={() => {
                setPosts(prev => prev.filter(p => p.id !== post.id));
              }}
              onUpdated={(updatedPost) => {
                setPosts(prev => prev.map(p => p.id === updatedPost.id ? updatedPost : p));
              }}
            />
          ))}

          {nextCursor && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                onClick={() => loadBookmarks(nextCursor)}
                disabled={loadingMore}
              >
                {loadingMore ? 'Carregando...' : 'Carregar mais'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
