import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authOnRequest } from '../lib/auth/middleware.js';
import { getSubstrateApi } from '../lib/substrate.js';
import { GovernanceService } from '../services/governance/governance.service.js';

export async function governanceTreasuryRoutes(app: FastifyInstance) {
  /**
   * POST /api/governance/treasury/requests
   * Cria uma solicitação de fundos (off-chain)
   */
  const createRequestSchema = z.object({
    title: z.string().min(1).max(255),
    description: z.string().min(1).max(5000),
    value: z.string(), // em BZR ou planck
    beneficiary: z.string().regex(/^5[A-Za-z0-9]{47}$/), // SS58 address
    signature: z.string(),
  });

  app.post('/governance/treasury/requests', {
    onRequest: authOnRequest,
  }, async (request, reply) => {
    try {
      const validation = createRequestSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.status(400).send({
          success: false,
          error: 'Validation failed',
          details: validation.error.errors,
        });
      }

      const { title, description, value, beneficiary, signature } = validation.data;
      const authUser = (request as any).authUser;

      // Converter valor para planck se necessário
      let valueInPlanck = value;
      if (value.includes('.') || parseFloat(value) < 1000000000000) {
        valueInPlanck = BigInt(Math.floor(parseFloat(value) * 1e12)).toString();
      }

      // Validar assinatura
      const messageData = JSON.stringify({
        type: 'treasury_request',
        title,
        description,
        value: valueInPlanck,
        beneficiary,
        proposer: authUser.address,
      });

      if (!GovernanceService.verifySignature(messageData, signature, authUser.address)) {
        return reply.status(400).send({
          success: false,
          error: 'Invalid signature'
        });
      }

      // Salvar no banco
      const treasuryRequest = await prisma.governanceTreasuryRequest.create({
        data: {
          title,
          description,
          value: valueInPlanck,
          beneficiary,
          proposer: authUser.address,
          status: 'PENDING_REVIEW',
          signature,
        }
      });

      return reply.status(201).send({
        success: true,
        data: {
          id: treasuryRequest.id,
          title: treasuryRequest.title,
          description: treasuryRequest.description,
          value: treasuryRequest.value,
          beneficiary: treasuryRequest.beneficiary,
          proposer: treasuryRequest.proposer,
          status: treasuryRequest.status,
          createdAt: treasuryRequest.createdAt.toISOString(),
        },
        message: 'Treasury request submitted successfully. Council will review it.'
      });
    } catch (error) {
      console.error('[Treasury] Error creating request:', error);
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  });

  /**
   * GET /governance/treasury/requests
   * Lista solicitações com filtros
   */
  app.get<{
    Querystring: {
      status?: string;
      proposer?: string;
      limit?: number;
      offset?: number;
    }
  }>('/governance/treasury/requests', async (request, reply) => {
    try {
      const { status, proposer, limit = 50, offset = 0 } = request.query;

      // Convert to numbers (query params come as strings)
      const parsedLimit = typeof limit === 'string' ? parseInt(limit) : limit;
      const parsedOffset = typeof offset === 'string' ? parseInt(offset) : offset;

      const where: any = {};
      if (status) where.status = status;
      if (proposer) where.proposer = proposer;

      const [requests, total] = await Promise.all([
        prisma.governanceTreasuryRequest.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: Math.min(parsedLimit, 100),
          skip: parsedOffset,
        }),
        prisma.governanceTreasuryRequest.count({ where }),
      ]);

      return reply.send({
        success: true,
        data: requests.map(r => ({
          ...r,
          createdAt: r.createdAt.toISOString(),
          reviewedAt: r.reviewedAt?.toISOString(),
          approvedAt: r.approvedAt?.toISOString(),
          paidOutAt: r.paidOutAt?.toISOString(),
        })),
        pagination: {
          total,
          limit: parsedLimit,
          offset: parsedOffset,
          hasMore: parsedOffset + requests.length < total,
        }
      });
    } catch (error) {
      console.error('[Treasury] Error listing requests:', error);
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  });

  /**
   * GET /governance/treasury/requests/:id
   * Detalhes de uma solicitação
   */
  app.get<{
    Params: { id: string }
  }>('/governance/treasury/requests/:id', async (request, reply) => {
    try {
      const id = parseInt(request.params.id);

      const treasuryRequest = await prisma.governanceTreasuryRequest.findUnique({
        where: { id }
      });

      if (!treasuryRequest) {
        return reply.status(404).send({
          success: false,
          error: 'Request not found'
        });
      }

      // Se tem motion associado, buscar votos
      let votes: any[] = [];
      if (treasuryRequest.councilMotionHash && treasuryRequest.councilMotionIndex !== null) {
        votes = await prisma.governanceCouncilVote.findMany({
          where: {
            motionHash: treasuryRequest.councilMotionHash,
            motionIndex: treasuryRequest.councilMotionIndex
          },
          orderBy: { timestamp: 'asc' }
        });
      }

      return reply.send({
        success: true,
        data: {
          ...treasuryRequest,
          createdAt: treasuryRequest.createdAt.toISOString(),
          reviewedAt: treasuryRequest.reviewedAt?.toISOString(),
          approvedAt: treasuryRequest.approvedAt?.toISOString(),
          paidOutAt: treasuryRequest.paidOutAt?.toISOString(),
          votes: votes.map(v => ({
            ...v,
            timestamp: v.timestamp.toISOString()
          }))
        }
      });
    } catch (error) {
      console.error('[Treasury] Error getting request:', error);
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  });

  /**
   * POST /governance/treasury/requests/:id/link-motion
   * Linkar motion ao request (apenas council members)
   */
  const linkMotionSchema = z.object({
    motionHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
    motionIndex: z.number().int().min(0),
    txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
    blockNumber: z.number().int().min(0),
  });

  app.post<{
    Params: { id: string }
  }>('/governance/treasury/requests/:id/link-motion', {
    onRequest: authOnRequest,
  }, async (request, reply) => {
    try {
      const id = parseInt(request.params.id);
      const validation = linkMotionSchema.safeParse(request.body);

      if (!validation.success) {
        return reply.status(400).send({
          success: false,
          error: 'Validation failed',
          details: validation.error.errors,
        });
      }

      const { motionHash, motionIndex, txHash, blockNumber } = validation.data;
      const authUser = (request as any).authUser;

      // Verificar se é council member
      const api = await getSubstrateApi();
      const councilMembers = await api.query.council.members();
      const isMember = (councilMembers as any[]).some((m: any) =>
        m.toString() === authUser.address
      );

      if (!isMember) {
        return reply.status(403).send({
          success: false,
          error: 'Only council members can link motions'
        });
      }

      // Atualizar request
      const updated = await prisma.governanceTreasuryRequest.update({
        where: { id },
        data: {
          councilMotionHash: motionHash,
          councilMotionIndex: motionIndex,
          txHash,
          blockNumber,
          status: 'IN_VOTING',
          reviewedAt: new Date(),
        }
      });

      return reply.send({
        success: true,
        data: {
          ...updated,
          createdAt: updated.createdAt.toISOString(),
          reviewedAt: updated.reviewedAt?.toISOString(),
        },
        message: 'Motion linked successfully'
      });
    } catch (error) {
      console.error('[Treasury] Error linking motion:', error);
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  });

  /**
   * POST /governance/council/votes
   * Registrar voto (apenas council members)
   */
  const voteSchema = z.object({
    motionHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
    motionIndex: z.number().int().min(0),
    vote: z.boolean(),
    txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
    blockNumber: z.number().int().min(0),
  });

  app.post('/governance/council/votes', {
    onRequest: authOnRequest,
  }, async (request, reply) => {
    try {
      const validation = voteSchema.safeParse(request.body);

      if (!validation.success) {
        return reply.status(400).send({
          success: false,
          error: 'Validation failed',
          details: validation.error.errors,
        });
      }

      const { motionHash, motionIndex, vote, txHash, blockNumber } = validation.data;
      const authUser = (request as any).authUser;

      // Verificar se é council member
      const api = await getSubstrateApi();
      const councilMembers = await api.query.council.members();
      const isMember = (councilMembers as any[]).some((m: any) =>
        m.toString() === authUser.address
      );

      if (!isMember) {
        return reply.status(403).send({
          success: false,
          error: 'Only council members can vote'
        });
      }

      // Salvar voto (UNIQUE constraint previne duplicatas)
      const voteRecord = await prisma.governanceCouncilVote.create({
        data: {
          motionHash,
          motionIndex,
          voter: authUser.address,
          vote,
          txHash,
          blockNumber,
        }
      });

      return reply.status(201).send({
        success: true,
        data: {
          ...voteRecord,
          timestamp: voteRecord.timestamp.toISOString()
        },
        message: 'Vote registered successfully'
      });
    } catch (error) {
      console.error('[Council] Error registering vote:', error);
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  });

  /**
   * GET /governance/council/is-member/:address
   * Verificar se endereço é council member
   */
  app.get<{
    Params: { address: string }
  }>('/governance/council/is-member/:address', async (request, reply) => {
    try {
      const { address } = request.params;

      const api = await getSubstrateApi();
      const councilMembers = await api.query.council.members();
      const isMember = (councilMembers as any[]).some((m: any) =>
        m.toString() === address
      );

      return reply.send({
        success: true,
        data: {
          address,
          isMember,
        }
      });
    } catch (error) {
      console.error('[Council] Error checking membership:', error);
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  });
}
