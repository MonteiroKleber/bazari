import { Router, Request, Response, type Router as RouterType } from 'express';
import { projectService } from '../services/index.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import archiver from 'archiver';
import { createWriteStream } from 'fs';

const router: RouterType = Router();

/**
 * POST /publish/prepare
 * Prepara o projeto para publicacao (cria tarball)
 */
router.post('/prepare', async (req: Request, res: Response) => {
  const { projectPath } = req.body;

  if (!projectPath) {
    res.status(400).json({ error: 'Missing projectPath' });
    return;
  }

  try {
    // Verifica se tem build
    const hasBuild = await projectService.hasBuild(projectPath);
    if (!hasBuild) {
      res.status(400).json({
        error: 'No build found. Run build first.',
      });
      return;
    }

    // Obtem manifest e build info
    const manifest = await projectService.getManifest(projectPath);
    const buildInfo = await projectService.getBuildInfo(projectPath);

    if (!manifest) {
      res.status(400).json({ error: 'Manifest not found' });
      return;
    }

    if (!buildInfo) {
      res.status(400).json({ error: 'Build info not found' });
      return;
    }

    // Cria tarball
    const tarballPath = path.join(
      projectPath,
      `${manifest.slug}-${manifest.version}.tar.gz`
    );
    const distPath = path.join(projectPath, 'dist');

    await createTarball(distPath, tarballPath);

    // Obtem tamanho do tarball
    const stats = await fs.stat(tarballPath);

    res.json({
      success: true,
      tarballPath,
      tarballSize: stats.size,
      manifest,
      buildInfo,
    });
  } catch (error) {
    res.status(500).json({
      error:
        error instanceof Error ? error.message : 'Failed to prepare publish',
    });
  }
});

/**
 * POST /publish/submit
 * Submete o app para publicacao
 * (Upload IPFS + API sera feito via authToken)
 */
router.post('/submit', async (req: Request, res: Response) => {
  const { projectPath, changelog, authToken } = req.body;

  if (!projectPath) {
    res.status(400).json({ error: 'Missing projectPath' });
    return;
  }

  if (!authToken) {
    res.status(400).json({ error: 'Missing authToken' });
    return;
  }

  try {
    // Verifica se tem build
    const hasBuild = await projectService.hasBuild(projectPath);
    if (!hasBuild) {
      res.status(400).json({
        error: 'No build found. Run build first.',
      });
      return;
    }

    // Obtem manifest
    const manifest = await projectService.getManifest(projectPath);
    if (!manifest) {
      res.status(400).json({ error: 'Manifest not found' });
      return;
    }

    // Cria tarball
    const tarballPath = path.join(
      projectPath,
      `${manifest.slug}-${manifest.version}.tar.gz`
    );
    const distPath = path.join(projectPath, 'dist');

    await createTarball(distPath, tarballPath);

    // Le tarball como buffer
    const tarballBuffer = await fs.readFile(tarballPath);

    // Upload para IPFS via API Bazari
    const uploadResponse = await fetch(
      'https://bazari.libervia.xyz/api/developer/upload-bundle',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/octet-stream',
          'X-App-Slug': manifest.slug,
          'X-App-Version': manifest.version,
        },
        body: tarballBuffer,
      }
    );

    if (!uploadResponse.ok) {
      const error = await uploadResponse.json().catch(() => ({}));
      throw new Error(
        (error as { message?: string }).message || 'Failed to upload bundle'
      );
    }

    const uploadResult = (await uploadResponse.json()) as {
      cid: string;
      bundleUrl: string;
    };

    // Submete versao para review
    const submitResponse = await fetch(
      'https://bazari.libervia.xyz/api/developer/submit-version',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appSlug: manifest.slug,
          version: manifest.version,
          cid: uploadResult.cid,
          bundleUrl: uploadResult.bundleUrl,
          changelog: changelog || '',
          manifest,
        }),
      }
    );

    if (!submitResponse.ok) {
      const error = await submitResponse.json().catch(() => ({}));
      throw new Error(
        (error as { message?: string }).message || 'Failed to submit version'
      );
    }

    const submitResult = (await submitResponse.json()) as {
      appId: string;
      versionId: string;
    };

    // Limpa tarball temporario
    await fs.unlink(tarballPath).catch(() => {});

    res.json({
      success: true,
      cid: uploadResult.cid,
      bundleUrl: uploadResult.bundleUrl,
      appId: submitResult.appId,
      versionId: submitResult.versionId,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to publish',
    });
  }
});

/**
 * GET /publish/status
 * Verifica status de publicacao de um app
 */
router.get('/status', async (req: Request, res: Response) => {
  const { appSlug, authToken } = req.query;

  if (!appSlug || !authToken) {
    res.status(400).json({ error: 'Missing appSlug or authToken' });
    return;
  }

  try {
    const response = await fetch(
      `https://bazari.libervia.xyz/api/developer/app-status?slug=${appSlug}`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to get app status');
    }

    const status = await response.json();
    res.json(status);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get status',
    });
  }
});

/**
 * Cria um tarball do diretorio dist
 */
async function createTarball(srcDir: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const output = createWriteStream(destPath);
    const archive = archiver('tar', { gzip: true });

    output.on('close', () => resolve());
    archive.on('error', (err) => reject(err));

    archive.pipe(output);
    archive.directory(srcDir, false);
    archive.finalize();
  });
}

export default router;
