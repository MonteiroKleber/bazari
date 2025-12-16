/**
 * Contract Routes - API endpoints for smart contract operations
 */

import { Router } from 'express';
import {
  checkContractEnvironment,
  compileContract,
  createContractProject,
  saveContractFiles,
  loadContractFiles,
  getContractArtifact,
} from '../services/contract.service.js';

const router = Router();

/**
 * GET /contracts/check-env
 * Check if Rust and cargo-contract are installed
 */
router.get('/check-env', async (_req, res) => {
  try {
    const env = await checkContractEnvironment();
    res.json(env);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to check environment',
    });
  }
});

/**
 * POST /contracts/new
 * Create new contract project from template
 */
router.post('/new', async (req, res) => {
  const { name, targetDir, template, files } = req.body;

  if (!name || !targetDir || !files) {
    res.status(400).json({ error: 'Missing required fields: name, targetDir, files' });
    return;
  }

  try {
    const result = await createContractProject(name, targetDir, template, files);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to create project',
    });
  }
});

/**
 * POST /contracts/compile
 * Compile ink! contract
 */
router.post('/compile', async (req, res) => {
  const { projectPath } = req.body;

  if (!projectPath) {
    res.status(400).json({ error: 'Missing required field: projectPath' });
    return;
  }

  try {
    const result = await compileContract(projectPath);

    if (result.success) {
      res.json({
        success: true,
        wasm: result.wasm,
        metadata: result.metadata,
        hash: result.hash,
        output: result.output,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        output: result.output,
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Compilation failed',
      output: '',
    });
  }
});

/**
 * POST /contracts/files
 * Save contract files
 */
router.post('/files', async (req, res) => {
  const { projectPath, files } = req.body;

  if (!projectPath || !files) {
    res.status(400).json({ error: 'Missing required fields: projectPath, files' });
    return;
  }

  try {
    await saveContractFiles(projectPath, files);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to save files',
    });
  }
});

/**
 * GET /contracts/files
 * Load contract files
 */
router.get('/files', async (req, res) => {
  const projectPath = req.query.projectPath as string;

  if (!projectPath) {
    res.status(400).json({ error: 'Missing required query param: projectPath' });
    return;
  }

  try {
    const files = await loadContractFiles(projectPath);
    res.json(files);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to load files',
    });
  }
});

/**
 * GET /contracts/artifact
 * Get compiled artifact (wasm, metadata, or contract bundle)
 */
router.get('/artifact', async (req, res) => {
  const projectPath = req.query.projectPath as string;
  const type = req.query.type as 'wasm' | 'metadata' | 'contract';

  if (!projectPath || !type) {
    res.status(400).json({ error: 'Missing required query params: projectPath, type' });
    return;
  }

  try {
    const artifact = await getContractArtifact(projectPath, type);

    // Set appropriate content type
    if (type === 'metadata') {
      res.setHeader('Content-Type', 'application/json');
    } else {
      res.setHeader('Content-Type', 'application/octet-stream');
    }

    res.send(artifact);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get artifact',
    });
  }
});

export default router;
