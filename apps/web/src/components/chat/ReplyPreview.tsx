import { X } from 'lucide-react';
import { Button } from '../ui/button';

interface ReplyPreviewProps {
  senderName: string;
  plaintext?: string;
  type: string;
  onCancel: () => void;
}

/**
 * Preview da mensagem sendo respondida, exibido no Composer.
 * Aparece acima do input quando o usuário seleciona "Responder".
 */
export function ReplyPreview({ senderName, plaintext, type, onCancel }: ReplyPreviewProps) {
  // Truncar texto longo
  const truncatedText = plaintext
    ? plaintext.length > 100
      ? plaintext.slice(0, 100) + '...'
      : plaintext
    : getTypeLabel(type);

  return (
    <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg border-l-4 border-primary animate-in slide-in-from-bottom-2 duration-200">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-primary truncate">
          Respondendo a {senderName}
        </p>
        <p className="text-sm text-muted-foreground truncate">
          {truncatedText}
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 flex-shrink-0"
        onClick={onCancel}
      >
        <X className="h-4 w-4" />
      </Button>
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
