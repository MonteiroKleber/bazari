import { Router, Request, Response, type Router as RouterType } from 'express';
import { projectService } from '../services/index.js';

const router: RouterType = Router();

/**
 * GET /projects
 * Lista todos os projetos locais
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const projects = await projectService.listProjects();
    res.json({ projects });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to list projects',
    });
  }
});

/**
 * GET /projects/dir
 * Retorna o diretorio base de projetos
 */
router.get('/dir', (_req: Request, res: Response) => {
  res.json({ path: projectService.getProjectsDir() });
});

/**
 * GET /projects/info
 * Obtem informacoes de um projeto especifico
 */
router.get('/info', async (req: Request, res: Response) => {
  const { path: projectPath } = req.query;

  if (!projectPath || typeof projectPath !== 'string') {
    res.status(400).json({ error: 'Missing path parameter' });
    return;
  }

  try {
    const project = await projectService.getProject(projectPath);

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    res.json(project);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get project',
    });
  }
});

/**
 * GET /projects/manifest
 * Le o manifest de um projeto
 */
router.get('/manifest', async (req: Request, res: Response) => {
  const { path: projectPath } = req.query;

  if (!projectPath || typeof projectPath !== 'string') {
    res.status(400).json({ error: 'Missing path parameter' });
    return;
  }

  try {
    const manifest = await projectService.getManifest(projectPath);

    if (!manifest) {
      res.status(404).json({ error: 'Manifest not found' });
      return;
    }

    res.json(manifest);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to read manifest',
    });
  }
});

/**
 * PUT /projects/manifest
 * Atualiza o manifest de um projeto
 */
router.put('/manifest', async (req: Request, res: Response) => {
  const { path: projectPath, updates } = req.body;

  if (!projectPath) {
    res.status(400).json({ error: 'Missing path' });
    return;
  }

  if (!updates || typeof updates !== 'object') {
    res.status(400).json({ error: 'Missing updates' });
    return;
  }

  try {
    await projectService.updateManifest(projectPath, updates);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({
      error:
        error instanceof Error ? error.message : 'Failed to update manifest',
    });
  }
});

/**
 * GET /projects/status
 * Obtem status do projeto (node_modules, build, etc)
 */
router.get('/status', async (req: Request, res: Response) => {
  const { path: projectPath } = req.query;

  if (!projectPath || typeof projectPath !== 'string') {
    res.status(400).json({ error: 'Missing path parameter' });
    return;
  }

  try {
    const [hasNodeModules, hasBuild, buildInfo] = await Promise.all([
      projectService.hasNodeModules(projectPath),
      projectService.hasBuild(projectPath),
      projectService.getBuildInfo(projectPath),
    ]);

    res.json({
      hasNodeModules,
      hasBuild,
      buildInfo,
    });
  } catch (error) {
    res.status(500).json({
      error:
        error instanceof Error ? error.message : 'Failed to get project status',
    });
  }
});

export default router;
