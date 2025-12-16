/**
 * Git Routes for Bazari CLI Server
 */

import { Router } from 'express';
import { gitService } from '../services/git.service.js';

const router = Router();

/**
 * GET /git/status - Get git status for a directory/project
 */
router.get('/status', async (req, res) => {
  const { path: dirPath } = req.query;

  if (!dirPath || typeof dirPath !== 'string') {
    return res.status(400).json({ error: 'Path is required' });
  }

  try {
    const status = await gitService.getStatus(dirPath);
    res.json(status);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get git status',
    });
  }
});

/**
 * GET /git/branch - Get current branch for a directory
 */
router.get('/branch', async (req, res) => {
  const { path: dirPath } = req.query;

  if (!dirPath || typeof dirPath !== 'string') {
    return res.json({ branch: null, error: 'Path is required' });
  }

  try {
    const branch = await gitService.getCurrentBranch(dirPath);
    res.json({ branch });
  } catch (error) {
    res.json({
      branch: null,
      error: error instanceof Error ? error.message : 'Failed to get branch',
    });
  }
});

/**
 * GET /git/is-repo - Check if path is a git repository
 */
router.get('/is-repo', async (req, res) => {
  const { path: dirPath } = req.query;

  if (!dirPath || typeof dirPath !== 'string') {
    return res.json({ isGitRepo: false });
  }

  try {
    const isGitRepo = await gitService.isGitRepo(dirPath);
    res.json({ isGitRepo });
  } catch {
    res.json({ isGitRepo: false });
  }
});

/**
 * GET /git/file-status - Get file git status
 */
router.get('/file-status', async (req, res) => {
  const { path: filePath } = req.query;

  if (!filePath || typeof filePath !== 'string') {
    return res.json({ status: null });
  }

  try {
    const result = await gitService.getFileStatus(filePath);
    res.json(result);
  } catch {
    res.json({ status: null });
  }
});

export default router;
