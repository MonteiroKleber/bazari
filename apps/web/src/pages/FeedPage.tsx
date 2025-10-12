import { useState, useCallback } from 'react';
import { CreatePostModal } from '../components/social/CreatePostModal';
import { PersonalizedFeed } from '../components/social/PersonalizedFeed';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { PullToRefreshIndicator } from '../components/mobile/PullToRefreshIndicator';
import { apiHelpers } from '../lib/api';

export default function FeedPage() {
  const [createPostOpen, setCreatePostOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [profile, setProfile] = useState<{ avatarUrl?: string | null; displayName: string; handle: string } | null>(null);

  // Load user profile
  useState(() => {
    (async () => {
      try {
        const res = await apiHelpers.getMeProfile();
        setProfile(res.profile ?? null);
      } catch (e) {
        setProfile(null);
      }
    })();
  });

  const handleRefresh = useCallback(async () => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  const { isRefreshing, pullDistance } = usePullToRefresh({
    onRefresh: handleRefresh,
    threshold: 80,
  });

  return (
    <>
      <PullToRefreshIndicator isRefreshing={isRefreshing} pullDistance={pullDistance} />
      <section className="py-0 md:py-6 mobile-safe-bottom">
        <CreatePostModal open={createPostOpen} onOpenChange={setCreatePostOpen} />

        {/* Main Content - Full Width */}
        <div className="max-w-7xl mx-auto px-4">
          <PersonalizedFeed
            key={refreshKey}
            showQuickPost={true}
            userProfile={profile}
            onCreatePost={() => setCreatePostOpen(true)}
          />
        </div>
      </section>
    </>
  );
}
