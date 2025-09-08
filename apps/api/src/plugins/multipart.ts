import fp from 'fastify-plugin';
import multipart from '@fastify/multipart';

// IMPORTANTE: usar fastify-plugin para não encapsular
export const multipartPlugin = fp(async function (fastify) {
  await fastify.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
      files: 1, // máximo 1 arquivo por vez
    },
  });
});

export default multipartPlugin;