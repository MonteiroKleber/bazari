import { beforeAll, beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('@fastify/rate-limit', () => ({
  default: async () => {},
  __esModule: true,
}));
import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import { randomUUID } from 'node:crypto';
import { cryptoWaitReady, sr25519PairFromSeed, sr25519Sign, encodeAddress } from '@polkadot/util-crypto';
import { buildMessage } from '@bazari/siws-utils';
import { stringToU8a, u8aToHex } from '@polkadot/util';
import { authRoutes } from './auth.js';
import type { PrismaClient } from '@prisma/client';

interface AuthNonceRecord {
  id: string;
  address: string;
  nonce: string;
  domain: string;
  uri: string;
  genesis: string;
  issuedAt: Date;
  expiresAt: Date;
  usedAt: Date | null;
}

interface RefreshTokenRecord {
  id: string;
  userId: string;
  tokenHash: string;
  createdAt: Date;
  revokedAt: Date | null;
}

interface UserRecord {
  id: string;
  address: string;
  createdAt: Date;
  updatedAt: Date;
}

class MockPrisma {
  authNonceData: AuthNonceRecord[] = [];
  refreshTokens: RefreshTokenRecord[] = [];
  users = new Map<string, UserRecord>();

  authNonce = {
    create: async ({ data }: { data: Omit<AuthNonceRecord, 'id'> }) => {
      const record: AuthNonceRecord = { id: randomUUID(), ...data };
      this.authNonceData.push(record);
      return record;
    },
    findUnique: async ({ where }: { where: { nonce?: string } }) => {
      if (where.nonce) {
        return this.authNonceData.find((record) => record.nonce === where.nonce) ?? null;
      }
      return null;
    },
    update: async ({ where, data }: { where: { id: string }; data: Partial<AuthNonceRecord> }) => {
      const record = this.authNonceData.find((item) => item.id === where.id);
      if (!record) {
        throw new Error('AuthNonce not found');
      }
      Object.assign(record, data);
      return record;
    },
  };

  user = {
    upsert: async ({ where, create }: { where: { address: string }; create: { address: string }; update: Record<string, never> }) => {
      const existing = this.users.get(where.address);
      if (existing) {
        existing.updatedAt = new Date();
        return existing;
      }
      const now = new Date();
      const record: UserRecord = {
        id: randomUUID(),
        address: create.address,
        createdAt: now,
        updatedAt: now,
      };
      this.users.set(create.address, record);
      return record;
    },
    findUnique: async ({ where }: { where: { id: string } }) => {
      for (const value of this.users.values()) {
        if (value.id === where.id) {
          return value;
        }
      }
      return null;
    },
  };

  refreshToken = {
    create: async ({ data }: { data: Omit<RefreshTokenRecord, 'id' | 'createdAt' | 'revokedAt'> }) => {
      const record: RefreshTokenRecord = {
        id: randomUUID(),
        createdAt: new Date(),
        revokedAt: null,
        ...data,
      };
      this.refreshTokens.push(record);
      return record;
    },
    findUnique: async ({ where }: { where: { tokenHash: string } }) => {
      return this.refreshTokens.find((record) => record.tokenHash === where.tokenHash) ?? null;
    },
    update: async ({ where, data }: { where: { id: string }; data: Partial<RefreshTokenRecord> }) => {
      const record = this.refreshTokens.find((item) => item.id === where.id);
      if (!record) {
        throw new Error('RefreshToken not found');
      }
      Object.assign(record, data);
      return record;
    },
  };
}

type AppWithPrisma = {
  app: ReturnType<typeof Fastify>;
  prisma: MockPrisma;
};

async function buildTestApp(): Promise<AppWithPrisma> {
  const app = Fastify();
  await app.register(cookie);
  const prisma = new MockPrisma();
  await app.register(authRoutes, { prisma: prisma as unknown as PrismaClient });
  await app.ready();
  return { app, prisma };
}

interface KeyPair {
  address: string;
  publicKey: Uint8Array;
  secretKey: Uint8Array;
}

let primaryPair: KeyPair;
let secondaryPair: KeyPair;

beforeAll(async () => {
  await cryptoWaitReady();
  const createPair = (seedByte: number): KeyPair => {
    const seed = new Uint8Array(32).fill(seedByte);
    const pair = sr25519PairFromSeed(seed);
    return {
      address: encodeAddress(pair.publicKey, 42),
      publicKey: pair.publicKey,
      secretKey: pair.secretKey,
    };
  };
  primaryPair = createPair(1);
  secondaryPair = createPair(2);
});

describe('auth routes integration', () => {
  let app: ReturnType<typeof Fastify>;
  let prisma: MockPrisma;

  beforeEach(async () => {
    const built = await buildTestApp();
    app = built.app;
    prisma = built.prisma;
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  const signMessage = (message: string, pair: KeyPair) => {
    const signature = sr25519Sign(stringToU8a(message), {
      publicKey: pair.publicKey,
      secretKey: pair.secretKey,
    });
    return u8aToHex(signature);
  };

  it('issues nonce and applies rate limiting per address', async () => {
    const firstResponse = await app.inject({ method: 'GET', url: `/auth/nonce?address=${primaryPair.address}` });
    expect(firstResponse.statusCode).toBe(200);
    expect(prisma.authNonceData).toHaveLength(1);

    for (let i = 0; i < 4; i += 1) {
      const res = await app.inject({ method: 'GET', url: `/auth/nonce?address=${primaryPair.address}` });
      expect(res.statusCode).toBe(200);
    }

    const limited = await app.inject({ method: 'GET', url: `/auth/nonce?address=${primaryPair.address}` });
    expect(limited.statusCode).toBe(429);
  });

  async function loginWithFreshNonce(pair: KeyPair = secondaryPair) {
    const nonceResponse = await app.inject({ method: 'GET', url: `/auth/nonce?address=${pair.address}` });
    const nonceBody = nonceResponse.json();
    const message = buildMessage({
      address: pair.address,
      domain: nonceBody.domain,
      uri: nonceBody.uri,
      genesisHash: nonceBody.genesisHash,
      nonce: nonceBody.nonce,
      issuedAt: nonceBody.issuedAt,
      expiresAt: nonceBody.expiresAt,
    });
    const signature = signMessage(message, pair);

    const loginResponse = await app.inject({
      method: 'POST',
      url: '/auth/login-siws',
      payload: {
        address: pair.address,
        message,
        signature,
      },
    });

    return { loginResponse, message, nonceBody, pair };
  }

  const getCookieValue = (header?: string | string[]) => {
    if (!header) return undefined;
    const value = Array.isArray(header) ? header[0] : header;
    return value.split(';')[0];
  };

  it('handles valid login, rejects tampered and expired signatures', async () => {
    const { loginResponse, pair } = await loginWithFreshNonce();
    expect(loginResponse.statusCode).toBe(200);
    const loginBody = loginResponse.json();
    expect(loginBody.user.address).toBe(pair.address);
    const refreshCookieRecord = loginResponse.cookies?.find((cookie) => cookie.name === 'bazari_refresh');
    const cookieFromHeader = refreshCookieRecord
      ? `${refreshCookieRecord.name}=${refreshCookieRecord.value}`
      : getCookieValue(loginResponse.headers['set-cookie']);
    expect(cookieFromHeader).toContain('bazari_refresh');

    const nonceResponse = await app.inject({ method: 'GET', url: `/auth/nonce?address=${pair.address}` });
    const nonceBody = nonceResponse.json();
    const validMessage = buildMessage({
      address: pair.address,
      domain: nonceBody.domain,
      uri: nonceBody.uri,
      genesisHash: nonceBody.genesisHash,
      nonce: nonceBody.nonce,
      issuedAt: nonceBody.issuedAt,
      expiresAt: nonceBody.expiresAt,
    });
    const tamperedSignature = `${signMessage(validMessage, pair).slice(0, -2)}ff`;
    const invalidLogin = await app.inject({
      method: 'POST',
      url: '/auth/login-siws',
      payload: {
        address: pair.address,
        message: validMessage,
        signature: tamperedSignature,
      },
    });
    expect(invalidLogin.statusCode).toBe(401);

    const nonceEntry = prisma.authNonceData[prisma.authNonceData.length - 1];
    nonceEntry.issuedAt = new Date(Date.now() - 10 * 60 * 1000);
    nonceEntry.expiresAt = new Date(Date.now() - 5 * 60 * 1000);
    const expiredMessage = buildMessage({
      address: pair.address,
      domain: nonceEntry.domain,
      uri: nonceEntry.uri,
      genesisHash: nonceEntry.genesis,
      nonce: nonceEntry.nonce,
      issuedAt: nonceEntry.issuedAt.toISOString(),
      expiresAt: nonceEntry.expiresAt.toISOString(),
    });
    const expiredSignature = signMessage(expiredMessage, pair);
    const expiredLogin = await app.inject({
      method: 'POST',
      url: '/auth/login-siws',
      payload: {
        address: pair.address,
        message: expiredMessage,
        signature: expiredSignature,
      },
    });
    expect(expiredLogin.statusCode).toBe(401);
  });

  it('rotates refresh tokens on refresh endpoint', async () => {
    const { loginResponse, pair } = await loginWithFreshNonce(secondaryPair);
    const refreshCookie = loginResponse.cookies?.[0]
      ? `${loginResponse.cookies[0].name}=${loginResponse.cookies[0].value}`
      : getCookieValue(loginResponse.headers['set-cookie']);
    expect(refreshCookie).toBeDefined();

    const refreshResponse = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      headers: {
        cookie: refreshCookie,
      },
    });

    expect(refreshResponse.statusCode).toBe(200);
    expect(prisma.refreshTokens.length).toBe(2);
    expect(prisma.refreshTokens[0].revokedAt).toBeInstanceOf(Date);

    const newCookieRecord = refreshResponse.cookies?.find((cookie) => cookie.name === 'bazari_refresh');
    const newCookie = newCookieRecord
      ? `${newCookieRecord.name}=${newCookieRecord.value}`
      : getCookieValue(refreshResponse.headers['set-cookie']);
    expect(newCookie).toBeDefined();
    expect(newCookie).not.toBe(refreshCookie);
    expect(prisma.refreshTokens[1].userId).toBe(prisma.refreshTokens[0].userId);
  });
});
