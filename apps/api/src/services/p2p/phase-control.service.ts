// FASE 5: PhaseControlService - Gerencia fases de venda ZARI
import { PrismaClient } from '@prisma/client';
import { ApiPromise, WsProvider } from '@polkadot/api';

export interface PhaseInfo {
  phase: string;          // '2A', '2B', '3'
  priceBZR: bigint;       // 0.25, 0.35, 0.50 (em planck)
  supplyLimit: bigint;    // 2.1M ZARI (em planck)
  supplySold: bigint;     // Já vendido (calculado)
  supplyRemaining: bigint;
  progressPercent: number; // 0-100
  isActive: boolean;
  nextPhase: string | null;
}

export class PhaseControlService {
  private prisma: PrismaClient;
  private apiPromise: ApiPromise | null = null;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Retorna informações da fase ZARI ativa
   */
  async getActivePhase(): Promise<PhaseInfo | null> {
    const config = await this.prisma.zARIPhaseConfig.findFirst({
      where: { active: true },
    });

    if (!config) {
      return null;
    }

    try {
      // Query blockchain para supply circulante de ZARI
      const api = await this.getBlockchainApi();
      const assetDetails: any = await api.query.assets.asset(1); // ZARI = asset 1

      if (assetDetails.isNone) {
        throw new Error('ZARI asset not found on-chain');
      }

      const details = assetDetails.unwrap();
      const totalSupply = BigInt(details.supply.toString());
      const daoReserve = BigInt(8_400_000) * BigInt(10 ** 12); // 40% = 8.4M

      // Supply vendido = total - reserva DAO
      const supplySold = totalSupply - daoReserve;
      const supplyRemaining = config.supplyLimit - supplySold;
      const progressPercent = supplyRemaining > 0n
        ? Number((supplySold * BigInt(100)) / config.supplyLimit)
        : 100;

      // Convert Decimal price to planck (multiply by 10^12)
      const priceFloat = parseFloat(config.priceBZR.toString());
      const pricePlanck = BigInt(Math.floor(priceFloat * 1e12));

      return {
        phase: config.phase,
        priceBZR: pricePlanck,
        supplyLimit: config.supplyLimit,
        supplySold,
        supplyRemaining: supplyRemaining > 0n ? supplyRemaining : 0n,
        progressPercent,
        isActive: supplyRemaining > 0n,
        nextPhase: this.getNextPhase(config.phase),
      };
    } catch (error) {
      console.error('[PhaseControl] Error querying blockchain:', error);

      // Fallback: retornar info do DB sem supply on-chain
      const priceFloat = parseFloat(config.priceBZR.toString());
      const pricePlanck = BigInt(Math.floor(priceFloat * 1e12));

      return {
        phase: config.phase,
        priceBZR: pricePlanck,
        supplyLimit: config.supplyLimit,
        supplySold: 0n,
        supplyRemaining: config.supplyLimit,
        progressPercent: 0,
        isActive: true,
        nextPhase: this.getNextPhase(config.phase),
      };
    }
  }

  /**
   * Valida se pode criar oferta ZARI na fase atual
   */
  async canCreateZARIOffer(amountZARI: bigint): Promise<boolean> {
    const phase = await this.getActivePhase();

    if (!phase) {
      throw new Error('No active ZARI phase');
    }

    if (!phase.isActive) {
      throw new Error(`Phase ${phase.phase} is sold out`);
    }

    if (amountZARI > phase.supplyRemaining) {
      throw new Error(
        `Insufficient supply in phase ${phase.phase}. Remaining: ${phase.supplyRemaining} ZARI`
      );
    }

    return true;
  }

  /**
   * Transição para próxima fase (chamado manualmente ou automaticamente)
   */
  async transitionToNextPhase(): Promise<void> {
    const current = await this.prisma.zARIPhaseConfig.findFirst({
      where: { active: true },
    });

    if (!current) {
      throw new Error('No active phase to transition from');
    }

    const nextPhaseName = this.getNextPhase(current.phase);
    if (!nextPhaseName) {
      throw new Error('No next phase available');
    }

    const currentBlock = await this.getCurrentBlock();

    // Atualizar: desativar atual, ativar próxima
    await this.prisma.$transaction([
      this.prisma.zARIPhaseConfig.update({
        where: { id: current.id },
        data: { active: false, endBlock: currentBlock },
      }),
      this.prisma.zARIPhaseConfig.update({
        where: { phase: nextPhaseName },
        data: { active: true, startBlock: currentBlock },
      }),
    ]);

    console.log(`[PhaseControl] Transitioned from ${current.phase} to ${nextPhaseName} at block ${currentBlock}`);
  }

  /**
   * Retorna nome da próxima fase
   */
  private getNextPhase(current: string): string | null {
    const phases = ['2A', '2B', '3'];
    const index = phases.indexOf(current);
    return index >= 0 && index < phases.length - 1 ? phases[index + 1] : null;
  }

  /**
   * Retorna block number atual da blockchain
   */
  private async getCurrentBlock(): Promise<bigint> {
    try {
      const api = await this.getBlockchainApi();
      const header = await api.rpc.chain.getHeader();
      return BigInt(header.number.toString());
    } catch (error) {
      console.error('[PhaseControl] Error getting current block:', error);
      return 0n;
    }
  }

  /**
   * Obtém conexão com blockchain API (singleton)
   */
  private async getBlockchainApi(): Promise<ApiPromise> {
    if (this.apiPromise && this.apiPromise.isConnected) {
      return this.apiPromise;
    }

    const wsEndpoint = process.env.BLOCKCHAIN_WS_ENDPOINT || 'ws://127.0.0.1:9944';
    const provider = new WsProvider(wsEndpoint);

    this.apiPromise = await ApiPromise.create({ provider });

    console.log('[PhaseControl] Connected to blockchain at', wsEndpoint);

    return this.apiPromise;
  }

  /**
   * Desconecta da blockchain (cleanup)
   */
  async disconnect(): Promise<void> {
    if (this.apiPromise) {
      await this.apiPromise.disconnect();
      this.apiPromise = null;
    }
  }
}
