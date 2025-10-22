// apps/web/src/components/GlobalSearchBar.tsx

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, User, FileText, Store, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiHelpers } from '@/lib/api';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/lib/utils';

interface Profile {
  id: string;
  handle: string;
  displayName: string;
  avatarUrl?: string | null;
  followersCount?: number;
  reputationScore?: number;
}

interface Post {
  id: string;
  content: string;
  createdAt: string;
  likesCount: number;
  commentsCount: number;
  author: {
    handle: string;
    displayName: string;
    avatarUrl?: string | null;
  };
}

interface StoreResult {
  id: string;
  shopName: string;
  shopSlug: string;
  about?: string | null;
  avatarUrl?: string | null;
  ratingAvg: number;
  ratingCount: number;
}

interface SearchResults {
  results: {
    profiles: Profile[];
    posts: Post[];
    stores: StoreResult[];
    products: any[];
  };
  query: string;
}

interface GlobalSearchBarProps {
  variant?: 'full' | 'compact';
  className?: string;
}

export function GlobalSearchBar({ variant = 'full', className }: GlobalSearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(variant === 'full');
  const debouncedQuery = useDebounce(query, 300);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Search when debounced query changes
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults(null);
      setIsOpen(false);
      return;
    }

    const search = async () => {
      setLoading(true);
      try {
        const data = await apiHelpers.globalSearch(debouncedQuery);
        setResults(data as SearchResults);
        setIsOpen(true);
      } catch (error) {
        console.error('Search error:', error);
        setResults(null);
      } finally {
        setLoading(false);
      }
    };

    search();
  }, [debouncedQuery]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const handleNavigate = (path: string) => {
    navigate(path);
    setIsOpen(false);
    setQuery('');
    if (variant === 'compact') {
      setIsExpanded(false);
    }
  };

  const handleExpand = () => {
    setIsExpanded(true);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const handleCollapse = () => {
    setIsExpanded(false);
    setQuery('');
    setIsOpen(false);
  };

  const hasResults = results && (
    results.results.profiles.length > 0 ||
    results.results.posts.length > 0 ||
    results.results.stores.length > 0
  );

  // Compact variant - só ícone quando não expandido
  if (variant === 'compact' && !isExpanded) {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={handleExpand}
        className={cn("md:hidden", className)}
        aria-label="Abrir busca"
      >
        <Search className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={variant === 'compact' ? "Buscar..." : "Buscar pessoas, posts, lojas..."}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={cn("pl-9", variant === 'compact' ? "pr-9 text-sm" : "pr-9")}
        />
        {variant === 'compact' && isExpanded && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCollapse}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
            aria-label="Fechar busca"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
        {loading && !isExpanded && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Dropdown de resultados */}
      {isOpen && query.trim() && (
        <Card className="absolute top-full mt-2 w-full z-50 max-h-96 overflow-y-auto">
          <CardContent className="p-2">
            {!loading && !hasResults && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Nenhum resultado encontrado
              </div>
            )}

            {/* Perfis */}
            {results && results.results.profiles.length > 0 && (
              <div className="mb-2">
                <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">
                  Perfis
                </div>
                {results.results.profiles.map((profile) => (
                  <button
                    key={profile.id}
                    onClick={() => handleNavigate(`/u/${profile.handle}`)}
                    className="w-full flex items-center gap-3 p-2 rounded hover:bg-accent text-left"
                  >
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                      {profile.avatarUrl ? (
                        <img src={profile.avatarUrl} alt={profile.displayName} className="h-full w-full object-cover" />
                      ) : (
                        <User className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{profile.displayName}</div>
                      <div className="text-sm text-muted-foreground truncate">@{profile.handle}</div>
                    </div>
                    {profile.followersCount !== undefined && profile.followersCount > 0 && (
                      <div className="text-xs text-muted-foreground">
                        {profile.followersCount} seguidores
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Posts */}
            {results && results.results.posts.length > 0 && (
              <div className="mb-2">
                <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">
                  Posts
                </div>
                {results.results.posts.map((post) => (
                  <button
                    key={post.id}
                    onClick={() => handleNavigate(`/u/${post.author.handle}`)}
                    className="w-full flex items-start gap-3 p-2 rounded hover:bg-accent text-left"
                  >
                    <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {post.author.displayName}
                      </div>
                      <div className="text-sm text-muted-foreground line-clamp-2">
                        {post.content}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Lojas */}
            {results && results.results.stores.length > 0 && (
              <div>
                <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">
                  Lojas
                </div>
                {results.results.stores.map((store) => (
                  <button
                    key={store.id}
                    onClick={() => handleNavigate(`/stores/${store.shopSlug}`)}
                    className="w-full flex items-center gap-3 p-2 rounded hover:bg-accent text-left"
                  >
                    <div className="h-10 w-10 rounded bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                      {store.avatarUrl ? (
                        <img src={store.avatarUrl} alt={store.shopName} className="h-full w-full object-cover" />
                      ) : (
                        <Store className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{store.shopName}</div>
                      {store.about && (
                        <div className="text-sm text-muted-foreground truncate">{store.about}</div>
                      )}
                    </div>
                    {store.ratingCount > 0 && (
                      <div className="text-xs text-muted-foreground">
                         {store.ratingAvg.toFixed(1)} ({store.ratingCount})
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
