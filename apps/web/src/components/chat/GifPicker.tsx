import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Loader2, ImageIcon } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';
import { apiHelpers } from '@/lib/api';

interface GifItem {
  id: string;
  title: string;
  description: string;
  preview: { url: string; width: number; height: number };
  full: { url: string; width: number; height: number };
  mp4?: { url: string; width: number; height: number };
}

interface GifPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (gif: GifItem) => void;
}

export function GifPicker({ isOpen, onClose, onSelect }: GifPickerProps) {
  const [query, setQuery] = useState('');
  const [gifs, setGifs] = useState<GifItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Focar no input quando abrir
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Carregar trending quando abrir sem query
  useEffect(() => {
    if (isOpen && !query.trim()) {
      loadTrending();
    }
  }, [isOpen]);

  // Limpar ao fechar
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setGifs([]);
      setNextCursor(null);
      setError(null);
    }
  }, [isOpen]);

  const loadTrending = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiHelpers.get('/api/chat/gifs/trending?limit=30');
      setGifs(response.gifs || []);
      setNextCursor(response.next);
    } catch (err) {
      console.error('Failed to load trending GIFs:', err);
      setError('Falha ao carregar GIFs');
    } finally {
      setLoading(false);
    }
  };

  const searchGifs = useCallback(async (searchQuery: string, cursor?: string) => {
    if (searchQuery.trim().length < 1) {
      loadTrending();
      return;
    }

    if (cursor) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setGifs([]);
    }
    setError(null);

    try {
      const params = new URLSearchParams({
        q: searchQuery.trim(),
        limit: '30',
      });
      if (cursor) {
        params.set('pos', cursor);
      }

      const response = await apiHelpers.get(`/api/chat/gifs/search?${params}`);

      if (cursor) {
        setGifs(prev => [...prev, ...(response.gifs || [])]);
      } else {
        setGifs(response.gifs || []);
      }
      setNextCursor(response.next);
    } catch (err) {
      console.error('Failed to search GIFs:', err);
      setError('Falha ao buscar GIFs');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);

    // Debounce search
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      searchGifs(value);
    }, 300);
  }, [searchGifs]);

  const handleSelect = (gif: GifItem) => {
    // Registrar compartilhamento no Tenor (analytics)
    apiHelpers.post('/api/chat/gifs/register-share', {
      gifId: gif.id,
      searchTerm: query || undefined,
    }).catch(() => {
      // Ignorar erros
    });

    onSelect(gif);
    onClose();
  };

  const handleScroll = useCallback(() => {
    if (!containerRef.current || loadingMore || !nextCursor) return;

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    if (scrollTop + clientHeight >= scrollHeight - 100) {
      searchGifs(query, nextCursor);
    }
  }, [query, nextCursor, loadingMore, searchGifs]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-x-2 bottom-24 sm:absolute sm:inset-auto sm:bottom-full sm:left-0 sm:right-auto sm:mb-2 z-50"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="bg-background border rounded-lg shadow-lg overflow-hidden max-h-[60vh] sm:max-h-[400px] w-full sm:w-[400px] flex flex-col">
        {/* Header com busca */}
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              type="text"
              placeholder="Buscar GIFs..."
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-10 pr-10"
            />
            {query && (
              <button
                onClick={() => handleQueryChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Grid de GIFs */}
        <div
          ref={containerRef}
          className="flex-1 overflow-y-auto p-2"
          onScroll={handleScroll}
        >
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {error && !loading && (
            <div className="text-center py-8 text-muted-foreground">
              <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>{error}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => query ? searchGifs(query) : loadTrending()}
                className="mt-2"
              >
                Tentar novamente
              </Button>
            </div>
          )}

          {!loading && !error && gifs.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nenhum GIF encontrado</p>
            </div>
          )}

          {!loading && !error && gifs.length > 0 && (
            <>
              <div className="grid grid-cols-3 sm:grid-cols-3 gap-1.5">
                {gifs.map((gif) => (
                  <button
                    key={gif.id}
                    onClick={() => handleSelect(gif)}
                    className={cn(
                      'relative aspect-square overflow-hidden rounded-md',
                      'hover:ring-2 hover:ring-primary transition-all',
                      'bg-muted'
                    )}
                  >
                    <img
                      src={gif.preview.url}
                      alt={gif.description || gif.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>

              {loadingMore && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-3 py-2 border-t text-xs text-muted-foreground flex items-center justify-between">
          <span>Powered by Tenor</span>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}
