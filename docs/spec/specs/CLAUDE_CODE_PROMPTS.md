# Prompts para Claude Code - Implementação Sistema Social

**Versão**: 1.0.0
**Data**: 2025-01-09
**Uso**: Copiar e colar sequencialmente no Claude Code

---

## 📋 Instruções de Uso

1. **Execute os prompts em ordem** (não pule etapas)
2. **Aguarde conclusão** de cada prompt antes do próximo
3. **Valide os resultados** após cada task
4. **Se houver erro**, corrija antes de prosseguir
5. **Faça commits** após cada task validada

---

## 🎯 FASE 1: Fundações

### Prompt 0: Contexto Inicial

```
Olá! Vou implementar melhorias no sistema social do Bazari seguindo uma especificação técnica detalhada em 8 fases.

Por favor:
1. Leia ~/bazari/docs/specs/IMPLEMENTATION_SUMMARY.md
2. Leia ~/bazari/docs/specs/SOCIAL_UX_IMPROVEMENTS.md (apenas introdução e Fase 1)
3. Me dê um resumo do que entendeu sobre a Fase 1

Aguardo sua confirmação para prosseguir com a implementação.
```

**Ação após resposta**: Aguardar resumo e confirmar entendimento.

---

### Prompt 1.1: Backend - Extensão de API para Posts

```
Perfeito! Agora vamos implementar a Task 1.1: Backend - Extensão de API para Posts.

Por favor, leia a especificação completa em:
~/bazari/docs/specs/IMPLEMENTATION_PROMPTS_FASE1.md

Seção: "Task 1.1: Backend - Extensão de API para Posts"

Depois implemente EXATAMENTE conforme especificado:

1. **Adicionar endpoint de upload de imagem**:
   - Rota: POST /posts/upload-image
   - Arquivo: apps/api/src/routes/posts.ts
   - Validações: jpeg, png, gif, webp; max 5MB
   - Deduplicação por SHA256 hash
   - Salvar em MediaAsset

2. **Adicionar endpoint de rascunhos**:
   - Rota: POST /posts/drafts
   - Salvar com status 'DRAFT'

3. **Atualizar schema Prisma**:
   - Arquivo: apps/api/prisma/schema.prisma
   - Adicionar enum PostStatus (DRAFT, PUBLISHED, ARCHIVED)
   - Adicionar campo status em Post
   - Adicionar campo updatedAt em Post
   - Criar modelo PostLike
   - Criar modelo PostComment (com parentId para respostas)
   - Adicionar índices apropriados

4. **Criar migration**:
   - Nome: add_post_interactions
   - Executar: npx prisma migrate dev

**NÃO MODIFICAR**:
- Endpoint POST /posts existente
- Endpoint DELETE /posts/:id existente

Ao terminar:
1. Me mostre os arquivos modificados/criados
2. Execute: cd apps/api && npx prisma migrate dev --name add_post_interactions
3. Reporte se houve erros
```

**Ação após resposta**:
```bash
# Testar endpoints
cd apps/api
npm run dev

# Em outro terminal, testar upload
curl -X POST http://localhost:3000/posts/upload-image \
  -H "Authorization: Bearer SEU_TOKEN" \
  -F "file=@test.jpg"
```

**Commit após validação**:
```bash
git add .
git commit -m "feat(api): add post upload and draft endpoints

- Add POST /posts/upload-image with image validation
- Add POST /posts/drafts endpoint
- Add PostStatus enum (DRAFT, PUBLISHED, ARCHIVED)
- Add PostLike and PostComment models
- Add post_interactions migration"
```

---

### Prompt 1.2: Frontend - Helper de Upload na API

```
Ótimo! Task 1.1 completa e testada.

Agora Task 1.5 (fazendo antes para ter o helper pronto): Atualizar lib/api.ts

Leia: ~/bazari/docs/specs/IMPLEMENTATION_PROMPTS_FASE1.md (Task 1.5)

Adicione no arquivo apps/web/src/lib/api.ts:

Na seção de apiHelpers (após linha ~296), adicione:

```typescript
// Post images
uploadPostImage: (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return postMultipart<{ url: string }>('/posts/upload-image', formData);
},
```

Valide que:
- TypeScript compila sem erros
- Função é exportada em apiHelpers
```

**Commit após validação**:
```bash
git add apps/web/src/lib/api.ts
git commit -m "feat(web): add uploadPostImage helper to api"
```

---

### Prompt 1.3: Frontend - CreatePostButton Component

```
Perfeito! Agora vamos criar os componentes de criação de posts.

Task 1.2 (parte 1): Criar CreatePostButton

Leia: ~/bazari/docs/specs/IMPLEMENTATION_PROMPTS_FASE1.md (Task 1.2)

Crie o arquivo: apps/web/src/components/social/CreatePostButton.tsx

Use o código EXATO da especificação (está no documento).

Componente deve:
- Botão flutuante fixo (bottom-right mobile, normal desktop)
- Ícone Plus (lucide-react)
- Abrir CreatePostModal ao clicar
- Responsivo (fixed no mobile, normal no desktop)

Ao terminar, me confirme que o arquivo foi criado corretamente.
```

---

### Prompt 1.4: Frontend - CreatePostModal Component

```
Excelente! Agora a parte principal.

Task 1.2 (parte 2): Criar CreatePostModal

Leia: ~/bazari/docs/specs/IMPLEMENTATION_PROMPTS_FASE1.md (Task 1.2)

Crie o arquivo: apps/web/src/components/social/CreatePostModal.tsx

Use o código da especificação como base, mas ajuste:
- usar apiHelpers.uploadPostImage() para upload
- usar apiHelpers.createPost() para publicar
- adicionar todas as features descritas:
  * Textarea com max 5000 caracteres
  * Upload de até 4 imagens (arrastar ou clicar)
  * Preview de imagens com botão remover
  * Toolbar: [📷 Imagem] [😊 Emoji] [@ Mencionar]
  * Contador de caracteres
  * Atalho Ctrl+Enter para publicar
  * Toast de sucesso/erro

Ao terminar:
1. Me confirme que o componente foi criado
2. Valide que não há erros de TypeScript
```

---

### Prompt 1.5: Frontend - Integrar CreatePostButton

```
Ótimo! Componentes criados. Agora vamos integrar.

Task 1.2 (parte 3): Integrar no AppHeader e DashboardPage

Leia: ~/bazari/docs/specs/IMPLEMENTATION_PROMPTS_FASE1.md (Task 1.2)

1. **Integrar no AppHeader**:
   - Arquivo: apps/web/src/components/AppHeader.tsx
   - Adicionar import: import { CreatePostButton } from '@/components/social/CreatePostButton';
   - Adicionar <CreatePostButton /> no canto direito (antes de UserMenu)
   - Linha aproximada: 135-140

2. **Integrar no DashboardPage**:
   - Arquivo: apps/web/src/pages/DashboardPage.tsx
   - Adicionar Card "Quick Post" no topo (após header, antes dos ModuleCards)
   - Avatar + botão "O que você está pensando?"
   - Usar useState para controlar modal

Ao terminar, rode: cd apps/web && npm run dev

Teste no browser:
- Botão aparece no header
- Modal abre ao clicar
- Pode digitar e ver contador
```

**Commit após validação**:
```bash
git add apps/web/src/components/social/
git add apps/web/src/components/AppHeader.tsx
git add apps/web/src/pages/DashboardPage.tsx
git commit -m "feat(web): add post creation UI

- Add CreatePostButton component (floating + desktop)
- Add CreatePostModal with image upload
- Integrate in AppHeader and DashboardPage
- Add keyboard shortcut Ctrl+Enter"
```

---

### Prompt 1.6: Frontend - PostCard Component

```
Excelente! Sistema de criação completo. Agora visualização.

Task 1.3: Criar PostCard Component

Leia: ~/bazari/docs/specs/IMPLEMENTATION_PROMPTS_FASE1.md (Task 1.3)

Crie o arquivo: apps/web/src/components/social/PostCard.tsx

Use o código da especificação. Componente deve:
- Header: Avatar + Nome + Handle + Timestamp + Menu
- Content: Texto com whitespace-pre-wrap
- Media: Grid de imagens (1: 1col, 2: 2cols, 3+: 2cols)
- Actions: Botões Like/Comment/Share (sem funcionalidade ainda)
- Links clicáveis para perfil
- Timestamp formatado (date-fns)
- Imagens com lazy loading

Ao terminar:
1. Confirme que o componente foi criado
2. Instale date-fns se necessário: cd apps/web && npm install date-fns
```

---

### Prompt 1.7: Frontend - Integrar PostCard no ProfilePublicPage

```
Perfeito! Agora vamos usar o PostCard.

Task 1.3 (parte 2): Atualizar ProfilePublicPage

Leia: ~/bazari/docs/specs/IMPLEMENTATION_PROMPTS_FASE1.md (Task 1.3)

Arquivo: apps/web/src/pages/ProfilePublicPage.tsx

Na seção "tab === 'posts'" (linha ~222-237):
1. Importar PostCard: import { PostCard } from '@/components/social/PostCard';
2. Substituir o Card genérico por PostCard
3. Transformar dados do post para o formato correto

Use o exemplo da especificação como referência.

Ao terminar, teste:
1. Abrir perfil de alguém com posts
2. Ver posts renderizados com PostCard
3. Clicar no avatar/nome → navega para perfil
```

**Commit após validação**:
```bash
git add apps/web/src/components/social/PostCard.tsx
git add apps/web/src/pages/ProfilePublicPage.tsx
git commit -m "feat(web): add PostCard component

- Add PostCard with avatar, content, media
- Format timestamp with date-fns
- Add lazy loading for images
- Integrate in ProfilePublicPage"
```

---

### Prompt 1.8: Frontend - UserMenu Component

```
Ótimo! Agora vamos criar o menu de usuário no header.

Task 1.4: Criar UserMenu Component

Leia: ~/bazari/docs/specs/IMPLEMENTATION_PROMPTS_FASE1.md (Task 1.4)

Crie o arquivo: apps/web/src/components/UserMenu.tsx

Use o código da especificação. Componente deve:
- Dropdown menu com avatar
- Carregar perfil via apiHelpers.getMeProfile()
- Header: Nome + Handle + Badge de reputação
- Items do menu:
  1. Meu Perfil
  2. Editar Perfil
  3. Minhas Lojas
  4. Estatísticas
  5. Tema (toggle)
  6. Configurações
  7. Sair
- Loading state: skeleton circular
- Logout: limpar localStorage + navegar para "/"

Ao terminar, confirme que o componente foi criado.
```

---

### Prompt 1.9: Frontend - Integrar UserMenu no AppHeader

```
Perfeito! Agora vamos integrar o UserMenu.

Task 1.4 (parte 2): Integrar no AppHeader

Arquivo: apps/web/src/components/AppHeader.tsx

1. Adicionar import: import { UserMenu } from './UserMenu';
2. Substituir comentário {/* <UserMenu /> */} por <UserMenu />
3. Linha aproximada: 136

Ao terminar, teste:
1. Reload da página
2. Menu com avatar aparece no header
3. Clicar abre o dropdown
4. Links funcionam
5. Logout redireciona para landing page
```

**Commit após validação**:
```bash
git add apps/web/src/components/UserMenu.tsx
git add apps/web/src/components/AppHeader.tsx
git commit -m "feat(web): add UserMenu component

- Add dropdown menu with user info
- Show reputation badge
- Add theme toggle
- Add logout functionality
- Integrate in AppHeader"
```

---

### Prompt 1.10: Validação Completa Fase 1

```
Excelente trabalho! Agora vamos validar tudo.

Execute o Checklist Final da Fase 1:

Leia: ~/bazari/docs/specs/IMPLEMENTATION_PROMPTS_FASE1.md (Checklist Final)

Valide cada item e reporte:

**Backend**:
- [ ] Migration executada com sucesso
- [ ] POST /posts/upload-image funciona
- [ ] POST /posts/drafts funciona
- [ ] Modelos PostLike e PostComment criados

**Frontend**:
- [ ] CreatePostButton renderiza
- [ ] CreatePostModal abre/fecha
- [ ] Upload de imagem funciona
- [ ] PostCard renderiza posts
- [ ] UserMenu aparece no header
- [ ] Links todos funcionam

**UX**:
- [ ] Atalho Ctrl+Enter funciona
- [ ] Toast de sucesso/erro aparece
- [ ] Loading states corretos
- [ ] Mobile responsivo
- [ ] Dark mode funciona

**Performance**:
- [ ] Imagens com lazy loading
- [ ] No memory leaks (useEffect cleanup)

**Regressão**:
- [ ] Páginas existentes ainda funcionam
- [ ] POST /posts original não quebrou
- [ ] ProfilePublicPage carrega posts
- [ ] Logout funciona

Reporte quais items passaram ✅ e quais falharam ❌
```

**Ação após validação**:
```bash
# Se tudo OK, criar PR
git push origin feature/social-ux-phase1
gh pr create --title "feat: Social UX Phase 1 - Fundações" --body "
## Fase 1: Fundações

Implementa sistema de criação e visualização de posts.

### Componentes
- CreatePostButton + CreatePostModal
- PostCard
- UserMenu

### Backend
- POST /posts/upload-image
- POST /posts/drafts
- Modelos PostLike, PostComment

### Testes
- [x] Upload de imagem
- [x] Criação de posts
- [x] Visualização de posts
- [x] Menu de usuário

Closes #XXX
"
```

---

## 🎯 FASE 2: Discovery & Engajamento

### Prompt 2.0: Contexto Fase 2

```
Ótimo! Fase 1 completa e validada.

Agora vamos para a Fase 2: Discovery & Engajamento.

Por favor:
1. Leia ~/bazari/docs/specs/IMPLEMENTATION_PROMPTS_FASE2.md (introdução)
2. Me dê um resumo do que vamos implementar na Fase 2

Aguardo confirmação para começar.
```

---

### Prompt 2.1: Backend - Global Search API

```
Perfeito! Vamos começar com a busca global.

Task 2.1: Backend - Global Search API

Leia: ~/bazari/docs/specs/IMPLEMENTATION_PROMPTS_FASE2.md (Task 2.1)

Implemente:

1. **Criar rota de busca**:
   - Arquivo: apps/api/src/routes/search.ts (NOVO)
   - Endpoint: GET /search/global
   - Query params: q, type, limit
   - Validação com Zod

2. **Lógica de busca**:
   - Profiles: handle e displayName (case-insensitive)
   - Posts: content (apenas PUBLISHED)
   - Stores: shopName e shopSlug
   - Products: title e description

3. **Registrar rota**:
   - Arquivo: apps/api/src/server.ts
   - Importar e registrar globalSearchRoutes

Ao terminar:
1. Mostre os arquivos criados/modificados
2. Teste com curl conforme especificação
```

**Commit após validação**:
```bash
git add apps/api/src/routes/search.ts
git add apps/api/src/server.ts
git commit -m "feat(api): add global search endpoint

- Add GET /search/global with multi-type search
- Support profiles, posts, stores, products
- Case-insensitive search with limit"
```

---

### Prompt 2.2: Frontend - useDebounce Hook

```
Ótimo! Agora vamos criar o hook de debounce.

Task 2.2 (parte 1): Criar useDebounce

Leia: ~/bazari/docs/specs/IMPLEMENTATION_PROMPTS_FASE2.md (Task 2.2)

Crie o arquivo: apps/web/src/hooks/useDebounce.ts

Use o código da especificação (SOCIAL_UX_FASE2-8.md).

Hook deve:
- Ser genérico: useDebounce<T>
- Delay configurável
- Cleanup do timeout

Confirme quando criado.
```

---

### Prompt 2.3: Frontend - GlobalSearchBar Component

```
Perfeito! Agora o componente de busca.

Task 2.2 (parte 2): Criar GlobalSearchBar

Leia: ~/bazari/docs/specs/IMPLEMENTATION_PROMPTS_FASE2.md (Task 2.2)

Crie o arquivo: apps/web/src/components/GlobalSearchBar.tsx

Use o código da especificação (SOCIAL_UX_FASE2-8.md).

Componente deve:
- Input com ícone Search
- Debounce de 300ms
- Dropdown com resultados agrupados
- Fecha ao clicar fora (useRef)
- Loading spinner
- Empty state

Adicione helper em lib/api.ts:
- globalSearch: (query: string) => getJSON(...)

Ao terminar, teste:
1. Digitar na barra
2. Ver resultados aparecerem
3. Clicar em resultado → navega
```

---

### Prompt 2.4: Frontend - Integrar GlobalSearchBar

```
Ótimo! Agora integrar no header.

Task 2.2 (parte 3): Integrar no AppHeader

Arquivo: apps/web/src/components/AppHeader.tsx

Adicionar GlobalSearchBar no centro do nav, entre logo e links:

```tsx
<div className="hidden md:block flex-1 max-w-md mx-4">
  <GlobalSearchBar />
</div>
```

Ao terminar, teste no browser:
- Barra aparece no centro
- Busca funciona
- Resultados aparecem em tempo real
```

**Commit após validação**:
```bash
git add apps/web/src/hooks/useDebounce.ts
git add apps/web/src/components/GlobalSearchBar.tsx
git add apps/web/src/lib/api.ts
git add apps/web/src/components/AppHeader.tsx
git commit -m "feat(web): add global search bar

- Add useDebounce hook (300ms)
- Add GlobalSearchBar with autocomplete
- Show results grouped by type
- Integrate in AppHeader"
```

---

### Prompt 2.5: Backend - Sistema de Likes

```
Excelente! Busca completa. Agora likes.

Task 2.3: Backend - Sistema de Likes

Leia: ~/bazari/docs/specs/IMPLEMENTATION_PROMPTS_FASE2.md (Task 2.3)

Arquivo: apps/api/src/routes/posts.ts

Adicione:

1. **POST /posts/:id/like**:
   - Criar PostLike
   - Idempotente (unique constraint)
   - Rate limit: 100/min
   - Retornar: { liked: true, likesCount: number }

2. **DELETE /posts/:id/like**:
   - Remover PostLike
   - Retornar contador atualizado

3. **Atualizar GET /posts/:id**:
   - Include _count: { likes, comments }
   - Adicionar isLiked (verificar se authUser curtiu)

Ao terminar, teste com curl conforme especificação.
```

**Commit após validação**:
```bash
git add apps/api/src/routes/posts.ts
git commit -m "feat(api): add like system for posts

- Add POST /posts/:id/like endpoint
- Add DELETE /posts/:id/like endpoint
- Update GET /posts/:id with likes count
- Add idempotent like logic"
```

---

### Prompt 2.6: Frontend - LikeButton Component

```
Perfeito! Agora o botão de like.

Task 2.4: Frontend - LikeButton

Leia: ~/bazari/docs/specs/IMPLEMENTATION_PROMPTS_FASE2.md (Task 2.4)

Crie o arquivo: apps/web/src/components/social/LikeButton.tsx

Use o código da especificação (SOCIAL_UX_FASE2-8.md).

Componente deve:
- Atualização otimística
- Reverte em erro (toast)
- Coração preenchido quando liked
- Cor vermelha quando liked
- Contador animado
- Desabilitado durante loading

Adicione helpers em lib/api.ts:
- likePost: (postId) => postJSON(...)
- unlikePost: (postId) => deleteJSON(...)

Ao terminar, teste:
1. Clicar em like → resposta imediata
2. Coração preenche/esvazia
3. Contador atualiza
```

---

### Prompt 2.7: Frontend - Integrar LikeButton no PostCard

```
Ótimo! Agora integrar no PostCard.

Task 2.4 (parte 2): Integrar LikeButton

Arquivo: apps/web/src/components/social/PostCard.tsx

Substituir o botão estático de like por:

```tsx
import { LikeButton } from './LikeButton';

// No lugar do botão de like:
<LikeButton
  postId={post.id}
  initialLiked={post.isLiked}
  initialCount={post.likesCount || 0}
/>
```

Ao terminar, teste no browser:
- Like funciona
- Atualização otimística
- Toast em erro
```

**Commit após validação**:
```bash
git add apps/web/src/components/social/LikeButton.tsx
git add apps/web/src/components/social/PostCard.tsx
git add apps/web/src/lib/api.ts
git commit -m "feat(web): add like button with optimistic updates

- Add LikeButton component
- Implement optimistic UI updates
- Add error handling with toast
- Integrate in PostCard"
```

---

### Prompt 2.8: Backend - Sistema de Comments

```
Excelente! Likes completo. Agora comments.

Task 2.5: Backend - Sistema de Comments

Leia: ~/bazari/docs/specs/IMPLEMENTATION_PROMPTS_FASE2.md (Task 2.5)

Arquivo: apps/api/src/routes/posts.ts

Adicione:

1. **POST /posts/:id/comments**:
   - Criar PostComment
   - Validar content (1-1000 chars)
   - Suportar parentId (respostas)
   - Rate limit: 30/5min
   - Retornar comment com autor

2. **GET /posts/:id/comments**:
   - Paginação cursor-based
   - Apenas top-level (parentId: null)
   - Include replies (primeiras 5)
   - Retornar: { items, page }

Ao terminar, teste com curl conforme especificação.
```

**Commit após validação**:
```bash
git add apps/api/src/routes/posts.ts
git commit -m "feat(api): add comments system

- Add POST /posts/:id/comments endpoint
- Add GET /posts/:id/comments with pagination
- Support nested replies (1 level)
- Add rate limiting"
```

---

### Prompt 2.9: Frontend - CommentSection Component

```
Perfeito! Agora a seção de comentários.

Task 2.6: Frontend - CommentSection

Leia: ~/bazari/docs/specs/IMPLEMENTATION_PROMPTS_FASE2.md (Task 2.6)

Crie o arquivo: apps/web/src/components/social/CommentSection.tsx

Use o código da especificação (SOCIAL_UX_FASE2-8.md).

Componente deve:
- Formulário de comentário (top)
- Lista de comentários
- Respostas com indentação (border-left)
- Avatar + nome + timestamp
- Loading state
- Empty state

Adicione helpers em lib/api.ts:
- getPostComments: (postId, params?) => getJSON(...)
- createPostComment: (postId, data) => postJSON(...)

Ao terminar, teste:
1. Criar comentário
2. Ver comentário aparecer no topo
3. Respostas renderizadas com indent
```

**Commit após validação**:
```bash
git add apps/web/src/components/social/CommentSection.tsx
git add apps/web/src/lib/api.ts
git commit -m "feat(web): add comment section

- Add CommentSection with form and list
- Support nested replies with indentation
- Add loading and empty states
- Format timestamps"
```

---

### Prompt 2.10: Backend - Sistema de Notificações (Migration)

```
Excelente! Comments completo. Agora notificações.

Task 2.7 (parte 1): Backend - Notificações Migration

Leia: ~/bazari/docs/specs/IMPLEMENTATION_PROMPTS_FASE2.md (Task 2.7)

Arquivo: apps/api/prisma/schema.prisma

Adicione:

1. **Enum NotificationType**:
   - FOLLOW, LIKE, COMMENT, MENTION, BADGE, REPUTATION

2. **Modelo Notification**:
   - id, userId, type, actorId, targetId, metadata, read, createdAt
   - Relações: User, Profile (actor)
   - Índices: (userId, read, createdAt), (createdAt)

3. **Atualizar Profile**:
   - Adicionar: notificationsReceived Notification[]

4. **Atualizar User**:
   - Adicionar: notifications Notification[]

Criar migration:
```bash
cd apps/api
npx prisma migrate dev --name add_notifications
```

Ao terminar, confirme que migration foi criada com sucesso.
```

---

### Prompt 2.11: Backend - Notificações Routes

```
Perfeito! Migration criada. Agora as rotas.

Task 2.7 (parte 2): Backend - Notificações Routes

Leia: ~/bazari/docs/specs/IMPLEMENTATION_PROMPTS_FASE2.md (Task 2.7)

Crie o arquivo: apps/api/src/routes/notifications.ts (NOVO)

Use o código da especificação (SOCIAL_UX_FASE2-8.md).

Endpoints:
- GET /notifications
- POST /notifications/mark-all-read
- POST /notifications/:id/read

Registrar rota em server.ts.

Ao terminar, teste com curl.
```

---

### Prompt 2.12: Backend - Helper createNotification

```
Ótimo! Rotas criadas. Agora o helper.

Task 2.7 (parte 3): Backend - Helper createNotification

Crie o arquivo: apps/api/src/lib/notifications.ts (NOVO)

Use o código da especificação (SOCIAL_UX_FASE2-8.md).

Função:
```typescript
createNotification(prisma, {
  userId, type, actorId?, targetId?, metadata?
})
```

Validar: não notificar a si mesmo.

Confirme quando criado.
```

---

### Prompt 2.13: Backend - Integrar Notificações

```
Perfeito! Agora integrar em endpoints existentes.

Task 2.7 (parte 4): Backend - Integrar createNotification

Leia: ~/bazari/docs/specs/IMPLEMENTATION_PROMPTS_FASE2.md (Task 2.7)

Adicione createNotification em:

1. **POST /social/follow** (apps/api/src/routes/social.ts):
   - Tipo: FOLLOW
   - Notificar: target.userId
   - Actor: meProfile.id

2. **POST /posts/:id/like** (apps/api/src/routes/posts.ts):
   - Tipo: LIKE
   - Notificar: post.author.userId
   - Actor: meProfile.id
   - TargetId: post.id

3. **POST /posts/:id/comments** (apps/api/src/routes/posts.ts):
   - Tipo: COMMENT
   - Notificar: post.author.userId
   - Actor: meProfile.id
   - TargetId: post.id

Ao terminar, teste criando follow/like/comment e verificando GET /notifications.
```

**Commit após validação**:
```bash
git add apps/api/prisma/schema.prisma
git add apps/api/src/routes/notifications.ts
git add apps/api/src/lib/notifications.ts
git add apps/api/src/routes/social.ts
git add apps/api/src/routes/posts.ts
git add apps/api/src/server.ts
git commit -m "feat(api): add notification system

- Add Notification model and migration
- Add notification endpoints
- Add createNotification helper
- Integrate in follow, like, comment actions"
```

---

### Prompt 2.14: Frontend - NotificationCenter Component

```
Excelente! Backend de notificações completo.

Task 2.8: Frontend - NotificationCenter

Leia: ~/bazari/docs/specs/IMPLEMENTATION_PROMPTS_FASE2.md (Task 2.8)

Crie o arquivo: apps/web/src/components/NotificationCenter.tsx

Use o código da especificação (SOCIAL_UX_FASE2-8.md).

Componente deve:
- Ícone Bell com badge de contador
- Dropdown com últimas 10 notificações
- Botão "Marcar tudo como lido"
- Polling a cada 30 segundos
- Destaque em não lidas (bg-accent)
- Mensagens por tipo (FOLLOW, LIKE, COMMENT, BADGE)

Adicione helpers em lib/api.ts:
- getNotifications: (params?) => getJSON(...)
- markAllNotificationsRead: () => postJSON(...)

Ao terminar, teste:
1. Ver notificações carregarem
2. Badge mostra contador
3. Polling funciona (30s)
4. Marcar como lido funciona
```

---

### Prompt 2.15: Frontend - Integrar NotificationCenter

```
Perfeito! Agora integrar no header.

Task 2.8 (parte 2): Integrar NotificationCenter

Arquivo: apps/web/src/components/AppHeader.tsx

Adicionar antes de UserMenu:

```tsx
import { NotificationCenter } from './NotificationCenter';

// Na linha ~135, antes de <UserMenu />:
<NotificationCenter />
```

Ao terminar, teste no browser:
- Badge com contador aparece
- Notificações carregam ao clicar
- Polling atualiza a cada 30s
- Links navegam corretamente
```

**Commit após validação**:
```bash
git add apps/web/src/components/NotificationCenter.tsx
git add apps/web/src/lib/api.ts
git add apps/web/src/components/AppHeader.tsx
git commit -m "feat(web): add notification center

- Add NotificationCenter with badge counter
- Implement polling every 30s
- Add mark all as read functionality
- Integrate in AppHeader"
```

---

### Prompt 2.16: Validação Completa Fase 2

```
Excelente trabalho! Fase 2 implementada.

Execute o Checklist Final da Fase 2:

Leia: ~/bazari/docs/specs/IMPLEMENTATION_PROMPTS_FASE2.md (Checklist Final)

Valide cada item e reporte:

**Backend**:
- [ ] GET /search/global funciona
- [ ] POST /posts/:id/like funciona
- [ ] POST /posts/:id/comments funciona
- [ ] GET /notifications funciona
- [ ] Notificações criadas automaticamente

**Frontend**:
- [ ] GlobalSearchBar busca e mostra resultados
- [ ] LikeButton atualiza otimisticamente
- [ ] CommentSection cria e lista comentários
- [ ] NotificationCenter mostra notificações
- [ ] Polling funciona (30s)

**UX**:
- [ ] Debounce de busca (300ms)
- [ ] Atualização otimista em likes
- [ ] Toast de sucesso/erro
- [ ] Loading states corretos

**Regressão**:
- [ ] Fase 1 ainda funciona
- [ ] Posts são criados
- [ ] PostCard renderiza

Reporte resultados.
```

**Ação após validação**:
```bash
# Criar PR
git push origin feature/social-ux-phase2
gh pr create --title "feat: Social UX Phase 2 - Discovery & Engajamento" --body "
## Fase 2: Discovery & Engajamento

Implementa busca, likes, comments e notificações.

### Features
- GlobalSearchBar com autocomplete
- Sistema de likes com UI otimista
- Comments com respostas
- Centro de notificações com polling

### Backend
- GET /search/global
- POST /posts/:id/like
- POST /posts/:id/comments
- GET /notifications

### Testes
- [x] Busca global
- [x] Likes otimistas
- [x] Comentários
- [x] Notificações em tempo real

Closes #XXX
"
```

---

## 🎯 FASE 3-8: Prompts Resumidos

### Prompt 3.0: Fase 3 - Experiência Visual

```
Fase 2 completa! Agora Fase 3: Experiência Visual.

Vamos implementar melhorias visuais:
1. ProfileHoverCard (preview ao passar mouse)
2. BadgeIcon (ícones para badges)
3. ReputationChart (gráfico de evolução)
4. Loading Skeletons (shimmer animations)

Esta fase é mais leve. Vamos uma por uma?

Confirme para começar com ProfileHoverCard.
```

### Prompt 4.0: Fase 4 - Navegação Avançada

```
Fase 3 completa! Agora Fase 4: Navegação Avançada.

Vamos implementar:
1. Command Palette (CMD+K) - biblioteca cmdk
2. Quick Actions Toolbar
3. Smart Breadcrumbs
4. Activity Timeline

Começamos com Command Palette (a mais complexa)?

Confirme para prosseguir.
```

### Prompt 5.0: Fase 5 - Features Sociais Avançadas

```
Fase 4 completa! Agora Fase 5: Features Sociais Avançadas.

Esta é a maior fase. Vamos implementar:
1. Timeline/Feed Inteligente (algoritmo de recomendação)
2. Menções & Hashtags (parser e indexação)
3. Reshare/Repost (Quote e Boost)
4. Direct Messages (chat 1:1)

Esta fase requer várias mudanças no backend.
Começamos com Timeline?

Confirme para prosseguir.
```

---

## 📝 Notas Finais

### ✅ Como Usar Este Documento

1. **Copie e cole** cada prompt sequencialmente
2. **Aguarde conclusão** antes do próximo
3. **Valide** após cada task
4. **Commit** quando validado
5. **Não pule** etapas

### ⚠️ Troubleshooting

Se algo der errado:
1. Leia a especificação original
2. Verifique logs do backend/frontend
3. Rode testes: `npm test`
4. Consulte checklist de validação

### 📞 Suporte

Documentação completa em:
- `~/bazari/docs/specs/IMPLEMENTATION_SUMMARY.md`
- `~/bazari/docs/specs/IMPLEMENTATION_PROMPTS_FASE1.md`
- `~/bazari/docs/specs/IMPLEMENTATION_PROMPTS_FASE2.md`

---

**Última atualização**: 2025-01-09
**Versão**: 1.0.0
