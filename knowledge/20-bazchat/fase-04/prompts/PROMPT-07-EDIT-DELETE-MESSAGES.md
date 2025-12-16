# Prompt: Implementar Edit/Delete Messages

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

Implementar funcionalidade de editar e apagar mensagens proprias no BazChat.

## Especificacao

Leia a especificacao completa em: `knowledge/20-bazchat/fase-04/07-EDIT-DELETE-MESSAGES.md`

## Ordem de Implementacao

### Etapa 1: Backend - Database

Modificar `packages/db/prisma/schema.prisma`:

```prisma
model ChatMessage {
  // ... campos existentes
  editedAt    DateTime?
  deletedAt   DateTime?
}
```

Criar migration:
```bash
cd packages/db
npx prisma migrate dev --name add_message_edit_delete
```

### Etapa 2: Backend - Endpoints

Criar endpoints em `apps/api/src/chat/routes/chat.messages.ts`:

```typescript
// PATCH /api/chat/messages/:messageId
router.patch('/:messageId', async (req, res) => {
  const { messageId } = req.params;
  const { ciphertext, nonce } = req.body;
  const profileId = req.user!.currentProfileId;

  // Verificar se mensagem pertence ao usuario
  // Verificar tempo limite (15 minutos)
  // Atualizar e marcar editedAt
});

// DELETE /api/chat/messages/:messageId
router.delete('/:messageId', async (req, res) => {
  const { messageId } = req.params;
  const profileId = req.user!.currentProfileId;

  // Verificar se mensagem pertence ao usuario
  // Soft delete (marcar deletedAt)
});
```

### Etapa 3: Backend - WebSocket Events

Adicionar em `apps/api/src/chat/ws/handlers.ts`:

```typescript
// chat:message:edit
socket.on('chat:message:edit', async (data) => {
  // Validar e atualizar
  // Broadcast para thread: chat:message:edited
});

// chat:message:delete
socket.on('chat:message:delete', async (data) => {
  // Validar e soft delete
  // Broadcast para thread: chat:message:deleted
});
```

### Etapa 4: Frontend - Context Menu

Modificar `apps/web/src/components/chat/MessageBubble.tsx`:

```typescript
<ContextMenuContent>
  {/* ... opcoes existentes */}

  {isMe && canEdit(message) && (
    <ContextMenuItem onClick={() => onEdit(message)}>
      <Pencil className="h-4 w-4 mr-2" />
      Editar
    </ContextMenuItem>
  )}

  {isMe && (
    <ContextMenuItem onClick={() => onDelete(message)} className="text-destructive">
      <Trash2 className="h-4 w-4 mr-2" />
      Apagar
    </ContextMenuItem>
  )}
</ContextMenuContent>
```

### Etapa 5: Frontend - Edit Mode

Modificar `apps/web/src/components/chat/ChatComposer.tsx`:

```typescript
// Estado de edicao
const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);

// Quando editando, mostrar conteudo atual
useEffect(() => {
  if (editingMessage) {
    setInputText(editingMessage.plaintext);
  }
}, [editingMessage]);

// Ao enviar, chamar update ao inves de create
const handleSubmit = () => {
  if (editingMessage) {
    updateMessage(editingMessage.id, inputText);
    setEditingMessage(null);
  } else {
    sendMessage(inputText);
  }
};
```

### Etapa 6: Frontend - Delete Dialog

Criar `apps/web/src/components/chat/DeleteMessageDialog.tsx`:

```typescript
<AlertDialog>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Apagar mensagem?</AlertDialogTitle>
      <AlertDialogDescription>
        Esta acao nao pode ser desfeita. A mensagem sera removida para todos.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancelar</AlertDialogCancel>
      <AlertDialogAction onClick={onConfirm} className="bg-destructive">
        Apagar
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### Etapa 7: Frontend - Indicador Visual

Mostrar "(editada)" e "Mensagem apagada":

```typescript
// Em MessageBubble
{message.editedAt && !message.deletedAt && (
  <span className="text-xs text-muted-foreground ml-1">(editada)</span>
)}

{message.deletedAt && (
  <div className="italic text-muted-foreground">
    Mensagem apagada
  </div>
)}
```

## Arquivos a Criar/Modificar

### Backend
- [ ] `packages/db/prisma/schema.prisma`
- [ ] `apps/api/src/chat/routes/chat.messages.ts`
- [ ] `apps/api/src/chat/ws/handlers.ts`

### Frontend
- [ ] `apps/web/src/components/chat/DeleteMessageDialog.tsx` (novo)
- [ ] `apps/web/src/components/chat/MessageBubble.tsx`
- [ ] `apps/web/src/components/chat/ChatComposer.tsx`
- [ ] `apps/web/src/hooks/useChat.ts`

## Cenarios de Teste

1. [ ] Editar mensagem propria
2. [ ] Nao pode editar apos 15 minutos
3. [ ] "(editada)" aparece apos edicao
4. [ ] Apagar mensagem propria
5. [ ] "Mensagem apagada" para outros usuarios
6. [ ] Nao pode editar/apagar mensagem de outros
7. [ ] Edicao/exclusao em tempo real via WebSocket

## Commit

Apos implementar e testar:
```bash
git add .
git commit -m "feat(chat): implement edit and delete messages

- Add editedAt and deletedAt fields to ChatMessage
- Create PATCH and DELETE endpoints for messages
- Add WebSocket events for real-time updates
- Show edit mode in composer and delete confirmation dialog
- Display '(editada)' and 'Mensagem apagada' indicators"
```
