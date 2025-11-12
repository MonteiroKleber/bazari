import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { PrismaClient } from '@prisma/client';
import { getSubstrateApi } from '../lib/substrate.js';
import { authOnRequest } from '../lib/auth/middleware.js';
import { GovernanceService } from '../services/governance/governance.service.js';

export async function governanceRoutes(
  app: FastifyInstance,
  options: { prisma: PrismaClient }
) {
  const { prisma } = options;
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
   * NOVO: Prioriza dados salvos no PostgreSQL (persistentes), com fallback para blockchain
   */
  app.get('/governance/democracy/referendums', async (_request, reply) => {
    try {
      const api = await getSubstrateApi();

      // Obter todos os referendos on-chain
      const referendumCount = await api.query.democracy.referendumCount();
      const count = referendumCount.toNumber();

      const referendums = [];

      // Iterar sobre todos os possíveis índices de referendos
      for (let i = 0; i < count; i++) {
        const refInfo = await api.query.democracy.referendumInfoOf(i);

        if (refInfo.isSome) {
          const info = refInfo.unwrap();

          // Verificar se está em andamento (Ongoing)
          if (info.isOngoing) {
            const ongoing = info.asOngoing;

            // Obter proposta (pode estar em proposalHash ou proposal dependendo da versão)
            const proposalRaw = ongoing.proposalHash || ongoing.proposal;
            const proposalHex = proposalRaw?.toHex() || '';

            // PRIORIDADE 1: Buscar do banco de dados (dados persistentes!)
            let title = `Referendum #${i}`;
            let description = '';
            let proposer: string | undefined = undefined;
            let originProposalId: number | undefined = undefined;

            const savedReferendum = await prisma.governanceReferendum.findUnique({
              where: { refIndex: i },
              include: { proposal: true },
            });

            if (savedReferendum) {
              // Usar dados do banco (já contém metadata da proposta original!)
              title = savedReferendum.title;
              description = savedReferendum.description;
              proposer = savedReferendum.proposer || undefined;
              originProposalId = savedReferendum.proposal?.proposalIndex;

              console.log(`[Governance] ✅ Loaded referendum #${i} from database: "${title}"`);
            } else {
              // FALLBACK: Tentar buscar do blockchain (para referendos criados antes do worker)
              console.log(`[Governance] ⚠️  Referendum #${i} not in database, trying blockchain fallback...`);

              // Buscar propostas ativas
              const proposals = await api.query.democracy.publicProps();
              const proposalsArray = proposals.toJSON() as any[];

              for (const [id, proposal] of proposalsArray) {
                const hash = proposal?.lookup?.hash || proposal?.hash;

                if (hash === proposalHex) {
                  originProposalId = id as number;
                  break;
                }
              }

              // Tentar extrair metadata do preimage
              try {
                const { blake2AsHex } = await import('@polkadot/util-crypto');
                const callHash = blake2AsHex(proposalHex);

                const preimageStatus = await api.query.preimage.requestStatusFor(callHash);

                if (preimageStatus.isSome) {
                  const status = preimageStatus.unwrap();
                  const len = status.isUnrequested
                    ? status.asUnrequested.len.toNumber()
                    : status.asRequested.len.toNumber();
                  const preimageData = await api.query.preimage.preimageFor([callHash, len]);

                  if (preimageData.isSome) {
                    const bytes = preimageData.unwrap();
                    const call = api.registry.createType('Call', bytes);

                    if (call.section === 'system' && call.method === 'remark') {
                      try {
                        const remarkHex = call.args[0].toHex();
                        const remarkData = Buffer.from(remarkHex.slice(2), 'hex').toString('utf8');
                        const metadata = JSON.parse(remarkData);

                        if (metadata.title) title = metadata.title;
                        if (metadata.description) description = metadata.description;
                      } catch (parseError) {
                        console.warn(`[Governance] Could not parse preimage metadata`);
                      }
                    } else {
                      description = `${call.section}.${call.method}`;
                    }
                  }
                }
              } catch (preimageErr) {
                console.warn(`[Governance] Could not fetch preimage:`, preimageErr);
              }
            }

            referendums.push({
              id: i,
              title,
              description,
              proposer,
              proposalHash: proposalHex,
              status: 'ONGOING',
              end: ongoing.end.toNumber(),
              threshold: ongoing.threshold.toJSON(),
              delay: ongoing.delay.toNumber(),
              originProposalId: originProposalId,
              // Tally para compatibilidade
              tally: {
                ayes: ongoing.tally.ayes.toString(),
                nays: ongoing.tally.nays.toString(),
                turnout: ongoing.tally.turnout.toString(),
              },
              // Adicionar campos para o gráfico
              ayeVotes: ongoing.tally.ayes.toString(),
              nayVotes: ongoing.tally.nays.toString(),
            });
          } else if (info.isFinished) {
            const finished = info.asFinished;

            // Buscar do banco para obter título
            const savedReferendum = await prisma.governanceReferendum.findUnique({
              where: { refIndex: i },
            });

            referendums.push({
              id: i,
              title: savedReferendum?.title || `Referendum #${i}`,
              description: savedReferendum?.description || '',
              proposer: savedReferendum?.proposer || undefined,
              proposalHash: savedReferendum?.proposalHash || '',
              status: finished.approved.isTrue ? 'APPROVED' : 'REJECTED',
              end: finished.end.toNumber(),
            });
          }
        }
      }

      return reply.send({ success: true, data: referendums });
    } catch (error) {
      console.error('[Governance] Error fetching referendums:', error);
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
      // Buscar metadados do preimage para cada proposta
      const formattedProposals = await Promise.all(
        proposalsArray.map(async ([id, proposal, proposer]) => {
          const hash = proposal?.lookup?.hash || proposal?.hash;

          // Default values (fallback)
          let title = `Democracy Proposal #${id}`;
          let description = `Proposal hash: ${hash}`;

          // Tentar buscar preimage on-chain
          try {
            // Usar requestStatusFor ao invés de statusFor (pallet-preimage moderno)
            const preimageStatus = await api.query.preimage.requestStatusFor(hash);

            if (preimageStatus.isSome) {
              const status = preimageStatus.unwrap();

              // Pode estar Unrequested ou Requested
              // Ambos contêm o campo 'len' com o tamanho
              const len = status.isUnrequested ? status.asUnrequested.len.toNumber() : status.asRequested.len.toNumber();

              // Buscar preimage pelo par [hash, len]
              const preimageData = await api.query.preimage.preimageFor([hash, len]);

              if (preimageData.isSome) {
                const bytes = preimageData.unwrap();

                // Decodificar bytes como Call
                const call = api.registry.createType('Call', bytes);

                // Se for system.remark, extrair metadados JSON
                if (call.section === 'system' && call.method === 'remark') {
                  try {
                    // args[0] é Bytes em formato hex (0x...)
                    const remarkHex = call.args[0].toHex();
                    // Converter hex para string UTF-8
                    const remarkData = Buffer.from(remarkHex.slice(2), 'hex').toString('utf8');
                    const metadata = JSON.parse(remarkData);

                    if (metadata.title) {
                      title = metadata.title;
                    }
                    if (metadata.description) {
                      description = metadata.description;
                    }

                    console.log(`[Governance] ✅ Loaded metadata for proposal #${id}: "${title}"`);
                  } catch (parseError) {
                    console.warn(`[Governance] Failed to parse metadata for proposal #${id}:`, parseError);
                  }
                }
              } else {
                console.warn(`[Governance] ⚠️  Preimage data not available for proposal #${id} (hash: ${hash}, len: ${len})`);
              }
            } else {
              console.warn(`[Governance] ⚠️  No preimage found for proposal #${id} (hash: ${hash})`);
            }
          } catch (preimageError) {
            console.error(`[Governance] Error fetching preimage for proposal #${id}:`, preimageError);
          }

          // Buscar informações de endosso (depositOf)
          let endorsements = 0;
          let endorsers: string[] = [];
          try {
            const depositOf = await api.query.democracy.depositOf(id);
            if (depositOf.isSome) {
              const [depositors] = depositOf.unwrap();
              endorsements = depositors.length;
              endorsers = depositors.map((addr: any) => addr.toString());
            }
          } catch (depositError) {
            console.warn(`[Governance] Could not fetch deposit info for proposal #${id}:`, depositError);
          }

          // Check if this proposal has become a referendum
          let referendumId: number | undefined = undefined;
          try {
            const referendumCount = await api.query.democracy.referendumCount();
            const totalReferendums = referendumCount.toNumber();

            // Check recent referendums for matching preimage hash
            for (let refId = Math.max(0, totalReferendums - 20); refId < totalReferendums; refId++) {
              const refInfo = await api.query.democracy.referendumInfoOf(refId);
              if (refInfo.isSome) {
                const info = refInfo.unwrap();
                if (info.isOngoing) {
                  const ongoing = info.asOngoing;
                  const refHash = ongoing.proposal.toHex();
                  if (refHash === hash) {
                    referendumId = refId;
                    break;
                  }
                }
              }
            }
          } catch (refError) {
            console.warn(`[Governance] Could not check referendum status for proposal #${id}:`, refError);
          }

          return {
            id: id,
            type: 'DEMOCRACY',
            proposer: proposer,
            title: title,
            description: description,
            status: 'PROPOSED',
            preimageHash: hash,
            endorsements: endorsements,
            endorsers: endorsers,
            referendumId: referendumId,
            createdAt: new Date().toISOString(),
          };
        })
      );

      return reply.send({ success: true, data: formattedProposals });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return reply.status(500).send({ success: false, error: errorMsg });
    }
  });

  /**
   * POST /governance/democracy/second/:id
   * Endossa (second) uma proposta pública
   */
  app.post<{
    Params: { id: string };
    Body: { signature: string; address: string; mnemonic: string };
  }>(
    '/governance/democracy/second/:id',
    { onRequest: authOnRequest },
    async (request, reply) => {
      try {
        const proposalId = parseInt(request.params.id);
        const { signature, address, mnemonic } = request.body;

        // Validar dados
        if (!signature || !address || !mnemonic) {
          return reply.status(400).send({
            success: false,
            error: 'Missing signature, address, or mnemonic',
          });
        }

        // Verificar assinatura
        const messageData = JSON.stringify({
          action: 'second',
          proposalId: proposalId,
          address: address,
        });

        if (!GovernanceService.verifySignature(messageData, signature, address)) {
          return reply.status(401).send({
            success: false,
            error: 'Invalid signature',
          });
        }

        // Chamar democracy.second com mnemonic do usuário
        const result = await GovernanceService.secondProposal({
          proposalId,
          address,
          signature,
          mnemonic,
        });

        return reply.send({
          success: true,
          data: result,
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return reply.status(500).send({ success: false, error: errorMsg });
      }
    }
  );

  /**
   * POST /governance/democracy/vote/:refId
   * Vota em um referendo
   */
  app.post<{
    Params: { refId: string };
    Body: {
      vote: { aye: boolean; conviction: number };
      balance: string;
      signature: string;
      address: string;
      timestamp: string;
    };
  }>(
    '/governance/democracy/vote/:refId',
    { onRequest: authOnRequest },
    async (request, reply) => {
      try {
        const refId = parseInt(request.params.refId);
        const { vote, balance, signature, address, timestamp } = request.body;

        // Validar dados
        if (!vote || balance === undefined || !signature || !address || !timestamp) {
          return reply.status(400).send({
            success: false,
            error: 'Missing required fields',
          });
        }

        // Verificar assinatura usando o timestamp do frontend
        const messageData = JSON.stringify({
          type: 'democracy.vote',
          referendumId: refId,
          vote: {
            Standard: {
              vote: {
                aye: vote.aye,
                conviction: vote.conviction,
              },
              balance,
            },
          },
          timestamp, // Use timestamp from frontend
        });

        if (!GovernanceService.verifySignature(messageData, signature, address)) {
          return reply.status(401).send({
            success: false,
            error: 'Invalid signature',
          });
        }

        // Submeter voto
        const result = await GovernanceService.voteOnReferendum({
          refId,
          vote,
          balance,
          address,
          signature,
        });

        return reply.send({
          success: true,
          data: result,
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return reply.status(500).send({ success: false, error: errorMsg });
      }
    }
  );

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

        /**
         * Helper: Decode vote byte to extract direction and conviction
         * Vote byte format: 0bAVVV_VVVV
         * - A (bit 7): 1 = AYE, 0 = NAY
         * - V (bits 0-6): conviction (0-6)
         *
         * Examples:
         * - 0x81 = 0b1000_0001 = AYE with conviction 1 (1x lockup)
         * - 0x80 = 0b1000_0000 = AYE with conviction 0 (0.1x, no lockup)
         * - 0x01 = 0b0000_0001 = NAY with conviction 1 (1x lockup)
         */
        const decodeVote = (voteHex: string): { aye: boolean; conviction: number } => {
          const voteByte = parseInt(voteHex, 16);
          const aye = (voteByte & 0x80) !== 0; // Bit 7
          const conviction = voteByte & 0x7F; // Bits 0-6
          return { aye, conviction };
        };

        // Obter voting records
        const votingOf = await api.query.democracy.votingOf.entries();

        // Process and transform votes to frontend format
        const processedVotes: any[] = [];

        votingOf.forEach(([key, voting]: any) => {
          const voterAddress = key.args[0].toString();
          const votingData = voting.toJSON() as any;

          // Check if voter has direct votes
          if (votingData?.direct?.votes) {
            // Find vote for this specific referendum
            const voteRecord = votingData.direct.votes.find((vote: any) => vote[0] === refIndex);

            if (voteRecord) {
              const [_refId, voteInfo] = voteRecord;

              // Handle standard vote format
              if (voteInfo?.standard) {
                const { vote: voteHex, balance } = voteInfo.standard;
                const { aye, conviction } = decodeVote(voteHex);

                processedVotes.push({
                  voter: voterAddress,
                  voteType: aye ? 'AYE' : 'NAY',
                  balance: balance.toString(),
                  conviction,
                  timestamp: new Date().toISOString(), // Fallback to current time
                });
              }
              // Handle split vote format (if needed in the future)
              else if (voteInfo?.split) {
                const { aye, nay } = voteInfo.split;
                processedVotes.push({
                  voter: voterAddress,
                  voteType: 'SPLIT',
                  ayeBalance: aye.toString(),
                  nayBalance: nay.toString(),
                  conviction: 0,
                  timestamp: new Date().toISOString(),
                });
              }
            }
          }
        });

        return reply.send({
          success: true,
          referendumId: refIndex,
          info: refInfo.toJSON(),
          votes: processedVotes
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
      // Treasury account address: 5EYCAe5ijiYfyeZ2JJCGq56LmPyNRAKzpG4QkoQkkQNB5e6Z
      let treasuryBalance = '0';
      try {
        const treasuryAddress = '5EYCAe5ijiYfyeZ2JJCGq56LmPyNRAKzpG4QkoQkkQNB5e6Z';
        const treasuryAccount = await api.query.system.account(treasuryAddress);
        treasuryBalance = (treasuryAccount as any).data.free.toString();
      } catch (err) {
        console.error('[Stats] Error querying treasury balance:', err);
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
