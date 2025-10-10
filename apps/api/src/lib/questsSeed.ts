import { PrismaClient } from '@prisma/client';

const QUESTS = [
  { slug: 'POST_TODAY', name: 'Postar Hoje', description: 'Crie 1 post', type: 'POST', target: 1, reward: 10, icon: 'Edit' },
  { slug: 'LIKE_5', name: '5 Curtidas', description: 'Dê 5 likes', type: 'LIKE', target: 5, reward: 5, icon: 'Heart' },
  { slug: 'COMMENT_3', name: '3 Comentários', description: 'Comente 3 vezes', type: 'COMMENT', target: 3, reward: 8, icon: 'MessageCircle' },
  { slug: 'FOLLOW_NEW', name: 'Novo Seguidor', description: 'Siga 1 pessoa', type: 'FOLLOW', target: 1, reward: 5, icon: 'UserPlus' },
];

export async function seedQuests(prisma: PrismaClient): Promise<void> {
  for (const quest of QUESTS) {
    await prisma.quest.upsert({
      where: { slug: quest.slug },
      update: quest,
      create: quest,
    });
  }
  console.log(`[Quests] Seeded ${QUESTS.length} quests`);
}
