import { useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface LastSeenTextProps {
  isOnline: boolean;
  lastSeenAt?: string | null;
  className?: string;
}

/**
 * Texto formatado de "visto por último"
 */
export function LastSeenText({ isOnline, lastSeenAt, className }: LastSeenTextProps) {
  const text = useMemo(() => {
    if (isOnline) {
      return 'online';
    }

    if (!lastSeenAt) {
      return 'offline';
    }

    try {
      const date = new Date(lastSeenAt);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      // Menos de 1 minuto
      if (diffMinutes < 1) {
        return 'visto agora';
      }

      // Menos de 60 minutos
      if (diffMinutes < 60) {
        return `visto há ${diffMinutes} min`;
      }

      // Menos de 24 horas
      if (diffHours < 24) {
        return `visto há ${diffHours}h`;
      }

      // Menos de 7 dias - usar date-fns
      if (diffDays < 7) {
        return `visto ${formatDistanceToNow(date, { addSuffix: true, locale: ptBR })}`;
      }

      // Mais de 7 dias - mostrar data
      return `visto em ${date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`;
    } catch {
      return 'offline';
    }
  }, [isOnline, lastSeenAt]);

  return (
    <span className={className}>
      {text}
    </span>
  );
}
