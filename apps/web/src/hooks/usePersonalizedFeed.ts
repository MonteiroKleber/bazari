import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/lib/api';

export type FeedTab = 'for-you' | 'following' | 'popular';

interface Post {
  id: string;
  content: string;
  authorId: string;
  author: {
    handle: string;
    displayName: string;
    avatarUrl?: string | null;
  };
  createdAt: string;
  likesCount: number;
  commentsCount: number;
  score?: number;
}

interface FeedResponse {
  items: Post[];
  nextCursor: string | null;
}

interface UsePersonalizedFeedOptions {
  tab: FeedTab;
  limit?: number;
}

export function usePersonalizedFeed({ tab, limit = 20 }: UsePersonalizedFeedOptions) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // Cache de posts visualizados (5 min TTL)
  const cacheRef = useRef<Map<string, { data: Post[]; timestamp: number; cursor: string | null }>>(
    new Map()
  );
  const CACHE_TTL = 5 * 60 * 1000;

  const getEndpoint = useCallback(() => {
    switch (tab) {
      case 'for-you':
        return '/feed/personalized';
      case 'following':
        return '/feed/chronological';
      case 'popular':
        return '/feed/personalized'; // TODO: criar endpoint de popular
      default:
        return '/feed/personalized';
    }
  }, [tab]);

  const loadPosts = useCallback(
    async (cursor?: string | null) => {
      try {
        const cacheKey = `${tab}-${cursor || 'initial'}`;
        const cached = cacheRef.current.get(cacheKey);

        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
          setPosts(cursor ? (prev) => [...prev, ...cached.data] : cached.data);
          setNextCursor(cached.cursor);
          setHasMore(!!cached.cursor);
          return;
        }

        const endpoint = getEndpoint();
        const params: Record<string, string> = { limit: limit.toString() };
        if (cursor) params.cursor = cursor;

        const response = await api.get<FeedResponse>(endpoint, params);

        // Cache resposta
        cacheRef.current.set(cacheKey, {
          data: response.items,
          timestamp: Date.now(),
          cursor: response.nextCursor,
        });

        setPosts((prev) => (cursor ? [...prev, ...response.items] : response.items));
        setNextCursor(response.nextCursor);
        setHasMore(!!response.nextCursor);
        setError(null);
      } catch (err) {
        console.error('Error loading feed:', err);
        setError(err instanceof Error ? err.message : 'Failed to load feed');
      }
    },
    [tab, limit, getEndpoint]
  );

  // Carregar feed inicial
  useEffect(() => {
    setLoading(true);
    setPosts([]);
    setNextCursor(null);
    setHasMore(true);

    loadPosts(null).finally(() => setLoading(false));
  }, [tab, loadPosts]);

  // Load more quando chegar em 80%
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !nextCursor) return;

    setLoadingMore(true);
    await loadPosts(nextCursor);
    setLoadingMore(false);
  }, [loadingMore, hasMore, nextCursor, loadPosts]);

  // IntersectionObserver para infinite scroll
  useEffect(() => {
    if (!loadMoreRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: '200px' } // Trigger 200px antes do final
    );

    observerRef.current.observe(loadMoreRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loadMore]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setPosts([]);
    setNextCursor(null);
    setHasMore(true);
    cacheRef.current.clear();
    await loadPosts(null);
    setLoading(false);
  }, [loadPosts]);

  return {
    posts,
    loading,
    loadingMore,
    hasMore,
    error,
    loadMore,
    refresh,
    loadMoreRef,
  };
}
