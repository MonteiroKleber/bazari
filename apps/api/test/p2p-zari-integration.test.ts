/**
 * FASE 5: Testes de Integração P2P ZARI
 *
 * Testa fluxo completo de ofertas e ordens ZARI
 */

import { PrismaClient } from '@prisma/client';
import { PhaseControlService } from '../src/services/p2p/phase-control.service';
import { EscrowService } from '../src/services/p2p/escrow.service';
import { BlockchainService } from '../src/services/blockchain/blockchain.service';

const prisma = new PrismaClient();

describe('P2P ZARI Integration Tests', () => {
  let phaseControl: PhaseControlService;
  let escrowService: EscrowService;
  let blockchain: BlockchainService;

  beforeAll(async () => {
    phaseControl = new PhaseControlService(prisma);
    escrowService = new EscrowService(prisma);
    blockchain = BlockchainService.getInstance();
    await blockchain.connect();
  });

  afterAll(async () => {
    await blockchain.disconnect();
    await prisma.$disconnect();
  });

  describe('Phase Control', () => {
    test('deve retornar fase ativa', async () => {
      const phase = await phaseControl.getActivePhase();

      expect(phase).toBeDefined();
      expect(phase?.phase).toMatch(/^(2A|2B|3)$/);
      expect(phase?.priceBZR).toBeGreaterThan(0n);
      expect(phase?.supplyLimit).toBeGreaterThan(0n);
      expect(['2A', '2B', '3', null]).toContain(phase?.nextPhase);
    });

    test('deve calcular progresso corretamente', async () => {
      const phase = await phaseControl.getActivePhase();

      expect(phase?.progressPercent).toBeGreaterThanOrEqual(0);
      expect(phase?.progressPercent).toBeLessThanOrEqual(100);
    });

    test('deve validar supply disponível', async () => {
      const testAmount = BigInt(100) * BigInt(10 ** 12); // 100 ZARI

      const phase = await phaseControl.getActivePhase();
      if (phase && phase.isActive && phase.supplyRemaining > testAmount) {
        const canCreate = await phaseControl.canCreateZARIOffer(testAmount);
        expect(canCreate).toBe(true);
      }
    });

    test('deve rejeitar amount acima do supply', async () => {
      const phase = await phaseControl.getActivePhase();
      if (phase) {
        const excessAmount = phase.supplyLimit + BigInt(1000) * BigInt(10 ** 12);

        await expect(
          phaseControl.canCreateZARIOffer(excessAmount)
        ).rejects.toThrow();
      }
    });
  });

  describe('Blockchain Service', () => {
    test('deve conectar ao blockchain', async () => {
      const api = await blockchain.getApi();
      expect(api).toBeDefined();
      expect(api.isConnected).toBe(true);
    });

    test('deve retornar block number', async () => {
      const blockNumber = await blockchain.getCurrentBlock();
      expect(blockNumber).toBeGreaterThan(0n);
    });

    test('deve query balance BZR do escrow', async () => {
      const escrowAccount = blockchain.getEscrowAccount();
      const balance = await blockchain.getBalanceBZR(escrowAccount.address);

      expect(balance).toBeGreaterThanOrEqual(0n);
    });

    test('deve query balance ZARI do escrow', async () => {
      const escrowAccount = blockchain.getEscrowAccount();
      const balance = await blockchain.getBalanceZARI(escrowAccount.address);

      expect(balance).toBeGreaterThanOrEqual(0n);
    });
  });

  describe('Escrow Service', () => {
    test('deve instanciar EscrowService', () => {
      expect(escrowService).toBeDefined();
    });

    test('deve query balance do escrow', async () => {
      const balanceBZR = await escrowService.getEscrowBalance('BZR');
      const balanceZARI = await escrowService.getEscrowBalance('ZARI');

      expect(balanceBZR).toBeGreaterThanOrEqual(0n);
      expect(balanceZARI).toBeGreaterThanOrEqual(0n);
    });

    test('deve detectar asset type inválido', async () => {
      await expect(
        escrowService.getEscrowBalance('INVALID' as any)
      ).rejects.toThrow('Unsupported asset type');
    });
  });

  describe('Database Queries', () => {
    test('deve buscar configuração de fases ZARI', async () => {
      const phases = await prisma.zARIPhaseConfig.findMany();

      expect(phases).toHaveLength(3);
      expect(phases.map(p => p.phase)).toEqual(['2A', '2B', '3']);
      expect(phases.filter(p => p.active)).toHaveLength(1);
    });

    test('deve calcular preços corretamente', async () => {
      const phases = await prisma.zARIPhaseConfig.findMany({
        orderBy: { phase: 'asc' },
      });

      const [phase2A, phase2B, phase3] = phases;

      expect(Number(phase2A.priceBZR)).toBe(0.25);
      expect(Number(phase2B.priceBZR)).toBe(0.35);
      expect(Number(phase3.priceBZR)).toBe(0.50);
    });

    test('deve ter supply limits corretos', async () => {
      const phases = await prisma.zARIPhaseConfig.findMany();

      for (const phase of phases) {
        // Cada fase: 2.1M ZARI = 2_100_000 * 10^12
        expect(phase.supplyLimit).toBe(BigInt(2_100_000) * BigInt(10 ** 12));
      }
    });
  });

  describe('Offer Validation', () => {
    test('deve validar estrutura de oferta ZARI', () => {
      const mockOffer = {
        assetType: 'ZARI',
        assetId: '1',
        phase: '2A',
        phasePrice: '0.25',
        minBRL: '50',
        maxBRL: '500',
      };

      expect(mockOffer.assetType).toBe('ZARI');
      expect(mockOffer.assetId).toBe('1');
      expect(['2A', '2B', '3']).toContain(mockOffer.phase);
    });
  });

  describe('Order Calculation', () => {
    test('deve calcular ZARI a partir de BRL', () => {
      const priceBRLPerZARI = 0.25; // Fase 2A
      const amountBRL = 100;

      const calculatedZARI = amountBRL / priceBRLPerZARI;

      expect(calculatedZARI).toBe(400);
    });

    test('deve calcular BRL a partir de ZARI', () => {
      const priceBRLPerZARI = 0.25;
      const amountZARI = 500;

      const calculatedBRL = amountZARI * priceBRLPerZARI;

      expect(calculatedBRL).toBe(125);
    });

    test('deve converter para planck corretamente', () => {
      const amountZARI = 100;
      const amountPlanck = BigInt(Math.floor(amountZARI * 1e12));

      expect(amountPlanck).toBe(BigInt(100) * BigInt(10 ** 12));
    });
  });
});

describe('P2P ZARI Error Handling', () => {
  let phaseControl: PhaseControlService;

  beforeAll(() => {
    phaseControl = new PhaseControlService(prisma);
  });

  test('deve rejeitar se não há fase ativa', async () => {
    // Mock: desativar todas as fases
    await prisma.zARIPhaseConfig.updateMany({
      data: { active: false },
    });

    const phase = await phaseControl.getActivePhase();
    expect(phase).toBeNull();

    // Restaurar fase ativa
    await prisma.zARIPhaseConfig.update({
      where: { phase: '2A' },
      data: { active: true },
    });
  });

  test('deve calcular supply sold corretamente', async () => {
    const phase = await phaseControl.getActivePhase();

    if (phase) {
      const totalForSale = phase.supplySold + phase.supplyRemaining;
      expect(totalForSale).toBeLessThanOrEqual(phase.supplyLimit);
    }
  });
});

// Helpers
function mockOrder(assetType: 'BZR' | 'ZARI' = 'ZARI') {
  return {
    id: 'test_order',
    assetType,
    assetId: assetType === 'ZARI' ? '1' : null,
    amountAsset: '100.000000000000',
    side: 'SELL_BZR' as any,
    status: 'AWAITING_ESCROW' as any,
    makerId: 'maker_id',
    takerId: 'taker_id',
    phase: assetType === 'ZARI' ? '2A' : null,
  };
}

console.log('✅ Testes P2P ZARI carregados');
console.log('Execute com: npm test ou jest');
