import { useState, useRef, useCallback, useMemo } from 'react';
import { usePersonalizedFeed, type FeedTab } from '@/hooks/usePersonalizedFeed';
import { useNewPostsIndicator } from '@/hooks/useNewPostsIndicator';
import { useFeedFilters } from '@/hooks/useFeedFilters';
import { PostCard } from './PostCard';
import { PostCardSkeleton } from './PostCardSkeleton';
import { NewPostsBanner } from './NewPostsBanner';
import { FeedFilterDropdown } from './FeedFilterDropdown';
import { SkeletonList } from '../SkeletonList';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, RefreshCw, Sparkles, Users, TrendingUp, Filter } from 'lucide-react';

const TABS: { value: FeedTab; label: string; icon: React.ReactNode }[] = [
  { value: 'for-you', label: 'Para Você', icon: <Sparkles className="w-4 h-4" /> },
  { value: 'following', label: 'Seguindo', icon: <Users className="w-4 h-4" /> },
  { value: 'popular', label: 'Popular', icon: <TrendingUp className="w-4 h-4" /> },
];

interface PersonalizedFeedProps {
  showQuickPost?: boolean;
  userProfile?: {
    avatarUrl?: string | null;
    displayName: string;
    handle?: string;
  } | null;
  onCreatePost?: () => void;
}

export function PersonalizedFeed({ showQuickPost = false, userProfile, onCreatePost }: PersonalizedFeedProps) {
  const [activeTab, setActiveTab] = useState<FeedTab>('for-you');
  const { posts, loading, loadingMore, hasMore, error, refresh, loadMoreRef, setPosts } =
    usePersonalizedFeed({ tab: activeTab });
  const { newPostsCount, clearAndRefresh } = useNewPostsIndicator({ tab: activeTab });
  const { filters, toggleFilter, resetFilters, activeFiltersCount, filterPosts } = useFeedFilters();
  const feedContainerRef = useRef<HTMLDivElement>(null);

  // Apply filters to posts
  const filteredPosts = useMemo(() => {
    return filterPosts(posts as Array<{ kind?: string; media?: unknown[] } & typeof posts[number]>);
  }, [posts, filterPosts]);

  const handleTabChange = (tab: FeedTab) => {
    setActiveTab(tab);
  };

  const handleLoadNewPosts = useCallback(() => {
    clearAndRefresh();
    refresh();
    // Scroll to top
    feedContainerRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [clearAndRefresh, refresh]);

  return (
    <div className="w-full" ref={feedContainerRef}>
      {/* New Posts Banner */}
      <NewPostsBanner
        count={newPostsCount}
        onLoad={handleLoadNewPosts}
        className="top-16"
      />

      {/* Tabs - Sticky */}
      <div className="sticky top-0 z-20 bg-background border-b backdrop-blur-sm bg-background/95">
        <div className="flex items-center">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => handleTabChange(tab.value)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === tab.value
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Quick Post - Sticky below tabs */}
      {showQuickPost && userProfile && (
        <div className="sticky top-[49px] z-10 bg-background border-b">
          <Card className="rounded-none border-0 border-b">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                {userProfile.avatarUrl ? (
                  <img
                    src={userProfile.avatarUrl}
                    alt={userProfile.displayName}
                    className="h-10 w-10 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-muted flex-shrink-0" />
                )}

                <Button
                  variant="outline"
                  className="flex-1 justify-start text-muted-foreground"
                  onClick={onCreatePost}
                >
                  O que você está pensando?
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Refresh Button and Filters */}
      <div className="flex justify-end gap-2 p-4 border-b bg-background/50">
        <FeedFilterDropdown
          filters={filters}
          activeFiltersCount={activeFiltersCount}
          onToggleFilter={toggleFilter}
          onResetFilters={resetFilters}
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={refresh}
          disabled={loading}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Feed Content */}
      <div className="space-y-3">
        {/* Loading Initial */}
        {loading && (
          <div className="space-y-3">
            <SkeletonList count={5} SkeletonComponent={PostCardSkeleton} />
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={refresh} variant="outline">
              Tentar Novamente
            </Button>
          </div>
        )}

        {/* Posts */}
        {!loading && !error && filteredPosts.length > 0 && (
          <>
            {filteredPosts.map((post) => (
              <PostCard
                key={post.id}
                post={{
                  id: post.id,
                  content: post.content,
                  kind: (post as any).kind,
                  media: (post as any).media,
                  author: {
                    handle: post.author.handle,
                    displayName: post.author.displayName,
                    avatarUrl: post.author.avatarUrl || undefined,
                  },
                  createdAt: post.createdAt,
                  likesCount: post.likesCount,
                  repostsCount: (post as any).repostsCount || 0,
                  commentsCount: post.commentsCount,
                  isLiked: (post as any).isLiked || false,
                  isReposted: (post as any).isReposted || false,
                  reactions: (post as any).reactions,
                  userReaction: (post as any).userReaction,
                }}
                currentUserHandle={userProfile?.handle}
                onDeleted={() => {
                  setPosts(prev => prev.filter(p => p.id !== post.id));
                }}
                onUpdated={(updatedPost) => {
                  setPosts(prev => prev.map(p => p.id === updatedPost.id ? updatedPost : p));
                }}
              />
            ))}
          </>
        )}

        {/* Empty State - Filters removed all posts */}
        {!loading && !error && posts.length > 0 && filteredPosts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <Filter className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum post corresponde aos filtros</h3>
            <p className="text-muted-foreground mb-4">
              Tente ajustar os filtros para ver mais conteúdo
            </p>
            <Button onClick={resetFilters} variant="outline">
              Limpar filtros
            </Button>
          </div>
        )}

        {/* Empty State - No posts at all */}
        {!loading && !error && posts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <Sparkles className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum post encontrado</h3>
            <p className="text-muted-foreground mb-4">
              {activeTab === 'following'
                ? 'Siga pessoas para ver posts aqui'
                : 'Seja o primeiro a postar!'}
            </p>
            <Button onClick={refresh} variant="outline">
              Atualizar
            </Button>
          </div>
        )}

        {/* Loading More */}
        {loadingMore && (
          <div className="py-8 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Intersection Observer Trigger */}
        {!loading && !loadingMore && hasMore && (
          <div ref={loadMoreRef} className="py-4 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* End of Feed */}
        {!loading && !hasMore && filteredPosts.length > 0 && (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Você chegou ao fim do feed
          </div>
        )}
      </div>
    </div>
  );
}
