import { ChatThreadWithParticipants, ChatThreadPreference } from '@bazari/shared-types';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useChat } from '@/hooks/useChat';
import { Users, Pin, Archive, Bell, BellOff, ArchiveRestore } from 'lucide-react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '../ui/context-menu';
import { apiHelpers } from '@/lib/api';
import { cn } from '@/lib/utils';
import { TypingDots } from './TypingIndicator';
import { OnlineIndicator } from './OnlineIndicator';

interface ThreadItemProps {
  thread: ChatThreadWithParticipants;
  onClick: () => void;
  preference?: ChatThreadPreference;
  onPreferenceChange?: () => void;
}

export function ThreadItem({ thread, onClick, preference, onPreferenceChange }: ThreadItemProps) {
  const currentProfileId = useChat((state) => state.currentProfileId);
  const groups = useChat((state) => state.groups);
  const typingUsers = useChat((state) => state.typingUsers);
  const getPresence = useChat((state) => state.getPresence);

  // Usuários digitando nesta thread
  const threadTypingUsers = typingUsers.get(thread.id) || [];

  /**
   * Gera o texto de preview para typing ou última mensagem
   */
  const getPreviewText = (defaultText: string): JSX.Element => {
    if (threadTypingUsers.length === 0) {
      return <>{defaultText}</>;
    }

    // Mostrar "digitando..." com animação
    if (threadTypingUsers.length === 1) {
      return (
        <span className="flex items-center gap-1 text-primary italic">
          <TypingDots className="text-primary" />
          <span>{threadTypingUsers[0].displayName || threadTypingUsers[0].handle} digitando...</span>
        </span>
      );
    }

    return (
      <span className="flex items-center gap-1 text-primary italic">
        <TypingDots className="text-primary" />
        <span>Vários digitando...</span>
      </span>
    );
  };

  const handlePin = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiHelpers.pinThread(thread.id, !preference?.isPinned);
      onPreferenceChange?.();
    } catch (err) {
      console.error('Failed to pin thread:', err);
    }
  };

  const handleArchive = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiHelpers.archiveThread(thread.id, !preference?.isArchived);
      onPreferenceChange?.();
    } catch (err) {
      console.error('Failed to archive thread:', err);
    }
  };

  const handleMute = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiHelpers.muteThread(thread.id, !preference?.isMuted);
      onPreferenceChange?.();
    } catch (err) {
      console.error('Failed to mute thread:', err);
    }
  };

  const renderContent = () => {
    // Se for GRUPO, buscar informações do grupo
    if (thread.kind === 'group' && thread.groupId) {
      const group = groups.find(g => g.id === thread.groupId);

      return (
        <>
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
            <div className="flex items-center gap-2">
              {preference?.isPinned && (
                <Pin className="h-3 w-3 text-primary" />
              )}
              <h3 className="font-semibold truncate">
                {group?.name || 'Grupo'}
              </h3>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                ({thread.participants.length} membros)
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(thread.lastMessageAt, {
                  addSuffix: true,
                  locale: ptBR,
                })}
              </span>
            </div>
            <p className="text-sm text-muted-foreground truncate">
              {getPreviewText(`Grupo • ${group?.isPublic ? 'Público' : 'Privado'}`)}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {preference?.isMuted && (
              <BellOff className="h-4 w-4 text-muted-foreground" />
            )}
            {thread.unreadCount > 0 && !preference?.isMuted && (
              <div className="bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {thread.unreadCount}
              </div>
            )}
          </div>
        </>
      );
    }

    // Para DMs (conversas 1-para-1)
    // Tentar encontrar o outro participante (não eu) nos dados
    let otherParticipant = thread.participantsData?.find(
      (p) => p.profileId !== currentProfileId
    );

    // Se currentProfileId ainda não carregou, mostrar o primeiro participante com avatar
    if (!otherParticipant && thread.participantsData?.length) {
      // Preferir participante com avatarUrl, senão primeiro disponível
      otherParticipant = thread.participantsData.find(p => p.avatarUrl) || thread.participantsData[0];
    }

    if (!otherParticipant) {
      // Fallback: mostrar ID parcial
      const fallbackId = thread.participants.find(id => id !== currentProfileId) || thread.participants[0];
      return (
        <>
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-primary/10 text-primary">
              {fallbackId?.charAt(0)?.toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {preference?.isPinned && (
                  <Pin className="h-3 w-3 text-primary" />
                )}
                <h3 className="font-semibold truncate text-muted-foreground">
                  {fallbackId?.slice(0, 8) || '...'}
                </h3>
              </div>
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
        </>
      );
    }

    // Obter presença do outro participante
    const presence = getPresence(otherParticipant.profileId);
    const isOnline = presence?.status === 'online';

    return (
      <>
        <div className="relative">
          <Avatar className="h-12 w-12">
            {otherParticipant.avatarUrl ? (
              <AvatarImage src={otherParticipant.avatarUrl} alt={otherParticipant.name || otherParticipant.handle} />
            ) : null}
            <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
              {(otherParticipant.name?.[0] || otherParticipant.handle?.[0] || '?').toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {/* Indicador de online */}
          <OnlineIndicator
            isOnline={isOnline}
            size="sm"
            className="absolute bottom-0 right-0"
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {preference?.isPinned && (
              <Pin className="h-3 w-3 text-primary" />
            )}
            <h3 className="font-semibold truncate">
              {otherParticipant.name || `@${otherParticipant.handle}`}
            </h3>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              @{otherParticipant.handle}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(thread.lastMessageAt, {
                addSuffix: true,
                locale: ptBR,
              })}
            </span>
          </div>
          <p className="text-sm text-muted-foreground truncate">
            {getPreviewText('Última mensagem...')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {preference?.isMuted && (
            <BellOff className="h-4 w-4 text-muted-foreground" />
          )}
          {thread.unreadCount > 0 && !preference?.isMuted && (
            <div className="bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {thread.unreadCount}
            </div>
          )}
        </div>
      </>
    );
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          onClick={onClick}
          className={cn(
            'flex items-center gap-3 p-3 hover:bg-accent rounded-lg cursor-pointer transition',
            preference?.isArchived && 'opacity-60',
          )}
        >
          {renderContent()}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem onClick={handlePin}>
          <Pin className="mr-2 h-4 w-4" />
          {preference?.isPinned ? 'Desafixar' : 'Fixar'}
        </ContextMenuItem>
        <ContextMenuItem onClick={handleArchive}>
          {preference?.isArchived ? (
            <>
              <ArchiveRestore className="mr-2 h-4 w-4" />
              Desarquivar
            </>
          ) : (
            <>
              <Archive className="mr-2 h-4 w-4" />
              Arquivar
            </>
          )}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={handleMute}>
          {preference?.isMuted ? (
            <>
              <Bell className="mr-2 h-4 w-4" />
              Ativar notificações
            </>
          ) : (
            <>
              <BellOff className="mr-2 h-4 w-4" />
              Silenciar
            </>
          )}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
