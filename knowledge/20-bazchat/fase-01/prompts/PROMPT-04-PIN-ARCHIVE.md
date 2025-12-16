# Prompt: Implementar Pin & Archive de Conversas no BazChat

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

Voce vai implementar a funcionalidade de fixar (pin) e arquivar conversas no BazChat. Usuarios poderao fixar ate 3 conversas importantes no topo e arquivar conversas que nao querem ver na lista principal.

## Especificacao

Leia a especificacao completa em: `knowledge/bazchat/fase-01/04-PIN-ARCHIVE.md`

## Funcionalidades

### Pin (Fixar)
- Maximo 3 conversas fixadas
- Aparecem sempre no topo
- Icone de pin visual

### Archive (Arquivar)
- Remove da lista principal
- Acessivel via "Arquivadas (N)"
- Pode ser desarquivada

## Arquivos a Modificar/Criar

### Database

1. **`packages/db/prisma/schema.prisma`**
   - Criar tabela `ChatThreadPreference`
   - Campos: `threadId`, `profileId`, `isPinned`, `pinnedAt`, `isArchived`, `archivedAt`
   - Indices apropriados
   - Rodar migration

### Backend

2. **`apps/api/src/routes/chat.ts`**
   - `PUT /threads/:threadId/pin` - Fixar conversa
   - `DELETE /threads/:threadId/pin` - Desafixar
   - `PUT /threads/:threadId/archive` - Arquivar
   - `DELETE /threads/:threadId/archive` - Desarquivar
   - Atualizar `GET /threads` para:
     - Incluir preferencias do usuario
     - Filtrar por `?archived=true`
     - Ordenar: pinned primeiro, depois por lastMessageAt
     - Retornar `archivedCount`

### Frontend

3. **`apps/web/src/hooks/useChat.ts`**
   - Adicionar estado: `archivedCount`
   - Adicionar actions: `pinThread`, `unpinThread`, `archiveThread`, `unarchiveThread`
   - Atualizar `loadThreads` para processar preferencias

4. **`apps/web/src/components/chat/ThreadItem.tsx`**
   - Adicionar icone de Pin quando `thread.isPinned`
   - Adicionar menu dropdown com opcoes:
     - Fixar / Desafixar
     - Arquivar

5. **`apps/web/src/pages/chat/ChatInboxPage.tsx`**
   - Adicionar link "Arquivadas (N)" quando houver arquivadas
   - Estado para alternar entre lista normal e arquivadas
   - Botao de voltar quando vendo arquivadas

## Ordem de Implementacao

1. Migration Prisma
2. Endpoints backend (pin, unpin, archive, unarchive)
3. Atualizar GET /threads
4. useChat: estado e actions
5. ThreadItem: pin icon e menu
6. ChatInboxPage: secao de arquivadas

## Codigo de Referencia

### Schema Prisma

```prisma
model ChatThreadPreference {
  id        String   @id @default(cuid())
  threadId  String
  profileId String

  isPinned    Boolean   @default(false)
  pinnedAt    DateTime?
  isArchived  Boolean   @default(false)
  archivedAt  DateTime?

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  thread      ChatThread @relation(fields: [threadId], references: [id])
  profile     Profile    @relation(fields: [profileId], references: [id])

  @@unique([threadId, profileId])
  @@index([profileId, isPinned])
  @@index([profileId, isArchived])
}
```

### Endpoint Pin

```typescript
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
      error: 'Maximo de 3 conversas fixadas'
    });
  }

  // Upsert preferencia
  await db.chatThreadPreference.upsert({
    where: { threadId_profileId: { threadId, profileId } },
    create: { threadId, profileId, isPinned: true, pinnedAt: new Date(), isArchived: false },
    update: { isPinned: true, pinnedAt: new Date(), isArchived: false }
  });

  return res.json({ success: true });
});
```

### Ordenacao de Threads

```typescript
function sortThreads(threads: ChatThread[]) {
  return [...threads].sort((a, b) => {
    // Pinned primeiro
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;

    // Entre pinned: mais recente primeiro
    if (a.isPinned && b.isPinned) {
      return (b.pinnedAt || 0) - (a.pinnedAt || 0);
    }

    // Normal: por lastMessageAt
    return b.lastMessageAt - a.lastMessageAt;
  });
}
```

### ThreadItem com Menu

```tsx
import { Pin, Archive, MoreVertical } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

function ThreadItem({ thread, onPin, onUnpin, onArchive }) {
  return (
    <div className="group relative flex items-center gap-3 p-3 hover:bg-muted/50">
      <Avatar ... />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{thread.name}</span>
          {thread.isPinned && <Pin className="h-3 w-3 text-muted-foreground" />}
        </div>
        <p className="text-sm text-muted-foreground truncate">...</p>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={thread.isPinned ? onUnpin : onPin}>
            <Pin className="mr-2 h-4 w-4" />
            {thread.isPinned ? 'Desafixar' : 'Fixar'}
          </DropdownMenuItem>
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

### ChatInboxPage com Arquivadas

```tsx
function ChatInboxPage() {
  const { threads, archivedCount, loadArchivedThreads } = useChat();
  const [showArchived, setShowArchived] = useState(false);

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <h1 className="text-xl font-semibold">
          {showArchived ? 'Arquivadas' : 'Conversas'}
        </h1>
      </div>

      {/* Link para arquivadas */}
      {!showArchived && archivedCount > 0 && (
        <button
          onClick={() => { setShowArchived(true); loadArchivedThreads(); }}
          className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground hover:bg-muted/50"
        >
          <Archive className="h-4 w-4" />
          Arquivadas ({archivedCount})
        </button>
      )}

      {/* Voltar */}
      {showArchived && (
        <button onClick={() => setShowArchived(false)} className="...">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>
      )}

      {/* Lista */}
      <div className="flex-1 overflow-y-auto">
        {threads.map(thread => <ThreadItem key={thread.id} ... />)}
      </div>
    </div>
  );
}
```

## Validacao

Apos implementar, testar:
- [ ] Fixar conversa -> aparece no topo com icone de pin
- [ ] Limite de 3 pins -> erro ao tentar fixar 4a
- [ ] Arquivar -> remove da lista, incrementa contador
- [ ] Clicar em "Arquivadas" -> mostra conversas arquivadas
- [ ] Desarquivar -> volta para lista principal
- [ ] Fixar conversa arquivada -> desarquiva e fixa

## Nao Fazer

- Nao implementar swipe actions nesta fase (sera bonus futuro)
- Nao implementar "silenciar" nesta fase
- Nao modificar o fluxo de mensagens
- Manter compatibilidade com threads de grupo
