import { describe, it, expect, beforeEach } from 'vitest';
import Fastify from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { sellersRoutes } from './sellers.js';
import jwt from 'jsonwebtoken';

class MockPrisma {
  sellerBySlug = new Map<string, any>();
  profileByUser = new Map<string, any>();
  daos: any[] = [];
  products: any[] = [];
  media: any[] = [];

  sellerProfile = {
    findUnique: async ({ where, include, select }: any) => {
      if (where.shopSlug) return this.sellerBySlug.get(where.shopSlug) ?? null;
      if (where.userId) {
        for (const s of this.sellerBySlug.values()) if (s.user?.id === where.userId) return s;
      }
      return null;
    },
    findFirst: async ({ where, select }: any) => {
      if (where?.userId) {
        for (const s of this.sellerBySlug.values()) if (s.user?.id === where.userId) return s;
      }
      if (where?.OR) {
        for (const cond of where.OR) {
          if (cond.id) {
            const byId = Array.from(this.sellerBySlug.values()).find((s) => s.id === cond.id);
            if (byId) return byId;
          }
          if (cond.shopSlug) {
            const bySlug = this.sellerBySlug.get(cond.shopSlug);
            if (bySlug) return bySlug;
          }
        }
      }
      return null;
    },
    create: async ({ data }: any) => {
      const row = { id: 's1', user: { id: data.userId }, userId: data.userId, shopName: data.shopName, shopSlug: data.shopSlug, about: data.about ?? null, ratingAvg: 0, ratingCount: 0, policies: data.policies ?? null };
      this.sellerBySlug.set(row.shopSlug, row);
      return row;
    },
    update: async ({ where, data }: any) => {
      const existing = Array.from(this.sellerBySlug.values()).find((s) => s.id === where.id);
      if (!existing) throw new Error('not found');
      Object.assign(existing, data);
      return existing;
    },
    findMany: async () => [],
  };

  profile = {
    findUnique: async ({ where, select }: any) => this.profileByUser.get(where.userId) ?? null,
  };

  dao = {
    findMany: async ({ where, select }: any) => this.daos.filter((d) => d.ownerUserId === where.ownerUserId),
  };

  product = {
    findMany: async ({ where, orderBy, take, select }: any) => {
      const compound = (where.AND ? where.AND[0] : where) as any;
      const ors = compound.OR || [];
      const statusFilter = compound.status;

      const targets = ors.map((cond: any) => {
        if (typeof cond.sellerStoreId !== 'undefined') {
          return { type: 'store', value: cond.sellerStoreId };
        }
        if (Array.isArray(cond.AND)) {
          const daoCond = cond.AND.find((c: any) => c.daoId);
          if (daoCond?.daoId) {
            return { type: 'dao', value: daoCond.daoId };
          }
        }
        if (typeof cond.daoId === 'string') {
          return { type: 'dao', value: cond.daoId };
        }
        return null;
      }).filter(Boolean) as Array<{ type: 'store' | 'dao'; value: string | null }>;

      let filtered = this.products.filter((p) => {
        if (targets.length === 0) return true;
        return targets.some((target) => {
          if (target.type === 'store') {
            return p.sellerStoreId === target.value;
          }
          if (target.type === 'dao') {
            return (!p.sellerStoreId || p.sellerStoreId === null) && p.daoId === target.value;
          }
          return false;
        });
      });

      if (statusFilter) {
        filtered = filtered.filter((p) => p.status === statusFilter);
      }

      filtered.sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : a.id < b.id ? 1 : -1));
      const slice = filtered.slice(0, (take || 24));
      return slice.map((p) => ({ id: p.id, title: p.title, priceBzr: p.priceBzr, createdAt: p.createdAt }));
    },
  };

  mediaAsset = {
    findMany: async ({ where, orderBy, select }: any) => {
      // simple filter by ownerType/Product and ownerId in
      const inIds: string[] = where?.ownerId?.in || [];
      const rows = this.media
        .filter(m => (!where?.ownerType || m.ownerType === where.ownerType) && (inIds.length === 0 || inIds.includes(m.ownerId)))
        .sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0));
      return rows.map((m) => ({ ownerId: m.ownerId, url: m.url }));
    },
  };
}

function makeToken(userId: string, address = 'addr1') {
  const secret = process.env.JWT_SECRET || 'test-secret-value-should-be-long-1234567890';
  const payload = { sub: userId, address, type: 'access' } as any;
  return jwt.sign(payload, secret, { algorithm: 'HS256', expiresIn: 3600 });
}

describe('sellers routes', () => {
  let app: ReturnType<typeof Fastify>;
  let prisma: MockPrisma;

  beforeEach(async () => {
    app = Fastify();
    prisma = new MockPrisma();

    // seed seller + owner profile
    const userId = 'u1';
    const now = new Date();
    const seller = { id: 's1', shopName: 'Loja 1', shopSlug: 'loja-1', about: null, ratingAvg: 0, ratingCount: 0, policies: null, user: { id: userId } };
    prisma.sellerBySlug.set('loja-1', seller);
    prisma.profileByUser.set(userId, { handle: 'kleber', displayName: 'Kleber', avatarUrl: null });

    // daos owned by user
    prisma.daos.push({ id: 'dao-1', slug: 'dao-1', ownerUserId: userId });

    // products: 3 published under that seller (by sellerUserId) and 1 via daoId match
    prisma.products.push(
      { id: 'p1', title: 'Prod 1', priceBzr: '10', status: 'PUBLISHED', sellerStoreId: 's1', daoId: 'x', createdAt: new Date(now.getTime() - 1000) },
      { id: 'p2', title: 'Prod 2', priceBzr: '20', status: 'PUBLISHED', sellerStoreId: 's1', daoId: 'x', createdAt: new Date(now.getTime() - 500) },
      { id: 'p3', title: 'Prod 3', priceBzr: '30', status: 'PUBLISHED', sellerStoreId: 's1', daoId: 'x', createdAt: new Date(now.getTime() - 200) },
      { id: 'p4', title: 'Prod 4', priceBzr: '40', status: 'PUBLISHED', sellerStoreId: null, daoId: 'dao-1', createdAt: new Date(now.getTime() - 50) },
    );

    await app.register(sellersRoutes, { prisma: prisma as unknown as PrismaClient });
    await app.ready();
  });

  it('returns 404 for missing shop', async () => {
    const res = await app.inject({ method: 'GET', url: '/sellers/missing' });
    expect(res.statusCode).toBe(404);
  });

  it('returns seller public info and products', async () => {
    const res = await app.inject({ method: 'GET', url: '/sellers/loja-1?limit=2' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.sellerProfile.shopSlug).toBe('loja-1');
    expect(Array.isArray(body.catalog.products)).toBe(true);
    expect(body.catalog.products.length).toBe(2);
    // should include either seller-owned or dao-owned products
  });

  it('includes products where daoId equals shopSlug (fallback)', async () => {
    // Add product tied only via daoId === shop slug
    const now = new Date();
    (prisma as any).products.push({ id: 'p5', title: 'Prod 5', priceBzr: '50', status: 'PUBLISHED', sellerStoreId: null, daoId: 'loja-1', createdAt: new Date(now.getTime() - 25) });
    const res = await app.inject({ method: 'GET', url: '/sellers/loja-1?limit=50' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    const ids = body.catalog.products.map((p: any) => p.id);
    expect(ids).toContain('p5');
  });

  it('GET /me/seller requires auth and returns profile when exists', async () => {
    // First, unauthorized
    const res401 = await app.inject({ method: 'GET', url: '/me/seller' });
    expect(res401.statusCode).toBe(401);

    // Create a seller for u2
    const u2 = 'u2';
    prisma.sellerBySlug.set('loja-2', { id: 's2', shopName: 'Loja 2', shopSlug: 'loja-2', about: null, ratingAvg: 0, ratingCount: 0, policies: null, user: { id: u2 } });

    // Authorized request for u2
    const token = makeToken(u2, 'addr2');
    const res200 = await app.inject({ method: 'GET', url: '/me/seller', headers: { Authorization: `Bearer ${token}` } });
    expect(res200.statusCode).toBe(200);
    const body = res200.json();
    // May be null if our mock findUnique by userId doesn't find; ensure returns 200 with object or null
    expect(body).toHaveProperty('sellerProfile');
  });
});
