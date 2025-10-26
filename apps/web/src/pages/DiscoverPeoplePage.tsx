import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { apiHelpers } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { UserPlus, Loader2, Search, Users } from 'lucide-react';
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

export default function DiscoverPeoplePage() {
  const [suggestions, setSuggestions] = useState<ProfileSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [followingMap, setFollowingMap] = useState<Map<string, boolean>>(new Map());

  useEffect(() => {
    loadSuggestions();
  }, []);

  const loadSuggestions = async () => {
    try {
      setLoading(true);
      const response = await api.get<{ items: ProfileSuggestion[] }>(
        '/feed/suggestions/profiles',
        { limit: '50' }
      );
      setSuggestions(response.items);
    } catch (error) {
      console.error('Error loading suggestions:', error);
      toast.error('Erro ao carregar sugestões');
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

  const filteredSuggestions = suggestions.filter(
    (s) =>
      s.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.handle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container mx-auto px-4 py-2 md:py-3 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <Users className="w-8 h-8" />
          Descubra Pessoas
        </h1>
        <p className="text-muted-foreground">
          Encontre e conecte-se com pessoas que compartilham seus interesses
        </p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar por nome ou @handle"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-muted animate-pulse" />
                  <div className="flex-1 space-y-3">
                    <div className="h-5 bg-muted rounded animate-pulse w-1/3" />
                    <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
                    <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Suggestions List */}
      {!loading && filteredSuggestions.length > 0 && (
        <div className="space-y-4">
          {filteredSuggestions.map((suggestion) => (
            <Card key={suggestion.handle}>
              <CardContent className="p-6">
                <ProfileSuggestionItem
                  suggestion={suggestion}
                  isFollowing={followingMap.get(suggestion.handle) || false}
                  onFollow={() => handleFollow(suggestion.handle)}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredSuggestions.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma sugestão encontrada</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery
                ? 'Tente buscar com outro termo'
                : 'Siga algumas pessoas para receber sugestões personalizadas'}
            </p>
            {searchQuery && (
              <Button variant="outline" onClick={() => setSearchQuery('')}>
                Limpar busca
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface ProfileSuggestionItemProps {
  suggestion: ProfileSuggestion;
  isFollowing: boolean;
  onFollow: () => void;
}

function ProfileSuggestionItem({ suggestion, isFollowing, onFollow }: ProfileSuggestionItemProps) {
  const initials = suggestion.displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex items-start gap-4">
      <Link to={`/u/${suggestion.handle}`}>
        <Avatar className="w-16 h-16">
          <AvatarImage src={suggestion.avatarUrl || undefined} alt={suggestion.displayName} />
          <AvatarFallback className="text-lg">{initials}</AvatarFallback>
        </Avatar>
      </Link>

      <div className="flex-1 min-w-0">
        <Link to={`/u/${suggestion.handle}`} className="block">
          <h3 className="font-semibold text-lg hover:underline">{suggestion.displayName}</h3>
          <p className="text-sm text-muted-foreground">@{suggestion.handle}</p>
        </Link>

        <p className="text-sm text-muted-foreground mt-2">{suggestion.reason}</p>

        {/* Stats */}
        <div className="flex items-center gap-4 mt-3">
          <div className="text-sm">
            <span className="font-medium">{suggestion.reputationScore}</span>
            <span className="text-muted-foreground ml-1">reputação</span>
          </div>

          {suggestion.mutualFollowers !== undefined && suggestion.mutualFollowers > 0 && (
            <div className="text-sm">
              <span className="font-medium">{suggestion.mutualFollowers}</span>
              <span className="text-muted-foreground ml-1">
                {suggestion.mutualFollowers === 1 ? 'amigo em comum' : 'amigos em comum'}
              </span>
            </div>
          )}
        </div>

        {/* Match Score */}
        <div className="mt-4 max-w-xs">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">Compatibilidade</span>
            <span className="font-semibold">{suggestion.matchScore}%</span>
          </div>
          <Progress value={suggestion.matchScore} className="h-2" />
        </div>
      </div>

      <Button
        size="lg"
        variant="default"
        onClick={onFollow}
        disabled={isFollowing}
        className="shrink-0"
      >
        {isFollowing ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            <UserPlus className="w-5 h-5 mr-2" />
            Seguir
          </>
        )}
      </Button>
    </div>
  );
}
