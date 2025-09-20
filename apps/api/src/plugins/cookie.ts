import fp from 'fastify-plugin';
import cookie from '@fastify/cookie';

export const cookiePlugin = fp(async function (fastify) {
  await fastify.register(cookie);
});

export default cookiePlugin;
