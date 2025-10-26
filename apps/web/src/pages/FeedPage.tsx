import { useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User } from 'lucide-react';
import { CreatePostModal } from '../components/social/CreatePostModal';
import { PersonalizedFeed } from '../components/social/PersonalizedFeed';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { PullToRefreshIndicator } from '../components/mobile/PullToRefreshIndicator';
import { Button } from '../components/ui/button';
import { apiHelpers } from '../lib/api';

export default function FeedPage() {
  const [createPostOpen, setCreatePostOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [profile, setProfile] = useState<{ avatarUrl?: string | null; displayName: string; handle: string } | null>(null);

  // Load user profile
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await apiHelpers.getMeProfile();
        if (active) {
          setProfile(res.profile ?? null);
        }
      } catch (e) {
        if (active) {
          setProfile(null);
        }
      }
    })();
    return () => { active = false; };
  }, []);

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
      <section className="py-2 md:py-3 mobile-safe-bottom">
        <CreatePostModal open={createPostOpen} onOpenChange={setCreatePostOpen} />

        {/* Main Content - Full Width */}
        <div className="max-w-7xl mx-auto px-4">
          {/* Feed Header - Link para perfil */}
          {profile?.handle && (
            <div className="mb-4 flex items-center justify-between">
              <h1 className="text-2xl font-bold hidden md:block">Feed</h1>
              <Button variant="outline" size="sm" asChild>
                <Link to={`/u/${profile.handle}`} className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">Meu Perfil</span>
                  <span className="sm:hidden">Perfil</span>
                </Link>
              </Button>
            </div>
          )}

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
