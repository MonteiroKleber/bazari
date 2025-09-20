import type { FastifyReply, FastifyRequest } from 'fastify';
import { verifyAccessToken } from './jwt.js';

export async function authOnRequest(request: FastifyRequest, reply: FastifyReply) {
  const header = request.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    reply.status(401).send({ error: 'Token de acesso ausente.' });
    return reply;
  }

  const token = header.slice('Bearer '.length).trim();

  if (!token) {
    reply.status(401).send({ error: 'Token de acesso ausente.' });
    return reply;
  }

  try {
    const payload = verifyAccessToken(token);
    (request as FastifyRequest & { authUser?: typeof payload }).authUser = payload;
  } catch (error) {
    reply.status(401).send({ error: (error as Error).message });
    return reply;
  }
}
