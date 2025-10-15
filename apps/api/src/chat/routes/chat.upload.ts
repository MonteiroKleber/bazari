import { FastifyInstance, FastifyRequest } from 'fastify';
import { authOnRequest } from '../../lib/auth/middleware';
import { AccessTokenPayload } from '../../lib/auth/jwt';
import { ipfsService } from '../services/ipfs';
import { MultipartFile } from '@fastify/multipart';
import { prisma } from '../../lib/prisma';

export default async function chatUploadRoutes(app: FastifyInstance) {
  // Upload de mídia cifrada
  app.post('/chat/upload', { preHandler: authOnRequest }, async (req, reply) => {
    const authReq = req as FastifyRequest & { authUser: AccessTokenPayload };
    const userId = authReq.authUser.sub; // JWT contém User ID

    // Buscar Profile ID pelo User ID
    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!profile) {
      return reply.code(404).send({ error: 'Profile not found' });
    }

    const profileId = profile.id;

    try {
      req.log.info({ profileId, userId }, 'Starting file upload');

      // Receber arquivo via multipart
      const data = await req.file();

      if (!data) {
        req.log.warn({ profileId }, 'No file in request');
        return reply.code(400).send({ error: 'No file uploaded' });
      }

      req.log.info({
        profileId,
        mimetype: data.mimetype,
        filename: data.filename
      }, 'File received');

      // Validar tipo de arquivo
      const allowedTypes = ['image/', 'video/', 'audio/', 'application/pdf'];
      const isAllowed = allowedTypes.some(type => data.mimetype.startsWith(type));

      if (!isAllowed) {
        req.log.warn({ profileId, mimetype: data.mimetype }, 'File type not allowed');
        return reply.code(400).send({
          error: 'File type not allowed',
          allowedTypes: allowedTypes,
          receivedType: data.mimetype,
        });
      }

      // Validar tamanho (50MB default)
      const maxSize = 50 * 1024 * 1024; // 50MB
      const buffer = await data.toBuffer();

      if (buffer.length > maxSize) {
        req.log.warn({ profileId, size: buffer.length, maxSize }, 'File too large');
        return reply.code(400).send({
          error: 'File too large',
          maxSize: maxSize,
          receivedSize: buffer.length,
        });
      }

      req.log.info({ profileId, size: buffer.length }, 'File validated, generating encryption key');

      // Gerar chave de cifragem
      const encryptionKey = ipfsService.generateEncryptionKey();

      req.log.info({ profileId }, 'Uploading to IPFS...');

      // Upload cifrado para IPFS
      const cid = await ipfsService.uploadEncrypted(buffer, encryptionKey);

      req.log.info({ profileId, cid, mimetype: data.mimetype, size: buffer.length }, '✅ Media uploaded successfully');

      // Importar chatConfig para ter acesso ao gateway URL
      const { chatConfig } = await import('../../config/env');

      return {
        cid,
        encryptionKey,
        mimetype: data.mimetype,
        filename: data.filename,
        size: buffer.length,
        gatewayUrl: `${chatConfig.ipfsGatewayUrl}${cid}`,
      };
    } catch (error: any) {
      req.log.error({
        error: {
          message: error.message,
          code: error.code,
          type: error.type,
        },
        profileId
      }, '❌ Upload failed');

      return reply.code(500).send({
        error: 'Upload failed',
        details: error.message,
      });
    }
  });

  // Download de mídia cifrada (opcional - pode ser feito direto do gateway IPFS)
  app.get('/chat/download/:cid', { preHandler: authOnRequest }, async (req, reply) => {
    const { cid } = req.params as { cid: string };
    const { key } = req.query as { key: string };

    if (!key) {
      return reply.code(400).send({ error: 'Encryption key required' });
    }

    try {
      const buffer = await ipfsService.getDecrypted(cid, key);

      // Retornar arquivo
      reply.type('application/octet-stream');
      return reply.send(buffer);
    } catch (error) {
      req.log.error({ error, cid }, 'Download failed');
      return reply.code(500).send({ error: 'Download failed' });
    }
  });
}
