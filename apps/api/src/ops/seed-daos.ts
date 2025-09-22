import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Vincular dao-1 ao SS58_KLEBER (se existir)
  const kleber = await prisma.user.findUnique({ where: { address: 'SS58_KLEBER' } });
  if (kleber) {
    await prisma.dao.upsert({
      where: { id: 'dao-1' },
      update: { name: 'DAO Kleber', slug: 'dao-1', ownerUserId: kleber.id },
      create: { id: 'dao-1', name: 'DAO Kleber', slug: 'dao-1', ownerUserId: kleber.id },
    });
    console.log('✅ DAO dao-1 vinculado ao usuário SS58_KLEBER');
  }

  // Exemplo para dao-2 e dao-3 sem owner (pode atualizar depois)
  await prisma.dao.upsert({
    where: { id: 'dao-2' },
    update: { name: 'DAO 2', slug: 'dao-2' },
    create: { id: 'dao-2', name: 'DAO 2', slug: 'dao-2' },
  });
  await prisma.dao.upsert({
    where: { id: 'dao-3' },
    update: { name: 'DAO 3', slug: 'dao-3' },
    create: { id: 'dao-3', name: 'DAO 3', slug: 'dao-3' },
  });
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });

