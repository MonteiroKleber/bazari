// ===========================
// ENUMS
// ===========================

export enum DeliveryRequestStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  PICKED_UP = 'picked_up',
  IN_TRANSIT = 'in_transit',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

export enum PackageType {
  DOCUMENT = 'document',
  ENVELOPE = 'envelope',
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
  FRAGILE = 'fragile',
  PERISHABLE = 'perishable',
  CUSTOM = 'custom',
  // Legacy support - aceita valores antigos do banco de dados
  SMALL_BOX = 'small_box',
  MEDIUM_BOX = 'medium_box',
  LARGE_BOX = 'large_box',
}

export enum VehicleType {
  BIKE = 'bike',
  MOTORCYCLE = 'motorcycle',
  CAR = 'car',
  VAN = 'van',
}

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
export type TimeSlot = 'morning' | 'afternoon' | 'evening';

// ===========================
// CORE INTERFACES
// ===========================

export interface Address {
  zipCode: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood?: string;
  city: string;
  state: string;
  country?: string;
}

export interface ContactInfo {
  name: string;
  phone: string;
}

export interface DeliveryRequest {
  id: string;
  status: DeliveryRequestStatus;

  // Addresses
  pickupAddress: Address;
  pickupContact: ContactInfo;
  deliveryAddress: Address;
  deliveryContact: ContactInfo;

  // Package details
  packageType: PackageType;
  weight: number;
  specialInstructions?: string;

  // Calculated values
  distance: number;
  estimatedTime: number;
  totalBzr: string;
  breakdown: {
    baseFee: string;
    distanceFee: string;
    packageTypeFee: string;
    weightFee: string;
  };

  // Relations
  requesterId: string;
  delivererId?: string;
  orderId?: string;
  storeId?: string;

  // Deliverer info (populated)
  deliverer?: {
    fullName: string;
    phone: string;
    vehicleType: VehicleType;
    profilePhoto?: string;
  };

  // Timestamps
  createdAt: string;
  acceptedAt?: string;
  pickedUpAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
}

export interface DeliveryProfile {
  id: string;
  userId: string;

  // Personal info
  fullName: string;
  cpf: string;
  phone: string;
  baseAddress: Address;
  profilePhoto?: string;

  // Vehicle
  vehicleType: VehicleType;
  vehicleBrand?: string;
  vehicleModel?: string;
  vehiclePlate?: string;
  vehicleColor?: string;
  maxCapacityKg: number;

  // Availability
  isAvailable: boolean;
  radiusKm: number;
  availableDays: DayOfWeek[];
  availableTimeSlots: TimeSlot[];
  acceptsImmediateDeliveries: boolean;

  // Stats (for UI)
  activeDeliveries?: number;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface StoreDeliveryPartner {
  id: string;
  storeId: string;
  deliveryProfileId: string;
  priority: number;
  isActive: boolean;

  // Populated deliverer info
  deliveryProfile: {
    fullName: string;
    phone: string;
    vehicleType: VehicleType;
    radiusKm: number;
    profilePhoto?: string;
  };

  // Stats (if available)
  stats?: {
    totalDeliveries: number;
    completionRate: number;
    averageRating: number;
  };

  createdAt: string;
  updatedAt: string;
}

export interface DeliveryFeeResult {
  totalBzr: string;
  distance: number;
  estimatedTime: number;
  breakdown: {
    baseFee: string;
    distanceFee: string;
    packageTypeFee: string;
    weightFee: string;
  };
}

export interface DeliveryProfileStats {
  todayDeliveries: number;
  todayEarnings: string;
  completionRate: number;
  totalCompleted: number;
  totalDeliveries: number;
  averageRating: number;
  totalRatings: number;
  weeklyDeliveries: Array<{
    day: string;
    count: number;
  }>;
  weeklyKm: number;
  weeklyEarnings: string;
}

// ===========================
// API PAYLOADS
// ===========================

export interface CalculateFeePayload {
  pickupAddress: Address;
  deliveryAddress: Address;
  packageType: PackageType;
  weight: number;
}

export interface CreateDeliveryRequestPayload {
  pickupAddress: Address;
  pickupContact: ContactInfo;
  deliveryAddress: Address;
  deliveryContact: ContactInfo;
  packageType: PackageType;
  weight: number;
  specialInstructions?: string;
  orderId?: string;
  storeId?: string;
}

export interface CreateDeliveryProfilePayload {
  fullName: string;
  documentType: 'cpf' | 'cnpj' | 'passport';
  documentNumber: string;
  phoneNumber: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  vehicleType: VehicleType;
  vehiclePlate?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  vehicleColor?: string;
  maxWeight: number;
  maxVolume: number;
  canCarryFragile?: boolean;
  canCarryPerishable?: boolean;
  hasInsulatedBag?: boolean;
  serviceRadius?: number;
  serviceCities?: string[];
  serviceStates?: string[];
  walletAddress?: string;
}

export interface UpdateDeliveryProfilePayload {
  fullName?: string;
  phone?: string;
  baseAddress?: Address;
  profilePhoto?: string;
  vehicleBrand?: string;
  vehicleModel?: string;
  vehiclePlate?: string;
  vehicleColor?: string;
  maxCapacityKg?: number;
  radiusKm?: number;
  availableDays?: DayOfWeek[];
  availableTimeSlots?: TimeSlot[];
  acceptsImmediateDeliveries?: boolean;
}

export interface UpdateAvailabilityPayload {
  isAvailable: boolean;
}

export interface ConfirmPickupPayload {
  pickedUpAt?: string;
}

export interface ConfirmDeliveryPayload {
  deliveredAt?: string;
}

export interface CancelDeliveryPayload {
  cancelReason: string;
}

export interface UpdatePartnerPayload {
  priority?: number;
  isActive?: boolean;
}

export interface ListDeliveryRequestsQuery {
  status?: DeliveryRequestStatus[];
  delivererId?: string;
  requesterId?: string;
  storeId?: string;
  lat?: number;
  lng?: number;
  radius?: number;
}
