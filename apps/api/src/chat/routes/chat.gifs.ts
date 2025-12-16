import { FastifyInstance, FastifyRequest } from 'fastify';
import { authOnRequest } from '../../lib/auth/middleware.js';
import { AccessTokenPayload } from '../../lib/auth/jwt.js';

// Tenor API configuration
const TENOR_API_KEY = process.env.TENOR_API_KEY;
const TENOR_API_URL = 'https://tenor.googleapis.com/v2';

interface TenorMediaFormat {
  url: string;
  dims: [number, number];
  duration: number;
  size: number;
}

interface TenorResult {
  id: string;
  title: string;
  content_description: string;
  media_formats: {
    gif: TenorMediaFormat;
    tinygif: TenorMediaFormat;
    mediumgif: TenorMediaFormat;
    nanogif: TenorMediaFormat;
    mp4: TenorMediaFormat;
    tinymp4: TenorMediaFormat;
  };
  created: number;
  url: string;
}

interface TenorSearchResponse {
  results: TenorResult[];
  next: string;
}

interface TenorCategoryResponse {
  tags: Array<{
    searchterm: string;
    path: string;
    image: string;
    name: string;
  }>;
}

export default async function chatGifsRoutes(app: FastifyInstance) {
  // Verificar se a API key está configurada
  if (!TENOR_API_KEY) {
    app.log.warn('TENOR_API_KEY not configured - GIF endpoints will return 503');
  }

  /**
   * GET /chat/gifs/search - Buscar GIFs por termo
   */
  app.get('/chat/gifs/search', { preHandler: authOnRequest }, async (req, reply) => {
    if (!TENOR_API_KEY) {
      return reply.code(503).send({ error: 'GIF service not available' });
    }

    const { q, limit = '20', pos } = req.query as {
      q: string;
      limit?: string;
      pos?: string; // Pagination cursor
    };

    if (!q || q.trim().length < 1) {
      return reply.code(400).send({ error: 'Search query is required' });
    }

    try {
      const params = new URLSearchParams({
        key: TENOR_API_KEY,
        q: q.trim(),
        limit: Math.min(parseInt(limit), 50).toString(),
        media_filter: 'gif,tinygif,mp4',
        contentfilter: 'medium', // Filter inappropriate content
        locale: 'pt_BR',
      });

      if (pos) {
        params.set('pos', pos);
      }

      const response = await fetch(`${TENOR_API_URL}/search?${params}`);

      if (!response.ok) {
        const errorText = await response.text();
        req.log.error({ status: response.status, errorText }, 'Tenor API error');
        return reply.code(502).send({ error: 'Failed to fetch GIFs' });
      }

      const data = (await response.json()) as TenorSearchResponse;

      // Transform response to simplified format
      const gifs = data.results.map(transformTenorResult);

      return {
        gifs,
        next: data.next || null,
      };
    } catch (error) {
      req.log.error({ error }, 'Failed to search GIFs');
      return reply.code(500).send({ error: 'Failed to search GIFs' });
    }
  });

  /**
   * GET /chat/gifs/trending - GIFs em alta
   */
  app.get('/chat/gifs/trending', { preHandler: authOnRequest }, async (req, reply) => {
    if (!TENOR_API_KEY) {
      return reply.code(503).send({ error: 'GIF service not available' });
    }

    const { limit = '20', pos } = req.query as {
      limit?: string;
      pos?: string;
    };

    try {
      const params = new URLSearchParams({
        key: TENOR_API_KEY,
        limit: Math.min(parseInt(limit), 50).toString(),
        media_filter: 'gif,tinygif,mp4',
        contentfilter: 'medium',
        locale: 'pt_BR',
      });

      if (pos) {
        params.set('pos', pos);
      }

      const response = await fetch(`${TENOR_API_URL}/featured?${params}`);

      if (!response.ok) {
        const errorText = await response.text();
        req.log.error({ status: response.status, errorText }, 'Tenor API error');
        return reply.code(502).send({ error: 'Failed to fetch trending GIFs' });
      }

      const data = (await response.json()) as TenorSearchResponse;

      const gifs = data.results.map(transformTenorResult);

      return {
        gifs,
        next: data.next || null,
      };
    } catch (error) {
      req.log.error({ error }, 'Failed to fetch trending GIFs');
      return reply.code(500).send({ error: 'Failed to fetch trending GIFs' });
    }
  });

  /**
   * GET /chat/gifs/categories - Categorias de GIFs
   */
  app.get('/chat/gifs/categories', { preHandler: authOnRequest }, async (req, reply) => {
    if (!TENOR_API_KEY) {
      return reply.code(503).send({ error: 'GIF service not available' });
    }

    try {
      const params = new URLSearchParams({
        key: TENOR_API_KEY,
        locale: 'pt_BR',
        contentfilter: 'medium',
      });

      const response = await fetch(`${TENOR_API_URL}/categories?${params}`);

      if (!response.ok) {
        const errorText = await response.text();
        req.log.error({ status: response.status, errorText }, 'Tenor API error');
        return reply.code(502).send({ error: 'Failed to fetch categories' });
      }

      const data = (await response.json()) as TenorCategoryResponse;

      const categories = data.tags.map(tag => ({
        name: tag.name,
        searchTerm: tag.searchterm,
        image: tag.image,
      }));

      return { categories };
    } catch (error) {
      req.log.error({ error }, 'Failed to fetch GIF categories');
      return reply.code(500).send({ error: 'Failed to fetch categories' });
    }
  });

  /**
   * POST /chat/gifs/register-share - Registrar compartilhamento (para analytics do Tenor)
   */
  app.post('/chat/gifs/register-share', { preHandler: authOnRequest }, async (req, reply) => {
    if (!TENOR_API_KEY) {
      return reply.code(503).send({ error: 'GIF service not available' });
    }

    const { gifId, searchTerm } = req.body as {
      gifId: string;
      searchTerm?: string;
    };

    if (!gifId) {
      return reply.code(400).send({ error: 'GIF ID is required' });
    }

    try {
      const params = new URLSearchParams({
        key: TENOR_API_KEY,
        id: gifId,
        locale: 'pt_BR',
      });

      if (searchTerm) {
        params.set('q', searchTerm);
      }

      // Fire-and-forget share registration
      fetch(`${TENOR_API_URL}/registershare?${params}`).catch(() => {
        // Ignore errors in share registration
      });

      return { success: true };
    } catch (error) {
      // Ignore errors in share registration
      return { success: true };
    }
  });
}

/**
 * Transform Tenor result to simplified format for frontend
 */
function transformTenorResult(result: TenorResult): {
  id: string;
  title: string;
  description: string;
  preview: { url: string; width: number; height: number };
  full: { url: string; width: number; height: number };
  mp4?: { url: string; width: number; height: number };
} {
  const preview = result.media_formats.tinygif || result.media_formats.nanogif;
  const full = result.media_formats.gif || result.media_formats.mediumgif;
  const mp4 = result.media_formats.tinymp4 || result.media_formats.mp4;

  return {
    id: result.id,
    title: result.title || '',
    description: result.content_description || '',
    preview: {
      url: preview.url,
      width: preview.dims[0],
      height: preview.dims[1],
    },
    full: {
      url: full.url,
      width: full.dims[0],
      height: full.dims[1],
    },
    ...(mp4 && {
      mp4: {
        url: mp4.url,
        width: mp4.dims[0],
        height: mp4.dims[1],
      },
    }),
  };
}
