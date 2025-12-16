import { useState, useCallback, useMemo, useEffect } from 'react';

const STORAGE_KEY = 'bazari-feed-filters';

export interface FeedFilters {
  showReposts: boolean;
  showPolls: boolean;
  onlyWithMedia: boolean;
}

const DEFAULT_FILTERS: FeedFilters = {
  showReposts: true,
  showPolls: true,
  onlyWithMedia: false,
};

interface FeedFiltersReturn {
  filters: FeedFilters;
  setFilter: <K extends keyof FeedFilters>(key: K, value: FeedFilters[K]) => void;
  toggleFilter: <K extends keyof FeedFilters>(key: K) => void;
  resetFilters: () => void;
  activeFiltersCount: number;
  filterPosts: <T extends { kind?: string; media?: unknown[] }>(posts: T[]) => T[];
}

function loadFiltersFromStorage(): FeedFilters {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_FILTERS, ...parsed };
    }
  } catch (e) {
    console.warn('[useFeedFilters] Failed to load from localStorage:', e);
  }
  return DEFAULT_FILTERS;
}

function saveFiltersToStorage(filters: FeedFilters): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  } catch (e) {
    console.warn('[useFeedFilters] Failed to save to localStorage:', e);
  }
}

export function useFeedFilters(): FeedFiltersReturn {
  const [filters, setFilters] = useState<FeedFilters>(DEFAULT_FILTERS);

  // Load from localStorage on mount
  useEffect(() => {
    setFilters(loadFiltersFromStorage());
  }, []);

  // Save to localStorage when filters change
  useEffect(() => {
    saveFiltersToStorage(filters);
  }, [filters]);

  const setFilter = useCallback(<K extends keyof FeedFilters>(key: K, value: FeedFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const toggleFilter = useCallback(<K extends keyof FeedFilters>(key: K) => {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (!filters.showReposts) count++;
    if (!filters.showPolls) count++;
    if (filters.onlyWithMedia) count++;
    return count;
  }, [filters]);

  const filterPosts = useCallback(<T extends { kind?: string; media?: unknown[] }>(posts: T[]): T[] => {
    return posts.filter((post) => {
      // Filter reposts
      if (!filters.showReposts && post.kind === 'REPOST') {
        return false;
      }

      // Filter polls
      if (!filters.showPolls && post.kind === 'POLL') {
        return false;
      }

      // Only with media
      if (filters.onlyWithMedia) {
        const hasMedia = Array.isArray(post.media) && post.media.length > 0;
        if (!hasMedia) {
          return false;
        }
      }

      return true;
    });
  }, [filters]);

  return {
    filters,
    setFilter,
    toggleFilter,
    resetFilters,
    activeFiltersCount,
    filterPosts,
  };
}
