/**
 * CallHistoryItem - Item individual no histórico de chamadas
 */

import { Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, Video, Trash2, MoreVertical } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCallStore } from '@/stores/call.store';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { CallType, CallStatus } from '@bazari/shared-types';

interface CallHistoryItemProps {
  call: {
    id: string;
    threadId: string;
    type: CallType;
    status: CallStatus;
    caller: {
      id: string;
      handle: string;
      displayName: string | null;
      avatarUrl: string | null;
    };
    callee: {
      id: string;
      handle: string;
      displayName: string | null;
      avatarUrl: string | null;
    };
    isOutgoing: boolean;
    startedAt: string | null;
    endedAt: string | null;
    duration: number | null;
    createdAt: string;
  };
  onCallClick?: (profileId: string, threadId: string, type: CallType) => void;
  onDeleteCall?: (callId: string) => void;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function CallHistoryItem({ call, onCallClick, onDeleteCall }: CallHistoryItemProps) {
  const { state: callState } = useCallStore();
  const isIdle = callState === 'idle';

  // Determinar o outro participante
  const otherParticipant = call.isOutgoing ? call.callee : call.caller;
  const isMissed = call.status === 'MISSED' && !call.isOutgoing;
  const isRejected = call.status === 'REJECTED';
  const wasNotAnswered = call.status === 'MISSED' && call.isOutgoing;

  const initials = (otherParticipant.displayName || otherParticipant.handle)
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Ícone baseado no tipo e direção
  const CallIcon = () => {
    const isVideo = call.type === 'VIDEO';

    if (isMissed) {
      return <PhoneMissed className="h-4 w-4 text-red-500" />;
    }

    if (call.isOutgoing) {
      return isVideo ? (
        <Video className="h-4 w-4 text-muted-foreground" />
      ) : (
        <PhoneOutgoing className="h-4 w-4 text-muted-foreground" />
      );
    }

    return isVideo ? (
      <Video className="h-4 w-4 text-muted-foreground" />
    ) : (
      <PhoneIncoming className="h-4 w-4 text-muted-foreground" />
    );
  };

  // Status text
  const getStatusText = () => {
    if (isMissed) return 'Perdida';
    if (isRejected) return 'Recusada';
    if (wasNotAnswered) return 'Não atendeu';
    if (call.duration) return formatDuration(call.duration);
    return 'Sem duração';
  };

  // Texto do tipo de chamada
  const callTypeText = call.type === 'VIDEO' ? 'Videochamada' : 'Chamada de voz';

  // Formatar data
  const formattedDate = formatDistanceToNow(new Date(call.createdAt), {
    addSuffix: true,
    locale: ptBR,
  });

  const handleCallClick = () => {
    if (onCallClick && isIdle) {
      onCallClick(otherParticipant.id, call.threadId, call.type);
    }
  };

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors',
        isMissed && 'bg-red-500/5'
      )}
    >
      {/* Avatar */}
      <Avatar className="h-12 w-12">
        <AvatarImage src={otherParticipant.avatarUrl || undefined} />
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'font-medium truncate',
              isMissed && 'text-red-500'
            )}
          >
            {otherParticipant.displayName || otherParticipant.handle}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <CallIcon />
          <span>{callTypeText}</span>
          <span>•</span>
          <span>{formattedDate}</span>
        </div>
      </div>

      {/* Status e botões */}
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'text-sm',
            isMissed ? 'text-red-500 font-medium' : 'text-muted-foreground'
          )}
        >
          {getStatusText()}
        </span>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleCallClick}
          disabled={!isIdle}
          title={call.type === 'VIDEO' ? 'Videochamada' : 'Ligar'}
          className="h-9 w-9"
        >
          {call.type === 'VIDEO' ? (
            <Video className="h-4 w-4" />
          ) : (
            <Phone className="h-4 w-4" />
          )}
        </Button>

        {/* Menu de opções */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => onDeleteCall?.(call.id)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Remover do histórico
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
