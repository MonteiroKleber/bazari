import { PrismaClient } from '@prisma/client';

// Singleton instance for workers and other modules
export const prisma = new PrismaClient();
