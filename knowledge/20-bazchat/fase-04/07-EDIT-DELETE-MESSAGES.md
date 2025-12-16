# Feature: Edit/Delete Messages

## Objetivo

Permitir que usuarios editem ou deletem suas proprias mensagens.

## Requisitos Funcionais

### Editar Mensagem
- Apenas mensagens de texto podem ser editadas
- Apenas o autor pode editar
- Janela de tempo: 15 minutos apos envio
- Indicador visual: "editada" ao lado do timestamp
- Historico de edicoes NAO e mantido (simplicidade)

### Deletar Mensagem
- Duas opcoes:
  - "Apagar para mim" - remove apenas localmente
  - "Apagar para todos" - remove para todos os participantes
- Apenas o autor pode apagar para todos
- Sem limite de tempo para apagar
- Mensagem vira placeholder: "Mensagem apagada"
- Midia associada e removida do IPFS (se apagar para todos)

## Implementacao

### 1. Backend - Schema

```prisma
// packages/db/prisma/schema.prisma

model ChatMessage {
  // ... campos existentes ...

  editedAt      DateTime?           // Quando foi editada
  deletedAt     DateTime?           // Soft delete
  deletedBy     String?             // ProfileId de quem deletou
  deleteType    String?             // 'self' | 'all'
}
```

### 2. Backend - Endpoints

```typescript
// apps/api/src/chat/routes/chat.messages.ts

// Editar mensagem
app.put('/chat/messages/:messageId', async (req, reply) => {
  const { messageId } = req.params;
  const { ciphertext } = req.body;
  const profileId = req.authUser.profileId;

  const message = await prisma.chatMessage.findUnique({
    where: { id: messageId },
  });

  if (!message) {
    return reply.code(404).send({ error: 'Message not found' });
  }

  if (message.fromProfileId !== profileId) {
    return reply.code(403).send({ error: 'Not authorized' });
  }

  // Verificar janela de edicao (15 minutos)
  const editWindow = 15 * 60 * 1000;
  if (Date.now() - message.createdAt.getTime() > editWindow) {
    return reply.code(400).send({ error: 'Edit window expired' });
  }

  // Apenas texto pode ser editado
  if (message.type !== 'text') {
    return reply.code(400).send({ error: 'Only text messages can be edited' });
  }

  const updated = await prisma.chatMessage.update({
    where: { id: messageId },
    data: {
      ciphertext,
      editedAt: new Date(),
    },
  });

  // Broadcast via WebSocket
  broadcastToThread(message.threadId, {
    op: 'message:edited',
    data: { messageId, ciphertext, editedAt: updated.editedAt },
  });

  return updated;
});

// Deletar mensagem
app.delete('/chat/messages/:messageId', async (req, reply) => {
  const { messageId } = req.params;
  const { deleteType } = req.query; // 'self' | 'all'
  const profileId = req.authUser.profileId;

  const message = await prisma.chatMessage.findUnique({
    where: { id: messageId },
  });

  if (!message) {
    return reply.code(404).send({ error: 'Message not found' });
  }

  // Verificar permissao para 'all'
  if (deleteType === 'all' && message.fromProfileId !== profileId) {
    return reply.code(403).send({ error: 'Not authorized' });
  }

  if (deleteType === 'all') {
    // Soft delete para todos
    await prisma.chatMessage.update({
      where: { id: messageId },
      data: {
        deletedAt: new Date(),
        deletedBy: profileId,
        deleteType: 'all',
        ciphertext: null, // Limpar conteudo
        mediaCid: null,
      },
    });

    // TODO: Remover midia do IPFS se houver

    // Broadcast
    broadcastToThread(message.threadId, {
      op: 'message:deleted',
      data: { messageId, deleteType: 'all' },
    });
  } else {
    // Delete local (apenas para este usuario)
    // Criar registro de mensagem oculta
    await prisma.chatMessageHidden.create({
      data: {
        messageId,
        profileId,
      },
    });
  }

  return { success: true };
});
```

### 3. Shared Types

```typescript
// packages/shared-types/src/chat.ts

export interface ChatMessage {
  // ... campos existentes ...
  editedAt?: number | null;
  deletedAt?: number | null;
  isDeleted?: boolean;
}
```

### 4. Frontend - Context Menu

```typescript
// apps/web/src/components/chat/MessageBubble.tsx

// No ContextMenuContent:
{isMe && message.type === 'text' && canEdit(message) && (
  <ContextMenuItem onClick={() => onEdit?.(message)} className="gap-2">
    <Pencil className="h-4 w-4" />
    Editar
  </ContextMenuItem>
)}

{isMe && (
  <ContextMenuItem
    onClick={() => setShowDeleteDialog(true)}
    className="gap-2 text-destructive"
  >
    <Trash2 className="h-4 w-4" />
    Apagar
  </ContextMenuItem>
)}

// Funcao auxiliar:
function canEdit(message: ChatMessage): boolean {
  const editWindow = 15 * 60 * 1000; // 15 minutos
  return Date.now() - message.createdAt < editWindow;
}
```

### 5. Dialog de Confirmacao para Delete

```typescript
// apps/web/src/components/chat/DeleteMessageDialog.tsx

interface DeleteMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAuthor: boolean;
  onDelete: (deleteType: 'self' | 'all') => void;
}

export function DeleteMessageDialog({
  open,
  onOpenChange,
  isAuthor,
  onDelete,
}: DeleteMessageDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Apagar mensagem?</AlertDialogTitle>
          <AlertDialogDescription>
            Escolha como deseja apagar esta mensagem.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => {
              onDelete('self');
              onOpenChange(false);
            }}
          >
            Apagar para mim
          </Button>

          {isAuthor && (
            <Button
              variant="destructive"
              className="w-full justify-start"
              onClick={() => {
                onDelete('all');
                onOpenChange(false);
              }}
            >
              Apagar para todos
            </Button>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

### 6. UI para Mensagem Editada/Deletada

```typescript
// No MessageBubble:

// Mensagem deletada
if (message.isDeleted || message.deletedAt) {
  return (
    <div className="text-sm text-muted-foreground italic px-3 py-2">
      Mensagem apagada
    </div>
  );
}

// Indicador de editada (no footer)
{message.editedAt && (
  <span className="text-[10px] text-muted-foreground ml-1">
    (editada)
  </span>
)}
```

### 7. WebSocket Handlers

```typescript
// apps/web/src/hooks/useChat.ts

case 'message:edited': {
  const { messageId, ciphertext, editedAt } = data;
  // Atualizar mensagem no state
  // Descriptografar novo ciphertext
  break;
}

case 'message:deleted': {
  const { messageId, deleteType } = data;
  // Marcar mensagem como deletada no state
  break;
}
```

## Arquivos a Criar/Modificar

### Backend
- `apps/api/src/chat/routes/chat.messages.ts` - Endpoints PUT/DELETE
- `packages/db/prisma/schema.prisma` - Campos editedAt, deletedAt

### Frontend
- `apps/web/src/components/chat/DeleteMessageDialog.tsx` - Dialog
- `apps/web/src/components/chat/EditMessageDialog.tsx` - Dialog de edicao
- `apps/web/src/components/chat/MessageBubble.tsx` - UI e menu
- `apps/web/src/hooks/useChat.ts` - Handlers WS

### Shared
- `packages/shared-types/src/chat.ts` - Tipos

## Testes

- [ ] Editar mensagem de texto propria
- [ ] Nao pode editar apos 15 minutos
- [ ] Nao pode editar mensagem de outro
- [ ] Indicador "editada" aparece
- [ ] Apagar para mim funciona
- [ ] Apagar para todos funciona
- [ ] Mensagem apagada mostra placeholder
- [ ] Realtime: outros usuarios veem edicao/delete
