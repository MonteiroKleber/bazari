import { useState, useCallback, useRef, useEffect } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { apiHelpers } from '@/lib/api';
import { useNavigate } from 'react-router-dom';

interface SearchResult {
  id: string;
  threadId: string;
  threadKind: 'dm' | 'group' | 'store' | 'order';
  threadName: string | null;
  from: string;
  senderName: string;
  senderHandle: string;
  senderAvatarUrl: string | null;
  type: string;
  ciphertext: string;
  createdAt: number;
}

interface SearchMessagesProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchMessages({ isOpen, onClose }: SearchMessagesProps) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [total, setTotal] = useState(0);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Focar no input quando abrir
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Limpar ao fechar
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
      setHasSearched(false);
    }
  }, [isOpen]);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.trim().length < 2) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setHasSearched(true);

    try {
      const response = await apiHelpers.get(`/api/chat/messages/search?q=${encodeURIComponent(searchQuery)}`);
      setResults(response.messages || []);
      setTotal(response.total || 0);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);

    // Debounce search
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      performSearch(value);
    }, 300);
  }, [performSearch]);

  const handleResultClick = (result: SearchResult) => {
    // Navegar para a thread e fechar busca
    navigate(`/app/chat/${result.threadId}#msg-${result.id}`);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  // Destacar termo de busca no texto
  const highlightText = (text: string, term: string): React.ReactNode => {
    if (!term.trim()) return text;

    const parts = text.split(new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === term.toLowerCase() ? (
        <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 px-0.5 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  // Truncar texto mantendo o termo de busca visível
  const truncateWithHighlight = (text: string, term: string, maxLength: number = 100): string => {
    if (text.length <= maxLength) return text;

    const lowerText = text.toLowerCase();
    const lowerTerm = term.toLowerCase();
    const termIndex = lowerText.indexOf(lowerTerm);

    if (termIndex === -1) {
      return text.slice(0, maxLength) + '...';
    }

    // Centralizar o termo de busca no trecho
    const start = Math.max(0, termIndex - Math.floor((maxLength - term.length) / 2));
    const end = Math.min(text.length, start + maxLength);

    let result = text.slice(start, end);
    if (start > 0) result = '...' + result;
    if (end < text.length) result = result + '...';

    return result;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
      <div className="fixed inset-x-0 top-0 z-50 bg-background border-b shadow-lg">
        <div className="max-w-2xl mx-auto p-4">
          {/* Header com input */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={inputRef}
                type="text"
                placeholder="Buscar mensagens..."
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pl-10 pr-10"
              />
              {loading && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Resultados */}
          <div className="mt-4 max-h-[60vh] overflow-y-auto">
            {hasSearched && !loading && results.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                <p>Nenhuma mensagem encontrada</p>
                <p className="text-sm mt-1">Tente outro termo de busca</p>
              </div>
            )}

            {!hasSearched && query.length < 2 && (
              <div className="text-center text-muted-foreground py-8">
                <p>Digite ao menos 2 caracteres para buscar</p>
              </div>
            )}

            {results.length > 0 && (
              <>
                <p className="text-sm text-muted-foreground mb-3">
                  {total} {total === 1 ? 'resultado' : 'resultados'} encontrado{total !== 1 && 's'}
                </p>
                <div className="space-y-2">
                  {results.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => handleResultClick(result)}
                      className="w-full flex items-start gap-3 p-3 hover:bg-accent rounded-lg transition text-left"
                    >
                      <Avatar className="h-10 w-10 flex-shrink-0">
                        <AvatarImage src={result.senderAvatarUrl || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {result.senderName[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-medium truncate">
                              {result.senderName}
                            </span>
                            {result.threadKind === 'group' && result.threadName && (
                              <span className="text-xs text-muted-foreground">
                                em {result.threadName}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            {formatDistanceToNow(result.createdAt, {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 break-words">
                          {result.type === 'text'
                            ? highlightText(truncateWithHighlight(result.ciphertext, query), query)
                            : `[${result.type}]`}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Overlay para fechar ao clicar fora */}
      <div className="fixed inset-0 -z-10" onClick={onClose} />
    </div>
  );
}
