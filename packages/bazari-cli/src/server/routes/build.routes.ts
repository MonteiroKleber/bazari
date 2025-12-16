import { Router, Request, Response, type Router as RouterType } from 'express';
import { buildService, projectService } from '../services/index.js';

const router: RouterType = Router();

/**
 * POST /build/install
 * Executa npm install no projeto
 */
router.post('/install', async (req: Request, res: Response) => {
  const { projectPath } = req.body;

  if (!projectPath) {
    res.status(400).json({ error: 'Missing projectPath' });
    return;
  }

  try {
    const result = await buildService.npmInstall(projectPath);

    if (result.success) {
      res.json({ success: true, output: result.output });
    } else {
      res.status(500).json({
        success: false,
        error: 'npm install failed',
        output: result.output,
        exitCode: result.exitCode,
      });
    }
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to run npm install',
    });
  }
});

/**
 * POST /build/build
 * Executa npm run build no projeto
 */
router.post('/build', async (req: Request, res: Response) => {
  const { projectPath } = req.body;

  if (!projectPath) {
    res.status(400).json({ error: 'Missing projectPath' });
    return;
  }

  try {
    // Verifica se node_modules existe
    const hasModules = await projectService.hasNodeModules(projectPath);
    if (!hasModules) {
      res.status(400).json({
        error: 'node_modules not found. Run npm install first.',
      });
      return;
    }

    const result = await buildService.npmBuild(projectPath);

    if (result.success) {
      // Obtem build info
      const buildInfo = await projectService.getBuildInfo(projectPath);

      res.json({
        success: true,
        output: result.output,
        buildInfo,
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Build failed',
        output: result.output,
        exitCode: result.exitCode,
      });
    }
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to build',
    });
  }
});

/**
 * POST /build/dev
 * Inicia dev server
 */
router.post('/dev', async (req: Request, res: Response) => {
  const { projectPath, port = 3333 } = req.body;

  if (!projectPath) {
    res.status(400).json({ error: 'Missing projectPath' });
    return;
  }

  try {
    const result = await buildService.startDevServer(projectPath, port);

    if (result.success) {
      res.json({
        success: true,
        pid: result.pid,
        url: result.url,
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to start dev server',
      });
    }
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to start dev server',
    });
  }
});

/**
 * POST /build/dev/stop
 * Para dev server
 */
router.post('/dev/stop', async (req: Request, res: Response) => {
  const { projectPath, pid } = req.body;

  try {
    let result;

    if (projectPath) {
      result = await buildService.stopDevServer(projectPath);
    } else if (pid) {
      result = await buildService.stopDevServerByPid(pid);
    } else {
      res.status(400).json({ error: 'Missing projectPath or pid' });
      return;
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to stop dev server',
    });
  }
});

/**
 * POST /build/typecheck
 * Executa type check
 */
router.post('/typecheck', async (req: Request, res: Response) => {
  const { projectPath } = req.body;

  if (!projectPath) {
    res.status(400).json({ error: 'Missing projectPath' });
    return;
  }

  try {
    const result = await buildService.typeCheck(projectPath);
    res.json({
      success: result.success,
      output: result.output,
      exitCode: result.exitCode,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to run type check',
    });
  }
});

/**
 * POST /build/lint
 * Executa lint
 */
router.post('/lint', async (req: Request, res: Response) => {
  const { projectPath } = req.body;

  if (!projectPath) {
    res.status(400).json({ error: 'Missing projectPath' });
    return;
  }

  try {
    const result = await buildService.lint(projectPath);
    res.json({
      success: result.success,
      output: result.output,
      exitCode: result.exitCode,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to run lint',
    });
  }
});

/**
 * POST /build/test
 * Executa testes
 */
router.post('/test', async (req: Request, res: Response) => {
  const { projectPath } = req.body;

  if (!projectPath) {
    res.status(400).json({ error: 'Missing projectPath' });
    return;
  }

  try {
    const result = await buildService.test(projectPath);
    res.json({
      success: result.success,
      output: result.output,
      exitCode: result.exitCode,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to run tests',
    });
  }
});

export default router;
