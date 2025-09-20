import dotenv from 'dotenv';
import { resolve } from 'path';
import { z } from 'zod';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const authEnvSchema = z.object({
  JWT_SECRET: z.string().min(32, 'JWT_SECRET deve ter pelo menos 32 caracteres'),
  AUTH_DOMAIN: z.string().min(1, 'AUTH_DOMAIN é obrigatório'),
  AUTH_URI: z.string().min(1, 'AUTH_URI é obrigatório'),
  BAZARICHAIN_GENESIS_HASH: z.string().min(1, 'BAZARICHAIN_GENESIS_HASH é obrigatório'),
});

const parsed = authEnvSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(`Variáveis de ambiente de auth inválidas: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`);
}

const ACCESS_TOKEN_TTL_SECONDS = 30 * 60; // 30 minutos
const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 dias

export const authConfig = {
  jwtSecret: parsed.data.JWT_SECRET,
  domain: parsed.data.AUTH_DOMAIN,
  uri: parsed.data.AUTH_URI,
  genesisHash: parsed.data.BAZARICHAIN_GENESIS_HASH,
  accessTokenTtl: '30m',
  accessTokenExpiresInSeconds: ACCESS_TOKEN_TTL_SECONDS,
  refreshTokenTtl: '30d',
  refreshTokenExpiresInSeconds: REFRESH_TOKEN_TTL_SECONDS,
  refreshCookieName: 'bazari_refresh',
};

export type AuthConfig = typeof authConfig;
