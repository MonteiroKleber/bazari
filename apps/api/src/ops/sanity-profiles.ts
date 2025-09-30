import { PrismaClient } from '@prisma/client';
import { buildApp } from '../server.js';

async function main() {
  const prisma = new PrismaClient();

  // Seed básico
  const user1 = await prisma.user.upsert({
    where: { address: 'SS58_KLEBER' },
    update: {},
    create: { address: 'SS58_KLEBER' },
  });
  const user2 = await prisma.user.upsert({
    where: { address: 'SS58_ANA' },
    update: {},
    create: { address: 'SS58_ANA' },
  });

  const p1 = await prisma.profile.upsert({
    where: { userId: user1.id },
    update: {},
    create: {
      userId: user1.id,
      handle: 'kleber',
      displayName: 'Kleber',
      bio: 'Olá bazar!',
      externalLinks: [{ label: 'site', url: 'https://example.com' }],
    },
  });
  const p2 = await prisma.profile.upsert({
    where: { userId: user2.id },
    update: {},
    create: {
      userId: user2.id,
      handle: 'ana',
      displayName: 'Ana',
    },
  });

  const existingSeller = await prisma.sellerProfile.findFirst({ where: { userId: user1.id } });
  if (existingSeller) {
    await prisma.sellerProfile.update({ where: { id: existingSeller.id }, data: { shopName: 'Loja do Kleber', shopSlug: 'loja-kleber' } });
  } else {
    await prisma.sellerProfile.create({ data: { userId: user1.id, shopName: 'Loja do Kleber', shopSlug: 'loja-kleber' } });
  }

  // seguir: ana -> kleber
  await prisma.follow.upsert({
    where: { followerId_followingId: { followerId: p2.id, followingId: p1.id } },
    update: {},
    create: { followerId: p2.id, followingId: p1.id },
  }).catch(() => null);

  // posts
  const existingPosts = await prisma.post.count({ where: { authorId: p1.id } });
  if (existingPosts === 0) {
    await prisma.post.create({ data: { authorId: p1.id, kind: 'text', content: 'Primeiro post!' } });
  }

  // Ajustar contadores (consistência do seed)
  const followersCount = await prisma.follow.count({ where: { followingId: p1.id } });
  const followingCount = await prisma.follow.count({ where: { followerId: p1.id } });
  const postsCount = await prisma.post.count({ where: { authorId: p1.id } });
  await prisma.profile.update({ where: { id: p1.id }, data: { followersCount, followingCount, postsCount } });

  const app = await buildApp();

  // GET /profiles/:handle
  const r1 = await app.inject({ method: 'GET', url: `/profiles/kleber` });
  console.log('GET /profiles/kleber', r1.statusCode, r1.headers['cache-control']);
  console.log(r1.body);

  // GET /profiles/:handle/posts
  const r2 = await app.inject({ method: 'GET', url: `/profiles/kleber/posts` });
  console.log('GET /profiles/kleber/posts', r2.statusCode);
  console.log(r2.body);

  // GET followers
  const r3 = await app.inject({ method: 'GET', url: `/profiles/kleber/followers` });
  console.log('GET /profiles/kleber/followers', r3.statusCode);
  console.log(r3.body);

  // GET following
  const r4 = await app.inject({ method: 'GET', url: `/profiles/kleber/following` });
  console.log('GET /profiles/kleber/following', r4.statusCode);
  console.log(r4.body);

  // resolve by handle
  const r5 = await app.inject({ method: 'GET', url: `/profiles/_resolve?handle=@kleber` });
  console.log('GET /profiles/_resolve?handle=@kleber', r5.statusCode);
  console.log(r5.body);

  await app.close();
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
