# Feature: Reply/Quote Messages

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

Permitir que usuarios respondam a mensagens especificas, criando contexto nas conversas. Similar ao WhatsApp/Telegram.

## Comportamento Esperado

### Iniciando um Reply

1. Usuario clica/segura em uma mensagem
2. Aparece opcao "Responder" no menu de contexto
3. Composer mostra preview da mensagem sendo respondida
4. Usuario digita a resposta e envia

### Visualizacao do Reply

1. Mensagem de reply exibe preview da mensagem original acima
2. Preview mostra: nome do autor + trecho do texto (max 100 chars)
3. Clique no preview faz scroll ate a mensagem original
4. Se mensagem original foi deletada: "Mensagem removida"

## Modelo de Dados

### Prisma Schema

```prisma
model ChatMessage {
  id            String   @id @default(uuid())
  threadId      String
  senderId      String
  ciphertext    String
  nonce         String

  // Reply fields
  replyToId     String?           // ID da mensagem sendo respondida
  replyTo       ChatMessage?      @relation("MessageReplies", fields: [replyToId], references: [id], onDelete: SetNull)
  replies       ChatMessage[]     @relation("MessageReplies")

  // ... outros campos existentes
}
```

### Shared Types

```typescript
// packages/shared-types/src/chat.ts

export interface ChatMessage {
  id: string;
  threadId: string;
  senderId: string;
  plaintext?: string;

  // Reply
  replyToId?: string | null;
  replyTo?: {
    id: string;
    senderId: string;
    senderName?: string;
    senderHandle?: string;
    plaintext?: string;  // Decriptado no frontend
    type: string;
  } | null;

  // ... outros campos
}

export interface SendMessagePayload {
  threadId: string;
  plaintext: string;
  replyToId?: string;  // Novo campo
  // ... outros campos
}
```

## API

### Enviar Mensagem com Reply

O endpoint existente `POST /api/chat/messages` aceita o campo adicional:

```typescript
// Request body
{
  threadId: string;
  ciphertext: string;
  nonce: string;
  replyToId?: string;  // ID da mensagem sendo respondida
  // ... outros campos
}
```

### Buscar Mensagens

O endpoint existente `GET /api/chat/threads/:threadId/messages` deve retornar o campo `replyTo` populado:

```typescript
// Response
{
  messages: [
    {
      id: "msg-1",
      senderId: "user-1",
      ciphertext: "...",
      replyToId: "msg-0",
      replyTo: {
        id: "msg-0",
        senderId: "user-2",
        senderName: "João",
        senderHandle: "joao",
        ciphertext: "...",  // Frontend decripta
        type: "text"
      }
    }
  ]
}
```

## WebSocket Events

### Enviar Reply

```typescript
// Cliente -> Servidor
{
  type: 'chat:message',
  payload: {
    threadId: string;
    ciphertext: string;
    nonce: string;
    replyToId?: string;
  }
}
```

### Receber Reply

```typescript
// Servidor -> Cliente
{
  type: 'chat:message',
  payload: {
    id: string;
    threadId: string;
    senderId: string;
    ciphertext: string;
    replyToId?: string;
    replyTo?: {
      id: string;
      senderId: string;
      senderName: string;
      ciphertext: string;
    };
  }
}
```

## Componentes Frontend

### 1. ReplyPreview (novo)

Preview da mensagem sendo respondida, exibido no Composer.

```typescript
// apps/web/src/components/chat/ReplyPreview.tsx

interface ReplyPreviewProps {
  message: {
    id: string;
    senderName: string;
    plaintext: string;
    type: string;
  };
  onCancel: () => void;
}
```

**UI:**
- Container com borda esquerda colorida (cor do remetente)
- Nome do remetente em bold
- Trecho da mensagem (max 100 chars, truncado com ...)
- Botao X para cancelar reply
- Altura fixa ~60px

### 2. QuotedMessage (novo)

Preview da mensagem original dentro da bolha de reply.

```typescript
// apps/web/src/components/chat/QuotedMessage.tsx

interface QuotedMessageProps {
  replyTo: {
    id: string;
    senderName: string;
    plaintext?: string;
    type: string;
  };
  onScrollTo: (messageId: string) => void;
}
```

**UI:**
- Container menor dentro da bolha
- Background levemente diferente
- Nome do remetente + preview do texto
- Clicavel (scroll para mensagem original)
- Se mensagem deletada: "Mensagem removida" em italico

### 3. ChatComposer (modificar)

Adicionar estado de reply e ReplyPreview.

```typescript
// Adicionar ao ChatComposer
const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);

// Passar para sendMessage
const handleSend = () => {
  sendMessage(threadId, text, media, replyingTo?.id);
  setReplyingTo(null);
};
```

### 4. MessageBubble (modificar)

Adicionar QuotedMessage quando mensagem tem replyTo.

```typescript
// Dentro do MessageBubble
{message.replyTo && (
  <QuotedMessage
    replyTo={message.replyTo}
    onScrollTo={handleScrollToMessage}
  />
)}
```

### 5. MessageList (modificar)

Implementar scroll para mensagem especifica.

```typescript
const scrollToMessage = (messageId: string) => {
  const element = document.getElementById(`msg-${messageId}`);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // Highlight temporario
    element.classList.add('highlight');
    setTimeout(() => element.classList.remove('highlight'), 2000);
  }
};
```

## Estado Zustand

Adicionar ao useChat:

```typescript
interface ChatState {
  // ... campos existentes

  // Reply
  replyingTo: Map<string, ChatMessage | null>;  // threadId -> message
  setReplyingTo: (threadId: string, message: ChatMessage | null) => void;
}
```

## Fluxo de Implementacao

### Backend

1. Criar migration Prisma para `replyToId`
2. Atualizar `chat.ts` service para incluir replyTo na busca
3. Atualizar `chat-handler.ts` para processar replyToId no WS

### Frontend

1. Atualizar tipos em shared-types
2. Criar componente `ReplyPreview`
3. Criar componente `QuotedMessage`
4. Modificar `ChatComposer` para suportar reply
5. Modificar `MessageBubble` para exibir quoted
6. Modificar `MessageList` para scroll to message
7. Adicionar menu de contexto com opcao "Responder"

## Consideracoes E2EE

- O conteudo da mensagem original (replyTo.plaintext) deve ser decriptado no frontend
- Backend armazena apenas replyToId e dados nao-sensiveis (senderId, type)
- Preview no frontend exibe o texto decriptado

## UI/UX

### Cores do Reply Preview

- Usar cor baseada no senderId (mesmo esquema de cores dos avatares)
- Borda esquerda com 3px de espessura

### Animacoes

- Reply preview: slide in from bottom
- Cancel: fade out
- Scroll to message: smooth + highlight pulsante

### Mobile

- Long press na mensagem abre menu com "Responder"
- Swipe right na mensagem inicia reply (opcional, fase futura)

## Validacao

### Cenarios de Teste

1. ✓ Reply em DM
2. ✓ Reply em grupo
3. ✓ Reply em mensagem propria
4. ✓ Reply em mensagem de outro usuario
5. ✓ Clique no quote faz scroll
6. ✓ Mensagem original deletada mostra placeholder
7. ✓ Reply com imagem (tipo diferente de text)
8. ✓ Cancelar reply antes de enviar
9. ✓ E2EE: conteudo decriptado corretamente

## Checklist de Implementacao

- [ ] Migration Prisma para replyToId
- [ ] Backend: incluir replyTo na busca de mensagens
- [ ] Backend: processar replyToId no envio WS
- [ ] Shared-types: atualizar ChatMessage
- [ ] Componente ReplyPreview
- [ ] Componente QuotedMessage
- [ ] ChatComposer: estado de reply + preview
- [ ] MessageBubble: exibir QuotedMessage
- [ ] MessageList: scroll to message + highlight
- [ ] Menu de contexto: opcao "Responder"
- [ ] Zustand: estado replyingTo
- [ ] Testes manuais dos cenarios
