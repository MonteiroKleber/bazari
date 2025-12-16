# Feature: Visual Improvements - Message Bubbles

## Resumo

Melhorar a aparencia visual das bolhas de mensagem para um look mais moderno e profissional, similar ao WhatsApp.

## User Stories

1. **Como usuario**, quero que as mensagens tenham aparencia profissional e moderna
2. **Como usuario**, quero diferenciar claramente mensagens enviadas de recebidas
3. **Como usuario**, quero que mensagens consecutivas sejam agrupadas visualmente

## Melhorias Propostas

### 1. Tail (Seta) nas Bolhas
### 2. Sombra e Profundidade
### 3. Cores e Gradientes
### 4. Agrupamento de Mensagens
### 5. Animacao de Entrada
### 6. Avatares Inline (Grupos)

## Especificacao Visual

### Bolha de Mensagem Enviada (Direita)

```
                    ┌────────────────────┐
                    │ Mensagem de texto  │◄── Tail apontando para fora
                    │                    │
                    │          14:32 ✓✓  │
                    └────────────────────┘

Cor: bg-primary (ou gradiente from-primary to-primary/90)
Text: text-primary-foreground
Shadow: shadow-sm
Border-radius: rounded-2xl rounded-tr-md (primeira do grupo)
              rounded-2xl (meio do grupo)
              rounded-2xl rounded-br-md (ultima do grupo)
```

### Bolha de Mensagem Recebida (Esquerda)

```
┌────────────────────┐
│ Mensagem de texto  │►── Tail apontando para avatar
│                    │
│ 14:32              │
└────────────────────┘

Cor: bg-muted (ou bg-card)
Text: text-foreground
Shadow: shadow-sm
Border-radius: rounded-2xl rounded-tl-md (primeira do grupo)
              rounded-2xl (meio do grupo)
              rounded-2xl rounded-bl-md (ultima do grupo)
```

### Agrupamento de Mensagens

Mensagens do mesmo remetente em sequencia (< 1 minuto) sao agrupadas:

```
Primeira mensagem do grupo    <- Mostra avatar, tail, timestamp
Segunda mensagem              <- Sem avatar, sem tail, margin reduzida
Terceira mensagem             <- Sem avatar, sem tail, margin reduzida
Ultima mensagem do grupo      <- Tail diferente, timestamp
```

### Cores Propostas

```css
/* Mensagens enviadas */
--bubble-sent-bg: hsl(var(--primary));
--bubble-sent-fg: hsl(var(--primary-foreground));

/* Mensagens recebidas */
--bubble-received-bg: hsl(var(--muted));
--bubble-received-fg: hsl(var(--foreground));

/* Alternativa com gradiente para enviadas */
--bubble-sent-gradient: linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.85) 100%);
```

## Implementacao Tecnica

### Arquivo: `apps/web/src/components/chat/MessageBubble.tsx`

```typescript
import { cn } from '@/lib/utils';
import { MessageStatus } from './MessageStatus';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChatMessage } from '@bazari/shared-types';
import { formatTime } from '@/lib/utils/date';

interface MessageBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
  // Grouping props
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
  showAvatar: boolean;
  senderProfile?: {
    displayName: string;
    avatarUrl?: string;
    handle: string;
  };
}

export function MessageBubble({
  message,
  isOwn,
  isFirstInGroup,
  isLastInGroup,
  showAvatar,
  senderProfile,
}: MessageBubbleProps) {
  return (
    <div
      className={cn(
        'flex gap-2 px-4 animate-in slide-in-from-bottom-2 duration-200',
        isOwn ? 'justify-end' : 'justify-start',
        // Spacing between groups vs within group
        isFirstInGroup ? 'mt-3' : 'mt-0.5',
      )}
    >
      {/* Avatar (apenas para mensagens recebidas, primeira do grupo) */}
      {!isOwn && (
        <div className="w-8 flex-shrink-0">
          {showAvatar && senderProfile && (
            <Avatar className="h-8 w-8">
              <AvatarImage src={senderProfile.avatarUrl} />
              <AvatarFallback className="text-xs">
                {senderProfile.displayName?.charAt(0)?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      )}

      {/* Bubble */}
      <div
        className={cn(
          'relative max-w-[75%] px-3 py-2 shadow-sm',
          // Cores
          isOwn
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-foreground',
          // Border radius com tail
          getBubbleRadius(isOwn, isFirstInGroup, isLastInGroup),
        )}
      >
        {/* Sender name (grupos, primeira mensagem do grupo) */}
        {!isOwn && isFirstInGroup && senderProfile && (
          <p className="text-xs font-medium text-primary mb-1">
            {senderProfile.displayName}
          </p>
        )}

        {/* Content */}
        <p className="text-sm whitespace-pre-wrap break-words">
          {message.plaintext}
        </p>

        {/* Footer: timestamp + status */}
        <div
          className={cn(
            'flex items-center gap-1 mt-1',
            isOwn ? 'justify-end' : 'justify-start',
          )}
        >
          <span
            className={cn(
              'text-[10px]',
              isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground',
            )}
          >
            {formatTime(message.createdAt)}
          </span>
          {isOwn && <MessageStatus status={message.status} />}
        </div>

        {/* Tail SVG */}
        <BubbleTail isOwn={isOwn} isFirst={isFirstInGroup} />
      </div>
    </div>
  );
}

// Helper para calcular border-radius baseado na posicao no grupo
function getBubbleRadius(
  isOwn: boolean,
  isFirst: boolean,
  isLast: boolean,
): string {
  const base = 'rounded-2xl';

  if (isOwn) {
    // Mensagens proprias (direita)
    if (isFirst && isLast) return `${base} rounded-tr-md`; // Unica
    if (isFirst) return `${base} rounded-tr-md`; // Primeira
    if (isLast) return `${base} rounded-br-md`; // Ultima
    return base; // Meio
  } else {
    // Mensagens recebidas (esquerda)
    if (isFirst && isLast) return `${base} rounded-tl-md`; // Unica
    if (isFirst) return `${base} rounded-tl-md`; // Primeira
    if (isLast) return `${base} rounded-bl-md`; // Ultima
    return base; // Meio
  }
}

// Componente do tail (seta)
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
```

### Arquivo: `apps/web/src/components/chat/MessageList.tsx`

Atualizar para calcular agrupamento:

```typescript
import { ChatMessage } from '@bazari/shared-types';
import { MessageBubble } from './MessageBubble';
import { useEffect, useRef, useMemo } from 'react';

interface MessageListProps {
  messages: ChatMessage[];
  currentProfileId: string;
  participantProfiles: Map<string, {
    displayName: string;
    avatarUrl?: string;
    handle: string;
  }>;
}

// Tempo maximo entre mensagens para agrupar (1 minuto)
const GROUP_THRESHOLD_MS = 60 * 1000;

export function MessageList({
  messages,
  currentProfileId,
  participantProfiles,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Calcular agrupamento
  const groupedMessages = useMemo(() => {
    return messages.map((msg, index) => {
      const prevMsg = messages[index - 1];
      const nextMsg = messages[index + 1];

      const isSameSenderAsPrev =
        prevMsg &&
        prevMsg.senderId === msg.senderId &&
        msg.createdAt - prevMsg.createdAt < GROUP_THRESHOLD_MS;

      const isSameSenderAsNext =
        nextMsg &&
        nextMsg.senderId === msg.senderId &&
        nextMsg.createdAt - msg.createdAt < GROUP_THRESHOLD_MS;

      return {
        message: msg,
        isOwn: msg.senderId === currentProfileId,
        isFirstInGroup: !isSameSenderAsPrev,
        isLastInGroup: !isSameSenderAsNext,
        showAvatar: !isSameSenderAsPrev,
        senderProfile: participantProfiles.get(msg.senderId),
      };
    });
  }, [messages, currentProfileId, participantProfiles]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto py-4">
      {groupedMessages.length === 0 ? (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <p>Nenhuma mensagem ainda. Comece a conversa!</p>
        </div>
      ) : (
        groupedMessages.map(({
          message,
          isOwn,
          isFirstInGroup,
          isLastInGroup,
          showAvatar,
          senderProfile,
        }) => (
          <MessageBubble
            key={message.id}
            message={message}
            isOwn={isOwn}
            isFirstInGroup={isFirstInGroup}
            isLastInGroup={isLastInGroup}
            showAvatar={showAvatar}
            senderProfile={senderProfile}
          />
        ))
      )}
      <div ref={bottomRef} />
    </div>
  );
}
```

### Animacao de Entrada

```css
/* Adicionar em globals.css ou usar Tailwind animate */

@keyframes message-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-message-in {
  animation: message-in 0.2s ease-out;
}
```

Ou usar classes do Tailwind com tailwind-animate:

```typescript
className="animate-in slide-in-from-bottom-2 duration-200"
```

### Dark Mode

As cores devem funcionar automaticamente com o sistema de temas do shadcn/ui:

```typescript
// Light mode
--primary: 262.1 83.3% 57.8%;        // Roxo Bazari
--primary-foreground: 210 20% 98%;
--muted: 220 14.3% 95.9%;
--muted-foreground: 220 8.9% 46.1%;

// Dark mode (em .dark)
--primary: 263.4 70% 50.4%;
--primary-foreground: 210 20% 98%;
--muted: 215 27.9% 16.9%;
--muted-foreground: 217.9 10.6% 64.9%;
```

## Especificacoes de Midia

### Imagens na Bolha

```typescript
// Imagens tem tratamento especial
{message.type === 'image' && message.mediaCid && (
  <div className="rounded-lg overflow-hidden mb-1">
    <img
      src={`/api/ipfs/${message.mediaCid}`}
      alt=""
      className="max-w-full max-h-[300px] object-cover"
      loading="lazy"
    />
  </div>
)}
```

### Propostas na Bolha

Propostas comerciais mantem o estilo atual com card destacado:

```typescript
{message.type === 'proposal' && (
  <ProposalCard
    proposal={/* ... */}
    className="bg-card" // Destaque do fundo da bolha
  />
)}
```

## Comparativo Visual

### Antes

```
┌──────────────────┐
│ Mensagem simples │
│ 14:32            │
└──────────────────┘
```

### Depois

```
                         ┌──────────────────┐
                        ◄│ Mensagem moderna │
                         │                  │
                         │        14:32 ✓✓  │
                         └──────────────────┘
                                │
                                ▼
                         Sombra sutil, tail, gradiente
```

## Testes

### Visual (Storybook ou manual)
- Bolha enviada tem cor primaria
- Bolha recebida tem cor muted
- Tail aparece na primeira mensagem do grupo
- Border-radius correto para cada posicao
- Animacao de entrada funciona
- Dark mode funciona

### Unitarios
- `getBubbleRadius` retorna valores corretos
- Agrupamento calcula corretamente
- Avatar aparece apenas quando deve

## Checklist de Implementacao

- [ ] Criar componente BubbleTail
- [ ] Atualizar MessageBubble com novo design
- [ ] Implementar calculo de agrupamento em MessageList
- [ ] Adicionar animacao de entrada
- [ ] Testar em light/dark mode
- [ ] Testar com diferentes tipos de conteudo (texto, imagem, proposta)
- [ ] Testar agrupamento de mensagens
- [ ] Verificar performance com muitas mensagens
