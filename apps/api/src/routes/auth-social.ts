// @ts-nocheck
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { OAuth2Client } from 'google-auth-library';
import { issueAccessToken, issueRefresh } from '../lib/auth/jwt.js';
import { oauthConfig } from '../config/oauth.js';
import { authOnRequest } from '../lib/auth/middleware.js';
import rateLimit from '@fastify/rate-limit';

const googleClient = new OAuth2Client(oauthConfig.google.clientID);

/**
 * Verifica e valida um Google ID Token
 * @param idToken - Token JWT do Google
 * @returns Payload do token verificado
 */
async function verifyGoogleToken(idToken: string) {
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: oauthConfig.google.clientID,
    });

    const payload = ticket.getPayload();

    if (!payload) {
      throw new Error('Payload vazio no ID token');
    }

    // Validar campos obrigatórios
    if (!payload.sub || !payload.email) {
      throw new Error('ID token inválido: faltando sub ou email');
    }

    return {
      sub: payload.sub,
      email: payload.email,
      name: payload.name || 'Usuário Google',
      picture: payload.picture || '',
    };
  } catch (error) {
    throw new Error(`Falha ao verificar token Google: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}

export default async function authSocialRoutes(fastify: FastifyInstance, options: { prisma: PrismaClient }) {
  const { prisma } = options;
  /**
   * POST /api/auth/google/verify
   * Verifica ID token do Google e cria/autentica usuário
   */
  fastify.post('/auth/google/verify', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = request.body as { idToken?: string; credential?: string; address?: string };
      const idToken = body.idToken || body.credential;

      if (!idToken) {
        return reply.code(400).send({
          error: 'ID token não fornecido',
          message: 'Envie idToken ou credential no body',
        });
      }

      // 1. Verificar token com Google
      const googleProfile = await verifyGoogleToken(idToken);

      // 2. Verificar se socialAccount já existe
      const existingSocial = await prisma.socialAccount.findUnique({
        where: {
          provider_providerId: {
            provider: 'google',
            providerId: googleProfile.sub,
          },
        },
        include: {
          user: true,
        },
      });

      let userId: string;
      let address: string;
      let isNewUser = false;

      if (existingSocial) {
        userId = existingSocial.userId;
        address = existingSocial.user.address;
      } else {
        // Novo usuário social: precisa do address enviado pelo cliente (gerado client-side)
        if (!body.address) {
          return reply.code(400).send({
            error: 'Address ausente',
            message: 'Envie o address gerado no cliente para vincular à conta social',
          });
        }

        const newUser = await prisma.$transaction(async (tx) => {
          const user = await tx.user.create({
            data: {
              address: body.address!,
            },
          });

          await tx.socialAccount.create({
            data: {
              userId: user.id,
              provider: 'google',
              providerId: googleProfile.sub,
              email: googleProfile.email,
              name: googleProfile.name,
              picture: googleProfile.picture,
            },
          });

          return user;
        });

        userId = newUser.id;
        address = newUser.address;
        isNewUser = true;
      }

      // Verificar se já existe backup (managedWallet) para definir isNewUser com base no blob
      const managedWallet = await prisma.managedWallet.findUnique({
        where: { userId },
        select: { encryptedMnemonic: true },
      });

      if (!managedWallet) {
        isNewUser = true;
      }

      // 3. Emitir JWT
      const accessToken = issueAccessToken({
        id: userId,
        address,
      });

      await issueRefresh(reply, prisma, {
        id: userId,
        address,
      });

      // 4. Retornar resposta
      return reply.code(200).send({
        success: true,
        isNewUser,
        user: {
          id: userId,
          address,
          googleId: googleProfile.sub, // Para validação de ownership no frontend
        },
        accessToken: accessToken.token,
        expiresIn: accessToken.expiresIn,
      });
    } catch (error) {
      // Log completo do erro
      console.error('🔴 ERRO COMPLETO NO GOOGLE LOGIN:', error);
      console.error('🔴 Tipo do erro:', typeof error);
      console.error('🔴 JSON do erro:', JSON.stringify(error, null, 2));

      (fastify.log as any).error('Erro no Google login:', error);

      // Log detalhado do erro para debug
      if (error instanceof Error) {
        (fastify.log as any).error('Error name:', error.name);
        (fastify.log as any).error('Error message:', error.message);
        (fastify.log as any).error('Error stack:', error.stack);
      } else {
        (fastify.log as any).error('Erro não é instância de Error:', error);
      }

      const message = error instanceof Error ? error.message : 'Erro desconhecido ao processar login social';

      return reply.code(500).send({
        error: 'Erro ao processar login social',
        message,
      });
    }
  });

  /**
   * GET /api/auth/google/status
   * Retorna status do OAuth (para debug)
   */
  fastify.get('/auth/google/status', async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.code(200).send({
      configured: true,
      clientId: oauthConfig.google.clientID,
      callbackURL: oauthConfig.google.callbackURL,
      mode: oauthConfig.mode,
    });
  });

  // Backup cifrado (client-side) - salvar blob opaco
  fastify.post('/auth/social/backup', {
    onRequest: authOnRequest,
    config: {
      rateLimit: {
        max: 10, // máximo 10 requests
        timeWindow: '1 minute' // por minuto
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const authUser = (request as any).authUser;
      const userId = authUser?.sub;
      if (!userId) {
        return reply.code(401).send({ error: 'Unauthorized', message: 'Invalid or missing authentication token' });
      }

      const body = request.body as { encryptedMnemonic?: string; iv?: string; salt?: string; authTag?: string; iterations?: number; address?: string };
      if (!body.encryptedMnemonic || !body.iv || !body.salt || !body.authTag || !body.address || !body.iterations) {
        return reply.code(400).send({ error: 'Missing fields', message: 'encryptedMnemonic, iv, salt, authTag, iterations, address são obrigatórios' });
      }

      const existingWallet = await prisma.managedWallet.findUnique({
        where: { userId },
        select: { id: true },
      });

      if (existingWallet) {
        await prisma.managedWallet.update({
          where: { id: existingWallet.id },
          data: {
            encryptedMnemonic: body.encryptedMnemonic,
            iv: body.iv,
            salt: body.salt,
            authTag: body.authTag,
            address: body.address,
            sentToClient: true,
            isPinSetup: true,
          },
        });
      } else {
        await prisma.managedWallet.create({
          data: {
            encryptedMnemonic: body.encryptedMnemonic,
            iv: body.iv,
            salt: body.salt,
            authTag: body.authTag,
            address: body.address,
            sentToClient: true,
            isPinSetup: true,
            user: {
              connect: { id: userId },
            },
          },
        });
      }

      return reply.code(200).send({ success: true });
    } catch (error) {
      console.error('🔴 Erro no POST /auth/social/backup:', error);
      fastify.log.error('Erro ao salvar backup social:', error);
      return reply.code(500).send({ error: 'Erro ao salvar backup social', message: error instanceof Error ? error.message : 'Erro desconhecido' });
    }
  });

  // Recuperar backup cifrado (blob opaco)
  fastify.get('/auth/social/wallet', {
    onRequest: authOnRequest,
    config: {
      rateLimit: {
        max: 20, // máximo 20 requests
        timeWindow: '1 minute' // por minuto
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const authUser = (request as any).authUser;
      const userId = authUser?.sub;
      if (!userId) {
        return reply.code(401).send({ error: 'Unauthorized', message: 'Invalid or missing authentication token' });
      }

      const wallet = await prisma.managedWallet.findUnique({
        where: { userId },
      });

      if (!wallet) {
        return reply.code(404).send({ error: 'Wallet not found', message: 'No backup found for this user' });
      }

      return reply.code(200).send({
        success: true,
        wallet: {
          encryptedMnemonic: wallet.encryptedMnemonic,
          iv: wallet.iv,
          salt: wallet.salt,
          authTag: wallet.authTag,
          address: wallet.address,
          iterations: 150000,
        },
      });
    } catch (error) {
      console.error('🔴 Erro no GET /auth/social/wallet:', error);
      fastify.log.error('Erro ao buscar backup social:', error);
      return reply.code(500).send({ error: 'Erro ao buscar backup social', message: error instanceof Error ? error.message : 'Erro desconhecido' });
    }
  });

  /**
   * POST /api/auth/social/setup-pin
   * Configurar PIN para usuário OAuth (re-criptografia)
   * REQUER AUTENTICAÇÃO JWT
   * Body: { pinHash: string (SHA-256 hex), googleId: string }
   */
  fastify.post('/auth/social/setup-pin', {
    onRequest: authOnRequest,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = request.body as { pinHash?: string; googleId?: string };

      if (!body.pinHash || !body.googleId) {
        return reply.code(400).send({
          error: 'Missing required fields',
          message: 'pinHash and googleId are required',
        });
      }

      // Validar formato do pinHash (64 caracteres hex - SHA-256)
      if (!/^[a-f0-9]{64}$/i.test(body.pinHash)) {
        return reply.code(400).send({
          error: 'Invalid PIN hash format',
          message: 'PIN hash must be 64 hex characters (SHA-256)',
        });
      }

      // Extrair userId do JWT autenticado
      const authUser = (request as any).authUser;
      const userId = authUser?.sub;
      if (!userId) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Invalid or missing authentication token',
        });
      }

      // 1. Buscar ManagedWallet do usuário via SocialAccount
      const socialAccount = await prisma.socialAccount.findUnique({
        where: {
          provider_providerId: {
            provider: 'google',
            providerId: body.googleId,
          },
        },
        include: {
          user: {
            include: {
              managedWallet: true,
            },
          },
        },
      });

      if (!socialAccount || !socialAccount.user.managedWallet) {
        return reply.code(404).send({
          error: 'Wallet not found',
          message: 'No managed wallet found for this Google account',
        });
      }

      // SEGURANÇA: Validar ownership - googleId deve pertencer ao userId autenticado
      if (socialAccount.userId !== userId) {
        console.warn(`⚠️ [Security] Tentativa de acesso cruzado: userId=${userId}, googleId=${body.googleId}, owner=${socialAccount.userId}`);
        return reply.code(403).send({
          error: 'Forbidden',
          message: 'You do not have permission to configure this wallet',
        });
      }

      const managedWallet = socialAccount.user.managedWallet;

      // 2. Descriptografar mnemonic com server key
      const { decryptMnemonic, encryptMnemonicWithPin } = await import('../lib/auth/encryption.js');

      const mnemonic = decryptMnemonic({
        encrypted: managedWallet.encryptedMnemonic,
        iv: managedWallet.iv,
        salt: managedWallet.salt,
        authTag: managedWallet.authTag,
      });

      // 3. Re-criptografar com PIN do usuário
      const pinEncrypted = encryptMnemonicWithPin(mnemonic, body.pinHash);

      // 4. Retornar dados re-criptografados + marcar isPinSetup = true
      await prisma.managedWallet.update({
        where: { id: managedWallet.id },
        data: { isPinSetup: true },
      });

      return reply.code(200).send({
        success: true,
        wallet: {
          encryptedMnemonic: pinEncrypted.encrypted,
          iv: pinEncrypted.iv,
          salt: pinEncrypted.salt,
          authTag: pinEncrypted.authTag,
          address: managedWallet.address,
          iterations: 150000, // Explícito para o frontend salvar corretamente
          format: 'base64', // Documentar formato para compatibilidade
        },
      });
    } catch (error) {
      console.error('🔴 Erro no setup-pin:', error);
      fastify.log.error('Erro no setup-pin:', error);

      const message = error instanceof Error ? error.message : 'Erro desconhecido ao configurar PIN';

      return reply.code(500).send({
        error: 'Erro ao configurar PIN',
        message,
      });
    }
  });
}
