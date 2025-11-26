// @ts-nocheck
// FASE 9: Vesting System - Backend API
// path: apps/api/src/routes/vesting.ts

import { FastifyInstance } from 'fastify';
import { getSubstrateApi } from '../lib/substrate.js';

// ==================== TYPES ====================

export interface VestingInfo {
  locked: string;
  perBlock: string;
  startingBlock: number;
}

export interface VestingSchedule {
  account: string;
  schedules: VestingInfo[];
  totalLocked: string;
  totalVested: string;
  totalUnvested: string;
  vestedPercentage: number;
  currentBlock: number;
}

export interface VestingStats {
  totalAllocated: string;
  totalVested: string;
  totalUnvested: string;
  vestedPercentage: number;
  currentBlock: number;
  categories: {
    founders: CategoryStats;
    team: CategoryStats;
    partners: CategoryStats;
    marketing: CategoryStats;
  };
}

export interface CategoryStats {
  account: string;
  totalLocked: string;
  vested: string;
  unvested: string;
  vestedPercentage: number;
  startBlock: number;
  duration: number;
  cliff: number;
}

// Contas de vesting (seeds usados no genesis)
const VESTING_ACCOUNTS = {
  founders: '0x714a0df32c1ea7c5d9836ded01eb47e66e4116f0bded907b454a8b9fd72ecee5',
  team: '0x64dabd5108446dfaeaf947d5eab1635070dae096c735ea790be97303dde602ca',
  partners: '0x0a11a8290d0acfe65c8ae624f725e85c2e9b7cef820f591220c17b8432a4905d',
  marketing: '0x76bcbbfb178cef58a8ebe02149946ab9571acf04cf020e7c70ef4a495d4ad86e',
};

// Constantes do blockchain (devem corresponder ao genesis)
const BZR_DECIMALS = 12;
const BZR_UNIT = BigInt(10 ** BZR_DECIMALS);

// ==================== HELPER FUNCTIONS ====================

/**
 * Calcula quanto foi vestido até um determinado bloco
 */
function calculateVested(schedule: VestingInfo, currentBlock: number): bigint {
  const { locked, perBlock, startingBlock } = schedule;

  if (currentBlock < startingBlock) {
    // Ainda no período de cliff
    return BigInt(0);
  }

  const blocksPassed = currentBlock - startingBlock;
  const vested = BigInt(perBlock) * BigInt(blocksPassed);
  const totalLocked = BigInt(locked);

  // Não pode ter vestido mais do que o total locked
  return vested > totalLocked ? totalLocked : vested;
}

/**
 * Calcula unvested (locked - vested)
 */
function calculateUnvested(schedule: VestingInfo, currentBlock: number): bigint {
  const vested = calculateVested(schedule, currentBlock);
  const totalLocked = BigInt(schedule.locked);
  return totalLocked - vested;
}

/**
 * Formata balance para string legível (com decimais)
 */
function formatBalance(balance: bigint): string {
  const integerPart = balance / BZR_UNIT;
  const fractionalPart = balance % BZR_UNIT;

  if (fractionalPart === BigInt(0)) {
    return integerPart.toString();
  }

  const fractionalStr = fractionalPart.toString().padStart(BZR_DECIMALS, '0');
  return `${integerPart}.${fractionalStr}`.replace(/\.?0+$/, '');
}

/**
 * Calcula percentagem de vested
 */
function calculatePercentage(vested: bigint, total: bigint): number {
  if (total === BigInt(0)) return 0;
  return Number((vested * BigInt(10000)) / total) / 100;
}

// ==================== ROUTES ====================

export async function vestingRoutes(app: FastifyInstance) {
  /**
   * GET /vesting/accounts
   * Lista todas as contas de vesting conhecidas
   */
  app.get('/vesting/accounts', async (_request, reply) => {
    try {
      return reply.send({
        success: true,
        data: {
          founders: VESTING_ACCOUNTS.founders,
          team: VESTING_ACCOUNTS.team,
          partners: VESTING_ACCOUNTS.partners,
          marketing: VESTING_ACCOUNTS.marketing,
        },
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return reply.status(500).send({ success: false, error: errorMsg });
    }
  });

  /**
   * GET /vesting/:account
   * Obtém informações de vesting para uma conta específica
   */
  app.get<{ Params: { account: string } }>(
    '/vesting/:account',
    async (request, reply) => {
      try {
        const api = await getSubstrateApi();
        const { account } = request.params;

        // Obter schedules de vesting
        const vestingOption = await api.query.vesting.vesting(account);

        if (vestingOption.isNone) {
          return reply.send({
            success: true,
            data: {
              account,
              schedules: [],
              totalLocked: '0',
              totalVested: '0',
              totalUnvested: '0',
              vestedPercentage: 0,
              currentBlock: 0,
            } as VestingSchedule,
          });
        }

        const schedules = vestingOption.unwrap();
        const currentBlockHeader = await api.rpc.chain.getHeader();
        const currentBlock = currentBlockHeader.number.toNumber();

        // Processar cada schedule
        const processedSchedules: VestingInfo[] = [];
        let totalLocked = BigInt(0);
        let totalVested = BigInt(0);

        schedules.forEach((schedule: any) => {
          const locked = schedule.locked.toString();
          const perBlock = schedule.perBlock.toString();
          const startingBlock = schedule.startingBlock.toNumber();

          const scheduleInfo: VestingInfo = {
            locked,
            perBlock,
            startingBlock,
          };

          processedSchedules.push(scheduleInfo);

          totalLocked += BigInt(locked);
          totalVested += calculateVested(scheduleInfo, currentBlock);
        });

        const totalUnvested = totalLocked - totalVested;
        const vestedPercentage = calculatePercentage(totalVested, totalLocked);

        const result: VestingSchedule = {
          account,
          schedules: processedSchedules,
          totalLocked: formatBalance(totalLocked),
          totalVested: formatBalance(totalVested),
          totalUnvested: formatBalance(totalUnvested),
          vestedPercentage,
          currentBlock,
        };

        return reply.send({ success: true, data: result });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return reply.status(500).send({ success: false, error: errorMsg });
      }
    }
  );

  /**
   * GET /vesting/stats
   * Obtém estatísticas gerais de vesting de todas as categorias
   */
  app.get('/vesting/stats', async (_request, reply) => {
    try {
      const api = await getSubstrateApi();
      const currentBlockHeader = await api.rpc.chain.getHeader();
      const currentBlock = currentBlockHeader.number.toNumber();

      // Buscar vesting info de todas as categorias
      const foundersVesting = await api.query.vesting.vesting(VESTING_ACCOUNTS.founders);
      const teamVesting = await api.query.vesting.vesting(VESTING_ACCOUNTS.team);
      const partnersVesting = await api.query.vesting.vesting(VESTING_ACCOUNTS.partners);
      const marketingVesting = await api.query.vesting.vesting(VESTING_ACCOUNTS.marketing);

      // Helper para processar categoria
      const processCategory = (
        vestingOption: any,
        account: string,
        categoryName: string
      ): CategoryStats => {
        if (vestingOption.isNone) {
          return {
            account,
            totalLocked: '0',
            vested: '0',
            unvested: '0',
            vestedPercentage: 0,
            startBlock: 0,
            duration: 0,
            cliff: 0,
          };
        }

        const schedules = vestingOption.unwrap();
        const schedule = schedules[0]; // Assumindo 1 schedule por conta

        const locked = BigInt(schedule.locked.toString());
        const perBlock = BigInt(schedule.perBlock.toString());
        const startingBlock = schedule.startingBlock.toNumber();

        const scheduleInfo: VestingInfo = {
          locked: schedule.locked.toString(),
          perBlock: schedule.perBlock.toString(),
          startingBlock,
        };

        const vested = calculateVested(scheduleInfo, currentBlock);
        const unvested = locked - vested;
        const vestedPercentage = calculatePercentage(vested, locked);

        // Calcular duração (locked / perBlock)
        const duration = perBlock > BigInt(0) ? Number(locked / perBlock) : 0;

        return {
          account,
          totalLocked: formatBalance(locked),
          vested: formatBalance(vested),
          unvested: formatBalance(unvested),
          vestedPercentage,
          startBlock: startingBlock,
          duration,
          cliff: startingBlock, // No nosso caso, cliff = startBlock
        };
      };

      const founders = processCategory(foundersVesting, VESTING_ACCOUNTS.founders, 'founders');
      const team = processCategory(teamVesting, VESTING_ACCOUNTS.team, 'team');
      const partners = processCategory(partnersVesting, VESTING_ACCOUNTS.partners, 'partners');
      const marketing = processCategory(marketingVesting, VESTING_ACCOUNTS.marketing, 'marketing');

      // Calcular totais
      const totalAllocated =
        BigInt(founders.totalLocked.replace(/\./g, '')) +
        BigInt(team.totalLocked.replace(/\./g, '')) +
        BigInt(partners.totalLocked.replace(/\./g, '')) +
        BigInt(marketing.totalLocked.replace(/\./g, ''));

      const totalVested =
        BigInt(founders.vested.replace(/\./g, '')) +
        BigInt(team.vested.replace(/\./g, '')) +
        BigInt(partners.vested.replace(/\./g, '')) +
        BigInt(marketing.vested.replace(/\./g, ''));

      const totalUnvested = totalAllocated - totalVested;
      const vestedPercentage = calculatePercentage(totalVested, totalAllocated);

      const stats: VestingStats = {
        totalAllocated: formatBalance(totalAllocated),
        totalVested: formatBalance(totalVested),
        totalUnvested: formatBalance(totalUnvested),
        vestedPercentage,
        currentBlock,
        categories: {
          founders,
          team,
          partners,
          marketing,
        },
      };

      return reply.send({ success: true, data: stats });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return reply.status(500).send({ success: false, error: errorMsg });
    }
  });

  /**
   * GET /vesting/schedule/:account
   * Obtém o cronograma de vesting projetado para uma conta
   * Query params:
   * - interval: 'daily' | 'weekly' | 'monthly' (default: 'monthly')
   * - points: número de pontos no gráfico (default: 12)
   */
  app.get<{
    Params: { account: string };
    Querystring: { interval?: string; points?: string };
  }>(
    '/vesting/schedule/:account',
    async (request, reply) => {
      try {
        const api = await getSubstrateApi();
        const { account } = request.params;
        const interval = request.query.interval || 'monthly';
        const points = parseInt(request.query.points || '12');

        // Obter schedules de vesting
        const vestingOption = await api.query.vesting.vesting(account);

        if (vestingOption.isNone) {
          return reply.send({
            success: true,
            data: {
              account,
              schedule: [],
            },
          });
        }

        const schedules = vestingOption.unwrap();
        const currentBlockHeader = await api.rpc.chain.getHeader();
        const currentBlock = currentBlockHeader.number.toNumber();
        const schedule = schedules[0]; // Assumindo 1 schedule

        const locked = BigInt(schedule.locked.toString());
        const perBlock = BigInt(schedule.perBlock.toString());
        const startingBlock = schedule.startingBlock.toNumber();

        // Calcular duração total
        const totalDuration = perBlock > BigInt(0) ? Number(locked / perBlock) : 0;
        const endBlock = startingBlock + totalDuration;

        // Calcular intervalo de blocos baseado no tipo
        const BLOCKS_PER_DAY = 14400; // 6 segundos por bloco
        let blockInterval: number;

        switch (interval) {
          case 'daily':
            blockInterval = BLOCKS_PER_DAY;
            break;
          case 'weekly':
            blockInterval = BLOCKS_PER_DAY * 7;
            break;
          case 'monthly':
          default:
            blockInterval = BLOCKS_PER_DAY * 30;
            break;
        }

        // Gerar pontos do cronograma
        const schedulePoints = [];
        const totalPoints = Math.min(points, Math.ceil(totalDuration / blockInterval));

        for (let i = 0; i <= totalPoints; i++) {
          const block = startingBlock + (i * blockInterval);

          if (block > endBlock) break;

          const vested = calculateVested(
            {
              locked: schedule.locked.toString(),
              perBlock: schedule.perBlock.toString(),
              startingBlock,
            },
            block
          );

          schedulePoints.push({
            block,
            vested: formatBalance(vested),
            unvested: formatBalance(locked - vested),
            percentage: calculatePercentage(vested, locked),
            isPast: block <= currentBlock,
          });
        }

        return reply.send({
          success: true,
          data: {
            account,
            currentBlock,
            startingBlock,
            endBlock,
            totalDuration,
            schedule: schedulePoints,
          },
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return reply.status(500).send({ success: false, error: errorMsg });
      }
    }
  );
}
// @ts-nocheck
