import { ChatMessage, ChatThreadWithParticipants } from '@bazari/shared-types';
import { MessageBubble } from './MessageBubble';
import { useEffect, useRef, useState, useMemo, useCallback, Fragment } from 'react';
import { Loader2 } from 'lucide-react';
import { DateSeparator, shouldShowDateSeparator } from './DateSeparator';
import { ScrollToBottomFAB } from './ScrollToBottomFAB';
import { SwipeableMessage } from './SwipeableMessage';

interface MessageListProps {
  messages: ChatMessage[];
  onLoadMore?: () => Promise<void>;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  thread?: ChatThreadWithParticipants;
  onReplyToMessage?: (message: ChatMessage) => void;
  onEditMessage?: (message: ChatMessage) => void;
}

// Tempo máximo entre mensagens para agrupar (1 minuto)
const GROUP_THRESHOLD_MS = 60 * 1000;

export function MessageList({
  messages,
  onLoadMore,
  hasMore = false,
  isLoadingMore = false,
  thread,
  onReplyToMessage,
  onEditMessage,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(true);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [newMessageCount, setNewMessageCount] = useState(0);
  const [initialScrollDone, setInitialScrollDone] = useState(false);
  const previousScrollHeight = useRef<number>(0);
  const previousMessagesCount = useRef<number>(0);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  /**
   * Scroll para uma mensagem específica e destacá-la temporariamente
   */
  const scrollToMessage = useCallback((messageId: string) => {
    const element = document.getElementById(`msg-${messageId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedMessageId(messageId);
      setTimeout(() => setHighlightedMessageId(null), 2000);
    }
  }, []);

  // Criar mapa de profiles dos participantes
  const participantProfiles = useMemo(() => {
    const map = new Map<string, { displayName: string; avatarUrl?: string; handle: string }>();
    if (thread?.participantsData) {
      for (const p of thread.participantsData) {
        map.set(p.profileId, {
          displayName: p.name || p.handle,
          avatarUrl: p.avatarUrl,
          handle: p.handle,
        });
      }
    }
    return map;
  }, [thread?.participantsData]);

  // Calcular agrupamento de mensagens
  const groupedMessages = useMemo(() => {
    return messages.map((msg, index) => {
      const prevMsg = messages[index - 1];
      const nextMsg = messages[index + 1];

      const isSameSenderAsPrev =
        prevMsg &&
        prevMsg.from === msg.from &&
        msg.createdAt - prevMsg.createdAt < GROUP_THRESHOLD_MS;

      const isSameSenderAsNext =
        nextMsg &&
        nextMsg.from === msg.from &&
        nextMsg.createdAt - msg.createdAt < GROUP_THRESHOLD_MS;

      return {
        message: msg,
        isFirstInGroup: !isSameSenderAsPrev,
        isLastInGroup: !isSameSenderAsNext,
        showAvatar: !isSameSenderAsPrev,
        senderProfile: participantProfiles.get(msg.from),
      };
    });
  }, [messages, participantProfiles]);

  // Scroll inicial para o final quando mensagens carregam pela primeira vez
  useEffect(() => {
    if (!initialScrollDone && messages.length > 0 && containerRef.current) {
      // Scroll imediato (sem animação) para o final na primeira carga
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
      setInitialScrollDone(true);
      setIsNearBottom(true);
    }
  }, [messages.length, initialScrollDone]);

  // Auto-scroll to bottom on new messages (only if user is near bottom)
  useEffect(() => {
    if (initialScrollDone && shouldScrollToBottom && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, shouldScrollToBottom, initialScrollDone]);

  // Track new messages when not at bottom
  useEffect(() => {
    const currentCount = messages.length;
    const previousCount = previousMessagesCount.current;

    if (currentCount > previousCount && !isNearBottom) {
      // Nova mensagem chegou e não estamos no final
      setNewMessageCount(prev => prev + (currentCount - previousCount));
    }

    previousMessagesCount.current = currentCount;
  }, [messages.length, isNearBottom]);

  // Reset new message count when scrolling to bottom
  useEffect(() => {
    if (isNearBottom) {
      setNewMessageCount(0);
    }
  }, [isNearBottom]);

  // Detect if user is near bottom
  const handleScroll = () => {
    const container = containerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    // Consider "near bottom" if within 100px
    const nearBottom = distanceFromBottom < 100;
    setShouldScrollToBottom(nearBottom);
    setIsNearBottom(nearBottom);

    // Check if scrolled to top for infinite scroll
    if (scrollTop === 0 && hasMore && !isLoadingMore && onLoadMore) {
      const previousHeight = previousScrollHeight.current;

      onLoadMore().then(() => {
        // Maintain scroll position after loading more messages
        requestAnimationFrame(() => {
          if (container) {
            const newScrollHeight = container.scrollHeight;
            const heightDifference = newScrollHeight - previousHeight;
            container.scrollTop = heightDifference;
          }
        });
      });
    }

    previousScrollHeight.current = scrollHeight;
  };

  const scrollToBottom = useCallback(() => {
    containerRef.current?.scrollTo({
      top: containerRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, []);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto py-4 relative"
      onScroll={handleScroll}
    >
      {/* Load more indicator at top */}
      <div ref={topRef} className="flex justify-center py-2">
        {isLoadingMore && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Carregando mensagens...</span>
          </div>
        )}
        {!isLoadingMore && hasMore && messages.length > 0 && (
          <div className="text-xs text-muted-foreground">
            Role para cima para carregar mais mensagens
          </div>
        )}
      </div>

      {/* Messages */}
      {messages.length === 0 ? (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <p>Nenhuma mensagem ainda. Comece a conversa!</p>
        </div>
      ) : (
        groupedMessages.map(({
          message,
          isFirstInGroup,
          isLastInGroup,
          showAvatar,
          senderProfile,
        }, index) => {
          const previousMessage = messages[index - 1];
          const showDateSeparator = shouldShowDateSeparator(
            message.createdAt,
            previousMessage?.createdAt
          );

          return (
            <Fragment key={message.id}>
              {showDateSeparator && (
                <DateSeparator date={new Date(message.createdAt)} />
              )}
              <SwipeableMessage
                onSwipeRight={onReplyToMessage ? () => onReplyToMessage(message) : undefined}
                disabled={!onReplyToMessage}
              >
                <div
                  id={`msg-${message.id}`}
                  className={highlightedMessageId === message.id ? 'bg-primary/10 rounded-lg transition-colors duration-500' : ''}
                >
                  <MessageBubble
                    message={message}
                    isFirstInGroup={isFirstInGroup}
                    isLastInGroup={isLastInGroup}
                    showAvatar={showAvatar}
                    senderProfile={senderProfile}
                    onScrollToMessage={scrollToMessage}
                    onReply={onReplyToMessage}
                    onEdit={onEditMessage}
                  />
                </div>
              </SwipeableMessage>
            </Fragment>
          );
        })
      )}

      {/* Bottom anchor */}
      <div ref={bottomRef} />

      {/* Scroll to Bottom FAB */}
      <ScrollToBottomFAB
        visible={!isNearBottom}
        newMessageCount={newMessageCount}
        onClick={scrollToBottom}
      />
    </div>
  );
}
