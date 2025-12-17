import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Send } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  body: string;
  createdAt: string;
  sender: {
    id: string;
    handle?: string;
    avatarUrl?: string;
  } | null;
  kind?: 'user' | 'system';
}

interface ChatPanelProps {
  messages: Message[];
  onSend: (text: string) => Promise<void>;
  currentUserId: string;
  counterparty?: {
    handle?: string;
    avatarUrl?: string;
  };
  disabled?: boolean;
  rateLimitSeconds?: number;
  loading?: boolean;
  className?: string;
}

export function ChatPanel({
  messages,
  onSend,
  currentUserId,
  counterparty,
  disabled = false,
  rateLimitSeconds = 0,
  loading = false,
  className,
}: ChatPanelProps) {
  const { t } = useTranslation();
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || sending || disabled || rateLimitSeconds > 0) return;

    setSending(true);
    try {
      await onSend(input.trim());
      setInput('');
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getSystemMessageText = (body: string) => {
    if (body.startsWith('ESCROW_CONFIRMED')) {
      return t('p2p.chat.system.escrowConfirmed', 'Escrow confirmado');
    }
    if (body === 'PAID_MARKED') {
      return t('p2p.chat.system.paidMarked', 'Pagamento marcado como enviado');
    }
    if (body === 'RELEASED') {
      return t('p2p.chat.system.released', 'Fundos liberados');
    }
    return body;
  };

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader className="py-3 px-4 border-b">
        <CardTitle className="text-base flex items-center gap-2">
          💬 {t('p2p.chat.title', 'Chat')}
          {counterparty?.handle && (
            <span className="text-sm font-normal text-muted-foreground">
              com @{counterparty.handle}
            </span>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading && messages.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-4">
              {t('common.loading', 'Carregando...')}
            </div>
          )}

          {!loading && messages.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-4">
              {t('p2p.chat.empty', 'Nenhuma mensagem ainda. Diga olá!')}
            </div>
          )}

          {messages.map((message) => {
            const isSystem = message.kind === 'system';
            const isMe = message.sender?.id === currentUserId;

            // System messages
            if (isSystem) {
              return (
                <div key={message.id} className="flex justify-center">
                  <div className="bg-muted/50 text-muted-foreground text-xs px-3 py-1.5 rounded-full">
                    {getSystemMessageText(message.body)}
                  </div>
                </div>
              );
            }

            // User messages
            return (
              <div
                key={message.id}
                className={cn('flex gap-2', isMe ? 'flex-row-reverse' : '')}
              >
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarImage src={message.sender?.avatarUrl} />
                  <AvatarFallback className="text-xs">
                    {(message.sender?.handle?.[0] || 'U').toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div
                  className={cn(
                    'max-w-[75%] space-y-1',
                    isMe ? 'items-end' : 'items-start'
                  )}
                >
                  <div
                    className={cn(
                      'px-3 py-2 rounded-lg text-sm',
                      isMe
                        ? 'bg-primary text-primary-foreground rounded-br-none'
                        : 'bg-muted rounded-bl-none'
                    )}
                  >
                    {message.body}
                  </div>
                  <div
                    className={cn(
                      'text-[10px] text-muted-foreground',
                      isMe ? 'text-right' : 'text-left'
                    )}
                  >
                    {formatTime(message.createdAt)}
                  </div>
                </div>
              </div>
            );
          })}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="p-3 border-t">
          {rateLimitSeconds > 0 && (
            <div className="mb-2">
              <Badge variant="destructive" className="text-xs">
                {t('p2p.chat.rateLimited', 'Aguarde {{seconds}}s', {
                  seconds: rateLimitSeconds,
                })}
              </Badge>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('p2p.chat.placeholder', 'Digite uma mensagem...')}
              disabled={disabled || sending || rateLimitSeconds > 0}
              className="flex-1"
            />

            <Button
              onClick={handleSend}
              disabled={
                !input.trim() || disabled || sending || rateLimitSeconds > 0
              }
              size="icon"
              aria-label={t('p2p.chat.send', 'Enviar')}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
