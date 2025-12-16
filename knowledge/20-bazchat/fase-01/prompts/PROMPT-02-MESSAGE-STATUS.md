# Prompt: Implementar Message Status (Read Receipts) no BazChat

## IMPORTANTE: Codigo de Producao

**ATENCAO**: Esta implementacao deve ser **CODIGO FINAL DE PRODUCAO**.

- **NAO** usar dados mockados ou fake data
- **NAO** usar placeholders ou TODOs
- **NAO** deixar funcionalidades incompletas
- **NAO** hardcodar valores que deveriam ser dinamicos
- **NAO** assumir comportamentos - PERGUNTE se tiver duvida

**EM CASO DE DUVIDA**: Pare e pergunte ao usuario antes de implementar.

---

## Contexto

Voce vai implementar indicadores de status de mensagem no BazChat: enviando, enviado, entregue, lido. Similar aos checkmarks do WhatsApp.

## Especificacao

Leia a especificacao completa em: `knowledge/bazchat/fase-01/02-MESSAGE-STATUS.md`

## Status de Mensagem

| Status | Visual | Quando |
|--------|--------|--------|
| `sending` | Clock icon | Mensagem criada localmente |
| `sent` | Single check (gray) | Servidor confirmou recebimento |
| `delivered` | Double check (gray) | Dispositivo do destinatario recebeu |
| `read` | Double check (blue) | Destinatario visualizou |
| `failed` | Red X | Erro no envio |

## Arquivos a Modificar/Criar

### Database

1. **`packages/db/prisma/schema.prisma`**
   - Adicionar campos em `ChatMessage`: `status`, `deliveredAt`, `readAt`
   - Criar tabela `ChatReadReceipt` para grupos
   - Rodar migration

### Shared Types

2. **`packages/shared-types/src/chat.ts`**
   - Adicionar tipo `MessageStatus`
   - Adicionar tipos WS: `WsDeliveryReceipt`, `WsReadReceipt`, `WsStatusUpdate`
   - Atualizar `ChatMessage` com campos de status

### Backend

3. **`apps/api/src/ws/chat-handler.ts`**
   - No `send`: criar mensagem com status `sent`, notificar remetente
   - Implementar handler `receipt:delivered`
   - Implementar handler `receipt:read`
   - Broadcast de `message:status` para remetentes

### Frontend

4. **`apps/web/src/components/chat/MessageStatus.tsx`** (NOVO)
   - Componente que renderiza o icone correto baseado no status
   - Props: `status: MessageStatus`
   - Usar Lucide icons: Clock, Check, CheckCheck, AlertCircle

5. **`apps/web/src/hooks/useChat.ts`**
   - Adicionar handler para `message:status`
   - Implementar `sendDeliveryReceipt(messageIds[])`
   - Implementar `sendReadReceipt(threadId, messageIds[])`
   - Ao receber mensagem: enviar delivery receipt automaticamente
   - Optimistic update: mensagem local inicia com status `sending`

6. **`apps/web/src/components/chat/MessageBubble.tsx`**
   - Importar e usar `MessageStatus`
   - Mostrar apenas para mensagens proprias (isOwn)
   - Posicionar ao lado do timestamp

7. **`apps/web/src/pages/chat/ChatThreadPage.tsx`**
   - useEffect para enviar read receipt quando visualizar mensagens nao lidas

## Ordem de Implementacao

1. Migration do Prisma (status, deliveredAt, readAt)
2. Tipos em shared-types
3. Backend handlers
4. Componente MessageStatus
5. useChat: handlers e actions
6. Integracao no MessageBubble
7. Read receipt automatico na ChatThreadPage

## Validacao

Apos implementar, testar:
- [ ] Enviar mensagem -> ve clock, depois single check
- [ ] Outro usuario recebe -> primeiro usuario ve double check cinza
- [ ] Outro usuario abre conversa -> primeiro usuario ve double check azul
- [ ] Falha de conexao -> mensagem mostra X vermelho

## Codigo de Referencia

### MessageStatus Component

```tsx
import { Check, CheckCheck, Clock, AlertCircle } from 'lucide-react';

export function MessageStatus({ status }: { status: MessageStatus }) {
  const icons = {
    sending: <Clock className="h-3.5 w-3.5 text-muted-foreground animate-pulse" />,
    sent: <Check className="h-3.5 w-3.5 text-muted-foreground" />,
    delivered: <CheckCheck className="h-3.5 w-3.5 text-muted-foreground" />,
    read: <CheckCheck className="h-3.5 w-3.5 text-blue-500" />,
    failed: <AlertCircle className="h-3.5 w-3.5 text-destructive" />,
  };

  return <span className="inline-flex">{icons[status]}</span>;
}
```

### Optimistic Update no sendMessage

```typescript
// Criar mensagem local com status 'sending'
const tempMessage = {
  id: `temp-${Date.now()}`,
  // ...outros campos
  status: 'sending',
};

// Adicionar ao state
set({ messages: new Map(get().messages).set(threadId, [...current, tempMessage]) });

// Enviar via WS - quando servidor confirmar, handler de 'message:status' atualiza
```

### Read Receipt no ChatThreadPage

```typescript
useEffect(() => {
  if (!messages.length) return;

  const unread = messages.filter(
    m => m.senderId !== currentProfileId && m.status !== 'read'
  );

  if (unread.length > 0) {
    sendReadReceipt(threadId, unread.map(m => m.id));
  }
}, [messages]);
```

## Nao Fazer

- Nao implementar privacy settings nesta fase (sera fase futura)
- Nao mostrar "quem leu" em grupos nesta fase (so o proprio status)
- Nao modificar o fluxo E2EE existente
