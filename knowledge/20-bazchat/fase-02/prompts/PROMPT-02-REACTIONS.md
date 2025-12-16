# Prompt: Implementar Emoji Reactions

## IMPORTANTE: Codigo de Producao

**ATENCAO**: Toda implementacao deve ser **CODIGO FINAL DE PRODUCAO**.

- **NAO** usar dados mockados
- **NAO** usar placeholders ou TODOs
- **NAO** deixar funcionalidades incompletas
- **NAO** usar valores hardcoded que deveriam vir do banco/API
- **NAO** assumir como algo deve funcionar - PERGUNTE se tiver duvida

**EM CASO DE DUVIDA**: Pare e pergunte ao usuario antes de implementar.

---

## Objetivo

Implementar reacoes com emoji nas mensagens do BazChat.

## Especificacao

Leia a especificacao completa em: `knowledge/bazchat/fase-02/02-REACTIONS.md`

## Ordem de Implementacao

### Etapa 1: Backend - Database

1. Criar migration Prisma:
```bash
cd packages/db
npx prisma migrate dev --name add_message_reactions
```

Adicionar ao schema:
```prisma
model ChatMessageReaction {
  id        String   @id @default(uuid())
  messageId String
  userId    String
  emoji     String
  createdAt DateTime @default(now())

  message   ChatMessage @relation(fields: [messageId], references: [id], onDelete: Cascade)
  user      Profile     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([messageId, userId, emoji])
  @@index([messageId])
}

model ChatMessage {
  // ... existente
  reactions ChatMessageReaction[]
}

model Profile {
  // ... existente
  messageReactions ChatMessageReaction[]
}
```

### Etapa 2: Backend - API REST

Criar/modificar `apps/api/src/routes/chat.ts`:

```typescript
// POST /api/chat/messages/:messageId/reactions
router.post('/messages/:messageId/reactions', async (req, res) => {
  const { messageId } = req.params;
  const { emoji, action } = req.body;
  const userId = req.user.profileId;

  if (action === 'add') {
    const reaction = await chatService.addReaction(messageId, userId, emoji);
    return res.json({ success: true, reaction });
  } else {
    await chatService.removeReaction(messageId, userId, emoji);
    return res.json({ success: true });
  }
});

// GET /api/chat/messages/:messageId/reactions
router.get('/messages/:messageId/reactions', async (req, res) => {
  const { messageId } = req.params;
  const reactions = await chatService.getReactions(messageId);
  return res.json({ reactions });
});
```

### Etapa 3: Backend - Service

Adicionar ao `apps/api/src/services/chat.ts`:

```typescript
async addReaction(messageId: string, userId: string, emoji: string) {
  return prisma.chatMessageReaction.upsert({
    where: {
      messageId_userId_emoji: { messageId, userId, emoji }
    },
    create: { messageId, userId, emoji },
    update: {},
    include: {
      user: { select: { id: true, displayName: true, handle: true } }
    }
  });
}

async removeReaction(messageId: string, userId: string, emoji: string) {
  return prisma.chatMessageReaction.delete({
    where: {
      messageId_userId_emoji: { messageId, userId, emoji }
    }
  });
}

async getReactionsSummary(messageId: string): Promise<ReactionSummary[]> {
  const reactions = await prisma.chatMessageReaction.findMany({
    where: { messageId },
    include: { user: { select: { id: true, displayName: true } } }
  });

  // Agregar por emoji
  const summary = new Map<string, ReactionSummary>();
  reactions.forEach(r => {
    if (!summary.has(r.emoji)) {
      summary.set(r.emoji, { emoji: r.emoji, count: 0, userIds: [], users: [] });
    }
    const s = summary.get(r.emoji)!;
    s.count++;
    s.userIds.push(r.userId);
    s.users.push({ id: r.user.id, displayName: r.user.displayName });
  });

  return Array.from(summary.values());
}
```

### Etapa 4: Backend - WebSocket

Adicionar ao `apps/api/src/ws/chat-handler.ts`:

```typescript
// Handler para chat:reaction
case 'chat:reaction': {
  const { messageId, emoji, action } = payload;

  if (action === 'add') {
    const reaction = await chatService.addReaction(messageId, userId, emoji);
    // Broadcast para todos na thread
    broadcastToThread(threadId, {
      type: 'chat:reaction',
      payload: { messageId, emoji, action: 'add', userId, user: reaction.user }
    });
  } else {
    await chatService.removeReaction(messageId, userId, emoji);
    broadcastToThread(threadId, {
      type: 'chat:reaction',
      payload: { messageId, emoji, action: 'remove', userId }
    });
  }
  break;
}
```

### Etapa 5: Shared Types

Atualizar `packages/shared-types/src/chat.ts`:

```typescript
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
  };
}

export interface ReactionSummary {
  emoji: string;
  count: number;
  userIds: string[];
  hasCurrentUser?: boolean;
}

export interface ChatMessage {
  // ... existente
  reactions?: ChatMessageReaction[];
  reactionsSummary?: ReactionSummary[];
}
```

### Etapa 6: Frontend - Componentes

1. Criar `apps/web/src/components/chat/ReactionPicker.tsx`:
   - Popover com emojis rapidos: 👍 ❤️ 😂 😮 😢 🙏
   - Callback onSelect

2. Criar `apps/web/src/components/chat/ReactionBar.tsx`:
   - Barra horizontal de reactions
   - Badge pill para cada emoji com contador
   - Highlight se usuario reagiu
   - onClick toggle reaction

3. Criar `apps/web/src/components/chat/ReactionUsersDialog.tsx`:
   - Dialog com lista de quem reagiu
   - Tabs por emoji

### Etapa 7: Frontend - Integracao

1. Modificar `MessageBubble.tsx`:
   - Adicionar ReactionBar abaixo do conteudo
   - Trigger para ReactionPicker (hover/long press)

2. Atualizar `useChat.ts`:
```typescript
toggleReaction: async (messageId: string, emoji: string) => {
  // Optimistic update
  // Call API/WS
  // Handle response
}
```

3. Adicionar WS listener para `chat:reaction`

## Arquivos a Modificar

### Backend
- [ ] `packages/db/prisma/schema.prisma`
- [ ] `apps/api/src/routes/chat.ts`
- [ ] `apps/api/src/services/chat.ts`
- [ ] `apps/api/src/ws/chat-handler.ts`

### Shared
- [ ] `packages/shared-types/src/chat.ts`

### Frontend
- [ ] `apps/web/src/components/chat/ReactionPicker.tsx` (novo)
- [ ] `apps/web/src/components/chat/ReactionBar.tsx` (novo)
- [ ] `apps/web/src/components/chat/ReactionUsersDialog.tsx` (novo)
- [ ] `apps/web/src/components/chat/MessageBubble.tsx`
- [ ] `apps/web/src/hooks/useChat.ts`
- [ ] `apps/web/src/lib/chat/websocket.ts`

## Cenarios de Teste

1. [ ] Adicionar primeira reacao a mensagem
2. [ ] Adicionar reacao que ja existe (incrementa contador)
3. [ ] Remover propria reacao
4. [ ] Ver quem reagiu (dialog)
5. [ ] Realtime: outro usuario ve reacao aparecer
6. [ ] Reacoes persistem apos reload
7. [ ] Animacoes funcionando

## Commit

Apos implementar e testar:
```bash
git add .
git commit -m "feat(chat): implement emoji reactions

- Add ChatMessageReaction model
- Create REST endpoints for reactions
- Add WebSocket handler for realtime reactions
- Create ReactionPicker, ReactionBar, ReactionUsersDialog
- Integrate reactions into MessageBubble"
```
