// Backend REST API - Blockchain Utils Routes
// Utility endpoints for blockchain queries
// path: apps/api/src/routes/blockchain/utils.ts

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { authOnRequest } from '../../lib/auth/middleware.js';
import { BlockchainService } from '../../services/blockchain/blockchain.service.js';

export async function blockchainUtilsRoutes(
  app: FastifyInstance,
  options: FastifyPluginOptions
) {
  const blockchainService = BlockchainService.getInstance();

  // ============================================================================
  // GET /api/blockchain/current-block
  // ============================================================================
  app.get('/current-block', async (request, reply) => {
    try {
      const currentBlock = await blockchainService.getCurrentBlock();

      return {
        currentBlock: Number(currentBlock),
      };
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch current block' });
    }
  });

  // ============================================================================
  // GET /api/blockchain/user/address
  // ============================================================================
  app.get('/user/address', { preHandler: authOnRequest }, async (request, reply) => {
    try {
      const authUser = (request as any).authUser as { sub: string; address: string };

      return {
        address: authUser.address,
      };
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch user address' });
    }
  });
}
