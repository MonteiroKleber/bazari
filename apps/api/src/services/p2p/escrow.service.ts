// @ts-nocheck
// FASE 5: EscrowService - Gerencia escrow multi-asset (BZR e ZARI) no blockchain
import { PrismaClient, P2PAssetType, P2POrder } from '@prisma/client';
import { BlockchainService } from '../blockchain/blockchain.service.js';

export interface EscrowLockResult {
  txHash: string;
  blockNumber: bigint;
  amount: bigint;
  assetType: P2PAssetType;
}

export interface EscrowReleaseResult {
  txHash: string;
  blockNumber: bigint;
  amount: bigint;
  assetType: P2PAssetType;
  recipient: string;
}

/**
 * Serviço para gerenciar escrow de BZR e ZARI no blockchain
 *
 * Fluxo P2P:
 * 1. Maker cria oferta
 * 2. Taker aceita → cria order
 * 3. Maker LOCK assets no escrow (este serviço)
 * 4. Taker faz PIX e envia comprovante
 * 5. Maker confirma PIX → RELEASE assets (este serviço)
 */
export class EscrowService {
  private blockchain: BlockchainService;
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.blockchain = BlockchainService.getInstance();
  }

  /**
   * LOCK: Travar assets no escrow on-chain
   *
   * @param order - Ordem P2P (contém assetType, assetId, amountAsset)
   * @param fromAddress - Endereço do maker (quem está vendendo)
   * @returns Resultado com txHash e blockNumber
   */
  async lockFunds(order: P2POrder, fromAddress: string): Promise<EscrowLockResult> {
    const api = await this.blockchain.getApi();
    const escrowAccount = this.blockchain.getEscrowAccount();
    const escrowAddress = escrowAccount.address;

    // Convert amount to planck
    const amountPlanck = BigInt(Math.floor(Number(order.amountAsset) * 1e12));

    console.log(`[Escrow] Locking ${order.assetType} for order ${order.id}`);
    console.log(`[Escrow] From: ${fromAddress}`);
    console.log(`[Escrow] To: ${escrowAddress}`);
    console.log(`[Escrow] Amount: ${amountPlanck} planck`);

    let tx;

    if (order.assetType === 'BZR') {
      // BZR: usar pallet-balances
      tx = api.tx.balances.transferKeepAlive(escrowAddress, amountPlanck);
    } else if (order.assetType === 'ZARI') {
      // ZARI: usar pallet-assets
      const assetId = parseInt(order.assetId || '1');
      tx = api.tx.assets.transferKeepAlive(assetId, escrowAddress, amountPlanck);
    } else {
      throw new Error(`Unsupported asset type: ${order.assetType}`);
    }

    // NOTE: Em produção, o maker assinaria do frontend
    // Aqui estamos simulando que o escrow account tem os fundos
    // e transfere PARA si mesmo (lock)
    //
    // Na implementação real, você precisaria:
    // 1. Gerar unsigned tx no backend
    // 2. Enviar para frontend assinar
    // 3. Frontend retorna signed tx
    // 4. Backend submete para chain

    try {
      // Por agora, simular que é o escrow account fazendo o lock
      // (assumindo que os fundos já estão no escrow)
      console.log('[Escrow] NOTA: Em produção, maker assinaria esta TX no frontend');

      // Criar TX hash simulado (em produção viria do blockchain)
      const mockTxHash = `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`;
      const blockNumber = await this.blockchain.getCurrentBlock();

      // Atualizar order no DB
      await this.prisma.p2POrder.update({
        where: { id: order.id },
        data: {
          escrowTxHash: mockTxHash,
          escrowAt: new Date(),
          status: 'AWAITING_FIAT_PAYMENT',
        },
      });

      return {
        txHash: mockTxHash,
        blockNumber,
        amount: amountPlanck,
        assetType: order.assetType as P2PAssetType,
      };
    } catch (error: any) {
      console.error('[Escrow] Lock failed:', error);
      throw new Error(`Failed to lock ${order.assetType}: ${error.message}`);
    }
  }

  /**
   * RELEASE: Liberar assets do escrow para o comprador
   *
   * @param order - Ordem P2P
   * @param toAddress - Endereço do taker (quem está comprando)
   * @returns Resultado com txHash e blockNumber
   */
  async releaseFunds(order: P2POrder, toAddress: string): Promise<EscrowReleaseResult> {
    if (!order.escrowTxHash) {
      throw new Error('Order has no escrow transaction. Cannot release.');
    }

    const api = await this.blockchain.getApi();
    const escrowAccount = this.blockchain.getEscrowAccount();

    // Convert amount to planck
    const amountPlanck = BigInt(Math.floor(Number(order.amountAsset) * 1e12));

    console.log(`[Escrow] Releasing ${order.assetType} for order ${order.id}`);
    console.log(`[Escrow] From: ${escrowAccount.address}`);
    console.log(`[Escrow] To: ${toAddress}`);
    console.log(`[Escrow] Amount: ${amountPlanck} planck`);

    let tx;

    if (order.assetType === 'BZR') {
      tx = api.tx.balances.transferKeepAlive(toAddress, amountPlanck);
    } else if (order.assetType === 'ZARI') {
      const assetId = parseInt(order.assetId || '1');
      tx = api.tx.assets.transferKeepAlive(assetId, toAddress, amountPlanck);
    } else {
      throw new Error(`Unsupported asset type: ${order.assetType}`);
    }

    try {
      // Escrow account assina e envia
      const result = await this.blockchain.signAndSend(tx, escrowAccount);

      // Atualizar order no DB
      await this.prisma.p2POrder.update({
        where: { id: order.id },
        data: {
          releasedTxHash: result.txHash,
          releasedAt: new Date(),
          status: 'RELEASED',
        },
      });

      console.log(`[Escrow] Released successfully! TX: ${result.txHash}`);

      return {
        txHash: result.txHash,
        blockNumber: result.blockNumber,
        amount: amountPlanck,
        assetType: order.assetType as P2PAssetType,
        recipient: toAddress,
      };
    } catch (error: any) {
      console.error('[Escrow] Release failed:', error);
      throw new Error(`Failed to release ${order.assetType}: ${error.message}`);
    }
  }

  /**
   * Verificar se TX de escrow foi confirmada on-chain
   */
  async verifyEscrowTransaction(txHash: string): Promise<boolean> {
    return this.blockchain.verifyTransaction(txHash);
  }

  /**
   * Verificar balance do escrow account
   */
  async getEscrowBalance(assetType: P2PAssetType): Promise<bigint> {
    const escrowAccount = this.blockchain.getEscrowAccount();

    if (assetType === 'BZR') {
      return this.blockchain.getBalanceBZR(escrowAccount.address);
    } else if (assetType === 'ZARI') {
      return this.blockchain.getBalanceZARI(escrowAccount.address);
    } else {
      throw new Error(`Unsupported asset type: ${assetType}`);
    }
  }

  /**
   * Cleanup: Desconectar do blockchain
   */
  async disconnect(): Promise<void> {
    await this.blockchain.disconnect();
  }
}
// @ts-nocheck
