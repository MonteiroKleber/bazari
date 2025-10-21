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
  BAZARICHAIN_SUDO_SEED: z.string().default('//Alice'),
  // IPFS Multi-Node Configuration
  IPFS_API_URLS: z
    .string()
    .optional()
    .transform((val) => {
      if (!val || val.trim() === '') return [];
      return val.split(',').map((u) => u.trim()).filter((u) => u.length > 0);
    })
    .refine(
      (urls) => urls.every((u) => {
        try {
          new URL(u);
          return true;
        } catch {
          return false;
        }
      }),
      { message: 'IPFS_API_URLS deve conter URLs válidas separadas por vírgula' }
    ),
  IPFS_GATEWAY_URL: z.string().default('https://ipfs.io/ipfs/'),
  IPFS_TIMEOUT_MS: z.string().default('30000').transform((v) => Number(v)),
  IPFS_RETRY_ATTEMPTS: z.string().default('3').transform((v) => Number(v)),
  STORES_REGISTRY_ENABLED: z
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

  // OpenSearch config
  OPENSEARCH_NODE: z.string().default('http://localhost:9200'),
  OPENSEARCH_INDEX_STORES: z.string().default('bazari_stores'),

  // Redis config (BullMQ)
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // Delivery Network config
  DELIVERY_BASE_FEE: z.string().default('5.0').transform(Number),
  DELIVERY_FEE_PER_KM: z.string().default('1.5').transform(Number),
  DELIVERY_FEE_PER_KG: z.string().default('0.5').transform(Number),
  DELIVERY_MAX_SEARCH_RADIUS: z.string().default('50').transform(Number),
  DELIVERY_DEFAULT_SERVICE_RADIUS: z.string().default('10').transform(Number),
  DELIVERY_ESTIMATED_SPEED_KMH: z.string().default('30').transform(Number),
  DELIVERY_MIN_FEE: z.string().default('5.0').transform(Number),

  // Feature Flags
  FEATURE_AUTO_CREATE_DELIVERY: z
    .string()
    .optional()
    .transform((v) => (v ? /^true$/i.test(v) || v === '1' : false)),
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
