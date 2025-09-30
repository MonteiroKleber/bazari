import { describe, it, expect, beforeEach } from 'vitest';
import Fastify from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { meProductsRoutes } from './me.products.js';
import jwt from 'jsonwebtoken';

class MockPrisma {
  daos: any[] = [];
  products: any[] = [];
  mediaAsset = { updateMany: async () => {} } as any;
  dao = {
    findMany: async ({ where, select }: any) => this.daos.filter((d) => d.ownerUserId === where.ownerUserId),
    findFirst: async ({ where, select }: any) => this.daos.find((d) => d.ownerUserId === where.ownerUserId && (d.id === where.OR[0].id || d.slug === where.OR[1].slug)) || null,
  };
  product = {
    findMany: async ({ where, orderBy, take, select }: any) => {
      const ors = (where.AND ? where.AND[0] : where).OR || [];
      const statuses = (where.AND ? where.AND[0] : where).status;
      const targets = new Set<string>();
      for (const cond of ors) {
        if (cond.sellerUserId) targets.add(`user:${cond.sellerUserId}`);
        if (cond.sellerStoreId) targets.add(`store:${cond.sellerStoreId}`);
        if (cond.daoId?.in) for (const id of cond.daoId.in) targets.add(`dao:${id}`);
        if (typeof cond.daoId === 'string') targets.add(`dao:${cond.daoId}`);
      }
      let filtered = this.products.filter((p) =>
        targets.size === 0 ||
        targets.has(`user:${p.sellerUserId}`) ||
        targets.has(`store:${p.sellerStoreId}`) ||
        (!p.sellerStoreId && targets.has(`dao:${p.daoId}`))
      );
      if (statuses) filtered = filtered.filter((p) => p.status === statuses);
      filtered.sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : a.id < b.id ? 1 : -1));
      const slice = filtered.slice(0, (take || 20));
      return slice.map((p) => ({ id: p.id, title: p.title, priceBzr: p.priceBzr, status: p.status, categoryPath: p.categoryPath, updatedAt: p.updatedAt, createdAt: p.createdAt }));
    },
    findUnique: async ({ where, select }: any) => this.products.find((p) => p.id === where.id) || null,
    update: async ({ where, data, select }: any) => {
      const p = this.products.find((x) => x.id === where.id);
      if (!p) throw new Error('not found');
      Object.assign(p, data);
      return { id: p.id, status: p.status };
    },
  };
  sellerProfile = {
    findFirst: async ({ where }: any) => {
      const match = this.daos.find((d) => d.ownerUserId === where.userId);
      if (!match) return null;
      return { id: 'store-1', userId: match.ownerUserId };
    },
  };
  user = {
    findUnique: async ({ where }: any) => ({ id: where.id, address: 'addr1' }),
  };
}

function makeToken(userId: string) {
  const secret = process.env.JWT_SECRET || 'test-secret-value-should-be-long-1234567890';
  return jwt.sign({ sub: userId, address: 'addr1', type: 'access' } as any, secret, { algorithm: 'HS256', expiresIn: 3600 });
}

describe('me.products routes', () => {
  let app: ReturnType<typeof Fastify>;
  let prisma: MockPrisma;

  beforeEach(async () => {
    app = Fastify();
    prisma = new MockPrisma();
    const u = 'u1';
    prisma.daos.push({ id: 'dao-1', slug: 'my-dao', ownerUserId: u });
    const now = Date.now();
    prisma.products.push(
      { id: 'pa', title: 'A', priceBzr: '10', status: 'PUBLISHED', sellerUserId: u, sellerStoreId: 'store-1', daoId: 'dao-1', categoryPath: [], createdAt: new Date(now - 1000), updatedAt: new Date(now - 800) },
      { id: 'pb', title: 'B', priceBzr: '20', status: 'DRAFT', sellerUserId: u, sellerStoreId: 'store-1', daoId: 'dao-1', categoryPath: [], createdAt: new Date(now - 500), updatedAt: new Date(now - 400) },
    );
    await app.register(meProductsRoutes, { prisma: prisma as unknown as PrismaClient });
    await app.ready();
  });

  it('requires auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/me/products' });
    expect(res.statusCode).toBe(401);
  });

  it('lists my products', async () => {
    const token = makeToken('u1');
    const res = await app.inject({ method: 'GET', url: '/me/products?limit=10', headers: { Authorization: `Bearer ${token}` } });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body.items)).toBe(true);
    expect(body.items.length).toBeGreaterThan(0);
  });

  it('publishes and archives with ownership check', async () => {
    const token = makeToken('u1');
    const pub = await app.inject({ method: 'POST', url: '/me/products/pb/publish', headers: { Authorization: `Bearer ${token}` } });
    expect(pub.statusCode).toBe(200);
    const arc = await app.inject({ method: 'POST', url: '/me/products/pb/archive', headers: { Authorization: `Bearer ${token}` } });
    expect(arc.statusCode).toBe(200);
  });
});
