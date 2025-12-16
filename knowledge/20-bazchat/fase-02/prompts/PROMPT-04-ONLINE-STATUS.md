# Prompt: Implementar Online Status

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

Implementar status online/offline e "visto por ultimo" no BazChat.

## Especificacao

Leia a especificacao completa em: `knowledge/bazchat/fase-02/04-ONLINE-STATUS.md`

## Ordem de Implementacao

### Etapa 1: Backend - Database

1. Criar migration Prisma:
```bash
cd packages/db
npx prisma migrate dev --name add_presence_fields
```

Adicionar ao schema:
```prisma
model Profile {
  // ... campos existentes
  lastSeenAt       DateTime?
  showOnlineStatus Boolean   @default(true)
}
```

### Etapa 2: Backend - Presence Handler

Criar `apps/api/src/ws/presence-handler.ts`:

```typescript
// Map de usuarios online (em memoria)
const onlineUsers = new Map<string, {
  socketId: string;
  connectedAt: Date;
}>();

export function handleUserConnect(profileId: string, socketId: string) {
  onlineUsers.set(profileId, {
    socketId,
    connectedAt: new Date()
  });
}

export function handleUserDisconnect(profileId: string) {
  onlineUsers.delete(profileId);

  // Salvar lastSeenAt no banco
  prisma.profile.update({
    where: { id: profileId },
    data: { lastSeenAt: new Date() }
  });
}

export function isUserOnline(profileId: string): boolean {
  return onlineUsers.has(profileId);
}

export async function getUserPresence(profileId: string): Promise<UserPresence> {
  if (onlineUsers.has(profileId)) {
    return { profileId, status: 'online' };
  }

  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: { lastSeenAt: true, showOnlineStatus: true }
  });

  if (!profile?.showOnlineStatus) {
    return { profileId, status: 'offline' };
  }

  return {
    profileId,
    status: 'offline',
    lastSeenAt: profile.lastSeenAt?.toISOString()
  };
}

export async function getContactsOfUser(profileId: string): Promise<string[]> {
  const threads = await prisma.chatThread.findMany({
    where: {
      participants: { some: { profileId } }
    },
    include: {
      participants: { select: { profileId: true } }
    }
  });

  const contacts = new Set<string>();
  threads.forEach(thread => {
    thread.participants.forEach(p => {
      if (p.profileId !== profileId) contacts.add(p.profileId);
    });
  });

  return Array.from(contacts);
}
```

### Etapa 3: Backend - Integrar no WS

Modificar `apps/api/src/ws/chat-handler.ts`:

```typescript
import { handleUserConnect, handleUserDisconnect, getContactsOfUser } from './presence-handler';

// Na conexao
export function onConnection(socket: WebSocket, profileId: string) {
  handleUserConnect(profileId, socket.id);

  // Notificar contatos
  const contacts = await getContactsOfUser(profileId);
  broadcastToUsers(contacts, {
    type: 'presence:update',
    payload: { profileId, status: 'online' }
  });
}

// Na desconexao
export function onDisconnect(profileId: string) {
  handleUserDisconnect(profileId);

  const contacts = await getContactsOfUser(profileId);
  broadcastToUsers(contacts, {
    type: 'presence:update',
    payload: {
      profileId,
      status: 'offline',
      lastSeenAt: new Date().toISOString()
    }
  });
}

// Handler para solicitar presenca
case 'presence:subscribe': {
  const { profileIds } = payload;
  const presences = await Promise.all(
    profileIds.map(id => getUserPresence(id))
  );
  socket.send(JSON.stringify({
    type: 'presence:status',
    payload: { presences }
  }));
  break;
}
```

### Etapa 4: Backend - API REST

Adicionar endpoint para presenca em batch:

```typescript
// POST /api/chat/presence
router.post('/presence', async (req, res) => {
  const { profileIds } = req.body;
  const presences = await Promise.all(
    profileIds.map(id => presenceHandler.getUserPresence(id))
  );
  res.json({ presences });
});
```

### Etapa 5: Shared Types

Atualizar `packages/shared-types/src/chat.ts`:

```typescript
export type OnlineStatus = 'online' | 'offline';

export interface UserPresence {
  profileId: string;
  status: OnlineStatus;
  lastSeenAt?: string;
}

export interface PresenceUpdate {
  profileId: string;
  status: OnlineStatus;
  lastSeenAt?: string;
}
```

### Etapa 6: Frontend - Componentes

1. Criar `apps/web/src/components/chat/OnlineIndicator.tsx`:

```typescript
interface OnlineIndicatorProps {
  status: OnlineStatus;
  size?: 'sm' | 'md' | 'lg';
}

export function OnlineIndicator({ status, size = 'sm' }: OnlineIndicatorProps) {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3'
  };

  return (
    <span
      className={cn(
        'rounded-full border-2 border-background',
        sizeClasses[size],
        status === 'online' ? 'bg-green-500' : 'bg-gray-400'
      )}
    />
  );
}
```

2. Criar `apps/web/src/components/chat/LastSeenText.tsx`:

```typescript
interface LastSeenTextProps {
  status: OnlineStatus;
  lastSeenAt?: string;
}

export function LastSeenText({ status, lastSeenAt }: LastSeenTextProps) {
  if (status === 'online') {
    return <span className="text-xs text-green-600">Online</span>;
  }

  if (!lastSeenAt) {
    return <span className="text-xs text-muted-foreground">Offline</span>;
  }

  return (
    <span className="text-xs text-muted-foreground">
      {formatLastSeen(lastSeenAt)}
    </span>
  );
}

function formatLastSeen(lastSeenAt: string): string {
  const date = new Date(lastSeenAt);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Visto agora';
  if (diffMins < 60) return `Visto ha ${diffMins} min`;

  const timeStr = format(date, 'HH:mm');

  if (isToday(date)) return `Visto as ${timeStr}`;
  if (isYesterday(date)) return `Visto ontem as ${timeStr}`;
  if (diffDays < 7) return `Visto ${format(date, 'EEEE', { locale: ptBR })}`;

  return `Visto em ${format(date, 'dd/MM')}`;
}
```

### Etapa 7: Frontend - Integracao

1. Atualizar `useChat.ts`:

```typescript
interface ChatState {
  // ... existente
  presences: Map<string, UserPresence>;
  subscribeToPresence: (profileIds: string[]) => void;
  updatePresence: (update: PresenceUpdate) => void;
}

// Actions
subscribeToPresence: (profileIds) => {
  wsClient.send({
    type: 'presence:subscribe',
    payload: { profileIds }
  });
},

updatePresence: (update) => {
  set(state => {
    const presences = new Map(state.presences);
    presences.set(update.profileId, update);
    return { presences };
  });
}
```

2. Adicionar WS listeners:

```typescript
// No websocket client
wsClient.on('presence:update', (data) => {
  updatePresence(data);
});

wsClient.on('presence:status', (data) => {
  data.presences.forEach(updatePresence);
});
```

3. Modificar `ThreadItem.tsx`:
   - Adicionar OnlineIndicator ao avatar para DMs

4. Modificar `ChatThreadPage.tsx`:
   - Mostrar LastSeenText no header para DMs
   - Para grupos: "X membros, Y online"

## Arquivos a Modificar

### Backend
- [ ] `packages/db/prisma/schema.prisma`
- [ ] `apps/api/src/ws/presence-handler.ts` (novo)
- [ ] `apps/api/src/ws/chat-handler.ts`
- [ ] `apps/api/src/routes/chat.ts`

### Shared
- [ ] `packages/shared-types/src/chat.ts`

### Frontend
- [ ] `apps/web/src/components/chat/OnlineIndicator.tsx` (novo)
- [ ] `apps/web/src/components/chat/LastSeenText.tsx` (novo)
- [ ] `apps/web/src/components/chat/ThreadItem.tsx`
- [ ] `apps/web/src/pages/chat/ChatThreadPage.tsx`
- [ ] `apps/web/src/hooks/useChat.ts`
- [ ] `apps/web/src/lib/chat/websocket.ts`

## Cenarios de Teste

1. [ ] Usuario conecta -> status online para contatos
2. [ ] Usuario desconecta -> status offline + lastSeen
3. [ ] Ver indicador online no ThreadItem (DM)
4. [ ] Ver "Online" no header da conversa
5. [ ] Ver "Visto as 14:32" corretamente formatado
6. [ ] Grupo mostra "X membros, Y online"
7. [ ] Privacidade: esconder status funciona
8. [ ] Realtime: mudanca de status visivel para outros

## Commit

Apos implementar e testar:
```bash
git add .
git commit -m "feat(chat): implement online status and last seen

- Add lastSeenAt and showOnlineStatus to Profile
- Create presence-handler for tracking online users
- Implement WebSocket presence events
- Create OnlineIndicator and LastSeenText components
- Show presence in ThreadItem and ChatThreadPage header"
```
