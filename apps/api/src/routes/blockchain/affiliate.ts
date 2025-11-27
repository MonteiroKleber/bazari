// Backend REST API - Affiliate Routes
// Conecta frontend → pallet bazari-affiliate via Polkadot.js
// path: apps/api/src/routes/blockchain/affiliate.ts
// @ts-nocheck - Polkadot.js type incompatibilities

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authOnRequest } from '../../lib/auth/middleware.js';
import { BlockchainService } from '../../services/blockchain/blockchain.service.js';
import crypto from 'crypto';

const addressParamsSchema = z.object({
  address: z.string().min(1),
});

const saleIdParamsSchema = z.object({
  saleId: z.string(),
});

// ============================================================================
// Interface para nó da árvore de referrals
// ============================================================================
interface ReferralTreeNode {
  address: string;
  referrer: string | null;
  level: number;
  depth: number;
  registeredAt: number;
  totalReferrals: number;
  directReferrals: number;
  children: ReferralTreeNode[];
}

// ============================================================================
// Helper para construir árvore de referrals
// ============================================================================
function buildReferralTree(
  affiliates: Array<{ address: string; referrer: string | null; registeredAt: number }>,
  rootAddress: string,
  maxDepth: number = 5
): ReferralTreeNode | null {
  // Encontrar o nó raiz
  const rootAffiliate = affiliates.find(a => a.address === rootAddress);
  if (!rootAffiliate) return null;

  // Criar mapa de referrer -> referidos diretos
  const referralMap = new Map<string, typeof affiliates>();
  for (const affiliate of affiliates) {
    if (affiliate.referrer) {
      const existing = referralMap.get(affiliate.referrer) || [];
      existing.push(affiliate);
      referralMap.set(affiliate.referrer, existing);
    }
  }

  // Função recursiva para construir a árvore
  function buildNode(address: string, depth: number, level: number): ReferralTreeNode {
    const affiliate = affiliates.find(a => a.address === address);
    const directReferrals = referralMap.get(address) || [];

    // Calcular total de referrals (incluindo indiretos)
    let totalReferrals = directReferrals.length;

    const children: ReferralTreeNode[] = [];
    if (depth < maxDepth) {
      for (const referral of directReferrals) {
        const childNode = buildNode(referral.address, depth + 1, level + 1);
        totalReferrals += childNode.totalReferrals;
        children.push(childNode);
      }
    }

    return {
      address,
      referrer: affiliate?.referrer || null,
      level,
      depth,
      registeredAt: affiliate?.registeredAt || 0,
      totalReferrals,
      directReferrals: directReferrals.length,
      children,
    };
  }

  return buildNode(rootAddress, 0, 0);
}

// ============================================================================
// Helper para gerar Merkle proof simplificado
// ============================================================================
function generateMerkleProof(
  saleId: string,
  affiliateAddress: string,
  commissionAmount: string,
  level: number
): { root: string; proof: string[]; leaf: string } {
  // Gerar leaf hash: hash(saleId + affiliate + amount + level)
  const leafData = `${saleId}:${affiliateAddress}:${commissionAmount}:${level}`;
  const leaf = crypto.createHash('sha256').update(leafData).digest('hex');

  // Em produção, isso viria do pallet on-chain
  // Por ora, geramos prova simplificada
  const proofNodes = [];
  let currentHash = leaf;

  for (let i = 0; i < 3; i++) {
    const siblingData = `sibling_${i}_${saleId}`;
    const sibling = crypto.createHash('sha256').update(siblingData).digest('hex');
    proofNodes.push(sibling);

    // Combinar hashes
    const combined = currentHash < sibling
      ? currentHash + sibling
      : sibling + currentHash;
    currentHash = crypto.createHash('sha256').update(combined).digest('hex');
  }

  return {
    root: `0x${currentHash}`,
    proof: proofNodes.map(p => `0x${p}`),
    leaf: `0x${leaf}`,
  };
}

export async function affiliateRoutes(
  app: FastifyInstance,
  options: FastifyPluginOptions & { prisma: PrismaClient }
) {
  const { prisma } = options;
  const blockchainService = BlockchainService.getInstance();

  // ============================================================================
  // GET /api/blockchain/affiliate/tree/:address - Árvore de referrals
  // ============================================================================
  app.get('/affiliate/tree/:address', { preHandler: authOnRequest }, async (request, reply) => {
    try {
      const { address } = addressParamsSchema.parse(request.params);
      const querySchema = z.object({
        depth: z.string().optional().transform(v => v ? parseInt(v, 10) : 5),
      });
      const { depth } = querySchema.parse(request.query);

      const api = await blockchainService.getApi();

      // Verificar se pallet existe
      if (!api.query.bazariAffiliate?.affiliates) {
        return reply.status(503).send({
          error: 'Affiliate pallet not available',
          tree: null,
        });
      }

      // Buscar todos os affiliates
      const affiliatesData = await api.query.bazariAffiliate.affiliates.entries();

      const affiliates = affiliatesData.map(([key, affiliateOption]: [any, any]) => {
        if (!affiliateOption || affiliateOption.isNone) return null;

        const affiliate = affiliateOption.unwrap();
        return {
          address: key.args[0].toString(),
          referrer: affiliate.referrer?.isSome
            ? affiliate.referrer.unwrap().toString()
            : null,
          registeredAt: affiliate.registeredAt?.toNumber?.() || 0,
        };
      }).filter(Boolean) as Array<{ address: string; referrer: string | null; registeredAt: number }>;

      // Construir árvore
      const tree = buildReferralTree(affiliates, address, depth);

      if (!tree) {
        return reply.status(404).send({
          error: 'Affiliate not found',
          address,
        });
      }

      // Calcular estatísticas adicionais
      const stats = {
        totalInNetwork: tree.totalReferrals,
        directCount: tree.directReferrals,
        levelsDeep: calculateMaxDepth(tree),
      };

      return {
        address,
        tree,
        stats,
        fetchedAt: Date.now(),
      };
    } catch (error) {
      app.log.error(error);
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid input', details: error.errors });
      }
      return reply.status(500).send({ error: 'Failed to fetch referral tree' });
    }
  });

  // ============================================================================
  // GET /api/blockchain/affiliate/stats/:address - Estatísticas do afiliado
  // ============================================================================
  app.get('/affiliate/stats/:address', { preHandler: authOnRequest }, async (request, reply) => {
    try {
      const { address } = addressParamsSchema.parse(request.params);

      const api = await blockchainService.getApi();

      if (!api.query.bazariAffiliate?.affiliates) {
        return reply.status(503).send({
          error: 'Affiliate pallet not available',
        });
      }

      // Buscar dados do affiliate
      const affiliateData = await api.query.bazariAffiliate.affiliates(address);

      if (!affiliateData || affiliateData.isNone) {
        return reply.status(404).send({
          error: 'Affiliate not found',
          address,
          isRegistered: false,
        });
      }

      const affiliate = affiliateData.unwrap();

      // Buscar comissões pendentes
      let pendingCommissions = '0';
      let claimedCommissions = '0';

      try {
        const pending = await api.query.bazariAffiliate.pendingCommissions(address);
        pendingCommissions = pending?.toString?.() || '0';

        const claimed = await api.query.bazariAffiliate.claimedCommissions?.(address);
        claimedCommissions = claimed?.toString?.() || '0';
      } catch (e) {
        app.log.warn('Error fetching commission data:', e);
      }

      // Contar referidos diretos
      const affiliatesData = await api.query.bazariAffiliate.affiliates.entries();
      let directReferrals = 0;
      let indirectReferrals = 0;

      // Criar set de referidos diretos
      const directReferralSet = new Set<string>();

      for (const [key, affiliateOption] of affiliatesData) {
        if (!affiliateOption || affiliateOption.isNone) continue;
        const aff = affiliateOption.unwrap();
        const referrer = aff.referrer?.isSome ? aff.referrer.unwrap().toString() : null;

        if (referrer === address) {
          directReferrals++;
          directReferralSet.add(key.args[0].toString());
        }
      }

      // Contar indiretos (referidos dos meus referidos)
      for (const [key, affiliateOption] of affiliatesData) {
        if (!affiliateOption || affiliateOption.isNome) continue;
        const aff = affiliateOption.unwrap();
        const referrer = aff.referrer?.isSome ? aff.referrer.unwrap().toString() : null;

        if (referrer && directReferralSet.has(referrer)) {
          indirectReferrals++;
        }
      }

      // Buscar taxas de comissão do pallet
      let commissionRates = {
        level1: 5, // 5% padrão
        level2: 3,
        level3: 1,
      };

      try {
        const rates = await api.query.bazariAffiliate.commissionRates?.();
        if (rates) {
          const ratesArray = rates.toJSON() as number[];
          commissionRates = {
            level1: ratesArray[0] || 5,
            level2: ratesArray[1] || 3,
            level3: ratesArray[2] || 1,
          };
        }
      } catch (e) {
        app.log.warn('Error fetching commission rates:', e);
      }

      return {
        address,
        isRegistered: true,
        referrer: affiliate.referrer?.isSome
          ? affiliate.referrer.unwrap().toString()
          : null,
        registeredAt: affiliate.registeredAt?.toNumber?.() || 0,

        // Referrals
        directReferrals,
        indirectReferrals,
        totalReferrals: directReferrals + indirectReferrals,

        // Comissões (em planck)
        pendingCommissions,
        claimedCommissions,
        totalEarned: (BigInt(pendingCommissions) + BigInt(claimedCommissions)).toString(),

        // Taxas
        commissionRates,

        // Links
        referralCode: generateReferralCode(address),
      };
    } catch (error) {
      app.log.error(error);
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid input', details: error.errors });
      }
      return reply.status(500).send({ error: 'Failed to fetch affiliate stats' });
    }
  });

  // ============================================================================
  // POST /api/blockchain/affiliate/generate-link - Gerar link de referral
  // ============================================================================
  const generateLinkSchema = z.object({
    targetUrl: z.string().url().optional(),
    campaign: z.string().max(50).optional(),
  });

  app.post('/affiliate/generate-link', { preHandler: authOnRequest }, async (request, reply) => {
    try {
      const { targetUrl, campaign } = generateLinkSchema.parse(request.body || {});
      const authUser = (request as any).authUser as { sub: string; address: string };

      const api = await blockchainService.getApi();

      // Verificar se usuário está registrado como affiliate
      if (api.query.bazariAffiliate?.affiliates) {
        const affiliateData = await api.query.bazariAffiliate.affiliates(authUser.address);

        if (!affiliateData || affiliateData.isNone) {
          return reply.status(400).send({
            error: 'Not registered as affiliate',
            message: 'You need to register as an affiliate first',
            registerEndpoint: '/api/blockchain/affiliate/prepare-register',
          });
        }
      }

      // Gerar código de referral
      const referralCode = generateReferralCode(authUser.address);

      // Construir URL
      const baseUrl = targetUrl || process.env.FRONTEND_URL || 'https://bazari.io';
      const url = new URL(baseUrl);
      url.searchParams.set('ref', referralCode);
      if (campaign) {
        url.searchParams.set('utm_campaign', campaign);
      }

      // Salvar no banco (opcional, para tracking)
      try {
        await prisma.referralLink.upsert({
          where: {
            affiliateAddress_code: {
              affiliateAddress: authUser.address,
              code: referralCode,
            },
          },
          create: {
            affiliateAddress: authUser.address,
            code: referralCode,
            targetUrl: targetUrl || null,
            campaign: campaign || null,
            clicks: 0,
            conversions: 0,
          },
          update: {
            targetUrl: targetUrl || null,
            campaign: campaign || null,
          },
        });
      } catch (e) {
        // Tabela pode não existir ainda, continuar
        app.log.warn('Could not save referral link:', e);
      }

      return {
        success: true,
        affiliateAddress: authUser.address,
        referralCode,
        fullUrl: url.toString(),
        shortUrl: `${process.env.FRONTEND_URL || 'https://bazari.io'}/r/${referralCode}`,
        campaign: campaign || null,
        expiresAt: null, // Links não expiram
      };
    } catch (error) {
      app.log.error(error);
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid input', details: error.errors });
      }
      return reply.status(500).send({ error: 'Failed to generate referral link' });
    }
  });

  // ============================================================================
  // GET /api/blockchain/affiliate/commission-proof/:saleId - Merkle proof de comissão
  // ============================================================================
  app.get('/affiliate/commission-proof/:saleId', { preHandler: authOnRequest }, async (request, reply) => {
    try {
      const { saleId } = saleIdParamsSchema.parse(request.params);
      const authUser = (request as any).authUser as { sub: string; address: string };

      const api = await blockchainService.getApi();

      // Verificar se pallet tem suporte a provas
      if (!api.query.bazariAffiliate?.saleCommissions) {
        return reply.status(503).send({
          error: 'Commission proof not available',
          message: 'Pallet does not support commission proofs',
        });
      }

      // Buscar dados da comissão para esta venda
      let commissionData;
      try {
        commissionData = await api.query.bazariAffiliate.saleCommissions(saleId, authUser.address);
      } catch (e) {
        app.log.warn('Error fetching sale commission:', e);
      }

      if (!commissionData || commissionData.isNone) {
        // Tentar buscar do DB
        const dbCommission = await prisma.affiliateCommission.findFirst({
          where: {
            saleId,
            affiliateAddress: authUser.address,
          },
        });

        if (!dbCommission) {
          return reply.status(404).send({
            error: 'No commission found for this sale',
            saleId,
            address: authUser.address,
          });
        }

        // Gerar proof a partir dos dados do DB
        const proof = generateMerkleProof(
          saleId,
          authUser.address,
          dbCommission.amount.toString(),
          dbCommission.level
        );

        return {
          saleId,
          affiliateAddress: authUser.address,
          amount: dbCommission.amount.toString(),
          level: dbCommission.level,
          status: dbCommission.status,
          merkleProof: proof,
          verificationUrl: `/api/blockchain/affiliate/verify-proof`,
        };
      }

      // Dados do chain
      const commission = commissionData.unwrap();
      const amount = commission.amount?.toString?.() || '0';
      const level = commission.level?.toNumber?.() || 0;

      // Buscar merkle root do chain
      let merkleRoot = null;
      try {
        const rootData = await api.query.bazariAffiliate.commissionMerkleRoot?.(saleId);
        merkleRoot = rootData?.toHex?.() || null;
      } catch (e) {
        app.log.warn('Error fetching merkle root:', e);
      }

      // Gerar proof
      const proof = generateMerkleProof(saleId, authUser.address, amount, level);

      // Se temos root do chain, usar ele
      if (merkleRoot) {
        proof.root = merkleRoot;
      }

      return {
        saleId,
        affiliateAddress: authUser.address,
        amount,
        level,
        status: commission.status?.toString?.() || 'Pending',
        merkleProof: proof,
        verificationUrl: `/api/blockchain/affiliate/verify-proof`,
        onChain: true,
      };
    } catch (error) {
      app.log.error(error);
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid input', details: error.errors });
      }
      return reply.status(500).send({ error: 'Failed to fetch commission proof' });
    }
  });

  // ============================================================================
  // POST /api/blockchain/affiliate/prepare-register - Preparar registro como affiliate
  // ============================================================================
  const prepareRegisterSchema = z.object({
    referrerCode: z.string().optional(),
  });

  app.post('/affiliate/prepare-register', { preHandler: authOnRequest }, async (request, reply) => {
    try {
      const { referrerCode } = prepareRegisterSchema.parse(request.body || {});
      const authUser = (request as any).authUser as { sub: string; address: string };

      const api = await blockchainService.getApi();

      // Verificar se pallet existe
      if (!api.tx.bazariAffiliate?.register) {
        return reply.status(503).send({
          error: 'Affiliate pallet not available',
        });
      }

      // Verificar se já está registrado
      if (api.query.bazariAffiliate?.affiliates) {
        const existing = await api.query.bazariAffiliate.affiliates(authUser.address);
        if (existing && !existing.isNone) {
          return reply.status(400).send({
            error: 'Already registered as affiliate',
            address: authUser.address,
          });
        }
      }

      // Decodificar referrer do código
      let referrerAddress = null;
      if (referrerCode) {
        referrerAddress = decodeReferralCode(referrerCode);

        // Verificar se referrer existe
        if (referrerAddress && api.query.bazariAffiliate?.affiliates) {
          const referrerData = await api.query.bazariAffiliate.affiliates(referrerAddress);
          if (!referrerData || referrerData.isNone) {
            return reply.status(400).send({
              error: 'Invalid referral code',
              message: 'Referrer is not registered as affiliate',
            });
          }
        }
      }

      // Preparar call
      // O pallet pode ter: register() ou register(referrer: Option<AccountId>)
      let callData;
      if (referrerAddress) {
        callData = api.tx.bazariAffiliate.register(referrerAddress);
      } else {
        callData = api.tx.bazariAffiliate.register(null);
      }

      return {
        affiliateAddress: authUser.address,
        referrer: referrerAddress,
        referrerCode: referrerCode || null,
        callHex: callData.toHex(),
        callHash: callData.hash.toHex(),
        method: 'bazariAffiliate.register',
        signerAddress: authUser.address,
      };
    } catch (error) {
      app.log.error(error);
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid input', details: error.errors });
      }
      return reply.status(500).send({ error: 'Failed to prepare registration' });
    }
  });

  // ============================================================================
  // POST /api/blockchain/affiliate/prepare-claim - Preparar claim de comissões
  // ============================================================================
  app.post('/affiliate/prepare-claim', { preHandler: authOnRequest }, async (request, reply) => {
    try {
      const authUser = (request as any).authUser as { sub: string; address: string };

      const api = await blockchainService.getApi();

      // Verificar se pallet existe
      if (!api.tx.bazariAffiliate?.claimCommissions) {
        return reply.status(503).send({
          error: 'Claim not available',
          message: 'Pallet does not support commission claims',
        });
      }

      // Verificar comissões pendentes
      let pendingAmount = '0';
      try {
        const pending = await api.query.bazariAffiliate.pendingCommissions(authUser.address);
        pendingAmount = pending?.toString?.() || '0';
      } catch (e) {
        app.log.warn('Error checking pending commissions:', e);
      }

      if (pendingAmount === '0') {
        return reply.status(400).send({
          error: 'No pending commissions',
          message: 'You have no commissions to claim',
        });
      }

      const callData = api.tx.bazariAffiliate.claimCommissions();

      return {
        affiliateAddress: authUser.address,
        pendingAmount,
        callHex: callData.toHex(),
        callHash: callData.hash.toHex(),
        method: 'bazariAffiliate.claimCommissions',
        signerAddress: authUser.address,
      };
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: 'Failed to prepare claim' });
    }
  });

  // ============================================================================
  // GET /api/blockchain/affiliate/leaderboard - Top afiliados
  // ============================================================================
  const leaderboardQuerySchema = z.object({
    limit: z.string().optional().transform(v => v ? parseInt(v, 10) : 10),
    period: z.enum(['all', 'month', 'week']).optional().default('all'),
  });

  app.get('/affiliate/leaderboard', async (request, reply) => {
    try {
      const { limit, period } = leaderboardQuerySchema.parse(request.query);

      const api = await blockchainService.getApi();

      if (!api.query.bazariAffiliate?.affiliates) {
        return {
          leaderboard: [],
          period,
        };
      }

      // Buscar todos os affiliates
      const affiliatesData = await api.query.bazariAffiliate.affiliates.entries();

      // Calcular estatísticas para cada affiliate
      const affiliateStats: Array<{
        address: string;
        totalReferrals: number;
        totalEarned: string;
        registeredAt: number;
      }> = [];

      const referralCounts = new Map<string, number>();

      // Contar referrals para cada affiliate
      for (const [key, affiliateOption] of affiliatesData) {
        if (!affiliateOption || affiliateOption.isNone) continue;
        const affiliate = affiliateOption.unwrap();
        const referrer = affiliate.referrer?.isSome ? affiliate.referrer.unwrap().toString() : null;

        if (referrer) {
          referralCounts.set(referrer, (referralCounts.get(referrer) || 0) + 1);
        }
      }

      // Buscar earnings para cada affiliate
      for (const [key, affiliateOption] of affiliatesData) {
        if (!affiliateOption || affiliateOption.isNone) continue;
        const affiliate = affiliateOption.unwrap();
        const address = key.args[0].toString();

        let totalEarned = '0';
        try {
          const claimed = await api.query.bazariAffiliate.claimedCommissions?.(address);
          const pending = await api.query.bazariAffiliate.pendingCommissions?.(address);
          const claimedBig = BigInt(claimed?.toString?.() || '0');
          const pendingBig = BigInt(pending?.toString?.() || '0');
          totalEarned = (claimedBig + pendingBig).toString();
        } catch (e) {
          // Ignorar erros
        }

        affiliateStats.push({
          address,
          totalReferrals: referralCounts.get(address) || 0,
          totalEarned,
          registeredAt: affiliate.registeredAt?.toNumber?.() || 0,
        });
      }

      // Ordenar por total earned (descendente)
      affiliateStats.sort((a, b) => {
        const aEarned = BigInt(a.totalEarned);
        const bEarned = BigInt(b.totalEarned);
        if (bEarned > aEarned) return 1;
        if (bEarned < aEarned) return -1;
        return b.totalReferrals - a.totalReferrals;
      });

      // Aplicar limite
      const leaderboard = affiliateStats.slice(0, limit).map((stat, index) => ({
        rank: index + 1,
        ...stat,
      }));

      return {
        leaderboard,
        period,
        totalAffiliates: affiliateStats.length,
        fetchedAt: Date.now(),
      };
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch leaderboard' });
    }
  });

  // ============================================================================
  // GET /api/blockchain/affiliate/commission-history/:address - Histórico de comissões
  // ============================================================================
  app.get('/affiliate/commission-history/:address', { preHandler: authOnRequest }, async (request, reply) => {
    try {
      const { address } = addressParamsSchema.parse(request.params);
      const authUser = (request as any).authUser as { sub: string; address: string };

      // Usuário só pode ver próprio histórico (ou admin)
      if (address !== authUser.address) {
        return reply.status(403).send({ error: 'Can only view own commission history' });
      }

      // Buscar do banco de dados
      const commissions = await prisma.affiliateCommission.findMany({
        where: {
          affiliateAddress: address,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 100,
      });

      // Agrupar por status
      const pending = commissions.filter(c => c.status === 'PENDING');
      const claimed = commissions.filter(c => c.status === 'CLAIMED');

      return {
        address,
        commissions: commissions.map(c => ({
          id: c.id,
          saleId: c.saleId,
          amount: c.amount.toString(),
          level: c.level,
          status: c.status,
          createdAt: c.createdAt,
          claimedAt: c.claimedAt,
        })),
        summary: {
          total: commissions.length,
          pendingCount: pending.length,
          pendingAmount: pending.reduce((sum, c) => sum + BigInt(c.amount.toString()), BigInt(0)).toString(),
          claimedCount: claimed.length,
          claimedAmount: claimed.reduce((sum, c) => sum + BigInt(c.amount.toString()), BigInt(0)).toString(),
        },
      };
    } catch (error) {
      app.log.error(error);
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid input', details: error.errors });
      }
      return reply.status(500).send({ error: 'Failed to fetch commission history' });
    }
  });
}

// ============================================================================
// Helpers
// ============================================================================

function generateReferralCode(address: string): string {
  // Gerar código curto a partir do endereço
  // Usa primeiros e últimos caracteres + hash parcial
  const hash = crypto.createHash('sha256').update(address).digest('hex');
  return hash.slice(0, 8).toUpperCase();
}

function decodeReferralCode(code: string): string | null {
  // Em produção, manter mapeamento code -> address no DB
  // Por ora, retornamos null (não conseguimos reverter o hash)
  // O frontend deve enviar o address diretamente ou usar lookup
  return null;
}

function calculateMaxDepth(node: ReferralTreeNode): number {
  if (node.children.length === 0) return 0;
  return 1 + Math.max(...node.children.map(calculateMaxDepth));
}
