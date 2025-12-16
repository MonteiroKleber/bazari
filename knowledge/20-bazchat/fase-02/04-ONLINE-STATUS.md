# Feature: Online Status

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

Mostrar se usuarios estao online, offline ou "visto por ultimo" (last seen). Similar ao WhatsApp/Telegram.

## Comportamento Esperado

### Status Possiveis

1. **Online** (verde): Usuario conectado ao WebSocket agora
2. **Offline** (cinza): Usuario desconectado
3. **Last Seen** (texto): "Visto por ultimo as 14:32" ou "Visto ontem"

### Onde Exibir

1. **ThreadItem (inbox)**: Ponto verde ao lado do avatar
2. **ChatThreadPage (header)**: "Online" ou "Visto por ultimo..."
3. **Perfil do usuario**: Status atual

### Privacidade

- Usuario pode optar por esconder seu status
- Se escondido, outros veem apenas "Offline"
- Configuracao em Settings do perfil

## Modelo de Dados

### Prisma Schema

```prisma
model Profile {
  // ... campos existentes

  lastSeenAt      DateTime?       // Ultima vez online
  showOnlineStatus Boolean @default(true)  // Privacidade
}
```

### Redis (ou memoria)

Para status online em tempo real, usar estrutura em memoria:

```typescript
// Em memoria no servidor (ou Redis para multi-instancia)
const onlineUsers = new Map<string, {
  socketId: string;
  connectedAt: Date;
  lastActivity: Date;
}>();
```

### Shared Types

```typescript
// packages/shared-types/src/chat.ts

export type OnlineStatus = 'online' | 'offline' | 'away';

export interface UserPresence {
  profileId: string;
  status: OnlineStatus;
  lastSeenAt?: string;  // ISO date
}

export interface PresenceUpdate {
  profileId: string;
  status: OnlineStatus;
  lastSeenAt?: string;
}
```

## WebSocket Events

### Usuario Conecta

```typescript
// Servidor detecta conexao WS
// Atualiza onlineUsers
// Broadcast para contatos:
{
  type: 'presence:update',
  payload: {
    profileId: string;
    status: 'online';
  }
}
```

### Usuario Desconecta

```typescript
// Servidor detecta desconexao WS
// Remove de onlineUsers
// Salva lastSeenAt no banco
// Broadcast para contatos:
{
  type: 'presence:update',
  payload: {
    profileId: string;
    status: 'offline';
    lastSeenAt: string;
  }
}
```

### Solicitar Status de Usuario

```typescript
// Cliente -> Servidor (ao abrir thread)
{
  type: 'presence:subscribe',
  payload: {
    profileIds: string[];
  }
}

// Servidor -> Cliente
{
  type: 'presence:status',
  payload: {
    presences: UserPresence[];
  }
}
```

## API REST

### Obter Status de Usuarios

```
POST /api/chat/presence
```

```typescript
// Request
{
  profileIds: string[];
}

// Response
{
  presences: UserPresence[];
}
```

### Atualizar Configuracao de Privacidade

```
PATCH /api/profile/settings
```

```typescript
// Request
{
  showOnlineStatus: boolean;
}
```

## Backend Implementation

### WebSocket Handler

```typescript
// apps/api/src/ws/presence-handler.ts

const onlineUsers = new Map<string, UserSocket>();

export function handleConnection(socket: WebSocket, profileId: string) {
  // Registrar como online
  onlineUsers.set(profileId, {
    socket,
    connectedAt: new Date(),
    lastActivity: new Date(),
  });

  // Notificar contatos
  const contacts = await getProfileContacts(profileId);
  broadcastToUsers(contacts, {
    type: 'presence:update',
    payload: { profileId, status: 'online' }
  });
}

export function handleDisconnection(profileId: string) {
  onlineUsers.delete(profileId);

  // Salvar lastSeenAt
  await prisma.profile.update({
    where: { id: profileId },
    data: { lastSeenAt: new Date() }
  });

  // Notificar contatos
  const contacts = await getProfileContacts(profileId);
  broadcastToUsers(contacts, {
    type: 'presence:update',
    payload: {
      profileId,
      status: 'offline',
      lastSeenAt: new Date().toISOString()
    }
  });
}

export function isUserOnline(profileId: string): boolean {
  return onlineUsers.has(profileId);
}

export function getUserPresence(profileId: string): UserPresence {
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
```

### Contatos do Usuario

```typescript
// Usuarios com quem teve conversas
async function getProfileContacts(profileId: string): Promise<string[]> {
  const threads = await prisma.chatThread.findMany({
    where: {
      participants: {
        some: { profileId }
      }
    },
    include: {
      participants: {
        select: { profileId: true }
      }
    }
  });

  const contactIds = new Set<string>();
  threads.forEach(thread => {
    thread.participants.forEach(p => {
      if (p.profileId !== profileId) {
        contactIds.add(p.profileId);
      }
    });
  });

  return Array.from(contactIds);
}
```

## Componentes Frontend

### 1. OnlineIndicator (novo)

Indicador visual de status.

```typescript
// apps/web/src/components/chat/OnlineIndicator.tsx

interface OnlineIndicatorProps {
  status: OnlineStatus;
  size?: 'sm' | 'md' | 'lg';
}
```

**UI:**
- Circulo colorido (verde=online, cinza=offline)
- Posicao: canto inferior direito do avatar
- Tamanhos: sm=8px, md=10px, lg=12px

### 2. LastSeenText (novo)

Texto formatado de "visto por ultimo".

```typescript
// apps/web/src/components/chat/LastSeenText.tsx

interface LastSeenTextProps {
  lastSeenAt?: string;
  status: OnlineStatus;
}
```

**UI:**
- "Online" se status=online (verde)
- "Visto por ultimo as 14:32" se hoje
- "Visto ontem as 14:32"
- "Visto em 10/12"
- Texto em muted-foreground, tamanho pequeno

### 3. ThreadItem (modificar)

Adicionar OnlineIndicator no avatar.

```typescript
// No Avatar do ThreadItem (DMs apenas)
{thread.kind === 'dm' && (
  <OnlineIndicator
    status={otherParticipant?.onlineStatus || 'offline'}
    size="sm"
  />
)}
```

### 4. ChatThreadPage (modificar)

Adicionar status no header.

```typescript
// No header, abaixo do nome
{currentThread?.kind === 'dm' && (
  <LastSeenText
    status={otherParticipant?.onlineStatus}
    lastSeenAt={otherParticipant?.lastSeenAt}
  />
)}

// Para grupos: "X membros, Y online"
{currentThread?.kind === 'group' && (
  <span className="text-xs text-muted-foreground">
    {memberCount} membros, {onlineCount} online
  </span>
)}
```

## Estado Zustand

```typescript
interface ChatState {
  // ... campos existentes

  // Presence
  presences: Map<string, UserPresence>;
  subscribeToPresence: (profileIds: string[]) => void;
  updatePresence: (update: PresenceUpdate) => void;
}
```

### WS Listener

```typescript
// No useChat ou hook separado
useEffect(() => {
  const handlePresence = (event: PresenceUpdate) => {
    updatePresence(event);
  };

  wsClient.on('presence:update', handlePresence);
  wsClient.on('presence:status', (data) => {
    data.presences.forEach(updatePresence);
  });

  return () => {
    wsClient.off('presence:update', handlePresence);
  };
}, []);
```

## Fluxo de Implementacao

### Backend

1. Adicionar campos ao Profile (migration)
2. Criar presence-handler.ts
3. Integrar no WS connection/disconnection
4. Endpoint REST para presenca em batch

### Frontend

1. Atualizar tipos em shared-types
2. Criar componente OnlineIndicator
3. Criar componente LastSeenText
4. Modificar ThreadItem para mostrar status
5. Modificar ChatThreadPage para mostrar status
6. Adicionar estado de presence no Zustand
7. Integrar WS listeners

## Formatacao de Last Seen

```typescript
function formatLastSeen(lastSeenAt: string): string {
  const date = new Date(lastSeenAt);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Visto agora';
  if (diffMins < 60) return `Visto ha ${diffMins} min`;
  if (diffHours < 24) {
    return `Visto as ${format(date, 'HH:mm')}`;
  }
  if (diffDays === 1) {
    return `Visto ontem as ${format(date, 'HH:mm')}`;
  }
  if (diffDays < 7) {
    return `Visto ${format(date, 'EEEE', { locale: ptBR })}`;
  }
  return `Visto em ${format(date, 'dd/MM')}`;
}
```

## UI/UX

### Cores

- Online: `bg-green-500`
- Offline: `bg-gray-400`
- Away (futuro): `bg-yellow-500`

### Animacoes

- Status change: fade transition
- Ponto online: pulse sutil (opcional)

### Mobile

- Mesmo comportamento
- Indicador visivel mas nao intrusivo

## Privacidade

### Configuracao do Usuario

```typescript
// Em Settings
<Switch
  checked={showOnlineStatus}
  onCheckedChange={handleToggle}
/>
<Label>Mostrar quando estou online</Label>
<p className="text-sm text-muted-foreground">
  Se desativado, outros usuarios verao apenas "Offline"
</p>
```

### Logica de Privacidade

```typescript
// No backend, ao retornar presence
if (!profile.showOnlineStatus) {
  return { profileId, status: 'offline' };
}
```

## Performance

- Nao fazer polling; usar apenas WebSocket
- Subscribe apenas para usuarios visiveis
- Unsubscribe ao sair da view
- Debounce em updates frequentes

## Validacao

### Cenarios de Teste

1. ✓ Usuario conecta -> status online
2. ✓ Usuario desconecta -> status offline + lastSeen
3. ✓ Ver status em DM
4. ✓ Ver status em lista de threads
5. ✓ Grupo: "X membros, Y online"
6. ✓ Privacidade: esconder status funciona
7. ✓ Last seen formatado corretamente
8. ✓ Realtime: outro usuario ve mudanca
9. ✓ Reconexao mantem comportamento

## Checklist de Implementacao

- [ ] Migration Prisma (lastSeenAt, showOnlineStatus)
- [ ] Backend: presence-handler.ts
- [ ] Backend: integrar em WS connect/disconnect
- [ ] Backend: endpoint REST para presenca
- [ ] Shared-types: UserPresence, OnlineStatus
- [ ] Componente OnlineIndicator
- [ ] Componente LastSeenText
- [ ] ThreadItem: mostrar indicador
- [ ] ChatThreadPage: mostrar status no header
- [ ] Zustand: estado de presences
- [ ] WS listeners para presence
- [ ] Settings: toggle de privacidade
- [ ] Formatacao de lastSeen
- [ ] Testes manuais dos cenarios
