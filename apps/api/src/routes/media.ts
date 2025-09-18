// V-2 (2025-09-18): Padroniza logs de erro nos uploads com objeto { err }
import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { StorageAdapter } from '../storage/StorageAdapter.js';
import mime from 'mime';

interface MediaUploadBody {
  file: {
    filename: string;
    mimetype: string;
    file: NodeJS.ReadableStream;
  };
}

export async function mediaRoutes(
  app: FastifyInstance,
  options: { prisma: PrismaClient; storage: StorageAdapter }
) {
  const { prisma, storage } = options;

  // Upload de arquivo
  app.post<{ Body: MediaUploadBody }>('/media/upload', async (request, reply) => {
    try {
      const data = await request.file();
      
      if (!data) {
        return reply.status(400).send({ error: 'Nenhum arquivo enviado' });
      }

      // Converter stream para buffer
      const chunks: Buffer[] = [];
      for await (const chunk of data.file) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);

      // Validar tamanho
      if (buffer.length > 10 * 1024 * 1024) {
        return reply.status(413).send({ error: 'Arquivo muito grande (máx 10MB)' });
      }

      // Fazer upload via storage
      const result = await storage.put(buffer, {
        filename: data.filename,
        mime: data.mimetype || mime.getType(data.filename) || 'application/octet-stream',
      });

      // Salvar metadados no banco
      const mediaAsset = await prisma.mediaAsset.create({
        data: {
          url: result.url,
          mime: data.mimetype || mime.getType(data.filename) || 'application/octet-stream',
          size: result.size,
          contentHash: result.contentHash,
        },
      });

      return reply.status(201).send({
        id: mediaAsset.id,
        url: mediaAsset.url,
        contentHash: mediaAsset.contentHash,
        mime: mediaAsset.mime,
        size: mediaAsset.size,
      });
    } catch (error) {
      app.log.error({ err: error as any }, 'Erro no upload');
      return reply.status(500).send({ error: 'Erro ao processar upload' });
    }
  });

  // Obter metadados do arquivo
  app.get<{ Params: { id: string } }>('/media/:id', async (request, reply) => {
    const { id } = request.params;

    const mediaAsset = await prisma.mediaAsset.findUnique({
      where: { id },
    });

    if (!mediaAsset) {
      return reply.status(404).send({ error: 'Arquivo não encontrado' });
    }

    return reply.send(mediaAsset);
  });

  // Obter URL do arquivo
  app.get<{ Params: { id: string } }>('/media/:id/url', async (request, reply) => {
    const { id } = request.params;

    const mediaAsset = await prisma.mediaAsset.findUnique({
      where: { id },
    });

    if (!mediaAsset) {
      return reply.status(404).send({ error: 'Arquivo não encontrado' });
    }

    const url = await storage.url(mediaAsset.url);

    return reply.send({ url });
  });
}
