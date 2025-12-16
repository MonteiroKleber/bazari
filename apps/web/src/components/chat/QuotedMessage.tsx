import { cn } from '@/lib/utils';
import { ReplyToData } from '@bazari/shared-types';

interface QuotedMessageProps {
  replyToData: ReplyToData;
  plaintext?: string; // Texto decriptado no frontend
  isOwn: boolean;
  onScrollTo?: (messageId: string) => void;
}

/**
 * Preview da mensagem original dentro da bolha de reply.
 * Exibido quando a mensagem é uma resposta a outra mensagem.
 */
export function QuotedMessage({ replyToData, plaintext, isOwn, onScrollTo }: QuotedMessageProps) {
  const handleClick = () => {
    if (onScrollTo && !replyToData.deleted) {
      onScrollTo(replyToData.id);
    }
  };

  // Se a mensagem foi deletada
  if (replyToData.deleted) {
    return (
      <div
        className={cn(
          'px-3 py-2 mb-1 rounded-lg border-l-2 cursor-default',
          isOwn
            ? 'bg-primary-foreground/10 border-primary-foreground/30'
            : 'bg-background/50 border-muted-foreground/30',
        )}
      >
        <p className={cn(
          'text-xs italic',
          isOwn ? 'text-primary-foreground/60' : 'text-muted-foreground',
        )}>
          Mensagem removida
        </p>
      </div>
    );
  }

  // Truncar texto longo
  const displayText = plaintext
    ? plaintext.length > 80
      ? plaintext.slice(0, 80) + '...'
      : plaintext
    : getTypeLabel(replyToData.type);

  const authorName = replyToData.fromName || replyToData.fromHandle || 'Usuário';

  return (
    <div
      onClick={handleClick}
      className={cn(
        'px-3 py-2 mb-1 rounded-lg border-l-2 transition-colors',
        onScrollTo && 'cursor-pointer hover:opacity-80',
        isOwn
          ? 'bg-primary-foreground/10 border-primary-foreground/50'
          : 'bg-background/50 border-primary/50',
      )}
    >
      <p className={cn(
        'text-xs font-medium truncate',
        isOwn ? 'text-primary-foreground/80' : 'text-primary',
      )}>
        {authorName}
      </p>
      <p className={cn(
        'text-xs truncate',
        isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground',
      )}>
        {displayText}
      </p>
    </div>
  );
}

function getTypeLabel(type: string): string {
  switch (type) {
    case 'image':
      return '📷 Imagem';
    case 'video':
      return '🎬 Vídeo';
    case 'audio':
      return '🎵 Áudio';
    case 'file':
      return '📎 Arquivo';
    case 'proposal':
      return '📋 Proposta';
    default:
      return 'Mensagem';
  }
}
