import { describe, it, expect, beforeEach } from 'vitest';
import Fastify from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { profilesRoutes } from './profiles.js';

class MockPrisma {
  profiles = new Map<string, any>(); // key by handle
  profilesByUser = new Map<string, any>(); // key by userId
  sellersByUser = new Map<string, any>();
  follows: any[] = [];
  posts: any[] = [];

  profile = {
    findUnique: async ({ where, select }: any) => {
      if (where.handle) return this.profiles.get(where.handle) ?? null;
      if (where.userId) return this.profilesByUser.get(where.userId) ?? null;
      if (where.id) {
        for (const p of this.profiles.values()) if (p.id === where.id) return p;
      }
      return null;
    },
    update: async () => null,
  };
  sellerProfile = {
    findUnique: async ({ where, select }: any) => this.sellersByUser.get(where.userId) ?? null,
  };
  follow = {
    findMany: async ({ where, orderBy, take, select }: any) => {
      const list = this.follows.filter((f) =>
        (where.followingId ? f.followingId === where.followingId : true) &&
        (where.followerId ? f.followerId === where.followerId : true)
      );
      // order desc by createdAt then id
      list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : a.id < b.id ? 1 : -1));
      const sliced = list.slice(0, take || 5);
      // map to shape
      return sliced.map((row) => ({
        id: row.id,
        createdAt: row.createdAt,
        follower: this._selectProfile(row.followerId, select?.follower?.select),
        following: this._selectProfile(row.followingId, select?.following?.select),
      }));
    },
    findUnique: async ({ where }: any) => {
      const key = `${where.followerId_followingId.followerId}:${where.followerId_followingId.followingId}`;
      return this.follows.find((f) => `${f.followerId}:${f.followingId}` === key) ?? null;
    },
  };
  post = {
    findMany: async ({ where, orderBy, take, select }: any) => {
      const list = this.posts.filter((p) => p.authorId === where.authorId);
      list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : a.id < b.id ? 1 : -1));
      const sliced = list.slice(0, (take || 2));
      return sliced.map((p) => ({ id: p.id, kind: p.kind, content: p.content, media: p.media, createdAt: p.createdAt }));
    },
  };

  _selectProfile(id: string, select?: any) {
    const prof = Array.from(this.profiles.values()).find((p) => p.id === id);
    if (!prof) return null;
    const out: any = {};
    for (const key of Object.keys(select || {})) {
      out[key] = prof[key];
    }
    return out;
  }
}

describe('profiles routes (public)', () => {
  let app: ReturnType<typeof Fastify>;
  let prisma: MockPrisma;

  beforeEach(async () => {
    app = Fastify();
    prisma = new MockPrisma();
    // seed profiles
    const now = new Date();
    const kleber = { id: 'p1', userId: 'u1', handle: 'kleber', displayName: 'Kleber', bio: null, avatarUrl: null, bannerUrl: null, externalLinks: null, followersCount: 1, followingCount: 0, postsCount: 1, createdAt: now, updatedAt: now };
    const ana = { id: 'p2', userId: 'u2', handle: 'ana', displayName: 'Ana', bio: null, avatarUrl: null, bannerUrl: null, externalLinks: null, followersCount: 0, followingCount: 1, postsCount: 0, createdAt: now, updatedAt: now };
    prisma.profiles.set('kleber', kleber);
    prisma.profiles.set('ana', ana);
    prisma.profilesByUser.set('u1', kleber);
    prisma.profilesByUser.set('u2', ana);
    prisma.sellersByUser.set('u1', { shopName: 'Loja do Kleber', shopSlug: 'loja-kleber', about: null, ratingAvg: 0, ratingCount: 0 });
    prisma.follows.push({ id: 'f1', followerId: 'p2', followingId: 'p1', createdAt: now });
    prisma.posts.push({ id: 'post1', authorId: 'p1', kind: 'text', content: 'Hello', media: null, createdAt: now });

    await app.register(profilesRoutes, { prisma: prisma as unknown as PrismaClient });
    await app.ready();
  });

  it('returns 404 when profile not found', async () => {
    const res = await app.inject({ method: 'GET', url: '/profiles/missing' });
    expect(res.statusCode).toBe(404);
  });

  it('returns public profile with counts and samples', async () => {
    const res = await app.inject({ method: 'GET', url: '/profiles/kleber' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.profile.handle).toBe('kleber');
    expect(body.counts.followers).toBe(1);
    expect(Array.isArray(body.followersSample)).toBe(true);
  });

  it('lists posts with cursor pagination shape', async () => {
    const res = await app.inject({ method: 'GET', url: '/profiles/kleber/posts?limit=1' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body.items)).toBe(true);
    expect(body.items[0].author.handle).toBe('kleber');
  });
});

