# Especificação Técnica: Funcionalidades de Postagens (Posts)

**Versão**: 1.0.0
**Data**: 2025-01-09
**Status**: Pendente de Implementação
**Autor**: Análise automatizada do sistema Bazari

---

## 📋 Sumário Executivo

Este documento especifica a implementação de **11 funcionalidades** para o sistema de postagens (posts) do Bazari, divididas em:

- **2 funcionalidades parcialmente implementadas** (necessitam conclusão)
- **9 funcionalidades não implementadas** (criar do zero)

**Objetivo**: Completar o sistema de posts com todas as interações sociais necessárias, sem causar regressões nas funcionalidades existentes.

---

## 🎯 Escopo e Prioridades

### ✅ Funcionalidades JÁ FUNCIONANDO (não tocar):
1. Curtir (Like/Unlike)
2. Comentar (com respostas aninhadas)
3. Criar Post (com upload de até 4 imagens)
4. Exibir mídia (imagens)
5. Feed personalizado (3 abas)
6. Exibição de autor (com hover card)
7. Contadores de interação

### ⚠️ Funcionalidades PARCIALMENTE IMPLEMENTADAS:
1. **Repost** (botão existe, falta backend e lógica)
2. **Menu de Opções (⋯)** (botão existe, falta dropdown e ações)

### ❌ Funcionalidades NÃO IMPLEMENTADAS:

#### Alta Prioridade:
3. **Página de Detalhes do Post** (visualização individual)
4. **Deletar Post** (API existe, falta UI)
5. **Compartilhar Post** (copiar link)

#### Média Prioridade:
6. **Editar Post** (após publicação)
7. **Bookmark/Salvar** (salvar para depois)
8. **Reportar/Denunciar** (conteúdo inapropriado)

#### Baixa Prioridade:
9. **Fixar Post (Pin)** (no topo do perfil)
10. **Enquetes/Polls** (posts com votação)
11. **Suporte a Vídeos** (além de imagens)

---

## 📐 Padrões do Projeto (OBRIGATÓRIOS)

### 1. Estrutura de Arquivos
```
apps/web/src/
├── components/
│   ├── social/           # Componentes de posts
│   └── ui/               # Componentes shadcn/ui
├── pages/                # Páginas/rotas
├── lib/
│   └── api.ts           # Helpers de API
└── hooks/               # Custom hooks
```

### 2. Padrões de API
```typescript
// Helper functions (lib/api.ts)
export const apiHelpers = {
  // GET
  getSomething: (id: string, params?: { limit?: number }) => {
    const qs = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return getJSON(`/resource/${id}${qs}`);
  },

  // POST
  createSomething: (data: { field: string }) => postJSON('/resource', data),

  // DELETE
  deleteSomething: (id: string) => deleteJSON(`/resource/${id}`),

  // PUT/PATCH
  updateSomething: (id: string, data: any) => putJSON(`/resource/${id}`, data),
};
```

### 3. Padrões de Componentes
```typescript
// Estado com optimistic update
const [liked, setLiked] = useState(initialLiked);
const [loading, setLoading] = useState(false);

async function handleAction() {
  if (loading) return;

  const previous = liked;
  setLiked(!liked); // Optimistic update
  setLoading(true);

  try {
    const response = await apiHelpers.action();
    setLiked(response.newState); // Confirmar com servidor
  } catch (error) {
    setLiked(previous); // Rollback
    toast.error('Erro ao executar ação');
  } finally {
    setLoading(false);
  }
}
```

### 4. Padrões de UI
- **Componentes**: shadcn/ui (Radix UI + Tailwind)
- **Ícones**: lucide-react
- **Notificações**: toast (sonner)
- **Cores**:
  - Primária: `text-primary`, `bg-primary`
  - Muted: `text-muted-foreground`, `bg-muted`
  - Destrutivo: `text-destructive` (não existe `variant="destructive"` no Button)
- **Espaçamento**: usar classes Tailwind (gap-2, p-4, mb-3, etc.)

### 5. Padrões de Nomenclatura
- **Componentes**: PascalCase (ex: `PostCard.tsx`)
- **Funções**: camelCase (ex: `handleLikePost`)
- **Constantes**: UPPER_SNAKE_CASE (ex: `MAX_LENGTH`)
- **Tipos**: PascalCase (ex: `PostCardProps`)

### 6. Tratamento de Erros
```typescript
try {
  await apiHelpers.action();
  toast.success('Ação realizada!');
} catch (error: any) {
  console.error('Error:', error);
  toast.error(error?.message || 'Erro ao executar ação');
}
```

---

## 🚀 Implementação em Fases

As funcionalidades estão divididas em **5 prompts sequenciais** para execução no Claude Code.

---

# PROMPT 1: Repost (Compartilhamento Interno)

**Prioridade**: ⚠️ ALTA (parcialmente implementado)
**Complexidade**: Média
**Tempo estimado**: 30-45 min

## 📋 Contexto

O botão de Repost já existe no UI ([PostCard.tsx:134-137](apps/web/src/components/social/PostCard.tsx#L134-L137)), mas não faz nada. Precisamos implementar a lógica completa de repost.

## 🎯 Objetivo

Permitir que usuários compartilhem posts de outros no próprio feed (similar ao Twitter/X).

## 📦 Requisitos

### Backend (assumir que existe ou criar mock)

**Endpoint**: `POST /posts/:postId/repost`
```typescript
// Request
POST /posts/{postId}/repost
Authorization: Bearer {token}

// Response 200
{
  "repost": {
    "id": "repost_123",
    "originalPostId": "post_456",
    "userId": "user_789",
    "createdAt": "2025-01-09T10:30:00Z"
  },
  "repostsCount": 42
}
```

**Endpoint**: `DELETE /posts/:postId/repost`
```typescript
// Request
DELETE /posts/{postId}/repost
Authorization: Bearer {token}

// Response 200
{
  "repostsCount": 41
}
```

### Frontend

#### 1. Adicionar API Helper

**Arquivo**: `apps/web/src/lib/api.ts`

**Localização**: Após linha 317 (depois de `unlikePost`)

```typescript
// Adicionar após unlikePost (linha ~317)
repostPost: (postId: string) => postJSON(`/posts/${postId}/repost`, {}),
unrepostPost: (postId: string) => deleteJSON(`/posts/${postId}/repost`),
```

#### 2. Criar Componente RepostButton

**Arquivo**: `apps/web/src/components/social/RepostButton.tsx` (NOVO)

```typescript
// apps/web/src/components/social/RepostButton.tsx

import { useState } from 'react';
import { Repeat2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiHelpers } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface RepostButtonProps {
  postId: string;
  initialReposted: boolean;
  initialCount: number;
}

export function RepostButton({ postId, initialReposted, initialCount }: RepostButtonProps) {
  const [reposted, setReposted] = useState(initialReposted);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);

  const handleToggleRepost = async () => {
    if (loading) return;

    // Optimistic update
    const previousReposted = reposted;
    const previousCount = count;

    setReposted(!reposted);
    setCount(reposted ? count - 1 : count + 1);
    setLoading(true);

    try {
      const response: any = reposted
        ? await apiHelpers.unrepostPost(postId)
        : await apiHelpers.repostPost(postId);

      // Update with server response
      setReposted(response.reposted || !reposted);
      setCount(response.repostsCount || count);

      if (!previousReposted) {
        toast.success('Post compartilhado!');
      }
    } catch (error) {
      // Revert on error
      setReposted(previousReposted);
      setCount(previousCount);
      toast.error('Erro ao compartilhar post. Tente novamente.');
      console.error('Repost error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleToggleRepost}
      disabled={loading}
      className={cn(
        "gap-2",
        reposted && "text-green-600 hover:text-green-700"
      )}
    >
      <Repeat2
        className={cn(
          "h-4 w-4 transition-all",
          reposted && "stroke-[2.5px]"
        )}
      />
      {count > 0 && (
        <span className="text-sm tabular-nums">
          {count}
        </span>
      )}
    </Button>
  );
}
```

#### 3. Atualizar PostCard

**Arquivo**: `apps/web/src/components/social/PostCard.tsx`

**Passo 1**: Adicionar import (linha ~9)
```typescript
import { RepostButton } from './RepostButton';
```

**Passo 2**: Adicionar prop `isReposted` na interface (linha ~29)
```typescript
interface PostCardProps {
  post: {
    id: string;
    author: { /* ... */ };
    content: string;
    media?: Array<{ url: string; type: string }>;
    createdAt: string;
    likesCount?: number;
    commentsCount?: number;
    repostsCount?: number;
    isLiked?: boolean;
    isReposted?: boolean; // ADICIONAR ESTA LINHA
  };
}
```

**Passo 3**: Substituir botão de repost (linhas 134-137)

**ANTES**:
```typescript
<Button variant="ghost" size="sm" className="gap-2">
  <Repeat2 className="h-4 w-4" />
  {post.repostsCount || 0}
</Button>
```

**DEPOIS**:
```typescript
<RepostButton
  postId={post.id}
  initialReposted={post.isReposted || false}
  initialCount={post.repostsCount || 0}
/>
```

## ✅ Checklist de Validação

- [ ] API helpers `repostPost` e `unrepostPost` adicionados em `api.ts`
- [ ] Componente `RepostButton.tsx` criado
- [ ] Import de `RepostButton` adicionado no `PostCard.tsx`
- [ ] Prop `isReposted` adicionada na interface `PostCardProps`
- [ ] Botão de repost substituído por `<RepostButton />`
- [ ] Testar: clicar no botão deve mudar cor para verde
- [ ] Testar: contador deve aumentar/diminuir
- [ ] Testar: toast de confirmação deve aparecer
- [ ] Testar: erro deve reverter estado (se backend não existir)
- [ ] Não deve haver regressões nos outros botões (Like, Comentar)

## 🚫 NÃO FAZER

- ❌ NÃO alterar componente `LikeButton.tsx`
- ❌ NÃO alterar componente `CommentSection.tsx`
- ❌ NÃO alterar layout/estilos do `PostCard` (apenas trocar botão)
- ❌ NÃO usar `variant="destructive"` no Button (não existe)

## 📌 Observações

- Se o backend ainda não existir, a requisição vai falhar, mas o optimistic update vai funcionar
- O botão deve ficar verde quando repostado (igual Like fica vermelho)
- Use ícone `Repeat2` do lucide-react (já está importado)

---

# PROMPT 2: Menu de Opções do Post (Deletar, Editar, Reportar)

**Prioridade**: ⚠️ ALTA (parcialmente implementado)
**Complexidade**: Média
**Tempo estimado**: 45-60 min

## 📋 Contexto

O botão "⋯" (MoreHorizontal) já existe no `PostCard.tsx` (linha 90-92), mas não faz nada. Precisamos adicionar um dropdown menu com ações.

## 🎯 Objetivo

Criar menu dropdown com opções contextuais do post:
- **Deletar** (se for autor do post)
- **Editar** (se for autor do post) - PREPARAR UI, implementação no Prompt 4
- **Reportar** (se NÃO for autor)
- **Copiar Link** (todos)

## 📦 Requisitos

### API Existente

```typescript
// JÁ EXISTE em api.ts linha 299
deletePost: (id: string) => deleteJSON(`/posts/${id}`)
```

### Frontend

#### 1. Criar Componente PostOptionsMenu

**Arquivo**: `apps/web/src/components/social/PostOptionsMenu.tsx` (NOVO)

```typescript
// apps/web/src/components/social/PostOptionsMenu.tsx

import { useState } from 'react';
import { MoreHorizontal, Trash2, Edit, Flag, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { apiHelpers } from '@/lib/api';
import { toast } from 'sonner';

interface PostOptionsMenuProps {
  postId: string;
  authorHandle: string;
  currentUserHandle?: string; // Handle do usuário logado (se disponível)
  onDeleted?: () => void; // Callback quando post for deletado
}

export function PostOptionsMenu({
  postId,
  authorHandle,
  currentUserHandle,
  onDeleted,
}: PostOptionsMenuProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);

  const isAuthor = currentUserHandle && currentUserHandle === authorHandle;

  const handleCopyLink = () => {
    const postUrl = `${window.location.origin}/posts/${postId}`;
    navigator.clipboard.writeText(postUrl);
    toast.success('Link copiado!');
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await apiHelpers.deletePost(postId);
      toast.success('Post deletado com sucesso');
      setDeleteDialogOpen(false);
      onDeleted?.();
    } catch (error: any) {
      console.error('Error deleting post:', error);
      toast.error(error?.message || 'Erro ao deletar post');
    } finally {
      setDeleting(false);
    }
  };

  const handleEdit = () => {
    // TODO: Implementar no Prompt 4
    toast.info('Edição de posts será implementada em breve');
  };

  const handleReport = () => {
    setReportDialogOpen(true);
  };

  const handleSubmitReport = () => {
    // TODO: Implementar API de report no Prompt 5
    toast.success('Post reportado. Obrigado pelo feedback!');
    setReportDialogOpen(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-48">
          {/* Copiar Link - disponível para todos */}
          <DropdownMenuItem onClick={handleCopyLink}>
            <Link2 className="mr-2 h-4 w-4" />
            Copiar link
          </DropdownMenuItem>

          {isAuthor ? (
            <>
              <DropdownMenuSeparator />
              {/* Opções do autor */}
              <DropdownMenuItem onClick={handleEdit}>
                <Edit className="mr-2 h-4 w-4" />
                Editar post
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => setDeleteDialogOpen(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Deletar post
              </DropdownMenuItem>
            </>
          ) : (
            <>
              <DropdownMenuSeparator />
              {/* Opções para não-autores */}
              <DropdownMenuItem
                onClick={handleReport}
                className="text-destructive focus:text-destructive"
              >
                <Flag className="mr-2 h-4 w-4" />
                Reportar post
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Dialog de Confirmação de Delete */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deletar post?</DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita. O post será removido permanentemente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deletando...' : 'Deletar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Report */}
      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reportar post</DialogTitle>
            <DialogDescription>
              Por que você está reportando este post?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Este post será revisado pela equipe de moderação.
            </p>
            {/* TODO: Adicionar formulário de motivos no Prompt 5 */}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReportDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleSubmitReport}>
              Enviar report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

#### 2. Atualizar PostCard

**Arquivo**: `apps/web/src/components/social/PostCard.tsx`

**Passo 1**: Adicionar import (linha ~10)
```typescript
import { PostOptionsMenu } from './PostOptionsMenu';
```

**Passo 2**: Adicionar prop `onDeleted` (linha ~31)
```typescript
interface PostCardProps {
  post: {
    id: string;
    author: {
      handle: string;
      displayName: string;
      avatarUrl?: string | null;
      badges?: Array<{ slug: string; name: string; description: string; tier: number }>;
    };
    content: string;
    media?: Array<{ url: string; type: string }>;
    createdAt: string;
    likesCount?: number;
    commentsCount?: number;
    repostsCount?: number;
    isLiked?: boolean;
    isReposted?: boolean;
  };
  currentUserHandle?: string; // ADICIONAR
  onDeleted?: () => void;      // ADICIONAR
}
```

**Passo 3**: Atualizar assinatura da função (linha ~33)
```typescript
export function PostCard({ post, currentUserHandle, onDeleted }: PostCardProps) {
```

**Passo 4**: Substituir botão MoreHorizontal (linhas 90-92)

**ANTES**:
```typescript
<Button variant="ghost" size="icon">
  <MoreHorizontal className="h-4 w-4" />
</Button>
```

**DEPOIS**:
```typescript
<PostOptionsMenu
  postId={post.id}
  authorHandle={post.author.handle}
  currentUserHandle={currentUserHandle}
  onDeleted={onDeleted}
/>
```

#### 3. Atualizar Usos do PostCard

**Arquivos a atualizar**:
- `apps/web/src/pages/ProfilePublicPage.tsx` (linha ~226)
- `apps/web/src/components/social/PersonalizedFeed.tsx` (linha ~122)

**Exemplo de atualização**:

```typescript
// Buscar currentUserHandle do perfil logado
const [currentUser, setCurrentUser] = useState<{ handle: string } | null>(null);

useEffect(() => {
  (async () => {
    try {
      const res = await apiHelpers.getMeProfile();
      setCurrentUser(res.profile);
    } catch (e) {
      setCurrentUser(null);
    }
  })();
}, []);

// Passar para PostCard
<PostCard
  post={post}
  currentUserHandle={currentUser?.handle}
  onDeleted={() => {
    // Remover post da lista local
    setPosts(prev => prev.filter(p => p.id !== post.id));
  }}
/>
```

## ✅ Checklist de Validação

- [ ] Componente `PostOptionsMenu.tsx` criado
- [ ] Import de `PostOptionsMenu` adicionado no `PostCard.tsx`
- [ ] Props `currentUserHandle` e `onDeleted` adicionadas no `PostCardProps`
- [ ] Botão MoreHorizontal substituído por `<PostOptionsMenu />`
- [ ] `ProfilePublicPage.tsx` atualizado para buscar usuário logado
- [ ] `PersonalizedFeed.tsx` atualizado para buscar usuário logado
- [ ] Testar: clicar em "⋯" abre dropdown
- [ ] Testar: se autor, mostrar "Editar" e "Deletar"
- [ ] Testar: se não-autor, mostrar "Reportar"
- [ ] Testar: "Copiar link" funciona para todos
- [ ] Testar: deletar post remove da lista
- [ ] Testar: dialog de confirmação aparece antes de deletar

## 🚫 NÃO FAZER

- ❌ NÃO implementar lógica de edição ainda (só preparar UI)
- ❌ NÃO implementar backend de report ainda (só preparar UI)
- ❌ NÃO alterar outros componentes além dos especificados

---

# PROMPT 3: Página de Detalhes do Post

**Prioridade**: ⚠️ ALTA
**Complexidade**: Média-Alta
**Tempo estimado**: 60-90 min

## 📋 Contexto

Atualmente não existe uma página para visualizar um post individual. Usuários não conseguem ver todos os comentários ou compartilhar link direto de um post.

## 🎯 Objetivo

Criar página `/posts/:postId` para visualizar post individual com:
- Conteúdo completo do post
- Todos os comentários (não limitado)
- Botão de voltar
- URL compartilhável

## 📦 Requisitos

### Backend (assumir que existe)

**Endpoint**: `GET /posts/:postId`
```typescript
// Response 200
{
  "post": {
    "id": "post_123",
    "content": "Conteúdo do post",
    "author": {
      "handle": "usuario",
      "displayName": "Nome do Usuário",
      "avatarUrl": "https://...",
      "badges": []
    },
    "media": [{ "url": "https://...", "type": "image" }],
    "createdAt": "2025-01-09T10:00:00Z",
    "likesCount": 10,
    "commentsCount": 5,
    "repostsCount": 2,
    "isLiked": false,
    "isReposted": false
  }
}
```

### Frontend

#### 1. Adicionar API Helper

**Arquivo**: `apps/web/src/lib/api.ts`

**Localização**: Após `getProfilePosts` (~linha 300)

```typescript
// Adicionar após getProfilePosts
getPostById: (postId: string) => getJSON(`/posts/${postId}`),
```

#### 2. Criar Página PostDetailPage

**Arquivo**: `apps/web/src/pages/PostDetailPage.tsx` (NOVO)

```typescript
// apps/web/src/pages/PostDetailPage.tsx

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { apiHelpers } from '../lib/api';
import { PostCard } from '../components/social/PostCard';
import { CommentSection } from '../components/social/CommentSection';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { PostCardSkeleton } from '../components/social/PostCardSkeleton';

export default function PostDetailPage() {
  const { postId = '' } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [post, setPost] = useState<any | null>(null);
  const [currentUser, setCurrentUser] = useState<{ handle: string } | null>(null);

  useEffect(() => {
    let active = true;

    // Buscar usuário logado
    (async () => {
      try {
        const res = await apiHelpers.getMeProfile();
        if (active) setCurrentUser(res.profile);
      } catch (e) {
        if (active) setCurrentUser(null);
      }
    })();

    // Buscar post
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await apiHelpers.getPostById(postId);
        if (active) {
          setPost(res.post);
        }
      } catch (e: any) {
        if (active) {
          setError(e?.message || 'Erro ao carregar post');
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [postId]);

  const handlePostDeleted = () => {
    // Redirecionar para feed após deletar
    navigate('/app/feed');
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <Button
          variant="ghost"
          size="sm"
          className="mb-4"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <PostCardSkeleton />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <Button
          variant="ghost"
          size="sm"
          className="mb-4"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground mb-4">
              {error || 'Post não encontrado'}
            </p>
            <Button onClick={() => navigate('/app/feed')}>
              Ir para Feed
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl">
      {/* Botão Voltar */}
      <Button
        variant="ghost"
        size="sm"
        className="mb-4"
        onClick={() => navigate(-1)}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Voltar
      </Button>

      {/* Post */}
      <div className="mb-6">
        <PostCard
          post={{
            id: post.id,
            content: post.content,
            author: {
              handle: post.author.handle,
              displayName: post.author.displayName,
              avatarUrl: post.author.avatarUrl,
              badges: post.author.badges,
            },
            media: post.media,
            createdAt: post.createdAt,
            likesCount: post.likesCount,
            commentsCount: post.commentsCount,
            repostsCount: post.repostsCount,
            isLiked: post.isLiked,
            isReposted: post.isReposted,
          }}
          currentUserHandle={currentUser?.handle}
          onDeleted={handlePostDeleted}
        />
      </div>

      {/* Comentários */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-4">Comentários</h2>
          <CommentSection postId={post.id} />
        </CardContent>
      </Card>
    </div>
  );
}
```

#### 3. Adicionar Rota

**Arquivo**: `apps/web/src/App.tsx` (ou onde estão as rotas)

**Adicionar rota**:
```typescript
import PostDetailPage from './pages/PostDetailPage';

// Dentro do <Routes>
<Route path="/posts/:postId" element={<PostDetailPage />} />
```

#### 4. Tornar PostCard Clicável (Opcional mas Recomendado)

**Arquivo**: `apps/web/src/components/social/PostCard.tsx`

**Opção 1**: Adicionar cursor pointer e onClick no card

```typescript
// No início da função PostCard
const navigate = useNavigate(); // Importar useNavigate do react-router-dom

// No elemento Card (linha ~40)
<Card
  className="overflow-hidden cursor-pointer hover:bg-muted/50 transition-colors"
  onClick={(e) => {
    // Não navegar se clicou em botão/link
    if ((e.target as HTMLElement).closest('button, a')) return;
    navigate(`/posts/${post.id}`);
  }}
>
```

**Opção 2**: Adicionar botão "Ver detalhes" na actions bar

```typescript
// Após os botões de interação
<Button
  variant="ghost"
  size="sm"
  className="gap-2 ml-auto"
  onClick={() => navigate(`/posts/${post.id}`)}
>
  Ver detalhes
</Button>
```

## ✅ Checklist de Validação

- [ ] API helper `getPostById` adicionado
- [ ] Página `PostDetailPage.tsx` criada
- [ ] Rota `/posts/:postId` adicionada no router
- [ ] Testar: acessar `/posts/123` carrega página
- [ ] Testar: post é exibido corretamente
- [ ] Testar: comentários carregam
- [ ] Testar: botão "Voltar" funciona
- [ ] Testar: deletar post redireciona para feed
- [ ] Testar: URL é compartilhável (copiar/colar funciona)
- [ ] (Opcional) PostCard clicável navega para detalhes

## 🚫 NÃO FAZER

- ❌ NÃO alterar `CommentSection` (já funciona)
- ❌ NÃO adicionar novos campos ao post (usar os existentes)

---

# PROMPT 4: Editar Post

**Prioridade**: Média
**Complexidade**: Média
**Tempo estimado**: 45-60 min

## 📋 Contexto

O botão "Editar" foi preparado no Prompt 2, mas não faz nada ainda. Precisamos implementar a lógica de edição.

## 🎯 Objetivo

Permitir que o autor edite o conteúdo de posts já publicados.

## 📦 Requisitos

### Backend (assumir que existe ou criar mock)

**Endpoint**: `PUT /posts/:postId`
```typescript
// Request
PUT /posts/{postId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "content": "Novo conteúdo do post",
  "media": [{ "url": "https://...", "type": "image" }]
}

// Response 200
{
  "post": {
    "id": "post_123",
    "content": "Novo conteúdo do post",
    "updatedAt": "2025-01-09T11:00:00Z",
    // ... outros campos
  }
}
```

### Frontend

#### 1. Adicionar API Helper

**Arquivo**: `apps/web/src/lib/api.ts`

**Localização**: Após `createPost` (~linha 298)

```typescript
// Adicionar após createPost
updatePost: (postId: string, payload: { content: string; media?: Array<{ url: string; type: string }> }) =>
  putJSON(`/posts/${postId}`, payload),
```

#### 2. Criar Modal de Edição

**Arquivo**: `apps/web/src/components/social/EditPostModal.tsx` (NOVO)

```typescript
// apps/web/src/components/social/EditPostModal.tsx

import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { apiHelpers } from '@/lib/api';
import { toast } from 'sonner';
import { ImagePlus, X } from 'lucide-react';

const MAX_LENGTH = 5000;

interface EditPostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: {
    id: string;
    content: string;
    media?: Array<{ url: string; type: string }>;
  };
  onUpdated?: (updatedPost: any) => void;
}

export function EditPostModal({ open, onOpenChange, post, onUpdated }: EditPostModalProps) {
  const [content, setContent] = useState(post.content);
  const [images, setImages] = useState<string[]>(post.media?.map(m => m.url) || []);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset quando post muda
  useEffect(() => {
    setContent(post.content);
    setImages(post.media?.map(m => m.url) || []);
  }, [post]);

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast.error('Digite algo para atualizar');
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        content: content.trim(),
      };

      if (images.length > 0) {
        payload.media = images.map(url => ({ url, type: 'image' }));
      }

      const response = await apiHelpers.updatePost(post.id, payload);

      toast.success('Post atualizado!');
      onUpdated?.(response.post);
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao atualizar post');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    if (images.length >= 4) {
      toast.error('Máximo de 4 imagens por post');
      return;
    }

    try {
      const res = await apiHelpers.uploadPostImage(file);
      setImages([...images, res.asset.url]);
      toast.success('Imagem carregada!');
    } catch (error) {
      toast.error('Erro ao fazer upload da imagem');
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar Post</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Textarea
            placeholder="O que você está pensando?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={MAX_LENGTH}
            rows={6}
            className="resize-none"
          />

          {/* Preview de imagens */}
          {images.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {images.map((url, index) => (
                <div key={index} className="relative">
                  <img
                    src={url}
                    alt={`Upload ${index + 1}`}
                    className="w-full h-32 object-cover rounded-md"
                  />
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6 bg-red-500 hover:bg-red-600 text-white"
                    onClick={() => removeImage(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Toolbar */}
          <div className="flex items-center justify-between border-t pt-4">
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={images.length >= 4}
              >
                <ImagePlus className="h-5 w-5" />
              </Button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(file);
                }}
              />
            </div>

            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                {content.length}/{MAX_LENGTH}
              </span>

              <Button onClick={handleSubmit} disabled={loading || !content.trim()}>
                {loading ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

#### 3. Atualizar PostOptionsMenu

**Arquivo**: `apps/web/src/components/social/PostOptionsMenu.tsx`

**Passo 1**: Adicionar import
```typescript
import { EditPostModal } from './EditPostModal';
```

**Passo 2**: Adicionar props
```typescript
interface PostOptionsMenuProps {
  postId: string;
  authorHandle: string;
  currentUserHandle?: string;
  onDeleted?: () => void;
  post?: {                     // ADICIONAR
    id: string;
    content: string;
    media?: Array<{ url: string; type: string }>;
  };
  onUpdated?: (updatedPost: any) => void; // ADICIONAR
}
```

**Passo 3**: Adicionar estado e handlers
```typescript
// No início do componente
const [editModalOpen, setEditModalOpen] = useState(false);

// Atualizar handleEdit
const handleEdit = () => {
  setEditModalOpen(true);
};
```

**Passo 4**: Adicionar modal no JSX (antes do closing `</>`):
```typescript
{/* Modal de Edição */}
{isAuthor && post && (
  <EditPostModal
    open={editModalOpen}
    onOpenChange={setEditModalOpen}
    post={post}
    onUpdated={(updatedPost) => {
      onUpdated?.(updatedPost);
      setEditModalOpen(false);
    }}
  />
)}
```

#### 4. Atualizar PostCard

**Arquivo**: `apps/web/src/components/social/PostCard.tsx`

**Adicionar prop `onUpdated`**:
```typescript
interface PostCardProps {
  // ... props existentes
  onUpdated?: (updatedPost: any) => void; // ADICIONAR
}

// No componente
<PostOptionsMenu
  postId={post.id}
  authorHandle={post.author.handle}
  currentUserHandle={currentUserHandle}
  onDeleted={onDeleted}
  post={post}              // ADICIONAR
  onUpdated={onUpdated}    // ADICIONAR
/>
```

#### 5. Implementar Atualização no Feed

**Arquivos**: `PersonalizedFeed.tsx`, `ProfilePublicPage.tsx`, `PostDetailPage.tsx`

**Exemplo**:
```typescript
<PostCard
  post={post}
  currentUserHandle={currentUser?.handle}
  onDeleted={() => {
    setPosts(prev => prev.filter(p => p.id !== post.id));
  }}
  onUpdated={(updatedPost) => {
    setPosts(prev => prev.map(p => p.id === updatedPost.id ? updatedPost : p));
  }}
/>
```

## ✅ Checklist de Validação

- [ ] API helper `updatePost` adicionado
- [ ] Componente `EditPostModal.tsx` criado
- [ ] `PostOptionsMenu` atualizado com modal de edição
- [ ] Props `post` e `onUpdated` adicionadas no `PostOptionsMenu`
- [ ] `PostCard` passa props corretas para `PostOptionsMenu`
- [ ] Feeds atualizam post após edição
- [ ] Testar: clicar em "Editar" abre modal
- [ ] Testar: conteúdo original pré-preenche textarea
- [ ] Testar: salvar atualiza post na lista
- [ ] Testar: adicionar/remover imagens funciona

## 🚫 NÃO FAZER

- ❌ NÃO permitir edição de posts de outros usuários
- ❌ NÃO mostrar histórico de edições (fora do escopo)

---

# PROMPT 5: Bookmark/Salvar Posts

**Prioridade**: Média
**Complexidade**: Média
**Tempo estimado**: 45-60 min

## 📋 Contexto

Usuários querem salvar posts para ler depois.

## 🎯 Objetivo

Implementar funcionalidade de bookmark/salvar posts.

## 📦 Requisitos

### Backend (assumir que existe ou criar mock)

**Endpoints**:
```typescript
// Salvar post
POST /posts/{postId}/bookmark
// Response: { "bookmarked": true }

// Remover bookmark
DELETE /posts/{postId}/bookmark
// Response: { "bookmarked": false }

// Listar posts salvos
GET /me/bookmarks?limit=20&cursor=...
// Response: { "items": [...], "nextCursor": "..." }
```

### Frontend

#### 1. Adicionar API Helpers

**Arquivo**: `apps/web/src/lib/api.ts`

```typescript
// Bookmarks
bookmarkPost: (postId: string) => postJSON(`/posts/${postId}/bookmark`, {}),
unbookmarkPost: (postId: string) => deleteJSON(`/posts/${postId}/bookmark`),
getMyBookmarks: (params?: { limit?: number; cursor?: string }) => {
  const qs = params ? '?' + new URLSearchParams(params as any).toString() : '';
  return getJSON(`/me/bookmarks${qs}`);
},
```

#### 2. Criar Componente BookmarkButton

**Arquivo**: `apps/web/src/components/social/BookmarkButton.tsx` (NOVO)

```typescript
// apps/web/src/components/social/BookmarkButton.tsx

import { useState } from 'react';
import { Bookmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiHelpers } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface BookmarkButtonProps {
  postId: string;
  initialBookmarked: boolean;
}

export function BookmarkButton({ postId, initialBookmarked }: BookmarkButtonProps) {
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [loading, setLoading] = useState(false);

  const handleToggleBookmark = async () => {
    if (loading) return;

    const previousBookmarked = bookmarked;
    setBookmarked(!bookmarked);
    setLoading(true);

    try {
      const response: any = bookmarked
        ? await apiHelpers.unbookmarkPost(postId)
        : await apiHelpers.bookmarkPost(postId);

      setBookmarked(response.bookmarked ?? !previousBookmarked);

      if (!previousBookmarked) {
        toast.success('Post salvo!');
      } else {
        toast.success('Post removido dos salvos');
      }
    } catch (error) {
      setBookmarked(previousBookmarked);
      toast.error('Erro ao salvar post');
      console.error('Bookmark error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleToggleBookmark}
      disabled={loading}
      className={cn(
        "gap-2",
        bookmarked && "text-primary"
      )}
      title={bookmarked ? "Remover dos salvos" : "Salvar post"}
    >
      <Bookmark
        className={cn(
          "h-4 w-4 transition-all",
          bookmarked && "fill-current"
        )}
      />
    </Button>
  );
}
```

#### 3. Atualizar PostCard Actions

**Arquivo**: `apps/web/src/components/social/PostCard.tsx`

**Passo 1**: Adicionar import
```typescript
import { BookmarkButton } from './BookmarkButton';
```

**Passo 2**: Adicionar prop `isBookmarked`
```typescript
interface PostCardProps {
  post: {
    // ... props existentes
    isBookmarked?: boolean; // ADICIONAR
  };
  // ...
}
```

**Passo 3**: Adicionar botão nas actions (linha ~138, após RepostButton)
```typescript
{/* Actions */}
<div className="flex items-center gap-1 pt-2 border-t">
  <LikeButton
    postId={post.id}
    initialLiked={post.isLiked || false}
    initialCount={post.likesCount || 0}
  />

  <Button variant="ghost" size="sm" className="gap-2">
    <MessageCircle className="h-4 w-4" />
    {post.commentsCount || 0}
  </Button>

  <RepostButton
    postId={post.id}
    initialReposted={post.isReposted || false}
    initialCount={post.repostsCount || 0}
  />

  {/* ADICIONAR ESTE BOTÃO */}
  <BookmarkButton
    postId={post.id}
    initialBookmarked={post.isBookmarked || false}
  />

  <div className="flex-1" /> {/* Spacer */}

  <PostOptionsMenu
    postId={post.id}
    authorHandle={post.author.handle}
    currentUserHandle={currentUserHandle}
    onDeleted={onDeleted}
    post={post}
    onUpdated={onUpdated}
  />
</div>
```

#### 4. Criar Página de Posts Salvos

**Arquivo**: `apps/web/src/pages/BookmarksPage.tsx` (NOVO)

```typescript
// apps/web/src/pages/BookmarksPage.tsx

import { useEffect, useState } from 'react';
import { apiHelpers } from '../lib/api';
import { PostCard } from '../components/social/PostCard';
import { PostCardSkeleton } from '../components/social/PostCardSkeleton';
import { SkeletonList } from '../components/SkeletonList';
import { Button } from '../components/ui/button';
import { Bookmark } from 'lucide-react';

export default function BookmarksPage() {
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<any[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ handle: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiHelpers.getMeProfile();
        setCurrentUser(res.profile);
      } catch (e) {
        setCurrentUser(null);
      }
    })();

    loadBookmarks();
  }, []);

  const loadBookmarks = async (cursor?: string) => {
    try {
      if (cursor) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const res = await apiHelpers.getMyBookmarks(cursor ? { cursor } : undefined);

      if (cursor) {
        setPosts(prev => [...prev, ...res.items]);
      } else {
        setPosts(res.items);
      }

      setNextCursor(res.nextCursor || null);
    } catch (error) {
      console.error('Error loading bookmarks:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <h1 className="text-2xl font-bold mb-6">Posts Salvos</h1>
        <SkeletonList count={5} SkeletonComponent={PostCardSkeleton} />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Bookmark className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Posts Salvos</h1>
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-12">
          <Bookmark className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold mb-2">Nenhum post salvo</h2>
          <p className="text-muted-foreground">
            Posts salvos aparecerão aqui
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUserHandle={currentUser?.handle}
              onDeleted={() => {
                setPosts(prev => prev.filter(p => p.id !== post.id));
              }}
              onUpdated={(updatedPost) => {
                setPosts(prev => prev.map(p => p.id === updatedPost.id ? updatedPost : p));
              }}
            />
          ))}

          {nextCursor && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                onClick={() => loadBookmarks(nextCursor)}
                disabled={loadingMore}
              >
                {loadingMore ? 'Carregando...' : 'Carregar mais'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

#### 5. Adicionar Rota

**Arquivo**: Router principal

```typescript
import BookmarksPage from './pages/BookmarksPage';

<Route path="/app/bookmarks" element={<BookmarksPage />} />
```

#### 6. Adicionar Link na Navegação

**Arquivo**: Componente de navegação (sidebar/header)

```typescript
<Link to="/app/bookmarks" className="flex items-center gap-2">
  <Bookmark className="h-4 w-4" />
  Salvos
</Link>
```

## ✅ Checklist de Validação

- [ ] API helpers de bookmark adicionados
- [ ] Componente `BookmarkButton.tsx` criado
- [ ] Botão de bookmark adicionado no `PostCard`
- [ ] Página `BookmarksPage.tsx` criada
- [ ] Rota `/app/bookmarks` adicionada
- [ ] Link na navegação adicionado
- [ ] Testar: clicar em bookmark salva/remove post
- [ ] Testar: ícone preenche quando salvo
- [ ] Testar: toast de confirmação aparece
- [ ] Testar: página de salvos lista posts corretos
- [ ] Testar: remover bookmark da página de salvos atualiza lista

## 🚫 NÃO FAZER

- ❌ NÃO mostrar contador de bookmarks (não é público)
- ❌ NÃO permitir ver bookmarks de outros usuários

---

Esses são os 5 primeiros prompts (funcionalidades de alta prioridade). Deseja que eu continue com os prompts das funcionalidades de média e baixa prioridade?
