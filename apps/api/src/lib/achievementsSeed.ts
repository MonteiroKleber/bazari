import { PrismaClient } from '@prisma/client';

interface AchievementData {
  slug: string;
  name: string;
  description: string;
  category: string;
  tier: number;
  requirement: {
    type: string;
    value: number;
  };
  icon: string;
}

const ACHIEVEMENTS: AchievementData[] = [
  // CONTENT
  {
    slug: 'FIRST_POST',
    name: 'Primeiro Post',
    description: 'Crie seu primeiro post na comunidade',
    category: 'CONTENT',
    tier: 1,
    requirement: { type: 'POST_COUNT', value: 1 },
    icon: 'Edit',
  },
  {
    slug: 'PROLIFIC_WRITER',
    name: 'Escritor Prolífico',
    description: 'Crie 50 posts',
    category: 'CONTENT',
    tier: 3,
    requirement: { type: 'POST_COUNT', value: 50 },
    icon: 'Feather',
  },
  {
    slug: 'CONTENT_MASTER',
    name: 'Mestre do Conteúdo',
    description: 'Crie 200 posts',
    category: 'CONTENT',
    tier: 5,
    requirement: { type: 'POST_COUNT', value: 200 },
    icon: 'Crown',
  },

  // SOCIAL
  {
    slug: 'SOCIAL_BUTTERFLY',
    name: 'Borboleta Social',
    description: 'Siga 50 pessoas',
    category: 'SOCIAL',
    tier: 2,
    requirement: { type: 'FOLLOWING_COUNT', value: 50 },
    icon: 'Users',
  },
  {
    slug: 'COMMUNITY_BUILDER',
    name: 'Construtor da Comunidade',
    description: 'Tenha 100 seguidores',
    category: 'SOCIAL',
    tier: 3,
    requirement: { type: 'FOLLOWERS_COUNT', value: 100 },
    icon: 'Building',
  },
  {
    slug: 'INFLUENCER',
    name: 'Influenciador',
    description: 'Tenha 1000 seguidores',
    category: 'SOCIAL',
    tier: 5,
    requirement: { type: 'FOLLOWERS_COUNT', value: 1000 },
    icon: 'Star',
  },

  // ENGAGEMENT
  {
    slug: 'CONVERSATION_STARTER',
    name: 'Iniciador de Conversas',
    description: 'Crie 10 comentários',
    category: 'ENGAGEMENT',
    tier: 1,
    requirement: { type: 'COMMENT_COUNT', value: 10 },
    icon: 'MessageCircle',
  },
  {
    slug: 'ENGAGEMENT_KING',
    name: 'Rei do Engajamento',
    description: 'Receba 100 likes em seus posts',
    category: 'ENGAGEMENT',
    tier: 3,
    requirement: { type: 'LIKES_RECEIVED', value: 100 },
    icon: 'Heart',
  },
  {
    slug: 'VIRAL_SENSATION',
    name: 'Sensação Viral',
    description: 'Receba 1000 likes em seus posts',
    category: 'ENGAGEMENT',
    tier: 5,
    requirement: { type: 'LIKES_RECEIVED', value: 1000 },
    icon: 'Flame',
  },

  // STREAK
  {
    slug: 'POST_STREAK_7',
    name: 'Sequência de 7 Dias',
    description: 'Poste por 7 dias consecutivos',
    category: 'STREAK',
    tier: 2,
    requirement: { type: 'POST_STREAK', value: 7 },
    icon: 'Calendar',
  },
  {
    slug: 'POST_STREAK_30',
    name: 'Mês Dedicado',
    description: 'Poste por 30 dias consecutivos',
    category: 'STREAK',
    tier: 4,
    requirement: { type: 'POST_STREAK', value: 30 },
    icon: 'CalendarDays',
  },
  {
    slug: 'POST_STREAK_100',
    name: 'Centenário',
    description: 'Poste por 100 dias consecutivos',
    category: 'STREAK',
    tier: 5,
    requirement: { type: 'POST_STREAK', value: 100 },
    icon: 'Trophy',
  },
];

export async function seedAchievements(prisma: PrismaClient): Promise<void> {
  console.log('[Achievements] Seeding achievements...');

  for (const achievement of ACHIEVEMENTS) {
    await prisma.achievement.upsert({
      where: { slug: achievement.slug },
      update: {
        name: achievement.name,
        description: achievement.description,
        category: achievement.category,
        tier: achievement.tier,
        requirement: achievement.requirement,
        icon: achievement.icon,
      },
      create: achievement,
    });
  }

  console.log(`[Achievements] Seeded ${ACHIEVEMENTS.length} achievements`);
}
