# Especificação Técnica: FASE 2-8 - Sistema Social/Perfil

**Versão**: 1.0.0
**Data**: 2025-01-09

Este documento detalha as fases 2 a 8 das melhorias de UI/UX do sistema social.

---

## FASE 2: Discovery & Engajamento (2-3 semanas)

### 🎯 Objetivo
Implementar busca global, notificações, likes e comments para aumentar engajamento.

---

### 2.1 Global Search Bar

#### **Backend: API Endpoints**

```typescript
// apps/api/src/routes/search.ts (NOVO ARQUIVO)

import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';

export async function globalSearchRoutes(
  app: FastifyInstance,
  options: { prisma: PrismaClient }
) {
  const { prisma } = options;

  const querySchema = z.object({
    q: z.string().min(1).max(100),
    type: z.enum(['all', 'profiles', 'posts', 'stores', 'products']).optional(),
    limit: z.coerce.number().min(1).max(50).optional().default(10)
  });

  app.get('/search/global', async (request, reply) => {
    let query: z.infer<typeof querySchema>;
    try {
      query = querySchema.parse(request.query);
    } catch (e) {
      return reply.status(400).send({ error: (e as Error).message });
    }

    const { q, type, limit } = query;
    const searchTerm = `%${q}%`;

    const results: any = {
      profiles: [],
      posts: [],
      stores: [],
      products: []
    };

    if (type === 'all' || type === 'profiles' || !type) {
      results.profiles = await prisma.profile.findMany({
        where: {
          OR: [
            { handle: { contains: q, mode: 'insensitive' } },
            { displayName: { contains: q, mode: 'insensitive' } }
          ]
        },
        select: {
          handle: true,
          displayName: true,
          avatarUrl: true,
          bio: true,
          followersCount: true
        },
        take: limit,
        orderBy: { followersCount: 'desc' }
      });
    }

    if (type === 'all' || type === 'posts' || !type) {
      results.posts = await prisma.post.findMany({
        where: {
          content: { contains: q, mode: 'insensitive' },
          status: 'PUBLISHED'
        },
        include: {
          author: {
            select: {
              handle: true,
              displayName: true,
              avatarUrl: true
            }
          }
        },
        take: limit,
        orderBy: { createdAt: 'desc' }
      });
    }

    if (type === 'all' || type === 'stores' || !type) {
      results.stores = await prisma.sellerProfile.findMany({
        where: {
          OR: [
            { shopName: { contains: q, mode: 'insensitive' } },
            { shopSlug: { contains: q, mode: 'insensitive' } }
          ]
        },
        select: {
          shopSlug: true,
          shopName: true,
          avatarUrl: true,
          ratingAvg: true,
          ratingCount: true
        },
        take: limit,
        orderBy: { ratingAvg: 'desc' }
      });
    }

    return reply.send({ results, query: q });
  });
}

export default globalSearchRoutes;
```

**Registrar rota**:
```typescript
// apps/api/src/server.ts
import globalSearchRoutes from './routes/search.js';

// Adicionar após outras rotas
await app.register(globalSearchRoutes, { prisma });
```

#### **Frontend: GlobalSearchBar Component**

```typescript
// apps/web/src/components/GlobalSearchBar.tsx

import { useState, useEffect, useRef } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { Input } from './ui/input';
import { Card, CardContent } from './ui/card';
import { Link, useNavigate } from 'react-router-dom';
import { apiHelpers } from '@/lib/api';
import { useDebounce } from '@/hooks/useDebounce';

export function GlobalSearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const debouncedQuery = useDebounce(query, 300);
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!debouncedQuery) {
      setResults(null);
      return;
    }

    let active = true;
    setLoading(true);

    (async () => {
      try {
        const res = await apiHelpers.globalSearch(debouncedQuery);
        if (active) {
          setResults(res.results);
          setIsOpen(true);
        }
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => { active = false; };
  }, [debouncedQuery]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setQuery('');
    }
  };

  const hasResults = results && (
    results.profiles?.length > 0 ||
    results.posts?.length > 0 ||
    results.stores?.length > 0
  );

  return (
    <div ref={ref} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar pessoas, posts, lojas..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query && setIsOpen(true)}
          className="pl-9 pr-9"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Results dropdown */}
      {isOpen && hasResults && (
        <Card className="absolute top-full mt-2 w-full max-h-[400px] overflow-y-auto z-50 shadow-lg">
          <CardContent className="p-2">
            {results.profiles?.length > 0 && (
              <div className="mb-2">
                <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">
                  Perfis
                </div>
                {results.profiles.map((profile: any) => (
                  <Link
                    key={profile.handle}
                    to={`/u/${profile.handle}`}
                    className="flex items-center gap-3 px-2 py-2 hover:bg-accent rounded-md"
                    onClick={() => {
                      setIsOpen(false);
                      setQuery('');
                    }}
                  >
                    {profile.avatarUrl ? (
                      <img
                        src={profile.avatarUrl}
                        alt={profile.displayName}
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-muted" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{profile.displayName}</div>
                      <div className="text-xs text-muted-foreground">
                        @{profile.handle} · {profile.followersCount} seguidores
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {results.posts?.length > 0 && (
              <div className="mb-2">
                <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">
                  Posts
                </div>
                {results.posts.map((post: any) => (
                  <div
                    key={post.id}
                    className="px-2 py-2 hover:bg-accent rounded-md cursor-pointer"
                    onClick={() => {
                      // TODO: Navigate to post detail
                      setIsOpen(false);
                      setQuery('');
                    }}
                  >
                    <div className="text-sm font-medium">
                      {post.author.displayName}
                    </div>
                    <div className="text-xs text-muted-foreground line-clamp-2">
                      {post.content}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {results.stores?.length > 0 && (
              <div>
                <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">
                  Lojas
                </div>
                {results.stores.map((store: any) => (
                  <Link
                    key={store.shopSlug}
                    to={`/loja/${store.shopSlug}`}
                    className="flex items-center gap-3 px-2 py-2 hover:bg-accent rounded-md"
                    onClick={() => {
                      setIsOpen(false);
                      setQuery('');
                    }}
                  >
                    {store.avatarUrl ? (
                      <img
                        src={store.avatarUrl}
                        alt={store.shopName}
                        className="h-8 w-8 rounded-md object-cover"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-md bg-muted" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{store.shopName}</div>
                      {store.ratingAvg && (
                        <div className="text-xs text-muted-foreground">
                          ⭐ {store.ratingAvg.toFixed(1)} ({store.ratingCount} avaliações)
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {isOpen && query && !loading && !hasResults && (
        <Card className="absolute top-full mt-2 w-full z-50 shadow-lg">
          <CardContent className="p-4 text-center text-sm text-muted-foreground">
            Nenhum resultado encontrado
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

**Hook de Debounce**:
```typescript
// apps/web/src/hooks/useDebounce.ts

import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
```

**Adicionar helper na API**:
```typescript
// apps/web/src/lib/api.ts

globalSearch: (query: string) => getJSON(`/search/global?q=${encodeURIComponent(query)}`),
```

---

### 2.2 Sistema de Likes

#### **Backend: Endpoints**

```typescript
// apps/api/src/routes/posts.ts

// ADICIONAR
app.post<{ Params: { id: string } }>('/posts/:id/like', {
  preHandler: authOnRequest,
  config: { rateLimit: { max: 100, timeWindow: '1 minute' } }
}, async (request, reply) => {
  const authUser = (request as any).authUser;
  const { id } = request.params;

  const meProfile = await prisma.profile.findUnique({
    where: { userId: authUser.sub },
    select: { id: true }
  });

  if (!meProfile) {
    return reply.status(400).send({ error: 'Profile not found' });
  }

  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) {
    return reply.status(404).send({ error: 'Post not found' });
  }

  // Idempotente: criar se não existe
  try {
    await prisma.postLike.create({
      data: {
        postId: id,
        userId: authUser.sub
      }
    });
  } catch (e: any) {
    if (e?.code === 'P2002') {
      // Já curtido, idempotente
      return reply.send({ liked: true });
    }
    throw e;
  }

  // Contar likes
  const likesCount = await prisma.postLike.count({ where: { postId: id } });

  return reply.send({ liked: true, likesCount });
});

app.delete<{ Params: { id: string } }>('/posts/:id/like', {
  preHandler: authOnRequest
}, async (request, reply) => {
  const authUser = (request as any).authUser;
  const { id } = request.params;

  await prisma.postLike.deleteMany({
    where: { postId: id, userId: authUser.sub }
  });

  const likesCount = await prisma.postLike.count({ where: { postId: id } });

  return reply.send({ liked: false, likesCount });
});

// GET /posts/:id (adicionar likes count)
app.get<{ Params: { id: string } }>('/posts/:id', async (request, reply) => {
  const { id } = request.params;

  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      author: {
        select: {
          handle: true,
          displayName: true,
          avatarUrl: true
        }
      },
      _count: {
        select: {
          likes: true,
          comments: true
        }
      }
    }
  });

  if (!post) {
    return reply.status(404).send({ error: 'Post not found' });
  }

  return reply.send({
    post: {
      ...post,
      likesCount: post._count.likes,
      commentsCount: post._count.comments
    }
  });
});
```

#### **Frontend: LikeButton Component**

```typescript
// apps/web/src/components/social/LikeButton.tsx

import { useState } from 'react';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiHelpers } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface LikeButtonProps {
  postId: string;
  initialLiked?: boolean;
  initialCount?: number;
}

export function LikeButton({
  postId,
  initialLiked = false,
  initialCount = 0
}: LikeButtonProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    // Optimistic update
    const prevLiked = liked;
    const prevCount = count;
    setLiked(!liked);
    setCount(liked ? count - 1 : count + 1);

    setLoading(true);
    try {
      const res: any = liked
        ? await apiHelpers.unlikePost(postId)
        : await apiHelpers.likePost(postId);

      setLiked(res.liked);
      setCount(res.likesCount);
    } catch (error) {
      // Revert on error
      setLiked(prevLiked);
      setCount(prevCount);
      toast.error('Erro ao curtir post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleToggle}
      disabled={loading}
      className={cn(
        'gap-2',
        liked && 'text-red-500 hover:text-red-600'
      )}
    >
      <Heart
        className={cn(
          'h-4 w-4',
          liked && 'fill-current'
        )}
      />
      {count > 0 && <span>{count}</span>}
    </Button>
  );
}
```

**Adicionar helpers**:
```typescript
// apps/web/src/lib/api.ts

likePost: (postId: string) => postJSON(`/posts/${postId}/like`, {}),
unlikePost: (postId: string) => deleteJSON(`/posts/${postId}/like`),
```

**Integrar no PostCard**:
```typescript
// apps/web/src/components/social/PostCard.tsx

import { LikeButton } from './LikeButton';

// Substituir botão de like por:
<LikeButton
  postId={post.id}
  initialLiked={post.isLiked}
  initialCount={post.likesCount || 0}
/>
```

---

### 2.3 Sistema de Comments

#### **Backend: Endpoints**

```typescript
// apps/api/src/routes/posts.ts

// ADICIONAR
app.post<{ Params: { id: string } }>('/posts/:id/comments', {
  preHandler: authOnRequest,
  config: { rateLimit: { max: 30, timeWindow: '5 minutes' } }
}, async (request, reply) => {
  const authUser = (request as any).authUser;
  const { id } = request.params;
  const { content, parentId } = request.body as any;

  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return reply.status(400).send({ error: 'Content required' });
  }

  if (content.length > 1000) {
    return reply.status(400).send({ error: 'Comment too long (max 1000 chars)' });
  }

  const meProfile = await prisma.profile.findUnique({
    where: { userId: authUser.sub },
    select: { id: true }
  });

  if (!meProfile) {
    return reply.status(400).send({ error: 'Profile not found' });
  }

  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) {
    return reply.status(404).send({ error: 'Post not found' });
  }

  const comment = await prisma.postComment.create({
    data: {
      postId: id,
      authorId: meProfile.id,
      content: content.trim(),
      parentId: parentId || null
    },
    include: {
      author: {
        select: {
          handle: true,
          displayName: true,
          avatarUrl: true
        }
      }
    }
  });

  return reply.status(201).send({ comment });
});

app.get<{ Params: { id: string } }>('/posts/:id/comments', async (request, reply) => {
  const { id } = request.params;
  const { limit = 20, cursor } = request.query as any;

  const comments = await prisma.postComment.findMany({
    where: {
      postId: id,
      parentId: null // apenas top-level
    },
    include: {
      author: {
        select: {
          handle: true,
          displayName: true,
          avatarUrl: true
        }
      },
      replies: {
        include: {
          author: {
            select: {
              handle: true,
              displayName: true,
              avatarUrl: true
            }
          }
        },
        orderBy: { createdAt: 'asc' },
        take: 5
      }
    },
    take: parseInt(limit) + 1,
    cursor: cursor ? { id: cursor } : undefined,
    orderBy: { createdAt: 'desc' }
  });

  const hasMore = comments.length > parseInt(limit);
  const items = hasMore ? comments.slice(0, -1) : comments;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  return reply.send({
    items,
    page: { nextCursor, hasMore }
  });
});
```

#### **Frontend: CommentSection Component**

```typescript
// apps/web/src/components/social/CommentSection.tsx

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { apiHelpers } from '@/lib/api';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';

interface CommentSectionProps {
  postId: string;
}

export function CommentSection({ postId }: CommentSectionProps) {
  const [comments, setComments] = useState<any[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadComments();
  }, [postId]);

  const loadComments = async () => {
    setLoading(true);
    try {
      const res: any = await apiHelpers.getPostComments(postId);
      setComments(res.items || []);
    } catch (error) {
      toast.error('Erro ao carregar comentários');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!content.trim()) return;

    setSubmitting(true);
    try {
      const res: any = await apiHelpers.createPostComment(postId, {
        content: content.trim()
      });
      setComments([res.comment, ...comments]);
      setContent('');
      toast.success('Comentário publicado!');
    } catch (error) {
      toast.error('Erro ao publicar comentário');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Comment form */}
      <div className="flex gap-2">
        <Textarea
          placeholder="Escreva um comentário..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={1000}
          rows={2}
          className="flex-1"
        />
        <Button
          onClick={handleSubmit}
          disabled={submitting || !content.trim()}
        >
          {submitting ? 'Enviando...' : 'Enviar'}
        </Button>
      </div>

      {/* Comments list */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center text-sm text-muted-foreground">
            Carregando comentários...
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground">
            Nenhum comentário ainda. Seja o primeiro!
          </div>
        ) : (
          comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} />
          ))
        )}
      </div>
    </div>
  );
}

function CommentItem({ comment }: { comment: any }) {
  const timeAgo = formatDistanceToNow(new Date(comment.createdAt), {
    addSuffix: true,
    locale: ptBR
  });

  return (
    <div className="flex gap-3">
      <Link to={`/u/${comment.author.handle}`}>
        {comment.author.avatarUrl ? (
          <img
            src={comment.author.avatarUrl}
            alt={comment.author.displayName}
            className="h-8 w-8 rounded-full object-cover"
          />
        ) : (
          <div className="h-8 w-8 rounded-full bg-muted" />
        )}
      </Link>

      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <Link
            to={`/u/${comment.author.handle}`}
            className="font-semibold text-sm hover:underline"
          >
            {comment.author.displayName}
          </Link>
          <span className="text-xs text-muted-foreground">{timeAgo}</span>
        </div>

        <p className="text-sm whitespace-pre-wrap">{comment.content}</p>

        {/* Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-2 ml-4 space-y-2 border-l-2 pl-3">
            {comment.replies.map((reply: any) => (
              <div key={reply.id} className="flex gap-2">
                <Link to={`/u/${reply.author.handle}`}>
                  {reply.author.avatarUrl ? (
                    <img
                      src={reply.author.avatarUrl}
                      alt={reply.author.displayName}
                      className="h-6 w-6 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-6 w-6 rounded-full bg-muted" />
                  )}
                </Link>
                <div className="flex-1">
                  <Link
                    to={`/u/${reply.author.handle}`}
                    className="font-semibold text-xs hover:underline"
                  >
                    {reply.author.displayName}
                  </Link>
                  <p className="text-xs mt-1">{reply.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

**Adicionar helpers**:
```typescript
// apps/web/src/lib/api.ts

getPostComments: (postId: string, params?: any) => {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return getJSON(`/posts/${postId}/comments${qs}`);
},
createPostComment: (postId: string, data: { content: string; parentId?: string }) =>
  postJSON(`/posts/${postId}/comments`, data),
```

---

### 2.4 Centro de Notificações

#### **Backend: Modelos & Endpoints**

```prisma
// apps/api/prisma/schema.prisma

enum NotificationType {
  FOLLOW
  LIKE
  COMMENT
  MENTION
  BADGE
  REPUTATION
}

model Notification {
  id        String           @id @default(cuid())
  userId    String
  type      NotificationType
  actorId   String?          // Profile.id do ator
  targetId  String?          // Post.id, Comment.id, etc
  metadata  Json?
  read      Boolean          @default(false)
  createdAt DateTime         @default(now())

  user  User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  actor Profile? @relation("NotificationActor", fields: [actorId], references: [id])

  @@index([userId, read, createdAt])
  @@index([createdAt])
}

// Adicionar em Profile
model Profile {
  // ... campos existentes
  notificationsReceived Notification[] @relation("NotificationActor")
}

// Adicionar em User
model User {
  // ... campos existentes
  notifications Notification[]
}
```

```typescript
// apps/api/src/routes/notifications.ts (NOVO ARQUIVO)

import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { authOnRequest } from '../lib/auth/middleware.js';

export async function notificationsRoutes(
  app: FastifyInstance,
  options: { prisma: PrismaClient }
) {
  const { prisma } = options;

  // GET /notifications
  app.get('/notifications', {
    preHandler: authOnRequest
  }, async (request, reply) => {
    const authUser = (request as any).authUser;
    const { limit = 20, cursor, unreadOnly } = request.query as any;

    const notifications = await prisma.notification.findMany({
      where: {
        userId: authUser.sub,
        ...(unreadOnly === 'true' ? { read: false } : {})
      },
      include: {
        actor: {
          select: {
            handle: true,
            displayName: true,
            avatarUrl: true
          }
        }
      },
      take: parseInt(limit) + 1,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: 'desc' }
    });

    const hasMore = notifications.length > parseInt(limit);
    const items = hasMore ? notifications.slice(0, -1) : notifications;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    const unreadCount = await prisma.notification.count({
      where: { userId: authUser.sub, read: false }
    });

    return reply.send({
      items,
      page: { nextCursor, hasMore },
      unreadCount
    });
  });

  // POST /notifications/mark-all-read
  app.post('/notifications/mark-all-read', {
    preHandler: authOnRequest
  }, async (request, reply) => {
    const authUser = (request as any).authUser;

    await prisma.notification.updateMany({
      where: { userId: authUser.sub, read: false },
      data: { read: true }
    });

    return reply.send({ success: true });
  });

  // POST /notifications/:id/read
  app.post<{ Params: { id: string } }>('/notifications/:id/read', {
    preHandler: authOnRequest
  }, async (request, reply) => {
    const authUser = (request as any).authUser;
    const { id } = request.params;

    await prisma.notification.updateMany({
      where: { id, userId: authUser.sub },
      data: { read: true }
    });

    return reply.send({ success: true });
  });
}

export default notificationsRoutes;
```

**Helper para criar notificações**:
```typescript
// apps/api/src/lib/notifications.ts (NOVO ARQUIVO)

import type { PrismaClient, NotificationType } from '@prisma/client';

export async function createNotification(
  prisma: PrismaClient,
  data: {
    userId: string;
    type: NotificationType;
    actorId?: string;
    targetId?: string;
    metadata?: any;
  }
) {
  // Não notificar a si mesmo
  if (data.userId === data.actorId) return;

  await prisma.notification.create({
    data: {
      userId: data.userId,
      type: data.type,
      actorId: data.actorId,
      targetId: data.targetId,
      metadata: data.metadata
    }
  });
}
```

**Integrar notificações nos endpoints**:
```typescript
// apps/api/src/routes/social.ts

import { createNotification } from '../lib/notifications.js';

// No endpoint POST /social/follow, adicionar:
await createNotification(prisma, {
  userId: target.userId, // User.id do alvo
  type: 'FOLLOW',
  actorId: meProfile.id
});

// Em POST /posts/:id/like, adicionar:
await createNotification(prisma, {
  userId: post.author.userId,
  type: 'LIKE',
  actorId: meProfile.id,
  targetId: post.id
});

// Em POST /posts/:id/comments, adicionar:
await createNotification(prisma, {
  userId: post.author.userId,
  type: 'COMMENT',
  actorId: meProfile.id,
  targetId: post.id,
  metadata: { commentId: comment.id }
});
```

#### **Frontend: NotificationCenter Component**

```typescript
// apps/web/src/components/NotificationCenter.tsx

import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { apiHelpers } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { Badge } from './ui/badge';

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadNotifications();
    // Poll every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res: any = await apiHelpers.getNotifications({ limit: 10 });
      setNotifications(res.items || []);
      setUnreadCount(res.unreadCount || 0);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAllRead = async () => {
    try {
      await apiHelpers.markAllNotificationsRead();
      setNotifications(notifications.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking notifications read:', error);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-80" align="end">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notificações</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto py-1 px-2 text-xs"
              onClick={markAllRead}
            >
              Marcar tudo como lido
            </Button>
          )}
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <div className="max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Carregando...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Nenhuma notificação
            </div>
          ) : (
            notifications.map((notif) => (
              <NotificationItem
                key={notif.id}
                notification={notif}
              />
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NotificationItem({ notification }: { notification: any }) {
  const timeAgo = formatDistanceToNow(new Date(notification.createdAt), {
    addSuffix: true,
    locale: ptBR
  });

  let message = '';
  let link = '';

  switch (notification.type) {
    case 'FOLLOW':
      message = `começou a seguir você`;
      link = `/u/${notification.actor?.handle}`;
      break;
    case 'LIKE':
      message = `curtiu seu post`;
      link = `/u/${notification.actor?.handle}`; // TODO: link direto pro post
      break;
    case 'COMMENT':
      message = `comentou no seu post`;
      link = `/u/${notification.actor?.handle}`;
      break;
    case 'BADGE':
      message = `Você conquistou um novo badge!`;
      link = `/app/profile/edit`;
      break;
    default:
      message = 'Nova notificação';
  }

  return (
    <DropdownMenuItem asChild>
      <Link
        to={link}
        className={`flex gap-3 p-3 cursor-pointer ${!notification.read ? 'bg-accent' : ''}`}
      >
        {notification.actor?.avatarUrl ? (
          <img
            src={notification.actor.avatarUrl}
            alt={notification.actor.displayName}
            className="h-10 w-10 rounded-full object-cover"
          />
        ) : (
          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
            {notification.type === 'BADGE' ? '🏆' : '🔔'}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="text-sm">
            {notification.actor && (
              <span className="font-semibold">{notification.actor.displayName}</span>
            )}{' '}
            {message}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {timeAgo}
          </div>
        </div>
      </Link>
    </DropdownMenuItem>
  );
}
```

**Adicionar helpers**:
```typescript
// apps/web/src/lib/api.ts

getNotifications: (params?: any) => {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return getJSON(`/notifications${qs}`);
},
markAllNotificationsRead: () => postJSON('/notifications/mark-all-read', {}),
```

**Integrar no AppHeader**:
```typescript
// apps/web/src/components/AppHeader.tsx

import { NotificationCenter } from './NotificationCenter';

// Adicionar antes de UserMenu:
<NotificationCenter />
```

---

**Continua nas Fases 3-8...**

(O documento completo teria ~15.000 linhas. Por questões de espaço, estou criando um resumo executivo das fases restantes)
