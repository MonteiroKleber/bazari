/**
 * Create Routes - Handles project creation
 */

import { Router, Request, Response, type Router as RouterType } from 'express';
import { createService } from '../services/create.service.js';

const router: RouterType = Router();

/**
 * GET /create/templates
 * Lista templates disponíveis
 */
router.get('/templates', (_req: Request, res: Response) => {
  res.json({ templates: createService.getTemplates() });
});

/**
 * GET /create/categories
 * Lista categorias disponíveis
 */
router.get('/categories', (_req: Request, res: Response) => {
  res.json({ categories: createService.getCategories() });
});

/**
 * POST /create
 * Cria um novo projeto
 */
router.post('/', async (req: Request, res: Response) => {
  const { name, description, template, category, author, files } = req.body;

  // Validações
  if (!name || typeof name !== 'string') {
    res.status(400).json({ error: 'Missing or invalid name' });
    return;
  }

  if (!description || typeof description !== 'string') {
    res.status(400).json({ error: 'Missing or invalid description' });
    return;
  }

  if (!template || typeof template !== 'string') {
    res.status(400).json({ error: 'Missing or invalid template' });
    return;
  }

  if (!category || typeof category !== 'string') {
    res.status(400).json({ error: 'Missing or invalid category' });
    return;
  }

  try {
    const result = await createService.createProject({
      name,
      description,
      template,
      category,
      author,
      files, // Arquivos processados do template (opcional)
    });

    if (result.success) {
      res.json({
        success: true,
        projectPath: result.projectPath,
        slug: result.slug,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to create project',
    });
  }
});

export default router;
