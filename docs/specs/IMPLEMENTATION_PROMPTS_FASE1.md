# Prompts de Implementação - FASE 1: Fundações

**Versão**: 1.0.0
**Data**: 2025-01-09

---

## 📋 Visão Geral

Este documento contém prompts estruturados para implementar a **Fase 1: Fundações** do sistema social/perfil, conforme especificado em `SOCIAL_UX_IMPROVEMENTS.md`.

### Pré-requisitos
- Repositório: `~/bazari`
- Branch base: `main`
- Node.js 18+
- PostgreSQL rodando
- API rodando em `http://localhost:3000`

---

## 🎯 Task 1.1: Backend - Extensão de API para Posts

### Prompt

```
Contexto: Estou implementando melhorias no sistema social do Bazari. Atualmente existe um endpoint POST /posts que cria posts, mas preciso adicionar funcionalidades de upload de imagem e rascunhos.

Repositório: ~/bazari/apps/api

Tarefas:

1. **Adicionar endpoint de upload de imagem**:
   - Rota: POST /posts/upload-image
   - Middleware: authOnRequest
   - Rate limit: 10 uploads por minuto
   - Validações:
     * Tipos permitidos: jpeg, png, gif, webp
     * Tamanho máximo: 5MB
   - Salvar arquivo em /uploads com hash SHA256
   - Criar registro em MediaAsset com deduplicação por hash
   - Retornar: { url: string }

2. **Adicionar endpoint de rascunhos**:
   - Rota: POST /posts/drafts
   - Salvar post com status 'draft' (adicionar enum PostStatus)
   - Permitir edição posterior

3. **Atualizar schema Prisma**:
   - Adicionar enum PostStatus (DRAFT, PUBLISHED, ARCHIVED)
   - Adicionar campo status: PostStatus @default(PUBLISHED) em Post
   - Adicionar campo updatedAt: DateTime @updatedAt em Post
   - Criar modelos:
     * PostLike (id, postId, userId, createdAt)
     * PostComment (id, postId, authorId, content, parentId, createdAt, updatedAt)
   - Adicionar índices apropriados

4. **Criar migration**:
   - Nome: add_post_interactions
   - Executar: npx prisma migrate dev

Arquivo para modificar: apps/api/src/routes/posts.ts
Arquivo para criar: apps/api/prisma/migrations/XXXXXX_add_post_interactions/

Não modificar:
- Endpoint POST /posts existente (manter compatibilidade)
- Endpoint DELETE /posts/:id existente

Validar que:
- Upload funciona com curl/Postman
- Hash deduplica imagens idênticas
- Rascunhos não aparecem em listagens públicas
```

### Comandos de Teste

```bash
# Teste de upload
curl -X POST http://localhost:3000/posts/upload-image \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test.jpg"

# Teste de rascunho
curl -X POST http://localhost:3000/posts/drafts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Meu rascunho",
    "media": [{"url": "/uploads/test.jpg", "type": "image"}]
  }'
```

---

## 🎯 Task 1.2: Frontend - Componente CreatePostModal

### Prompt

```
Contexto: Preciso criar um modal flutuante para criação de posts no sistema social do Bazari. O backend já possui os endpoints necessários.

Repositório: ~/bazari/apps/web

Tarefas:

1. **Criar CreatePostButton.tsx**:
   - Localização: src/components/social/CreatePostButton.tsx
   - Botão flutuante fixo (bottom-right no mobile, normal no desktop)
   - Ícone: Plus (lucide-react)
   - Classes: fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg
   - Desktop: botão normal com texto "Criar Post"
   - Abre CreatePostModal ao clicar

2. **Criar CreatePostModal.tsx**:
   - Localização: src/components/social/CreatePostModal.tsx
   - Props: open: boolean, onOpenChange: (open: boolean) => void
   - Componentes shadcn/ui: Dialog, DialogContent, DialogHeader, DialogTitle
   - Features:
     * Textarea com max 5000 caracteres
     * Upload de até 4 imagens (arrastar ou clicar)
     * Preview de imagens com botão remover
     * Toolbar: [📷 Imagem] [😊 Emoji] [@ Mencionar]
     * Contador de caracteres (0/5000)
     * Botão "Publicar" (desabilitado se vazio)
     * Atalho: Ctrl+Enter para publicar
     * Toast de sucesso/erro (sonner)
   - Chamadas API:
     * POST /posts/upload-image (para cada imagem)
     * POST /posts (para publicar)
   - Estado local: content, images[], loading

3. **Integrar no AppHeader**:
   - Adicionar import de CreatePostButton
   - Renderizar no canto direito (ao lado de UserMenu)

4. **Integrar no DashboardPage**:
   - Adicionar card "Quick Post" no topo
   - Avatar + botão "O que você está pensando?"
   - Abre CreatePostModal ao clicar

Arquivos para criar:
- src/components/social/CreatePostButton.tsx
- src/components/social/CreatePostModal.tsx

Arquivos para modificar:
- src/components/AppHeader.tsx (adicionar botão)
- src/pages/DashboardPage.tsx (adicionar quick post)

Não modificar:
- Rotas existentes em App.tsx
- Componentes existentes de perfil

Validar que:
- Modal abre/fecha corretamente
- Upload de imagem funciona
- Preview de imagens aparece
- Contador de caracteres atualiza
- Atalho Ctrl+Enter funciona
- Toast aparece em sucesso/erro
```

### Exemplo de Uso

```typescript
// No AppHeader.tsx
import { CreatePostButton } from '@/components/social/CreatePostButton';

// Adicionar na linha ~140 (ao lado de UserMenu)
<CreatePostButton />
```

---

## 🎯 Task 1.3: Frontend - Componente PostCard

### Prompt

```
Contexto: Preciso criar um card interativo para exibir posts no sistema social do Bazari. O card deve mostrar autor, conteúdo, imagens e ações (like, comment, share).

Repositório: ~/bazari/apps/web

Tarefas:

1. **Criar PostCard.tsx**:
   - Localização: src/components/social/PostCard.tsx
   - Props: post (PostCardProps interface)
   - Componentes shadcn/ui: Card, CardContent, Button
   - Layout:
     * Header: Avatar + Nome + Handle + Timestamp + Menu (...)
     * Content: Texto com quebra de linha (whitespace-pre-wrap)
     * Media: Grid de imagens (1: 1col, 2: 2cols, 3+: 2cols)
     * Actions: [❤️ Like] [💬 Comment] [🔄 Share] com contadores
   - Funcionalidades:
     * Avatar/Nome clicáveis → Link para /u/:handle
     * Timestamp formatado com date-fns (formatDistanceToNow, locale ptBR)
     * Imagens com lazy loading
     * Botões de ação (ainda sem funcionalidade, apenas visual)
   - Ícones: Heart, MessageCircle, Repeat2, MoreHorizontal (lucide-react)

2. **Criar interface TypeScript**:
   ```typescript
   interface PostCardProps {
     post: {
       id: string;
       author: {
         handle: string;
         displayName: string;
         avatarUrl?: string | null;
       };
       content: string;
       media?: Array<{ url: string; type: string }>;
       createdAt: string;
       likesCount?: number;
       commentsCount?: number;
       repostsCount?: number;
     };
   }
   ```

3. **Atualizar ProfilePublicPage.tsx**:
   - Importar PostCard
   - Na tab "Posts", substituir Card genérico por PostCard
   - Passar dados do post transformados para o formato correto

Arquivos para criar:
- src/components/social/PostCard.tsx

Arquivos para modificar:
- src/pages/ProfilePublicPage.tsx (usar PostCard)

Não modificar:
- Lógica de paginação existente
- Tabs existentes

Validar que:
- Card renderiza corretamente
- Links para perfil funcionam
- Imagens carregam com lazy loading
- Timestamp mostra "há X minutos/horas"
- Grid de imagens adapta ao número de itens
```

### Exemplo de Uso

```typescript
// No ProfilePublicPage.tsx, substituir:
<Card key={post.id}>
  <CardContent className="py-4">
    <p>{post.content}</p>
  </CardContent>
</Card>

// Por:
<PostCard
  key={post.id}
  post={{
    id: post.id,
    author: {
      handle: p.handle,
      displayName: p.displayName,
      avatarUrl: p.avatarUrl
    },
    content: post.content,
    media: post.media as any,
    createdAt: post.createdAt,
    likesCount: 0,
    commentsCount: 0,
    repostsCount: 0
  }}
/>
```

---

## 🎯 Task 1.4: Frontend - Componente UserMenu

### Prompt

```
Contexto: Preciso criar um dropdown menu com avatar do usuário no header da aplicação. O menu deve mostrar informações do perfil e links para navegação.

Repositório: ~/bazari/apps/web

Tarefas:

1. **Criar UserMenu.tsx**:
   - Localização: src/components/UserMenu.tsx
   - Componentes shadcn/ui: DropdownMenu, DropdownMenuContent, DropdownMenuItem, etc
   - Features:
     * Trigger: Avatar circular (ou ícone User se sem avatar)
     * Carregar perfil via apiHelpers.getMeProfile() ao montar
     * Header do menu:
       - Nome do usuário
       - @handle
       - Badge de reputação (se existir)
     * Items do menu:
       1. Meu Perfil (Link /u/:handle)
       2. Editar Perfil (Link /app/profile/edit)
       3. Minhas Lojas (Link /app/sellers)
       4. Estatísticas (Link /app/stats)
       5. --- separador ---
       6. Tema: Escuro/Claro (toggle com useTheme)
       7. Configurações (Link /app/settings)
       8. --- separador ---
       9. Sair (onClick: logout)
   - Ícones: User, Edit, Store, BarChart3, Moon, Settings, LogOut
   - Loading state: skeleton circular animado

2. **Implementar logout**:
   - Limpar localStorage (accessToken)
   - Navegar para "/"

3. **Integrar no AppHeader.tsx**:
   - Substituir comentário {/* <UserMenu /> */} por <UserMenu />
   - Posicionar à direita (substituir ou adicionar ao lado de ThemeSwitcher)

Arquivos para criar:
- src/components/UserMenu.tsx

Arquivos para modificar:
- src/components/AppHeader.tsx (adicionar UserMenu)

Não modificar:
- Navegação existente
- ThemeSwitcher existente (pode conviver ou ser substituído)

Validar que:
- Menu abre ao clicar no avatar
- Perfil carrega corretamente
- Links funcionam
- Toggle de tema funciona
- Logout redireciona para landing page
- Loading state aparece antes de carregar perfil
```

### Exemplo de Uso

```typescript
// No AppHeader.tsx, linha ~136
// Substituir:
{/* <UserMenu /> */}

// Por:
import { UserMenu } from './UserMenu';

<UserMenu />
```

---

## 🎯 Task 1.5: Atualizar lib/api.ts com helper de upload

### Prompt

```
Contexto: Preciso adicionar um helper na biblioteca de API para fazer upload de imagens de posts.

Repositório: ~/bazari/apps/web

Tarefas:

1. **Adicionar método em apiHelpers**:
   - Localização: src/lib/api.ts
   - Função: uploadPostImage(file: File): Promise<{ url: string }>
   - Usar postMultipart('/posts/upload-image', formData)
   - FormData com campo 'file'

Código a adicionar (após linha ~296):
```typescript
// Post images
uploadPostImage: (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return postMultipart<{ url: string }>('/posts/upload-image', formData);
},
```

Arquivos para modificar:
- src/lib/api.ts

Não modificar:
- Outros helpers existentes
- Função postMultipart (já existe)

Validar que:
- TypeScript compila sem erros
- Função é exportada em apiHelpers
```

---

## 🎯 Task 1.6: Testes Automatizados

### Prompt

```
Contexto: Preciso criar testes automatizados para os novos componentes da Fase 1.

Repositório: ~/bazari/apps/web

Tarefas:

1. **Criar testes para CreatePostModal**:
   - Arquivo: src/components/social/__tests__/CreatePostModal.test.tsx
   - Framework: Vitest + React Testing Library
   - Testes:
     * Renderiza corretamente
     * Textarea atualiza ao digitar
     * Contador de caracteres funciona
     * Botão "Publicar" desabilitado quando vazio
     * Limite de 5000 caracteres é respeitado
     * Callback onOpenChange é chamado ao fechar

2. **Criar testes para PostCard**:
   - Arquivo: src/components/social/__tests__/PostCard.test.tsx
   - Testes:
     * Renderiza autor, conteúdo e timestamp
     * Links para perfil estão corretos
     * Imagens são renderizadas
     * Contadores aparecem corretamente

3. **Criar testes para UserMenu**:
   - Arquivo: src/components/__tests__/UserMenu.test.tsx
   - Testes:
     * Renderiza avatar
     * Menu abre ao clicar
     * Links estão corretos
     * Logout funciona

Arquivos para criar:
- src/components/social/__tests__/CreatePostModal.test.tsx
- src/components/social/__tests__/PostCard.test.tsx
- src/components/__tests__/UserMenu.test.tsx

Comando para rodar:
```bash
cd apps/web
npm test -- CreatePostModal
npm test -- PostCard
npm test -- UserMenu
```

Validar que:
- Todos os testes passam
- Cobertura >= 80%
```

---

## 🎯 Task 1.7: Testes de Integração Backend

### Prompt

```
Contexto: Preciso criar testes de integração para os novos endpoints de posts.

Repositório: ~/bazari/apps/api

Tarefas:

1. **Criar testes para upload de imagem**:
   - Arquivo: src/routes/__tests__/posts.upload.test.ts
   - Framework: Tap (já usado no projeto)
   - Testes:
     * POST /posts/upload-image retorna 200 e URL
     * Rejeita tipos de arquivo inválidos
     * Rejeita arquivos > 5MB
     * Deduplica imagens idênticas (mesmo hash)

2. **Criar testes para rascunhos**:
   - Arquivo: src/routes/__tests__/posts.drafts.test.ts
   - Testes:
     * POST /posts/drafts salva rascunho
     * Rascunhos não aparecem em GET /profiles/:handle/posts

Arquivos para criar:
- src/routes/__tests__/posts.upload.test.ts
- src/routes/__tests__/posts.drafts.test.ts

Comando para rodar:
```bash
cd apps/api
npm test -- posts.upload
npm test -- posts.drafts
```

Validar que:
- Todos os testes passam
- Database limpo entre testes (transaction rollback)
```

---

## 📋 Checklist Final - Fase 1

Após implementar todas as tasks acima, validar:

### Backend
- [ ] Migration executada com sucesso
- [ ] POST /posts/upload-image funciona
- [ ] POST /posts/drafts funciona
- [ ] Modelos PostLike e PostComment criados
- [ ] Testes de integração passam

### Frontend
- [ ] CreatePostButton renderiza
- [ ] CreatePostModal abre/fecha
- [ ] Upload de imagem funciona
- [ ] PostCard renderiza posts
- [ ] UserMenu aparece no header
- [ ] Links todos funcionam
- [ ] Testes unitários passam

### UX
- [ ] Atalho Ctrl+Enter funciona
- [ ] Toast de sucesso/erro aparece
- [ ] Loading states corretos
- [ ] Mobile responsivo
- [ ] Dark mode funciona

### Performance
- [ ] Imagens com lazy loading
- [ ] No memory leaks (useEffect cleanup)
- [ ] API não é chamada múltiplas vezes

### Regressão
- [ ] Páginas existentes ainda funcionam
- [ ] POST /posts original não quebrou
- [ ] ProfilePublicPage carrega posts
- [ ] Logout funciona

---

## 🚀 Ordem de Execução Recomendada

1. **Task 1.1** (Backend) → Testar com curl
2. **Task 1.5** (API helper) → Adicionar uploadPostImage
3. **Task 1.2** (CreatePostModal) → Testar manualmente
4. **Task 1.3** (PostCard) → Ver posts renderizados
5. **Task 1.4** (UserMenu) → Testar navegação
6. **Task 1.6** (Testes Frontend) → Garantir cobertura
7. **Task 1.7** (Testes Backend) → Garantir robustez
8. **Checklist Final** → Validar tudo

---

## 📞 Suporte

Se houver dúvidas ou problemas durante a implementação:

1. Consultar `SOCIAL_UX_IMPROVEMENTS.md` para detalhes técnicos
2. Verificar logs do backend: `tail -f apps/api/logs/app.log`
3. Verificar console do navegador (F12)
4. Rodar testes: `npm test`

---

**Próxima Fase**: FASE 2 - Discovery & Engajamento
