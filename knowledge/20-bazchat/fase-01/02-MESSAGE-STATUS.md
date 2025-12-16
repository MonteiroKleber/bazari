# Feature: Message Status (Read Receipts)

## Resumo

Implementar indicadores visuais de status de mensagem (enviando, enviado, entregue, lido) similar ao WhatsApp com checkmarks.

## User Stories

1. **Como remetente**, quero ver se minha mensagem foi enviada ao servidor
2. **Como remetente**, quero ver se minha mensagem foi entregue ao destinatario
3. **Como remetente**, quero ver se minha mensagem foi lida
4. **Como usuario**, quero poder desabilitar confirmacao de leitura (privacy)

## Status de Mensagem

| Status | Visual | Descricao |
|--------|--------|-----------|
| `sending` | Clock icon | Mensagem sendo enviada |
| `sent` | Single check (gray) | Servidor recebeu |
| `delivered` | Double check (gray) | Dispositivo recebeu |
| `read` | Double check (blue) | Usuario visualizou |
| `failed` | Red X | Falha no envio |

## Especificacao Tecnica

### 1. Database Schema

#### Arquivo: `packages/db/prisma/schema.prisma`

```prisma
model ChatMessage {
  id          String   @id @default(cuid())
  threadId    String
  senderId    String
  type        String   // text, image, video, audio, file, proposal
  ciphertext  String
  mediaCid    String?
  meta        Json?

  // Message Status
  status      String   @default("sent") // sending, sent, delivered, read, failed
  deliveredAt DateTime?
  readAt      DateTime?

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  thread      ChatThread @relation(fields: [threadId], references: [id])
  sender      Profile    @relation(fields: [senderId], references: [id])

  // Read receipts por usuario (para grupos)
  readReceipts ChatReadReceipt[]

  @@index([threadId, createdAt])
  @@index([senderId])
}

// Nova tabela para read receipts em grupos
model ChatReadReceipt {
  id        String   @id @default(cuid())
  messageId String
  profileId String
  readAt    DateTime @default(now())

  message   ChatMessage @relation(fields: [messageId], references: [id])
  profile   Profile     @relation(fields: [profileId], references: [id])

  @@unique([messageId, profileId])
  @@index([messageId])
}
```

### 2. WebSocket Events

```typescript
// Cliente -> Servidor: Confirmar entrega
interface WsDeliveryReceipt {
  op: 'receipt:delivered';
  data: {
    messageIds: string[];
  };
}

// Cliente -> Servidor: Confirmar leitura
interface WsReadReceipt {
  op: 'receipt:read';
  data: {
    threadId: string;
    messageIds: string[];
  };
}

// Servidor -> Cliente: Notificar status update
interface WsStatusUpdate {
  op: 'message:status';
  data: {
    messageId: string;
    status: 'sent' | 'delivered' | 'read' | 'failed';
    timestamp: number;
    // Para grupos: quem leu
    readBy?: Array<{
      profileId: string;
      handle: string;
      readAt: number;
    }>;
  };
}
```

### 3. Backend Implementation

#### Arquivo: `apps/api/src/ws/chat-handler.ts`

```typescript
// Ao receber mensagem do cliente
case 'send': {
  // ... criar mensagem no DB
  const message = await db.chatMessage.create({
    data: {
      // ... existing fields
      status: 'sent',
    }
  });

  // Notificar remetente que foi enviado
  sendToProfile(socket.profileId, {
    op: 'message:status',
    data: {
      messageId: message.id,
      status: 'sent',
      timestamp: Date.now(),
    }
  });

  // Broadcast para destinatarios
  // ...existing broadcast logic
  break;
}

// Ao receber confirmacao de entrega
case 'receipt:delivered': {
  const { messageIds } = msg.data;
  const now = new Date();

  // Atualizar no DB
  await db.chatMessage.updateMany({
    where: {
      id: { in: messageIds },
      status: 'sent', // Apenas se ainda nao foi entregue
    },
    data: {
      status: 'delivered',
      deliveredAt: now,
    }
  });

  // Notificar remetentes
  for (const messageId of messageIds) {
    const message = await db.chatMessage.findUnique({
      where: { id: messageId },
      select: { senderId: true }
    });

    if (message) {
      sendToProfile(message.senderId, {
        op: 'message:status',
        data: {
          messageId,
          status: 'delivered',
          timestamp: now.getTime(),
        }
      });
    }
  }
  break;
}

// Ao receber confirmacao de leitura
case 'receipt:read': {
  const { threadId, messageIds } = msg.data;
  const profileId = socket.profileId;
  const now = new Date();

  // Verificar se usuario tem read receipts habilitado
  const profile = await db.profile.findUnique({
    where: { id: profileId },
    select: { settings: true }
  });

  if (profile?.settings?.readReceiptsEnabled === false) {
    // Nao enviar read receipts
    break;
  }

  // Para DMs: atualizar status da mensagem diretamente
  const thread = await db.chatThread.findUnique({
    where: { id: threadId },
    select: { kind: true, participants: true }
  });

  if (thread?.kind === 'dm') {
    await db.chatMessage.updateMany({
      where: {
        id: { in: messageIds },
        status: { in: ['sent', 'delivered'] },
      },
      data: {
        status: 'read',
        readAt: now,
      }
    });

    // Notificar remetentes
    for (const messageId of messageIds) {
      const message = await db.chatMessage.findUnique({
        where: { id: messageId },
        select: { senderId: true }
      });

      if (message && message.senderId !== profileId) {
        sendToProfile(message.senderId, {
          op: 'message:status',
          data: {
            messageId,
            status: 'read',
            timestamp: now.getTime(),
          }
        });
      }
    }
  } else {
    // Para grupos: criar read receipts individuais
    for (const messageId of messageIds) {
      await db.chatReadReceipt.upsert({
        where: {
          messageId_profileId: { messageId, profileId }
        },
        create: { messageId, profileId, readAt: now },
        update: { readAt: now },
      });

      // Notificar remetente
      const message = await db.chatMessage.findUnique({
        where: { id: messageId },
        select: { senderId: true }
      });

      if (message && message.senderId !== profileId) {
        const profile = await db.profile.findUnique({
          where: { id: profileId },
          select: { handle: true }
        });

        sendToProfile(message.senderId, {
          op: 'message:status',
          data: {
            messageId,
            status: 'read',
            timestamp: now.getTime(),
            readBy: [{
              profileId,
              handle: profile?.handle || 'unknown',
              readAt: now.getTime(),
            }]
          }
        });
      }
    }
  }
  break;
}
```

### 4. Frontend Implementation

#### Arquivo: `packages/shared-types/src/chat.ts`

```typescript
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface ChatMessage {
  id: string;
  threadId: string;
  senderId: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'proposal';
  ciphertext: string;
  plaintext?: string;
  mediaCid?: string;
  meta?: Record<string, any>;

  // Status
  status: MessageStatus;
  deliveredAt?: number;
  readAt?: number;

  createdAt: number;
}
```

#### Arquivo: `apps/web/src/hooks/useChat.ts`

```typescript
// Adicionar ao state
interface ChatState {
  // ... existing
  updateMessageStatus: (messageId: string, status: MessageStatus, timestamp?: number) => void;
  sendDeliveryReceipt: (messageIds: string[]) => void;
  sendReadReceipt: (threadId: string, messageIds: string[]) => void;
}

// No handler de mensagens WS:
if (msg.op === 'message:status') {
  const { messageId, status, timestamp } = msg.data;

  // Atualizar mensagem no state
  const messages = get().messages;
  for (const [threadId, threadMessages] of messages.entries()) {
    const index = threadMessages.findIndex(m => m.id === messageId);
    if (index !== -1) {
      const updated = [...threadMessages];
      updated[index] = {
        ...updated[index],
        status,
        ...(status === 'delivered' && { deliveredAt: timestamp }),
        ...(status === 'read' && { readAt: timestamp }),
      };
      set({
        messages: new Map(messages).set(threadId, updated)
      });
      break;
    }
  }
}

// Ao receber nova mensagem, enviar delivery receipt
if (msg.op === 'message') {
  const message = msg.data as ChatMessage;

  // ... existing message handling

  // Enviar delivery receipt (se nao for minha propria mensagem)
  if (message.senderId !== get().currentProfileId) {
    get().sendDeliveryReceipt([message.id]);
  }
}

// Implementar actions
sendDeliveryReceipt: (messageIds: string[]) => {
  chatWs.send({
    op: 'receipt:delivered',
    data: { messageIds }
  });
},

sendReadReceipt: (threadId: string, messageIds: string[]) => {
  chatWs.send({
    op: 'receipt:read',
    data: { threadId, messageIds }
  });
},
```

#### Arquivo: `apps/web/src/components/chat/MessageStatus.tsx` (NOVO)

```typescript
import { Check, CheckCheck, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MessageStatus as Status } from '@bazari/shared-types';

interface MessageStatusProps {
  status: Status;
  className?: string;
}

export function MessageStatus({ status, className }: MessageStatusProps) {
  const icons = {
    sending: <Clock className="h-3.5 w-3.5 text-muted-foreground" />,
    sent: <Check className="h-3.5 w-3.5 text-muted-foreground" />,
    delivered: <CheckCheck className="h-3.5 w-3.5 text-muted-foreground" />,
    read: <CheckCheck className="h-3.5 w-3.5 text-blue-500" />,
    failed: <AlertCircle className="h-3.5 w-3.5 text-destructive" />,
  };

  return (
    <span className={cn('inline-flex items-center', className)}>
      {icons[status]}
    </span>
  );
}
```

#### Arquivo: `apps/web/src/components/chat/MessageBubble.tsx`

Integrar o MessageStatus:

```typescript
import { MessageStatus } from './MessageStatus';

// No render, para mensagens enviadas pelo usuario atual:
{isOwnMessage && (
  <div className="flex items-center gap-1 justify-end mt-1">
    <span className="text-xs text-muted-foreground">
      {formatTime(message.createdAt)}
    </span>
    <MessageStatus status={message.status} />
  </div>
)}
```

#### Arquivo: `apps/web/src/pages/chat/ChatThreadPage.tsx`

Enviar read receipt ao visualizar mensagens:

```typescript
// useEffect para marcar mensagens como lidas
useEffect(() => {
  if (!threadId || !messages.length) return;

  // Filtrar mensagens nao lidas de outros usuarios
  const unreadMessages = messages.filter(
    m => m.senderId !== currentProfileId &&
         m.status !== 'read' &&
         !m.id.startsWith('temp-')
  );

  if (unreadMessages.length > 0) {
    sendReadReceipt(threadId, unreadMessages.map(m => m.id));
  }
}, [threadId, messages, currentProfileId]);
```

### 5. Optimistic Updates

Para melhor UX, usar optimistic updates no envio:

```typescript
// Em useChat.sendMessage:
sendMessage: async (threadId: string, plaintext: string, media?: MediaMetadata) => {
  // Criar mensagem local com status 'sending'
  const tempId = `temp-${Date.now()}`;
  const tempMessage: ChatMessage = {
    id: tempId,
    threadId,
    senderId: get().currentProfileId!,
    type: media ? /* media type */ : 'text',
    ciphertext: '',
    plaintext,
    status: 'sending', // <- Status inicial
    createdAt: Date.now(),
  };

  // Adicionar ao state imediatamente
  const current = get().messages.get(threadId) || [];
  set({
    messages: new Map(get().messages).set(threadId, [...current, tempMessage])
  });

  try {
    // Enviar via WS
    // ...

    // Quando receber confirmacao do servidor, o handler de 'message:status'
    // atualizara o status para 'sent'
  } catch (err) {
    // Atualizar para 'failed'
    // ...
  }
}
```

## UI/UX Specs

### Visual dos Status

```
Sending:   [Clock icon] - Cinza, rotacionando (opcional)
Sent:      [✓]          - Cinza claro
Delivered: [✓✓]         - Cinza
Read:      [✓✓]         - Azul (#3B82F6)
Failed:    [!]          - Vermelho
```

### Posicao na Bolha

```
┌────────────────────────────┐
│ Mensagem de texto aqui     │
│                            │
│                  14:32 ✓✓  │  <- Timestamp + Status
└────────────────────────────┘
```

### Tooltip no Hover (Opcional)

- Sent: "Enviado"
- Delivered: "Entregue"
- Read: "Lido as 14:35"
- Failed: "Falha no envio. Toque para reenviar."

## Privacy Settings

### Opcao de Usuario

Adicionar em Settings:

```typescript
// Profile settings
{
  readReceiptsEnabled: boolean; // default: true
}
```

Se desabilitado:
- Nao envia read receipts para outros
- Nao recebe read receipts de outros (so ve delivered)

## Testes

### Unitarios
- MessageStatus renderiza icone correto para cada status
- Formato de timestamp correto

### Integracao
- Mensagem inicia com status 'sending'
- Status atualiza para 'sent' apos confirmacao do servidor
- Delivery receipt e enviado ao receber mensagem
- Read receipt e enviado ao visualizar conversa
- Status atualiza quando receipt e recebido

### E2E
- Usuario A envia mensagem -> ve status 'sent'
- Usuario B recebe -> Usuario A ve 'delivered'
- Usuario B abre conversa -> Usuario A ve 'read'

## Checklist de Implementacao

- [ ] Atualizar schema Prisma com campos de status
- [ ] Criar migration
- [ ] Adicionar tipos em shared-types
- [ ] Implementar handlers WS no backend
- [ ] Criar componente MessageStatus
- [ ] Integrar status no MessageBubble
- [ ] Implementar delivery receipt automatico
- [ ] Implementar read receipt ao visualizar
- [ ] Adicionar optimistic updates
- [ ] Adicionar privacy setting (opcional fase 1)
- [ ] Testes
