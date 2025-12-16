import { Check, CheckCheck, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MessageStatus as Status } from '@bazari/shared-types';

interface MessageStatusProps {
  status: Status;
  className?: string;
}

/**
 * Componente que exibe o status de uma mensagem enviada.
 * - sending: Relógio (mensagem sendo enviada)
 * - sent: Check simples cinza (servidor recebeu)
 * - delivered: Double check cinza (dispositivo recebeu)
 * - read: Double check azul (usuário leu)
 * - failed: X vermelho (erro no envio)
 */
export function MessageStatus({ status, className }: MessageStatusProps) {
  const iconClass = 'h-3.5 w-3.5';

  switch (status) {
    case 'sending':
      return (
        <span className={cn('inline-flex items-center', className)} title="Enviando...">
          <Clock className={cn(iconClass, 'text-muted-foreground/70 animate-pulse')} />
        </span>
      );
    case 'sent':
      return (
        <span className={cn('inline-flex items-center', className)} title="Enviado">
          <Check className={cn(iconClass, 'text-muted-foreground/70')} />
        </span>
      );
    case 'delivered':
      return (
        <span className={cn('inline-flex items-center', className)} title="Entregue">
          <CheckCheck className={cn(iconClass, 'text-muted-foreground/70')} />
        </span>
      );
    case 'read':
      return (
        <span className={cn('inline-flex items-center', className)} title="Lido">
          <CheckCheck className={cn(iconClass, 'text-blue-500')} />
        </span>
      );
    case 'failed':
      return (
        <span className={cn('inline-flex items-center', className)} title="Falha no envio">
          <AlertCircle className={cn(iconClass, 'text-destructive')} />
        </span>
      );
    default:
      return null;
  }
}

/**
 * Helper para derivar o status de uma mensagem baseado nos timestamps.
 * @param message - A mensagem
 * @param isOwn - Se é mensagem enviada pelo usuário atual
 * @returns O status da mensagem ou undefined se não for mensagem própria
 */
export function getMessageStatus(
  message: { id: string; deliveredAt?: number; readAt?: number },
  isOwn: boolean
): Status | undefined {
  // Só mostra status para mensagens próprias
  if (!isOwn) return undefined;

  // Mensagem temporária (ainda sendo enviada)
  if (message.id.startsWith('temp-')) return 'sending';

  // Derivar status dos timestamps
  if (message.readAt) return 'read';
  if (message.deliveredAt) return 'delivered';
  return 'sent';
}
