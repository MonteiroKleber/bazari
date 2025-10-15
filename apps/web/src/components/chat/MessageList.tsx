import { ChatMessage } from '@bazari/shared-types';
import { MessageBubble } from './MessageBubble';
import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface MessageListProps {
  messages: ChatMessage[];
  onLoadMore?: () => Promise<void>;
  hasMore?: boolean;
  isLoadingMore?: boolean;
}

export function MessageList({ messages, onLoadMore, hasMore = false, isLoadingMore = false }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(true);
  const previousScrollHeight = useRef<number>(0);

  // Auto-scroll to bottom on new messages (only if user is near bottom)
  useEffect(() => {
    if (shouldScrollToBottom && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, shouldScrollToBottom]);

  // Detect if user is near bottom
  const handleScroll = () => {
    const container = containerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    // Consider "near bottom" if within 100px
    setShouldScrollToBottom(distanceFromBottom < 100);

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

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto p-4 space-y-2"
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
        messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))
      )}

      {/* Bottom anchor */}
      <div ref={bottomRef} />
    </div>
  );
}
