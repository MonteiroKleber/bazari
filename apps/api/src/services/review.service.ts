// @ts-nocheck - Polkadot.js type incompatibilities
import { MerkleTree } from 'merkletreejs';
import { createHash } from 'crypto';
import { PrismaClient, CourierReview } from '@prisma/client';
import { BlockchainService } from './blockchain/blockchain.service.js';

/**
 * ReviewService - Gerencia reviews de entregadores com Merkle tree
 *
 * Funcionalidades:
 * - CRUD de reviews (PostgreSQL via Prisma)
 * - Merkle tree building (merkletreejs + sha256)
 * - Auto-update on-chain a cada 100 reviews
 */

export interface CreateReviewDto {
  deliveryRequestId: string;
  courierId: string;
  reviewerId: string;
  rating: number; // 1-5
  comment?: string;
}

export interface UpdateReviewDto {
  rating?: number;
  comment?: string;
}

export interface ReviewWithMerkleProof {
  review: CourierReview;
  merkleProof?: string[];
  merkleRoot?: string;
}

export class ReviewService {
  private prisma: PrismaClient;
  private blockchainService: BlockchainService;

  constructor(prisma: PrismaClient, blockchainService?: BlockchainService) {
    this.prisma = prisma;
    this.blockchainService = blockchainService || BlockchainService.getInstance();
  }

  // ============================================================================
  // CRUD Operations
  // ============================================================================

  /**
   * Criar review e atualizar Merkle root se necessário
   */
  async createReview(data: CreateReviewDto): Promise<CourierReview> {
    // Validar rating
    if (data.rating < 1 || data.rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    // Criar review
    const review = await this.prisma.courierReview.create({
      data: {
        ...data,
        createdAt: BigInt(Date.now()),
        merkleIncluded: false,
        merkleRootHash: null,
      },
    });

    console.log('[ReviewService] Review created:', review.id);

    // Verificar se precisa atualizar Merkle root
    const count = await this.prisma.courierReview.count({
      where: { courierId: data.courierId },
    });

    console.log('[ReviewService] Total reviews for courier:', count);

    // Atualizar Merkle root a cada 100 reviews
    if (count % 100 === 0) {
      console.log('[ReviewService] Threshold reached (100 reviews), updating Merkle root...');
      try {
        await this.updateMerkleRoot(data.courierId);
      } catch (error) {
        console.error('[ReviewService] Failed to update Merkle root:', error);
        // Não falhar a criação da review se o update da blockchain falhar
      }
    }

    return review;
  }

  /**
   * Buscar review por ID
   */
  async getReview(id: string): Promise<CourierReview | null> {
    return await this.prisma.courierReview.findUnique({
      where: { id },
    });
  }

  /**
   * Buscar todas as reviews de um entregador
   */
  async getCourierReviews(
    courierId: string,
    options?: {
      limit?: number;
      offset?: number;
      orderBy?: 'createdAt' | 'rating';
      order?: 'asc' | 'desc';
    }
  ): Promise<CourierReview[]> {
    return await this.prisma.courierReview.findMany({
      where: { courierId },
      take: options?.limit,
      skip: options?.offset,
      orderBy: {
        [options?.orderBy || 'createdAt']: options?.order || 'desc',
      },
    });
  }

  /**
   * Calcular rating médio de um entregador
   */
  async getCourierAverageRating(courierId: string): Promise<{ average: number; count: number }> {
    const result = await this.prisma.courierReview.aggregate({
      where: { courierId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    return {
      average: result._avg.rating || 0,
      count: result._count.rating || 0,
    };
  }

  /**
   * Atualizar review
   */
  async updateReview(id: string, data: UpdateReviewDto): Promise<CourierReview> {
    if (data.rating && (data.rating < 1 || data.rating > 5)) {
      throw new Error('Rating must be between 1 and 5');
    }

    return await this.prisma.courierReview.update({
      where: { id },
      data,
    });
  }

  /**
   * Deletar review
   */
  async deleteReview(id: string): Promise<CourierReview> {
    return await this.prisma.courierReview.delete({
      where: { id },
    });
  }

  // ============================================================================
  // Merkle Tree Operations
  // ============================================================================

  /**
   * Hash de uma review para Merkle tree
   * Format: sha256(courierId + reviewerId + rating + createdAt)
   */
  private hashReview(review: CourierReview): Buffer {
    const data = `${review.courierId}:${review.reviewerId}:${review.rating}:${review.createdAt}`;
    return createHash('sha256').update(data).digest();
  }

  /**
   * Construir Merkle tree para reviews de um entregador
   */
  private buildMerkleTree(reviews: CourierReview[]): MerkleTree {
    // Ordenar por createdAt para garantir consistência
    const sortedReviews = [...reviews].sort((a, b) => {
      const aTime = typeof a.createdAt === 'bigint' ? Number(a.createdAt) : a.createdAt;
      const bTime = typeof b.createdAt === 'bigint' ? Number(b.createdAt) : b.createdAt;
      return aTime - bTime;
    });

    const leaves = sortedReviews.map((r) => this.hashReview(r));

    return new MerkleTree(leaves, (data) => createHash('sha256').update(data).digest(), {
      sortPairs: true,
    });
  }

  /**
   * Atualizar Merkle root on-chain para um entregador
   * Chamado automaticamente a cada 100 reviews
   */
  async updateMerkleRoot(courierId: string, courierWallet?: any): Promise<string> {
    console.log('[ReviewService] Building Merkle tree for courier:', courierId);

    // Buscar todas as reviews do entregador
    const reviews = await this.prisma.courierReview.findMany({
      where: { courierId },
      orderBy: { createdAt: 'asc' },
    });

    if (reviews.length === 0) {
      throw new Error('No reviews found for courier');
    }

    // Construir Merkle tree
    const tree = this.buildMerkleTree(reviews);
    const root = tree.getRoot();
    const rootHex = `0x${root.toString('hex')}`;

    console.log('[ReviewService] Merkle root:', rootHex);
    console.log('[ReviewService] Total reviews in tree:', reviews.length);

    // Atualizar on-chain (bazari-fulfillment pallet)
    try {
      if (!courierWallet) {
        console.warn('[ReviewService] No courier wallet provided, skipping blockchain update');
      } else {
        const result = await this.blockchainService.updateReviewsMerkleRoot(
          courierId,
          rootHex,
          courierWallet
        );

        console.log('[ReviewService] Blockchain update successful:', {
          txHash: result.txHash,
          blockNumber: result.blockNumber.toString(),
        });
      }
    } catch (error) {
      console.error('[ReviewService] Failed to update blockchain:', error);
      throw error;
    }

    // Marcar reviews como incluídas no Merkle tree
    await this.prisma.courierReview.updateMany({
      where: {
        courierId,
        merkleIncluded: false,
      },
      data: {
        merkleIncluded: true,
        merkleRootHash: rootHex,
      },
    });

    console.log('[ReviewService] Reviews marked as included in Merkle tree');

    return rootHex;
  }

  /**
   * Gerar prova de Merkle para uma review específica
   */
  async getMerkleProof(reviewId: string): Promise<ReviewWithMerkleProof> {
    const review = await this.prisma.courierReview.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new Error('Review not found');
    }

    // Se a review não foi incluída em Merkle tree ainda, retornar sem prova
    if (!review.merkleIncluded || !review.merkleRootHash) {
      return { review };
    }

    // Buscar todas as reviews do mesmo Merkle root
    const reviews = await this.prisma.courierReview.findMany({
      where: {
        courierId: review.courierId,
        merkleRootHash: review.merkleRootHash,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Reconstruir Merkle tree
    const tree = this.buildMerkleTree(reviews);
    const leaf = this.hashReview(review);
    const proof = tree.getProof(leaf);

    return {
      review,
      merkleProof: proof.map((p) => `0x${p.data.toString('hex')}`),
      merkleRoot: review.merkleRootHash,
    };
  }

  /**
   * Verificar prova de Merkle
   */
  verifyMerkleProof(
    leaf: Buffer,
    proof: Buffer[],
    root: Buffer
  ): boolean {
    return MerkleTree.verify(proof, leaf, root, (data) =>
      createHash('sha256').update(data).digest()
    );
  }

  // ============================================================================
  // Statistics
  // ============================================================================

  /**
   * Obter estatísticas de reviews de um entregador
   */
  async getCourierReviewStats(courierId: string) {
    const [total, avgRating, distribution, merkleStats] = await Promise.all([
      // Total de reviews
      this.prisma.courierReview.count({
        where: { courierId },
      }),

      // Rating médio
      this.prisma.courierReview.aggregate({
        where: { courierId },
        _avg: { rating: true },
      }),

      // Distribuição de ratings
      this.prisma.courierReview.groupBy({
        by: ['rating'],
        where: { courierId },
        _count: { rating: true },
      }),

      // Merkle stats
      this.prisma.courierReview.groupBy({
        by: ['merkleIncluded'],
        where: { courierId },
        _count: { merkleIncluded: true },
      }),
    ]);

    const ratingDistribution = distribution.reduce(
      (acc, item) => {
        acc[item.rating] = item._count.rating;
        return acc;
      },
      {} as Record<number, number>
    );

    const merkleIncluded = merkleStats.find((s) => s.merkleIncluded)?._count.merkleIncluded || 0;
    const merklePending = merkleStats.find((s) => !s.merkleIncluded)?._count.merkleIncluded || 0;

    return {
      total,
      averageRating: avgRating._avg.rating || 0,
      ratingDistribution,
      merkle: {
        included: merkleIncluded,
        pending: merklePending,
        nextUpdateAt: Math.ceil(total / 100) * 100, // Próximo múltiplo de 100
      },
    };
  }
}
