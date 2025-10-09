# Especificação Técnica: Melhorias UI/UX - Sistema Social/Perfil

**Versão**: 1.0.0
**Data**: 2025-01-09
**Status**: Draft
**Autor**: Claude AI

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [FASE 1: Fundações](#fase-1-fundações-2-3-semanas)
3. [FASE 2: Discovery & Engajamento](#fase-2-discovery--engajamento-2-3-semanas)
4. [FASE 3: Experiência Visual](#fase-3-experiência-visual-1-2-semanas)
5. [FASE 4: Navegação Avançada](#fase-4-navegação-avançada-1-2-semanas)
6. [FASE 5: Features Sociais Avançadas](#fase-5-features-sociais-avançadas-2-3-semanas)
7. [FASE 6: Gamificação & Métricas](#fase-6-gamificação--métricas-1-semana)
8. [FASE 7: Responsividade & Acessibilidade](#fase-7-responsividade--acessibilidade-1-semana)
9. [FASE 8: Performance & Polimento](#fase-8-performance--polimento-1-semana)

---

## Visão Geral

### Objetivo
Transformar o sistema de perfil/social existente em uma experiência moderna, completa e sem regressões.

### Princípios
- ✅ **Zero Regressão**: Todas as funcionalidades existentes continuam operando
- ✅ **Aditivo**: Novos componentes adicionam features, não substituem
- ✅ **Progressive Enhancement**: Features avançadas são opcionais
- ✅ **Mobile-First**: Design responsivo por padrão
- ✅ **Acessível**: WCAG 2.1 AA compliance

### Stack Tecnológico
```yaml
Frontend:
  - React 18+ (já existente)
  - TypeScript 5+ (já existente)
  - TailwindCSS 3+ (já existente)
  - shadcn/ui (já existente)
  - react-router-dom (já existente)
  - Novas libs:
    - @tiptap/react (rich text editor)
    - cmdk (command palette)
    - framer-motion (animações)
    - react-intersection-observer (lazy loading)

Backend:
  - Node.js + Fastify (já existente)
  - Prisma + PostgreSQL (já existente)
  - @polkadot/api (já existente)

Infraestrutura:
  - IPFS (já existente)
  - Redis (novo - cache/real-time)
  - WebSocket (novo - notificações)
```

---

## FASE 1: Fundações (2-3 semanas)

### 🎯 Objetivo
Implementar a capacidade de criar, visualizar e interagir com posts.

### 📦 Entregáveis
1. Sistema de criação de posts
2. Card de post interativo
3. User menu dropdown
4. Melhorias no Dashboard

---

### 1.1 Sistema de Criação de Posts

#### **Backend: API Endpoints**

**Já Existe**: `POST /posts` (apps/api/src/routes/posts.ts)

**Extensões Necessárias**:

```typescript
// apps/api/src/routes/posts.ts

// ADICIONAR: Upload de imagens inline
app.post('/posts/upload-image', {
  preHandler: authOnRequest,
  config: {
    rateLimit: { max: 10, timeWindow: '1 minute' }
  }
}, async (request, reply) => {
  const data = await request.file();
  if (!data) {
    return reply.status(400).send({ error: 'No file uploaded' });
  }

  // Validação
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedMimeTypes.includes(data.mimetype)) {
    return reply.status(400).send({ error: 'Invalid image type' });
  }

  const maxSize = 5 * 1024 * 1024; // 5MB
  const buffer = await data.toBuffer();
  if (buffer.length > maxSize) {
    return reply.status(400).send({ error: 'Image too large (max 5MB)' });
  }

  // Upload para storage (MediaAsset)
  const hash = crypto.createHash('sha256').update(buffer).digest('hex');

  const existing = await prisma.mediaAsset.findFirst({
    where: { contentHash: hash }
  });

  if (existing) {
    return reply.send({ url: existing.url });
  }

  // Salvar arquivo
  const filename = `${Date.now()}-${data.filename}`;
  const filepath = path.join(process.cwd(), 'uploads', filename);
  await fs.writeFile(filepath, buffer);

  const asset = await prisma.mediaAsset.create({
    data: {
      url: `/uploads/${filename}`,
      mime: data.mimetype,
      size: buffer.length,
      contentHash: hash,
      ownerType: 'post',
    }
  });

  return reply.send({ url: asset.url });
});

// ADICIONAR: Salvar rascunhos
app.post('/posts/drafts', {
  preHandler: authOnRequest
}, async (request, reply) => {
  const authUser = (request as any).authUser;
  const { content, media } = request.body as any;

  const profile = await prisma.profile.findUnique({
    where: { userId: authUser.sub },
    select: { id: true }
  });

  if (!profile) {
    return reply.status(400).send({ error: 'Profile not found' });
  }

  // Salvar como rascunho (adicionar campo `status` em Post)
  const draft = await prisma.post.create({
    data: {
      authorId: profile.id,
      kind: 'text',
      content,
      media: media as any,
      // TODO: adicionar campo status: 'draft'
    }
  });

  return reply.send({ draft });
});
```

**Migração Prisma**:

```prisma
// apps/api/prisma/schema.prisma

enum PostStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}

model Post {
  id        String     @id @default(cuid())
  authorId  String
  author    Profile    @relation(fields: [authorId], references: [id])
  kind      String     // 'text' | 'image' | 'link'
  content   String     @db.Text
  media     Json?
  status    PostStatus @default(PUBLISHED) // NOVO
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt          // NOVO

  // Novos relacionamentos
  likes     PostLike[]
  comments  PostComment[]

  @@index([authorId, createdAt])
  @@index([status])
}

model PostLike {
  id        String   @id @default(cuid())
  postId    String
  userId    String   // User.id
  createdAt DateTime @default(now())

  post Post @relation(fields: [postId], references: [id], onDelete: Cascade)

  @@unique([postId, userId])
  @@index([postId])
  @@index([userId])
}

model PostComment {
  id        String   @id @default(cuid())
  postId    String
  authorId  String   // Profile.id
  content   String   @db.Text
  parentId  String?  // para respostas
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  post   Post         @relation(fields: [postId], references: [id], onDelete: Cascade)
  author Profile      @relation(fields: [authorId], references: [id])
  parent PostComment? @relation("CommentReplies", fields: [parentId], references: [id])
  replies PostComment[] @relation("CommentReplies")

  @@index([postId, createdAt])
  @@index([authorId])
}
```

**Comandos**:
```bash
cd apps/api
npx prisma migrate dev --name add_post_interactions
```

---

#### **Frontend: Componentes**

##### **CreatePostButton.tsx**

```typescript
// apps/web/src/components/social/CreatePostButton.tsx

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { CreatePostModal } from './CreatePostModal';

export function CreatePostButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg md:h-auto md:w-auto md:rounded-md md:px-4"
        size="icon"
      >
        <Plus className="h-6 w-6 md:mr-2" />
        <span className="hidden md:inline">Criar Post</span>
      </Button>

      <CreatePostModal open={open} onOpenChange={setOpen} />
    </>
  );
}
```

##### **CreatePostModal.tsx**

```typescript
// apps/web/src/components/social/CreatePostModal.tsx

import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { apiHelpers } from '@/lib/api';
import { toast } from 'sonner';
import { ImagePlus, Smile, AtSign, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const MAX_LENGTH = 5000;

interface CreatePostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreatePostModal({ open, onOpenChange }: CreatePostModalProps) {
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast.error('Digite algo para postar');
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        kind: 'text',
        content: content.trim()
      };

      if (images.length > 0) {
        payload.media = images.map(url => ({ url, type: 'image' }));
      }

      await apiHelpers.createPost(payload);

      toast.success('Post publicado!');
      setContent('');
      setImages([]);
      onOpenChange(false);

      // Navegar para o próprio perfil
      // TODO: buscar handle do usuário atual
      // navigate(`/u/${handle}`);
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao publicar post');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    if (images.length >= 4) {
      toast.error('Máximo de 4 imagens por post');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      // TODO: implementar endpoint /posts/upload-image
      const res: any = await apiHelpers.uploadFile(file);
      setImages([...images, res.url]);
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
          <DialogTitle>Criar Post</DialogTitle>
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
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6"
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

              <Button variant="ghost" size="icon" disabled>
                <Smile className="h-5 w-5" />
              </Button>

              <Button variant="ghost" size="icon" disabled>
                <AtSign className="h-5 w-5" />
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

              <Button
                onClick={handleSubmit}
                disabled={loading || !content.trim()}
              >
                {loading ? 'Publicando...' : 'Publicar'}
              </Button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            💡 Dica: Pressione <kbd>Ctrl</kbd>+<kbd>Enter</kbd> para publicar
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

---

### 1.2 Card de Post Interativo

#### **PostCard.tsx**

```typescript
// apps/web/src/components/social/PostCard.tsx

import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, MessageCircle, Repeat2, MoreHorizontal } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
    // Contadores (vir da API)
    likesCount?: number;
    commentsCount?: number;
    repostsCount?: number;
  };
}

export function PostCard({ post }: PostCardProps) {
  const timeAgo = formatDistanceToNow(new Date(post.createdAt), {
    addSuffix: true,
    locale: ptBR
  });

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <Link to={`/u/${post.author.handle}`}>
            {post.author.avatarUrl ? (
              <img
                src={post.author.avatarUrl}
                alt={post.author.displayName}
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-muted" />
            )}
          </Link>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Link
                to={`/u/${post.author.handle}`}
                className="font-semibold hover:underline"
              >
                {post.author.displayName}
              </Link>
              <Link
                to={`/u/${post.author.handle}`}
                className="text-sm text-muted-foreground hover:underline"
              >
                @{post.author.handle}
              </Link>
              <span className="text-sm text-muted-foreground">·</span>
              <span className="text-sm text-muted-foreground">
                {timeAgo}
              </span>
            </div>
          </div>

          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="mb-3">
          <p className="whitespace-pre-wrap break-words">
            {post.content}
          </p>
        </div>

        {/* Media */}
        {post.media && post.media.length > 0 && (
          <div className={`grid gap-2 mb-3 ${
            post.media.length === 1 ? 'grid-cols-1' :
            post.media.length === 2 ? 'grid-cols-2' :
            'grid-cols-2'
          }`}>
            {post.media.map((item, index) => (
              <img
                key={index}
                src={item.url}
                alt={`Media ${index + 1}`}
                className="w-full h-auto rounded-md object-cover"
                loading="lazy"
              />
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1 pt-2 border-t">
          <Button variant="ghost" size="sm" className="flex-1">
            <Heart className="h-4 w-4 mr-2" />
            {post.likesCount || 0}
          </Button>

          <Button variant="ghost" size="sm" className="flex-1">
            <MessageCircle className="h-4 w-4 mr-2" />
            {post.commentsCount || 0}
          </Button>

          <Button variant="ghost" size="sm" className="flex-1">
            <Repeat2 className="h-4 w-4 mr-2" />
            {post.repostsCount || 0}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

### 1.3 User Menu Dropdown

#### **UserMenu.tsx**

```typescript
// apps/web/src/components/UserMenu.tsx

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { apiHelpers } from '@/lib/api';
import {
  User,
  Edit,
  Store,
  BarChart3,
  Settings,
  Moon,
  Globe,
  LogOut
} from 'lucide-react';
import { useTheme } from '@/theme/ThemeProvider';
import { ReputationBadge } from './profile/ReputationBadge';

export function UserMenu() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res: any = await apiHelpers.getMeProfile();
        if (active) {
          setProfile(res.profile);
        }
      } catch (error) {
        // Handle error
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const handleLogout = () => {
    // TODO: implement logout
    localStorage.removeItem('accessToken');
    navigate('/');
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  if (loading) {
    return (
      <Button variant="ghost" size="icon" disabled>
        <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
      </Button>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={profile.displayName}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
              <User className="h-5 w-5" />
            </div>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-64" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {profile.displayName}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              @{profile.handle}
            </p>
            {profile.reputationScore !== undefined && (
              <div className="pt-2">
                <ReputationBadge
                  score={profile.reputationScore}
                  tier={profile.reputationTier || 'bronze'}
                  size="sm"
                />
              </div>
            )}
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link to={`/u/${profile.handle}`} className="cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            Meu Perfil
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link to="/app/profile/edit" className="cursor-pointer">
            <Edit className="mr-2 h-4 w-4" />
            Editar Perfil
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link to="/app/sellers" className="cursor-pointer">
            <Store className="mr-2 h-4 w-4" />
            Minhas Lojas
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link to="/app/stats" className="cursor-pointer">
            <BarChart3 className="mr-2 h-4 w-4" />
            Estatísticas
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={toggleTheme}>
          <Moon className="mr-2 h-4 w-4" />
          Tema: {theme === 'dark' ? 'Escuro' : 'Claro'}
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link to="/app/settings" className="cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            Configurações
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleLogout} className="text-red-600">
          <LogOut className="mr-2 h-4 w-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

**Integração no AppHeader**:

```typescript
// apps/web/src/components/AppHeader.tsx

// Adicionar import
import { UserMenu } from './UserMenu';

// Substituir linha 136:
// {/* <UserMenu /> */}
// Por:
<UserMenu />
```

---

### 1.4 Melhorias no Dashboard

#### **DashboardPage.tsx - Nova Seção**

```typescript
// apps/web/src/pages/DashboardPage.tsx

// Adicionar no topo da página (após header, antes dos ModuleCards)

{/* Quick Post */}
<Card className="mb-6">
  <CardContent className="p-4">
    <div className="flex items-start gap-3">
      {profile?.avatarUrl ? (
        <img
          src={profile.avatarUrl}
          alt={profile.displayName}
          className="h-10 w-10 rounded-full object-cover"
        />
      ) : (
        <div className="h-10 w-10 rounded-full bg-muted" />
      )}

      <Button
        variant="outline"
        className="flex-1 justify-start text-muted-foreground"
        onClick={() => {
          // TODO: abrir CreatePostModal
          // setCreatePostOpen(true);
        }}
      >
        O que você está pensando?
      </Button>
    </div>
  </CardContent>
</Card>
```

---

## Resumo da Fase 1

### Arquivos Novos
```
apps/web/src/components/social/
  ├── CreatePostButton.tsx
  ├── CreatePostModal.tsx
  └── PostCard.tsx

apps/web/src/components/
  └── UserMenu.tsx
```

### Arquivos Modificados
```
apps/api/src/routes/posts.ts          (upload de imagens)
apps/api/prisma/schema.prisma          (modelos Like/Comment)
apps/web/src/components/AppHeader.tsx  (UserMenu)
apps/web/src/pages/DashboardPage.tsx   (Quick post)
apps/web/src/lib/api.ts                (helper uploadImage)
```

### Migrations
```bash
npx prisma migrate dev --name add_post_interactions
```

### Testes
```typescript
// apps/web/src/components/social/__tests__/CreatePostModal.test.tsx
// apps/web/src/components/social/__tests__/PostCard.test.tsx
// apps/api/src/routes/__tests__/posts.test.ts
```

---

**Continua na próxima seção...**
