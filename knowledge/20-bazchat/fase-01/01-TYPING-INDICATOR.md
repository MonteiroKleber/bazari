# Feature: Typing Indicator

## Resumo

Mostrar indicador visual quando outro usuario esta digitando na conversa, similar ao WhatsApp.

## User Stories

1. **Como usuario**, quero ver quando alguem esta digitando para mim, para saber que uma resposta esta vindo
2. **Como usuario em grupo**, quero ver quem esta digitando, para acompanhar a conversa
3. **Como usuario**, quero que outros vejam quando estou digitando, para melhor comunicacao

## Especificacao Tecnica

### 1. WebSocket Events (Backend)

#### Novos eventos no protocolo WS:

```typescript
// Cliente -> Servidor
interface WsTypingStart {
  op: 'typing:start';
  data: {
    threadId: string;
  };
}

interface WsTypingStop {
  op: 'typing:stop';
  data: {
    threadId: string;
  };
}

// Servidor -> Cliente (broadcast para outros participantes)
interface WsTypingNotify {
  op: 'typing';
  data: {
    threadId: string;
    profileId: string;
    handle: string;
    displayName: string;
    isTyping: boolean;
  };
}
```

### 2. Backend Implementation

#### Arquivo: `apps/api/src/ws/chat-handler.ts`

```typescript
// Adicionar ao handler de mensagens WS:

// Map para rastrear quem esta digitando
const typingUsers = new Map<string, Map<string, NodeJS.Timeout>>();
// threadId -> Map<profileId, timeout>

case 'typing:start': {
  const { threadId } = msg.data;
  const profileId = socket.profileId;

  // Limpar timeout anterior se existir
  const threadTyping = typingUsers.get(threadId) || new Map();
  if (threadTyping.has(profileId)) {
    clearTimeout(threadTyping.get(profileId));
  }

  // Auto-stop apos 5 segundos sem nova mensagem
  const timeout = setTimeout(() => {
    broadcastTyping(threadId, profileId, false);
    threadTyping.delete(profileId);
  }, 5000);

  threadTyping.set(profileId, timeout);
  typingUsers.set(threadId, threadTyping);

  // Broadcast para outros participantes
  broadcastTyping(threadId, profileId, true);
  break;
}

case 'typing:stop': {
  const { threadId } = msg.data;
  const profileId = socket.profileId;

  const threadTyping = typingUsers.get(threadId);
  if (threadTyping?.has(profileId)) {
    clearTimeout(threadTyping.get(profileId));
    threadTyping.delete(profileId);
  }

  broadcastTyping(threadId, profileId, false);
  break;
}

async function broadcastTyping(threadId: string, profileId: string, isTyping: boolean) {
  // Buscar info do profile
  const profile = await db.profile.findUnique({ where: { id: profileId } });

  // Buscar participantes da thread
  const thread = await db.chatThread.findUnique({
    where: { id: threadId },
    select: { participants: true }
  });

  // Enviar para todos exceto quem esta digitando
  for (const participantId of thread.participants) {
    if (participantId !== profileId) {
      sendToProfile(participantId, {
        op: 'typing',
        data: {
          threadId,
          profileId,
          handle: profile.handle,
          displayName: profile.displayName,
          isTyping,
        }
      });
    }
  }
}
```

### 3. Frontend Implementation

#### Arquivo: `apps/web/src/lib/chat/websocket.ts`

Adicionar metodos para enviar typing events:

```typescript
// Na classe ChatWebSocketClient

private typingTimeout: NodeJS.Timeout | null = null;

sendTypingStart(threadId: string) {
  this.send({ op: 'typing:start', data: { threadId } });

  // Auto-stop apos 3s sem nova chamada
  if (this.typingTimeout) clearTimeout(this.typingTimeout);
  this.typingTimeout = setTimeout(() => {
    this.sendTypingStop(threadId);
  }, 3000);
}

sendTypingStop(threadId: string) {
  this.send({ op: 'typing:stop', data: { threadId } });
  if (this.typingTimeout) {
    clearTimeout(this.typingTimeout);
    this.typingTimeout = null;
  }
}
```

#### Arquivo: `apps/web/src/hooks/useChat.ts`

Adicionar estado de typing:

```typescript
interface ChatState {
  // ... existing
  typingUsers: Map<string, Array<{
    profileId: string;
    handle: string;
    displayName: string;
  }>>;

  // Actions
  sendTypingStart: (threadId: string) => void;
  sendTypingStop: (threadId: string) => void;
}

// No handler de mensagens WS:
if (msg.op === 'typing') {
  const { threadId, profileId, handle, displayName, isTyping } = msg.data;
  const current = get().typingUsers.get(threadId) || [];

  if (isTyping) {
    // Adicionar se nao existir
    if (!current.find(u => u.profileId === profileId)) {
      set({
        typingUsers: new Map(get().typingUsers).set(threadId, [
          ...current,
          { profileId, handle, displayName }
        ])
      });
    }
  } else {
    // Remover
    set({
      typingUsers: new Map(get().typingUsers).set(
        threadId,
        current.filter(u => u.profileId !== profileId)
      )
    });
  }
}
```

#### Arquivo: `apps/web/src/components/chat/TypingIndicator.tsx` (NOVO)

```typescript
interface TypingIndicatorProps {
  users: Array<{ displayName: string }>;
}

export function TypingIndicator({ users }: TypingIndicatorProps) {
  if (users.length === 0) return null;

  const text = users.length === 1
    ? `${users[0].displayName} esta digitando`
    : users.length === 2
    ? `${users[0].displayName} e ${users[1].displayName} estao digitando`
    : `${users[0].displayName} e mais ${users.length - 1} estao digitando`;

  return (
    <div className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground">
      <TypingDots />
      <span>{text}</span>
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex gap-1">
      <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]" />
      <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]" />
      <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
    </div>
  );
}
```

#### Arquivo: `apps/web/src/components/chat/ChatComposer.tsx`

Modificar para emitir typing events:

```typescript
// No onChange do input:
const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
  setMessage(e.target.value);

  // Emitir typing start
  if (e.target.value.length > 0) {
    sendTypingStart(threadId);
  }
};

// No onBlur:
const handleBlur = () => {
  sendTypingStop(threadId);
};

// Apos enviar mensagem:
const handleSend = async () => {
  sendTypingStop(threadId);
  // ... resto do envio
};
```

#### Arquivo: `apps/web/src/pages/chat/ChatThreadPage.tsx`

Integrar o TypingIndicator:

```typescript
// Importar
import { TypingIndicator } from '@/components/chat/TypingIndicator';

// No componente, obter typing users
const typingUsers = useChat(state => state.typingUsers.get(threadId) || []);

// Renderizar acima do composer
<div className="flex-1 overflow-hidden flex flex-col">
  <MessageList messages={messages} />
  <TypingIndicator users={typingUsers} />
  <ChatComposer threadId={threadId} />
</div>
```

### 4. Shared Types

#### Arquivo: `packages/shared-types/src/chat.ts`

Adicionar novos tipos:

```typescript
// WebSocket client messages
export interface WsTypingStart {
  op: 'typing:start';
  data: { threadId: string };
}

export interface WsTypingStop {
  op: 'typing:stop';
  data: { threadId: string };
}

// WebSocket server messages
export interface WsTypingNotify {
  op: 'typing';
  data: {
    threadId: string;
    profileId: string;
    handle: string;
    displayName: string;
    isTyping: boolean;
  };
}

// Atualizar union types
export type WsClientMsg = /* existing */ | WsTypingStart | WsTypingStop;
export type WsServerMsg = /* existing */ | WsTypingNotify;
```

## UI/UX Specs

### Visual

```
┌─────────────────────────────────────┐
│ [Mensagens...]                      │
│                                     │
│                                     │
├─────────────────────────────────────┤
│ ● ● ● João está digitando...        │  <- TypingIndicator
├─────────────────────────────────────┤
│ [Composer input]              [Send]│
└─────────────────────────────────────┘
```

### Animacao dos Dots

- 3 circulos de 8px
- Cor: muted-foreground
- Animacao: bounce com delay escalonado
- Duracao: 0.6s infinite

### Na Lista de Conversas (ThreadItem)

Mostrar "digitando..." no lugar do preview da ultima mensagem:

```
┌─────────────────────────────────────┐
│ [Avatar] João Silva          14:32  │
│          digitando...               │  <- italico, cor muted
└─────────────────────────────────────┘
```

## Testes

### Unitarios
- `TypingIndicator` renderiza corretamente para 1, 2 e 3+ users
- `TypingDots` tem animacao correta

### Integracao
- Typing event e enviado ao digitar
- Typing stop e enviado ao enviar mensagem
- Timeout de 5s funciona no backend
- Broadcast vai para todos participantes exceto sender

### E2E
- Usuario A ve indicator quando Usuario B digita
- Indicator desaparece apos mensagem enviada
- Indicator desaparece apos timeout

## Checklist de Implementacao

- [ ] Adicionar tipos em shared-types
- [ ] Implementar handlers WS no backend
- [ ] Criar componente TypingIndicator
- [ ] Modificar ChatComposer para emitir events
- [ ] Adicionar estado typingUsers no useChat
- [ ] Integrar na ChatThreadPage
- [ ] Mostrar na ThreadItem (inbox)
- [ ] Testes
