# Prompt: Implementar Reply/Quote Messages

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

Implementar a funcionalidade de responder/citar mensagens especificas no BazChat.

## Especificacao

Leia a especificacao completa em: `knowledge/bazchat/fase-02/01-REPLY-QUOTE.md`

## Ordem de Implementacao

### Etapa 1: Backend - Database

1. Criar migration Prisma:
```bash
cd packages/db
npx prisma migrate dev --name add_reply_to_message
```

Adicionar ao schema:
```prisma
model ChatMessage {
  // ... campos existentes
  replyToId     String?
  replyTo       ChatMessage?  @relation("MessageReplies", fields: [replyToId], references: [id], onDelete: SetNull)
  replies       ChatMessage[] @relation("MessageReplies")
}
```

### Etapa 2: Backend - Service

Modificar `apps/api/src/services/chat.ts`:

1. Incluir `replyTo` ao buscar mensagens:
```typescript
const messages = await prisma.chatMessage.findMany({
  where: { threadId },
  include: {
    replyTo: {
      select: {
        id: true,
        senderId: true,
        ciphertext: true,
        nonce: true,
        type: true,
        sender: {
          select: { id: true, displayName: true, handle: true }
        }
      }
    }
  },
  orderBy: { createdAt: 'asc' }
});
```

2. Processar `replyToId` ao criar mensagem

### Etapa 3: Backend - WebSocket

Modificar `apps/api/src/ws/chat-handler.ts`:

1. Aceitar `replyToId` no payload de `chat:message`
2. Incluir `replyTo` no broadcast da nova mensagem

### Etapa 4: Shared Types

Atualizar `packages/shared-types/src/chat.ts`:

```typescript
export interface ChatMessage {
  // ... campos existentes
  replyToId?: string | null;
  replyTo?: {
    id: string;
    senderId: string;
    senderName?: string;
    senderHandle?: string;
    ciphertext?: string;
    nonce?: string;
    type: string;
  } | null;
}
```

### Etapa 5: Frontend - Componentes

1. Criar `apps/web/src/components/chat/ReplyPreview.tsx`:
   - Preview no composer da mensagem sendo respondida
   - Botao para cancelar reply

2. Criar `apps/web/src/components/chat/QuotedMessage.tsx`:
   - Preview da mensagem original dentro da bolha
   - Clicavel para scroll

### Etapa 6: Frontend - Integracao

1. Modificar `ChatComposer.tsx`:
   - Estado `replyingTo`
   - Exibir `ReplyPreview` quando respondendo
   - Passar `replyToId` ao enviar

2. Modificar `MessageBubble.tsx`:
   - Exibir `QuotedMessage` se `message.replyTo` existe

3. Modificar `MessageList.tsx`:
   - Funcao `scrollToMessage(messageId)`
   - Adicionar `id` a cada mensagem para scroll

4. Adicionar menu de contexto:
   - Opcao "Responder" ao clicar na mensagem

### Etapa 7: Frontend - Estado

Atualizar `useChat.ts`:
```typescript
replyingTo: Map<string, ChatMessage | null>;
setReplyingTo: (threadId: string, message: ChatMessage | null) => void;
```

## Arquivos a Modificar

### Backend
- [ ] `packages/db/prisma/schema.prisma`
- [ ] `apps/api/src/services/chat.ts`
- [ ] `apps/api/src/ws/chat-handler.ts`

### Shared
- [ ] `packages/shared-types/src/chat.ts`

### Frontend
- [ ] `apps/web/src/components/chat/ReplyPreview.tsx` (novo)
- [ ] `apps/web/src/components/chat/QuotedMessage.tsx` (novo)
- [ ] `apps/web/src/components/chat/ChatComposer.tsx`
- [ ] `apps/web/src/components/chat/MessageBubble.tsx`
- [ ] `apps/web/src/components/chat/MessageList.tsx`
- [ ] `apps/web/src/hooks/useChat.ts`

## Cenarios de Teste

1. [ ] Reply em DM
2. [ ] Reply em grupo
3. [ ] Clique no quote faz scroll para mensagem original
4. [ ] Mensagem original deletada mostra "Mensagem removida"
5. [ ] Cancelar reply antes de enviar
6. [ ] Reply realtime (outro usuario ve)
7. [ ] E2EE: conteudo decriptado corretamente no quote

## Commit

Apos implementar e testar:
```bash
git add .
git commit -m "feat(chat): implement reply/quote messages

- Add replyToId field to ChatMessage model
- Include replyTo in message fetch and broadcast
- Create ReplyPreview and QuotedMessage components
- Add scroll to quoted message functionality
- Integrate with ChatComposer and MessageBubble"
```
