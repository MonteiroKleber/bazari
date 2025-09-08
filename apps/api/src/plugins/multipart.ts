import { FastifyInstance } from 'fastify';
import multipart from '@fastify/multipart';

export async function multipartPlugin(app: FastifyInstance) {
  await app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
      files: 1, // máximo 1 arquivo por vez
    },
  });
}