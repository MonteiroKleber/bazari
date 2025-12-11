import { useState, useCallback } from 'react';

export interface ToastItem {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback(
    (message: string, type: ToastItem['type'] = 'info', duration = 5000) => {
      const id = Math.random().toString(36).substr(2, 9);
      const toast: ToastItem = { id, message, type, duration };

      setToasts((prev) => [...prev, toast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }

      return id;
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string) => addToast(message, 'info'),
    [addToast]
  );

  const success = useCallback(
    (message: string) => addToast(message, 'success'),
    [addToast]
  );

  const warning = useCallback(
    (message: string) => addToast(message, 'warning'),
    [addToast]
  );

  const error = useCallback(
    (message: string) => addToast(message, 'error'),
    [addToast]
  );

  const clear = useCallback(() => {
    setToasts([]);
  }, []);

  return {
    toasts,
    addToast,
    removeToast,
    toast,
    success,
    warning,
    error,
    clear,
  };
}
