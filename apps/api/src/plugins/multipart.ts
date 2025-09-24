import fp from 'fastify-plugin';
import multipart from '@fastify/multipart';

// IMPORTANTE: usar fastify-plugin para não encapsular
export const multipartPlugin = fp(async function (fastify) {
  const maxSizeMb = Number(process.env.UPLOAD_MAX_SIZE_MB || '10');
  await fastify.register(multipart, {
    limits: {
      fileSize: maxSizeMb * 1024 * 1024,
      files: 1,
    },
  });
});

export default multipartPlugin;
