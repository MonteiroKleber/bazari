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
