import fp from 'fastify-plugin';

// Simple security headers without external deps
export const securityPlugin = fp(async function (fastify) {
  fastify.addHook('onSend', async (request, reply, payload) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('Referrer-Policy', 'no-referrer');
    reply.header('X-Frame-Options', 'SAMEORIGIN');
    reply.header('X-DNS-Prefetch-Control', 'off');
    return payload;
  });
});

export default securityPlugin;

