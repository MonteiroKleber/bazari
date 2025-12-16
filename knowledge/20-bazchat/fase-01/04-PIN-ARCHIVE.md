# Feature: Pin & Archive Conversations

## Resumo

Permitir que usuarios fixem conversas importantes no topo da lista e arquivem conversas que nao querem ver na lista principal.

## User Stories

1. **Como usuario**, quero fixar ate 3 conversas no topo para acesso rapido
2. **Como usuario**, quero arquivar conversas antigas sem deletar
3. **Como usuario**, quero ver minhas conversas arquivadas quando precisar
4. **Como usuario**, quero desarquivar conversas facilmente

## Funcionalidades

### Pin (Fixar)

- Maximo 3 conversas fixadas
- Aparecem sempre no topo da lista
- Ordem das fixadas: mais recente primeiro
- Badge visual de "fixado"

### Archive (Arquivar)

- Conversas arquivadas saem da lista principal
- Link "Arquivadas (N)" no topo ou fim da lista
- Novas mensagens em conversa arquivada: opcional trazer de volta
- Podem ser desarquivadas a qualquer momento

## Especificacao Tecnica

### 1. Database Schema

#### Arquivo: `packages/db/prisma/schema.prisma`

```prisma
model ChatThread {
  id            String   @id @default(cuid())
  kind          String   // dm, group
  participants  String[] // Profile IDs
  createdAt     DateTime @default(now())
  lastMessageAt Int      @default(0)

  messages      ChatMessage[]

  // Thread preferences per user
  userPreferences ChatThreadPreference[]

  @@index([participants])
}

// Nova tabela para preferencias por usuario por thread
model ChatThreadPreference {
  id        String   @id @default(cuid())
  threadId  String
  profileId String

  isPinned    Boolean   @default(false)
  pinnedAt    DateTime?
  isArchived  Boolean   @default(false)
  archivedAt  DateTime?
  isMuted     Boolean   @default(false) // Bonus: para fase futura

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  thread      ChatThread @relation(fields: [threadId], references: [id])
  profile     Profile    @relation(fields: [profileId], references: [id])

  @@unique([threadId, profileId])
  @@index([profileId, isPinned])
  @@index([profileId, isArchived])
}
```

### 2. API Endpoints

#### Arquivo: `apps/api/src/routes/chat.ts`

```typescript
// PUT /api/chat/threads/:threadId/pin
router.put('/threads/:threadId/pin', authenticate, async (req, res) => {
  const { threadId } = req.params;
  const profileId = req.user.profileId;

  // Verificar limite de 3 pins
  const pinnedCount = await db.chatThreadPreference.count({
    where: { profileId, isPinned: true }
  });

  if (pinnedCount >= 3) {
    return res.status(400).json({
      success: false,
      error: 'Maximo de 3 conversas fixadas atingido'
    });
  }

  // Verificar se usuario e participante
  const thread = await db.chatThread.findFirst({
    where: {
      id: threadId,
      participants: { has: profileId }
    }
  });

  if (!thread) {
    return res.status(404).json({ success: false, error: 'Conversa nao encontrada' });
  }

  // Criar ou atualizar preferencia
  const pref = await db.chatThreadPreference.upsert({
    where: { threadId_profileId: { threadId, profileId } },
    create: {
      threadId,
      profileId,
      isPinned: true,
      pinnedAt: new Date(),
      isArchived: false, // Unarchive se estava arquivada
    },
    update: {
      isPinned: true,
      pinnedAt: new Date(),
      isArchived: false,
    }
  });

  return res.json({ success: true, data: pref });
});

// DELETE /api/chat/threads/:threadId/pin
router.delete('/threads/:threadId/pin', authenticate, async (req, res) => {
  const { threadId } = req.params;
  const profileId = req.user.profileId;

  await db.chatThreadPreference.upsert({
    where: { threadId_profileId: { threadId, profileId } },
    create: { threadId, profileId, isPinned: false },
    update: { isPinned: false, pinnedAt: null }
  });

  return res.json({ success: true });
});

// PUT /api/chat/threads/:threadId/archive
router.put('/threads/:threadId/archive', authenticate, async (req, res) => {
  const { threadId } = req.params;
  const profileId = req.user.profileId;

  await db.chatThreadPreference.upsert({
    where: { threadId_profileId: { threadId, profileId } },
    create: {
      threadId,
      profileId,
      isArchived: true,
      archivedAt: new Date(),
      isPinned: false, // Unpin se estava fixada
    },
    update: {
      isArchived: true,
      archivedAt: new Date(),
      isPinned: false,
      pinnedAt: null,
    }
  });

  return res.json({ success: true });
});

// DELETE /api/chat/threads/:threadId/archive
router.delete('/threads/:threadId/archive', authenticate, async (req, res) => {
  const { threadId } = req.params;
  const profileId = req.user.profileId;

  await db.chatThreadPreference.upsert({
    where: { threadId_profileId: { threadId, profileId } },
    create: { threadId, profileId, isArchived: false },
    update: { isArchived: false, archivedAt: null }
  });

  return res.json({ success: true });
});

// GET /api/chat/threads - Atualizar para incluir preferencias
router.get('/threads', authenticate, async (req, res) => {
  const profileId = req.user.profileId;
  const { archived } = req.query; // ?archived=true para ver arquivadas

  const showArchived = archived === 'true';

  // Buscar threads onde usuario e participante
  const threads = await db.chatThread.findMany({
    where: {
      participants: { has: profileId }
    },
    include: {
      userPreferences: {
        where: { profileId }
      }
    },
    orderBy: { lastMessageAt: 'desc' }
  });

  // Processar e filtrar
  const processed = threads.map(thread => {
    const pref = thread.userPreferences[0];
    return {
      ...thread,
      isPinned: pref?.isPinned || false,
      pinnedAt: pref?.pinnedAt?.getTime(),
      isArchived: pref?.isArchived || false,
      userPreferences: undefined, // Remover do response
    };
  });

  // Filtrar por archived
  const filtered = processed.filter(t =>
    showArchived ? t.isArchived : !t.isArchived
  );

  // Ordenar: pinned primeiro (por pinnedAt), depois por lastMessageAt
  const sorted = filtered.sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    if (a.isPinned && b.isPinned) {
      return (b.pinnedAt || 0) - (a.pinnedAt || 0);
    }
    return b.lastMessageAt - a.lastMessageAt;
  });

  // Contar arquivadas para mostrar badge
  const archivedCount = processed.filter(t => t.isArchived).length;

  return res.json({
    success: true,
    data: {
      threads: sorted,
      archivedCount,
    }
  });
});
```

### 3. Frontend Implementation

#### Arquivo: `apps/web/src/hooks/useChat.ts`

Adicionar ao state e actions:

```typescript
interface ChatState {
  // ... existing
  archivedCount: number;

  // Actions
  pinThread: (threadId: string) => Promise<void>;
  unpinThread: (threadId: string) => Promise<void>;
  archiveThread: (threadId: string) => Promise<void>;
  unarchiveThread: (threadId: string) => Promise<void>;
  loadArchivedThreads: () => Promise<void>;
}

// Implementacoes
pinThread: async (threadId: string) => {
  try {
    await apiHelpers.put(`/api/chat/threads/${threadId}/pin`);

    // Atualizar local
    const threads = get().threads.map(t =>
      t.id === threadId
        ? { ...t, isPinned: true, pinnedAt: Date.now(), isArchived: false }
        : t
    );

    // Reordenar
    set({ threads: sortThreads(threads) });

    toast.success('Conversa fixada');
  } catch (err: any) {
    toast.error(err?.message || 'Erro ao fixar conversa');
  }
},

unpinThread: async (threadId: string) => {
  try {
    await apiHelpers.delete(`/api/chat/threads/${threadId}/pin`);

    const threads = get().threads.map(t =>
      t.id === threadId
        ? { ...t, isPinned: false, pinnedAt: undefined }
        : t
    );

    set({ threads: sortThreads(threads) });
    toast.success('Conversa desafixada');
  } catch (err: any) {
    toast.error(err?.message || 'Erro ao desafixar');
  }
},

archiveThread: async (threadId: string) => {
  try {
    await apiHelpers.put(`/api/chat/threads/${threadId}/archive`);

    // Remover da lista principal
    const threads = get().threads.filter(t => t.id !== threadId);
    set({
      threads,
      archivedCount: get().archivedCount + 1
    });

    toast.success('Conversa arquivada');
  } catch (err: any) {
    toast.error(err?.message || 'Erro ao arquivar');
  }
},

unarchiveThread: async (threadId: string) => {
  // Similar, adiciona de volta a lista
},

// Helper para ordenar
function sortThreads(threads: ChatThread[]) {
  return threads.sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    if (a.isPinned && b.isPinned) {
      return (b.pinnedAt || 0) - (a.pinnedAt || 0);
    }
    return b.lastMessageAt - a.lastMessageAt;
  });
}
```

#### Arquivo: `apps/web/src/components/chat/ThreadItem.tsx`

Adicionar visual de pin e menu de acoes:

```typescript
import { Pin, Archive, MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ThreadItemProps {
  thread: ChatThread;
  onPin: () => void;
  onUnpin: () => void;
  onArchive: () => void;
}

export function ThreadItem({ thread, onPin, onUnpin, onArchive }: ThreadItemProps) {
  return (
    <div className="group relative flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer">
      {/* Avatar */}
      <Avatar>...</Avatar>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{thread.name}</span>
          {thread.isPinned && (
            <Pin className="h-3 w-3 text-muted-foreground" />
          )}
        </div>
        <p className="text-sm text-muted-foreground truncate">
          {thread.lastMessage?.preview}
        </p>
      </div>

      {/* Timestamp */}
      <span className="text-xs text-muted-foreground">
        {formatRelativeTime(thread.lastMessageAt)}
      </span>

      {/* Actions Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="opacity-0 group-hover:opacity-100 absolute right-2"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {thread.isPinned ? (
            <DropdownMenuItem onClick={onUnpin}>
              <Pin className="mr-2 h-4 w-4" />
              Desafixar
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={onPin}>
              <Pin className="mr-2 h-4 w-4" />
              Fixar
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={onArchive}>
            <Archive className="mr-2 h-4 w-4" />
            Arquivar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
```

#### Arquivo: `apps/web/src/pages/chat/ChatInboxPage.tsx`

Adicionar secao de arquivadas:

```typescript
export function ChatInboxPage() {
  const { threads, archivedCount } = useChat();
  const [showArchived, setShowArchived] = useState(false);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <h1 className="text-xl font-semibold">Conversas</h1>
      </div>

      {/* Archived Link */}
      {archivedCount > 0 && !showArchived && (
        <button
          onClick={() => setShowArchived(true)}
          className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground hover:bg-muted/50"
        >
          <Archive className="h-4 w-4" />
          Arquivadas ({archivedCount})
        </button>
      )}

      {/* Back from archived */}
      {showArchived && (
        <button
          onClick={() => setShowArchived(false)}
          className="flex items-center gap-2 px-4 py-3 text-sm font-medium hover:bg-muted/50"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para conversas
        </button>
      )}

      {/* Thread List */}
      <div className="flex-1 overflow-y-auto">
        {threads.map(thread => (
          <ThreadItem
            key={thread.id}
            thread={thread}
            onPin={() => pinThread(thread.id)}
            onUnpin={() => unpinThread(thread.id)}
            onArchive={() => archiveThread(thread.id)}
          />
        ))}
      </div>
    </div>
  );
}
```

### 4. Swipe Actions (Opcional/Bonus)

Para mobile, adicionar swipe-to-pin e swipe-to-archive:

```typescript
import { useSwipeable } from 'react-swipeable';

function ThreadItem({ thread, onPin, onArchive }) {
  const [swipeOffset, setSwipeOffset] = useState(0);

  const handlers = useSwipeable({
    onSwiping: (e) => {
      if (e.dir === 'Right') {
        setSwipeOffset(Math.min(e.absX, 80));
      } else if (e.dir === 'Left') {
        setSwipeOffset(Math.max(-e.absX, -80));
      }
    },
    onSwipedRight: () => {
      if (swipeOffset > 60) onPin();
      setSwipeOffset(0);
    },
    onSwipedLeft: () => {
      if (swipeOffset < -60) onArchive();
      setSwipeOffset(0);
    },
    onTouchEndOrOnMouseUp: () => setSwipeOffset(0),
  });

  return (
    <div {...handlers} className="relative overflow-hidden">
      {/* Background actions */}
      <div className="absolute inset-y-0 left-0 w-20 bg-primary flex items-center justify-center">
        <Pin className="h-5 w-5 text-primary-foreground" />
      </div>
      <div className="absolute inset-y-0 right-0 w-20 bg-orange-500 flex items-center justify-center">
        <Archive className="h-5 w-5 text-white" />
      </div>

      {/* Content with offset */}
      <div
        style={{ transform: `translateX(${swipeOffset}px)` }}
        className="bg-background transition-transform"
      >
        {/* ... thread content */}
      </div>
    </div>
  );
}
```

## UI/UX Specs

### Visual do Pin

```
┌─────────────────────────────────────┐
│ [Avatar] Nome              📌 14:32 │  <- Pin icon pequeno
│          Preview da mensagem...     │
└─────────────────────────────────────┘
```

### Secao de Arquivadas

```
┌─────────────────────────────────────┐
│ 📦 Arquivadas (5)                   │  <- Link clicavel
└─────────────────────────────────────┘
```

### Menu de Contexto

```
┌──────────────────┐
│ 📌 Fixar         │
│ 📦 Arquivar      │
│ 🔕 Silenciar     │  <- Fase futura
│ 🗑️ Excluir       │  <- Fase futura
└──────────────────┘
```

## Testes

### Unitarios
- `sortThreads` ordena corretamente
- ThreadItem mostra pin icon quando fixado

### Integracao
- Pin thread atualiza lista
- Limite de 3 pins e respeitado
- Archive remove da lista principal
- Unarchive restaura na lista

### E2E
- Usuario fixa conversa -> aparece no topo
- Usuario arquiva -> some da lista, aparece em arquivadas
- Navegar para arquivadas e desarquivar

## Checklist de Implementacao

- [ ] Criar migration para ChatThreadPreference
- [ ] Implementar endpoints de pin/unpin
- [ ] Implementar endpoints de archive/unarchive
- [ ] Atualizar GET /threads para incluir preferencias
- [ ] Adicionar estado no useChat
- [ ] Atualizar ThreadItem com pin visual e menu
- [ ] Adicionar secao de arquivadas no inbox
- [ ] (Bonus) Swipe actions para mobile
- [ ] Testes
