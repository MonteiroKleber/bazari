/**
 * Shipping Types - PROPOSAL-000
 * Tipos para métodos de envio e cálculo de prazo de entrega
 */

export type ShippingMethod =
  | 'SEDEX'
  | 'PAC'
  | 'TRANSPORTADORA'
  | 'MINI_ENVIOS'
  | 'RETIRADA'
  | 'INTERNACIONAL'
  | 'OUTRO';

export const SHIPPING_METHODS: ShippingMethod[] = [
  'SEDEX',
  'PAC',
  'TRANSPORTADORA',
  'MINI_ENVIOS',
  'RETIRADA',
  'INTERNACIONAL',
  'OUTRO',
];

export const SHIPPING_METHOD_LABELS: Record<ShippingMethod, string> = {
  SEDEX: 'SEDEX (Correios)',
  PAC: 'PAC (Correios)',
  TRANSPORTADORA: 'Transportadora',
  MINI_ENVIOS: 'Mini Envios (Correios)',
  RETIRADA: 'Retirada em Loja',
  INTERNACIONAL: 'Internacional',
  OUTRO: 'Outro',
};

/**
 * Prazo mínimo por método de envio (PROPOSAL-001)
 * Usado para validar o prazo informado pelo vendedor
 */
export const MIN_DELIVERY_DAYS_BY_METHOD: Record<ShippingMethod, number> = {
  SEDEX: 3,
  PAC: 10,
  TRANSPORTADORA: 7,
  MINI_ENVIOS: 5,
  RETIRADA: 1,
  INTERNACIONAL: 20,
  OUTRO: 7,
};

/**
 * Valida se o prazo de entrega é compatível com o método de envio
 */
export function validateDeliveryDays(
  shippingMethod: ShippingMethod | null | undefined,
  estimatedDeliveryDays: number
): { valid: boolean; minDays: number; warning?: string } {
  if (!shippingMethod) {
    return { valid: true, minDays: 1 };
  }

  const minDays = MIN_DELIVERY_DAYS_BY_METHOD[shippingMethod] || 7;

  if (estimatedDeliveryDays < minDays) {
    return {
      valid: false,
      minDays,
      warning: `Prazo mínimo para ${SHIPPING_METHOD_LABELS[shippingMethod]} é ${minDays} dias`,
    };
  }

  return { valid: true, minDays };
}

/**
 * Tipo para dimensões do pacote
 */
export interface PackageDimensions {
  length: number; // cm
  width: number; // cm
  height: number; // cm
}

/**
 * Calcula o volume do pacote em m³
 */
export function calculateVolume(dimensions: PackageDimensions): number {
  return (dimensions.length * dimensions.width * dimensions.height) / 1_000_000;
}
