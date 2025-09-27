import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Search as SearchIcon, Clock, Tag, Package, ArrowUpRight, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { API_BASE_URL } from '@/config';
import type { CategoryFacet } from './StoreCategoryTree';

const AUTOCOMPLETE_DEBOUNCE = 300;
const RECENTS_LIMIT = 5;

type Suggestion =
  | { id: string; type: 'recent'; label: string; value: string }
  | { id: string; type: 'category'; label: string; value: string; path: string[]; count: number }
  | { id: string; type: 'item'; label: string; value: string; itemId: string };

interface StoreSearchAdvancedProps {
  storeSlug: string;
  initialValue?: string;
  categories?: CategoryFacet[];
  onSubmit: (value: string) => void;
  onCategorySelect: (path: string[]) => void;
}

function recentTermsKey(slug: string) {
  return `store:${slug}:recentTerms`;
}

function loadRecentTerms(slug: string): string[] {
  try {
    const raw = localStorage.getItem(recentTermsKey(slug));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((item) => typeof item === 'string');
    }
  } catch (_) {
    // ignore
  }
  return [];
}

function saveRecentTerm(slug: string, term: string) {
  const existing = loadRecentTerms(slug).filter((item) => item.toLowerCase() !== term.toLowerCase());
  const next = [term, ...existing].slice(0, RECENTS_LIMIT);
  try {
    localStorage.setItem(recentTermsKey(slug), JSON.stringify(next));
  } catch (_) {
    // ignore storage errors silently
  }
}

function filterCategorySuggestions(categories: CategoryFacet[] | undefined, query: string): Suggestion[] {
  if (!categories || !query) return [];
  const normalized = query.toLowerCase();
  return categories
    .filter((cat) => cat.path.some((segment) => segment.toLowerCase().includes(normalized)))
    .slice(0, 5)
    .map((cat) => ({
      id: `category-${cat.path.join('/')}`,
      type: 'category' as const,
      label: cat.path.join(' / '),
      value: cat.path[cat.path.length - 1],
      path: cat.path,
      count: cat.count,
    }));
}

function useOutsideClick(handler: () => void) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const listener = (event: MouseEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) return;
      handler();
    };
    document.addEventListener('mousedown', listener);
    return () => document.removeEventListener('mousedown', listener);
  }, [handler]);
  return ref;
}

export function StoreSearchAdvanced({ storeSlug, initialValue = '', categories, onSubmit, onCategorySelect }: StoreSearchAdvancedProps) {
  const { t } = useTranslation();
  const [value, setValue] = useState(initialValue);
  const [open, setOpen] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [itemSuggestions, setItemSuggestions] = useState<Suggestion[]>([]);
  const [highlightIndex, setHighlightIndex] = useState<number>(-1);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const recentSuggestions: Suggestion[] = useMemo(() => {
    return loadRecentTerms(storeSlug).map((term, idx) => ({
      id: `recent-${idx}-${term}`,
      type: 'recent' as const,
      label: term,
      value: term,
    }));
  }, [storeSlug]);

  const categorySuggestions = useMemo(() => filterCategorySuggestions(categories, value), [categories, value]);

  const suggestionList: Suggestion[] = useMemo(() => {
    const combined: Suggestion[] = [];
    if (value.trim()) {
      combined.push(...itemSuggestions);
      combined.push(...categorySuggestions);
    }
    if (recentSuggestions.length > 0) {
      combined.push(...recentSuggestions.filter((suggestion) => suggestion.value.toLowerCase() !== value.trim().toLowerCase()));
    }
    return combined;
  }, [categorySuggestions, itemSuggestions, recentSuggestions, value]);

  const rootRef = useOutsideClick(() => setOpen(false));

  useEffect(() => {
    setValue(initialValue ?? '');
  }, [initialValue]);

  useEffect(() => {
    if (!value || value.trim().length < 2) {
      setItemSuggestions([]);
      setLoadingSuggestions(false);
      return;
    }

    setLoadingSuggestions(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const controller = new AbortController();

    debounceRef.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          q: value.trim(),
          limit: '6',
          sort: 'relevance',
          storeSlug,
        });
        const response = await fetch(`${API_BASE_URL}/search?${params.toString()}`, {
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });
        if (!response.ok) throw new Error('Failed to fetch suggestions');
        const data = await response.json();
        const items = Array.isArray(data?.items) ? data.items.slice(0, 6) : [];
        setItemSuggestions(
          items.map((item: any) => ({
            id: `item-${item.id}`,
            type: 'item' as const,
            label: item.title ?? value,
            value: item.title ?? value,
            itemId: item.id,
          }))
        );
      } catch (error) {
        if ((error as any)?.name !== 'AbortError') {
          setItemSuggestions([]);
        }
      } finally {
        setLoadingSuggestions(false);
      }
    }, AUTOCOMPLETE_DEBOUNCE);

    return () => {
      controller.abort();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [storeSlug, value]);

  const handleSubmit = (term: string) => {
    const trimmed = term.trim();
    setOpen(false);
    setHighlightIndex(-1);
    if (!trimmed) return;
    saveRecentTerm(storeSlug, trimmed);
    onSubmit(trimmed);
  };

  const handleCategory = (path: string[], label: string) => {
    setValue(label);
    setOpen(false);
    setHighlightIndex(-1);
    saveRecentTerm(storeSlug, label);
    onCategorySelect(path);
  };

  const handleFormSubmit = (event: FormEvent) => {
    event.preventDefault();
    handleSubmit(value);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && ['ArrowDown', 'ArrowUp'].includes(event.key) && suggestionList.length > 0) {
      setOpen(true);
      setHighlightIndex(0);
      event.preventDefault();
      return;
    }

    if (!open) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightIndex((prev) => (prev + 1) % suggestionList.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightIndex((prev) => (prev - 1 + suggestionList.length) % suggestionList.length);
    } else if (event.key === 'Enter') {
      if (highlightIndex >= 0 && highlightIndex < suggestionList.length) {
        event.preventDefault();
        const suggestion = suggestionList[highlightIndex];
        if (suggestion.type === 'category') {
          handleCategory(suggestion.path, suggestion.value);
        } else {
          handleSubmit(suggestion.value);
        }
      }
    } else if (event.key === 'Escape') {
      setOpen(false);
      setHighlightIndex(-1);
    }
  };

  return (
    <div ref={rootRef} className="relative w-full">
      <form onSubmit={handleFormSubmit} className="flex w-full flex-col gap-3 text-store-ink lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-store-ink/60" />
          <Input
            ref={inputRef}
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={t('store.search.placeholder', { defaultValue: t('search.placeholder') }) as string}
            aria-label={t('store.search.placeholder', { defaultValue: t('search.placeholder') }) as string}
            className="border border-store-ink/20 bg-store-bg/90 text-store-ink placeholder:text-store-ink/50 pl-9"
          />
          {open && suggestionList.length > 0 && (
            <div className="absolute z-40 mt-2 w-full overflow-hidden rounded-md border border-store-ink/20 bg-store-bg/95 shadow-lg">
              <ul role="listbox" className="max-h-72 overflow-y-auto py-1">
                {suggestionList.map((suggestion, index) => {
                  const isActive = index === highlightIndex;
                  const baseClasses = isActive ? 'bg-store-brand/15 text-store-brand' : 'text-store-ink/80';
                  return (
                    <li key={suggestion.id}
                      role="option"
                      aria-selected={isActive}
                      className={`flex cursor-pointer items-center gap-3 px-3 py-2 text-sm transition hover:bg-store-brand/10 ${baseClasses}`}
                      onMouseEnter={() => setHighlightIndex(index)}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        if (suggestion.type === 'category') {
                          handleCategory(suggestion.path, suggestion.value);
                        } else {
                          handleSubmit(suggestion.value);
                        }
                      }}
                    >
                      {suggestion.type === 'recent' && <Clock className="h-4 w-4 text-store-ink/50" />}
                      {suggestion.type === 'category' && <Tag className="h-4 w-4 text-store-ink/50" />}
                      {suggestion.type === 'item' && <Package className="h-4 w-4 text-store-ink/50" />}
                      <div className="flex flex-1 flex-col">
                        <span className="line-clamp-1 font-medium">{suggestion.label}</span>
                        {suggestion.type === 'category' && (
                          <span className="text-xs text-store-ink/60">{suggestion.path.join(' › ')} • {suggestion.count}</span>
                        )}
                      </div>
                      <ArrowUpRight className="h-3 w-3 text-store-ink/40" />
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          {open && !loadingSuggestions && suggestionList.length === 0 && value.trim() && (
            <div className="absolute z-40 mt-2 w-full rounded-md border border-store-ink/20 bg-store-bg/95 px-3 py-4 text-sm text-store-ink/70 shadow-lg">
              {t('store.search.noSuggestions', { defaultValue: 'Nenhuma sugestão encontrada.' })}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button type="submit" className="w-full bg-store-brand text-store-ink hover:bg-store-brand/90 lg:w-auto">
            {t('search.button')}
          </Button>
          {value && (
            <Button
              type="button"
              variant="ghost"
              className="flex items-center gap-1 text-store-ink/70 hover:bg-store-brand/10"
              onClick={() => {
                setValue('');
                inputRef.current?.focus();
              }}
            >
              <X className="h-4 w-4" />
              <span>{t('common.clear', { defaultValue: 'Limpar' })}</span>
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

export default StoreSearchAdvanced;
