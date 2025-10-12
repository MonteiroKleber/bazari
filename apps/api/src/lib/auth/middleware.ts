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

/**
 * Middleware de autenticação opcional
 * Se houver token, valida e popula authUser
 * Se não houver token ou for inválido, apenas continua sem popular authUser
 */
export async function optionalAuthOnRequest(request: FastifyRequest, reply: FastifyReply) {
  const header = request.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    // Sem token, apenas continua
    return;
  }

  const token = header.slice('Bearer '.length).trim();

  if (!token) {
    // Token vazio, apenas continua
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    (request as FastifyRequest & { authUser?: typeof payload }).authUser = payload;
  } catch (error) {
    // Token inválido, apenas continua sem popular authUser
    // Não retorna erro 401
    return;
  }
}
