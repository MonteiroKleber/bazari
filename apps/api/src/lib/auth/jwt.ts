import type { FastifyReply } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';
import jwt, { type Secret, type SignOptions } from 'jsonwebtoken';
import { authConfig } from '../../config/auth.js';

const isProduction = process.env.NODE_ENV === 'production';

export const refreshCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: authConfig.refreshTokenExpiresInSeconds,
};

export interface AccessTokenPayload {
  sub: string;
  address: string;
  type: 'access';
}

export interface MinimalUser {
  id: string;
  address: string;
}

export interface RefreshTokenRecord {
  id: string;
  userId: string;
  tokenHash: string;
  createdAt: Date;
  revokedAt: Date | null;
}

export function issueAccessToken(user: MinimalUser) {
  const payload: AccessTokenPayload = {
    sub: user.id,
    address: user.address,
    type: 'access',
  };

  const signOptions: SignOptions = {
    expiresIn: authConfig.accessTokenExpiresInSeconds,
    algorithm: 'HS256',
  };

  const token = jwt.sign(payload, authConfig.jwtSecret as Secret, signOptions);

  return {
    token,
    expiresIn: authConfig.accessTokenExpiresInSeconds,
  };
}

export function hashRefreshToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function issueRefresh(
  reply: FastifyReply,
  prisma: PrismaClient,
  user: MinimalUser
): Promise<RefreshTokenRecord> {
  const refreshToken = randomUUID();
  const tokenHash = hashRefreshToken(refreshToken);

  const created = await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash,
    },
  });

  reply.setCookie(authConfig.refreshCookieName, refreshToken, refreshCookieOptions);

  return created as RefreshTokenRecord;
}

export async function rotateRefresh(
  reply: FastifyReply,
  prisma: PrismaClient,
  user: MinimalUser,
  previousToken: RefreshTokenRecord
) {
  if (!previousToken.revokedAt) {
    await prisma.refreshToken.update({
      where: { id: previousToken.id },
      data: { revokedAt: new Date() },
    });
  }

  return issueRefresh(reply, prisma, user);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const decoded = jwt.verify(token, authConfig.jwtSecret as Secret) as AccessTokenPayload;

    if (decoded.type !== 'access') {
      throw new Error('Tipo de token inválido.');
    }

    return decoded;
  } catch (error) {
    throw new Error('Token JWT inválido.');
  }
}
