/**
 * Tipos e Enums do Sistema de Delivery
 */

/**
 * Status de uma solicitação de entrega
 */
export enum DeliveryRequestStatus {
  PENDING = 'pending',
  SEARCHING = 'searching',
  ACCEPTED = 'accepted',
  PICKED_UP = 'picked_up',
  IN_TRANSIT = 'in_transit',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  FAILED = 'failed',
}

/**
 * Tipos de pacote/encomenda
 */
export enum PackageType {
  DOCUMENT = 'document',
  ENVELOPE = 'envelope',
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
  FRAGILE = 'fragile',
  PERISHABLE = 'perishable',
  CUSTOM = 'custom',
  // Legacy support (deprecated - use SMALL, MEDIUM, LARGE instead)
  SMALL_BOX = 'small_box',
  MEDIUM_BOX = 'medium_box',
  LARGE_BOX = 'large_box',
}

/**
 * Tipos de veículo do entregador
 */
export enum VehicleType {
  BIKE = 'bike',
  MOTORCYCLE = 'motorcycle',
  CAR = 'car',
  VAN = 'van',
  TRUCK = 'truck',
}

/**
 * Status de parceria entre loja e entregador
 */
export enum PartnerStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  PAUSED = 'paused',
  SUSPENDED = 'suspended',
  REJECTED = 'rejected',
}

/**
 * Status da conta do entregador
 */
export enum DeliveryProfileStatus {
  PENDING_VERIFICATION = 'pending_verification',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  BLOCKED = 'blocked',
}

/**
 * Tipo de documento de identificação
 */
export enum DocumentType {
  CPF = 'cpf',
  CNPJ = 'cnpj',
  PASSPORT = 'passport',
}

/**
 * Tipo de remetente
 */
export enum SenderType {
  STORE = 'store',
  PROFILE = 'profile',
}

/**
 * Origem da solicitação de entrega
 */
export enum SourceType {
  ORDER = 'order',
  DIRECT = 'direct',
}

/**
 * Dias da semana (para horários de trabalho)
 */
export const WEEKDAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

export type Weekday = (typeof WEEKDAYS)[number];

/**
 * Interface para coordenadas geográficas
 */
export interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * Interface para endereço completo
 */
export interface Address {
  street: string;
  number: string;
  complement?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  lat?: number;
  lng?: number;
  contactName?: string;
  contactPhone?: string;
  instructions?: string;
}

/**
 * Interface para detalhes do pacote
 */
export interface PackageDetails {
  packageType: string;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  isFragile?: boolean;
  isPerishable?: boolean;
  requiresInsulatedBag?: boolean;
}

/**
 * Interface para resultado do cálculo de frete
 */
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
 * Interface para critérios de busca de entregadores
 */
export interface DeliverySearchCriteria {
  pickupLat: number;
  pickupLng: number;
  deliveryLat: number;
  deliveryLng: number;
  distance: number;
  packageType: string;
  weight?: number;
  isFragile?: boolean;
  isPerishable?: boolean;
  maxSearchRadius?: number;
  preferredDeliverers?: string[];
  storeId?: bigint;
}

/**
 * Interface para match de entregador
 */
export interface DeliveryMatch {
  deliveryPersonId: string;
  distance: number;
  estimatedTime: number;
  rating: number;
  totalDeliveries: number;
  isPreferred: boolean;
  vehicleType: string;
}

/**
 * Interface para contato de emergência
 */
export interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

/**
 * Interface para estatísticas do entregador
 */
export interface DeliveryStats {
  totalDeliveries: number;
  completedDeliveries: number;
  cancelledDeliveries: number;
  avgRating: number;
  totalRatings: number;
  onTimeRate: number;
  acceptanceRate: number;
  completionRate: number;
  avgDeliveryTime: number | null;
  fastestDelivery: number | null;
  totalDistance: number;
  totalEarnings: string;
  pendingEarnings: string;
}

/**
 * Interface para prova de entrega
 */
export interface ProofOfDelivery {
  photoUrl?: string;
  signature?: string;
  recipientName?: string;
  recipientDocument?: string;
  notes?: string;
}

/**
 * Configurações de delivery (para .env)
 */
export interface DeliveryConfig {
  baseFee: number;
  feePerKm: number;
  feePerKg: number;
  maxSearchRadius: number;
  defaultServiceRadius: number;
  estimatedSpeedKmh: number;
  minDeliveryFee: number;
}

/**
 * Constantes de configuração padrão
 */
export const DEFAULT_DELIVERY_CONFIG: DeliveryConfig = {
  baseFee: 5.0,
  feePerKm: 1.5,
  feePerKg: 0.5,
  maxSearchRadius: 50,
  defaultServiceRadius: 10,
  estimatedSpeedKmh: 30,
  minDeliveryFee: 5.0,
};
