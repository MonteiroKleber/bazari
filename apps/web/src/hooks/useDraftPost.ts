import { useState, useCallback, useEffect, useRef } from 'react';

const STORAGE_KEY = 'bazari:post-draft';
const DRAFT_EXPIRATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const DEBOUNCE_MS = 3000; // 3 seconds

export interface PostDraft {
  content: string;
  kind: 'text' | 'poll';
  pollOptions?: string[];
  pollDuration?: string;
  savedAt: number;
}

export interface UseDraftPostReturn {
  hasDraft: boolean;
  draft: PostDraft | null;
  lastSaved: Date | null;
  saveDraft: (data: Omit<PostDraft, 'savedAt'>) => void;
  clearDraft: () => void;
  getDraft: () => PostDraft | null;
  isSaving: boolean;
}

function loadDraftFromStorage(): PostDraft | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const draft = JSON.parse(stored) as PostDraft;

    // Check expiration
    if (Date.now() - draft.savedAt > DRAFT_EXPIRATION_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    // Check if content is empty
    if (!draft.content.trim()) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return draft;
  } catch (e) {
    console.warn('[useDraftPost] Failed to load from localStorage:', e);
    return null;
  }
}

function saveDraftToStorage(draft: PostDraft): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch (e) {
    console.warn('[useDraftPost] Failed to save to localStorage:', e);
  }
}

function clearDraftFromStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn('[useDraftPost] Failed to clear from localStorage:', e);
  }
}

export function useDraftPost(): UseDraftPostReturn {
  const [draft, setDraft] = useState<PostDraft | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Load draft on mount
  useEffect(() => {
    const storedDraft = loadDraftFromStorage();
    if (storedDraft) {
      setDraft(storedDraft);
      setLastSaved(new Date(storedDraft.savedAt));
    }
  }, []);

  const saveDraft = useCallback((data: Omit<PostDraft, 'savedAt'>) => {
    // Clear existing debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Don't save empty content
    if (!data.content.trim()) {
      clearDraftFromStorage();
      setDraft(null);
      setLastSaved(null);
      return;
    }

    setIsSaving(true);

    // Debounce save
    debounceRef.current = setTimeout(() => {
      const newDraft: PostDraft = {
        ...data,
        savedAt: Date.now(),
      };

      saveDraftToStorage(newDraft);
      setDraft(newDraft);
      setLastSaved(new Date(newDraft.savedAt));
      setIsSaving(false);
    }, DEBOUNCE_MS);
  }, []);

  const clearDraft = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    clearDraftFromStorage();
    setDraft(null);
    setLastSaved(null);
    setIsSaving(false);
  }, []);

  const getDraft = useCallback((): PostDraft | null => {
    return loadDraftFromStorage();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return {
    hasDraft: draft !== null,
    draft,
    lastSaved,
    saveDraft,
    clearDraft,
    getDraft,
    isSaving,
  };
}
