import { FastifyInstance } from 'fastify';
import pino from 'pino';

export function createLogger() {
  return pino({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    transport: process.env.NODE_ENV !== 'production' 
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
  });
}

export async function loggerPlugin(app: FastifyInstance) {
  app.log.info('Logger configurado');
}