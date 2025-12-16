# Feature: Block User

## Objetivo

Permitir que usuarios bloqueiem outros usuarios, impedindo o recebimento de mensagens.

## Requisitos Funcionais

### Comportamento
- Usuario pode bloquear outro usuario
- Usuario bloqueado:
  - NAO pode enviar mensagens para quem bloqueou
  - NAO aparece em buscas de novos contatos
  - Mensagens existentes permanecem mas ficam ocultas
- Usuario que bloqueou:
  - Nao recebe mensagens do bloqueado
  - Pode desbloquear a qualquer momento
- Bloqueio e bidirecional para comunicacao (A bloqueia B = nem A nem B podem se comunicar)

### UI
- Opcao "Bloquear" no perfil do usuario
- Opcao "Bloquear" no menu de conversa
- Lista de usuarios bloqueados nas configuracoes
- Confirmacao antes de bloquear

## Implementacao

### 1. Backend - Schema

```prisma
// packages/db/prisma/schema.prisma

model BlockedUser {
  id            String   @id @default(uuid())
  blockerId     String   // Quem bloqueou
  blockedId     String   // Quem foi bloqueado
  createdAt     DateTime @default(now())

  blocker       Profile  @relation("Blocker", fields: [blockerId], references: [id])
  blocked       Profile  @relation("Blocked", fields: [blockedId], references: [id])

  @@unique([blockerId, blockedId])
  @@index([blockerId])
  @@index([blockedId])
}

model Profile {
  // ... campos existentes ...
  blocking      BlockedUser[] @relation("Blocker")
  blockedBy     BlockedUser[] @relation("Blocked")
}
```

### 2. Backend - Endpoints

```typescript
// apps/api/src/routes/blocked-users.ts

import { FastifyInstance } from 'fastify';
import { authOnRequest } from '../lib/auth/middleware';
import { prisma } from '../lib/prisma';

export default async function blockedUsersRoutes(app: FastifyInstance) {

  // Listar usuarios bloqueados
  app.get('/api/blocked-users', { preHandler: authOnRequest }, async (req) => {
    const profileId = req.authUser.profileId;

    const blocked = await prisma.blockedUser.findMany({
      where: { blockerId: profileId },
      include: {
        blocked: {
          select: {
            id: true,
            displayName: true,
            handle: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      blockedUsers: blocked.map((b) => ({
        id: b.blocked.id,
        displayName: b.blocked.displayName,
        handle: b.blocked.handle,
        avatarUrl: b.blocked.avatarUrl,
        blockedAt: b.createdAt,
      })),
    };
  });

  // Bloquear usuario
  app.post('/api/blocked-users/:profileId', { preHandler: authOnRequest }, async (req, reply) => {
    const { profileId: blockedId } = req.params as { profileId: string };
    const blockerId = req.authUser.profileId;

    if (blockerId === blockedId) {
      return reply.code(400).send({ error: 'Cannot block yourself' });
    }

    // Verificar se ja bloqueado
    const existing = await prisma.blockedUser.findUnique({
      where: {
        blockerId_blockedId: { blockerId, blockedId },
      },
    });

    if (existing) {
      return reply.code(400).send({ error: 'User already blocked' });
    }

    await prisma.blockedUser.create({
      data: { blockerId, blockedId },
    });

    return { success: true };
  });

  // Desbloquear usuario
  app.delete('/api/blocked-users/:profileId', { preHandler: authOnRequest }, async (req) => {
    const { profileId: blockedId } = req.params as { profileId: string };
    const blockerId = req.authUser.profileId;

    await prisma.blockedUser.deleteMany({
      where: { blockerId, blockedId },
    });

    return { success: true };
  });

  // Verificar se esta bloqueado
  app.get('/api/blocked-users/:profileId/status', { preHandler: authOnRequest }, async (req) => {
    const { profileId: otherProfileId } = req.params as { profileId: string };
    const myProfileId = req.authUser.profileId;

    const [iBlocked, blockedMe] = await Promise.all([
      prisma.blockedUser.findUnique({
        where: {
          blockerId_blockedId: { blockerId: myProfileId, blockedId: otherProfileId },
        },
      }),
      prisma.blockedUser.findUnique({
        where: {
          blockerId_blockedId: { blockerId: otherProfileId, blockedId: myProfileId },
        },
      }),
    ]);

    return {
      iBlocked: !!iBlocked,
      blockedMe: !!blockedMe,
      isBlocked: !!iBlocked || !!blockedMe,
    };
  });
}
```

### 3. Backend - Verificar Bloqueio ao Enviar Mensagem

```typescript
// apps/api/src/chat/ws/handlers.ts

// No handler de 'send':
case 'send': {
  const { threadId, type, ciphertext, ... } = data;

  // Obter participantes da thread
  const thread = await prisma.chatThread.findUnique({
    where: { id: threadId },
    select: { participants: true },
  });

  // Verificar bloqueio (para DMs)
  if (thread?.participants.length === 2) {
    const otherParticipant = thread.participants.find(p => p !== profileId);

    const blocked = await prisma.blockedUser.findFirst({
      where: {
        OR: [
          { blockerId: profileId, blockedId: otherParticipant },
          { blockerId: otherParticipant, blockedId: profileId },
        ],
      },
    });

    if (blocked) {
      return ws.send(JSON.stringify({
        op: 'error',
        data: { message: 'Cannot send message: user blocked' },
      }));
    }
  }

  // ... resto do handler
}
```

### 4. Frontend - Hook useBlockedUsers

```typescript
// apps/web/src/hooks/useBlockedUsers.ts

import { useState, useCallback } from 'react';
import { apiHelpers } from '@/lib/api';

interface BlockedUser {
  id: string;
  displayName: string;
  handle: string;
  avatarUrl?: string;
  blockedAt: string;
}

export function useBlockedUsers() {
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(false);

  const loadBlockedUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiHelpers.getBlockedUsers();
      setBlockedUsers(res.blockedUsers);
    } finally {
      setLoading(false);
    }
  }, []);

  const blockUser = useCallback(async (profileId: string) => {
    await apiHelpers.blockUser(profileId);
    await loadBlockedUsers();
  }, [loadBlockedUsers]);

  const unblockUser = useCallback(async (profileId: string) => {
    await apiHelpers.unblockUser(profileId);
    setBlockedUsers((prev) => prev.filter((u) => u.id !== profileId));
  }, []);

  const isBlocked = useCallback((profileId: string) => {
    return blockedUsers.some((u) => u.id === profileId);
  }, [blockedUsers]);

  return {
    blockedUsers,
    loading,
    loadBlockedUsers,
    blockUser,
    unblockUser,
    isBlocked,
  };
}
```

### 5. Frontend - Dialog de Confirmacao

```typescript
// apps/web/src/components/chat/BlockUserDialog.tsx

interface BlockUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName: string;
  onConfirm: () => void;
}

export function BlockUserDialog({
  open,
  onOpenChange,
  userName,
  onConfirm,
}: BlockUserDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Bloquear {userName}?</AlertDialogTitle>
          <AlertDialogDescription>
            <p>Ao bloquear este usuario:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Voce nao recebera mensagens dele</li>
              <li>Ele nao podera enviar mensagens para voce</li>
              <li>Voce pode desbloquear a qualquer momento</li>
            </ul>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive hover:bg-destructive/90"
          >
            Bloquear
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

### 6. UI no Menu de Conversa

```typescript
// No ChatThreadPage.tsx ou ThreadItem.tsx

<DropdownMenuItem
  onClick={() => setShowBlockDialog(true)}
  className="text-destructive"
>
  <Ban className="mr-2 h-4 w-4" />
  Bloquear usuario
</DropdownMenuItem>
```

### 7. Tela de Usuarios Bloqueados

```typescript
// apps/web/src/pages/settings/BlockedUsersPage.tsx

export function BlockedUsersPage() {
  const { blockedUsers, loading, loadBlockedUsers, unblockUser } =
    useBlockedUsers();

  useEffect(() => {
    loadBlockedUsers();
  }, [loadBlockedUsers]);

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Usuarios Bloqueados</h1>

      {loading && <Skeleton className="h-20" />}

      {!loading && blockedUsers.length === 0 && (
        <p className="text-muted-foreground">
          Voce nao bloqueou nenhum usuario.
        </p>
      )}

      <div className="space-y-2">
        {blockedUsers.map((user) => (
          <div
            key={user.id}
            className="flex items-center justify-between p-3 border rounded-lg"
          >
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={user.avatarUrl} />
                <AvatarFallback>{user.displayName?.[0]}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{user.displayName}</p>
                <p className="text-sm text-muted-foreground">@{user.handle}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => unblockUser(user.id)}
            >
              Desbloquear
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Arquivos a Criar/Modificar

### Backend
- `apps/api/src/routes/blocked-users.ts` - Endpoints
- `apps/api/src/chat/ws/handlers.ts` - Verificar bloqueio
- `packages/db/prisma/schema.prisma` - Model BlockedUser

### Frontend
- `apps/web/src/hooks/useBlockedUsers.ts` - Hook
- `apps/web/src/components/chat/BlockUserDialog.tsx` - Dialog
- `apps/web/src/pages/settings/BlockedUsersPage.tsx` - Tela de lista
- `apps/web/src/lib/api.ts` - Helpers de API

## Testes

- [ ] Bloquear usuario via menu
- [ ] Usuario bloqueado nao pode enviar mensagem
- [ ] Desbloquear usuario
- [ ] Lista de bloqueados aparece corretamente
- [ ] Bloqueio e bidirecional
- [ ] Mensagem de erro ao tentar enviar para bloqueado
