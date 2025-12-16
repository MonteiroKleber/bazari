import { Router, type Router as RouterType } from 'express';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const router: RouterType = Router();

interface ToolStatus {
  installed: boolean;
  version?: string;
}

/**
 * Verifica se uma ferramenta esta instalada e retorna a versao
 */
async function checkTool(command: string): Promise<ToolStatus> {
  try {
    const { stdout } = await execAsync(command);
    return {
      installed: true,
      version: stdout.trim().split('\n')[0],
    };
  } catch {
    return { installed: false };
  }
}

/**
 * GET /status
 * Retorna informacoes basicas do servidor
 */
router.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    version: '0.1.0',
    platform: os.platform(),
    arch: os.arch(),
    nodeVersion: process.version,
    cwd: process.cwd(),
    homedir: os.homedir(),
    uptime: process.uptime(),
  });
});

/**
 * GET /status/tools
 * Verifica ferramentas de desenvolvimento instaladas
 */
router.get('/tools', async (_req, res) => {
  const [node, npm, rust, cargoContract] = await Promise.all([
    checkTool('node --version'),
    checkTool('npm --version'),
    checkTool('rustc --version'),
    checkTool('cargo contract --version'),
  ]);

  res.json({
    node,
    npm,
    rust,
    cargoContract,
  });
});

/**
 * GET /status/health
 * Health check simples
 */
router.get('/health', (_req, res) => {
  res.json({ healthy: true });
});

export default router;
