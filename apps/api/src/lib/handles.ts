// Helpers de validação para handle/slug e blocklist
import { z } from 'zod';

export const HANDLE_SLUG_REGEX = /^[a-z0-9](?:[a-z0-9._-]{1,28}[a-z0-9])?$/;

export const RESERVED_BLOCKLIST = [
  'admin',
  'support',
  'bazari',
  'root',
  'system',
  'null',
  'undefined',
];

export function isReserved(value: string): boolean {
  const v = value.toLowerCase();
  return RESERVED_BLOCKLIST.includes(v);
}

export function validateHandle(value: string) {
  const schema = z
    .string()
    .min(3)
    .max(30)
    .regex(HANDLE_SLUG_REGEX, 'Formato inválido')
    .refine((v) => !isReserved(v), 'Termo reservado');

  return schema.parse(value);
}

export function validateSlug(value: string) {
  // mesma regra do handle
  const schema = z
    .string()
    .min(3)
    .max(30)
    .regex(HANDLE_SLUG_REGEX, 'Formato inválido')
    .refine((v) => !isReserved(v), 'Termo reservado');

  return schema.parse(value);
}

