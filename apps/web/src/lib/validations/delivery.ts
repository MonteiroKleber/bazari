import { z } from 'zod';
import { PackageType, VehicleType } from '@/types/delivery';

// ===========================
// ADDRESS SCHEMA
// ===========================

export const addressSchema = z.object({
  zipCode: z.string().min(8, 'CEP deve ter no mínimo 8 caracteres'),
  street: z.string().min(3, 'Rua deve ter no mínimo 3 caracteres'),
  number: z.string().min(1, 'Número é obrigatório'),
  complement: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().min(2, 'Cidade é obrigatória'),
  state: z.string().length(2, 'Estado deve ter 2 caracteres (ex: RJ)'),
  country: z.string().optional().default('BR'),
});

export const contactInfoSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  phone: z.string().min(10, 'Telefone deve ter no mínimo 10 caracteres'),
});

// ===========================
// PACKAGE DETAILS SCHEMA
// ===========================

export const packageDetailsSchema = z.object({
  packageType: z.nativeEnum(PackageType, {
    errorMap: () => ({ message: 'Tipo de pacote inválido' }),
  }),
  weight: z.number().min(0.1, 'Peso deve ser maior que 0').max(100, 'Peso máximo é 100kg'),
  specialInstructions: z.string().optional(),
});

// ===========================
// CREATE DELIVERY REQUEST SCHEMA
// ===========================

export const createDeliveryRequestSchema = z.object({
  pickupAddress: addressSchema,
  pickupContact: contactInfoSchema,
  deliveryAddress: addressSchema,
  deliveryContact: contactInfoSchema,
  packageType: z.nativeEnum(PackageType),
  weight: z.number().min(0.1).max(100),
  specialInstructions: z.string().optional(),
  orderId: z.string().optional(),
  storeId: z.string().optional(),
});

// ===========================
// DELIVERY PROFILE SCHEMAS
// ===========================

// Step 1: Personal Info
export const deliveryProfileStep1Schema = z.object({
  fullName: z.string().min(3, 'Nome completo deve ter no mínimo 3 caracteres'),
  cpf: z.string().min(11, 'CPF deve ter 11 dígitos').max(14, 'CPF inválido'),
  phone: z.string().min(10, 'Telefone deve ter no mínimo 10 caracteres'),
  baseAddress: addressSchema,
  profilePhoto: z.string().optional(),
});

// Step 2: Vehicle
export const deliveryProfileStep2Schema = z.object({
  vehicleType: z.nativeEnum(VehicleType, {
    errorMap: () => ({ message: 'Tipo de veículo inválido' }),
  }),
  vehicleBrand: z.string().optional(),
  vehicleModel: z.string().optional(),
  vehiclePlate: z.string().optional(),
  vehicleColor: z.string().optional(),
  maxCapacityKg: z.number().min(1, 'Capacidade deve ser maior que 0').max(500, 'Capacidade máxima é 500kg'),
});

// Step 3: Availability
export const deliveryProfileStep3Schema = z.object({
  radiusKm: z.number().min(1, 'Raio deve ser no mínimo 1km').max(50, 'Raio máximo é 50km'),
  availableDays: z
    .array(
      z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])
    )
    .min(1, 'Selecione ao menos um dia da semana'),
  availableTimeSlots: z
    .array(z.enum(['morning', 'afternoon', 'evening']))
    .min(1, 'Selecione ao menos um turno'),
  acceptsImmediateDeliveries: z.boolean(),
});

// Step 4: Terms (just validation)
export const deliveryProfileStep4Schema = z.object({
  agreedToTerms: z.boolean().refine((val) => val === true, {
    message: 'Você deve aceitar os termos de uso',
  }),
});

// Complete profile creation schema
export const createDeliveryProfileSchema = z.object({
  // Step 1
  fullName: z.string().min(3),
  cpf: z.string().min(11).max(14),
  phone: z.string().min(10),
  baseAddress: addressSchema,
  profilePhoto: z.string().optional(),

  // Step 2
  vehicleType: z.nativeEnum(VehicleType),
  vehicleBrand: z.string().optional(),
  vehicleModel: z.string().optional(),
  vehiclePlate: z.string().optional(),
  vehicleColor: z.string().optional(),
  maxCapacityKg: z.number().min(1).max(500),

  // Step 3
  radiusKm: z.number().min(1).max(50),
  availableDays: z
    .array(z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']))
    .min(1),
  availableTimeSlots: z.array(z.enum(['morning', 'afternoon', 'evening'])).min(1),
  acceptsImmediateDeliveries: z.boolean(),
});

// ===========================
// UPDATE SCHEMAS
// ===========================

export const updateDeliveryProfileSchema = createDeliveryProfileSchema.partial();

export const updateAvailabilitySchema = z.object({
  isAvailable: z.boolean(),
});

// ===========================
// CANCEL DELIVERY SCHEMA
// ===========================

export const cancelDeliverySchema = z.object({
  cancelReason: z.string().min(10, 'Motivo deve ter no mínimo 10 caracteres'),
});

// ===========================
// STORE PARTNER SCHEMAS
// ===========================

export const requestPartnershipSchema = z.object({
  deliveryProfileId: z.string().uuid('ID do perfil inválido'),
});

export const updatePartnerSchema = z.object({
  priority: z.number().min(1, 'Prioridade deve ser no mínimo 1').optional(),
  isActive: z.boolean().optional(),
});

// ===========================
// EXPORTS
// ===========================

export type AddressInput = z.infer<typeof addressSchema>;
export type ContactInfoInput = z.infer<typeof contactInfoSchema>;
export type PackageDetailsInput = z.infer<typeof packageDetailsSchema>;
export type CreateDeliveryRequestInput = z.infer<typeof createDeliveryRequestSchema>;
export type CreateDeliveryProfileInput = z.infer<typeof createDeliveryProfileSchema>;
export type UpdateDeliveryProfileInput = z.infer<typeof updateDeliveryProfileSchema>;
export type CancelDeliveryInput = z.infer<typeof cancelDeliverySchema>;
export type RequestPartnershipInput = z.infer<typeof requestPartnershipSchema>;
export type UpdatePartnerInput = z.infer<typeof updatePartnerSchema>;
