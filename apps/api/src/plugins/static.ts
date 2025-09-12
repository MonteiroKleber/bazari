// V-1 (2025-09-12): Corrige raiz dos arquivos estáticos e alinha prefixos
// - Root agora aponta para 'apps/api/uploads' (relativo ao arquivo), evitando depender do process.cwd().
// - Mantém prefix principal em '/static/' (compatível com MediaAsset.url = '/static/<file>').
// - Adiciona alias opcional '/uploads/' para compatibilidade sem quebrar rotas existentes.
// - Mantém criação do diretório e logs claros.

import { FastifyInstance } from 'fastify';
import fastifyStatic from '@fastify/static';
import { resolve, dirname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { env } from '../env.js';

export async function staticPlugin(app: FastifyInstance) {
  // Apenas registra em modo FS (desenvolvimento)
  if (env.STORAGE_PROVIDER !== 'fs') {
    return;
  }

  // __dirname aqui resolve para apps/api/src/plugins
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);

  // uploads ficam em apps/api/uploads (subir 2 níveis a partir de src/plugins)
  const uploadsDir = resolve(__dirname, '..', '..', 'uploads');

  // Cria diretório se não existir
  if (!existsSync(uploadsDir)) {
    mkdirSync(uploadsDir, { recursive: true });
    app.log.info(`📁 Diretório uploads criado: ${uploadsDir}`);
  }

  // Servir arquivos estáticos a partir de /static (CASA com MediaAsset.url)
  await app.register(fastifyStatic, {
    root: uploadsDir,
    prefix: '/static/',
    serve: true,
    list: false,
  });

  // (Opcional) Alias /uploads para compatibilidade
  await app.register(fastifyStatic, {
    root: uploadsDir,
    prefix: '/uploads/',
    decorateReply: false, // evita conflito de decorators
    serve: true,
    list: false,
  });

  app.log.info(`🖼️ Static configurado: ${uploadsDir} -> /static (alias /uploads)`);
}
