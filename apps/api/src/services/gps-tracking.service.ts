// @ts-nocheck - Polkadot.js type incompatibilities
import { PrismaClient, DeliveryWaypoint } from '@prisma/client';
import { BlockchainService } from './blockchain/blockchain.service.js';
import { create as ipfsHttpClient } from 'ipfs-http-client';

/**
 * GPSTrackingService - Gerencia GPS tracking off-chain com provas on-chain
 *
 * Strategy:
 * - GPS waypoints armazenados off-chain (PostgreSQL) para reduzir custos
 * - Provas finais (HandoffProof, DeliveryProof) enviadas on-chain (bazari-attestation)
 * - Waypoints enviados para IPFS quando proof é submetido
 *
 * Cost savings: ~$0.60-12/delivery se fosse on-chain vs $0.0001 off-chain
 */

export interface WaypointDto {
  deliveryRequestId: string;
  latitude: number;
  longitude: number;
  accuracy?: number; // meters
  altitude?: number; // meters
  speed?: number; // m/s
  bearing?: number; // degrees
}

export interface HandoffProofDto {
  deliveryRequestId: string;
  sellerAddress: string;
  courierAddress: string;
}

export interface DeliveryProofDto {
  deliveryRequestId: string;
  courierAddress: string;
  recipientAddress: string;
  photoProofCid?: string; // IPFS CID of delivery photo
}

export interface GPSTrackingStats {
  totalWaypoints: number;
  firstWaypoint?: Date;
  lastWaypoint?: Date;
  distanceTraveled: number; // meters (Haversine formula)
  averageSpeed: number; // m/s
  proofsSubmitted: number;
}

export class GPSTrackingService {
  private prisma: PrismaClient;
  private blockchainService: BlockchainService;
  private ipfsClient: any;

  constructor(
    prisma: PrismaClient,
    blockchainService?: BlockchainService,
    ipfsUrl?: string
  ) {
    this.prisma = prisma;
    this.blockchainService = blockchainService || BlockchainService.getInstance();

    // Initialize IPFS client
    const ipfsEndpoint = ipfsUrl || process.env.IPFS_URL || 'http://127.0.0.1:5001';
    this.ipfsClient = ipfsHttpClient({ url: ipfsEndpoint });
  }

  // ============================================================================
  // GPS Waypoint Recording (Off-Chain)
  // ============================================================================

  /**
   * Registrar waypoint GPS off-chain
   */
  async recordWaypoint(data: WaypointDto): Promise<DeliveryWaypoint> {
    // Validar coordenadas
    if (data.latitude < -90 || data.latitude > 90) {
      throw new Error('Invalid latitude: must be between -90 and 90');
    }

    if (data.longitude < -180 || data.longitude > 180) {
      throw new Error('Invalid longitude: must be between -180 and 180');
    }

    const waypoint = await this.prisma.deliveryWaypoint.create({
      data: {
        deliveryRequestId: data.deliveryRequestId,
        latitude: data.latitude,
        longitude: data.longitude,
        accuracy: data.accuracy,
        altitude: data.altitude,
        speed: data.speed,
        bearing: data.bearing,
        timestamp: BigInt(Date.now()),
        proofSubmitted: false,
      },
    });

    console.log('[GPSTracking] Waypoint recorded:', {
      id: waypoint.id,
      deliveryRequestId: data.deliveryRequestId,
      lat: data.latitude,
      lng: data.longitude,
    });

    return waypoint;
  }

  /**
   * Buscar waypoints de uma entrega
   */
  async getWaypoints(
    deliveryRequestId: string,
    options?: {
      limit?: number;
      offset?: number;
      startTime?: Date;
      endTime?: Date;
    }
  ): Promise<DeliveryWaypoint[]> {
    const where: any = { deliveryRequestId };

    if (options?.startTime || options?.endTime) {
      where.timestamp = {};
      if (options.startTime) {
        where.timestamp.gte = BigInt(options.startTime.getTime());
      }
      if (options.endTime) {
        where.timestamp.lte = BigInt(options.endTime.getTime());
      }
    }

    return await this.prisma.deliveryWaypoint.findMany({
      where,
      orderBy: { timestamp: 'asc' },
      take: options?.limit,
      skip: options?.offset,
    });
  }

  /**
   * Buscar último waypoint de uma entrega
   */
  async getLastWaypoint(deliveryRequestId: string): Promise<DeliveryWaypoint | null> {
    return await this.prisma.deliveryWaypoint.findFirst({
      where: { deliveryRequestId },
      orderBy: { timestamp: 'desc' },
    });
  }

  // ============================================================================
  // Proof Submission (On-Chain via IPFS)
  // ============================================================================

  /**
   * Upload waypoints para IPFS
   */
  private async uploadToIPFS(waypoints: DeliveryWaypoint[]): Promise<string> {
    const data = {
      waypoints: waypoints.map((w) => ({
        lat: w.latitude,
        lng: w.longitude,
        accuracy: w.accuracy,
        altitude: w.altitude,
        speed: w.speed,
        bearing: w.bearing,
        timestamp: w.timestamp.toString(),
      })),
      metadata: {
        totalWaypoints: waypoints.length,
        uploadedAt: new Date().toISOString(),
      },
    };

    const result = await this.ipfsClient.add(JSON.stringify(data));
    const cid = result.path || result.cid.toString();

    console.log('[GPSTracking] Waypoints uploaded to IPFS:', {
      cid,
      waypointCount: waypoints.length,
    });

    return cid;
  }

  /**
   * Submit HandoffProof on-chain (Seller → Courier)
   * 2-of-2 multisig: seller e courier assinam
   */
  async submitHandoffProof(
    data: HandoffProofDto,
    sellerWallet: any
  ): Promise<{ txHash: string; blockNumber: bigint; ipfsCid: string }> {
    console.log('[GPSTracking] Submitting HandoffProof:', data.deliveryRequestId);

    // 1. Buscar waypoints até o momento
    const waypoints = await this.getWaypoints(data.deliveryRequestId);

    if (waypoints.length === 0) {
      throw new Error('No GPS waypoints found for this delivery');
    }

    // 2. Upload waypoints para IPFS
    const ipfsCid = await this.uploadToIPFS(waypoints);

    // 3. Submit proof on-chain (bazari-attestation)
    const result = await this.blockchainService.submitProof(
      parseInt(data.deliveryRequestId), // orderId (assuming numeric)
      ipfsCid,
      data.courierAddress, // attestor = courier
      sellerWallet // signer = seller
    );

    // 4. Marcar waypoints como incluídos em proof
    await this.prisma.deliveryWaypoint.updateMany({
      where: {
        deliveryRequestId: data.deliveryRequestId,
        proofSubmitted: false,
      },
      data: {
        proofSubmitted: true,
        proofCid: ipfsCid,
      },
    });

    console.log('[GPSTracking] HandoffProof submitted:', {
      txHash: result.txHash,
      blockNumber: result.blockNumber.toString(),
      ipfsCid,
      waypointCount: waypoints.length,
    });

    return {
      ...result,
      ipfsCid,
    };
  }

  /**
   * Submit DeliveryProof on-chain (Courier → Recipient)
   * 2-of-2 multisig: courier e recipient assinam
   */
  async submitDeliveryProof(
    data: DeliveryProofDto,
    courierWallet: any
  ): Promise<{ txHash: string; blockNumber: bigint; ipfsCid: string }> {
    console.log('[GPSTracking] Submitting DeliveryProof:', data.deliveryRequestId);

    // 1. Buscar todos os waypoints da entrega
    const waypoints = await this.getWaypoints(data.deliveryRequestId);

    if (waypoints.length === 0) {
      throw new Error('No GPS waypoints found for this delivery');
    }

    // 2. Preparar dados para IPFS (incluir foto se houver)
    let proofData: any = {
      waypoints: waypoints.map((w) => ({
        lat: w.latitude,
        lng: w.longitude,
        accuracy: w.accuracy,
        timestamp: w.timestamp.toString(),
      })),
      metadata: {
        totalWaypoints: waypoints.length,
        deliveryCompletedAt: new Date().toISOString(),
      },
    };

    if (data.photoProofCid) {
      proofData.photoProof = data.photoProofCid;
    }

    // 3. Upload para IPFS
    const result = await this.ipfsClient.add(JSON.stringify(proofData));
    const ipfsCid = result.path || result.cid.toString();

    // 4. Submit proof on-chain
    const txResult = await this.blockchainService.submitProof(
      parseInt(data.deliveryRequestId),
      ipfsCid,
      data.recipientAddress, // attestor = recipient
      courierWallet // signer = courier
    );

    // 5. Marcar waypoints como incluídos em proof
    await this.prisma.deliveryWaypoint.updateMany({
      where: {
        deliveryRequestId: data.deliveryRequestId,
        proofSubmitted: false,
      },
      data: {
        proofSubmitted: true,
        proofCid: ipfsCid,
      },
    });

    console.log('[GPSTracking] DeliveryProof submitted:', {
      txHash: txResult.txHash,
      blockNumber: txResult.blockNumber.toString(),
      ipfsCid,
      waypointCount: waypoints.length,
      hasPhoto: !!data.photoProofCid,
    });

    return {
      ...txResult,
      ipfsCid,
    };
  }

  // ============================================================================
  // Analytics & Statistics
  // ============================================================================

  /**
   * Calcular distância entre dois pontos GPS (Haversine formula)
   * Returns: distância em metros
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3; // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Obter estatísticas de GPS tracking de uma entrega
   */
  async getTrackingStats(deliveryRequestId: string): Promise<GPSTrackingStats> {
    const waypoints = await this.getWaypoints(deliveryRequestId);

    if (waypoints.length === 0) {
      return {
        totalWaypoints: 0,
        distanceTraveled: 0,
        averageSpeed: 0,
        proofsSubmitted: 0,
      };
    }

    // Calcular distância total
    let distanceTraveled = 0;
    for (let i = 1; i < waypoints.length; i++) {
      const prev = waypoints[i - 1];
      const curr = waypoints[i];
      distanceTraveled += this.calculateDistance(
        prev.latitude,
        prev.longitude,
        curr.latitude,
        curr.longitude
      );
    }

    // Calcular velocidade média (dos waypoints que têm speed)
    const waypointsWithSpeed = waypoints.filter((w) => w.speed !== null && w.speed !== undefined);
    const averageSpeed =
      waypointsWithSpeed.length > 0
        ? waypointsWithSpeed.reduce((sum, w) => sum + (w.speed || 0), 0) / waypointsWithSpeed.length
        : 0;

    // Contar proofs submetidos
    const proofsSubmitted = waypoints.filter((w) => w.proofSubmitted).length > 0 ? 1 : 0;

    return {
      totalWaypoints: waypoints.length,
      firstWaypoint: new Date(Number(waypoints[0].timestamp)),
      lastWaypoint: new Date(Number(waypoints[waypoints.length - 1].timestamp)),
      distanceTraveled,
      averageSpeed,
      proofsSubmitted,
    };
  }

  /**
   * Gerar rota simplificada (downsampling de waypoints)
   * Útil para visualização em mapas
   */
  async getSimplifiedRoute(
    deliveryRequestId: string,
    maxPoints: number = 50
  ): Promise<Array<{ lat: number; lng: number; timestamp: number }>> {
    const waypoints = await this.getWaypoints(deliveryRequestId);

    if (waypoints.length <= maxPoints) {
      return waypoints.map((w) => ({
        lat: w.latitude,
        lng: w.longitude,
        timestamp: Number(w.timestamp),
      }));
    }

    // Douglas-Peucker simplification (simplified version)
    const step = Math.floor(waypoints.length / maxPoints);
    const simplified = [];

    for (let i = 0; i < waypoints.length; i += step) {
      const w = waypoints[i];
      simplified.push({
        lat: w.latitude,
        lng: w.longitude,
        timestamp: Number(w.timestamp),
      });
    }

    // Always include last waypoint
    if (waypoints.length > 0) {
      const last = waypoints[waypoints.length - 1];
      simplified.push({
        lat: last.latitude,
        lng: last.longitude,
        timestamp: Number(last.timestamp),
      });
    }

    return simplified;
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  /**
   * Deletar waypoints antigos (cleanup de dados)
   * Manter apenas waypoints dos últimos N dias
   */
  async cleanupOldWaypoints(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.prisma.deliveryWaypoint.deleteMany({
      where: {
        timestamp: {
          lt: BigInt(cutoffDate.getTime()),
        },
        proofSubmitted: true, // Só deletar waypoints já incluídos em proofs
      },
    });

    console.log('[GPSTracking] Cleaned up old waypoints:', {
      deleted: result.count,
      cutoffDate: cutoffDate.toISOString(),
    });

    return result.count;
  }
}
