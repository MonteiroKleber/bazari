import { z } from 'zod';
import dotenv from 'dotenv';
import { resolve } from 'path';

// Carrega .env do diretório da API
dotenv.config({ path: resolve(process.cwd(), '.env') });

const envSchema = z.object({
  PORT: z.string().default('3000').transform(Number),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatório'),
  STORAGE_PROVIDER: z.enum(['fs', 's3']).default('fs'),
  // Limites e paginação
  RATE_LIMIT_FOLLOW: z.string().default('30').transform((v) => Number(v)),
  RATE_LIMIT_POST: z.string().default('30').transform((v) => Number(v)),
  PAGE_SIZE_DEFAULT: z.string().default('20').transform((v) => Number(v)),
  BAZARICHAIN_WS: z.string().default('ws://127.0.0.1:9944'),
  IPFS_GATEWAY_URL: z.string().default('https://ipfs.io/ipfs/'),
  IPFS_TIMEOUT_MS: z.string().default('2000').transform((v) => Number(v)),
  STORES_REGISTRY_ENABLED: z
    .string()
    .optional()
    .transform((v) => (v ? /^true$/i.test(v) || v === '1' : false)),
  STORE_ONCHAIN_V1: z
    .string()
    .optional()
    .transform((v) => (v ? /^true$/i.test(v) || v === '1' : false)),
  STORE_REPUTATION_SURI: z
    .string()
    .optional()
    .transform((value) => {
      if (!value) return undefined;
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    }),
  STORE_REPUTATION_INTERVAL_MS: z
    .string()
    .optional()
    .transform((value) => {
      if (!value) return undefined;
      const trimmed = value.trim();
      if (trimmed.length === 0) return undefined;
      const num = Number(trimmed);
      if (!Number.isFinite(num) || num <= 0) {
        throw new Error('STORE_REPUTATION_INTERVAL_MS deve ser um número positivo');
      }
      return num;
    }),

  // S3 config (obrigatório apenas se STORAGE_PROVIDER === 's3')
  S3_REGION: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_PUBLIC_BASEURL: z.string().optional(),
}).refine(
  (data) => {
    if (data.STORAGE_PROVIDER === 's3') {
      return !!(
        data.S3_REGION &&
        data.S3_BUCKET &&
        data.S3_ACCESS_KEY_ID &&
        data.S3_SECRET_ACCESS_KEY &&
        data.S3_PUBLIC_BASEURL
      );
    }
    return true;
  },
  {
    message: 'Configurações S3 são obrigatórias quando STORAGE_PROVIDER=s3',
  }
);

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Erro nas variáveis de ambiente:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
