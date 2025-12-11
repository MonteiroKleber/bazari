# Especificação Técnica: FASE 3 - Experiência Visual

**Versão**: 1.0.0
**Data**: 2025-10-09

Este documento detalha a Fase 3 das melhorias de UI/UX do sistema social com código completo.

---

## FASE 3: Experiência Visual (1-2 semanas)

### 🎯 Objetivo
Melhorar a experiência visual com componentes interativos e estados de loading profissionais.

---

### 3.1 ProfileHoverCard

#### **Frontend: ProfileHoverCard Component**

```typescript
// apps/web/src/components/social/ProfileHoverCard.tsx

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { apiHelpers } from '@/lib/api';
import { UserPlus, UserCheck } from 'lucide-react';

interface ProfileHoverCardProps {
  handle: string;
  children: React.ReactNode;
}

interface ProfileData {
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  isFollowing?: boolean;
}

// Cache em memória (simples)
const profileCache = new Map<string, { data: ProfileData; timestamp: number }>();
const CACHE_TTL = 60000; // 1 minuto

export function ProfileHoverCard({ handle, children }: ProfileHoverCardProps) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);

  const loadProfile = async () => {
    // Verificar cache
    const cached = profileCache.get(handle);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setProfile(cached.data);
      setIsFollowing(cached.data.isFollowing || false);
      return;
    }

    setLoading(true);
    setError(false);
    try {
      const data: any = await apiHelpers.getProfile(handle);
      const profileData: ProfileData = {
        handle: data.handle,
        displayName: data.displayName,
        avatarUrl: data.avatarUrl,
        bio: data.bio,
        followersCount: data.followersCount || 0,
        followingCount: data.followingCount || 0,
        postsCount: data.postsCount || 0,
        isFollowing: data.isFollowing || false,
      };

      setProfile(profileData);
      setIsFollowing(profileData.isFollowing);

      // Adicionar ao cache
      profileCache.set(handle, { data: profileData, timestamp: Date.now() });
    } catch (err) {
      console.error('Error loading profile:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    const prevState = isFollowing;
    setIsFollowing(!isFollowing);

    try {
      if (isFollowing) {
        await apiHelpers.unfollowUser(handle);
      } else {
        await apiHelpers.followUser(handle);
      }
      // Invalidar cache
      profileCache.delete(handle);
    } catch (err) {
      // Reverter em caso de erro
      setIsFollowing(prevState);
      console.error('Error following/unfollowing:', err);
    }
  };

  return (
    <HoverCard openDelay={500} closeDelay={200}>
      <HoverCardTrigger asChild>
        {children}
      </HoverCardTrigger>

      <HoverCardContent
        className="w-80"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          loadProfile();
        }}
      >
        {loading && <ProfileHoverSkeleton />}

        {error && (
          <div className="text-center text-sm text-muted-foreground py-4">
            Erro ao carregar perfil
          </div>
        )}

        {profile && !loading && (
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-start gap-3">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.displayName}
                  className="h-20 w-20 rounded-full object-cover"
                />
              ) : (
                <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center text-2xl font-bold">
                  {profile.displayName[0]}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg truncate">
                  {profile.displayName}
                </h3>
                <p className="text-sm text-muted-foreground">
                  @{profile.handle}
                </p>
              </div>
            </div>

            {/* Bio */}
            {profile.bio && (
              <p className="text-sm line-clamp-2">
                {profile.bio}
              </p>
            )}

            {/* Métricas */}
            <div className="flex gap-4 text-sm">
              <div>
                <span className="font-semibold">{profile.followersCount}</span>
                <span className="text-muted-foreground ml-1">seguidores</span>
              </div>
              <div>
                <span className="font-semibold">{profile.followingCount}</span>
                <span className="text-muted-foreground ml-1">seguindo</span>
              </div>
              <div>
                <span className="font-semibold">{profile.postsCount}</span>
                <span className="text-muted-foreground ml-1">posts</span>
              </div>
            </div>

            {/* Ações */}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={isFollowing ? "outline" : "default"}
                className="flex-1"
                onClick={handleFollow}
              >
                {isFollowing ? (
                  <>
                    <UserCheck className="h-4 w-4 mr-1" />
                    Seguindo
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-1" />
                    Seguir
                  </>
                )}
              </Button>

              <Button size="sm" variant="ghost" asChild>
                <Link to={`/u/${profile.handle}`}>Ver perfil</Link>
              </Button>
            </div>
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}

function ProfileHoverSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <Skeleton className="h-20 w-20 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <Skeleton className="h-10 w-full" />
      <div className="flex gap-4">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-9 flex-1" />
        <Skeleton className="h-9 w-24" />
      </div>
    </div>
  );
}
```

**Integrar no PostCard**:
```typescript
// apps/web/src/components/social/PostCard.tsx

import { ProfileHoverCard } from './ProfileHoverCard';

// Substituir:
<Link to={`/u/${post.author.handle}`} className="font-semibold hover:underline">
  {post.author.displayName}
</Link>

// Por:
<ProfileHoverCard handle={post.author.handle}>
  <Link to={`/u/${post.author.handle}`} className="font-semibold hover:underline">
    {post.author.displayName}
  </Link>
</ProfileHoverCard>
```

---

### 3.2 BadgeIcon

#### **Badge Configuration**

```typescript
// apps/web/src/config/badges.ts

import {
  MessageSquare,
  Flame,
  Heart,
  ShieldCheck,
  BadgeCheck,
  Award,
  Users,
  Zap,
  type LucideIcon
} from 'lucide-react';

export interface BadgeConfig {
  icon: LucideIcon;
  name: string;
  description: string;
}

export const BADGE_CONFIG: Record<string, BadgeConfig> = {
  FIRST_POST: {
    icon: MessageSquare,
    name: 'Primeira Publicação',
    description: 'Criou seu primeiro post na plataforma'
  },
  POST_STREAK: {
    icon: Flame,
    name: 'Sequência de Posts',
    description: 'Publicou por 7 dias consecutivos'
  },
  ENGAGEMENT_MASTER: {
    icon: Heart,
    name: 'Mestre do Engajamento',
    description: 'Recebeu 100 curtidas em posts'
  },
  TRUSTED_SELLER: {
    icon: ShieldCheck,
    name: 'Vendedor Confiável',
    description: 'Mantém alta reputação em vendas'
  },
  VERIFIED: {
    icon: BadgeCheck,
    name: 'Verificado',
    description: 'Perfil verificado pela equipe'
  },
  TOP_CONTRIBUTOR: {
    icon: Award,
    name: 'Top Contribuidor',
    description: 'Entre os usuários mais ativos'
  },
  COMMUNITY_LEADER: {
    icon: Users,
    name: 'Líder Comunitário',
    description: 'Ajudou a construir a comunidade'
  },
  EARLY_ADOPTER: {
    icon: Zap,
    name: 'Early Adopter',
    description: 'Entre os primeiros usuários'
  }
};

export const TIER_COLORS: Record<number, string> = {
  1: 'text-zinc-400',   // Bronze
  2: 'text-zinc-300',   // Prata
  3: 'text-yellow-500', // Ouro
  4: 'text-purple-500', // Platinum
  5: 'text-cyan-500'    // Diamante
};

export const TIER_NAMES: Record<number, string> = {
  1: 'Bronze',
  2: 'Prata',
  3: 'Ouro',
  4: 'Platinum',
  5: 'Diamante'
};
```

#### **BadgeIcon Component**

```typescript
// apps/web/src/components/social/BadgeIcon.tsx

import { BADGE_CONFIG, TIER_COLORS, TIER_NAMES } from '@/config/badges';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface BadgeIconProps {
  badge: {
    slug: string;
    name: string;
    description: string;
    tier: number;
  };
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8'
};

export function BadgeIcon({
  badge,
  size = 'md',
  showTooltip = true,
  className
}: BadgeIconProps) {
  const config = BADGE_CONFIG[badge.slug];

  if (!config) {
    console.warn(`Badge config not found for: ${badge.slug}`);
    return null;
  }

  const Icon = config.icon;
  const colorClass = TIER_COLORS[badge.tier] || TIER_COLORS[1];
  const tierName = TIER_NAMES[badge.tier] || 'Bronze';
  const stars = '★'.repeat(badge.tier);

  const iconElement = (
    <Icon
      className={cn(
        sizeClasses[size],
        colorClass,
        className
      )}
    />
  );

  if (!showTooltip) {
    return iconElement;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex cursor-help">
            {iconElement}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-sm space-y-1">
            <div className="font-semibold">{badge.name}</div>
            <div className="text-xs text-muted-foreground">
              {badge.description}
            </div>
            <div className="text-xs flex items-center gap-1">
              <span className="text-yellow-500">{stars}</span>
              <span className="text-muted-foreground">{tierName}</span>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Versão simplificada para mostrar múltiplos badges
export function BadgeList({ badges, max = 3 }: { badges: any[]; max?: number }) {
  const displayBadges = badges.slice(0, max);
  const remaining = badges.length - max;

  return (
    <div className="flex items-center gap-1">
      {displayBadges.map((badge) => (
        <BadgeIcon key={badge.slug} badge={badge} size="sm" />
      ))}
      {remaining > 0 && (
        <span className="text-xs text-muted-foreground">
          +{remaining}
        </span>
      )}
    </div>
  );
}
```

**Uso no PostCard** (badge VERIFIED ao lado do nome):
```typescript
// apps/web/src/components/social/PostCard.tsx

import { BadgeIcon } from './BadgeIcon';

// No cabeçalho do post:
<div className="flex items-center gap-1">
  <ProfileHoverCard handle={post.author.handle}>
    <Link to={`/u/${post.author.handle}`} className="font-semibold hover:underline">
      {post.author.displayName}
    </Link>
  </ProfileHoverCard>

  {/* Mostrar badge VERIFIED se houver */}
  {post.author.badges?.find(b => b.slug === 'VERIFIED') && (
    <BadgeIcon
      badge={post.author.badges.find(b => b.slug === 'VERIFIED')}
      size="sm"
    />
  )}
</div>
```

---

### 3.3 ReputationChart

#### **Backend: Reputation History Endpoint**

```typescript
// apps/api/src/routes/profiles.ts

// ADICIONAR endpoint para histórico
app.get<{ Params: { handle: string } }>('/profiles/:handle/reputation/history',
  async (request, reply) => {
    const { handle } = request.params;

    const profile = await prisma.profile.findUnique({
      where: { handle },
      select: {
        reputationScore: true,
        reputationTier: true
      }
    });

    if (!profile) {
      return reply.status(404).send({ error: 'Profile not found' });
    }

    // Buscar eventos dos últimos 30 dias
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const events = await prisma.profileReputationEvent.findMany({
      where: {
        profile: { handle },
        createdAt: { gte: thirtyDaysAgo }
      },
      orderBy: { createdAt: 'asc' },
      select: {
        createdAt: true,
        scoreDelta: true
      }
    });

    // Calcular score acumulado por dia
    let currentScore = profile.reputationScore;
    const history: { date: string; score: number }[] = [];

    // Reconstruir histórico (começar do score atual e subtrair deltas)
    const eventsByDay = new Map<string, number>();
    events.reverse().forEach(event => {
      const date = event.createdAt.toISOString().split('T')[0];
      eventsByDay.set(date, (eventsByDay.get(date) || 0) + event.scoreDelta);
    });

    // Criar array dos últimos 30 dias
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      // Subtrair eventos deste dia e dias futuros
      let scoreAtDate = currentScore;
      eventsByDay.forEach((delta, eventDate) => {
        if (eventDate > dateStr) {
          scoreAtDate -= delta;
        }
      });

      history.push({
        date: dateStr,
        score: Math.max(0, scoreAtDate)
      });
    }

    // Calcular variações
    const score7dAgo = history[history.length - 7]?.score || currentScore;
    const change7d = currentScore - score7dAgo;
    const change30d = currentScore - (history[0]?.score || currentScore);

    // Calcular progresso para próximo tier
    const tierThresholds = [0, 100, 300, 600, 1000];
    const nextTierIndex = tierThresholds.findIndex(t => t > currentScore);
    const nextTier = nextTierIndex > 0 ? tierThresholds[nextTierIndex] : 1000;
    const prevTier = nextTierIndex > 0 ? tierThresholds[nextTierIndex - 1] : 0;
    const progressToNext = (currentScore - prevTier) / (nextTier - prevTier);

    return reply.send({
      current: {
        score: currentScore,
        tier: profile.reputationTier,
        nextTier: nextTierIndex < tierThresholds.length ?
          ['NOVICE', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM'][nextTierIndex] : 'PLATINUM',
        progressToNext: Math.min(1, Math.max(0, progressToNext))
      },
      history,
      change7d,
      change30d
    });
  }
);
```

#### **Frontend: ReputationChart Component**

```typescript
// apps/web/src/components/social/ReputationChart.tsx

import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { apiHelpers } from '@/lib/api';
import { cn } from '@/lib/utils';

interface ReputationChartProps {
  handle: string;
}

interface ReputationData {
  current: {
    score: number;
    tier: string;
    nextTier: string;
    progressToNext: number;
  };
  history: Array<{ date: string; score: number }>;
  change7d: number;
  change30d: number;
}

export function ReputationChart({ handle }: ReputationChartProps) {
  const [data, setData] = useState<ReputationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    loadData();
  }, [handle]);

  const loadData = async () => {
    setLoading(true);
    setError(false);
    try {
      const result: any = await apiHelpers.getReputationHistory(handle);
      setData(result);
    } catch (err) {
      console.error('Error loading reputation data:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <ReputationChartSkeleton />;
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Sem dados disponíveis
        </CardContent>
      </Card>
    );
  }

  if (data.history.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-muted-foreground">
            Comece a interagir para ganhar reputação!
          </p>
        </CardContent>
      </Card>
    );
  }

  const isPositiveTrend = data.change7d >= 0;
  const chartColor = isPositiveTrend ? '#22c55e' : '#ef4444'; // green-500 : red-500

  // Formatar dados para o gráfico
  const chartData = data.history.map(item => ({
    date: format(parseISO(item.date), 'dd/MM', { locale: ptBR }),
    fullDate: format(parseISO(item.date), 'dd MMM yyyy', { locale: ptBR }),
    score: item.score
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reputação</CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Métricas atuais */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-3xl font-bold">{data.current.score}</div>
            <div className="text-sm text-muted-foreground">Score atual</div>
            <div className="flex items-center gap-1 text-xs mt-1">
              {isPositiveTrend ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
              <span className={cn(
                'font-medium',
                isPositiveTrend ? 'text-green-500' : 'text-red-500'
              )}>
                {isPositiveTrend ? '+' : ''}{data.change7d}
              </span>
              <span className="text-muted-foreground">últimos 7 dias</span>
            </div>
          </div>

          <div>
            <div className="text-lg font-semibold">{data.current.tier}</div>
            <div className="text-sm text-muted-foreground mb-2">Tier atual</div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">
                Progresso para {data.current.nextTier}
              </div>
              <Progress value={data.current.progressToNext * 100} />
            </div>
          </div>
        </div>

        {/* Gráfico */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColor} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={chartColor} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px'
                }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-popover p-2 rounded-md shadow-md border">
                        <div className="text-xs text-muted-foreground">
                          {data.fullDate}
                        </div>
                        <div className="text-sm font-semibold">
                          Score: {data.score}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="score"
                stroke={chartColor}
                strokeWidth={2}
                fill="url(#colorScore)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function ReputationChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-32" />
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3 w-32" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-2 w-full" />
          </div>
        </div>
        <Skeleton className="h-64 w-full" />
      </CardContent>
    </Card>
  );
}
```

**Adicionar helper na API**:
```typescript
// apps/web/src/lib/api.ts

getReputationHistory: (handle: string) =>
  getJSON(`/profiles/${encodeURIComponent(handle)}/reputation/history`),
```

---

### 3.4 Loading Skeletons

#### **Skeleton Components**

```typescript
// apps/web/src/components/social/PostCardSkeleton.tsx

import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function PostCardSkeleton() {
  return (
    <Card className="p-4">
      <div className="flex gap-3">
        {/* Avatar */}
        <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />

        <div className="flex-1 space-y-3">
          {/* Header: Nome + handle + timestamp */}
          <div className="space-y-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>

          {/* Conteúdo do post */}
          <div className="space-y-2 pt-1">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>

          {/* Ações (like, comment) */}
          <div className="flex gap-4 pt-2">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-16" />
          </div>
        </div>
      </div>
    </Card>
  );
}
```

```typescript
// apps/web/src/components/social/ProfileCardSkeleton.tsx

import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function ProfileCardSkeleton() {
  return (
    <Card className="p-6">
      <div className="flex flex-col items-center text-center space-y-4">
        {/* Avatar grande */}
        <Skeleton className="h-24 w-24 rounded-full" />

        {/* Nome */}
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-32" />
        </div>

        {/* Bio */}
        <div className="space-y-2 w-full">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3 mx-auto" />
        </div>

        {/* Métricas */}
        <div className="flex gap-6">
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-20" />
        </div>

        {/* Botão */}
        <Skeleton className="h-10 w-32" />
      </div>
    </Card>
  );
}
```

```typescript
// apps/web/src/components/social/CommentSkeleton.tsx

import { Skeleton } from '@/components/ui/skeleton';

export function CommentSkeleton() {
  return (
    <div className="flex gap-3 py-3">
      {/* Avatar pequeno */}
      <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />

      <div className="flex-1 space-y-2">
        {/* Nome + timestamp */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>

        {/* Conteúdo */}
        <div className="space-y-1">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      </div>
    </div>
  );
}
```

```typescript
// apps/web/src/components/NotificationSkeleton.tsx

import { Skeleton } from '@/components/ui/skeleton';

export function NotificationSkeleton() {
  return (
    <div className="flex gap-3 p-3">
      {/* Avatar */}
      <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />

      <div className="flex-1 space-y-2">
        {/* Mensagem */}
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />

        {/* Timestamp */}
        <Skeleton className="h-2 w-16" />
      </div>
    </div>
  );
}
```

#### **SkeletonList Wrapper**

```typescript
// apps/web/src/components/SkeletonList.tsx

interface SkeletonListProps {
  count: number;
  SkeletonComponent: React.ComponentType;
  className?: string;
}

export function SkeletonList({
  count,
  SkeletonComponent,
  className
}: SkeletonListProps) {
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonComponent key={`skeleton-${index}`} />
      ))}
    </div>
  );
}
```

#### **Integração nos componentes**

```typescript
// apps/web/src/components/social/CommentSection.tsx

import { CommentSkeleton } from './CommentSkeleton';
import { SkeletonList } from '../SkeletonList';

// No render:
{loading ? (
  <SkeletonList count={5} SkeletonComponent={CommentSkeleton} />
) : comments.length === 0 ? (
  <div className="text-center text-sm text-muted-foreground py-4">
    Nenhum comentário ainda. Seja o primeiro!
  </div>
) : (
  comments.map((comment) => (
    <CommentItem key={comment.id} comment={comment} />
  ))
)}
```

```typescript
// apps/web/src/components/NotificationCenter.tsx

import { NotificationSkeleton } from './NotificationSkeleton';
import { SkeletonList } from './SkeletonList';

// No dropdown content:
{loading ? (
  <SkeletonList count={5} SkeletonComponent={NotificationSkeleton} />
) : notifications.length === 0 ? (
  <div className="p-4 text-center text-sm text-muted-foreground">
    Nenhuma notificação
  </div>
) : (
  notifications.map((notif) => (
    <NotificationItem key={notif.id} notification={notif} />
  ))
)}
```

---

## 📊 Resumo da Fase 3

| Componente | Tipo | Complexidade | Tempo Est. |
|-----------|------|--------------|------------|
| ProfileHoverCard | Interactive | Média | 2-3h |
| BadgeIcon | Visual | Baixa | 1-2h |
| ReputationChart | Data Viz | Alta | 3-4h |
| Loading Skeletons | Visual | Baixa | 2-3h |

**Total**: 8-12 horas de desenvolvimento

---

**Próxima Fase**: FASE 4 - Feed Algorítmico & Recomendações
