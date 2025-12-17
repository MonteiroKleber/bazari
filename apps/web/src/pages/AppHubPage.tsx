import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Settings, FileText, Users, Bell, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AppLauncher, AppSearch } from '@/components/platform';
import { useInstalledApps } from '@/platform/hooks';
import { useUserAppsStore } from '@/platform/store';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { WhoToFollow } from '@/components/social/WhoToFollow';
import { TrendingTopics } from '@/components/social/TrendingTopics';
import { ReputationBadge } from '@/components/profile/ReputationBadge';
import { HandleBadge } from '@/components/ui/HandleBadge';
import { TestnetWelcomeModal } from '@/components/onboarding/TestnetWelcomeModal';
import { TestnetBanner } from '@/components/TestnetBanner';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { PullToRefreshIndicator } from '@/components/mobile/PullToRefreshIndicator';
import { apiHelpers } from '@/lib/api';

type MeProfile = {
  id: string;
  handle: string;
  displayName: string;
  avatarUrl?: string | null;
  bio?: string | null;
  reputationScore?: number;
  reputationTier?: string;
};

type Stats = {
  posts: number;
  followers: number;
  notifications: number;
  reputation: number;
};

// KPI Pill Component
function KPIPill({
  icon: Icon,
  label,
  value,
  badge
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  badge?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg min-w-fit relative">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <div className="flex items-center gap-1">
        <span className="font-semibold text-sm">{value}</span>
        <span className="text-xs text-muted-foreground hidden sm:inline">{label}</span>
      </div>
      {badge && (
        <div className="absolute -top-1 -right-1">
          <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
        </div>
      )}
    </div>
  );
}

export default function AppHubPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const { apps, pinnedApps, unpinnedApps, count } = useInstalledApps();
  const { recordAppUsage } = useUserAppsStore();

  // Profile state
  const [profile, setProfile] = useState<MeProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [stats, setStats] = useState<Stats>({
    posts: 0,
    followers: 0,
    notifications: 0,
    reputation: 0,
  });

  const loadData = useCallback(async () => {
    let active = true;
    setLoadingProfile(true);

    try {
      const res = await apiHelpers.getMeProfile();
      if (active && res.profile) {
        setProfile(res.profile);

        // Fetch real data from backend
        const [notificationsRes, profileData] = await Promise.all([
          apiHelpers.getNotifications({ unreadOnly: true }).catch(() => ({ unreadCount: 0 })),
          apiHelpers.getProfile(res.profile.handle).catch(() => ({ profile: null })),
        ]);

        if (active) {
          setStats({
            posts: profileData?.profile?.postsCount ?? 0,
            followers: profileData?.profile?.followersCount ?? 0,
            notifications: notificationsRes.unreadCount ?? 0,
            reputation: profileData?.profile?.reputationScore ?? 0,
          });
        }
      }
    } catch (e: unknown) {
      if (active) {
        setProfile(null);
      }
    } finally {
      if (active) setLoadingProfile(false);
    }

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = useCallback(async () => {
    await loadData();
  }, [loadData]);

  const { isRefreshing, pullDistance } = usePullToRefresh({
    onRefresh: handleRefresh,
    threshold: 80,
  });

  // Filtrar por busca
  const filteredApps = searchQuery
    ? apps.filter(
        (app) =>
          app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          app.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : null;

  const handleAppClick = (appId: string) => {
    recordAppUsage(appId);
  };

  const handleGoToPublicProfile = () => {
    if (profile?.handle) navigate(`/u/${profile.handle}`);
  };

  // Show onboarding if no profile
  if (!loadingProfile && !profile) {
    return (
      <section className="container mx-auto px-4 py-10 pt-6 mobile-safe-bottom">
        <Card>
          <CardContent className="pt-6 space-y-4">
            <h2 className="text-xl font-semibold">Bem-vindo ao Bazari!</h2>
            <p className="text-muted-foreground">
              Complete seu perfil para começar a interagir com a comunidade.
            </p>
            <Button onClick={() => navigate('/app/profile/edit')} className="w-full">
              Criar Perfil
            </Button>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <>
      <TestnetWelcomeModal />
      <PullToRefreshIndicator isRefreshing={isRefreshing} pullDistance={pullDistance} />

      <div className="container mx-auto px-4 py-10 pt-6 mobile-safe-bottom">
        <TestnetBanner />

        {/* SECTION 1: User Header (Compact) */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={profile?.avatarUrl || undefined} alt={profile?.displayName} />
                  <AvatarFallback>{profile?.displayName?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-lg font-semibold leading-tight">
                      Olá, {profile?.displayName?.split(' ')[0] || 'Usuário'}!
                    </h1>
                    {profile?.reputationScore !== undefined && (
                      <ReputationBadge
                        score={profile.reputationScore}
                        tier={(profile.reputationTier as 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond') || 'bronze'}
                        size="sm"
                      />
                    )}
                  </div>
                  {profile?.handle && (
                    <HandleBadge handle={profile.handle} size="sm" showIcon={true} />
                  )}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={handleGoToPublicProfile}>
                Ver Perfil
              </Button>
            </div>

            {/* SECTION 2: KPIs (Horizontal scroll on mobile) */}
            <div className="mt-4 flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
              <KPIPill icon={FileText} label="Posts" value={stats.posts} />
              <KPIPill icon={Users} label="Seguidores" value={stats.followers} />
              <KPIPill icon={Bell} label="Notificações" value={stats.notifications} badge={stats.notifications > 0} />
              <KPIPill icon={TrendingUp} label="Reputação" value={stats.reputation} />
            </div>
          </CardContent>
        </Card>

        {/* SECTION 3: My Apps */}
        <div className="mb-6">
          {/* Apps Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Meus Apps</h2>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" asChild>
                <Link to="/app/settings/apps">
                  <Settings className="w-4 h-4" />
                </Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/app/store">
                  <Plus className="w-4 h-4 mr-1" />
                  Adicionar
                </Link>
              </Button>
            </div>
          </div>

          {/* Search */}
          <AppSearch
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Buscar nos seus apps..."
            className="mb-4"
          />

          {/* Search Results */}
          {filteredApps ? (
            <div className="mb-4">
              <p className="text-sm text-muted-foreground mb-3">
                {filteredApps.length} resultado(s)
              </p>
              <AppLauncher
                apps={filteredApps}
                columns={3}
                emptyMessage="Nenhum app encontrado"
                onAppClick={(app) => handleAppClick(app.id)}
              />
            </div>
          ) : (
            <>
              {/* Pinned Apps */}
              {pinnedApps.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">Fixados</h3>
                  <AppLauncher
                    apps={pinnedApps}
                    columns={3}
                    onAppClick={(app) => handleAppClick(app.id)}
                  />
                </div>
              )}

              {/* All Apps */}
              {count > 0 && (
                <div>
                  {pinnedApps.length > 0 && (
                    <h3 className="text-sm font-medium text-muted-foreground mb-3">Todos</h3>
                  )}
                  <AppLauncher
                    apps={unpinnedApps.length > 0 ? unpinnedApps : apps}
                    columns={3}
                    emptyMessage="Nenhum app instalado"
                    onAppClick={(app) => handleAppClick(app.id)}
                  />
                </div>
              )}

              {/* Empty State */}
              {count === 0 && (
                <div className="text-center py-8">
                  <div className="text-4xl mb-3">📱</div>
                  <h3 className="text-lg font-semibold mb-2">Nenhum app instalado</h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    Explore a App Store e instale os apps que você precisa.
                  </p>
                  <Button asChild>
                    <Link to="/app/store">Explorar App Store</Link>
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        {/* SECTION 4: Social Widgets */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Recent Activity */}
          <div className="lg:col-span-2">
            <RecentActivity profileId={profile?.id} />
          </div>

          {/* Right Column: Who to Follow + Trending */}
          <div className="space-y-4">
            <WhoToFollow />
            <TrendingTopics />
          </div>
        </div>
      </div>
    </>
  );
}
