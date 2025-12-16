import { TypingUser } from '@bazari/shared-types';
import { cn } from '@/lib/utils';

interface TypingIndicatorProps {
  typingUsers: TypingUser[];
  className?: string;
}

/**
 * Componente que exibe indicador de "digitando..."
 * Similar ao WhatsApp com animação de três pontos
 */
export function TypingIndicator({ typingUsers, className }: TypingIndicatorProps) {
  if (typingUsers.length === 0) return null;

  const text = getTypingText(typingUsers);

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground animate-in fade-in duration-200',
        className
      )}
    >
      {/* Animação de três pontos */}
      <div className="flex gap-1">
        <span className="w-1.5 h-1.5 bg-muted-foreground/70 rounded-full animate-bounce [animation-delay:-0.3s]" />
        <span className="w-1.5 h-1.5 bg-muted-foreground/70 rounded-full animate-bounce [animation-delay:-0.15s]" />
        <span className="w-1.5 h-1.5 bg-muted-foreground/70 rounded-full animate-bounce" />
      </div>
      <span className="italic">{text}</span>
    </div>
  );
}

/**
 * Gera o texto do indicador baseado nos usuários digitando
 */
function getTypingText(users: TypingUser[]): string {
  if (users.length === 0) return '';

  if (users.length === 1) {
    return `${users[0].displayName || users[0].handle} está digitando...`;
  }

  if (users.length === 2) {
    const names = users.map(u => u.displayName || u.handle);
    return `${names[0]} e ${names[1]} estão digitando...`;
  }

  // 3 ou mais
  const firstName = users[0].displayName || users[0].handle;
  return `${firstName} e mais ${users.length - 1} estão digitando...`;
}

/**
 * Versão compacta para uso em bubbles ou inline
 */
export function TypingDots({ className }: { className?: string }) {
  return (
    <div className={cn('flex gap-0.5 items-center', className)}>
      <span className="w-1 h-1 bg-current rounded-full animate-bounce [animation-delay:-0.3s]" />
      <span className="w-1 h-1 bg-current rounded-full animate-bounce [animation-delay:-0.15s]" />
      <span className="w-1 h-1 bg-current rounded-full animate-bounce" />
    </div>
  );
}
