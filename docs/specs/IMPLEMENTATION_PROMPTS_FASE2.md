# Prompts de Implementação - FASE 2: Discovery & Engajamento

**Versão**: 1.0.0
**Data**: 2025-01-09

---

## 📋 Visão Geral

Este documento contém prompts estruturados para implementar a **Fase 2: Discovery & Engajamento** do sistema social/perfil.

### Dependências
- **Fase 1** deve estar completa e testada
- CreatePostModal funcional
- PostCard renderizando posts
- UserMenu integrado

---

## 🎯 Task 2.1: Backend - Global Search API

### Prompt

```
Contexto: Preciso implementar busca global no sistema para encontrar perfis, posts, lojas e produtos. A busca deve ser rápida e retornar resultados agrupados por tipo.

Repositório: ~/bazari/apps/api

Tarefas:

1. **Criar rota de busca global**:
   - Arquivo: src/routes/search.ts (NOVO)
   - Endpoint: GET /search/global
   - Query params:
     * q: string (obrigatório, 1-100 chars)
     * type: 'all' | 'profiles' | 'posts' | 'stores' | 'products' (opcional)
     * limit: number (opcional, default 10, max 50)
   - Validação: Zod schema
   - Busca case-insensitive com ILIKE/contains
   - Retornar resultados agrupados por tipo

2. **Lógica de busca**:
   - Profiles: buscar em handle e displayName
   - Posts: buscar em content (apenas PUBLISHED)
   - Stores: buscar em shopName e shopSlug
   - Products: buscar em title e description (se type='products')
   - Ordenação:
     * Profiles: por followersCount desc
     * Posts: por createdAt desc
     * Stores: por ratingAvg desc

3. **Registrar rota no server.ts**:
   - Importar globalSearchRoutes
   - Registrar após outras rotas

Estrutura de resposta:
```json
{
  "results": {
    "profiles": [...],
    "posts": [...],
    "stores": [...],
    "products": []
  },
  "query": "termo buscado"
}
```

Arquivo para criar: apps/api/src/routes/search.ts
Arquivo para modificar: apps/api/src/server.ts

Não modificar:
- Rotas existentes
- Schema Prisma (usar modelos existentes)

Validar que:
- Busca funciona com curl/Postman
- Case-insensitive retorna resultados
- Limite é respeitado
- Type filter funciona
```

### Comandos de Teste

```bash
# Teste de busca geral
curl "http://localhost:3000/search/global?q=alice"

# Teste de busca específica
curl "http://localhost:3000/search/global?q=loja&type=stores&limit=5"

# Teste com caracteres especiais
curl "http://localhost:3000/search/global?q=joão%20silva"
```

---

## 🎯 Task 2.2: Frontend - GlobalSearchBar Component

### Prompt

```
Contexto: Preciso criar uma barra de busca global no header que mostre resultados em tempo real enquanto o usuário digita. Deve ter autocomplete com resultados agrupados.

Repositório: ~/bazari/apps/web

Tarefas:

1. **Criar hook useDebounce**:
   - Arquivo: src/hooks/useDebounce.ts (NOVO)
   - Debounce de 300ms para evitar chamadas excessivas à API
   - Genérico: useDebounce<T>(value: T, delay: number): T

2. **Criar GlobalSearchBar.tsx**:
   - Arquivo: src/components/GlobalSearchBar.tsx (NOVO)
   - Componentes shadcn/ui: Input, Card, CardContent
   - Features:
     * Input com ícone Search (lucide-react)
     * Placeholder: "Buscar pessoas, posts, lojas..."
     * Debounce de 300ms para queries
     * Dropdown com resultados agrupados
     * Fecha ao clicar fora (useRef + addEventListener)
     * Fecha ao pressionar Escape
     * Loading spinner enquanto busca
   - Seções no dropdown:
     * Perfis (avatar + nome + handle + followers)
     * Posts (autor + preview do conteúdo)
     * Lojas (logo + nome + rating)
   - Cada resultado clicável navega para página correspondente

3. **Adicionar helper em api.ts**:
   - Função: globalSearch(query: string)
   - Endpoint: GET /search/global?q={query}

4. **Integrar no AppHeader**:
   - Adicionar GlobalSearchBar no centro do header
   - Largura máxima: max-w-md
   - Esconder em mobile (usar ícone de busca que abre modal)

Arquivos para criar:
- src/hooks/useDebounce.ts
- src/components/GlobalSearchBar.tsx

Arquivos para modificar:
- src/lib/api.ts (adicionar globalSearch helper)
- src/components/AppHeader.tsx (adicionar barra de busca)

Não modificar:
- Navegação existente
- Outros componentes do header

Validar que:
- Busca funciona enquanto digita
- Debounce de 300ms está ativo (ver Network tab)
- Dropdown fecha ao clicar fora
- Escape fecha o dropdown
- Links navegam corretamente
- Loading spinner aparece
```

### Exemplo de Uso

```typescript
// No AppHeader.tsx, adicionar no centro (entre logo e nav)
<div className="hidden md:block flex-1 max-w-md mx-4">
  <GlobalSearchBar />
</div>
```

---

## 🎯 Task 2.3: Backend - Sistema de Likes

### Prompt

```
Contexto: Preciso implementar sistema de likes nos posts. Usuários podem curtir/descurtir posts, e o sistema deve ser idempotente e contar likes totais.

Repositório: ~/bazari/apps/api

Tarefas:

1. **Adicionar endpoints de likes**:
   - POST /posts/:id/like (criar like)
   - DELETE /posts/:id/like (remover like)
   - GET /posts/:id (atualizar para incluir contadores)
   - Middleware: authOnRequest
   - Rate limit: 100 likes/min (evitar spam)

2. **Lógica de likes**:
   - Criar PostLike (modelo já existe da Fase 1)
   - Unique constraint: (postId, userId) - evita duplicação
   - Idempotente: se já curtido, retornar sucesso
   - Contar likes: usar prisma.postLike.count()
   - Retornar: { liked: boolean, likesCount: number }

3. **Adicionar contador em GET /posts/:id**:
   - Include _count: { select: { likes: true, comments: true } }
   - Transformar em likesCount e commentsCount

4. **Verificar se usuário curtiu**:
   - Adicionar lógica para retornar isLiked no GET /posts/:id
   - Verificar se existe PostLike com userId do authUser

Arquivos para modificar:
- apps/api/src/routes/posts.ts

Não modificar:
- Modelo PostLike (já criado na Fase 1)
- Endpoints existentes de posts

Validar que:
- Like é criado corretamente
- Unlike remove o like
- Contador atualiza
- Idempotência funciona (não duplica)
- Rate limit protege contra spam
```

### Comandos de Teste

```bash
# Curtir post
curl -X POST http://localhost:3000/posts/{POST_ID}/like \
  -H "Authorization: Bearer $TOKEN"

# Descurtir post
curl -X DELETE http://localhost:3000/posts/{POST_ID}/like \
  -H "Authorization: Bearer $TOKEN"

# Ver contadores
curl http://localhost:3000/posts/{POST_ID}
```

---

## 🎯 Task 2.4: Frontend - LikeButton Component

### Prompt

```
Contexto: Preciso criar um botão de like interativo com atualização otimística e animação visual.

Repositório: ~/bazari/apps/web

Tarefas:

1. **Criar LikeButton.tsx**:
   - Arquivo: src/components/social/LikeButton.tsx (NOVO)
   - Props: postId, initialLiked, initialCount
   - Componente shadcn/ui: Button
   - Ícone: Heart (lucide-react)
   - Features:
     * Atualização otimística (muda UI antes da API responder)
     * Reverte em caso de erro (toast)
     * Coração preenchido quando liked
     * Cor vermelha quando liked (text-red-500)
     * Contador ao lado do ícone
     * Desabilitado durante loading

2. **Lógica de toggle**:
   - Estado local: liked, count, loading
   - Ao clicar:
     1. Atualizar UI instantaneamente
     2. Chamar API (like ou unlike)
     3. Atualizar com resposta da API
     4. Se erro, reverter e mostrar toast

3. **Adicionar helpers em api.ts**:
   - likePost(postId: string)
   - unlikePost(postId: string)

4. **Integrar no PostCard**:
   - Substituir botão estático de like por <LikeButton />
   - Passar postId, isLiked, likesCount

Arquivos para criar:
- src/components/social/LikeButton.tsx

Arquivos para modificar:
- src/lib/api.ts (adicionar helpers)
- src/components/social/PostCard.tsx (usar LikeButton)

Não modificar:
- Estrutura do PostCard
- Outros botões de ação

Validar que:
- Botão responde imediatamente ao clicar
- Coração preenche/esvazia corretamente
- Contador atualiza
- Toast aparece em caso de erro
- Reverte estado em erro
```

### Exemplo de Uso

```typescript
// No PostCard.tsx
<LikeButton
  postId={post.id}
  initialLiked={post.isLiked}
  initialCount={post.likesCount || 0}
/>
```

---

## 🎯 Task 2.5: Backend - Sistema de Comments

### Prompt

```
Contexto: Preciso implementar comentários nos posts, com suporte a respostas (1 nível de aninhamento).

Repositório: ~/bazari/apps/api

Tarefas:

1. **Adicionar endpoints de comments**:
   - POST /posts/:id/comments (criar comentário)
   - GET /posts/:id/comments (listar comentários)
   - Middleware: authOnRequest
   - Rate limit: 30 comments/5min

2. **Lógica de comentários**:
   - Validar content (1-1000 chars)
   - Criar PostComment (modelo já existe)
   - Suportar parentId para respostas
   - Incluir autor (Profile) na resposta
   - Retornar comment criado com autor

3. **Listar comentários**:
   - Paginação cursor-based (limit, cursor)
   - Apenas top-level (parentId: null)
   - Include replies (primeiras 5)
   - Ordenar: top-level desc, replies asc
   - Retornar: { items: [], page: { nextCursor, hasMore } }

4. **Criar notificação**:
   - Importar createNotification helper
   - Notificar autor do post quando alguém comenta
   - Tipo: COMMENT
   - Metadata: { commentId }

Arquivos para modificar:
- apps/api/src/routes/posts.ts

Arquivos para importar:
- apps/api/src/lib/notifications.ts (createNotification)

Não modificar:
- Modelo PostComment (já criado na Fase 1)
- Endpoints existentes

Validar que:
- Comentário é criado corretamente
- Respostas são associadas ao parent
- Listagem pagina corretamente
- Notificação é enviada
- Rate limit protege
```

### Comandos de Teste

```bash
# Criar comentário
curl -X POST http://localhost:3000/posts/{POST_ID}/comments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content": "Ótimo post!"}'

# Responder comentário
curl -X POST http://localhost:3000/posts/{POST_ID}/comments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content": "Concordo!", "parentId": "{COMMENT_ID}"}'

# Listar comentários
curl http://localhost:3000/posts/{POST_ID}/comments?limit=10
```

---

## 🎯 Task 2.6: Frontend - CommentSection Component

### Prompt

```
Contexto: Preciso criar uma seção de comentários para posts, com formulário de criação e listagem com respostas.

Repositório: ~/bazari/apps/web

Tarefas:

1. **Criar CommentSection.tsx**:
   - Arquivo: src/components/social/CommentSection.tsx (NOVO)
   - Props: postId
   - Componentes: Textarea, Button, Card
   - Features:
     * Formulário de comentário (top)
     * Lista de comentários com respostas aninhadas
     * Avatar + nome + timestamp
     * Respostas com indentação visual (border-left)
     * Loading state
     * Empty state ("Seja o primeiro!")

2. **Criar CommentItem component**:
   - Subcomponente no mesmo arquivo
   - Props: comment
   - Renderiza autor, conteúdo, timestamp
   - Renderiza replies se existirem (indent + border-left)

3. **Lógica de submissão**:
   - Estado: content, loading, submitting
   - Validar content não vazio
   - Chamar API createPostComment
   - Adicionar novo comentário no topo da lista
   - Limpar textarea
   - Toast de sucesso/erro

4. **Adicionar helpers em api.ts**:
   - getPostComments(postId, params)
   - createPostComment(postId, { content, parentId? })

5. **Integrar no PostCard (opcional)**:
   - Adicionar abaixo das ações
   - Mostrar apenas quando botão "comentar" for clicado

Arquivos para criar:
- src/components/social/CommentSection.tsx

Arquivos para modificar:
- src/lib/api.ts (adicionar helpers)

Não modificar:
- PostCard layout principal

Validar que:
- Comentários carregam corretamente
- Novo comentário aparece no topo
- Respostas são renderizadas com indent
- Timestamps formatados (date-fns)
- Toast aparece em sucesso/erro
```

---

## 🎯 Task 2.7: Backend - Sistema de Notificações

### Prompt

```
Contexto: Preciso implementar sistema de notificações para avisar usuários sobre interações (follows, likes, comments, badges).

Repositório: ~/bazari/apps/api

Tarefas:

1. **Criar migration para Notification**:
   - Adicionar modelo Notification no schema.prisma
   - Campos: id, userId, type, actorId, targetId, metadata, read, createdAt
   - Enum NotificationType: FOLLOW, LIKE, COMMENT, MENTION, BADGE, REPUTATION
   - Relações: User, Profile (actor)
   - Índices: (userId, read, createdAt), (createdAt)

2. **Criar rota de notificações**:
   - Arquivo: src/routes/notifications.ts (NOVO)
   - GET /notifications (listar)
   - POST /notifications/mark-all-read
   - POST /notifications/:id/read
   - Middleware: authOnRequest

3. **Lógica de listagem**:
   - Filtrar por userId do authUser
   - Query param: unreadOnly (boolean)
   - Paginação cursor-based
   - Include actor (Profile)
   - Retornar unreadCount separado

4. **Criar helper createNotification**:
   - Arquivo: src/lib/notifications.ts (NOVO)
   - Função: createNotification(prisma, { userId, type, actorId?, targetId?, metadata? })
   - Validar: não notificar a si mesmo (userId !== actorId)

5. **Integrar em endpoints existentes**:
   - POST /social/follow → criar notificação FOLLOW
   - POST /posts/:id/like → criar notificação LIKE
   - POST /posts/:id/comments → criar notificação COMMENT

6. **Registrar rota no server.ts**:
   - Importar notificationsRoutes
   - Registrar após outras rotas

Arquivos para criar:
- src/routes/notifications.ts
- src/lib/notifications.ts

Arquivos para modificar:
- prisma/schema.prisma (adicionar Notification)
- src/routes/social.ts (integrar notificações)
- src/routes/posts.ts (integrar notificações)
- src/server.ts (registrar rota)

Migration:
```bash
npx prisma migrate dev --name add_notifications
```

Validar que:
- Notificações são criadas corretamente
- Listagem retorna notificações do usuário
- Mark as read funciona
- Contador de não lidas correto
```

---

## 🎯 Task 2.8: Frontend - NotificationCenter Component

### Prompt

```
Contexto: Preciso criar um centro de notificações no header que mostra notificações recentes e contador de não lidas.

Repositório: ~/bazari/apps/web

Tarefas:

1. **Criar NotificationCenter.tsx**:
   - Arquivo: src/components/NotificationCenter.tsx (NOVO)
   - Componentes: DropdownMenu, Badge, Button
   - Ícone: Bell (lucide-react)
   - Features:
     * Badge com contador de não lidas (número vermelho)
     * Dropdown com últimas 10 notificações
     * Botão "Marcar tudo como lido"
     * Polling a cada 30 segundos (setInterval)
     * Cleanup do interval no unmount
     * Notificações não lidas com destaque (bg-accent)

2. **Criar NotificationItem component**:
   - Subcomponente no mesmo arquivo
   - Props: notification
   - Renderiza avatar do ator + mensagem + timestamp
   - Mensagens por tipo:
     * FOLLOW: "começou a seguir você"
     * LIKE: "curtiu seu post"
     * COMMENT: "comentou no seu post"
     * BADGE: "Você conquistou um novo badge!"
   - Link para contexto (perfil, post, etc)

3. **Lógica de polling**:
   - useEffect com setInterval(30000)
   - Cleanup: clearInterval no unmount
   - Estado: notifications, unreadCount, loading

4. **Adicionar helpers em api.ts**:
   - getNotifications(params?)
   - markAllNotificationsRead()

5. **Integrar no AppHeader**:
   - Adicionar antes de UserMenu
   - Alinhado à direita

Arquivos para criar:
- src/components/NotificationCenter.tsx

Arquivos para modificar:
- src/lib/api.ts (adicionar helpers)
- src/components/AppHeader.tsx (adicionar NotificationCenter)

Não modificar:
- UserMenu existente
- Navegação existente

Validar que:
- Badge mostra contador correto
- Notificações carregam
- Polling funciona (30s)
- Marcar como lido funciona
- Links navegam corretamente
- Destaque em não lidas
```

### Exemplo de Uso

```typescript
// No AppHeader.tsx, antes de UserMenu
<NotificationCenter />
<UserMenu />
```

---

## 📋 Checklist Final - Fase 2

Após implementar todas as tasks acima, validar:

### Backend
- [ ] Rota /search/global funciona
- [ ] Likes são criados/removidos
- [ ] Comments são criados e listados
- [ ] Notificações são criadas automaticamente
- [ ] Contadores de likes/comments corretos
- [ ] Rate limits protegem endpoints

### Frontend
- [ ] GlobalSearchBar busca e mostra resultados
- [ ] LikeButton atualiza otimisticamente
- [ ] CommentSection cria e lista comentários
- [ ] NotificationCenter mostra notificações
- [ ] Polling de notificações funciona
- [ ] Todos os links navegam corretamente

### UX
- [ ] Debounce de busca funciona (300ms)
- [ ] Atualização otimista em likes
- [ ] Toast de sucesso/erro aparecem
- [ ] Loading states corretos
- [ ] Badge de notificações visível

### Performance
- [ ] Debounce evita chamadas excessivas
- [ ] Polling não sobrecarrega (30s)
- [ ] Queries otimizadas (índices)
- [ ] Rate limits protegem

### Regressão
- [ ] PostCard ainda renderiza
- [ ] CreatePostModal funciona
- [ ] Fase 1 não quebrou

---

## 🚀 Ordem de Execução Recomendada

1. **Task 2.1 + 2.2** (Search Backend + Frontend) → Testar busca
2. **Task 2.3 + 2.4** (Likes Backend + Frontend) → Testar likes
3. **Task 2.5 + 2.6** (Comments Backend + Frontend) → Testar comments
4. **Task 2.7 + 2.8** (Notificações Backend + Frontend) → Testar notificações
5. **Checklist Final** → Validar tudo

---

**Próxima Fase**: FASE 3 - Experiência Visual
