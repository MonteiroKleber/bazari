import { FastifyInstance, FastifyRequest } from 'fastify';
import { authOnRequest } from '../lib/auth/middleware';
import { AccessTokenPayload } from '../lib/auth/jwt';
import { uploadToIpfs } from '../lib/ipfs';
import { prisma } from '../lib/prisma';

export default async function storiesUploadRoutes(app: FastifyInstance) {
  // Upload de mídia pública para Stories (sem cifragem)
  app.post('/stories/upload', { preHandler: authOnRequest }, async (req, reply) => {
    const authReq = req as FastifyRequest & { authUser: AccessTokenPayload };
    const userId = authReq.authUser.sub;

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
      req.log.info({ profileId, userId }, 'Starting story upload');

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

      // Validar tipo de arquivo (apenas imagens e vídeos para stories)
      const allowedTypes = ['image/', 'video/'];
      const isAllowed = allowedTypes.some(type => data.mimetype.startsWith(type));

      if (!isAllowed) {
        req.log.warn({ profileId, mimetype: data.mimetype }, 'File type not allowed for stories');
        return reply.code(400).send({
          error: 'Only images and videos are allowed for stories',
          allowedTypes: allowedTypes,
          receivedType: data.mimetype,
        });
      }

      // Validar tamanho (50MB)
      const maxSize = 50 * 1024 * 1024;
      const buffer = await data.toBuffer();

      if (buffer.length > maxSize) {
        req.log.warn({ profileId, size: buffer.length, maxSize }, 'File too large');
        return reply.code(400).send({
          error: 'File too large',
          maxSize: maxSize,
          receivedSize: buffer.length,
        });
      }

      req.log.info({ profileId, size: buffer.length }, 'File validated, uploading to IPFS...');

      // Upload PÚBLICO (sem cifragem) para IPFS
      const cid = await uploadToIpfs(buffer, {
        filename: data.filename || 'story-media',
      });

      req.log.info({ profileId, cid, mimetype: data.mimetype, size: buffer.length }, '✅ Story media uploaded successfully');

      return {
        cid,
        mimetype: data.mimetype,
        filename: data.filename,
        size: buffer.length,
      };
    } catch (error: any) {
      req.log.error({
        error: {
          message: error.message,
          code: error.code,
          type: error.type,
        },
        profileId
      }, '❌ Story upload failed');

      return reply.code(500).send({
        error: 'Upload failed',
        details: error.message,
      });
    }
  });
}
