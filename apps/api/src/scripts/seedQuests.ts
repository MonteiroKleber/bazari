import { PrismaClient } from '@prisma/client';
import { seedQuests } from '../lib/questsSeed.js';

const prisma = new PrismaClient();

async function main() {
  await seedQuests(prisma);
  await prisma.$disconnect();
}

main();
