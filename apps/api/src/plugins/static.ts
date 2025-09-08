import { FastifyInstance } from 'fastify';
import fastifyStatic from '@fastify/static';
import { resolve } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { env } from '../env.js';

export async function staticPlugin(app: FastifyInstance) {
  // Apenas registra em modo FS (desenvolvimento)
  if (env.STORAGE_PROVIDER !== 'fs') {
    return;
  }

  const uploadsDir = resolve(process.cwd(), 'uploads');
  
  // Cria diretório se não existir
  if (!existsSync(uploadsDir)) {
    mkdirSync(uploadsDir, { recursive: true });
    app.log.info(`📁 Diretório uploads criado: ${uploadsDir}`);
  }

  // Servir arquivos estáticos de /uploads
  await app.register(fastifyStatic, {
    root: uploadsDir,
    prefix: '/static/',
    serve: true,
    list: false,
  });

  app.log.info('🖼️ Plugin static configurado para servir /uploads');
}