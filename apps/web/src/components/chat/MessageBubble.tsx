import { ChatMessage, MediaMetadata } from '@bazari/shared-types';
import { format } from 'date-fns';
import { ChatMediaPreview } from './ChatMediaPreview';
import { ProposalCard } from './ProposalCard';
import { MultiStoreProposalCard } from './MultiStoreProposalCard';
import { MessageStatus, getMessageStatus } from './MessageStatus';
import { QuotedMessage } from './QuotedMessage';
import { ReactionBar } from './ReactionBar';
import { FormattedText } from './FormattedText';
import { LinkPreview, extractFirstUrl } from './LinkPreview';
import { useChat } from '@/hooks/useChat';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Reply, Copy, Lock, Pencil, Trash2, Ban } from 'lucide-react';

export interface MessageBubbleProps {
  message: ChatMessage;
  // Grouping props (opcional para retrocompatibilidade)
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
  showAvatar?: boolean;
  senderProfile?: {
    displayName: string;
    avatarUrl?: string;
    handle: string;
  };
  onScrollToMessage?: (messageId: string) => void;
  onReply?: (message: ChatMessage) => void;
  onEdit?: (message: ChatMessage) => void;
}

export function MessageBubble({
  message,
  isFirstInGroup = true,
  isLastInGroup = true,
  showAvatar = true,
  senderProfile,
  onScrollToMessage,
  onReply,
  onEdit,
}: MessageBubbleProps) {
  const currentProfileId = useChat((state) => state.currentProfileId);
  const isMe = message.from === currentProfileId || message.from === 'me';
  const plaintext = (message as any).plaintext || '[Cifrado]';
  const isEncryptedError = plaintext.includes('E2EE não estabelecida') || plaintext === '[Cifrado]';
  const isDeleted = !!(message as any).deletedAt;
  const isEdited = !!(message as any).editedAt;
  const { proposals, loadProposal, acceptProposal, threads, toggleReaction, deleteMessage, blockProfile, isProfileBlocked } = useChat();
  const [isAccepting, setIsAccepting] = useState(false);

  // Verificar se é uma proposta
  const isProposal = message.type === 'proposal' && message.meta?.proposalId;
  const proposalId = message.meta?.proposalId;
  const proposal = isProposal && proposalId ? proposals.get(proposalId) : null;

  // Verificar se é grupo
  const thread = threads.find(t => t.id === message.threadId);
  const isGroup = thread?.kind === 'group';

  // Carregar proposta se necessário
  useEffect(() => {
    if (isProposal && !proposal && proposalId) {
      loadProposal(proposalId).catch(console.error);
    }
  }, [isProposal, proposal, proposalId, loadProposal]);

  // Verificar se há mídia
  const hasMedia = message.type !== 'text' && message.type !== 'proposal' && message.mediaCid;
  const mediaMetadata: MediaMetadata | null = hasMedia && message.meta
    ? {
        cid: message.mediaCid!,
        encryptionKey: message.meta.encryptionKey,
        mimetype: message.meta.mimetype || 'application/octet-stream',
        filename: message.meta.filename,
        size: message.meta.size,
        width: message.meta.width,
        height: message.meta.height,
        duration: message.meta.duration,
      }
    : null;

  const handleAcceptProposal = async (proposalId: string) => {
    setIsAccepting(true);
    try {
      await acceptProposal(proposalId);
      return { saleId: undefined, receiptCid: undefined };
    } catch (err) {
      console.error('Failed to accept proposal:', err);
      return { saleId: undefined, receiptCid: undefined };
    } finally {
      setIsAccepting(false);
    }
  };

  const handleAcceptMultiStoreProposal = async () => {
    if (!proposalId) return;
    setIsAccepting(true);
    try {
      const result = await acceptProposal(proposalId);
      return result;
    } catch (err) {
      console.error('Failed to accept proposal:', err);
      throw err;
    } finally {
      setIsAccepting(false);
    }
  };

  const handleCopyText = () => {
    if (plaintext && plaintext !== '[Cifrado]') {
      navigator.clipboard.writeText(plaintext);
    }
  };

  const handleReply = () => {
    if (onReply) {
      onReply(message);
    }
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(message);
    }
  };

  const handleDelete = async () => {
    if (confirm('Tem certeza que deseja apagar esta mensagem?')) {
      try {
        await deleteMessage(message.id);
      } catch (err: any) {
        console.error('Failed to delete message:', err);
        alert(err.message || 'Falha ao apagar mensagem');
      }
    }
  };

  // Verificar se pode editar (mensagem de texto própria dentro de 15 minutos)
  const canEdit = isMe &&
    message.type === 'text' &&
    !isDeleted &&
    (Date.now() - message.createdAt < 15 * 60 * 1000);

  // Verificar se pode deletar (mensagem própria não deletada)
  const canDelete = isMe && !isDeleted;

  // Verificar se pode bloquear (não é mensagem própria)
  const canBlock = !isMe && message.from;
  const isBlocked = message.from ? isProfileBlocked(message.from) : false;

  const handleBlock = async () => {
    if (!message.from) return;

    if (confirm(`Tem certeza que deseja bloquear ${senderProfile?.displayName || senderProfile?.handle || 'este usuário'}? Você não receberá mais mensagens desta pessoa.`)) {
      try {
        await blockProfile(message.from);
      } catch (err: any) {
        console.error('Failed to block profile:', err);
        alert(err.message || 'Falha ao bloquear usuário');
      }
    }
  };

  const handleToggleReaction = (emoji: string) => {
    toggleReaction(message.id, emoji);
  };

  // Marcar hasCurrentUser nas reações para o usuário atual
  const reactionsWithCurrentUser = message.reactionsSummary?.map(r => ({
    ...r,
    hasCurrentUser: currentProfileId ? r.profileIds.includes(currentProfileId) : false,
  }));

  return (
    <div
      className={cn(
        'flex gap-2 px-4 animate-in slide-in-from-bottom-2 duration-200',
        isMe ? 'justify-end' : 'justify-start',
        // Espaçamento entre grupos vs dentro do grupo
        isFirstInGroup ? 'mt-3' : 'mt-0.5',
      )}
    >
      {/* Avatar (apenas para mensagens recebidas, primeira do grupo, em grupos) */}
      {!isMe && isGroup && (
        <div className="w-8 flex-shrink-0 self-end">
          {showAvatar && senderProfile && (
            <Avatar className="h-8 w-8">
              <AvatarImage src={senderProfile.avatarUrl} />
              <AvatarFallback className="text-xs bg-muted">
                {senderProfile.displayName?.charAt(0)?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      )}

      {/* Bubble com Context Menu */}
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className={cn(
              'relative max-w-[75%] shadow-sm cursor-default',
              // Padding condicional
              hasMedia || isProposal ? 'overflow-hidden' : 'px-3 py-2',
              // Cores
              isMe
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-foreground',
              // Border radius com tail
              getBubbleRadius(isMe, isFirstInGroup, isLastInGroup),
            )}
          >
        {/* Sender name (grupos, primeira mensagem do grupo) */}
        {!isMe && isGroup && isFirstInGroup && senderProfile && (
          <p className="text-xs font-medium text-primary mb-1 px-3 pt-2">
            {senderProfile.displayName || senderProfile.handle}
          </p>
        )}

        {/* Quoted Message (Reply) */}
        {message.replyToData && (
          <div className={cn(
            hasMedia || isProposal ? 'px-2 pt-2' : '',
          )}>
            <QuotedMessage
              replyToData={message.replyToData}
              plaintext={(message as any).replyToPlaintext}
              isOwn={isMe}
              onScrollTo={onScrollToMessage}
            />
          </div>
        )}

        {/* Proposta */}
        {isProposal && proposal && (
          <div className="p-2">
            {proposal.isMultiStore ? (
              <MultiStoreProposalCard
                proposal={proposal}
                onAccept={handleAcceptMultiStoreProposal}
                isSender={isMe}
              />
            ) : (
              <ProposalCard
                proposal={proposal}
                onAccept={handleAcceptProposal}
                isLoading={isAccepting}
                isSender={isMe}
              />
            )}
          </div>
        )}

        {/* Mensagem deletada */}
        {isDeleted && (
          <div className={cn(
            'text-sm flex items-center gap-2 italic',
            hasMedia && 'px-3 py-2',
            isMe ? 'text-primary-foreground/60' : 'text-muted-foreground',
          )}>
            <Trash2 className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="text-xs">
              Mensagem apagada
            </span>
          </div>
        )}

        {/* Mídia (apenas se não deletada) */}
        {mediaMetadata && !isDeleted && (
          <div className="mb-1">
            <ChatMediaPreview media={mediaMetadata} isOwn={isMe} />
          </div>
        )}

        {/* Texto com formatação Markdown (apenas se não deletada) */}
        {plaintext && !isEncryptedError && !isProposal && !isDeleted && (
          <div className={cn(
            'text-sm',
            hasMedia && 'px-3 py-2',
          )}>
            <FormattedText text={plaintext} isOwn={isMe} />
            {/* Link Preview (apenas para textos com URLs) */}
            {message.type === 'text' && extractFirstUrl(plaintext) && (
              <LinkPreview
                url={extractFirstUrl(plaintext)!}
                isOwn={isMe}
              />
            )}
          </div>
        )}

        {/* Mensagem criptografada não legível */}
        {isEncryptedError && !isProposal && !isDeleted && (
          <div className={cn(
            'text-sm flex items-center gap-2',
            hasMedia && 'px-3 py-2',
            isMe ? 'text-primary-foreground/70' : 'text-muted-foreground',
          )}>
            <Lock className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="text-xs italic">
              Mensagem criptografada
            </span>
          </div>
        )}

        {/* Footer: timestamp + edited indicator + status */}
        {!isProposal && (
          <div
            className={cn(
              'flex items-center gap-1 mt-1',
              isMe ? 'justify-end' : 'justify-start',
              hasMedia && 'px-3 pb-2',
            )}
          >
            {isEdited && !isDeleted && (
              <span
                className={cn(
                  'text-[10px] italic',
                  isMe ? 'text-primary-foreground/60' : 'text-muted-foreground',
                )}
              >
                editado
              </span>
            )}
            <span
              className={cn(
                'text-[10px]',
                isMe ? 'text-primary-foreground/70' : 'text-muted-foreground',
              )}
            >
              {format(message.createdAt, 'HH:mm')}
            </span>
            {isMe && getMessageStatus(message, isMe) && !isDeleted && (
              <MessageStatus
                status={getMessageStatus(message, isMe)!}
                className={cn(
                  isMe && 'text-primary-foreground/70',
                )}
              />
            )}
          </div>
        )}

            {/* Tail SVG */}
            <BubbleTail isOwn={isMe} isFirst={isFirstInGroup} />
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          {/* Quick Reactions (apenas se não deletada) */}
          {!isDeleted && (
            <div className="flex items-center justify-center gap-1 p-1.5 border-b">
              {['👍', '❤️', '😂', '😮', '😢', '🙏'].map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleToggleReaction(emoji)}
                  className="text-lg p-1 rounded-full hover:bg-muted hover:scale-110 transition-transform"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
          {!isDeleted && (
            <ContextMenuItem onClick={handleReply} className="gap-2">
              <Reply className="h-4 w-4" />
              Responder
            </ContextMenuItem>
          )}
          {plaintext && !isEncryptedError && !isProposal && !isDeleted && (
            <ContextMenuItem onClick={handleCopyText} className="gap-2">
              <Copy className="h-4 w-4" />
              Copiar texto
            </ContextMenuItem>
          )}
          {(canEdit || canDelete) && !isDeleted && <ContextMenuSeparator />}
          {canEdit && (
            <ContextMenuItem onClick={handleEdit} className="gap-2">
              <Pencil className="h-4 w-4" />
              Editar
            </ContextMenuItem>
          )}
          {canDelete && (
            <ContextMenuItem onClick={handleDelete} className="gap-2 text-destructive focus:text-destructive">
              <Trash2 className="h-4 w-4" />
              Apagar
            </ContextMenuItem>
          )}
          {canBlock && !isBlocked && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem onClick={handleBlock} className="gap-2 text-destructive focus:text-destructive">
                <Ban className="h-4 w-4" />
                Bloquear usuário
              </ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>

      {/* Reaction Bar (abaixo da bolha) */}
      {reactionsWithCurrentUser && reactionsWithCurrentUser.length > 0 && (
        <div className={cn('px-4', isMe ? 'flex justify-end' : 'flex justify-start', !isMe && isGroup && 'ml-10')}>
          <ReactionBar
            reactions={reactionsWithCurrentUser}
            currentProfileId={currentProfileId || ''}
            onToggle={handleToggleReaction}
            isOwn={isMe}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Calcula border-radius baseado na posição no grupo
 */
function getBubbleRadius(
  isOwn: boolean,
  isFirst: boolean,
  isLast: boolean,
): string {
  const base = 'rounded-2xl';

  if (isOwn) {
    // Mensagens próprias (direita)
    if (isFirst && isLast) return `${base} rounded-tr-md`; // Única
    if (isFirst) return `${base} rounded-tr-md`; // Primeira
    if (isLast) return `${base} rounded-br-md`; // Última
    return base; // Meio
  } else {
    // Mensagens recebidas (esquerda)
    if (isFirst && isLast) return `${base} rounded-tl-md`; // Única
    if (isFirst) return `${base} rounded-tl-md`; // Primeira
    if (isLast) return `${base} rounded-bl-md`; // Última
    return base; // Meio
  }
}

/**
 * Componente do tail (seta) da bolha
 */
function BubbleTail({ isOwn, isFirst }: { isOwn: boolean; isFirst: boolean }) {
  if (!isFirst) return null;

  return (
    <svg
      className={cn(
        'absolute top-0 w-3 h-3',
        isOwn ? '-right-1.5' : '-left-1.5',
      )}
      viewBox="0 0 12 12"
    >
      <path
        d={isOwn ? 'M0 0 L12 0 L0 12 Z' : 'M12 0 L0 0 L12 12 Z'}
        className={isOwn ? 'fill-primary' : 'fill-muted'}
      />
    </svg>
  );
}
