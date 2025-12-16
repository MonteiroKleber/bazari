import { useState, useEffect, useCallback, useRef } from 'react';
import { apiHelpers } from '@/lib/api';

const POLLING_INTERVAL_MS = 30000; // 30 segundos

interface UseNewPostsIndicatorOptions {
  tab?: 'for-you' | 'following' | 'popular';
  enabled?: boolean;
}

interface UseNewPostsIndicatorReturn {
  newPostsCount: number;
  lastCheckedAt: string | null;
  clearAndRefresh: () => void;
  isChecking: boolean;
}

export function useNewPostsIndicator(
  options: UseNewPostsIndicatorOptions = {}
): UseNewPostsIndicatorReturn {
  const { tab = 'for-you', enabled = true } = options;

  const [newPostsCount, setNewPostsCount] = useState(0);
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isVisibleRef = useRef(true);

  // Inicializar lastCheckedAt quando o componente monta
  useEffect(() => {
    if (!lastCheckedAt) {
      setLastCheckedAt(new Date().toISOString());
    }
  }, [lastCheckedAt]);

  // Função para checar novos posts
  const checkNewPosts = useCallback(async () => {
    if (!lastCheckedAt || !enabled || isChecking) return;

    setIsChecking(true);
    try {
      const result = await apiHelpers.getFeedCount({
        since: lastCheckedAt,
        tab,
      });
      setNewPostsCount(result.count);
    } catch (error) {
      // Silenciar erros de polling
      console.debug('[useNewPostsIndicator] Error checking new posts:', error);
    } finally {
      setIsChecking(false);
    }
  }, [lastCheckedAt, tab, enabled, isChecking]);

  // Função para limpar contador e atualizar timestamp
  const clearAndRefresh = useCallback(() => {
    setNewPostsCount(0);
    setLastCheckedAt(new Date().toISOString());
  }, []);

  // Gerenciar visibilidade da página
  useEffect(() => {
    const handleVisibilityChange = () => {
      isVisibleRef.current = !document.hidden;

      if (document.hidden) {
        // Pausar polling quando aba em background
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } else {
        // Retomar polling quando aba volta ao foco
        checkNewPosts();
        intervalRef.current = setInterval(checkNewPosts, POLLING_INTERVAL_MS);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkNewPosts]);

  // Iniciar polling
  useEffect(() => {
    if (!enabled || !lastCheckedAt) return;

    // Primeira checagem após um pequeno delay
    const initialTimeout = setTimeout(() => {
      checkNewPosts();
    }, 5000); // Espera 5s antes da primeira checagem

    // Polling a cada 30 segundos
    intervalRef.current = setInterval(checkNewPosts, POLLING_INTERVAL_MS);

    return () => {
      clearTimeout(initialTimeout);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, lastCheckedAt, checkNewPosts]);

  // Resetar contador quando tab muda
  useEffect(() => {
    setNewPostsCount(0);
    setLastCheckedAt(new Date().toISOString());
  }, [tab]);

  return {
    newPostsCount,
    lastCheckedAt,
    clearAndRefresh,
    isChecking,
  };
}
