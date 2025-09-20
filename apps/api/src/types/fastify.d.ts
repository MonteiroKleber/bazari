import type { AccessTokenPayload } from '../lib/auth/jwt.js';

declare module 'fastify' {
  interface FastifyRequest {
    authUser?: AccessTokenPayload;
  }
}
