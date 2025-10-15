/**
 * Commission Service - VERSÃO MOCK
 *
 * Esta é uma versão MOCK que simula o comportamento da blockchain no PostgreSQL.
 * Será substituída por integração real com BazariChain posteriormente.
 *
 * Referência: ~/bazari/docs/specs/BAZCHAT_BLOCKCHAIN_REQUIREMENTS.md
 */

import { prisma } from '../../lib/prisma';
import { ipfsService } from './ipfs';
import crypto from 'crypto';

interface SaleData {
  proposalId: string;
  storeId: number;
  buyer: string;
  seller: string;
  promoter?: string;
  amount: string; // BZR amount as string
  commissionPercent: number;
}

interface SaleResult {
  saleId: string;
  amount: string;
  commissionAmount: string;
  bazariFee: string;
  sellerAmount: string;
  status: 'pending' | 'split' | 'failed';
  txHash: string; // Mock transaction hash
  receiptNftCid: string;
}

interface ProposalItem {
  sku: string;
  name: string;
  qty: number;
  price: string;
}

interface StoreGroup {
  storeId: number;
  storeName: string;
  items: ProposalItem[];
  subtotal: number;
  total: number;
  commissionPercent: number;
}

interface GroupSaleResult extends SaleResult {
  storeId: number;
  storeName: string;
}

class CommissionService {
  // Taxa padrão da plataforma (1% = 100 basis points)
  private readonly BAZARI_FEE_BPS = 100;

  // Cache de store owners (cache de 5 minutos)
  private storeOwnerCache = new Map<number, { sellerId: string; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutos

  /**
   * Processa múltiplas vendas (multi-loja) em paralelo
   */
  async settleSaleGroup(data: {
    proposalId: string;
    storeGroups: StoreGroup[];
    buyer: string;
    promoter?: string;
  }): Promise<GroupSaleResult[]> {
    const { proposalId, storeGroups, buyer, promoter } = data;

    // Validar dados
    if (!storeGroups || storeGroups.length === 0) {
      throw new Error('No store groups provided');
    }

    // Buscar todos os donos de loja em paralelo (otimização)
    const storeIds = storeGroups.map(g => g.storeId);
    const storeOwnersMap = await this.getStoreOwners(storeIds);

    // Processar todas as vendas em paralelo
    const salePromises = storeGroups.map(async (group) => {
      try {
        // Buscar seller do cache
        const sellerId = storeOwnersMap.get(group.storeId);
        if (!sellerId) {
          throw new Error(`Store owner not found for store ${group.storeId}`);
        }

        // Processar venda individual
        const saleResult = await this.settleSale({
          proposalId,
          storeId: group.storeId,
          buyer,
          seller: sellerId,
          promoter,
          amount: group.total.toString(),
          commissionPercent: group.commissionPercent,
        });

        // Adicionar informações do grupo
        return {
          ...saleResult,
          storeId: group.storeId,
          storeName: group.storeName,
        } as GroupSaleResult;
      } catch (error: any) {
        console.error(`Failed to settle sale for store ${group.storeId}:`, error.message);
        throw error; // Re-throw para ser capturado pelo chamador
      }
    });

    // Aguardar todos os splits em paralelo
    const results = await Promise.all(salePromises);

    return results;
  }

  /**
   * Busca os donos de múltiplas lojas em uma única query (otimização)
   * Usa cache para evitar queries repetidas
   */
  private async getStoreOwners(storeIds: number[]): Promise<Map<number, string>> {
    const now = Date.now();
    const result = new Map<number, string>();
    const missingIds: number[] = [];

    // Verificar cache primeiro
    for (const storeId of storeIds) {
      const cached = this.storeOwnerCache.get(storeId);
      if (cached && now - cached.timestamp < this.CACHE_TTL) {
        result.set(storeId, cached.sellerId);
      } else {
        missingIds.push(storeId);
      }
    }

    // Buscar IDs que não estão no cache
    if (missingIds.length > 0) {
      const stores = await prisma.sellerProfile.findMany({
        where: {
          onChainStoreId: {
            in: missingIds.map(id => BigInt(id)),
          },
        },
        select: {
          onChainStoreId: true,
          userId: true,
        },
      });

      // Buscar profiles dos sellers
      const userIds = stores.map(s => s.userId);
      const profiles = await prisma.profile.findMany({
        where: {
          userId: { in: userIds },
        },
        select: {
          id: true,
          userId: true,
        },
      });

      // Criar map userId → profileId
      const userToProfileMap = new Map(
        profiles.map(p => [p.userId, p.id])
      );

      // Preencher result e cache
      for (const store of stores) {
        const storeId = Number(store.onChainStoreId);
        const sellerId = userToProfileMap.get(store.userId);

        if (sellerId) {
          result.set(storeId, sellerId);
          this.storeOwnerCache.set(storeId, {
            sellerId,
            timestamp: now,
          });
        }
      }
    }

    return result;
  }

  /**
   * Limpa cache expirado (pode ser chamado periodicamente)
   */
  clearExpiredCache(): void {
    const now = Date.now();
    for (const [storeId, cached] of this.storeOwnerCache.entries()) {
      if (now - cached.timestamp >= this.CACHE_TTL) {
        this.storeOwnerCache.delete(storeId);
      }
    }
  }

  /**
   * Processa uma venda e simula o split de valores
   * MOCK: Usa PostgreSQL ao invés da blockchain
   */
  async settleSale(data: SaleData): Promise<SaleResult> {
    const now = Date.now();

    // Validar dados
    if (!data.buyer || !data.seller || !data.amount) {
      throw new Error('Missing required sale data');
    }

    // Calcular valores
    const amount = parseFloat(data.amount);
    const commissionAmount = data.promoter
      ? (amount * data.commissionPercent) / 100
      : 0;
    const bazariFee = (amount * this.BAZARI_FEE_BPS) / 10000; // 1%
    const sellerAmount = amount - commissionAmount - bazariFee;

    // Gerar txHash mock (simula hash de transação)
    const txHash = this.generateMockTxHash();

    // Criar registro da venda (MOCK da chain)
    const sale = await prisma.chatSale.create({
      data: {
        storeId: data.storeId,
        buyer: data.buyer,
        seller: data.seller,
        promoter: data.promoter,
        amount,
        commissionPercent: data.commissionPercent,
        commissionAmount,
        bazariFee,
        sellerAmount,
        status: 'split',
        txHash,
        proposalId: data.proposalId,
        createdAt: now,
        settledAt: now,
      },
    });

    // Gerar recibo NFT
    const receiptNftCid = await this.mintReceipt({
      saleId: sale.id,
      storeId: data.storeId,
      buyer: data.buyer,
      seller: data.seller,
      promoter: data.promoter,
      amount: data.amount,
      commissionAmount: commissionAmount.toString(),
      bazariFee: bazariFee.toString(),
      sellerAmount: sellerAmount.toString(),
      txHash,
      timestamp: now,
    });

    // Atualizar com o CID do recibo
    await prisma.chatSale.update({
      where: { id: sale.id },
      data: { receiptNftCid },
    });

    // Emitir evento (MOCK)
    await this.emitSaleEvent({
      saleId: sale.id,
      buyer: data.buyer,
      seller: data.seller,
      amount: data.amount,
      txHash,
    });

    return {
      saleId: sale.id,
      amount: amount.toString(),
      commissionAmount: commissionAmount.toString(),
      bazariFee: bazariFee.toString(),
      sellerAmount: sellerAmount.toString(),
      status: 'split',
      txHash,
      receiptNftCid,
    };
  }

  /**
   * Gera e faz upload do recibo NFT para IPFS
   */
  async mintReceipt(receiptData: any): Promise<string> {
    // Criar JSON do recibo
    const receipt = {
      type: 'BazChat Sale Receipt',
      version: '1.0',
      saleId: receiptData.saleId,
      storeId: receiptData.storeId,
      buyer: receiptData.buyer,
      seller: receiptData.seller,
      promoter: receiptData.promoter,
      amount: receiptData.amount,
      breakdown: {
        commission: receiptData.commissionAmount,
        bazariFee: receiptData.bazariFee,
        sellerAmount: receiptData.sellerAmount,
      },
      txHash: receiptData.txHash,
      timestamp: receiptData.timestamp,
      signature: this.generateMockSignature(receiptData),
    };

    // Converter para buffer
    const buffer = Buffer.from(JSON.stringify(receipt, null, 2), 'utf-8');

    // Gerar chave de cifragem
    const encryptionKey = ipfsService.generateEncryptionKey();

    // Upload cifrado para IPFS
    const cid = await ipfsService.uploadEncrypted(buffer, encryptionKey);

    return cid;
  }

  /**
   * Emite evento de venda (MOCK)
   * Na versão real, isso seria um evento on-chain
   */
  async emitSaleEvent(event: any): Promise<void> {
    // MOCK: Apenas log por enquanto
    // Na versão real, emitiria evento na blockchain
    console.log('[MOCK] Sale event emitted:', {
      saleId: event.saleId,
      buyer: event.buyer,
      seller: event.seller,
      amount: event.amount,
      txHash: event.txHash,
    });

    // TODO: Substituir por emit real quando integrar com chain
    // await chainService.emitEvent('SaleCompleted', event);
  }

  /**
   * Busca vendas de um vendedor ou comprador
   */
  async getSales(profileId: string, role: 'buyer' | 'seller' | 'promoter'): Promise<any[]> {
    const where: any = {};

    if (role === 'buyer') {
      where.buyer = profileId;
    } else if (role === 'seller') {
      where.seller = profileId;
    } else {
      where.promoter = profileId;
    }

    const sales = await prisma.chatSale.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return sales.map(sale => ({
      id: sale.id,
      storeId: Number(sale.storeId),
      buyer: sale.buyer,
      seller: sale.seller,
      promoter: sale.promoter,
      amount: sale.amount.toString(),
      commissionAmount: sale.commissionAmount.toString(),
      bazariFee: sale.bazariFee.toString(),
      sellerAmount: sale.sellerAmount.toString(),
      status: sale.status,
      txHash: sale.txHash,
      receiptNftCid: sale.receiptNftCid,
      createdAt: Number(sale.createdAt),
      settledAt: sale.settledAt ? Number(sale.settledAt) : null,
    }));
  }

  /**
   * Busca detalhes de uma venda
   */
  async getSale(saleId: string): Promise<any | null> {
    const sale = await prisma.chatSale.findUnique({
      where: { id: saleId },
    });

    if (!sale) return null;

    return {
      id: sale.id,
      storeId: Number(sale.storeId),
      buyer: sale.buyer,
      seller: sale.seller,
      promoter: sale.promoter,
      amount: sale.amount.toString(),
      commissionAmount: sale.commissionAmount.toString(),
      bazariFee: sale.bazariFee.toString(),
      sellerAmount: sale.sellerAmount.toString(),
      status: sale.status,
      txHash: sale.txHash,
      receiptNftCid: sale.receiptNftCid,
      proposalId: sale.proposalId,
      createdAt: Number(sale.createdAt),
      settledAt: sale.settledAt ? Number(sale.settledAt) : null,
    };
  }

  /**
   * Gera um hash de transação mock
   */
  private generateMockTxHash(): string {
    return '0x' + crypto.randomBytes(32).toString('hex');
  }

  /**
   * Gera uma assinatura mock para o recibo
   */
  private generateMockSignature(data: any): string {
    const hash = crypto
      .createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex');
    return '0x' + hash;
  }
}

export const commissionService = new CommissionService();
