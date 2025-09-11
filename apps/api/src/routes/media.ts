// V+1: Suporte a entityType/entityId opcionais no upload - 2025-09-11
// Permite vincular upload diretamente a um produto via entityType=product&entityId=:id
// Mantém funcionalidade existente intacta

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
  entityType?: string;
  entityId?: string;
}

export async function mediaRoutes(
  app: FastifyInstance,
  options: { prisma: PrismaClient; storage: StorageAdapter }
) {
  const { prisma, storage } = options;

  // Upload de arquivo - MELHORADO: suporte a entityType/entityId
  app.post<{ Body: MediaUploadBody }>('/media/upload', async (request, reply) => {
    try {
      const data = await request.file();
      
      if (!data) {
        return reply.status(400).send({ error: 'Nenhum arquivo enviado' });
      }

      // Extrair campos adicionais do multipart
      const fields: Record<string, any> = {};
      if (data.fields) {
        for (const field of Object.keys(data.fields)) {
          const fieldData = (data.fields as any)[field];
          fields[field] = fieldData?.value || fieldData;
        }
      }

      const entityType = fields.entityType;
      const entityId = fields.entityId;

      // Validar entityType se fornecido
      if (entityType && !['product', 'service'].includes(entityType)) {
        return reply.status(400).send({ 
          error: 'entityType deve ser "product" ou "service"' 
        });
      }

      // Verificar se entidade existe quando entityId é fornecido
      if (entityType && entityId) {
        let entityExists = false;
        
        if (entityType === 'product') {
          const product = await prisma.product.findUnique({
            where: { id: entityId },
            select: { id: true },
          });
          entityExists = !!product;
        } else if (entityType === 'service') {
          const service = await prisma.service.findUnique({
            where: { id: entityId },
            select: { id: true },
          });
          entityExists = !!service;
        }

        if (!entityExists) {
          return reply.status(404).send({ 
            error: `${entityType} com ID ${entityId} não encontrado` 
          });
        }
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

      // Validar tipo de arquivo
      const detectedMime = data.mimetype || mime.getType(data.filename) || 'application/octet-stream';
      const allowedTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
        'video/mp4', 'video/webm', 'video/quicktime'
      ];

      if (!allowedTypes.includes(detectedMime)) {
        return reply.status(400).send({ 
          error: 'Tipo de arquivo não suportado. Use: JPG, PNG, GIF, WebP, MP4, WebM ou MOV' 
        });
      }

      // Fazer upload via storage
      const result = await storage.put(buffer, {
        filename: data.filename,
        mime: detectedMime,
      });

      // Salvar metadados no banco - COM entityType/entityId se fornecidos
      const mediaAsset = await prisma.mediaAsset.create({
        data: {
          url: result.url,
          mime: detectedMime,
          size: result.size,
          contentHash: result.contentHash,
          // NOVO: Vincular diretamente se entityType/entityId fornecidos
          ...(entityType && entityId && {
            entityType,
            entityId,
          }),
        },
      });

      app.log.info(`Mídia criada: ${mediaAsset.id} ${entityType ? `(vinculada a ${entityType}:${entityId})` : '(não vinculada)'}`);

      return reply.status(201).send({
        id: mediaAsset.id,
        url: mediaAsset.url,
        contentHash: mediaAsset.contentHash,
        mime: mediaAsset.mime,
        size: mediaAsset.size,
        entityType: mediaAsset.entityType,
        entityId: mediaAsset.entityId,
      });
    } catch (error) {
      app.log.error('Erro no upload:', error);
      return reply.status(500).send({ error: 'Erro ao processar upload' });
    }
  });

  // Obter metadados do arquivo - MANTIDO INTACTO
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

  // Obter URL do arquivo - MANTIDO INTACTO
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

  // NOVO: Obter mídias de uma entidade específica
  app.get<{ 
    Params: { entityType: string; entityId: string }
  }>('/media/entity/:entityType/:entityId', async (request, reply) => {
    const { entityType, entityId } = request.params;

    if (!['product', 'service'].includes(entityType)) {
      return reply.status(400).send({ 
        error: 'entityType deve ser "product" ou "service"' 
      });
    }

    try {
      const media = await prisma.mediaAsset.findMany({
        where: {
          entityType,
          entityId,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      return reply.send({
        entityType,
        entityId,
        media,
        count: media.length,
      });
    } catch (error) {
      app.log.error('Erro ao buscar mídias da entidade:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });
}