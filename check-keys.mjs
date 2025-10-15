import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkKeys() {
  const profiles = await prisma.profile.findMany({
    select: {
      id: true,
      handle: true,
      chatPublicKey: true,
    },
    where: {
      chatPublicKey: { not: null }
    }
  });

  console.log('Profiles with public keys:', profiles.length);
  profiles.forEach(p => {
    const keyPreview = p.chatPublicKey ? p.chatPublicKey.substring(0, 20) + '...' : 'NO KEY';
    console.log(`- ${p.handle} (${p.id.substring(0, 8)}...): ${keyPreview}`);
  });

  await prisma.$disconnect();
}

checkKeys();
