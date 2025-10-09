import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authOnRequest } from '../lib/auth/middleware.js';
import { createNotification } from '../lib/notifications.js';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

export async function postsRoutes(app: FastifyInstance, options: { prisma: PrismaClient }) {
  const { prisma } = options;

  const createSchema = z.object({
    kind: z.literal('text'),
    content: z.string().min(1).max(5000),
    media: z.array(z.object({ url: z.string().url(), width: z.number().optional(), height: z.number().optional(), type: z.string().optional() })).optional(),
  });

  const TAGS_REGEX = /<[^>]*>/g;
  function sanitizePlainText(input: string): string {
    // remove quaisquer tags HTML e normaliza espaços
    return input.replace(TAGS_REGEX, '').replace(/\s+$/g, '').trim();
  }

  // POST /posts/upload-image
  app.post('/posts/upload-image', {
    preHandler: authOnRequest,
    config: { rateLimit: { max: 10, timeWindow: '5 minutes' } },
  }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string } | undefined;
    if (!authUser) return reply.status(401).send({ error: 'Token inválido.' });

    const meProfile = await prisma.profile.findUnique({ where: { userId: authUser.sub }, select: { id: true } });
    if (!meProfile) return reply.status(400).send({ error: 'Perfil do usuário não encontrado' });

    const data = await request.file();
    if (!data) return reply.status(400).send({ error: 'Nenhum arquivo enviado' });

    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedMimes.includes(data.mimetype)) {
      return reply.status(400).send({ error: 'Tipo de arquivo não permitido. Use jpeg, png, gif ou webp.' });
    }

    const buffer = await data.toBuffer();
    if (buffer.length > 5 * 1024 * 1024) {
      return reply.status(400).send({ error: 'Arquivo muito grande. Máximo 5MB.' });
    }

    // Calcular hash SHA256 para deduplicação
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');

    // Verificar se já existe
    const existing = await prisma.mediaAsset.findFirst({
      where: { contentHash: hash },
      select: { id: true, url: true, mime: true, size: true }
    });

    if (existing) {
      app.log.info({ event: 'media.upload.deduplicated', hash, assetId: existing.id });
      return reply.send({ asset: existing });
    }

    // Salvar arquivo
    const uploadsDir = process.env.UPLOADS_DIR || './uploads';
    await fs.mkdir(uploadsDir, { recursive: true });

    const ext = path.extname(data.filename) || '.jpg';
    const filename = `${hash}${ext}`;
    const filepath = path.join(uploadsDir, filename);

    await fs.writeFile(filepath, buffer);

    // Criar MediaAsset
    const asset = await prisma.mediaAsset.create({
      data: {
        url: `/uploads/${filename}`,
        mime: data.mimetype,
        size: buffer.length,
        contentHash: hash,
        ownerType: 'profile',
        ownerId: meProfile.id,
      },
      select: { id: true, url: true, mime: true, size: true }
    });

    app.log.info({ event: 'media.upload', assetId: asset.id, hash, size: buffer.length });
    return reply.status(201).send({ asset });
  });

  // POST /posts/drafts
  app.post('/posts/drafts', {
    preHandler: authOnRequest,
    config: { rateLimit: { max: 30, timeWindow: '5 minutes' } },
  }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string } | undefined;
    if (!authUser) return reply.status(401).send({ error: 'Token inválido.' });

    let body: z.infer<typeof createSchema>;
    try { body = createSchema.parse(request.body); } catch (e) { return reply.status(400).send({ error: (e as Error).message }); }

    const meProfile = await prisma.profile.findUnique({ where: { userId: authUser.sub }, select: { id: true } });
    if (!meProfile) return reply.status(400).send({ error: 'Perfil do usuário não encontrado' });

    const safeContent = sanitizePlainText(body.content);
    if (safeContent.length === 0) {
      return reply.status(400).send({ error: 'Conteúdo inválido' });
    }

    const post = await prisma.post.create({
      data: {
        authorId: meProfile.id,
        kind: body.kind,
        content: safeContent,
        media: body.media as any,
        status: 'DRAFT'
      }
    });

    app.log.info({ event: 'post.draft.create', authorProfileId: meProfile.id, postId: post.id });
    return reply.status(201).send({ post: { id: post.id, status: post.status, createdAt: post.createdAt.toISOString() } });
  });

  app.post('/posts', {
    preHandler: authOnRequest,
    config: { rateLimit: { max: Number(process.env.RATE_LIMIT_POST || '30'), timeWindow: '5 minutes' } },
  }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string } | undefined;
    if (!authUser) return reply.status(401).send({ error: 'Token inválido.' });

    let body: z.infer<typeof createSchema>;
    try { body = createSchema.parse(request.body); } catch (e) { return reply.status(400).send({ error: (e as Error).message }); }

    const meProfile = await prisma.profile.findUnique({ where: { userId: authUser.sub }, select: { id: true } });
    if (!meProfile) return reply.status(400).send({ error: 'Perfil do usuário não encontrado' });

    const safeContent = sanitizePlainText(body.content);
    if (safeContent.length === 0) {
      return reply.status(400).send({ error: 'Conteúdo inválido' });
    }
    const result = await prisma.$transaction(async (tx) => {
      const post = await tx.post.create({ data: { authorId: meProfile.id, kind: body.kind, content: safeContent, media: body.media as any } });
      await tx.profile.update({ where: { id: meProfile.id }, data: { postsCount: { increment: 1 } } });
      return post;
    });

    app.log.info({ event: 'post.create', authorProfileId: meProfile.id, postId: result.id });
    return reply.status(201).send({ post: { id: result.id, createdAt: result.createdAt.toISOString() } });
  });

  app.delete<{ Params: { id: string } }>('/posts/:id', {
    preHandler: authOnRequest,
    config: { rateLimit: { max: Number(process.env.RATE_LIMIT_POST || '30'), timeWindow: '5 minutes' } },
  }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string } | undefined;
    if (!authUser) return reply.status(401).send({ error: 'Token inválido.' });
    const { id } = request.params;

    const meProfile = await prisma.profile.findUnique({ where: { userId: authUser.sub }, select: { id: true } });
    if (!meProfile) return reply.status(400).send({ error: 'Perfil do usuário não encontrado' });

    const post = await prisma.post.findUnique({ where: { id }, select: { id: true, authorId: true } });
    if (!post) return reply.status(404).send({ error: 'Post não encontrado' });
    if (post.authorId !== meProfile.id) return reply.status(403).send({ error: 'Não autorizado a deletar este post' });

    await prisma.$transaction(async (tx) => {
      await tx.post.delete({ where: { id } });
      await tx.profile.update({ where: { id: meProfile.id }, data: { postsCount: { decrement: 1 } } });
    });

    return reply.send({ deleted: true });
  });

  // POST /posts/:id/like
  app.post<{ Params: { id: string } }>('/posts/:id/like', {
    preHandler: authOnRequest,
    config: { rateLimit: { max: 100, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string } | undefined;
    if (!authUser) return reply.status(401).send({ error: 'Token inválido.' });
    const { id } = request.params;

    const meProfile = await prisma.profile.findUnique({ where: { userId: authUser.sub }, select: { id: true } });
    if (!meProfile) return reply.status(400).send({ error: 'Perfil do usuário não encontrado' });

    // Verificar se post existe e buscar autor
    const post = await prisma.post.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        author: { select: { userId: true } }
      }
    });
    if (!post) return reply.status(404).send({ error: 'Post não encontrado' });
    if (post.status !== 'PUBLISHED') return reply.status(400).send({ error: 'Post não está publicado' });

    // Criar like (idempotente via unique constraint)
    let likeCreated = false;
    try {
      await prisma.postLike.create({
        data: {
          postId: id,
          profileId: meProfile.id,
        },
      });
      likeCreated = true;
    } catch (error: any) {
      // Se já existe, retornar sucesso (idempotente)
      if (error.code === 'P2002') {
        // Unique constraint violation
        const likesCount = await prisma.postLike.count({ where: { postId: id } });
        return reply.send({ liked: true, likesCount });
      }
      throw error;
    }

    // Criar notificação se like foi criado
    if (likeCreated) {
      await createNotification(prisma, {
        userId: post.author.userId,
        type: 'LIKE',
        actorId: meProfile.id,
        targetId: post.id
      });
    }

    // Contar likes
    const likesCount = await prisma.postLike.count({ where: { postId: id } });

    app.log.info({ event: 'post.like', postId: id, profileId: meProfile.id });
    return reply.send({ liked: true, likesCount });
  });

  // DELETE /posts/:id/like
  app.delete<{ Params: { id: string } }>('/posts/:id/like', {
    preHandler: authOnRequest,
    config: { rateLimit: { max: 100, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string } | undefined;
    if (!authUser) return reply.status(401).send({ error: 'Token inválido.' });
    const { id } = request.params;

    const meProfile = await prisma.profile.findUnique({ where: { userId: authUser.sub }, select: { id: true } });
    if (!meProfile) return reply.status(400).send({ error: 'Perfil do usuário não encontrado' });

    // Verificar se post existe
    const post = await prisma.post.findUnique({ where: { id }, select: { id: true } });
    if (!post) return reply.status(404).send({ error: 'Post não encontrado' });

    // Remover like (idempotente)
    await prisma.postLike.deleteMany({
      where: {
        postId: id,
        profileId: meProfile.id,
      },
    });

    // Contar likes
    const likesCount = await prisma.postLike.count({ where: { postId: id } });

    app.log.info({ event: 'post.unlike', postId: id, profileId: meProfile.id });
    return reply.send({ liked: false, likesCount });
  });

  // GET /posts/:id - Obter detalhes de um post
  app.get<{ Params: { id: string } }>('/posts/:id', async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string } | undefined;
    const { id } = request.params;

    const post = await prisma.post.findUnique({
      where: { id },
      select: {
        id: true,
        authorId: true,
        kind: true,
        content: true,
        media: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        author: {
          select: {
            handle: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
    });

    if (!post) return reply.status(404).send({ error: 'Post não encontrado' });
    if (post.status !== 'PUBLISHED') {
      // Only author can see non-published posts
      if (!authUser) return reply.status(404).send({ error: 'Post não encontrado' });

      const meProfile = await prisma.profile.findUnique({ where: { userId: authUser.sub }, select: { id: true } });
      if (!meProfile || meProfile.id !== post.authorId) {
        return reply.status(404).send({ error: 'Post não encontrado' });
      }
    }

    // Check if current user liked this post
    let isLiked = false;
    if (authUser) {
      const meProfile = await prisma.profile.findUnique({ where: { userId: authUser.sub }, select: { id: true } });
      if (meProfile) {
        const like = await prisma.postLike.findUnique({
          where: {
            postId_profileId: {
              postId: id,
              profileId: meProfile.id,
            },
          },
        });
        isLiked = !!like;
      }
    }

    return reply.send({
      post: {
        ...post,
        likesCount: post._count.likes,
        commentsCount: post._count.comments,
        isLiked,
      },
    });
  });

  // POST /posts/:id/comments - Criar comentário
  app.post<{ Params: { id: string } }>('/posts/:id/comments', {
    preHandler: authOnRequest,
    config: { rateLimit: { max: 30, timeWindow: '5 minutes' } },
  }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string } | undefined;
    if (!authUser) return reply.status(401).send({ error: 'Token inválido.' });
    const { id } = request.params;

    // Validar body
    const commentSchema = z.object({
      content: z.string().min(1).max(1000),
      parentId: z.string().optional(),
    });

    let body: z.infer<typeof commentSchema>;
    try {
      body = commentSchema.parse(request.body);
    } catch (e) {
      return reply.status(400).send({ error: 'Dados inválidos', details: (e as z.ZodError).errors });
    }

    const meProfile = await prisma.profile.findUnique({ where: { userId: authUser.sub }, select: { id: true } });
    if (!meProfile) return reply.status(400).send({ error: 'Perfil do usuário não encontrado' });

    // Verificar se post existe e está publicado, buscar userId do autor
    const post = await prisma.post.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        authorId: true,
        author: { select: { userId: true } }
      }
    });
    if (!post) return reply.status(404).send({ error: 'Post não encontrado' });
    if (post.status !== 'PUBLISHED') return reply.status(400).send({ error: 'Post não está publicado' });

    // Se tem parentId, verificar se o comentário pai existe
    if (body.parentId) {
      const parentComment = await prisma.postComment.findUnique({
        where: { id: body.parentId },
        select: { id: true, postId: true },
      });
      if (!parentComment) return reply.status(404).send({ error: 'Comentário pai não encontrado' });
      if (parentComment.postId !== id) return reply.status(400).send({ error: 'Comentário pai não pertence a este post' });
    }

    // Criar comentário
    const comment = await prisma.postComment.create({
      data: {
        postId: id,
        authorId: meProfile.id,
        content: body.content.trim(),
        parentId: body.parentId || null,
      },
      include: {
        author: {
          select: {
            handle: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Criar notificação
    await createNotification(prisma, {
      userId: post.author.userId,
      type: 'COMMENT',
      actorId: meProfile.id,
      targetId: post.id,
      metadata: { commentId: comment.id }
    });

    app.log.info({ event: 'post.comment', postId: id, commentId: comment.id, profileId: meProfile.id });

    return reply.status(201).send({
      comment: {
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt,
        author: comment.author,
        parentId: comment.parentId,
      },
    });
  });

  // GET /posts/:id/comments - Listar comentários
  app.get<{ Params: { id: string }; Querystring: { limit?: string; cursor?: string } }>(
    '/posts/:id/comments',
    async (request, reply) => {
      const { id } = request.params;
      const limit = Math.min(parseInt(request.query.limit || '10'), 50);
      const cursor = request.query.cursor;

      // Verificar se post existe
      const post = await prisma.post.findUnique({ where: { id }, select: { id: true, status: true } });
      if (!post) return reply.status(404).send({ error: 'Post não encontrado' });
      if (post.status !== 'PUBLISHED') return reply.status(404).send({ error: 'Post não encontrado' });

      // Buscar comentários top-level (sem parent)
      const comments = await prisma.postComment.findMany({
        where: {
          postId: id,
          parentId: null,
          ...(cursor ? { id: { lt: cursor } } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: limit + 1,
        include: {
          author: {
            select: {
              handle: true,
              displayName: true,
              avatarUrl: true,
            },
          },
          replies: {
            take: 5,
            orderBy: { createdAt: 'asc' },
            include: {
              author: {
                select: {
                  handle: true,
                  displayName: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
      });

      const hasMore = comments.length > limit;
      const items = hasMore ? comments.slice(0, -1) : comments;
      const nextCursor = hasMore ? items[items.length - 1].id : null;

      return reply.send({
        items: items.map(c => ({
          id: c.id,
          content: c.content,
          createdAt: c.createdAt,
          author: c.author,
          replies: c.replies.map(r => ({
            id: r.id,
            content: r.content,
            createdAt: r.createdAt,
            author: r.author,
            parentId: r.parentId,
          })),
        })),
        page: {
          nextCursor,
          hasMore,
        },
      });
    }
  );
}

export default postsRoutes;
