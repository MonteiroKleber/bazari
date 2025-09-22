import type { PrismaClient } from '@prisma/client';

export async function resolveSellerFromDaoId(prisma: PrismaClient, daoId: string) {
  // 1) Tentar resolver via tabela Dao (id ou slug)
  const dao = await prisma.dao.findFirst({
    where: { OR: [ { id: daoId }, { slug: daoId } ] },
    select: { ownerUserId: true },
  });
  let ownerUserId: string | null = dao?.ownerUserId ?? null;

  // 2) Fallback: interpretar daoId como address de usuário
  if (!ownerUserId) {
    const user = await prisma.user.findUnique({ where: { address: daoId }, select: { id: true } });
    ownerUserId = user?.id ?? null;
  }

  if (!ownerUserId) return null;

  const [profile, seller] = await Promise.all([
    prisma.profile.findUnique({ where: { userId: ownerUserId }, select: { handle: true, displayName: true, avatarUrl: true } }),
    prisma.sellerProfile.findUnique({ where: { userId: ownerUserId }, select: { shopSlug: true, shopName: true } }),
  ]);

  if (!profile && !seller) return null;

  return {
    handle: profile?.handle ?? null,
    displayName: profile?.displayName ?? null,
    avatarUrl: profile?.avatarUrl ?? null,
    shopSlug: seller?.shopSlug ?? null,
    shopName: seller?.shopName ?? null,
  };
}
