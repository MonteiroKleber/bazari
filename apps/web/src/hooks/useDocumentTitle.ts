import { useEffect } from 'react';

/**
 * Hook para atualizar o título do documento com contador de notificações
 */
export function useDocumentTitle(baseTitle: string, unreadCount: number) {
  useEffect(() => {
    if (unreadCount > 0) {
      document.title = `(${unreadCount > 99 ? '99+' : unreadCount}) ${baseTitle}`;
    } else {
      document.title = baseTitle;
    }

    // Restaurar título original ao desmontar
    return () => {
      document.title = baseTitle;
    };
  }, [baseTitle, unreadCount]);
}
