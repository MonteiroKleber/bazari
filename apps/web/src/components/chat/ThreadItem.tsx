import { ChatThreadWithParticipants } from '@bazari/shared-types';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useChat } from '@/hooks/useChat';
import { Users } from 'lucide-react';

interface ThreadItemProps {
  thread: ChatThreadWithParticipants;
  onClick: () => void;
}

export function ThreadItem({ thread, onClick }: ThreadItemProps) {
  const currentProfileId = useChat((state) => state.currentProfileId);
  const groups = useChat((state) => state.groups);

  // Se for GRUPO, buscar informações do grupo
  if (thread.kind === 'group' && thread.groupId) {
    const group = groups.find(g => g.id === thread.groupId);

    return (
      <div
        onClick={onClick}
        className="flex items-center gap-3 p-3 hover:bg-accent rounded-lg cursor-pointer transition"
      >
        <Avatar className="h-12 w-12">
          {group?.avatarUrl ? (
            <AvatarImage src={group.avatarUrl} alt={group.name} />
          ) : (
            <AvatarFallback className="bg-blue-500/10 text-blue-500 text-lg font-semibold">
              <Users className="h-6 w-6" />
            </AvatarFallback>
          )}
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold truncate">
                {group?.name || 'Grupo'}
              </h3>
              <span className="text-xs text-muted-foreground">
                ({thread.participants.length} membros)
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(thread.lastMessageAt, {
                addSuffix: true,
                locale: ptBR,
              })}
            </span>
          </div>
          <p className="text-sm text-muted-foreground truncate">
            Grupo • {group?.isPublic ? 'Público' : 'Privado'}
          </p>
        </div>

        {thread.unreadCount > 0 && (
          <div className="bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {thread.unreadCount}
          </div>
        )}
      </div>
    );
  }

  // Para DMs (conversas 1-para-1)
  // Encontrar o OUTRO participante (não o usuário logado)
  const otherParticipant = thread.participantsData?.find(
    (p) => p.profileId !== currentProfileId
  );

  if (!otherParticipant) {
    // Fallback se participantsData não existir ou não encontrar outro participante
    const otherParticipantId = thread.participants.find(
      (id) => id !== currentProfileId
    );
    return (
      <div
        onClick={onClick}
        className="flex items-center gap-3 p-3 hover:bg-accent rounded-lg cursor-pointer transition"
      >
        <Avatar className="h-12 w-12">
          <AvatarFallback>?</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold truncate text-muted-foreground">
              {otherParticipantId?.slice(0, 8)}...
            </h3>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(thread.lastMessageAt, {
                addSuffix: true,
                locale: ptBR,
              })}
            </span>
          </div>
          <p className="text-sm text-muted-foreground truncate">
            Carregando...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 p-3 hover:bg-accent rounded-lg cursor-pointer transition"
    >
      <Avatar className="h-12 w-12">
        <AvatarImage src={otherParticipant.avatarUrl} alt={otherParticipant.name || otherParticipant.handle} />
        <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
          {(otherParticipant.name?.[0] || otherParticipant.handle[0]).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold truncate">
            {otherParticipant.name || `@${otherParticipant.handle}`}
          </h3>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(thread.lastMessageAt, {
              addSuffix: true,
              locale: ptBR,
            })}
          </span>
        </div>
        <p className="text-sm text-muted-foreground truncate">
          Última mensagem...
        </p>
      </div>

      {thread.unreadCount > 0 && (
        <div className="bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
          {thread.unreadCount}
        </div>
      )}
    </div>
  );
}
