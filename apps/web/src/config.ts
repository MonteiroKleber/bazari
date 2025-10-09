// path: apps/web/src/config.ts

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function parseFlag(value: unknown): boolean {
  if (typeof value === 'string') {
    return /^true$/i.test(value);
  }
  if (typeof value === 'number') {
    return value === 1;
  }
  return Boolean(value);
}

export const FEATURE_FLAGS = {
  store_branded_v1: parseFlag(import.meta.env?.VITE_FLAG_STORE_BRANDED_V1 ?? false),
  store_ux_v2: parseFlag(import.meta.env?.VITE_FLAG_STORE_UX_V2 ?? false),
  store_onchain_v1: parseFlag(import.meta.env?.VITE_FLAG_STORE_ONCHAIN_V1 ?? true), // Ativada por padrão
} as const;
