import { Queue, Worker, QueueEvents } from 'bullmq';
import { Redis } from 'ioredis';
import { env } from '../env.js';

const connection = new Redis(env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

export const publishQueue = new Queue('store-publish', { connection });
export const indexQueue = new Queue('store-index', { connection });
export const verifyQueue = new Queue('store-verify', { connection });

export { connection };
