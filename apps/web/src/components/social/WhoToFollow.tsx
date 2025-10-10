import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { UserPlus, Loader2, Users } from 'lucide-react';
import { apiHelpers } from '@/lib/api';
import { toast } from 'sonner';

interface ProfileSuggestion {
  profileId: string;
  userId: string;
  handle: string;
  displayName: string;
  avatarUrl?: string | null;
  reputationScore: number;
  matchScore: number;
  reason: string;
  mutualFollowers?: number;
}

export function WhoToFollow() {
  const [suggestions, setSuggestions] = useState<ProfileSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingMap, setFollowingMap] = useState<Map<string, boolean>>(new Map());

  useEffect(() => {
    loadSuggestions();
  }, []);

  const loadSuggestions = async () => {
    try {
      setLoading(true);
      const response = await api.get<{ items: ProfileSuggestion[] }>(
        '/feed/suggestions/profiles',
        { limit: '5' }
      );
      setSuggestions(response.items);
    } catch (error) {
      console.error('Error loading suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async (handle: string) => {
    try {
      setFollowingMap((prev) => new Map(prev).set(handle, true));
      await apiHelpers.followUser(handle);
      toast.success(`Você está seguindo @${handle}`);

      // Remover da lista após seguir
      setSuggestions((prev) => prev.filter((s) => s.handle !== handle));
    } catch (error) {
      setFollowingMap((prev) => {
        const next = new Map(prev);
        next.delete(handle);
        return next;
      });
      toast.error('Erro ao seguir perfil');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5" />
            Quem Seguir
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="w-5 h-5" />
          Quem Seguir
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {suggestions.map((suggestion) => (
          <ProfileSuggestionCard
            key={suggestion.handle}
            suggestion={suggestion}
            isFollowing={followingMap.get(suggestion.handle) || false}
            onFollow={() => handleFollow(suggestion.handle)}
          />
        ))}

        <Link to="/app/discover/people">
          <Button variant="ghost" className="w-full">
            Ver mais sugestões
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

interface ProfileSuggestionCardProps {
  suggestion: ProfileSuggestion;
  isFollowing: boolean;
  onFollow: () => void;
}

function ProfileSuggestionCard({ suggestion, isFollowing, onFollow }: ProfileSuggestionCardProps) {
  const initials = suggestion.displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex items-start gap-3">
      <Link to={`/u/${suggestion.handle}`}>
        <Avatar className="w-10 h-10">
          <AvatarImage src={suggestion.avatarUrl || undefined} alt={suggestion.displayName} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      </Link>

      <div className="flex-1 min-w-0">
        <Link to={`/u/${suggestion.handle}`} className="block">
          <p className="font-semibold text-sm truncate hover:underline">
            {suggestion.displayName}
          </p>
          <p className="text-xs text-muted-foreground truncate">@{suggestion.handle}</p>
        </Link>

        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{suggestion.reason}</p>

        {/* Match Score */}
        <div className="mt-2 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Match</span>
            <span className="font-medium">{suggestion.matchScore}%</span>
          </div>
          <Progress value={suggestion.matchScore} className="h-1" />
        </div>
      </div>

      <Button
        size="sm"
        variant="outline"
        onClick={onFollow}
        disabled={isFollowing}
        className="shrink-0"
      >
        {isFollowing ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            <UserPlus className="w-4 h-4 mr-1" />
            Seguir
          </>
        )}
      </Button>
    </div>
  );
}
