import { calculateDistance, estimateCoordinatesFromZipCode } from './geoUtils.js';
import { env } from '../env.js';

export interface Address {
  street: string;
  number: string;
  city: string;
  state: string;
  zipCode: string;
  lat?: number;
  lng?: number;
}

export interface PackageDetails {
  packageType: string;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
}

export interface DeliveryFeeResult {
  totalBzr: string;
  distance: number;
  breakdown: {
    baseFee: string;
    distanceFee: string;
    weightFee: string;
    packageTypeFee: string;
  };
  estimatedTimeMinutes: number;
}

/**
 * Tabela de taxas base por tipo de pacote
 */
const PACKAGE_TYPE_FEES: Record<string, number> = {
  envelope: 0,
  small_box: 1.0,
  medium_box: 2.0,
  large_box: 4.0,
  fragile: 3.0,
  perishable: 2.5,
  custom: 2.0,
};

/**
 * Peso gratuito antes de cobrar taxa por peso
 */
const FREE_WEIGHT = 1.0; // kg grátis

/**
 * Calcula o valor da entrega baseado em distância, peso e tipo de pacote
 */
export async function calculateDeliveryFee(params: {
  pickupAddress: Address;
  deliveryAddress: Address;
  packageType: string;
  weight?: number;
  dimensions?: PackageDetails['dimensions'];
}): Promise<DeliveryFeeResult> {
  const { pickupAddress, deliveryAddress, packageType, weight = 1.0 } = params;

  // 1. Calcular distância
  let distance = 0;

  if (
    pickupAddress.lat &&
    pickupAddress.lng &&
    deliveryAddress.lat &&
    deliveryAddress.lng
  ) {
    // Usar coordenadas fornecidas
    distance = calculateDistance(
      pickupAddress.lat,
      pickupAddress.lng,
      deliveryAddress.lat,
      deliveryAddress.lng
    );
  } else {
    // Estimar coordenadas a partir do CEP
    const pickupCoords = estimateCoordinatesFromZipCode(pickupAddress.zipCode);
    const deliveryCoords = estimateCoordinatesFromZipCode(deliveryAddress.zipCode);

    if (pickupCoords && deliveryCoords) {
      distance = calculateDistance(
        pickupCoords.lat,
        pickupCoords.lng,
        deliveryCoords.lat,
        deliveryCoords.lng
      );
    } else {
      // Fallback: estimar por cidade/estado
      distance = estimateDistanceByCityState(pickupAddress, deliveryAddress);
    }
  }

  // 2. Calcular componentes do frete
  const baseFee = env.DELIVERY_BASE_FEE;
  const distanceFee = distance * env.DELIVERY_FEE_PER_KM;
  const weightFee = weight > FREE_WEIGHT ? (weight - FREE_WEIGHT) * env.DELIVERY_FEE_PER_KG : 0;
  const packageTypeFee = PACKAGE_TYPE_FEES[packageType] || 0;

  let totalBzr = baseFee + distanceFee + weightFee + packageTypeFee;

  // Aplicar taxa mínima
  if (totalBzr < env.DELIVERY_MIN_FEE) {
    totalBzr = env.DELIVERY_MIN_FEE;
  }

  // 3. Estimar tempo de entrega
  const estimatedTimeMinutes = Math.ceil((distance / env.DELIVERY_ESTIMATED_SPEED_KMH) * 60);

  return {
    totalBzr: totalBzr.toFixed(2),
    distance: Math.round(distance * 100) / 100,
    breakdown: {
      baseFee: baseFee.toFixed(2),
      distanceFee: distanceFee.toFixed(2),
      weightFee: weightFee.toFixed(2),
      packageTypeFee: packageTypeFee.toFixed(2),
    },
    estimatedTimeMinutes,
  };
}

/**
 * Estima distância baseado em cidade/estado (fallback)
 */
function estimateDistanceByCityState(
  pickupAddress: Address,
  deliveryAddress: Address
): number {
  // Mesma cidade
  if (
    pickupAddress.city.toLowerCase() === deliveryAddress.city.toLowerCase()
  ) {
    return 5.0; // 5km dentro da mesma cidade
  }

  // Mesmo estado, cidades diferentes
  if (pickupAddress.state === deliveryAddress.state) {
    return 50.0; // 50km entre cidades do mesmo estado
  }

  // Estados diferentes
  return 200.0; // 200km entre estados (rough estimate)
}

/**
 * Estima características do pacote baseado em items do pedido
 */
export function estimatePackageDetails(items: any[]): PackageDetails {
  // MOCK: Lógica simplificada
  const totalItems = items.reduce((sum, item) => sum + item.qty, 0);

  if (totalItems === 1) {
    return {
      packageType: 'small',
      weight: 1.0,
    };
  } else if (totalItems <= 3) {
    return {
      packageType: 'medium',
      weight: 2.5,
    };
  } else {
    return {
      packageType: 'large',
      weight: 5.0,
    };
  }
}
