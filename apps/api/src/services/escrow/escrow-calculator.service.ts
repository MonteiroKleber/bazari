// path: apps/api/src/services/escrow/escrow-calculator.service.ts
/**
 * EscrowCalculatorService - PROPOSAL-001: Delivery-Aware Escrow
 *
 * Calcula o prazo de auto-release do escrow baseado no prazo de entrega estimado,
 * garantindo que o comprador mantenha proteção até após a data prevista de entrega.
 *
 * Fórmula:
 * auto_release_days = min(
 *   max(delivery_estimate_days, min_by_shipping_method) + safety_margin_days,
 *   max_escrow_days
 * )
 */

import { MIN_DELIVERY_DAYS_BY_METHOD, type ShippingMethod } from '../../types/shipping.types.js';

// Constants from environment or defaults
const SAFETY_MARGIN_DAYS = parseInt(process.env.ESCROW_SAFETY_MARGIN_DAYS || '7', 10);
const MAX_ESCROW_DAYS = parseInt(process.env.ESCROW_MAX_DAYS || '30', 10);
const DEFAULT_DELIVERY_DAYS = parseInt(process.env.ESCROW_DEFAULT_DAYS || '7', 10);
const BLOCKS_PER_DAY = 14_400; // 6 seconds per block = 14,400 blocks per day

export interface EscrowTimelineInfo {
  /** Dias de entrega informados pelo vendedor */
  informedDeliveryDays: number;
  /** Método de envio utilizado */
  shippingMethod: string;
  /** Prazo mínimo para o método de envio */
  minDaysForMethod: number;
  /** Prazo efetivo após aplicar mínimo */
  effectiveDeliveryDays: number;
  /** Se o prazo foi ajustado pelo mínimo do método */
  wasAdjustedByMinimum: boolean;
  /** Margem de segurança adicionada */
  safetyMarginDays: number;
  /** Dias totais de auto-release */
  autoReleaseDays: number;
  /** Blocos para auto-release (para o pallet) */
  autoReleaseBlocks: number;
  /** Data estimada de auto-release */
  autoReleaseDate: Date;
  /** Prazo máximo permitido */
  maxEscrowDays: number;
  /** Se foi limitado pelo máximo */
  wasLimitedByMax: boolean;
}

export class EscrowCalculatorService {
  private readonly SAFETY_MARGIN_DAYS = SAFETY_MARGIN_DAYS;
  private readonly MAX_ESCROW_DAYS = MAX_ESCROW_DAYS;
  private readonly BLOCKS_PER_DAY = BLOCKS_PER_DAY;

  /**
   * Retorna o prazo mínimo para um método de envio
   */
  getMinDaysForShippingMethod(method: ShippingMethod | string | null | undefined): number {
    if (!method) return MIN_DELIVERY_DAYS_BY_METHOD.OUTRO;

    const normalized = method.toUpperCase() as ShippingMethod;
    return MIN_DELIVERY_DAYS_BY_METHOD[normalized] ?? MIN_DELIVERY_DAYS_BY_METHOD.OUTRO;
  }

  /**
   * Aplica o prazo mínimo por método de envio
   */
  applyMinimumDeliveryDays(
    informedDays: number,
    shippingMethod: ShippingMethod | string | null | undefined
  ): number {
    const minDays = this.getMinDaysForShippingMethod(shippingMethod);
    return Math.max(informedDays, minDays);
  }

  /**
   * Calcula o prazo de auto-release baseado no prazo de entrega
   *
   * @param deliveryEstimateDays - Prazo de entrega estimado em dias
   * @param shippingMethod - Método de envio (opcional)
   * @returns Número de blocos para auto-release
   */
  calculateAutoReleaseBlocks(
    deliveryEstimateDays: number | null | undefined,
    shippingMethod?: ShippingMethod | string | null
  ): number {
    // Usar default se não informado
    let effectiveDays = deliveryEstimateDays ?? DEFAULT_DELIVERY_DAYS;

    // Aplicar prazo mínimo por método de envio
    if (shippingMethod) {
      effectiveDays = this.applyMinimumDeliveryDays(effectiveDays, shippingMethod);
    }

    // Garantir mínimo de 1 dia
    if (effectiveDays < 1) {
      effectiveDays = 1;
    }

    // Calcular prazo total com margem de segurança
    const totalDays = Math.min(
      effectiveDays + this.SAFETY_MARGIN_DAYS,
      this.MAX_ESCROW_DAYS
    );

    // Converter para blocos
    return totalDays * this.BLOCKS_PER_DAY;
  }

  /**
   * Calcula a data estimada de auto-release
   */
  calculateAutoReleaseDate(
    deliveryEstimateDays: number | null | undefined,
    shippingMethod?: ShippingMethod | string | null,
    fromDate?: Date
  ): Date {
    const blocks = this.calculateAutoReleaseBlocks(deliveryEstimateDays, shippingMethod);
    const seconds = blocks * 6; // 6 segundos por bloco
    const baseDate = fromDate || new Date();
    return new Date(baseDate.getTime() + seconds * 1000);
  }

  /**
   * Calcula a data estimada de entrega
   */
  calculateEstimatedDeliveryDate(
    deliveryEstimateDays: number | null | undefined,
    shippingMethod?: ShippingMethod | string | null,
    fromDate?: Date
  ): Date {
    let effectiveDays = deliveryEstimateDays ?? DEFAULT_DELIVERY_DAYS;

    // Aplicar prazo mínimo por método de envio
    if (shippingMethod) {
      effectiveDays = this.applyMinimumDeliveryDays(effectiveDays, shippingMethod);
    }

    const baseDate = fromDate || new Date();
    return new Date(baseDate.getTime() + effectiveDays * 24 * 60 * 60 * 1000);
  }

  /**
   * Retorna informações completas do cálculo
   */
  getEscrowTimeline(
    deliveryEstimateDays: number | null | undefined,
    shippingMethod?: ShippingMethod | string | null,
    fromDate?: Date
  ): EscrowTimelineInfo {
    const informedDays = deliveryEstimateDays ?? DEFAULT_DELIVERY_DAYS;
    const minDays = this.getMinDaysForShippingMethod(shippingMethod);
    const effectiveDeliveryDays = Math.max(informedDays, minDays);
    const autoReleaseBlocks = this.calculateAutoReleaseBlocks(deliveryEstimateDays, shippingMethod);
    const autoReleaseDays = Math.ceil(autoReleaseBlocks / this.BLOCKS_PER_DAY);

    return {
      informedDeliveryDays: informedDays,
      shippingMethod: shippingMethod ?? 'OUTRO',
      minDaysForMethod: minDays,
      effectiveDeliveryDays,
      wasAdjustedByMinimum: informedDays < minDays,
      safetyMarginDays: this.SAFETY_MARGIN_DAYS,
      autoReleaseDays,
      autoReleaseBlocks,
      autoReleaseDate: this.calculateAutoReleaseDate(deliveryEstimateDays, shippingMethod, fromDate),
      maxEscrowDays: this.MAX_ESCROW_DAYS,
      wasLimitedByMax: (effectiveDeliveryDays + this.SAFETY_MARGIN_DAYS) > this.MAX_ESCROW_DAYS,
    };
  }

  /**
   * Calcula o máximo prazo de entrega entre múltiplos itens
   * Usado para orders com múltiplos produtos
   */
  calculateMaxDeliveryDays(
    items: Array<{ estimatedDeliveryDays?: number | null; shippingMethod?: string | null }>
  ): { maxDays: number; shippingMethod: string | null } {
    let maxDays = DEFAULT_DELIVERY_DAYS;
    let selectedMethod: string | null = null;

    for (const item of items) {
      const effectiveDays = this.applyMinimumDeliveryDays(
        item.estimatedDeliveryDays ?? DEFAULT_DELIVERY_DAYS,
        item.shippingMethod
      );

      if (effectiveDays > maxDays) {
        maxDays = effectiveDays;
        selectedMethod = item.shippingMethod ?? null;
      }
    }

    return { maxDays, shippingMethod: selectedMethod };
  }
}

// Singleton instance
let instance: EscrowCalculatorService | null = null;

export function getEscrowCalculator(): EscrowCalculatorService {
  if (!instance) {
    instance = new EscrowCalculatorService();
  }
  return instance;
}
