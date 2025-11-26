import { z } from 'zod';

const oauthEnvSchema = z.object({
  GOOGLE_CLIENT_ID: z.string().min(1, 'GOOGLE_CLIENT_ID é obrigatório'),
  GOOGLE_CLIENT_SECRET: z.string().min(1, 'GOOGLE_CLIENT_SECRET é obrigatório'),
  GOOGLE_CALLBACK_URL: z.string().url('GOOGLE_CALLBACK_URL deve ser uma URL válida'),
  FRONTEND_AUTH_SUCCESS_URL: z.string().url('FRONTEND_AUTH_SUCCESS_URL deve ser uma URL válida'),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET deve ter pelo menos 32 caracteres'),
  ENCRYPTION_KEY: z.string().length(64, 'ENCRYPTION_KEY deve ter 64 caracteres (32 bytes em hex)'),
  SOCIAL_AUTH_MODE: z.enum(['managed_seed', 'mpc']).optional().default('managed_seed'),
});

const parsed = oauthEnvSchema.safeParse(process.env);

if (!parsed.success) {
  const errors = parsed.error.flatten().fieldErrors;
  throw new Error(`OAuth config inválida: ${JSON.stringify(errors)}`);
}

export const oauthConfig = {
  google: {
    clientID: parsed.data.GOOGLE_CLIENT_ID,
    clientSecret: parsed.data.GOOGLE_CLIENT_SECRET,
    callbackURL: parsed.data.GOOGLE_CALLBACK_URL,
  },
  session: {
    secret: parsed.data.SESSION_SECRET,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
    },
  },
  frontend: {
    successUrl: parsed.data.FRONTEND_AUTH_SUCCESS_URL,
  },
  encryption: {
    key: Buffer.from(parsed.data.ENCRYPTION_KEY, 'hex'),
  },
  mode: parsed.data.SOCIAL_AUTH_MODE,
};

export type OAuthConfig = typeof oauthConfig;
