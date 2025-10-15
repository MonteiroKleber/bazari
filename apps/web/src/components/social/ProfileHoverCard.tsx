import { useState } from 'react';
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
import { BadgeList } from './BadgeIcon';

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
  badges?: Array<{ slug: string; name: string; description: string; tier: number }>;
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
        badges: data.badges || [],
      };

      setProfile(profileData);
      setIsFollowing(profileData.isFollowing ?? false);

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

            {/* Badges */}
            {profile.badges && profile.badges.length > 0 && (
              <BadgeList badges={profile.badges} max={3} />
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
