import { useState } from 'react';
import { usePersonalizedFeed, type FeedTab } from '@/hooks/usePersonalizedFeed';
import { PostCard } from './PostCard';
import { PostCardSkeleton } from './PostCardSkeleton';
import { SkeletonList } from '../SkeletonList';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Sparkles, Users, TrendingUp } from 'lucide-react';

const TABS: { value: FeedTab; label: string; icon: React.ReactNode }[] = [
  { value: 'for-you', label: 'Para Você', icon: <Sparkles className="w-4 h-4" /> },
  { value: 'following', label: 'Seguindo', icon: <Users className="w-4 h-4" /> },
  { value: 'popular', label: 'Popular', icon: <TrendingUp className="w-4 h-4" /> },
];

export function PersonalizedFeed() {
  const [activeTab, setActiveTab] = useState<FeedTab>('for-you');
  const { posts, loading, loadingMore, hasMore, error, refresh, loadMoreRef } =
    usePersonalizedFeed({ tab: activeTab });

  const handleTabChange = (tab: FeedTab) => {
    setActiveTab(tab);
  };

  return (
    <div className="w-full">
      {/* Tabs */}
      <div className="sticky top-0 z-10 bg-background border-b">
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

      {/* Refresh Button */}
      <div className="flex justify-end p-4 border-b">
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
      <div className="divide-y">
        {/* Loading Initial */}
        {loading && (
          <div className="divide-y">
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
        {!loading && !error && posts.length > 0 && (
          <>
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={{
                  id: post.id,
                  content: post.content,
                  author: {
                    handle: post.author.handle,
                    displayName: post.author.displayName,
                    avatarUrl: post.author.avatarUrl || undefined,
                  },
                  createdAt: post.createdAt,
                  likesCount: post.likesCount,
                  commentsCount: post.commentsCount,
                }}
              />
            ))}
          </>
        )}

        {/* Empty State */}
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
        {!loading && !hasMore && posts.length > 0 && (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Você chegou ao fim do feed
          </div>
        )}
      </div>
    </div>
  );
}
