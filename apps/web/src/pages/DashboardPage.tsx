import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiHelpers } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { KPICard } from '../components/dashboard/KPICard';
import { QuickActionsGrid } from '../components/dashboard/QuickActionsGrid';
import { RecentActivity } from '../components/dashboard/RecentActivity';
import { WhoToFollow } from '../components/social/WhoToFollow';
import { TrendingTopics } from '../components/social/TrendingTopics';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { PullToRefreshIndicator } from '../components/mobile/PullToRefreshIndicator';
import { FileText, Users, Bell, TrendingUp } from 'lucide-react';

type MeProfile = {
  id: string;
  handle: string;
  displayName: string;
  avatarUrl?: string | null;
  bio?: string | null;
  bannerUrl?: string | null;
  externalLinks?: { label: string; url: string }[] | null;
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<MeProfile | null>(null);
  const [stats, setStats] = useState({
    posts: 0,
    followers: 0,
    notifications: 0,
    reputation: 0,
  });

  const loadData = useCallback(async () => {
    let active = true;
    setLoading(true);

    try {
      const res = await apiHelpers.getMeProfile();
      if (active && res.profile) {
        setProfile(res.profile);

        // Buscar dados reais do backend
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
    } catch (e: any) {
      if (active) {
        setProfile(null);
      }
    } finally {
      if (active) setLoading(false);
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

  const handleGoToPublicProfile = () => {
    if (profile?.handle) navigate(`/u/${profile.handle}`);
  };

  // Show onboarding if no profile
  if (!loading && !profile) {
    return (
      <section className="container mx-auto px-4 py-8 mobile-safe-bottom">
        <Card>
          <CardHeader>
            <CardTitle>Bem-vindo ao Bazari!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
      <PullToRefreshIndicator isRefreshing={isRefreshing} pullDistance={pullDistance} />
      <section className="container mx-auto px-4 py-2 md:py-3 mobile-safe-bottom">
        {/* Compact Header */}
        <header className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={profile?.avatarUrl || undefined} alt={profile?.displayName} />
              <AvatarFallback>{profile?.displayName?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-lg font-semibold leading-tight">
                Olá, {profile?.displayName?.split(' ')[0] || 'Usuário'}!
              </h1>
              {profile?.handle && <p className="text-xs text-muted-foreground">@{profile.handle}</p>}
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleGoToPublicProfile}>
            Ver Perfil
          </Button>
        </header>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <KPICard icon={FileText} label="Posts" value={stats.posts} />
          <KPICard icon={Users} label="Seguidores" value={stats.followers} />
          <KPICard
            icon={Bell}
            label="Notificações"
            value={stats.notifications}
            badge={stats.notifications > 0}
          />
          <KPICard icon={TrendingUp} label="Reputação" value={stats.reputation} />
        </div>

        {/* Quick Actions */}
        <div className="mb-6">
          <h2 className="text-base font-semibold mb-3">Ações Rápidas</h2>
          <QuickActionsGrid />
        </div>

        {/* Recent Activity & Recommendations */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <RecentActivity profileId={profile?.id} />
          </div>

          <div className="space-y-4">
            <WhoToFollow />
            <TrendingTopics />
          </div>
        </div>
      </section>
    </>
  );
}
