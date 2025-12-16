# Feature: Emoji Reactions

## IMPORTANTE: Codigo de Producao

**ATENCAO**: Toda implementacao deve ser **CODIGO FINAL DE PRODUCAO**.

- **NAO** usar dados mockados ou fake data
- **NAO** usar placeholders ou TODOs
- **NAO** deixar funcionalidades incompletas
- **NAO** hardcodar valores que deveriam ser dinamicos
- **NAO** assumir comportamentos - PERGUNTE se tiver duvida

**EM CASO DE DUVIDA**: Pare e pergunte ao usuario antes de implementar.

---

## Objetivo

Permitir que usuarios reajam a mensagens com emojis, oferecendo feedback rapido sem necessidade de digitar. Similar ao Slack/Discord/WhatsApp.

## Comportamento Esperado

### Adicionando Reacao

1. Usuario clica/segura em uma mensagem
2. Aparece picker de emojis com reacoes rapidas
3. Usuario seleciona um emoji
4. Reacao e adicionada a mensagem (realtime para todos)

### Visualizacao das Reacoes

1. Reacoes aparecem abaixo da bolha da mensagem
2. Cada emoji mostra contador se > 1
3. Emojis do usuario atual tem destaque visual
4. Clique no emoji toggle (adiciona/remove)
5. Long press mostra quem reagiu

### Remover Reacao

1. Clique no proprio emoji remove a reacao
2. Ou via menu de contexto

## Modelo de Dados

### Prisma Schema

```prisma
model ChatMessageReaction {
  id        String   @id @default(uuid())
  messageId String
  userId    String
  emoji     String   // Unicode emoji: "👍", "❤️", "😂", etc
  createdAt DateTime @default(now())

  message   ChatMessage @relation(fields: [messageId], references: [id], onDelete: Cascade)
  user      Profile     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([messageId, userId, emoji])  // Um usuario, um emoji por mensagem
  @@index([messageId])
}

model ChatMessage {
  // ... campos existentes

  reactions ChatMessageReaction[]
}
```

### Shared Types

```typescript
// packages/shared-types/src/chat.ts

export interface ChatMessageReaction {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
  createdAt: string;
  user?: {
    id: string;
    displayName: string;
    handle: string;
    avatarUrl?: string;
  };
}

export interface ChatMessage {
  // ... campos existentes

  reactions?: ChatMessageReaction[];
  // Agregado para exibicao
  reactionsSummary?: {
    emoji: string;
    count: number;
    userIds: string[];
    hasCurrentUser: boolean;
  }[];
}

export interface ReactionPayload {
  messageId: string;
  emoji: string;
  action: 'add' | 'remove';
}
```

## API REST

### Adicionar/Remover Reacao

```
POST /api/chat/messages/:messageId/reactions
```

```typescript
// Request body
{
  emoji: string;      // "👍"
  action: 'add' | 'remove';
}

// Response 200
{
  success: true;
  reaction?: ChatMessageReaction;  // Se action = 'add'
}
```

### Listar Quem Reagiu

```
GET /api/chat/messages/:messageId/reactions
```

```typescript
// Response
{
  reactions: ChatMessageReaction[];  // Com user populado
}
```

## WebSocket Events

### Adicionar Reacao

```typescript
// Cliente -> Servidor
{
  type: 'chat:reaction',
  payload: {
    messageId: string;
    emoji: string;
    action: 'add' | 'remove';
  }
}
```

### Broadcast de Reacao

```typescript
// Servidor -> Todos na thread
{
  type: 'chat:reaction',
  payload: {
    messageId: string;
    userId: string;
    emoji: string;
    action: 'add' | 'remove';
    user: {
      id: string;
      displayName: string;
      handle: string;
    }
  }
}
```

## Componentes Frontend

### 1. ReactionPicker (novo)

Picker de emojis para reacoes rapidas.

```typescript
// apps/web/src/components/chat/ReactionPicker.tsx

interface ReactionPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
  position: { x: number; y: number };
}
```

**Emojis Rapidos (padrao):**
```
👍 ❤️ 😂 😮 😢 🙏
```

**UI:**
- Popover flutuante proximo a mensagem
- 6 emojis principais em linha
- Botao "+" para abrir picker completo (opcional fase futura)
- Fecha ao clicar fora ou selecionar

### 2. ReactionBar (novo)

Barra de reacoes exibida abaixo da bolha.

```typescript
// apps/web/src/components/chat/ReactionBar.tsx

interface ReactionBarProps {
  reactions: {
    emoji: string;
    count: number;
    hasCurrentUser: boolean;
    users: { id: string; displayName: string }[];
  }[];
  onToggle: (emoji: string) => void;
  onShowUsers: (emoji: string) => void;
}
```

**UI:**
- Horizontal, abaixo da bolha
- Cada emoji em badge pill
- Contador ao lado se > 1
- Background destacado se usuario reagiu
- Hover/long press mostra tooltip com nomes

### 3. ReactionUsersDialog (novo)

Dialog mostrando quem reagiu com cada emoji.

```typescript
// apps/web/src/components/chat/ReactionUsersDialog.tsx

interface ReactionUsersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reactions: ChatMessageReaction[];
  selectedEmoji?: string;
}
```

**UI:**
- Tabs por emoji
- Lista de usuarios com avatar e nome
- Clique no usuario abre perfil

### 4. MessageBubble (modificar)

Adicionar ReactionBar e trigger para ReactionPicker.

```typescript
// Adicionar ao MessageBubble
{message.reactionsSummary && message.reactionsSummary.length > 0 && (
  <ReactionBar
    reactions={message.reactionsSummary}
    onToggle={handleToggleReaction}
    onShowUsers={handleShowReactionUsers}
  />
)}
```

## Estado Zustand

```typescript
interface ChatState {
  // ... campos existentes

  // Reactions
  toggleReaction: (messageId: string, emoji: string) => Promise<void>;
  loadReactionUsers: (messageId: string) => Promise<ChatMessageReaction[]>;
}
```

## Fluxo de Implementacao

### Backend

1. Criar migration Prisma para `ChatMessageReaction`
2. Criar endpoints REST para reactions
3. Adicionar handler WS para `chat:reaction`
4. Incluir reactionsSummary na busca de mensagens

### Frontend

1. Atualizar tipos em shared-types
2. Criar componente `ReactionPicker`
3. Criar componente `ReactionBar`
4. Criar componente `ReactionUsersDialog`
5. Modificar `MessageBubble` para exibir reactions
6. Adicionar handlers no `useChat`
7. Implementar WS listener para reactions

## Agregacao de Reacoes

No backend, ao buscar mensagens, agregar reactions:

```typescript
// chat.service.ts
const reactionsSummary = reactions.reduce((acc, r) => {
  const existing = acc.find(x => x.emoji === r.emoji);
  if (existing) {
    existing.count++;
    existing.userIds.push(r.userId);
  } else {
    acc.push({
      emoji: r.emoji,
      count: 1,
      userIds: [r.userId]
    });
  }
  return acc;
}, []);

// Adicionar hasCurrentUser no frontend
reactionsSummary.forEach(r => {
  r.hasCurrentUser = r.userIds.includes(currentUserId);
});
```

## UI/UX

### Animacoes

- Emoji aparece com scale in + bounce
- Contador incrementa com pulse
- Remocao com fade out

### Cores

- Badge normal: bg-muted
- Badge com reacao do usuario: bg-primary/20 border-primary

### Mobile

- Long press abre ReactionPicker
- Tap no emoji toggle
- Long press no emoji mostra usuarios

### Desktop

- Hover mostra botao de reacao
- Click abre ReactionPicker
- Hover no emoji mostra tooltip com nomes

## Performance

- Maximo de 20 emojis unicos por mensagem
- Lazy load da lista de usuarios (so busca ao clicar)
- Optimistic update no toggle

## Validacao

### Cenarios de Teste

1. ✓ Adicionar primeira reacao
2. ✓ Adicionar reacao existente (incrementa contador)
3. ✓ Remover propria reacao
4. ✓ Nao pode remover reacao de outro
5. ✓ Realtime: outro usuario ve reacao aparecer
6. ✓ Ver quem reagiu
7. ✓ Reacoes em grupo (varios usuarios)
8. ✓ Limite de emojis por mensagem
9. ✓ Persistencia apos reload

## Checklist de Implementacao

- [ ] Migration Prisma para ChatMessageReaction
- [ ] Backend: endpoint POST /reactions
- [ ] Backend: endpoint GET /reactions
- [ ] Backend: handler WS chat:reaction
- [ ] Backend: incluir reactionsSummary na busca
- [ ] Shared-types: ChatMessageReaction
- [ ] Componente ReactionPicker
- [ ] Componente ReactionBar
- [ ] Componente ReactionUsersDialog
- [ ] MessageBubble: integrar ReactionBar
- [ ] Zustand: toggleReaction action
- [ ] WS listener para reactions
- [ ] Animacoes CSS
- [ ] Testes manuais dos cenarios
