import { PrismaClient } from '@prisma/client';
import { seedAchievements } from '../lib/achievementsSeed.js';

const prisma = new PrismaClient();

async function main() {
  try {
    await seedAchievements(prisma);
    console.log('✅ Achievements seeded successfully');
  } catch (error) {
    console.error('❌ Error seeding achievements:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
