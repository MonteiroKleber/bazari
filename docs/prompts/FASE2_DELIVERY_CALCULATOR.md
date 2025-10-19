# FASE 2: Biblioteca de Cálculo de Frete e Helpers - Bazari Delivery Network

**Objetivo:** Criar funções auxiliares para cálculo de frete, distâncias e estimativas

**Duração Estimada:** 1-2 horas

**Pré-requisito:** FASE 1 concluída com sucesso

---

## TAREFAS

### 1. Criar Biblioteca de Cálculo de Distância

**Arquivo:** `apps/api/src/lib/geoUtils.ts`

```typescript
/**
 * Calcula a distância entre dois pontos usando a fórmula de Haversine
 * @param lat1 - Latitude do ponto 1
 * @param lng1 - Longitude do ponto 1
 * @param lat2 - Latitude do ponto 2
 * @param lng2 - Longitude do ponto 2
 * @returns Distância em quilômetros
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Raio da Terra em km
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 100) / 100; // 2 casas decimais
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Estima coordenadas a partir de CEP (fallback - quando não houver API de geocoding)
 * MOCK: Retorna coordenadas aproximadas do centro da cidade baseado no CEP
 */
export function estimateCoordinatesFromZipCode(zipCode: string): {
  lat: number;
  lng: number;
} | null {
  // Remover hífen e espaços
  const cleanZip = zipCode.replace(/\D/g, '');

  // MOCK: Mapeamento básico de regiões por prefixo de CEP
  const zipPrefix = cleanZip.substring(0, 2);

  // Tabela simplificada (expandir conforme necessário)
  const mockCoordinates: Record<string, { lat: number; lng: number }> = {
    '20': { lat: -22.9068, lng: -43.1729 }, // Rio de Janeiro - Centro
    '21': { lat: -22.8036, lng: -43.3061 }, // Rio de Janeiro - Zona Norte
    '22': { lat: -22.9653, lng: -43.1802 }, // Rio de Janeiro - Zona Sul
    '23': { lat: -22.8825, lng: -43.5469 }, // Rio de Janeiro - Zona Oeste
    '24': { lat: -22.8874, lng: -43.1086 }, // Niterói
    '01': { lat: -23.5505, lng: -46.6333 }, // São Paulo - Centro
    '30': { lat: -19.9167, lng: -43.9345 }, // Belo Horizonte
    '40': { lat: -12.9714, lng: -38.5014 }, // Salvador
    '50': { lat: -8.0476, lng: -34.8770 },  // Recife
    '60': { lat: -3.7172, lng: -38.5433 },  // Fortaleza
    '70': { lat: -15.7939, lng: -47.8828 }, // Brasília
    '80': { lat: -25.4284, lng: -49.2733 }, // Curitiba
    '90': { lat: -30.0346, lng: -51.2177 }, // Porto Alegre
  };

  return mockCoordinates[zipPrefix] || null;
}

/**
 * Valida se coordenadas estão dentro do Brasil (bounds aproximados)
 */
export function isWithinBrazil(lat: number, lng: number): boolean {
  // Bounds aproximados do Brasil
  const BRAZIL_BOUNDS = {
    minLat: -33.75,
    maxLat: 5.27,
    minLng: -73.99,
    maxLng: -28.84,
  };

  return (
    lat >= BRAZIL_BOUNDS.minLat &&
    lat <= BRAZIL_BOUNDS.maxLat &&
    lng >= BRAZIL_BOUNDS.minLng &&
    lng <= BRAZIL_BOUNDS.maxLng
  );
}
```

---

### 2. Criar Biblioteca de Cálculo de Frete

**Arquivo:** `apps/api/src/lib/deliveryCalculator.ts`

```typescript
import { calculateDistance, estimateCoordinatesFromZipCode } from './geoUtils.js';

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
 * Constantes de cálculo
 */
const BASE_FEE = 5.0; // BZR
const PER_KM_FEE = 1.0; // BZR
const PER_KG_FEE = 0.5; // BZR (acima de 1kg)
const FREE_WEIGHT = 1.0; // kg grátis
const AVG_SPEED_KM_PER_HOUR = 20; // velocidade média urbana

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
  const baseFee = BASE_FEE;
  const distanceFee = distance * PER_KM_FEE;
  const weightFee = weight > FREE_WEIGHT ? (weight - FREE_WEIGHT) * PER_KG_FEE : 0;
  const packageTypeFee = PACKAGE_TYPE_FEES[packageType] || 0;

  const totalBzr = baseFee + distanceFee + weightFee + packageTypeFee;

  // 3. Estimar tempo de entrega
  const estimatedTimeMinutes = Math.ceil((distance / AVG_SPEED_KM_PER_HOUR) * 60);

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
      packageType: 'small_box',
      weight: 1.0,
    };
  } else if (totalItems <= 3) {
    return {
      packageType: 'medium_box',
      weight: 2.5,
    };
  } else {
    return {
      packageType: 'large_box',
      weight: 5.0,
    };
  }
}
```

---

### 3. Criar Validadores de Endereço

**Arquivo:** `apps/api/src/lib/addressValidator.ts`

```typescript
import { z } from 'zod';

/**
 * Schema Zod para validação de endereço
 */
export const addressSchema = z.object({
  street: z.string().min(1).max(200),
  number: z.string().max(20),
  complement: z.string().max(100).optional(),
  city: z.string().min(1).max(100),
  state: z.string().length(2).regex(/^[A-Z]{2}$/), // "RJ", "SP"
  zipCode: z.string().regex(/^\d{5}-?\d{3}$/), // "12345-678" ou "12345678"
  country: z.string().default('BR'),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  contactName: z.string().max(100).optional(),
  contactPhone: z.string().max(20).optional(),
  instructions: z.string().max(500).optional(),
});

export type AddressInput = z.infer<typeof addressSchema>;

/**
 * Valida e normaliza um endereço
 */
export function validateAndNormalizeAddress(input: unknown): AddressInput {
  return addressSchema.parse(input);
}

/**
 * Normaliza CEP (remove hífen)
 */
export function normalizeZipCode(zipCode: string): string {
  return zipCode.replace(/\D/g, '');
}

/**
 * Formata CEP (adiciona hífen)
 */
export function formatZipCode(zipCode: string): string {
  const clean = normalizeZipCode(zipCode);
  return `${clean.substring(0, 5)}-${clean.substring(5)}`;
}
```

---

### 4. Criar Enums e Types

**Arquivo:** `apps/api/src/types/delivery.types.ts`

```typescript
export const DeliveryRequestStatus = {
  PENDING: 'pending',
  ASSIGNED: 'assigned',
  ACCEPTED: 'accepted',
  PICKED_UP: 'picked_up',
  IN_TRANSIT: 'in_transit',
  DELIVERED: 'delivered',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  FAILED: 'failed',
} as const;

export type DeliveryRequestStatusType =
  (typeof DeliveryRequestStatus)[keyof typeof DeliveryRequestStatus];

export const PackageType = {
  ENVELOPE: 'envelope',
  SMALL_BOX: 'small_box',
  MEDIUM_BOX: 'medium_box',
  LARGE_BOX: 'large_box',
  FRAGILE: 'fragile',
  PERISHABLE: 'perishable',
  CUSTOM: 'custom',
} as const;

export type PackageTypeValue = (typeof PackageType)[keyof typeof PackageType];

export const VehicleType = {
  BIKE: 'bike',
  MOTORCYCLE: 'motorcycle',
  CAR: 'car',
  VAN: 'van',
  TRUCK: 'truck',
} as const;

export type VehicleTypeValue = (typeof VehicleType)[keyof typeof VehicleType];

export const PartnerStatus = {
  PENDING: 'pending',
  ACTIVE: 'active',
  PAUSED: 'paused',
  SUSPENDED: 'suspended',
  REJECTED: 'rejected',
} as const;

export type PartnerStatusValue =
  (typeof PartnerStatus)[keyof typeof PartnerStatus];

export const DeliveryProfileStatus = {
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  BANNED: 'banned',
  UNDER_REVIEW: 'under_review',
} as const;

export type DeliveryProfileStatusValue =
  (typeof DeliveryProfileStatus)[keyof typeof DeliveryProfileStatus];
```

---

### 5. Criar Testes Unitários

**Arquivo:** `apps/api/src/lib/deliveryCalculator.test.ts`

```typescript
import { describe, test, expect } from 'vitest';
import { calculateDeliveryFee, estimatePackageDetails } from './deliveryCalculator.js';
import { calculateDistance } from './geoUtils.js';

describe('calculateDistance', () => {
  test('should calculate distance between Rio Centro and Copacabana', () => {
    // Centro: -22.9068, -43.1729
    // Copacabana: -22.9653, -43.1802
    const distance = calculateDistance(-22.9068, -43.1729, -22.9653, -43.1802);
    expect(distance).toBeGreaterThan(5);
    expect(distance).toBeLessThan(10);
  });

  test('should return 0 for same coordinates', () => {
    const distance = calculateDistance(-22.9068, -43.1729, -22.9068, -43.1729);
    expect(distance).toBe(0);
  });
});

describe('calculateDeliveryFee', () => {
  test('should calculate base fee correctly', async () => {
    const result = await calculateDeliveryFee({
      pickupAddress: {
        street: 'Rua A',
        number: '100',
        city: 'Rio de Janeiro',
        state: 'RJ',
        zipCode: '20000-000',
        lat: -22.9068,
        lng: -43.1729,
      },
      deliveryAddress: {
        street: 'Rua B',
        number: '200',
        city: 'Rio de Janeiro',
        state: 'RJ',
        zipCode: '22000-000',
        lat: -22.9653,
        lng: -43.1802,
      },
      packageType: 'small_box',
      weight: 1.0,
    });

    expect(result.totalBzr).toBeDefined();
    expect(result.distance).toBeGreaterThan(0);
    expect(result.breakdown.baseFee).toBe('5.00');
  });

  test('should add weight surcharge for heavy packages', async () => {
    const result = await calculateDeliveryFee({
      pickupAddress: {
        street: 'Rua A',
        number: '100',
        city: 'Rio de Janeiro',
        state: 'RJ',
        zipCode: '20000-000',
        lat: -22.9068,
        lng: -43.1729,
      },
      deliveryAddress: {
        street: 'Rua B',
        number: '200',
        city: 'Rio de Janeiro',
        state: 'RJ',
        zipCode: '22000-000',
        lat: -22.9653,
        lng: -43.1802,
      },
      packageType: 'large_box',
      weight: 5.0,
    });

    expect(parseFloat(result.breakdown.weightFee)).toBeGreaterThan(0);
  });
});

describe('estimatePackageDetails', () => {
  test('should return small_box for single item', () => {
    const items = [{ listingId: '1', qty: 1, kind: 'product' }];
    const result = estimatePackageDetails(items);
    expect(result.packageType).toBe('small_box');
    expect(result.weight).toBe(1.0);
  });

  test('should return large_box for many items', () => {
    const items = [
      { listingId: '1', qty: 2, kind: 'product' },
      { listingId: '2', qty: 3, kind: 'product' },
    ];
    const result = estimatePackageDetails(items);
    expect(result.packageType).toBe('large_box');
  });
});
```

---

### 6. Configurar Variáveis de Ambiente

**Arquivo:** `apps/api/.env`

**Adicionar:**

```env
# Delivery Settings
DELIVERY_BASE_FEE_BZR=5.00
DELIVERY_PER_KM_BZR=1.00
DELIVERY_WEIGHT_MULTIPLIER=0.50
DELIVERY_FREE_WEIGHT_KG=1.00
DELIVERY_AVG_SPEED_KM_H=20

# Delivery Timeouts
DELIVERY_TIMEOUT_PRIVATE_MS=120000  # 2 minutos para rede vinculada
DELIVERY_TIMEOUT_PUBLIC_MS=86400000 # 24 horas para rede aberta

# Feature Flags
FEATURE_DELIVERY_NETWORK=false
FEATURE_AUTO_CREATE_DELIVERY=false
```

**Arquivo:** `apps/api/src/env.ts`

**Adicionar validação:**

```typescript
// No objeto de validação do env, adicionar:

  // Delivery Settings
  DELIVERY_BASE_FEE_BZR: z.string().default('5.00'),
  DELIVERY_PER_KM_BZR: z.string().default('1.00'),
  DELIVERY_WEIGHT_MULTIPLIER: z.string().default('0.50'),
  DELIVERY_FREE_WEIGHT_KG: z.string().default('1.00'),
  DELIVERY_AVG_SPEED_KM_H: z.string().default('20'),
  DELIVERY_TIMEOUT_PRIVATE_MS: z.string().default('120000'),
  DELIVERY_TIMEOUT_PUBLIC_MS: z.string().default('86400000'),

  // Feature Flags
  FEATURE_DELIVERY_NETWORK: z.string().default('false'),
  FEATURE_AUTO_CREATE_DELIVERY: z.string().default('false'),
```

---

## VALIDAÇÃO

**Executar testes:**

```bash
cd apps/api
npm run test -- deliveryCalculator.test.ts
```

**Checklist:**

- [ ] Todos os testes passam
- [ ] `calculateDistance` retorna valores corretos
- [ ] `calculateDeliveryFee` calcula breakdown corretamente
- [ ] `estimatePackageDetails` funciona para diferentes quantidades
- [ ] Variáveis de ambiente carregadas no `env.ts`
- [ ] Types exportados de `delivery.types.ts`

---

## PRÓXIMA FASE

➡️ **FASE 3:** [API de Delivery - Rotas e Endpoints](FASE3_DELIVERY_API.md)

---

**FIM DA FASE 2**
