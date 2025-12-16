import { FastifyInstance } from 'fastify';
import { fetchLinkPreview, extractUrls } from '../lib/link-preview';
import { authOnRequest } from '../lib/auth/middleware';

export default async function linkPreviewRoutes(app: FastifyInstance) {
  /**
   * Fetch preview for a single URL
   * GET /api/link-preview?url=https://example.com
   */
  app.get('/api/link-preview', { preHandler: authOnRequest }, async (req, reply) => {
    const { url } = req.query as { url: string };

    if (!url) {
      return reply.code(400).send({ error: 'URL is required' });
    }

    try {
      const preview = await fetchLinkPreview(url);
      if (!preview) {
        return reply.code(404).send({ error: 'Could not fetch preview' });
      }
      return preview;
    } catch (err: any) {
      req.log.error({ err, url }, 'Failed to fetch link preview');
      return reply.code(500).send({ error: 'Failed to fetch preview' });
    }
  });

  /**
   * Extract and fetch previews for all URLs in a text
   * POST /api/link-preview/batch
   * Body: { text: string }
   */
  app.post('/api/link-preview/batch', { preHandler: authOnRequest }, async (req, reply) => {
    const { text } = req.body as { text: string };

    if (!text) {
      return reply.code(400).send({ error: 'Text is required' });
    }

    // Limitar quantidade de URLs processadas
    const MAX_URLS = 3;

    try {
      const urls = extractUrls(text).slice(0, MAX_URLS);

      if (urls.length === 0) {
        return { previews: [] };
      }

      const previews = await Promise.all(
        urls.map(async (url) => {
          const preview = await fetchLinkPreview(url);
          return preview || { url, error: true };
        })
      );

      return { previews: previews.filter(p => !('error' in p)) };
    } catch (err: any) {
      req.log.error({ err }, 'Failed to fetch link previews');
      return reply.code(500).send({ error: 'Failed to fetch previews' });
    }
  });
}
