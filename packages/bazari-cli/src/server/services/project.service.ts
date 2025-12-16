import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { fileService } from './file.service.js';

export interface ProjectInfo {
  id: string;
  name: string;
  path: string;
  description: string;
  version: string;
  category?: string;
  type: 'app' | 'contract';
  lastModified: string;
}

export interface BazariManifest {
  id: string;
  name: string;
  slug: string;
  version: string;
  description: string;
  category: string;
  author: string;
  entryPoint: string;
  permissions: string[];
}

const PROJECTS_DIR = path.join(os.homedir(), 'bazari-projects');

export class ProjectService {
  /**
   * Retorna o diretorio base de projetos
   */
  getProjectsDir(): string {
    return PROJECTS_DIR;
  }

  /**
   * Lista todos os projetos locais
   */
  async listProjects(): Promise<ProjectInfo[]> {
    // Garante que o diretorio existe
    await fs.mkdir(PROJECTS_DIR, { recursive: true });

    const entries = await fs.readdir(PROJECTS_DIR, { withFileTypes: true });
    const projects: ProjectInfo[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const projectPath = path.join(PROJECTS_DIR, entry.name);
      const manifestPath = path.join(projectPath, 'bazari.manifest.json');

      try {
        const manifestContent = await fs.readFile(manifestPath, 'utf-8');
        const manifest = JSON.parse(manifestContent);
        const stats = await fs.stat(manifestPath);

        projects.push({
          id: manifest.appId || manifest.id || entry.name,
          name: manifest.name || entry.name,
          path: projectPath,
          description: manifest.description || '',
          version: manifest.version || '0.0.0',
          category: manifest.category,
          type: manifest.category === 'contract' ? 'contract' : 'app',
          lastModified: stats.mtime.toISOString(),
        });
      } catch {
        // Projeto sem manifest valido, pula
        continue;
      }
    }

    // Ordena por data de modificacao (mais recente primeiro)
    return projects.sort(
      (a, b) =>
        new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
    );
  }

  /**
   * Obtem informacoes de um projeto especifico
   */
  async getProject(projectPath: string): Promise<ProjectInfo | null> {
    const manifestPath = path.join(projectPath, 'bazari.manifest.json');

    try {
      const manifestContent = await fs.readFile(manifestPath, 'utf-8');
      const manifest = JSON.parse(manifestContent);
      const stats = await fs.stat(manifestPath);

      return {
        id: manifest.appId || manifest.id || path.basename(projectPath),
        name: manifest.name || path.basename(projectPath),
        path: projectPath,
        description: manifest.description || '',
        version: manifest.version || '0.0.0',
        category: manifest.category,
        type: manifest.category === 'contract' ? 'contract' : 'app',
        lastModified: stats.mtime.toISOString(),
      };
    } catch {
      return null;
    }
  }

  /**
   * Le o manifest de um projeto
   */
  async getManifest(projectPath: string): Promise<BazariManifest | null> {
    const manifestPath = path.join(projectPath, 'bazari.manifest.json');

    try {
      const content = await fs.readFile(manifestPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  /**
   * Atualiza o manifest de um projeto
   */
  async updateManifest(
    projectPath: string,
    updates: Partial<BazariManifest>
  ): Promise<void> {
    const manifestPath = path.join(projectPath, 'bazari.manifest.json');
    const current = await this.getManifest(projectPath);

    if (!current) {
      throw new Error('Manifest not found');
    }

    const updated = { ...current, ...updates };
    await fs.writeFile(manifestPath, JSON.stringify(updated, null, 2), 'utf-8');
  }

  /**
   * Verifica se um projeto tem node_modules instalado
   */
  async hasNodeModules(projectPath: string): Promise<boolean> {
    return fileService.exists(path.join(projectPath, 'node_modules'));
  }

  /**
   * Verifica se um projeto tem build (dist/)
   */
  async hasBuild(projectPath: string): Promise<boolean> {
    return fileService.exists(path.join(projectPath, 'dist'));
  }

  /**
   * Obtem informacoes do build anterior
   */
  async getBuildInfo(
    projectPath: string
  ): Promise<{ hash: string; timestamp: string; size: number } | null> {
    const buildInfoPath = path.join(projectPath, '.build-info.json');

    try {
      const content = await fs.readFile(buildInfoPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }
}

export const projectService = new ProjectService();
