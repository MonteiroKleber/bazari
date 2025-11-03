import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getSubstrateApi } from '../lib/substrate.js';
import { authOnRequest } from '../lib/auth/middleware.js';
import { GovernanceService } from '../services/governance/governance.service.js';

export async function governanceRoutes(app: FastifyInstance) {
  // ==================== TREASURY ====================

  /**
   * GET /governance/treasury/proposals
   * Lista todas as propostas do tesouro
   */
  app.get('/governance/treasury/proposals', async (_request, reply) => {
    try {
      const api = await getSubstrateApi();
      const proposals = await api.query.treasury.proposals.entries();

      const data = proposals.map(([key, value]: any) => ({
        id: key.args[0].toNumber(),
        proposer: value.value.proposer.toString(),
        value: value.value.value.toString(),
        beneficiary: value.value.beneficiary.toString(),
        bond: value.value.bond.toString(),
      }));

      return reply.send({ success: true, data });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return reply.status(500).send({ success: false, error: errorMsg });
    }
  });

  /**
   * GET /governance/treasury/approvals
   * Lista propostas aprovadas pendentes de pagamento
   */
  app.get('/governance/treasury/approvals', async (_request, reply) => {
    try {
      const api = await getSubstrateApi();
      const approvals = await api.query.treasury.approvals();

      return reply.send({ success: true, data: approvals.toJSON() });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return reply.status(500).send({ success: false, error: errorMsg });
    }
  });

  // ==================== DEMOCRACY ====================

  /**
   * POST /governance/democracy/propose
   * Cria uma nova proposta de democracia
   */
  const democracyProposeSchema = z.object({
    title: z.string().min(1).max(100),
    description: z.string().min(1).max(2000),
    preimageHash: z.string().optional(),
    signature: z.string(),
    address: z.string(),
  });

  app.post('/governance/democracy/propose', {
    onRequest: authOnRequest,
  }, async (request, reply) => {
    try {
      // Validar body com Zod
      const validationResult = democracyProposeSchema.safeParse(request.body);
      if (!validationResult.success) {
        return reply.status(400).send({
          success: false,
          error: 'Validation failed',
          details: validationResult.error.errors,
        });
      }

      const { title, description, preimageHash, signature, address } = validationResult.data;
      const authUser = (request as any).authUser;

      // Submeter proposta para a blockchain
      const result = await GovernanceService.submitDemocracyProposal({
        title,
        description,
        preimageHash,
        signature,
        proposer: address,
      });

      return reply.status(201).send({
        success: true,
        data: {
          id: result.proposalId,
          type: 'democracy',
          title,
          description,
          preimageHash,
          proposer: address,
          status: 'active',
          txHash: result.txHash,
          blockHash: result.blockHash,
          blockNumber: result.blockNumber,
          createdAt: new Date().toISOString(),
        },
        message: 'Proposta criada com sucesso na blockchain!'
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return reply.status(500).send({ success: false, error: errorMsg });
    }
  });

  /**
   * GET /governance/democracy/referendums
   * Lista todos os referendos ativos
   */
  app.get('/governance/democracy/referendums', async (_request, reply) => {
    try {
      const api = await getSubstrateApi();
      const referendums = await api.query.democracy.referendumInfoOf.entries();

      const data = referendums.map(([key, value]: any) => ({
        id: key.args[0].toNumber(),
        info: value.toJSON(),
      }));

      return reply.send({ success: true, data });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return reply.status(500).send({ success: false, error: errorMsg });
    }
  });

  /**
   * GET /governance/democracy/proposals
   * Lista propostas públicas em votação
   */
  app.get('/governance/democracy/proposals', async (_request, reply) => {
    try {
      const api = await getSubstrateApi();
      const proposals = await api.query.democracy.publicProps();
      const proposalsArray = proposals.toJSON() as any[];

      // Format proposals to match frontend interface
      const formattedProposals = proposalsArray.map(([id, proposal, proposer]) => {
        // Try to fetch metadata from preimage if available
        const hash = proposal?.lookup?.hash || proposal?.hash;

        return {
          id: id,
          type: 'DEMOCRACY',
          proposer: proposer,
          title: `Democracy Proposal #${id}`,
          description: `Proposal hash: ${hash}`,
          status: 'PROPOSED',
          preimageHash: hash,
          createdAt: new Date().toISOString(),
        };
      });

      return reply.send({ success: true, data: formattedProposals });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return reply.status(500).send({ success: false, error: errorMsg });
    }
  });

  /**
   * GET /governance/democracy/referendums/:id/votes
   * Obtém votos de um referendo específico
   */
  app.get<{ Params: { id: string } }>(
    '/governance/democracy/referendums/:id/votes',
    async (request, reply) => {
      try {
        const api = await getSubstrateApi();
        const refIndex = parseInt(request.params.id);

        // Obter informações do referendo
        const refInfo = await api.query.democracy.referendumInfoOf(refIndex);

        if ((refInfo as any).isNone) {
          return reply.status(404).send({
            success: false,
            error: 'Referendum not found'
          });
        }

        // Obter voting records
        const votingOf = await api.query.democracy.votingOf.entries();
        const votes = votingOf
          .filter(([_, voting]: any) => {
            const v = voting.toJSON() as any;
            return v?.direct?.votes?.some((vote: any) => vote[0] === refIndex);
          })
          .map(([key, voting]: any) => ({
            voter: key.args[0].toString(),
            voting: voting.toJSON(),
          }));

        return reply.send({
          success: true,
          referendumId: refIndex,
          info: refInfo.toJSON(),
          votes
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return reply.status(500).send({ success: false, error: errorMsg });
      }
    }
  );

  // ==================== TREASURY ====================

  /**
   * POST /governance/treasury/propose
   * Cria uma nova proposta de tesouro
   */
  const treasuryProposeSchema = z.object({
    title: z.string().min(1).max(100),
    description: z.string().min(1).max(2000),
    beneficiary: z.string(),
    value: z.string(),
    signature: z.string(),
    address: z.string(),
  });

  app.post('/governance/treasury/propose', {
    onRequest: authOnRequest,
  }, async (request, reply) => {
    try {
      // Validar body com Zod
      const validationResult = treasuryProposeSchema.safeParse(request.body);
      if (!validationResult.success) {
        return reply.status(400).send({
          success: false,
          error: 'Validation failed',
          details: validationResult.error.errors,
        });
      }

      const { title, description, beneficiary, value, signature, address } = validationResult.data;
      const authUser = (request as any).authUser;

      // Submeter proposta de tesouro para a blockchain
      const result = await GovernanceService.submitTreasuryProposal({
        title,
        description,
        beneficiary,
        value,
        signature,
        proposer: address,
      });

      return reply.status(201).send({
        success: true,
        data: {
          id: result.proposalId,
          type: 'treasury',
          title,
          description,
          beneficiary,
          value,
          proposer: address,
          status: 'active',
          txHash: result.txHash,
          blockHash: result.blockHash,
          blockNumber: result.blockNumber,
          createdAt: new Date().toISOString(),
        },
        message: 'Proposta de tesouro criada com sucesso na blockchain!'
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return reply.status(500).send({ success: false, error: errorMsg });
    }
  });

  // ==================== COUNCIL ====================

  /**
   * POST /governance/council/propose
   * Cria uma nova proposta de conselho
   */
  const councilProposeSchema = z.object({
    title: z.string().min(1).max(100),
    description: z.string().min(1).max(2000),
    signature: z.string(),
    address: z.string(),
  });

  app.post('/governance/council/propose', {
    onRequest: authOnRequest,
  }, async (request, reply) => {
    try {
      // Validar body com Zod
      const validationResult = councilProposeSchema.safeParse(request.body);
      if (!validationResult.success) {
        return reply.status(400).send({
          success: false,
          error: 'Validation failed',
          details: validationResult.error.errors,
        });
      }

      const { title, description, signature, address } = validationResult.data;
      const authUser = (request as any).authUser;

      // Submeter proposta de council para a blockchain
      const result = await GovernanceService.submitCouncilProposal({
        title,
        description,
        signature,
        proposer: address,
      });

      return reply.status(201).send({
        success: true,
        data: {
          id: result.proposalId,
          type: 'council',
          title,
          description,
          proposer: address,
          status: 'active',
          txHash: result.txHash,
          blockHash: result.blockHash,
          blockNumber: result.blockNumber,
          createdAt: new Date().toISOString(),
        },
        message: 'Proposta de conselho criada com sucesso na blockchain!'
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return reply.status(500).send({ success: false, error: errorMsg });
    }
  });

  /**
   * GET /governance/council/members
   * Lista membros do conselho
   */
  app.get('/governance/council/members', async (_request, reply) => {
    try {
      const api = await getSubstrateApi();
      const members = await api.query.council.members();

      return reply.send({
        success: true,
        data: (members as any).map((m: any) => m.toString())
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return reply.status(500).send({ success: false, error: errorMsg });
    }
  });

  /**
   * GET /governance/council/proposals
   * Lista propostas do conselho
   */
  app.get('/governance/council/proposals', async (_request, reply) => {
    try {
      const api = await getSubstrateApi();
      const proposals = await api.query.council.proposals();
      const proposalHashes = proposals.toJSON() as string[];

      // Obter detalhes de cada proposta
      const details = await Promise.all(
        proposalHashes.map(async (hash) => {
          const proposalOf = await api.query.council.proposalOf(hash);
          const voting = await api.query.council.voting(hash);
          return {
            hash,
            proposal: proposalOf.toJSON(),
            voting: voting.toJSON(),
          };
        })
      );

      return reply.send({ success: true, data: details });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return reply.status(500).send({ success: false, error: errorMsg });
    }
  });

  // ==================== TECHNICAL COMMITTEE ====================

  /**
   * POST /governance/tech-committee/propose
   * Cria uma nova proposta do comitê técnico
   */
  const techCommitteeProposeSchema = z.object({
    title: z.string().min(1).max(100),
    description: z.string().min(1).max(2000),
    signature: z.string(),
    address: z.string(),
  });

  app.post('/governance/tech-committee/propose', {
    onRequest: authOnRequest,
  }, async (request, reply) => {
    try {
      // Validar body com Zod
      const validationResult = techCommitteeProposeSchema.safeParse(request.body);
      if (!validationResult.success) {
        return reply.status(400).send({
          success: false,
          error: 'Validation failed',
          details: validationResult.error.errors,
        });
      }

      const { title, description, signature, address } = validationResult.data;
      const authUser = (request as any).authUser;

      // Submeter proposta de technical committee para a blockchain
      const result = await GovernanceService.submitTechCommitteeProposal({
        title,
        description,
        signature,
        proposer: address,
      });

      return reply.status(201).send({
        success: true,
        data: {
          id: result.proposalId,
          type: 'technical',
          title,
          description,
          proposer: address,
          status: 'active',
          txHash: result.txHash,
          blockHash: result.blockHash,
          blockNumber: result.blockNumber,
          createdAt: new Date().toISOString(),
        },
        message: 'Proposta técnica criada com sucesso na blockchain!'
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return reply.status(500).send({ success: false, error: errorMsg });
    }
  });

  /**
   * GET /governance/tech-committee/members
   * Lista membros do comitê técnico
   */
  app.get('/governance/tech-committee/members', async (_request, reply) => {
    try {
      const api = await getSubstrateApi();
      const members = await api.query.technicalCommittee.members();

      return reply.send({
        success: true,
        data: (members as any).map((m: any) => m.toString())
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return reply.status(500).send({ success: false, error: errorMsg });
    }
  });

  /**
   * GET /governance/tech-committee/proposals
   * Lista propostas do comitê técnico
   */
  app.get('/governance/tech-committee/proposals', async (_request, reply) => {
    try {
      const api = await getSubstrateApi();
      const proposals = await api.query.technicalCommittee.proposals();
      const proposalHashes = proposals.toJSON() as string[];

      // Obter detalhes de cada proposta
      const details = await Promise.all(
        proposalHashes.map(async (hash) => {
          const proposalOf = await api.query.technicalCommittee.proposalOf(hash);
          const voting = await api.query.technicalCommittee.voting(hash);
          return {
            hash,
            proposal: proposalOf.toJSON(),
            voting: voting.toJSON(),
          };
        })
      );

      return reply.send({ success: true, data: details });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return reply.status(500).send({ success: false, error: errorMsg });
    }
  });

  // ==================== MULTISIG ====================

  /**
   * GET /governance/multisig/:address
   * Obtém informações de transações multisig de uma conta
   */
  app.get<{ Params: { address: string } }>(
    '/governance/multisig/:address',
    async (request, reply) => {
      try {
        const api = await getSubstrateApi();
        const { address } = request.params;

        // Obter todas as multisigs envolvendo esse endereço
        const multisigs = await api.query.multisig.multisigs.entries();
        const filtered = multisigs.filter(([key]: any) => {
          const account = key.args[0].toString();
          return account === address;
        });

        const data = filtered.map(([key, value]: any) => ({
          account: key.args[0].toString(),
          callHash: key.args[1].toHex(),
          multisig: value.toJSON(),
        }));

        return reply.send({ success: true, address, data });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return reply.status(500).send({ success: false, error: errorMsg });
      }
    }
  );

  // ==================== GENERAL STATS ====================

  /**
   * GET /governance/stats
   * Estatísticas gerais de governança
   */
  app.get('/governance/stats', async (_request, reply) => {
    try {
      const api = await getSubstrateApi();

      // Coletar estatísticas em paralelo
      const [
        treasuryProposalsCount,
        referendumsCount,
        councilMembers,
        techMembers,
        referendums,
      ] = await Promise.all([
        api.query.treasury.proposalCount(),
        api.query.democracy.referendumCount(),
        api.query.council.members(),
        api.query.technicalCommittee.members(),
        api.query.democracy.referendumInfoOf.entries(),
      ]);

      // Contar referendums ativos
      const activeReferendums = (referendums as any[]).filter(([_, info]: any) => {
        return info.isSome && info.unwrap().isOngoing;
      }).length;

      // Obter saldo do tesouro (treasury pot)
      let treasuryBalance = '0';
      try {
        const treasuryAccount = await api.query.system.account(
          (api as any).consts.treasury.palletId ||
          '0x70792f74727372790000000000000000000000000000000000000000000000'
        );
        treasuryBalance = (treasuryAccount as any).data.free.toString();
      } catch (err) {
        // Fallback: usar saldo zero se falhar
        treasuryBalance = '0';
      }

      const stats = {
        treasury: {
          proposalCount: (treasuryProposalsCount as any).toNumber(),
          balance: treasuryBalance,
        },
        democracy: {
          referendumCount: (referendumsCount as any).toNumber(),
          activeReferendums,
        },
        council: {
          memberCount: (councilMembers as any).length,
        },
        techCommittee: {
          memberCount: (techMembers as any).length,
        },
      };

      return reply.send({ success: true, data: stats });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return reply.status(500).send({ success: false, error: errorMsg });
    }
  });
}
