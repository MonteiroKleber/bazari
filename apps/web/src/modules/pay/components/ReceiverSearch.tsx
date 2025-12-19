// path: apps/web/src/modules/pay/components/ReceiverSearch.tsx
// Componente de busca de recebedor (PROMPT-01)

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Loader2, Check, User } from 'lucide-react';
import { searchUsers } from '../api';
import type { UserSearchResult } from '../api';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/lib/utils';

interface ReceiverSearchProps {
  onSelect: (user: UserSearchResult) => void;
  selected: UserSearchResult | null;
  excludeUserId?: string;
}

export function ReceiverSearch({
  onSelect,
  selected,
  excludeUserId,
}: ReceiverSearchProps) {
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const debouncedQuery = useDebounce(query, 300);

  const { data, isLoading } = useQuery({
    queryKey: ['user-search', debouncedQuery],
    queryFn: () => searchUsers(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
  });

  const filteredUsers =
    data?.users?.filter((u) => u.id !== excludeUserId) || [];

  // Fechar resultados ao clicar fora
  useEffect(() => {
    const handleClickOutside = () => setShowResults(false);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  if (selected) {
    return (
      <Card className="border-primary">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={selected.avatarUrl || undefined} />
              <AvatarFallback>
                {selected.displayName?.charAt(0) || selected.handle?.charAt(0) || '?'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="font-medium">
                {selected.displayName || 'Usuário'}
              </div>
              {selected.handle && (
                <div className="text-sm text-muted-foreground">
                  @{selected.handle}
                </div>
              )}
              {selected.walletAddress && (
                <div className="text-xs text-muted-foreground font-mono truncate">
                  {selected.walletAddress.slice(0, 16)}...
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5 text-primary" />
              <button
                type="button"
                onClick={() => onSelect(null as unknown as UserSearchResult)}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Alterar
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por @handle ou nome..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowResults(true);
          }}
          onFocus={() => setShowResults(true)}
          className="pl-10"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Resultados */}
      {showResults && debouncedQuery.length >= 2 && (
        <Card className="absolute z-50 w-full mt-2 max-h-64 overflow-auto">
          <CardContent className="p-0">
            {filteredUsers.length === 0 && !isLoading && (
              <div className="p-4 text-center text-muted-foreground">
                <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhum usuário encontrado</p>
              </div>
            )}
            {filteredUsers.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => {
                  onSelect(user);
                  setShowResults(false);
                  setQuery('');
                }}
                className={cn(
                  'w-full flex items-center gap-3 p-3 hover:bg-muted transition-colors text-left',
                  'border-b last:border-b-0'
                )}
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user.avatarUrl || undefined} />
                  <AvatarFallback>
                    {user.displayName?.charAt(0) || user.handle?.charAt(0) || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">
                    {user.displayName || 'Usuário'}
                  </div>
                  {user.handle && (
                    <div className="text-sm text-muted-foreground">
                      @{user.handle}
                    </div>
                  )}
                </div>
                {user.walletAddress && (
                  <div className="text-xs text-muted-foreground font-mono">
                    {user.walletAddress.slice(0, 8)}...
                  </div>
                )}
              </button>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
