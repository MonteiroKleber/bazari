import { z } from 'zod';
import dotenv from 'dotenv';
import { resolve } from 'path';

// Carrega .env do diretório da API
dotenv.config({ path: resolve(process.cwd(), '.env') });

const envSchema = z.object({
  PORT: z.string().default('3000').transform(Number),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatório'),
  STORAGE_PROVIDER: z.enum(['fs', 's3']).default('fs'),
  
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