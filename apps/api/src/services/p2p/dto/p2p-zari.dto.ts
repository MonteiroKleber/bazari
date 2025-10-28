// FASE 5: DTOs para P2P ZARI
import { z } from 'zod';

/**
 * DTO para criar oferta ZARI
 */
export const CreateZARIOfferDto = z.object({
  assetType: z.literal('ZARI'),
  amountZARI: z.coerce.number().positive().min(1).max(1000000),
  minBRL: z.coerce.number().positive().min(1),
  maxBRL: z.coerce.number().positive().min(1),
  method: z.enum(['PIX']).default('PIX'),
  autoReply: z.string().max(500).optional(),
}).refine(v => v.maxBRL >= v.minBRL, {
  message: 'maxBRL deve ser >= minBRL',
  path: ['maxBRL'],
});

/**
 * DTO para criar ordem ZARI
 */
export const CreateZARIOrderDto = z.object({
  amountBRL: z.coerce.number().positive().optional(),
  amountZARI: z.coerce.number().positive().optional(),
}).refine(v => !!v.amountBRL || !!v.amountZARI, {
  message: 'Informe amountBRL ou amountZARI',
});

/**
 * DTO para executar lock no escrow
 */
export const EscrowLockDto = z.object({
  makerAddress: z.string().min(47).max(48), // SS58 address
});

/**
 * DTO para executar release do escrow
 */
export const EscrowReleaseDto = z.object({
  takerAddress: z.string().min(47).max(48), // SS58 address
});

/**
 * DTO para filtrar ofertas ZARI
 */
export const FilterZARIOffersDto = z.object({
  phase: z.enum(['2A', '2B', '3']).optional(),
  minPrice: z.coerce.number().positive().optional(),
  maxPrice: z.coerce.number().positive().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
});

/**
 * Response DTO para fase ativa
 */
export interface PhaseInfoResponse {
  phase: string;
  priceBZR: string;
  supplyLimit: string;
  supplySold: string;
  supplyRemaining: string;
  progressPercent: number;
  isActive: boolean;
  nextPhase: string | null;
}

/**
 * Response DTO para stats ZARI
 */
export interface ZARIStatsResponse {
  phases: Array<{
    phase: string;
    priceBZR: string;
    supplyLimit: string;
    active: boolean;
    startBlock: string | null;
    endBlock: string | null;
  }>;
  activePhase: string | null;
  totalSold: string;
  totalP2PSupply: string;
  overallProgress: number;
  completedOrders: number;
}

/**
 * Response DTO para escrow lock
 */
export interface EscrowLockResponse {
  success: boolean;
  txHash: string;
  blockNumber: string;
  amount: string;
  assetType: 'BZR' | 'ZARI';
  message: string;
}

/**
 * Response DTO para escrow release
 */
export interface EscrowReleaseResponse {
  success: boolean;
  txHash: string;
  blockNumber: string;
  amount: string;
  assetType: 'BZR' | 'ZARI';
  recipient: string;
  message: string;
}

/**
 * Error response padrão
 */
export interface ErrorResponse {
  error: string;
  message: string;
  details?: any;
}
