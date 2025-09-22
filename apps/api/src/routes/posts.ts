import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authOnRequest } from '../lib/auth/middleware.js';

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
