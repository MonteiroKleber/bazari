import { Router, Request, Response, type Router as RouterType } from 'express';
import { fileService } from '../services/index.js';

const router: RouterType = Router();

/**
 * GET /files
 * Le conteudo de um arquivo
 */
router.get('/', async (req: Request, res: Response) => {
  const { path: filePath } = req.query;

  if (!filePath || typeof filePath !== 'string') {
    res.status(400).json({ error: 'Missing path parameter' });
    return;
  }

  try {
    const content = await fileService.readFile(filePath);
    res.json({ content });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      res.status(404).json({ error: 'File not found' });
    } else {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to read file',
      });
    }
  }
});

/**
 * PUT /files
 * Escreve conteudo em um arquivo
 */
router.put('/', async (req: Request, res: Response) => {
  const { path: filePath, content } = req.body;

  if (!filePath) {
    res.status(400).json({ error: 'Missing path' });
    return;
  }

  if (typeof content !== 'string') {
    res.status(400).json({ error: 'Missing content' });
    return;
  }

  try {
    await fileService.writeFile(filePath, content);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to write file',
    });
  }
});

/**
 * GET /files/list
 * Lista arquivos de um diretorio
 */
router.get('/list', async (req: Request, res: Response) => {
  const { path: dirPath } = req.query;

  if (!dirPath || typeof dirPath !== 'string') {
    res.status(400).json({ error: 'Missing path parameter' });
    return;
  }

  try {
    const files = await fileService.listDirectory(dirPath);
    res.json({ files });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      res.status(404).json({ error: 'Directory not found' });
    } else {
      res.status(500).json({
        error:
          error instanceof Error ? error.message : 'Failed to list directory',
      });
    }
  }
});

/**
 * POST /files/mkdir
 * Cria um diretorio
 */
router.post('/mkdir', async (req: Request, res: Response) => {
  const { path: dirPath } = req.body;

  if (!dirPath) {
    res.status(400).json({ error: 'Missing path' });
    return;
  }

  try {
    await fileService.createDirectory(dirPath);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({
      error:
        error instanceof Error ? error.message : 'Failed to create directory',
    });
  }
});

/**
 * DELETE /files
 * Deleta um arquivo ou diretorio
 */
router.delete('/', async (req: Request, res: Response) => {
  const { path: targetPath, recursive } = req.body;

  if (!targetPath) {
    res.status(400).json({ error: 'Missing path' });
    return;
  }

  try {
    await fileService.delete(targetPath, recursive ?? false);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to delete',
    });
  }
});

/**
 * POST /files/rename
 * Renomeia/move um arquivo ou diretorio
 */
router.post('/rename', async (req: Request, res: Response) => {
  const { oldPath, newPath } = req.body;

  if (!oldPath || !newPath) {
    res.status(400).json({ error: 'Missing oldPath or newPath' });
    return;
  }

  try {
    await fileService.rename(oldPath, newPath);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to rename',
    });
  }
});

/**
 * POST /files/copy
 * Copia um arquivo
 */
router.post('/copy', async (req: Request, res: Response) => {
  const { srcPath, destPath } = req.body;

  if (!srcPath || !destPath) {
    res.status(400).json({ error: 'Missing srcPath or destPath' });
    return;
  }

  try {
    await fileService.copy(srcPath, destPath);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to copy',
    });
  }
});

/**
 * GET /files/exists
 * Verifica se um caminho existe
 */
router.get('/exists', async (req: Request, res: Response) => {
  const { path: targetPath } = req.query;

  if (!targetPath || typeof targetPath !== 'string') {
    res.status(400).json({ error: 'Missing path parameter' });
    return;
  }

  try {
    const exists = await fileService.exists(targetPath);
    res.json({ exists });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to check path',
    });
  }
});

/**
 * GET /files/info
 * Obtem informacoes de um arquivo
 */
router.get('/info', async (req: Request, res: Response) => {
  const { path: filePath } = req.query;

  if (!filePath || typeof filePath !== 'string') {
    res.status(400).json({ error: 'Missing path parameter' });
    return;
  }

  try {
    const info = await fileService.getFileInfo(filePath);

    if (!info) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    res.json(info);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get file info',
    });
  }
});

export default router;
