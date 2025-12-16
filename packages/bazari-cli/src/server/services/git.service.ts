/**
 * Git Service for Bazari CLI Server
 * Provides git repository information
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs/promises';

const execAsync = promisify(exec);

export interface GitStatus {
  isGitRepo: boolean;
  branch: string | null;
  hasChanges: boolean;
  ahead: number;
  behind: number;
}

export interface GitFileInfo {
  status: 'modified' | 'added' | 'deleted' | 'renamed' | 'untracked' | null;
}

class GitService {
  /**
   * Check if path is inside a git repository
   */
  async isGitRepo(dirPath: string): Promise<boolean> {
    try {
      await execAsync('git rev-parse --is-inside-work-tree', { cwd: dirPath });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get current branch name
   */
  async getCurrentBranch(dirPath: string): Promise<string | null> {
    try {
      const { stdout } = await execAsync('git rev-parse --abbrev-ref HEAD', {
        cwd: dirPath,
      });
      return stdout.trim();
    } catch {
      return null;
    }
  }

  /**
   * Get git status for a directory
   */
  async getStatus(dirPath: string): Promise<GitStatus> {
    const isGitRepo = await this.isGitRepo(dirPath);

    if (!isGitRepo) {
      return {
        isGitRepo: false,
        branch: null,
        hasChanges: false,
        ahead: 0,
        behind: 0,
      };
    }

    const branch = await this.getCurrentBranch(dirPath);
    let hasChanges = false;
    let ahead = 0;
    let behind = 0;

    try {
      // Check for uncommitted changes
      const { stdout: statusOutput } = await execAsync('git status --porcelain', {
        cwd: dirPath,
      });
      hasChanges = statusOutput.trim().length > 0;

      // Check ahead/behind
      try {
        const { stdout: revOutput } = await execAsync(
          'git rev-list --left-right --count HEAD...@{upstream}',
          { cwd: dirPath }
        );
        const [aheadStr, behindStr] = revOutput.trim().split(/\s+/);
        ahead = parseInt(aheadStr, 10) || 0;
        behind = parseInt(behindStr, 10) || 0;
      } catch {
        // No upstream configured
      }
    } catch {
      // Ignore errors
    }

    return {
      isGitRepo: true,
      branch,
      hasChanges,
      ahead,
      behind,
    };
  }

  /**
   * Get git status for a specific file
   */
  async getFileStatus(filePath: string): Promise<GitFileInfo> {
    const dirPath = path.dirname(filePath);
    const fileName = path.basename(filePath);

    try {
      const isGitRepo = await this.isGitRepo(dirPath);
      if (!isGitRepo) {
        return { status: null };
      }

      // Check if file is tracked
      const { stdout: statusOutput } = await execAsync(
        `git status --porcelain "${fileName}"`,
        { cwd: dirPath }
      );

      if (!statusOutput.trim()) {
        return { status: null }; // File is tracked and unchanged
      }

      const statusChar = statusOutput.trim().substring(0, 2);

      if (statusChar.includes('M')) return { status: 'modified' };
      if (statusChar.includes('A')) return { status: 'added' };
      if (statusChar.includes('D')) return { status: 'deleted' };
      if (statusChar.includes('R')) return { status: 'renamed' };
      if (statusChar.includes('?')) return { status: 'untracked' };

      return { status: null };
    } catch {
      return { status: null };
    }
  }

  /**
   * Get the root of the git repository
   */
  async getRepoRoot(dirPath: string): Promise<string | null> {
    try {
      const { stdout } = await execAsync('git rev-parse --show-toplevel', {
        cwd: dirPath,
      });
      return stdout.trim();
    } catch {
      return null;
    }
  }
}

export const gitService = new GitService();
export { GitService };
