# Feature: Status Online no Perfil

## Objetivo

Mostrar se o usuario esta online, offline, ou visto por ultimo ha X tempo, similar ao WhatsApp/Instagram.

## Requisitos Funcionais

### Comportamento
- Indicador visual ao lado do avatar:
  - Verde: Online (conectado ao WebSocket)
  - Cinza: Offline
- Texto abaixo do nome:
  - "Online" se conectado
  - "Visto por ultimo ha X minutos/horas" se offline recente
  - Nada se offline ha muito tempo (>24h)

### Privacidade
- Usuario pode configurar para ocultar status (futuro)
- Respeitar configuracao do usuario visitado

## Implementacao

### 1. Backend: Rastrear Presenca

O BazChat ja tem WebSocket. Adicionar tracking de presenca:

```typescript
// apps/api/src/chat/ws/handlers.ts

// Ao conectar:
async function handleConnection(ws: WebSocket, profileId: string) {
  // Atualizar lastSeen
  await prisma.profile.update({
    where: { id: profileId },
    data: { lastSeenAt: new Date() },
  });

  // Adicionar ao set de usuarios online (Redis ou memoria)
  onlineUsers.add(profileId);

  // Broadcast presenca para contatos
  broadcastPresence(profileId, 'online');
}

// Ao desconectar:
async function handleDisconnect(profileId: string) {
  await prisma.profile.update({
    where: { id: profileId },
    data: { lastSeenAt: new Date() },
  });

  onlineUsers.delete(profileId);
  broadcastPresence(profileId, 'offline');
}
```

### 2. Backend: Endpoint de Presenca

```typescript
// apps/api/src/routes/profiles.ts

// GET /profiles/:handle/presence
router.get('/:handle/presence', async (req, res) => {
  const profile = await prisma.profile.findUnique({
    where: { handle: req.params.handle },
    select: { id: true, lastSeenAt: true },
  });

  if (!profile) {
    return res.status(404).json({ error: 'Profile not found' });
  }

  const isOnline = onlineUsers.has(profile.id);

  return res.json({
    isOnline,
    lastSeenAt: profile.lastSeenAt,
  });
});
```

### 3. Schema Prisma

```prisma
// apps/api/prisma/schema.prisma

model Profile {
  // ... campos existentes ...
  lastSeenAt DateTime? @map("last_seen_at")
}
```

### 4. Componente OnlineIndicator

```typescript
// apps/web/src/components/profile/OnlineIndicator.tsx

interface OnlineIndicatorProps {
  isOnline: boolean;
  lastSeenAt?: string | null;
  size?: 'sm' | 'md' | 'lg';
}

export function OnlineIndicator({ isOnline, lastSeenAt, size = 'md' }: OnlineIndicatorProps) {
  const sizeClasses = {
    sm: 'h-2 w-2',
    md: 'h-3 w-3',
    lg: 'h-4 w-4',
  };

  return (
    <div
      className={cn(
        'rounded-full border-2 border-background',
        sizeClasses[size],
        isOnline ? 'bg-green-500' : 'bg-gray-400'
      )}
      title={isOnline ? 'Online' : 'Offline'}
    />
  );
}
```

### 5. Componente LastSeenText

```typescript
// apps/web/src/components/profile/LastSeenText.tsx

import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface LastSeenTextProps {
  isOnline: boolean;
  lastSeenAt?: string | null;
}

export function LastSeenText({ isOnline, lastSeenAt }: LastSeenTextProps) {
  if (isOnline) {
    return <span className="text-green-600 text-sm">Online</span>;
  }

  if (!lastSeenAt) return null;

  const lastSeen = new Date(lastSeenAt);
  const hoursAgo = (Date.now() - lastSeen.getTime()) / (1000 * 60 * 60);

  // Nao mostrar se offline ha mais de 24h
  if (hoursAgo > 24) return null;

  const timeAgo = formatDistanceToNow(lastSeen, {
    addSuffix: true,
    locale: ptBR,
  });

  return (
    <span className="text-muted-foreground text-sm">
      Visto por ultimo {timeAgo}
    </span>
  );
}
```

### 6. Integrar em ProfilePublicPage

```typescript
// apps/web/src/pages/ProfilePublicPage.tsx

const [presence, setPresence] = useState<{ isOnline: boolean; lastSeenAt?: string } | null>(null);

useEffect(() => {
  if (!data?.profile?.handle) return;

  // Buscar presenca
  apiHelpers.getPresence(data.profile.handle)
    .then(setPresence)
    .catch(console.error);
}, [data?.profile?.handle]);

// No JSX, ao lado do avatar:
<div className="relative">
  {/* Avatar */}
  <img ... />

  {/* Online indicator - posicionado no canto inferior direito do avatar */}
  {presence && (
    <div className="absolute bottom-0 right-0">
      <OnlineIndicator isOnline={presence.isOnline} size="md" />
    </div>
  )}
</div>

// Abaixo do handle:
{presence && (
  <LastSeenText isOnline={presence.isOnline} lastSeenAt={presence.lastSeenAt} />
)}
```

## Arquivos a Criar/Modificar

### Criar
- `apps/web/src/components/profile/OnlineIndicator.tsx`
- `apps/web/src/components/profile/LastSeenText.tsx`

### Modificar
- `apps/api/prisma/schema.prisma` - Adicionar lastSeenAt
- `apps/api/src/chat/ws/handlers.ts` - Tracking de presenca
- `apps/api/src/routes/profiles.ts` - Endpoint de presenca
- `apps/web/src/pages/ProfilePublicPage.tsx` - Exibir status
- `apps/web/src/lib/api.ts` - Helper getPresence

## Consideracoes

### Performance
- Nao fazer polling frequente
- Usar WebSocket para updates em tempo real (futuro)
- Cache de presenca por 30 segundos

### Privacidade (Futuro)
- Configuracao: "Mostrar meu status online"
- Opcoes: Todos, Seguidores, Ninguem

## Testes

- [ ] Indicador verde quando online
- [ ] Indicador cinza quando offline
- [ ] "Visto por ultimo ha X" aparece corretamente
- [ ] Nao mostra visto se > 24h
- [ ] Posicionamento correto sobre avatar
- [ ] Dark mode funciona
