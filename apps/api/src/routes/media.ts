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
      const maxSizeMb = Number(process.env.UPLOAD_MAX_SIZE_MB || '10');
      if (buffer.length > maxSizeMb * 1024 * 1024) {
        return reply.status(413).send({ error: `Arquivo muito grande (máx ${maxSizeMb}MB)` });
      }

      // Validar mimetype (lista separada por vírgula ou padrão a imagens comuns)
      const allowed = (process.env.UPLOAD_ALLOWED_MIME || 'image/jpeg,image/png,image/webp').split(',').map(s => s.trim());
      const detectedMime = data.mimetype || mime.getType(data.filename) || 'application/octet-stream';
      if (allowed.length > 0 && !allowed.includes(detectedMime)) {
        return reply.status(415).send({ error: 'Tipo de arquivo não permitido' });
      }

      // Fazer upload via storage
      const result = await storage.put(buffer, {
        filename: data.filename,
        mime: detectedMime,
      });

      // Salvar metadados no banco
      const mediaAsset = await prisma.mediaAsset.create({
        data: {
          url: result.url,
          mime: detectedMime,
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

  // Upload de vídeo
  app.post<{ Body: MediaUploadBody }>('/media/upload-video', async (request, reply) => {
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

      // Validar tamanho - 100MB para vídeos
      const maxSizeMb = Number(process.env.VIDEO_MAX_SIZE_MB || '100');
      if (buffer.length > maxSizeMb * 1024 * 1024) {
        return reply.status(413).send({ error: `Vídeo muito grande (máx ${maxSizeMb}MB)` });
      }

      // Validar mimetype - apenas vídeos
      const allowedVideoMimes = [
        'video/mp4',
        'video/webm',
        'video/quicktime',
        'video/x-msvideo',  // AVI
        'video/mpeg',        // MPEG
        'application/octet-stream' // Fallback para arquivos sem tipo detectado
      ];
      const detectedMime = data.mimetype || mime.getType(data.filename) || 'application/octet-stream';

      // Log para debug
      app.log.info({
        filename: data.filename,
        mimetype: data.mimetype,
        detectedMime,
        size: buffer.length
      }, 'Upload de vídeo recebido');

      if (!allowedVideoMimes.includes(detectedMime)) {
        app.log.warn({ detectedMime, allowedVideoMimes }, 'Mimetype de vídeo não permitido');
        return reply.status(415).send({
          error: `Formato não suportado (${detectedMime}). Use MP4, WebM ou MOV.`
        });
      }

      // Fazer upload via storage
      const result = await storage.put(buffer, {
        filename: data.filename,
        mime: detectedMime,
      });

      // Salvar metadados no banco
      const mediaAsset = await prisma.mediaAsset.create({
        data: {
          url: result.url,
          mime: detectedMime,
          size: result.size,
          contentHash: result.contentHash,
        },
      });

      // TODO: Gerar thumbnail do vídeo (futuro)
      // const thumbnailUrl = await generateVideoThumbnail(buffer);

      return reply.status(201).send({
        asset: {
          id: mediaAsset.id,
          url: mediaAsset.url,
          contentHash: mediaAsset.contentHash,
          mime: mediaAsset.mime,
          size: mediaAsset.size,
          thumbnailUrl: undefined, // TODO: implementar geração de thumbnail
        }
      });
    } catch (error) {
      app.log.error({ err: error as any }, 'Erro no upload de vídeo');
      return reply.status(500).send({ error: 'Erro ao processar upload de vídeo' });
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

  // ============================================
  // UPLOAD CHUNKED - Para arquivos grandes
  // ============================================

  // Armazenamento temporário de chunks em memória (em produção, use Redis ou filesystem)
  const uploadChunks = new Map<string, { chunks: Map<number, Buffer>; totalChunks: number; filename: string; mime: string }>();

  // Iniciar upload chunked
  app.post<{
    Body: { uploadId: string; totalChunks: number; filename: string; mime: string; totalSize: number }
  }>('/media/upload-video-init', async (request, reply) => {
    try {
      const { uploadId, totalChunks, filename, mime, totalSize } = request.body;

      if (!uploadId || !totalChunks || !filename) {
        return reply.status(400).send({ error: 'Parâmetros inválidos' });
      }

      // Validar tamanho total
      const maxSizeMb = Number(process.env.VIDEO_MAX_SIZE_MB || '100');
      if (totalSize > maxSizeMb * 1024 * 1024) {
        return reply.status(413).send({ error: `Vídeo muito grande (máx ${maxSizeMb}MB)` });
      }

      // Criar entrada para este upload
      uploadChunks.set(uploadId, {
        chunks: new Map(),
        totalChunks,
        filename,
        mime: mime || 'video/mp4'
      });

      app.log.info({ uploadId, totalChunks, filename, totalSize }, 'Upload chunked iniciado');

      return reply.status(200).send({
        uploadId,
        message: 'Upload iniciado',
        chunkSize: 5 * 1024 * 1024 // 5MB por chunk
      });
    } catch (error) {
      app.log.error({ err: error as any }, 'Erro ao iniciar upload chunked');
      return reply.status(500).send({ error: 'Erro ao iniciar upload' });
    }
  });

  // Receber chunk individual
  app.post('/media/upload-video-chunk', async (request, reply) => {
    try {
      // Processar multipart com todos os fields
      const parts = request.parts();
      let uploadId: string | undefined;
      let chunkIndex: number | undefined;
      let chunkBuffer: Buffer | undefined;

      for await (const part of parts) {
        if (part.type === 'file') {
          // Converter stream para buffer
          const chunks: Buffer[] = [];
          for await (const chunk of part.file) {
            chunks.push(chunk);
          }
          chunkBuffer = Buffer.concat(chunks);
        } else if (part.type === 'field') {
          // Pegar campos
          if (part.fieldname === 'uploadId') {
            uploadId = part.value as string;
          } else if (part.fieldname === 'chunkIndex') {
            chunkIndex = parseInt(part.value as string);
          }
        }
      }

      if (!uploadId) {
        return reply.status(400).send({ error: 'uploadId não fornecido' });
      }

      if (chunkIndex === undefined) {
        return reply.status(400).send({ error: 'chunkIndex não fornecido' });
      }

      if (!chunkBuffer) {
        return reply.status(400).send({ error: 'Nenhum arquivo enviado' });
      }

      const upload = uploadChunks.get(uploadId);
      if (!upload) {
        return reply.status(404).send({ error: 'Upload não encontrado. Inicie o upload primeiro.' });
      }

      // Salvar chunk
      upload.chunks.set(chunkIndex, chunkBuffer);

      const receivedChunks = upload.chunks.size;
      const progress = (receivedChunks / upload.totalChunks) * 100;

      app.log.info({
        uploadId,
        chunkIndex,
        chunkSize: chunkBuffer.length,
        receivedChunks,
        totalChunks: upload.totalChunks,
        progress: progress.toFixed(1)
      }, 'Chunk recebido');

      return reply.status(200).send({
        uploadId,
        chunkIndex,
        receivedChunks,
        totalChunks: upload.totalChunks,
        progress: Math.round(progress)
      });
    } catch (error) {
      app.log.error({ err: error as any }, 'Erro ao receber chunk');
      return reply.status(500).send({ error: 'Erro ao processar chunk' });
    }
  });

  // Finalizar upload - juntar chunks
  app.post<{
    Body: { uploadId: string }
  }>('/media/upload-video-complete', async (request, reply) => {
    try {
      const { uploadId } = request.body;

      if (!uploadId) {
        return reply.status(400).send({ error: 'uploadId não fornecido' });
      }

      const upload = uploadChunks.get(uploadId);
      if (!upload) {
        return reply.status(404).send({ error: 'Upload não encontrado' });
      }

      // Verificar se todos os chunks foram recebidos
      if (upload.chunks.size !== upload.totalChunks) {
        return reply.status(400).send({
          error: 'Upload incompleto',
          receivedChunks: upload.chunks.size,
          totalChunks: upload.totalChunks
        });
      }

      app.log.info({ uploadId, totalChunks: upload.totalChunks }, 'Juntando chunks...');

      // Juntar chunks em ordem
      const orderedChunks: Buffer[] = [];
      for (let i = 0; i < upload.totalChunks; i++) {
        const chunk = upload.chunks.get(i);
        if (!chunk) {
          return reply.status(400).send({ error: `Chunk ${i} não encontrado` });
        }
        orderedChunks.push(chunk);
      }

      const finalBuffer = Buffer.concat(orderedChunks);

      app.log.info({
        uploadId,
        totalSize: finalBuffer.length,
        filename: upload.filename
      }, 'Chunks unidos, fazendo upload final...');

      // Fazer upload do arquivo completo via storage
      const result = await storage.put(finalBuffer, {
        filename: upload.filename,
        mime: upload.mime,
      });

      // Salvar metadados no banco
      const mediaAsset = await prisma.mediaAsset.create({
        data: {
          url: result.url,
          mime: upload.mime,
          size: result.size,
          contentHash: result.contentHash,
        },
      });

      // Limpar chunks da memória
      uploadChunks.delete(uploadId);

      app.log.info({
        uploadId,
        assetId: mediaAsset.id,
        url: mediaAsset.url
      }, 'Upload chunked finalizado com sucesso');

      return reply.status(201).send({
        asset: {
          id: mediaAsset.id,
          url: mediaAsset.url,
          contentHash: mediaAsset.contentHash,
          mime: mediaAsset.mime,
          size: mediaAsset.size,
          thumbnailUrl: undefined,
        }
      });
    } catch (error) {
      app.log.error({ err: error as any }, 'Erro ao finalizar upload chunked');
      return reply.status(500).send({ error: 'Erro ao finalizar upload' });
    }
  });

  // Verificar status do upload
  app.get<{
    Params: { uploadId: string }
  }>('/media/upload-video-status/:uploadId', async (request, reply) => {
    try {
      const { uploadId } = request.params;

      const upload = uploadChunks.get(uploadId);
      if (!upload) {
        return reply.status(404).send({ error: 'Upload não encontrado' });
      }

      const receivedChunks = upload.chunks.size;
      const progress = (receivedChunks / upload.totalChunks) * 100;

      return reply.status(200).send({
        uploadId,
        receivedChunks,
        totalChunks: upload.totalChunks,
        progress: Math.round(progress),
        complete: receivedChunks === upload.totalChunks
      });
    } catch (error) {
      app.log.error({ err: error as any }, 'Erro ao verificar status do upload');
      return reply.status(500).send({ error: 'Erro ao verificar status' });
    }
  });

  // Cancelar upload
  app.delete<{
    Params: { uploadId: string }
  }>('/media/upload-video-cancel/:uploadId', async (request, reply) => {
    try {
      const { uploadId } = request.params;

      const upload = uploadChunks.get(uploadId);
      if (!upload) {
        return reply.status(404).send({ error: 'Upload não encontrado' });
      }

      uploadChunks.delete(uploadId);

      app.log.info({ uploadId }, 'Upload cancelado');

      return reply.status(200).send({ message: 'Upload cancelado' });
    } catch (error) {
      app.log.error({ err: error as any }, 'Erro ao cancelar upload');
      return reply.status(500).send({ error: 'Erro ao cancelar upload' });
    }
  });
}
