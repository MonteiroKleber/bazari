import { FastifyInstance } from 'fastify';
import { getSubstrateApi } from '../lib/substrate.js';

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

      return reply.send({ success: true, data: proposals.toJSON() });
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

  // ==================== COUNCIL ====================

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
