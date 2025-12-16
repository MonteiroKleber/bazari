import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useChat } from '../../hooks/useChat';
import { MessageList } from '../../components/chat/MessageList';
import { ChatComposer } from '../../components/chat/ChatComposer';
import { TypingIndicator } from '../../components/chat/TypingIndicator';
import { Button } from '../../components/ui/button';
import { ArrowLeft, Settings, Phone, Video } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MediaMetadata, ChatMessage, CallProfile } from '@bazari/shared-types';
import { CreateProposalDialog } from '../../components/chat/CreateProposalDialog';
import { LastSeenText } from '../../components/chat/LastSeenText';
import { CallButton } from '../../components/chat/CallButton';

interface ReplyingToMessage {
  id: string;
  from: string;
  senderName: string;
  plaintext?: string;
  type: string;
}

interface EditingMessage {
  id: string;
  plaintext: string;
}

export function ChatThreadPage() {
  const { threadId } = useParams<{ threadId: string }>();
  const navigate = useNavigate();
  const {
    messages,
    threads,
    setActiveThread,
    sendMessage,
    editMessage,
    loadMessages,
    currentProfileId,
    typingUsers,
    markMessagesAsRead,
    getPresence,
    loadPresences,
  } = useChat();
  const [showProposalDialog, setShowProposalDialog] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ReplyingToMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<EditingMessage | null>(null);

  // Encontrar thread atual
  const currentThread = threads.find(t => t.id === threadId);

  const threadMessages = threadId ? messages.get(threadId) || [] : [];

  // Usuários digitando nesta thread
  const currentTypingUsers = threadId ? typingUsers.get(threadId) || [] : [];

  useEffect(() => {
    if (threadId) {
      setActiveThread(threadId);
      loadMessages(threadId);
    }

    return () => setActiveThread(null);
  }, [threadId]);

  // Carregar presença do outro participante (para DMs)
  useEffect(() => {
    if (currentThread?.kind === 'dm') {
      const otherParticipant = currentThread.participants.find(p => p !== currentProfileId);
      if (otherParticipant) {
        loadPresences([otherParticipant]);
      }
    }
  }, [currentThread, currentProfileId, loadPresences]);

  // Marcar mensagens como lidas quando a thread está visível
  useEffect(() => {
    if (threadId && threadMessages.length > 0) {
      markMessagesAsRead(threadId);
    }
  }, [threadId, threadMessages.length, markMessagesAsRead]);

  const handleReplyToMessage = useCallback((message: ChatMessage) => {
    // Obter nome do remetente
    const senderProfile = currentThread?.participantsData?.find(
      p => p.profileId === message.from
    );
    const senderName = senderProfile?.name || senderProfile?.handle || 'Usuário';

    setReplyingTo({
      id: message.id,
      from: message.from,
      senderName,
      plaintext: (message as any).plaintext,
      type: message.type,
    });
  }, [currentThread?.participantsData]);

  const handleCancelReply = useCallback(() => {
    setReplyingTo(null);
  }, []);

  const handleEditMessage = useCallback((message: ChatMessage) => {
    const plaintext = (message as any).plaintext;
    if (plaintext) {
      setEditingMessage({
        id: message.id,
        plaintext,
      });
      // Cancelar reply se estiver ativo
      setReplyingTo(null);
    }
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingMessage(null);
  }, []);

  const handleSaveEdit = useCallback(async (messageId: string, newText: string) => {
    try {
      await editMessage(messageId, newText);
      setEditingMessage(null);
    } catch (err: any) {
      console.error('Failed to edit message:', err);
      alert(err.message || 'Falha ao editar mensagem');
    }
  }, [editMessage]);

  const handleSend = async (text: string, media?: MediaMetadata, replyToId?: string) => {
    if (!threadId) return;
    await sendMessage(threadId, text, media, replyToId);
  };

  // Título da conversa
  const getThreadTitle = () => {
    if (currentThread?.kind === 'group') {
      return 'Grupo';
    }

    // Para DMs, mostrar o nome do outro participante
    const otherParticipant = currentThread?.participantsData?.find(
      p => p.profileId !== currentProfileId
    );

    return otherParticipant?.name || otherParticipant?.handle || 'Conversa';
  };

  // Obter presença do outro participante (para DMs)
  const getOtherParticipantPresence = () => {
    if (currentThread?.kind !== 'dm') return null;

    const otherParticipant = currentThread?.participantsData?.find(
      p => p.profileId !== currentProfileId
    );

    if (!otherParticipant) return null;

    return getPresence(otherParticipant.profileId);
  };

  const otherParticipantPresence = getOtherParticipantPresence();

  return (
    <div className="flex flex-col h-[100dvh] md:h-[calc(100vh-4rem)] container mx-auto px-0 md:px-4 bg-background">
      {/* Header - fixo no desktop, safe area top para notch no mobile */}
      <div
        className="flex items-center justify-between p-4 border-b bg-background sticky top-0 z-10 md:top-16"
        style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
      >
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/app/chat')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-semibold">{getThreadTitle()}</h1>
            {/* Mostrar "digitando..." ou status online no header */}
            {currentTypingUsers.length > 0 ? (
              <span className="text-xs text-muted-foreground">
                {currentTypingUsers.length === 1
                  ? `${currentTypingUsers[0].displayName || currentTypingUsers[0].handle} está digitando...`
                  : 'Vários estão digitando...'}
              </span>
            ) : otherParticipantPresence && (
              <LastSeenText
                isOnline={otherParticipantPresence.status === 'online'}
                lastSeenAt={otherParticipantPresence.lastSeenAt}
                className="text-xs text-muted-foreground"
              />
            )}
          </div>
        </div>

        {/* Botões de chamada e administrar */}
        <div className="flex items-center gap-1">
          {/* Botões de chamada (apenas para DMs) */}
          {currentThread?.kind === 'dm' && threadId && (() => {
            const otherParticipant = currentThread.participantsData?.find(
              p => p.profileId !== currentProfileId
            );
            if (!otherParticipant) return null;

            const callProfile: CallProfile = {
              id: otherParticipant.profileId,
              handle: otherParticipant.handle,
              displayName: otherParticipant.name || null,
              avatarUrl: otherParticipant.avatarUrl || null,
            };

            return (
              <>
                <CallButton
                  threadId={threadId}
                  calleeId={otherParticipant.profileId}
                  callee={callProfile}
                  type="VOICE"
                />
                <CallButton
                  threadId={threadId}
                  calleeId={otherParticipant.profileId}
                  callee={callProfile}
                  type="VIDEO"
                />
              </>
            );
          })()}

          {/* Botão Administrar (apenas para grupos) */}
          {currentThread?.kind === 'group' && currentThread.groupId && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/app/chat/group/${currentThread.groupId}/admin`)}
              title="Administrar Grupo"
            >
              <Settings className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto flex flex-col">
        <MessageList
          messages={threadMessages}
          thread={currentThread}
          onReplyToMessage={handleReplyToMessage}
          onEditMessage={handleEditMessage}
        />

        {/* Typing Indicator */}
        <TypingIndicator typingUsers={currentTypingUsers} />
      </div>

      {/* Composer - safe area bottom para home indicator */}
      <div
        className="border-t p-4 bg-background"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        <ChatComposer
          threadId={threadId || ''}
          messages={threadMessages as unknown as Array<{ plaintext?: string; senderId: string }>}
          currentUserId={currentProfileId || undefined}
          onSend={handleSend}
          onCreateProposal={() => setShowProposalDialog(true)}
          replyingTo={replyingTo}
          onCancelReply={handleCancelReply}
          editingMessage={editingMessage}
          onCancelEdit={handleCancelEdit}
          onSaveEdit={handleSaveEdit}
        />
      </div>

      {/* Proposal Dialog */}
      {threadId && (
        <CreateProposalDialog
          open={showProposalDialog}
          onOpenChange={setShowProposalDialog}
          threadId={threadId}
        />
      )}
    </div>
  );
}
