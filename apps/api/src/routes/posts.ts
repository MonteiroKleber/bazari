import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authOnRequest } from '../lib/auth/middleware.js';
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
}

export default postsRoutes;
