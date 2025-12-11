# Relatório: Problema de Identificação de Participantes no Chat

**Data:** 2025-10-13
**Problema:** Lista de conversas mostra apenas profileIds (chaves) ao invés de nomes/handles dos usuários

---

## 1. PROBLEMA IDENTIFICADO

### Descrição do Usuário
> "Quando adiciona nova conversa na pagina http://localhost:5173/app/chat, vai aparecendo uma lista de chaves que representa o usuario da conversa. Nao da para identificar que usuario eh esse com essa chave."

### O que está acontecendo

Atualmente, a lista de conversas mostra algo como:

```
┌──────────────────────────────────────┐
│ Conversas              [Nova conversa]│
├──────────────────────────────────────┤
│  [2] 2bdc5225-2a10-4107-8d60-43d61... │
│      Última mensagem...               │
│                                       │
│  [a] a3f21e45-9b12-4a5e-bc32-12d45... │
│      Última mensagem...               │
└──────────────────────────────────────┘
```

**Deveria mostrar:**
```
┌──────────────────────────────────────┐
│ Conversas              [Nova conversa]│
├──────────────────────────────────────┤
│  [👤] João Silva (@joaosilva)         │
│      Olá, tudo bem?             5 min │
│                                       │
│  [👤] Maria Santos (@mariasantos)     │
│      Obrigado pela compra!      2h    │
└──────────────────────────────────────┘
```

---

## 2. ANÁLISE TÉCNICA

### 2.1 Estrutura de Dados Atual

**Backend (`ChatThread`):**
```typescript
export interface ChatThread {
  id: string;
  kind: ThreadKind;
  participants: string[];  // ← Array de profileIds (UUIDs)
  orderId?: string;
  groupId?: string;
  lastMessageAt: number;
  unreadCount: number;
  metadata?: Record<string, any>;
  createdAt: number;
  updatedAt: number;
}
```

**Problema:** `participants` contém apenas os IDs dos perfis, não os dados dos usuários.

**Exemplo de resposta da API:**
```json
{
  "threads": [
    {
      "id": "thread-123",
      "kind": "dm",
      "participants": [
        "2bdc5225-2a10-4107-8d60-43d6157e3a3c",  // ← Usuário atual
        "a3f21e45-9b12-4a5e-bc32-12d45e678f90"   // ← Outro usuário (não sabemos quem é!)
      ],
      "lastMessageAt": 1697234567890,
      "unreadCount": 2
    }
  ]
}
```

### 2.2 Como o Frontend Tenta Exibir

**Componente `ThreadItem.tsx`:**
```typescript
export function ThreadItem({ thread, onClick }: ThreadItemProps) {
  // TODO: buscar dados do participante (avatar, nome)
  const otherParticipant = thread.participants[0]; // Simplificado ← PROBLEMA!

  return (
    <div onClick={onClick}>
      <Avatar>
        <div>{otherParticipant[0]?.toUpperCase()}</div> {/* Mostra "2" ou "a" */}
      </Avatar>
      <div>
        <h3>{otherParticipant}</h3> {/* Mostra o UUID completo */}
        <p>Última mensagem...</p>
      </div>
    </div>
  );
}
```

**Problemas:**
1. `thread.participants[0]` pega o PRIMEIRO participante, que pode ser o próprio usuário logado
2. Mostra o UUID completo como nome
3. Avatar usa primeira letra do UUID (`"2"` ou `"a"`)
4. Não tem informação de nome, handle, ou avatar do outro usuário

### 2.3 Por que isso acontece?

**Não é mock**, é um problema de arquitetura:

1. **Normalização de dados:** O banco armazena apenas os IDs para evitar duplicação
2. **Falta de JOIN:** A API não faz JOIN com a tabela `Profile` para buscar os dados
3. **Frontend incompleto:** O componente está com `// TODO` e não busca os dados

---

## 3. SOLUÇÃO PROPOSTA

### Opção 1: Backend Enriquecer a Resposta (RECOMENDADO)

**Modificar a API para incluir dados dos participantes:**

#### 3.1.1 Nova Interface de Resposta

```typescript
// packages/shared-types/src/chat.ts
export interface ChatThreadParticipant {
  profileId: string;
  handle: string;
  name?: string;
  avatarUrl?: string;
  isOnline?: boolean;
}

export interface ChatThreadWithParticipants extends ChatThread {
  participantsData: ChatThreadParticipant[];
}
```

#### 3.1.2 Modificar Backend

```typescript
// apps/api/src/chat/services/chat.ts
async listThreads(
  profileId: string,
  opts: { cursor?: number; limit: number }
): Promise<{ threads: ChatThreadWithParticipants[]; nextCursor?: number }> {
  const threads = await prisma.chatThread.findMany({
    where: { participants: { has: profileId } },
    orderBy: { lastMessageAt: 'desc' },
    take: opts.limit + 1,
    include: {
      // TODO: Precisamos adicionar relação com Profile no schema Prisma
    },
  });

  // Buscar dados dos participantes
  const threadsWithParticipants = await Promise.all(
    threads.map(async (thread) => {
      const participantsData = await Promise.all(
        thread.participants.map(async (pId) => {
          const profile = await prisma.profile.findUnique({
            where: { id: pId },
            select: { id: true, handle: true, name: true, avatarUrl: true },
          });

          return {
            profileId: pId,
            handle: profile?.handle || 'unknown',
            name: profile?.name,
            avatarUrl: profile?.avatarUrl,
          };
        })
      );

      return {
        ...this.mapThread(thread),
        participantsData,
      };
    })
  );

  // ... resto do código
}
```

#### 3.1.3 Modificar Frontend

```typescript
// apps/web/src/components/chat/ThreadItem.tsx
export function ThreadItem({ thread, onClick }: ThreadItemProps) {
  const { user } = useAuth(); // Pegar usuário logado

  // Filtrar para pegar OUTRO participante (não o usuário logado)
  const otherParticipant = thread.participantsData.find(
    (p) => p.profileId !== user?.id
  );

  if (!otherParticipant) return null;

  return (
    <div onClick={onClick}>
      <Avatar>
        {otherParticipant.avatarUrl ? (
          <img src={otherParticipant.avatarUrl} alt={otherParticipant.name} />
        ) : (
          <div>{otherParticipant.name?.[0] || otherParticipant.handle[0]}</div>
        )}
      </Avatar>
      <div>
        <h3>{otherParticipant.name || `@${otherParticipant.handle}`}</h3>
        <p>Última mensagem...</p>
      </div>
      {otherParticipant.isOnline && <OnlineBadge />}
    </div>
  );
}
```

### Opção 2: Frontend Buscar Dados Separadamente

**Frontend busca os perfis por demanda:**

```typescript
// apps/web/src/hooks/useParticipantProfile.ts
export function useParticipantProfile(profileId: string) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/profiles/${profileId}`)
      .then((res) => res.json())
      .then((data) => setProfile(data.profile))
      .finally(() => setLoading(false));
  }, [profileId]);

  return { profile, loading };
}

// ThreadItem.tsx
export function ThreadItem({ thread }: ThreadItemProps) {
  const { user } = useAuth();
  const otherParticipantId = thread.participants.find((id) => id !== user?.id);
  const { profile, loading } = useParticipantProfile(otherParticipantId);

  if (loading) return <Skeleton />;
  if (!profile) return null;

  return (
    <div>
      <Avatar src={profile.avatarUrl} />
      <h3>{profile.name || `@${profile.handle}`}</h3>
    </div>
  );
}
```

**Desvantagens:**
- ❌ Faz 1 requisição por thread (N+1 problem)
- ❌ Lento se houver muitas conversas
- ❌ Aumenta carga no servidor

---

## 4. RESPOSTA ÀS PERGUNTAS DO USUÁRIO

### "Essa chave é gerada onde?"

**Resposta:** Não é uma "chave" no sentido de chave criptográfica. É o **profileId** (UUID) do usuário, gerado quando:

1. **Criação de conta:**
```typescript
// apps/api/src/routes/auth.ts
const profile = await prisma.profile.create({
  data: {
    id: cuid(),  // ← Gera UUID único: "2bdc5225-2a10-4107..."
    address: '5FHneW...',
    handle: 'joaosilva',
    name: 'João Silva',
  },
});
```

2. **Armazenado no banco:**
```sql
-- Tabela Profile
CREATE TABLE Profile (
  id TEXT PRIMARY KEY,  -- "2bdc5225-2a10-4107-8d60-43d6157e3a3c"
  address TEXT UNIQUE,
  handle TEXT UNIQUE,
  name TEXT,
  avatarUrl TEXT
);
```

3. **Usado nas threads:**
```sql
-- Tabela ChatThread
CREATE TABLE ChatThread (
  id TEXT PRIMARY KEY,
  participants TEXT[],  -- ["profileId1", "profileId2"]
  ...
);
```

### "Qualquer usuário que adiciona na conversa a chave é sempre a mesma?"

**Resposta:** Não! Cada usuário tem um **profileId único**.

**Exemplo:**
- João Silva: `2bdc5225-2a10-4107-8d60-43d6157e3a3c`
- Maria Santos: `a3f21e45-9b12-4a5e-bc32-12d45e678f90`
- Pedro Costa: `f8b92d13-5e67-4c21-a9f2-98e7d6c5b4a3`

**Quando João cria conversa com Maria:**
```json
{
  "participants": [
    "2bdc5225-2a10-4107-8d60-43d6157e3a3c",  // João
    "a3f21e45-9b12-4a5e-bc32-12d45e678f90"   // Maria
  ]
}
```

**Quando João cria conversa com Pedro:**
```json
{
  "participants": [
    "2bdc5225-2a10-4107-8d60-43d6157e3a3c",  // João (mesmo ID)
    "f8b92d13-5e67-4c21-a9f2-98e7d6c5b4a3"   // Pedro (ID diferente)
  ]
}
```

### "É mock?"

**Resposta:** Não, não é mock. O sistema está funcionando corretamente, mas:
- ✅ Os IDs são reais e persistidos no banco
- ✅ As conversas são criadas e armazenadas
- ❌ **O frontend NÃO está buscando os dados do perfil para exibir**

---

## 5. IMPLEMENTAÇÃO RECOMENDADA

### Fase 1: Backend - Adicionar participantsData (2-3 horas)

1. **Atualizar types:**
```bash
# packages/shared-types/src/chat.ts
export interface ChatThreadParticipant {
  profileId: string;
  handle: string;
  name?: string;
  avatarUrl?: string;
}

export interface ChatThreadWithParticipants extends ChatThread {
  participantsData: ChatThreadParticipant[];
}
```

2. **Modificar chatService.listThreads:**
```typescript
// apps/api/src/chat/services/chat.ts
async listThreads(profileId: string, opts: any) {
  const threads = await prisma.chatThread.findMany({ ... });

  const threadsWithData = await Promise.all(
    threads.map(async (thread) => {
      const participantsData = await this.getParticipantsData(thread.participants);
      return { ...this.mapThread(thread), participantsData };
    })
  );

  return { threads: threadsWithData, nextCursor };
}

private async getParticipantsData(profileIds: string[]) {
  const profiles = await prisma.profile.findMany({
    where: { id: { in: profileIds } },
    select: { id: true, handle: true, name: true, avatarUrl: true },
  });

  return profiles.map((p) => ({
    profileId: p.id,
    handle: p.handle,
    name: p.name || undefined,
    avatarUrl: p.avatarUrl || undefined,
  }));
}
```

3. **Atualizar endpoint:**
```typescript
// apps/api/src/chat/routes/chat.threads.ts
app.get('/chat/threads', { ... }, async (req, reply) => {
  const threads = await chatService.listThreads(profileId, { ... });
  return threads; // Agora inclui participantsData
});
```

### Fase 2: Frontend - Usar participantsData (1-2 horas)

1. **Atualizar useChat para tipagem:**
```typescript
// apps/web/src/hooks/useChat.ts
import { ChatThreadWithParticipants } from '@bazari/shared-types';

interface ChatState {
  threads: ChatThreadWithParticipants[];
  // ...
}
```

2. **Atualizar ThreadItem:**
```typescript
// apps/web/src/components/chat/ThreadItem.tsx
import { getSessionUser } from '@/modules/auth/session';

export function ThreadItem({ thread, onClick }: ThreadItemProps) {
  const currentUser = getSessionUser();

  const otherParticipant = thread.participantsData?.find(
    (p) => p.profileId !== currentUser?.id
  );

  if (!otherParticipant) {
    // Fallback se participantsData não existir
    const otherParticipantId = thread.participants.find(
      (id) => id !== currentUser?.id
    );
    return (
      <div onClick={onClick}>
        <Avatar><div>?</div></Avatar>
        <div>
          <h3>{otherParticipantId?.slice(0, 8)}...</h3>
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div onClick={onClick}>
      <Avatar>
        {otherParticipant.avatarUrl ? (
          <img src={otherParticipant.avatarUrl} alt={otherParticipant.name || otherParticipant.handle} />
        ) : (
          <div className="bg-primary/10 h-full w-full flex items-center justify-center text-lg">
            {(otherParticipant.name?.[0] || otherParticipant.handle[0]).toUpperCase()}
          </div>
        )}
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold truncate">
            {otherParticipant.name || `@${otherParticipant.handle}`}
          </h3>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(thread.lastMessageAt, {
              addSuffix: true,
              locale: ptBR,
            })}
          </span>
        </div>
        <p className="text-sm text-muted-foreground truncate">
          Última mensagem...
        </p>
      </div>

      {thread.unreadCount > 0 && (
        <div className="bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
          {thread.unreadCount}
        </div>
      )}
    </div>
  );
}
```

### Fase 3: Melhorias Adicionais (Opcional)

1. **Última mensagem real:**
```typescript
// Buscar última mensagem do thread
const lastMessage = await chatService.getLastMessage(thread.id);
<p>{lastMessage?.plaintext || 'Envie uma mensagem...'}</p>
```

2. **Status online:**
```typescript
// Adicionar campo isOnline ao buscar participantes
{otherParticipant.isOnline && (
  <span className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-background" />
)}
```

3. **Avatar component melhorado:**
```typescript
<Avatar className="relative">
  <AvatarImage src={otherParticipant.avatarUrl} />
  <AvatarFallback>
    {(otherParticipant.name?.[0] || otherParticipant.handle[0]).toUpperCase()}
  </AvatarFallback>
</Avatar>
```

---

## 6. CHECKLIST DE IMPLEMENTAÇÃO

### Backend
- [ ] Adicionar `ChatThreadParticipant` interface em shared-types
- [ ] Criar método `getParticipantsData` no chatService
- [ ] Modificar `listThreads` para incluir participantsData
- [ ] Testar endpoint `/api/chat/threads` retornando dados completos

### Frontend
- [ ] Atualizar tipagem de `threads` em useChat
- [ ] Modificar `ThreadItem` para filtrar participante correto
- [ ] Exibir nome/handle ao invés de UUID
- [ ] Exibir avatar do usuário
- [ ] Testar com múltiplas conversas

### Testes
- [ ] Criar conversa entre 2 usuários
- [ ] Verificar que mostra nome/handle correto
- [ ] Verificar que mostra avatar (se existir)
- [ ] Verificar fallback se dados não existirem

---

## 7. CONCLUSÃO

**Resumo do Problema:**
- ✅ Sistema funciona corretamente (não é bug)
- ❌ Frontend não busca dados dos participantes
- ❌ Mostra UUID ao invés de nome/handle

**Solução:**
- Backend: Enriquecer resposta com dados dos perfis
- Frontend: Exibir nome/handle/avatar dos participantes

**Tempo estimado:** 3-5 horas total

**Prioridade:** Alta (afeta usabilidade direta)

---

**Documento criado em:** 2025-10-13
**Status:** Aguardando implementação
