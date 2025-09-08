import { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';

export async function corsPlugin(app: FastifyInstance) {
  await app.register(cors, {
    origin: [
      'http://localhost:5173', // Vite dev server
      'http://localhost:3000', // Possível outro frontend
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  });
}