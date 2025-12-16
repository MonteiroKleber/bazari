/**
 * Cliente para comunicacao com CLI Server local
 */

const CLI_SERVER_URL = 'http://localhost:4444';

export interface ServerStatusResponse {
  status: string;
  version: string;
  platform: string;
  arch: string;
  nodeVersion: string;
  cwd: string;
  homedir: string;
  uptime: number;
}

export interface ToolsStatusResponse {
  node: { installed: boolean; version?: string };
  npm: { installed: boolean; version?: string };
  rust: { installed: boolean; version?: string };
  cargoContract: { installed: boolean; version?: string };
}

export interface FileInfo {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
  modified?: string;
}

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

export interface BuildResult {
  success: boolean;
  output: string;
  exitCode?: number;
  buildInfo?: {
    hash: string;
    size: number;
    timestamp: string;
  };
}

export interface DevServerResult {
  success: boolean;
  pid?: number;
  url?: string;
  error?: string;
}

class LocalServerClient {
  private baseUrl: string;

  constructor(baseUrl = CLI_SERVER_URL) {
    this.baseUrl = baseUrl;
  }

  // ==================== STATUS ====================

  /**
   * Verifica se o servidor esta rodando
   */
  async getStatus(): Promise<ServerStatusResponse> {
    const response = await fetch(`${this.baseUrl}/status`, {
      signal: AbortSignal.timeout(3000),
    });

    if (!response.ok) {
      throw new Error('CLI Server not responding');
    }

    return response.json();
  }

  /**
   * Verifica ferramentas instaladas
   */
  async getToolsStatus(): Promise<ToolsStatusResponse> {
    const response = await fetch(`${this.baseUrl}/status/tools`);

    if (!response.ok) {
      throw new Error('Failed to get tools status');
    }

    return response.json();
  }

  // ==================== PROJECTS ====================

  /**
   * Lista projetos locais
   */
  async listProjects(): Promise<ProjectInfo[]> {
    const response = await fetch(`${this.baseUrl}/projects`);

    if (!response.ok) {
      throw new Error('Failed to list projects');
    }

    const data = await response.json();
    return data.projects;
  }

  /**
   * Obtem informacoes de um projeto
   */
  async getProject(projectPath: string): Promise<ProjectInfo | null> {
    const response = await fetch(
      `${this.baseUrl}/projects/info?path=${encodeURIComponent(projectPath)}`
    );

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error('Failed to get project');
    }

    return response.json();
  }

  /**
   * Obtem diretorio base de projetos
   */
  async getProjectsDir(): Promise<string> {
    const response = await fetch(`${this.baseUrl}/projects/dir`);

    if (!response.ok) {
      throw new Error('Failed to get projects dir');
    }

    const data = await response.json();
    return data.path;
  }

  // ==================== FILES ====================

  /**
   * Le um arquivo
   */
  async readFile(filePath: string): Promise<string> {
    const response = await fetch(
      `${this.baseUrl}/files?path=${encodeURIComponent(filePath)}`
    );

    if (!response.ok) {
      throw new Error('Failed to read file');
    }

    const data = await response.json();
    return data.content;
  }

  /**
   * Escreve um arquivo
   */
  async writeFile(filePath: string, content: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/files`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: filePath, content }),
    });

    if (!response.ok) {
      throw new Error('Failed to write file');
    }
  }

  /**
   * Lista arquivos de um diretorio
   */
  async listDirectory(dirPath: string): Promise<FileInfo[]> {
    const response = await fetch(
      `${this.baseUrl}/files/list?path=${encodeURIComponent(dirPath)}`
    );

    if (!response.ok) {
      throw new Error('Failed to list directory');
    }

    const data = await response.json();
    return data.files;
  }

  /**
   * Cria um novo diretorio
   */
  async createDirectory(dirPath: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/files/mkdir`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: dirPath }),
    });

    if (!response.ok) {
      throw new Error('Failed to create directory');
    }
  }

  /**
   * Deleta um arquivo ou diretorio
   */
  async delete(targetPath: string, recursive = false): Promise<void> {
    const response = await fetch(`${this.baseUrl}/files`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: targetPath, recursive }),
    });

    if (!response.ok) {
      throw new Error('Failed to delete');
    }
  }

  /**
   * Renomeia um arquivo ou diretorio
   */
  async rename(oldPath: string, newPath: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/files/rename`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldPath, newPath }),
    });

    if (!response.ok) {
      throw new Error('Failed to rename');
    }
  }

  /**
   * Verifica se um caminho existe
   */
  async exists(targetPath: string): Promise<boolean> {
    const response = await fetch(
      `${this.baseUrl}/files/exists?path=${encodeURIComponent(targetPath)}`
    );

    if (!response.ok) {
      throw new Error('Failed to check path');
    }

    const data = await response.json();
    return data.exists;
  }

  // ==================== BUILD ====================

  /**
   * Executa npm install
   */
  async npmInstall(projectPath: string): Promise<BuildResult> {
    const response = await fetch(`${this.baseUrl}/build/install`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectPath }),
    });

    return response.json();
  }

  /**
   * Executa npm run build
   */
  async runBuild(projectPath: string): Promise<BuildResult> {
    const response = await fetch(`${this.baseUrl}/build/build`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectPath }),
    });

    return response.json();
  }

  /**
   * Inicia dev server
   */
  async startDevServer(projectPath: string, port = 3333): Promise<DevServerResult> {
    const response = await fetch(`${this.baseUrl}/build/dev`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectPath, port }),
    });

    return response.json();
  }

  /**
   * Para dev server
   */
  async stopDevServer(projectPath: string): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/build/dev/stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectPath }),
    });

    return response.json();
  }

  /**
   * Executa type check
   */
  async typeCheck(projectPath: string): Promise<BuildResult> {
    const response = await fetch(`${this.baseUrl}/build/typecheck`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectPath }),
    });

    return response.json();
  }

  // ==================== CREATE ====================

  /**
   * Lista templates disponíveis
   */
  async getTemplates(): Promise<{ id: string; name: string; description: string }[]> {
    const response = await fetch(`${this.baseUrl}/create/templates`);

    if (!response.ok) {
      throw new Error('Failed to get templates');
    }

    const data = await response.json();
    return data.templates;
  }

  /**
   * Lista categorias disponíveis
   */
  async getCategories(): Promise<{ id: string; name: string }[]> {
    const response = await fetch(`${this.baseUrl}/create/categories`);

    if (!response.ok) {
      throw new Error('Failed to get categories');
    }

    const data = await response.json();
    return data.categories;
  }

  /**
   * Cria um novo projeto
   */
  async createProject(options: {
    name: string;
    description: string;
    template: string;
    category: string;
    author?: string;
    files?: { path: string; content: string }[];
    distribution?: {
      appStore: boolean;
      external: boolean;
      allowedOrigins?: string[];
    };
  }): Promise<{ success: boolean; projectPath?: string; slug?: string; error?: string }> {
    const response = await fetch(`${this.baseUrl}/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options),
    });

    return response.json();
  }

  // ==================== PUBLISH ====================

  /**
   * Prepara o projeto para publicação (cria tarball)
   */
  async preparePublish(projectPath: string): Promise<{
    success: boolean;
    tarballPath?: string;
    tarballSize?: number;
    manifest?: Record<string, unknown>;
    buildInfo?: Record<string, unknown>;
    error?: string;
  }> {
    const response = await fetch(`${this.baseUrl}/publish/prepare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectPath }),
    });

    return response.json();
  }

  /**
   * Submete o app para publicação
   */
  async submitPublish(
    projectPath: string,
    authToken: string,
    changelog?: string
  ): Promise<{
    success: boolean;
    cid?: string;
    bundleUrl?: string;
    appId?: string;
    versionId?: string;
    error?: string;
  }> {
    const response = await fetch(`${this.baseUrl}/publish/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectPath, authToken, changelog }),
    });

    return response.json();
  }

  /**
   * Verifica status de publicação de um app
   */
  async getPublishStatus(
    appSlug: string,
    authToken: string
  ): Promise<Record<string, unknown>> {
    const response = await fetch(
      `${this.baseUrl}/publish/status?appSlug=${encodeURIComponent(appSlug)}&authToken=${encodeURIComponent(authToken)}`
    );

    if (!response.ok) {
      throw new Error('Failed to get publish status');
    }

    return response.json();
  }

  // ==================== WEBSOCKET ====================

  /**
   * Conecta ao terminal interativo
   */
  connectTerminal(cwd: string): WebSocket {
    return new WebSocket(
      `ws://localhost:4444/terminal?cwd=${encodeURIComponent(cwd)}`
    );
  }

  /**
   * Conecta ao file watcher
   */
  watchFiles(watchPath: string): WebSocket {
    return new WebSocket(
      `ws://localhost:4444/watcher?path=${encodeURIComponent(watchPath)}`
    );
  }

  /**
   * Conecta para executar comando unico
   */
  connectCommand(): WebSocket {
    return new WebSocket('ws://localhost:4444/command');
  }

  // ==================== GIT ====================

  /**
   * Obtem status git de um diretorio
   */
  async getGitStatus(dirPath: string): Promise<{
    isGitRepo: boolean;
    branch: string | null;
    hasChanges: boolean;
    ahead: number;
    behind: number;
  }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/git/status?path=${encodeURIComponent(dirPath)}`
      );

      if (!response.ok) {
        return {
          isGitRepo: false,
          branch: null,
          hasChanges: false,
          ahead: 0,
          behind: 0,
        };
      }

      return response.json();
    } catch {
      return {
        isGitRepo: false,
        branch: null,
        hasChanges: false,
        ahead: 0,
        behind: 0,
      };
    }
  }

  /**
   * Obtem branch atual
   */
  async getGitBranch(dirPath: string): Promise<string | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/git/branch?path=${encodeURIComponent(dirPath)}`
      );

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.branch;
    } catch {
      return null;
    }
  }

  /**
   * Verifica se e um repositorio git
   */
  async isGitRepo(dirPath: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}/git/is-repo?path=${encodeURIComponent(dirPath)}`
      );

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      return data.isGitRepo;
    } catch {
      return false;
    }
  }

  /**
   * Obtem status git de um arquivo
   */
  async getGitFileStatus(filePath: string): Promise<string | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/git/file-status?path=${encodeURIComponent(filePath)}`
      );

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.status;
    } catch {
      return null;
    }
  }

  // ==================== EXTERNAL SDK ====================

  /**
   * Verifica status do SDK externo para um projeto
   */
  async getExternalSDKStatus(projectPath: string): Promise<{
    success: boolean;
    apiKey?: string;
    allowedOrigins?: string[];
    createdAt?: string;
    error?: string;
  }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/sdk/status?projectPath=${encodeURIComponent(projectPath)}`
      );

      if (!response.ok) {
        return { success: false, error: 'Failed to get SDK status' };
      }

      return response.json();
    } catch {
      return { success: false, error: 'SDK status not available' };
    }
  }

  /**
   * Gera API Key para SDK externo
   */
  async generateExternalSDKKey(
    projectPath: string,
    authToken: string,
    options: {
      name: string;
      slug: string;
      allowedOrigins: string[];
      permissions: string[];
    }
  ): Promise<{
    success: boolean;
    apiKey?: string;
    secretKey?: string;
    allowedOrigins?: string[];
    error?: string;
  }> {
    const response = await fetch(`${this.baseUrl}/sdk/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectPath, authToken, ...options }),
    });

    return response.json();
  }

  /**
   * Rotaciona secret key do SDK externo
   */
  async rotateExternalSDKSecret(
    projectPath: string,
    authToken: string,
    apiKey: string
  ): Promise<{
    success: boolean;
    secretKey?: string;
    error?: string;
  }> {
    const response = await fetch(`${this.baseUrl}/sdk/rotate-secret`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectPath, authToken, apiKey }),
    });

    return response.json();
  }
}

// Singleton instance
export const localServer = new LocalServerClient();

export default LocalServerClient;
