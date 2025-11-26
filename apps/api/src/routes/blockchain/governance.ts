// @ts-nocheck
// Backend REST API - Governance Routes
// DAO member validation and governance queries
// path: apps/api/src/routes/blockchain/governance.ts

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { authOnRequest } from '../../lib/auth/middleware.js';
import { BlockchainService } from '../../services/blockchain/blockchain.service.js';

export async function governanceRoutes(
  app: FastifyInstance,
  options: FastifyPluginOptions
) {
  const blockchainService = BlockchainService.getInstance();

  // ============================================================================
  // GET /api/blockchain/governance/is-dao-member
  // ============================================================================
  app.get('/governance/is-dao-member', { preHandler: authOnRequest }, async (request, reply) => {
    try {
      const authUser = (request as any).authUser as { sub: string; address: string };

      const api = await blockchainService.getApi();

      // Validação DAO member: usa pallet-collective (Council)
      // Council members são considerados DAO members
      let isMember = false;

      try {
        const members = await api.query.council.members();
        const membersList = members.toJSON() as string[];
        isMember = membersList.includes(authUser.address);

        // DEBUG: Log para verificar validação
        app.log.info({
          authUserAddress: authUser.address,
          councilMembers: membersList,
          isDAOMember: isMember,
        }, 'DAO member check');
      } catch (error) {
        // Se falhar, retornar false
        app.log.warn('Failed to query council members:', error);
        isMember = false;
      }

      const response = {
        address: authUser.address,
        isDAOMember: isMember,
      };

      // DEBUG: Log response
      app.log.info({ response }, 'DAO member response');

      return response;
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: 'Failed to check DAO membership' });
    }
  });
}
