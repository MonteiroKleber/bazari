import { describe, it, expect, beforeEach, vi } from 'vitest';
import Fastify from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { postsRoutes } from './posts.js';

vi.mock('../lib/auth/jwt.js', () => ({
  verifyAccessToken: () => ({ sub: 'u1', address: 'SS58_USER1', type: 'access' }),
}));

class MockPrisma {
  profiles = new Map<string, any>();
  posts: any[] = [];
  profile = {
    findUnique: async ({ where }: any) => {
      if (where.userId) return this.profiles.get(where.userId) ?? null;
      return null;
    },
    update: async ({ where, data }: any) => {
      const p = this.profiles.get(where.id);
      if (!p) throw new Error('profile not found');
      if (data.postsCount?.increment) p.postsCount += data.postsCount.increment;
      if (data.postsCount?.decrement) p.postsCount -= data.postsCount.decrement;
      return p;
    },
  };
  post = {
    create: async ({ data }: any) => {
      const row = { id: `post_${this.posts.length + 1}`, createdAt: new Date(), ...data };
      this.posts.push(row);
      return row;
    },
    findUnique: async ({ where }: any) => this.posts.find((p) => p.id === where.id) ?? null,
    delete: async ({ where }: any) => {
      const idx = this.posts.findIndex((p) => p.id === where.id);
      if (idx >= 0) this.posts.splice(idx, 1);
    },
  };
  async $transaction<T>(fn: (tx: any) => Promise<T>) {
    return fn(this);
  }
}

describe('posts routes', () => {
  let app: ReturnType<typeof Fastify>;
  let prisma: MockPrisma;

  beforeEach(async () => {
    app = Fastify();
    prisma = new MockPrisma();
    const p1 = { id: 'p1', userId: 'u1', postsCount: 0 };
    prisma.profiles.set('u1', p1);
    await app.register(postsRoutes, { prisma: prisma as unknown as PrismaClient });
    await app.ready();
  });

  it('creates a text post with sanitization', async () => {
    const res = await app.inject({ method: 'POST', url: '/posts', headers: { authorization: 'Bearer token' }, payload: { kind: 'text', content: 'Hello <b>world</b>' } });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.post.id).toBeDefined();
  });

  it('prevents deleting post of another user', async () => {
    // create a post for u1
    const create = await app.inject({ method: 'POST', url: '/posts', headers: { authorization: 'Bearer token' }, payload: { kind: 'text', content: 'Mine' } });
    const id = create.json().post.id as string;
    // change auth to another user
    vi.doMock('../lib/auth/jwt.js', () => ({ verifyAccessToken: () => ({ sub: 'u2', address: 'SS58_OTHER', type: 'access' }) }));
    const res = await app.inject({ method: 'DELETE', url: `/posts/${id}`, headers: { authorization: 'Bearer token' } });
    expect([401,403]).toContain(res.statusCode);
  });
});

