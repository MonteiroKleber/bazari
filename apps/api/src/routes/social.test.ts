import { describe, it, expect, beforeEach, vi } from 'vitest';
import Fastify from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { socialRoutes } from './social.js';

vi.mock('../lib/auth/jwt.js', () => ({
  verifyAccessToken: () => ({ sub: 'u1', address: 'SS58_USER1', type: 'access' }),
}));

class MockPrisma {
  profiles = new Map<string, any>(); // by id
  profilesByUser = new Map<string, any>(); // by userId
  follows: any[] = [];
  profile = {
    findUnique: async ({ where, select }: any) => {
      if (where.userId) return this.profilesByUser.get(where.userId) ?? null;
      if (where.handle) {
        for (const p of this.profiles.values()) if (p.handle === where.handle) return p;
        return null;
      }
      if (where.id) return this.profiles.get(where.id) ?? null;
      return null;
    },
    update: async ({ where, data }: any) => {
      const p = this.profiles.get(where.id);
      if (!p) throw new Error('profile not found');
      if (data.followersCount?.increment) p.followersCount += data.followersCount.increment;
      if (data.followersCount?.decrement) p.followersCount -= data.followersCount.decrement;
      if (data.followingCount?.increment) p.followingCount += data.followingCount.increment;
      if (data.followingCount?.decrement) p.followingCount -= data.followingCount.decrement;
      return p;
    },
  };
  follow = {
    create: async ({ data }: any) => {
      const exists = this.follows.find((f) => f.followerId === data.followerId && f.followingId === data.followingId);
      if (exists) {
        const err: any = new Error('Unique constraint failed');
        err.code = 'P2002';
        throw err;
      }
      const row = { id: `f_${this.follows.length + 1}`, createdAt: new Date(), ...data };
      this.follows.push(row);
      return row;
    },
    findUnique: async ({ where }: any) => {
      const { followerId, followingId } = where.followerId_followingId;
      return this.follows.find((f) => f.followerId === followerId && f.followingId === followingId) ?? null;
    },
    delete: async ({ where }: any) => {
      const idx = this.follows.findIndex((f) => f.id === where.id);
      if (idx >= 0) this.follows.splice(idx, 1);
    },
  };
  async $transaction<T>(fn: (tx: any) => Promise<T>) {
    return fn(this);
  }
}

describe('social follow/unfollow', () => {
  let app: ReturnType<typeof Fastify>;
  let prisma: MockPrisma;

  beforeEach(async () => {
    app = Fastify();
    prisma = new MockPrisma();
    const now = new Date();
    const p1 = { id: 'p1', userId: 'u1', handle: 'me', displayName: 'Me', followersCount: 0, followingCount: 0 };
    const p2 = { id: 'p2', userId: 'u2', handle: 'ana', displayName: 'Ana', followersCount: 0, followingCount: 0 };
    prisma.profiles.set('p1', p1);
    prisma.profiles.set('p2', p2);
    prisma.profilesByUser.set('u1', p1);
    prisma.profilesByUser.set('u2', p2);

    await app.register(socialRoutes, { prisma: prisma as unknown as PrismaClient });
    await app.ready();
  });

  it('follows and updates counters idempotently', async () => {
    const res = await app.inject({ method: 'POST', url: '/social/follow', payload: { targetHandle: 'ana' }, headers: { authorization: 'Bearer token' } });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe('following');

    // second time is idempotent
    const res2 = await app.inject({ method: 'POST', url: '/social/follow', payload: { targetHandle: 'ana' }, headers: { authorization: 'Bearer token' } });
    expect(res2.statusCode).toBe(200);
  });

  it('unfollows idempotently', async () => {
    await app.inject({ method: 'POST', url: '/social/follow', payload: { targetHandle: 'ana' }, headers: { authorization: 'Bearer token' } });
    const res = await app.inject({ method: 'POST', url: '/social/unfollow', payload: { targetHandle: 'ana' }, headers: { authorization: 'Bearer token' } });
    expect(res.statusCode).toBe(200);
    const res2 = await app.inject({ method: 'POST', url: '/social/unfollow', payload: { targetHandle: 'ana' }, headers: { authorization: 'Bearer token' } });
    expect(res2.statusCode).toBe(200);
  });
});

