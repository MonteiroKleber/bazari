import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authOnRequest, optionalAuthOnRequest } from '../lib/auth/middleware.js';
import { createNotification } from '../lib/notifications.js';
import { checkAchievements } from '../lib/achievementChecker.js';
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

  // Função para extrair @mentions do conteúdo
  function extractMentions(content: string): string[] {
    const mentionRegex = /@([a-zA-Z0-9_]+)/g;
    const mentions = new Set<string>();
    let match;
    while ((match = mentionRegex.exec(content)) !== null) {
      mentions.add(match[1]); // Captura o handle sem o @
    }
    return Array.from(mentions);
  }

  // Função para criar notificações de mention
  async function notifyMentions(
    content: string,
    authorProfileId: string,
    authorUserId: string,
    targetId: string,
    targetType: 'post' | 'comment'
  ): Promise<void> {
    const handles = extractMentions(content);
    if (handles.length === 0) return;

    // Buscar perfis mencionados
    const profiles = await prisma.profile.findMany({
      where: {
        handle: { in: handles, mode: 'insensitive' },
        id: { not: authorProfileId }, // Não notificar a si mesmo
      },
      select: { id: true, userId: true },
    });

    // Criar notificações para cada perfil mencionado
    for (const profile of profiles) {
      await createNotification(prisma, {
        userId: profile.userId,
        type: 'MENTION',
        actorId: authorProfileId,
        targetId,
        metadata: { targetType },
      }).catch(err =>
        app.log.error({ err, userId: profile.userId }, 'Erro ao criar notificação de mention')
      );
    }
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

    // Verificar conquistas após criar post (não bloquear resposta)
    checkAchievements(prisma, authUser.sub, 'POST_CREATED').catch(err =>
      app.log.error({ err, userId: authUser.sub }, 'Erro ao verificar conquistas')
    );

    // Notificar usuários mencionados (não bloquear resposta)
    notifyMentions(safeContent, meProfile.id, authUser.sub, result.id, 'post').catch(err =>
      app.log.error({ err, postId: result.id }, 'Erro ao notificar mentions')
    );

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

      // Verificar conquistas do autor do post (recebeu like)
      checkAchievements(prisma, post.author.userId, 'LIKE_RECEIVED').catch(err =>
        app.log.error({ err, userId: post.author.userId }, 'Erro ao verificar conquistas')
      );
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

  // POST /posts/:id/repost
  app.post<{ Params: { id: string } }>('/posts/:id/repost', {
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

    // Criar repost (idempotente via unique constraint)
    let repostCreated = false;
    try {
      await prisma.postRepost.create({
        data: {
          postId: id,
          profileId: meProfile.id,
        },
      });
      repostCreated = true;
    } catch (error: any) {
      // Se já existe, retornar sucesso (idempotente)
      if (error.code === 'P2002') {
        // Unique constraint violation
        const repostsCount = await prisma.postRepost.count({ where: { postId: id } });
        return reply.send({ reposted: true, repostsCount });
      }
      throw error;
    }

    // Criar notificação se repost foi criado
    if (repostCreated) {
      await createNotification(prisma, {
        userId: post.author.userId,
        type: 'REPOST',
        actorId: meProfile.id,
        targetId: post.id
      });
    }

    // Contar reposts
    const repostsCount = await prisma.postRepost.count({ where: { postId: id } });

    app.log.info({ event: 'post.repost', postId: id, profileId: meProfile.id });
    return reply.send({ reposted: true, repostsCount });
  });

  // DELETE /posts/:id/repost
  app.delete<{ Params: { id: string } }>('/posts/:id/repost', {
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

    // Remover repost (idempotente)
    await prisma.postRepost.deleteMany({
      where: {
        postId: id,
        profileId: meProfile.id,
      },
    });

    // Contar reposts
    const repostsCount = await prisma.postRepost.count({ where: { postId: id } });

    app.log.info({ event: 'post.unrepost', postId: id, profileId: meProfile.id });
    return reply.send({ reposted: false, repostsCount });
  });

  // POST /posts/:id/react
  app.post<{ Params: { id: string }; Body: { reaction: string } }>('/posts/:id/react', {
    preHandler: authOnRequest,
    config: { rateLimit: { max: 100, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string } | undefined;
    if (!authUser) return reply.status(401).send({ error: 'Token inválido.' });
    const { id } = request.params;
    const { reaction } = request.body;

    // Validar reação
    const validReactions = ['love', 'laugh', 'wow', 'sad', 'angry'];
    if (!validReactions.includes(reaction)) {
      return reply.status(400).send({ error: 'Reação inválida' });
    }

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

    // Verificar se já existe reação para saber se deve notificar
    const existingReaction = await prisma.postReaction.findUnique({
      where: {
        postId_profileId: {
          postId: id,
          profileId: meProfile.id,
        },
      },
    });

    // Upsert reação (criar ou atualizar)
    await prisma.postReaction.upsert({
      where: {
        postId_profileId: {
          postId: id,
          profileId: meProfile.id,
        },
      },
      create: {
        postId: id,
        profileId: meProfile.id,
        reaction,
      },
      update: {
        reaction,
      },
    });

    // Criar notificação apenas se é uma nova reação (não update)
    if (!existingReaction) {
      await createNotification(prisma, {
        userId: post.author.userId,
        type: 'LIKE',
        actorId: meProfile.id,
        targetId: id,
        metadata: { reaction }
      });

      // Verificar conquistas do autor do post (recebeu reação/like)
      checkAchievements(prisma, post.author.userId, 'LIKE_RECEIVED').catch(err =>
        app.log.error({ err, userId: post.author.userId }, 'Erro ao verificar conquistas')
      );
    }

    // Buscar contadores de reações agrupadas
    const reactionCounts = await prisma.postReaction.groupBy({
      by: ['reaction'],
      where: { postId: id },
      _count: { reaction: true },
    });

    const reactions = {
      love: 0,
      laugh: 0,
      wow: 0,
      sad: 0,
      angry: 0,
    };

    reactionCounts.forEach((r) => {
      reactions[r.reaction as keyof typeof reactions] = r._count.reaction;
    });

    const totalReactions = Object.values(reactions).reduce((a, b) => a + b, 0);

    app.log.info({ event: 'post.react', postId: id, profileId: meProfile.id, reaction });
    return reply.send({ reactions, userReaction: reaction, totalReactions });
  });

  // DELETE /posts/:id/react
  app.delete<{ Params: { id: string } }>('/posts/:id/react', {
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

    // Remover reação
    await prisma.postReaction.deleteMany({
      where: {
        postId: id,
        profileId: meProfile.id,
      },
    });

    // Buscar contadores de reações agrupadas
    const reactionCounts = await prisma.postReaction.groupBy({
      by: ['reaction'],
      where: { postId: id },
      _count: { reaction: true },
    });

    const reactions = {
      love: 0,
      laugh: 0,
      wow: 0,
      sad: 0,
      angry: 0,
    };

    reactionCounts.forEach((r) => {
      reactions[r.reaction as keyof typeof reactions] = r._count.reaction;
    });

    const totalReactions = Object.values(reactions).reduce((a, b) => a + b, 0);

    app.log.info({ event: 'post.unreact', postId: id, profileId: meProfile.id });
    return reply.send({ reactions, totalReactions });
  });

  // GET /posts/:id - Obter detalhes de um post
  app.get<{ Params: { id: string } }>('/posts/:id', {
    preHandler: optionalAuthOnRequest,
  }, async (request, reply) => {
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
            reposts: true,
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

    // Check if current user liked and reposted this post
    let isLiked = false;
    let isReposted = false;
    let userReaction: string | undefined;
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

        const repost = await prisma.postRepost.findUnique({
          where: {
            postId_profileId: {
              postId: id,
              profileId: meProfile.id,
            },
          },
        });
        isReposted = !!repost;

        const reaction = await prisma.postReaction.findUnique({
          where: {
            postId_profileId: {
              postId: id,
              profileId: meProfile.id,
            },
          },
          select: { reaction: true },
        });
        userReaction = reaction?.reaction;
      }
    }

    // Get reaction counts grouped by type
    const reactionCounts = await prisma.postReaction.groupBy({
      by: ['reaction'],
      where: { postId: id },
      _count: { reaction: true },
    });

    const reactions = {
      love: 0,
      laugh: 0,
      wow: 0,
      sad: 0,
      angry: 0,
    };

    reactionCounts.forEach((r) => {
      reactions[r.reaction as keyof typeof reactions] = r._count.reaction;
    });

    // Calculate total likes (sum of all reactions, fallback to old likes count)
    const totalReactions = reactions.love + reactions.laugh + reactions.wow + reactions.sad + reactions.angry;
    const likesCount = totalReactions > 0 ? totalReactions : post._count.likes;

    return reply.send({
      post: {
        ...post,
        likesCount,
        repostsCount: post._count.reposts,
        commentsCount: post._count.comments,
        isLiked,
        isReposted,
        reactions,
        userReaction,
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

    // Criar notificação para o autor do post
    await createNotification(prisma, {
      userId: post.author.userId,
      type: 'COMMENT',
      actorId: meProfile.id,
      targetId: post.id,
      metadata: { commentId: comment.id }
    });

    // Notificar usuários mencionados no comentário (não bloquear resposta)
    notifyMentions(body.content.trim(), meProfile.id, authUser.sub, post.id, 'comment').catch(err =>
      app.log.error({ err, commentId: comment.id }, 'Erro ao notificar mentions no comentário')
    );

    // Verificar conquistas (comentou)
    checkAchievements(prisma, authUser.sub, 'COMMENT_CREATED').catch(err =>
      app.log.error({ err, userId: authUser.sub }, 'Erro ao verificar conquistas')
    );

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
    { preHandler: optionalAuthOnRequest },
    async (request, reply) => {
      const { id } = request.params;
      const limit = Math.min(parseInt(request.query.limit || '10'), 50);
      const cursor = request.query.cursor;

      // Verificar se post existe
      const post = await prisma.post.findUnique({ where: { id }, select: { id: true, status: true } });
      if (!post) return reply.status(404).send({ error: 'Post não encontrado' });
      if (post.status !== 'PUBLISHED') return reply.status(404).send({ error: 'Post não encontrado' });

      // Buscar profileId se autenticado
      const authUser = (request as any).authUser as { sub: string } | undefined;
      let meProfile: { id: string } | null = null;

      if (authUser) {
        meProfile = await prisma.profile.findUnique({
          where: { userId: authUser.sub },
          select: { id: true },
        });
      }

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
              _count: {
                select: {
                  likes: true,
                },
              },
            },
          },
          _count: {
            select: {
              replies: true,
              likes: true,
            },
          },
        },
      });

      const hasMore = comments.length > limit;
      const items = hasMore ? comments.slice(0, -1) : comments;
      const nextCursor = hasMore ? items[items.length - 1].id : null;

      // Se autenticado, buscar likes do usuário
      let userLikedCommentIds = new Set<string>();
      if (meProfile) {
        const commentIds = items.flatMap(c => [c.id, ...(c.replies?.map(r => r.id) || [])]);

        const userLikes = await prisma.postCommentLike.findMany({
          where: {
            profileId: meProfile.id,
            commentId: { in: commentIds },
          },
          select: { commentId: true },
        });

        userLikedCommentIds = new Set(userLikes.map(l => l.commentId));
      }

      return reply.send({
        items: items.map(c => ({
          id: c.id,
          content: c.content,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
          author: c.author,
          repliesCount: c._count.replies,
          likesCount: c._count.likes,
          isLiked: userLikedCommentIds.has(c.id),
          replies: c.replies.map(r => ({
            id: r.id,
            content: r.content,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
            author: r.author,
            parentId: r.parentId,
            likesCount: r._count.likes,
            isLiked: userLikedCommentIds.has(r.id),
          })),
        })),
        page: {
          nextCursor,
          hasMore,
        },
      });
    }
  );

  // GET /posts/:postId/comments/:commentId/replies - Buscar respostas de um comentário
  app.get<{
    Params: { postId: string; commentId: string };
    Querystring: { limit?: string; cursor?: string }
  }>(
    '/posts/:postId/comments/:commentId/replies',
    { preHandler: optionalAuthOnRequest },
    async (request, reply) => {
      const { postId, commentId } = request.params;
      const limit = Math.min(parseInt(request.query.limit || '10'), 50);
      const cursor = request.query.cursor;

      // Verificar se comentário existe e pertence ao post
      const parentComment = await prisma.postComment.findUnique({
        where: { id: commentId },
        select: { id: true, postId: true },
      });

      if (!parentComment) {
        return reply.status(404).send({ error: 'Comentário não encontrado' });
      }

      if (parentComment.postId !== postId) {
        return reply.status(400).send({ error: 'Comentário não pertence a este post' });
      }

      // Buscar profileId se autenticado
      const authUser = (request as any).authUser as { sub: string } | undefined;
      let meProfile: { id: string } | null = null;

      if (authUser) {
        meProfile = await prisma.profile.findUnique({
          where: { userId: authUser.sub },
          select: { id: true },
        });
      }

      // Buscar respostas
      const replies = await prisma.postComment.findMany({
        where: {
          parentId: commentId,
          ...(cursor ? { id: { lt: cursor } } : {}),
        },
        orderBy: { createdAt: 'asc' },
        take: limit + 1,
        include: {
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
            },
          },
        },
      });

      const hasMore = replies.length > limit;
      const items = hasMore ? replies.slice(0, -1) : replies;
      const nextCursor = hasMore ? items[items.length - 1].id : null;

      // Buscar likes do usuário
      let userLikedReplyIds = new Set<string>();
      if (meProfile) {
        const replyIds = items.map(r => r.id);
        const userLikes = await prisma.postCommentLike.findMany({
          where: {
            profileId: meProfile.id,
            commentId: { in: replyIds },
          },
          select: { commentId: true },
        });
        userLikedReplyIds = new Set(userLikes.map(l => l.commentId));
      }

      return reply.send({
        items: items.map(r => ({
          id: r.id,
          content: r.content,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
          author: r.author,
          parentId: r.parentId,
          likesCount: r._count.likes,
          isLiked: userLikedReplyIds.has(r.id),
        })),
        page: {
          nextCursor,
          hasMore,
        },
      });
    }
  );

  // POST /posts/:postId/comments/:commentId/like - Curtir comentário
  app.post<{ Params: { postId: string; commentId: string } }>(
    '/posts/:postId/comments/:commentId/like',
    { preHandler: authOnRequest },
    async (request, reply) => {
      const authUser = (request as any).authUser as { sub: string } | undefined;
      if (!authUser) return reply.status(401).send({ error: 'Token inválido.' });

      const { postId, commentId } = request.params;

      const meProfile = await prisma.profile.findUnique({
        where: { userId: authUser.sub },
        select: { id: true },
      });
      if (!meProfile) return reply.status(400).send({ error: 'Perfil não encontrado' });

      // Verificar se comentário existe e pertence ao post
      const comment = await prisma.postComment.findUnique({
        where: { id: commentId },
        select: { id: true, postId: true, authorId: true, author: { select: { userId: true } } },
      });

      if (!comment) return reply.status(404).send({ error: 'Comentário não encontrado' });
      if (comment.postId !== postId) {
        return reply.status(400).send({ error: 'Comentário não pertence a este post' });
      }

      // Verificar se já existe para saber se deve criar notificação
      const existingLike = await prisma.postCommentLike.findUnique({
        where: {
          commentId_profileId: {
            commentId,
            profileId: meProfile.id,
          },
        },
      });

      // Upsert (idempotente)
      await prisma.postCommentLike.upsert({
        where: {
          commentId_profileId: {
            commentId,
            profileId: meProfile.id,
          },
        },
        update: {},
        create: {
          commentId,
          profileId: meProfile.id,
        },
      });

      // Criar notificação apenas se foi um novo like
      if (!existingLike) {
        await createNotification(prisma, {
          userId: comment.author.userId,
          type: 'LIKE',
          actorId: meProfile.id,
          targetId: postId,
          metadata: { commentId: comment.id },
        });
      }

      // Contar likes
      const likesCount = await prisma.postCommentLike.count({
        where: { commentId },
      });

      app.log.info({
        event: 'comment.like',
        commentId,
        profileId: meProfile.id,
      });

      return reply.send({
        liked: true,
        likesCount,
      });
    }
  );

  // DELETE /posts/:postId/comments/:commentId/like - Descurtir comentário
  app.delete<{ Params: { postId: string; commentId: string } }>(
    '/posts/:postId/comments/:commentId/like',
    { preHandler: authOnRequest },
    async (request, reply) => {
      const authUser = (request as any).authUser as { sub: string } | undefined;
      if (!authUser) return reply.status(401).send({ error: 'Token inválido.' });

      const { postId, commentId } = request.params;

      const meProfile = await prisma.profile.findUnique({
        where: { userId: authUser.sub },
        select: { id: true },
      });
      if (!meProfile) return reply.status(400).send({ error: 'Perfil não encontrado' });

      // Verificar se comentário existe e pertence ao post
      const comment = await prisma.postComment.findUnique({
        where: { id: commentId },
        select: { id: true, postId: true },
      });

      if (!comment) return reply.status(404).send({ error: 'Comentário não encontrado' });
      if (comment.postId !== postId) {
        return reply.status(400).send({ error: 'Comentário não pertence a este post' });
      }

      // Deletar (idempotente - não retorna erro se não existir)
      await prisma.postCommentLike.deleteMany({
        where: {
          commentId,
          profileId: meProfile.id,
        },
      });

      // Contar likes
      const likesCount = await prisma.postCommentLike.count({
        where: { commentId },
      });

      app.log.info({
        event: 'comment.unlike',
        commentId,
        profileId: meProfile.id,
      });

      return reply.send({
        liked: false,
        likesCount,
      });
    }
  );

  // PATCH /posts/:postId/comments/:commentId - Editar comentário
  app.patch<{
    Params: { postId: string; commentId: string };
    Body: { content: string };
  }>(
    '/posts/:postId/comments/:commentId',
    {
      preHandler: authOnRequest,
      config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
    },
    async (request, reply) => {
      const authUser = (request as any).authUser as { sub: string } | undefined;
      if (!authUser) return reply.status(401).send({ error: 'Token inválido.' });

      const { postId, commentId } = request.params;

      // Validar body
      const editSchema = z.object({
        content: z.string().min(1).max(1000),
      });

      let body: z.infer<typeof editSchema>;
      try {
        body = editSchema.parse(request.body);
      } catch (e) {
        return reply.status(400).send({
          error: 'Dados inválidos',
          details: (e as z.ZodError).errors,
        });
      }

      const meProfile = await prisma.profile.findUnique({
        where: { userId: authUser.sub },
        select: { id: true },
      });
      if (!meProfile) return reply.status(400).send({ error: 'Perfil não encontrado' });

      // Buscar comentário e verificar autorização
      const comment = await prisma.postComment.findUnique({
        where: { id: commentId },
        select: {
          id: true,
          postId: true,
          authorId: true,
          content: true,
        },
      });

      if (!comment) {
        return reply.status(404).send({ error: 'Comentário não encontrado' });
      }

      if (comment.postId !== postId) {
        return reply.status(400).send({ error: 'Comentário não pertence a este post' });
      }

      if (comment.authorId !== meProfile.id) {
        return reply.status(403).send({ error: 'Você não pode editar este comentário' });
      }

      // Verificar se conteúdo mudou
      if (comment.content === body.content.trim()) {
        return reply.status(400).send({ error: 'Nenhuma alteração detectada' });
      }

      // Atualizar comentário
      const updatedComment = await prisma.postComment.update({
        where: { id: commentId },
        data: {
          content: body.content.trim(),
          updatedAt: new Date(), // Force update timestamp
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

      app.log.info({
        event: 'comment.edit',
        commentId,
        profileId: meProfile.id,
      });

      return reply.send({
        comment: {
          id: updatedComment.id,
          content: updatedComment.content,
          createdAt: updatedComment.createdAt,
          updatedAt: updatedComment.updatedAt,
          author: updatedComment.author,
        },
      });
    }
  );

  // DELETE /posts/:postId/comments/:commentId - Excluir comentário
  app.delete<{ Params: { postId: string; commentId: string } }>(
    '/posts/:postId/comments/:commentId',
    { preHandler: authOnRequest },
    async (request, reply) => {
      const authUser = (request as any).authUser as { sub: string } | undefined;
      if (!authUser) return reply.status(401).send({ error: 'Token inválido.' });

      const { postId, commentId } = request.params;

      const meProfile = await prisma.profile.findUnique({
        where: { userId: authUser.sub },
        select: { id: true },
      });
      if (!meProfile) return reply.status(400).send({ error: 'Perfil não encontrado' });

      // Buscar comentário e verificar autorização
      const comment = await prisma.postComment.findUnique({
        where: { id: commentId },
        select: {
          id: true,
          postId: true,
          authorId: true,
          parentId: true,
          _count: {
            select: { replies: true },
          },
        },
      });

      if (!comment) {
        return reply.status(404).send({ error: 'Comentário não encontrado' });
      }

      if (comment.postId !== postId) {
        return reply.status(400).send({ error: 'Comentário não pertence a este post' });
      }

      if (comment.authorId !== meProfile.id) {
        return reply.status(403).send({ error: 'Você não pode excluir este comentário' });
      }

      // Verificar se tem respostas
      if (comment._count.replies > 0) {
        return reply.status(400).send({
          error: 'Não é possível excluir comentário com respostas',
          hasReplies: true,
          repliesCount: comment._count.replies,
        });
      }

      // Deletar comentário (cascade deleta likes)
      await prisma.postComment.delete({
        where: { id: commentId },
      });

      app.log.info({
        event: 'comment.delete',
        commentId,
        profileId: meProfile.id,
      });

      return reply.send({
        success: true,
        commentId,
        isReply: !!comment.parentId,
        parentId: comment.parentId,
      });
    }
  );
}

export default postsRoutes;
