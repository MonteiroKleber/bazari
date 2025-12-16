# Prompt: Implementar Block User

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

Implementar funcionalidade de bloquear usuarios no BazChat.

## Especificacao

Leia a especificacao completa em: `knowledge/20-bazchat/fase-04/10-BLOCK-USER.md`

## Ordem de Implementacao

### Etapa 1: Backend - Database

Modificar `packages/db/prisma/schema.prisma`:

```prisma
model BlockedUser {
  id          String   @id @default(cuid())
  blockerId   String
  blockedId   String
  createdAt   DateTime @default(now())

  blocker     Profile  @relation("BlocksGiven", fields: [blockerId], references: [id], onDelete: Cascade)
  blocked     Profile  @relation("BlocksReceived", fields: [blockedId], references: [id], onDelete: Cascade)

  @@unique([blockerId, blockedId])
  @@index([blockerId])
  @@index([blockedId])
}

model Profile {
  // ... campos existentes
  blocksGiven     BlockedUser[] @relation("BlocksGiven")
  blocksReceived  BlockedUser[] @relation("BlocksReceived")
}
```

Criar migration:
```bash
cd packages/db
npx prisma migrate dev --name add_blocked_users
```

### Etapa 2: Backend - Endpoints

Criar `apps/api/src/chat/routes/chat.block.ts`:

```typescript
// POST /api/chat/block/:profileId
router.post('/block/:profileId', async (req, res) => {
  const { profileId } = req.params;
  const blockerId = req.user!.currentProfileId;

  // Nao pode bloquear a si mesmo
  if (profileId === blockerId) {
    return res.status(400).json({ error: 'Cannot block yourself' });
  }

  await prisma.blockedUser.create({
    data: { blockerId, blockedId: profileId }
  });

  res.json({ success: true });
});

// DELETE /api/chat/block/:profileId
router.delete('/block/:profileId', async (req, res) => {
  const { profileId } = req.params;
  const blockerId = req.user!.currentProfileId;

  await prisma.blockedUser.delete({
    where: { blockerId_blockedId: { blockerId, blockedId: profileId } }
  });

  res.json({ success: true });
});

// GET /api/chat/blocked
router.get('/blocked', async (req, res) => {
  const blockerId = req.user!.currentProfileId;

  const blocked = await prisma.blockedUser.findMany({
    where: { blockerId },
    include: {
      blocked: { select: { id: true, displayName: true, handle: true, avatarUrl: true } }
    }
  });

  res.json(blocked.map(b => b.blocked));
});
```

### Etapa 3: Backend - Filtrar Mensagens

Modificar `apps/api/src/chat/services/chat.ts`:

```typescript
// Ao buscar mensagens, filtrar de usuarios bloqueados
const blockedUsers = await prisma.blockedUser.findMany({
  where: {
    OR: [
      { blockerId: currentProfileId },
      { blockedId: currentProfileId }
    ]
  }
});

const blockedIds = blockedUsers.map(b =>
  b.blockerId === currentProfileId ? b.blockedId : b.blockerId
);

// Filtrar threads de DM com usuarios bloqueados
const threads = await prisma.chatThread.findMany({
  where: {
    NOT: {
      AND: [
        { kind: 'dm' },
        { participants: { some: { profileId: { in: blockedIds } } } }
      ]
    }
  }
});
```

### Etapa 4: Backend - Bloquear Envio

Modificar WebSocket handler:

```typescript
// Antes de enviar mensagem
const isBlocked = await prisma.blockedUser.findFirst({
  where: {
    OR: [
      { blockerId: senderId, blockedId: recipientId },
      { blockerId: recipientId, blockedId: senderId }
    ]
  }
});

if (isBlocked) {
  socket.emit('chat:error', { message: 'Cannot send message to this user' });
  return;
}
```

### Etapa 5: Frontend - UI de Bloqueio

Adicionar opcao no perfil/conversa:

```typescript
// Em ThreadItem ou ProfilePage
<DropdownMenuItem onClick={() => blockUser(profileId)} className="text-destructive">
  <Ban className="h-4 w-4 mr-2" />
  Bloquear usuario
</DropdownMenuItem>
```

### Etapa 6: Frontend - Pagina de Bloqueados

Criar `apps/web/src/pages/settings/BlockedUsersPage.tsx`:

```typescript
export function BlockedUsersPage() {
  const { blockedUsers, unblockUser } = useBlockedUsers();

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Usuarios Bloqueados</h1>

      {blockedUsers.length === 0 ? (
        <p className="text-muted-foreground">Nenhum usuario bloqueado</p>
      ) : (
        <ul className="space-y-2">
          {blockedUsers.map(user => (
            <li key={user.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                <Avatar src={user.avatarUrl} />
                <div>
                  <p className="font-medium">{user.displayName}</p>
                  <p className="text-sm text-muted-foreground">@{user.handle}</p>
                </div>
              </div>
              <Button variant="outline" onClick={() => unblockUser(user.id)}>
                Desbloquear
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

### Etapa 7: Frontend - Hook useBlockedUsers

Criar `apps/web/src/hooks/useBlockedUsers.ts`:

```typescript
export function useBlockedUsers() {
  const [blockedUsers, setBlockedUsers] = useState<Profile[]>([]);

  const fetchBlockedUsers = async () => {
    const res = await api.get('/chat/blocked');
    setBlockedUsers(res.data);
  };

  const blockUser = async (profileId: string) => {
    await api.post(`/chat/block/${profileId}`);
    fetchBlockedUsers();
  };

  const unblockUser = async (profileId: string) => {
    await api.delete(`/chat/block/${profileId}`);
    setBlockedUsers(prev => prev.filter(u => u.id !== profileId));
  };

  const isBlocked = (profileId: string) =>
    blockedUsers.some(u => u.id === profileId);

  useEffect(() => { fetchBlockedUsers(); }, []);

  return { blockedUsers, blockUser, unblockUser, isBlocked };
}
```

## Arquivos a Criar/Modificar

### Backend
- [ ] `packages/db/prisma/schema.prisma`
- [ ] `apps/api/src/chat/routes/chat.block.ts` (novo)
- [ ] `apps/api/src/chat/services/chat.ts`
- [ ] `apps/api/src/chat/ws/handlers.ts`

### Frontend
- [ ] `apps/web/src/hooks/useBlockedUsers.ts` (novo)
- [ ] `apps/web/src/pages/settings/BlockedUsersPage.tsx` (novo)
- [ ] `apps/web/src/components/chat/ThreadItem.tsx`

## Cenarios de Teste

1. [ ] Bloquear usuario funciona
2. [ ] Desbloquear usuario funciona
3. [ ] Conversa DM desaparece ao bloquear
4. [ ] Nao pode enviar mensagem para bloqueado
5. [ ] Bloqueado nao pode enviar mensagem
6. [ ] Lista de bloqueados atualiza
7. [ ] Mensagens de bloqueados em grupos sao ocultadas

## Commit

Apos implementar e testar:
```bash
git add .
git commit -m "feat(chat): implement user blocking

- Add BlockedUser model with bidirectional blocking
- Create block/unblock API endpoints
- Filter DM threads with blocked users
- Prevent message sending to/from blocked users
- Add blocked users management page"
```
