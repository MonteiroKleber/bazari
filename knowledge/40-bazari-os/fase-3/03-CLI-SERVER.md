# 03 - CLI Server (Servidor Local)

## Objetivo

Implementar o servidor local que roda na maquina do desenvolvedor, permitindo:
- Gerenciar arquivos do projeto no disco
- Executar comandos (npm, cargo, etc)
- Prover terminal interativo via WebSocket
- Executar build e publish
- Servir dev server com HMR

## Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                    CLI SERVER (:4444)                           │
│                                                                 │
│  ┌───────────────────┐  ┌───────────────────┐                   │
│  │   REST API        │  │   WebSocket       │                   │
│  │                   │  │                   │                   │
│  │  /api/status      │  │  /ws/terminal     │                   │
│  │  /api/projects    │  │  /ws/watch        │                   │
│  │  /api/files       │  │                   │                   │
│  │  /api/build       │  │                   │                   │
│  │  /api/publish     │  │                   │                   │
│  │  /api/contract    │  │                   │                   │
│  └───────────────────┘  └───────────────────┘                   │
│           │                      │                              │
│           └──────────┬───────────┘                              │
│                      ▼                                          │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    SERVICES                               │  │
│  │                                                           │  │
│  │  FileService        ProjectService      BuildService      │  │
│  │  TerminalService    DevServerService    ContractService   │  │
│  │  PublishService                                           │  │
│  │                                                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│                      │                                          │
│                      ▼                                          │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    SYSTEM                                 │  │
│  │                                                           │  │
│  │  - Sistema de arquivos (fs)                               │  │
│  │  - Processos filho (child_process)                        │  │
│  │  - PTY (node-pty)                                         │  │
│  │  - File watcher (chokidar)                                │  │
│  │                                                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Estrutura de Arquivos

```
packages/bazari-cli/src/
├── commands/
│   └── studio.ts              // bazari studio --serve
├── server/
│   ├── index.ts               // Entry point
│   ├── routes/
│   │   ├── status.ts          // GET /api/status
│   │   ├── projects.ts        // CRUD projetos
│   │   ├── files.ts           // CRUD arquivos
│   │   ├── build.ts           // POST /api/build
│   │   ├── publish.ts         // POST /api/publish
│   │   └── contracts.ts       // POST /api/contract/build
│   ├── websocket/
│   │   ├── terminal.ts        // PTY terminal
│   │   └── watcher.ts         // File watcher
│   └── services/
│       ├── file.service.ts
│       ├── project.service.ts
│       ├── build.service.ts
│       ├── publish.service.ts
│       ├── contract.service.ts
│       ├── terminal.service.ts
│       └── dev-server.service.ts
└── types/
    └── server.types.ts
```

## Dependencias

```bash
# Adicionar ao packages/bazari-cli
pnpm add express cors ws node-pty chokidar archiver

# Types
pnpm add -D @types/express @types/cors @types/ws
```

## Implementacao

### Comando Studio

```typescript
// commands/studio.ts

import { Command } from 'commander';
import { startServer } from '../server';

export function registerStudioCommand(program: Command) {
  program
    .command('studio')
    .description('Inicia o Bazari Studio')
    .option('--serve', 'Inicia servidor local para o Studio UI')
    .option('-p, --port <port>', 'Porta do servidor', '4444')
    .option('-d, --dir <dir>', 'Diretorio de projetos')
    .action(async (options) => {
      if (options.serve) {
        await startServer({
          port: parseInt(options.port),
          projectDir: options.dir,
        });
      } else {
        // Abrir Studio no browser
        console.log('Abrindo Bazari Studio...');
        open('https://bazari.libervia.xyz/app/studio');
      }
    });
}
```

### Server Entry Point

```typescript
// server/index.ts

import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import path from 'path';
import os from 'os';
import fs from 'fs/promises';

import { statusRoutes } from './routes/status';
import { projectRoutes } from './routes/projects';
import { fileRoutes } from './routes/files';
import { buildRoutes } from './routes/build';
import { publishRoutes } from './routes/publish';
import { contractRoutes } from './routes/contracts';
import { handleTerminalConnection } from './websocket/terminal';
import { handleWatcherConnection } from './websocket/watcher';

interface ServerOptions {
  port?: number;
  projectDir?: string;
}

export async function startServer(options: ServerOptions = {}) {
  const port = options.port || 4444;
  const projectDir = options.projectDir || path.join(os.homedir(), 'bazari-projects');

  // Garantir que diretorio existe
  await fs.mkdir(projectDir, { recursive: true });

  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ server });

  // Middleware
  app.use(cors({
    origin: [
      'https://bazari.libervia.xyz',
      'http://localhost:5173',
      'http://localhost:3000',
    ],
    credentials: true,
  }));
  app.use(express.json({ limit: '50mb' }));

  // Context para rotas
  const ctx = { projectDir };

  // Registrar rotas REST
  app.use('/api', statusRoutes(ctx));
  app.use('/api', projectRoutes(ctx));
  app.use('/api', fileRoutes(ctx));
  app.use('/api', buildRoutes(ctx));
  app.use('/api', publishRoutes(ctx));
  app.use('/api', contractRoutes(ctx));

  // WebSocket handlers
  wss.on('connection', (ws, req) => {
    const url = req.url || '';

    if (url.startsWith('/ws/terminal')) {
      handleTerminalConnection(ws, ctx);
    } else if (url.startsWith('/ws/watch')) {
      handleWatcherConnection(ws, ctx);
    } else {
      ws.close(4000, 'Unknown endpoint');
    }
  });

  // Iniciar servidor
  server.listen(port, () => {
    console.log(`
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   🚀 Bazari Studio Server                                   │
│                                                             │
│   Server:    http://localhost:${port}                        │
│   Projects:  ${projectDir}
│                                                             │
│   Abra o Studio em:                                         │
│   https://bazari.libervia.xyz/app/studio                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
    `);
  });

  return server;
}
```

### Status Route

```typescript
// server/routes/status.ts

import { Router } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import { version } from '../../../package.json';

const execAsync = promisify(exec);

export function statusRoutes(ctx: { projectDir: string }) {
  const router = Router();

  // Status basico do servidor
  router.get('/status', (req, res) => {
    res.json({
      status: 'ok',
      version,
      projectDir: ctx.projectDir,
      timestamp: new Date().toISOString(),
      platform: process.platform,
      nodeVersion: process.version,
    });
  });

  // Verificacao de ferramentas instaladas (para ambiente)
  router.get('/status/tools', async (req, res) => {
    const tools = {
      node: await checkTool('node --version'),
      npm: await checkTool('npm --version'),
      rust: await checkTool('rustc --version'),
      cargoContract: await checkTool('cargo contract --version'),
    };

    res.json(tools);
  });

  return router;
}

// Helper para verificar se ferramenta esta instalada
async function checkTool(command: string): Promise<{ installed: boolean; version?: string }> {
  try {
    const { stdout } = await execAsync(command);
    const version = stdout.trim().replace(/^[a-z-]+\s*/i, ''); // Remove prefixos como "rustc "
    return { installed: true, version };
  } catch {
    return { installed: false };
  }
}
```

### Comportamento da Verificacao de Ambiente

O endpoint `GET /api/status/tools` retorna:

```json
{
  "node": { "installed": true, "version": "20.10.0" },
  "npm": { "installed": true, "version": "10.2.3" },
  "rust": { "installed": true, "version": "1.75.0" },
  "cargoContract": { "installed": false }
}
```

**Regras de verificacao no Studio UI:**
- Se `node` ou `npm` nao instalado: **BLOQUEIA** uso do Studio
- Se `rust` ou `cargoContract` nao instalado: **PERMITE** criar APPS, bloqueia smart contracts

### Projects Route

```typescript
// server/routes/projects.ts

import { Router } from 'express';
import path from 'path';
import fs from 'fs/promises';
import { projectService } from '../services/project.service';

export function projectRoutes(ctx: { projectDir: string }) {
  const router = Router();

  // Lista todos os projetos
  router.get('/projects', async (req, res) => {
    try {
      const projects = await projectService.listProjects(ctx.projectDir);
      res.json({ projects });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Obtem um projeto
  router.get('/projects/:id', async (req, res) => {
    try {
      const project = await projectService.getProject(ctx.projectDir, req.params.id);
      res.json(project);
    } catch (error) {
      res.status(404).json({ error: 'Project not found' });
    }
  });

  // Cria um projeto
  router.post('/projects', async (req, res) => {
    try {
      const { name, description, template, category } = req.body;

      const project = await projectService.createProject(ctx.projectDir, {
        name,
        description,
        template: template || 'react-ts',
        category: category || 'tools',
      });

      res.json(project);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Remove um projeto
  router.delete('/projects/:id', async (req, res) => {
    try {
      await projectService.deleteProject(ctx.projectDir, req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
```

### Files Route

```typescript
// server/routes/files.ts

import { Router } from 'express';
import path from 'path';
import fs from 'fs/promises';
import { fileService } from '../services/file.service';

export function fileRoutes(ctx: { projectDir: string }) {
  const router = Router();

  // Valida que path esta dentro do projeto (seguranca)
  function validatePath(projectId: string, filePath: string): string {
    const projectPath = path.join(ctx.projectDir, projectId);
    const fullPath = path.join(projectPath, filePath);

    // Previne path traversal
    if (!fullPath.startsWith(projectPath)) {
      throw new Error('Invalid path');
    }

    return fullPath;
  }

  // Lista arquivos do projeto (tree)
  router.get('/projects/:projectId/files', async (req, res) => {
    try {
      const projectPath = path.join(ctx.projectDir, req.params.projectId);
      const tree = await fileService.buildFileTree(projectPath);
      res.json(tree);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Le conteudo de um arquivo
  router.get('/projects/:projectId/files/*', async (req, res) => {
    try {
      const filePath = req.params[0];
      const fullPath = validatePath(req.params.projectId, filePath);

      const stat = await fs.stat(fullPath);
      if (stat.isDirectory()) {
        return res.status(400).json({ error: 'Cannot read directory' });
      }

      const content = await fs.readFile(fullPath, 'utf-8');
      res.json({ content, size: stat.size, mtime: stat.mtime });
    } catch (error) {
      res.status(404).json({ error: 'File not found' });
    }
  });

  // Salva arquivo
  router.put('/projects/:projectId/files/*', async (req, res) => {
    try {
      const filePath = req.params[0];
      const fullPath = validatePath(req.params.projectId, filePath);
      const { content } = req.body;

      // Criar diretorios se necessario
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content);

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Cria arquivo ou diretorio
  router.post('/projects/:projectId/files', async (req, res) => {
    try {
      const { path: filePath, isDirectory, content } = req.body;
      const fullPath = validatePath(req.params.projectId, filePath);

      if (isDirectory) {
        await fs.mkdir(fullPath, { recursive: true });
      } else {
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.writeFile(fullPath, content || '');
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Renomeia arquivo/diretorio
  router.patch('/projects/:projectId/files/*', async (req, res) => {
    try {
      const oldPath = req.params[0];
      const { newPath } = req.body;

      const fullOldPath = validatePath(req.params.projectId, oldPath);
      const fullNewPath = validatePath(req.params.projectId, newPath);

      await fs.rename(fullOldPath, fullNewPath);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Remove arquivo/diretorio
  router.delete('/projects/:projectId/files/*', async (req, res) => {
    try {
      const filePath = req.params[0];
      const fullPath = validatePath(req.params.projectId, filePath);

      await fs.rm(fullPath, { recursive: true });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
```

### File Service

```typescript
// server/services/file.service.ts

import fs from 'fs/promises';
import path from 'path';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  size?: number;
}

class FileService {
  // Ignorar estes diretorios/arquivos
  private ignoreList = [
    'node_modules',
    '.git',
    'dist',
    'target',
    '.DS_Store',
    'Thumbs.db',
  ];

  async buildFileTree(rootPath: string, relativePath = ''): Promise<FileNode[]> {
    const fullPath = path.join(rootPath, relativePath);
    const entries = await fs.readdir(fullPath, { withFileTypes: true });

    const nodes: FileNode[] = [];

    for (const entry of entries) {
      // Ignorar arquivos/pastas da lista
      if (this.ignoreList.includes(entry.name)) continue;

      const entryPath = path.join(relativePath, entry.name);

      if (entry.isDirectory()) {
        const children = await this.buildFileTree(rootPath, entryPath);
        nodes.push({
          name: entry.name,
          path: entryPath,
          type: 'directory',
          children,
        });
      } else {
        const stat = await fs.stat(path.join(rootPath, entryPath));
        nodes.push({
          name: entry.name,
          path: entryPath,
          type: 'file',
          size: stat.size,
        });
      }
    }

    // Ordenar: diretorios primeiro, depois alfabetico
    return nodes.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  }
}

export const fileService = new FileService();
```

### Project Service

```typescript
// server/services/project.service.ts

import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface ProjectConfig {
  name: string;
  description: string;
  template: 'react-ts' | 'vanilla' | 'contract';
  category: string;
}

interface Project {
  id: string;
  name: string;
  description: string;
  template: string;
  category: string;
  createdAt: string;
  manifest?: Record<string, unknown>;
}

class ProjectService {
  // Lista todos os projetos no diretorio
  async listProjects(projectDir: string): Promise<Project[]> {
    const entries = await fs.readdir(projectDir, { withFileTypes: true });
    const projects: Project[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      try {
        const project = await this.getProject(projectDir, entry.name);
        projects.push(project);
      } catch {
        // Ignorar diretorios que nao sao projetos validos
      }
    }

    return projects.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  // Obtem informacoes de um projeto
  async getProject(projectDir: string, projectId: string): Promise<Project> {
    const projectPath = path.join(projectDir, projectId);
    const manifestPath = path.join(projectPath, 'bazari.manifest.json');

    const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8'));
    const stat = await fs.stat(projectPath);

    return {
      id: projectId,
      name: manifest.name,
      description: manifest.description,
      template: manifest.template || 'react-ts',
      category: manifest.category,
      createdAt: stat.birthtime.toISOString(),
      manifest,
    };
  }

  // Cria um novo projeto
  async createProject(projectDir: string, config: ProjectConfig): Promise<Project> {
    const slug = this.generateSlug(config.name);
    const projectPath = path.join(projectDir, slug);

    // Verificar se ja existe
    try {
      await fs.access(projectPath);
      throw new Error(`Project ${slug} already exists`);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }

    // Criar diretorio
    await fs.mkdir(projectPath, { recursive: true });

    // Copiar template
    await this.copyTemplate(projectPath, config);

    // Instalar dependencias
    await execAsync('npm install', { cwd: projectPath });

    return this.getProject(projectDir, slug);
  }

  // Remove um projeto
  async deleteProject(projectDir: string, projectId: string): Promise<void> {
    const projectPath = path.join(projectDir, projectId);
    await fs.rm(projectPath, { recursive: true });
  }

  // Gera slug a partir do nome
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  // Copia template para o projeto
  private async copyTemplate(projectPath: string, config: ProjectConfig): Promise<void> {
    const slug = path.basename(projectPath);
    const appId = `com.bazari.${slug}`;

    // Estrutura do template react-ts
    // (mesma estrutura que packages/bazari-cli/templates/react-ts/)

    // package.json
    const packageJson = {
      name: slug,
      version: '0.1.0',
      private: true,
      type: 'module',
      scripts: {
        dev: 'vite',
        build: 'tsc && vite build',
        preview: 'vite preview',
      },
      dependencies: {
        react: '^18.3.1',
        'react-dom': '^18.3.1',
        '@bazari.libervia.xyz/app-sdk': '^0.2.0',
      },
      devDependencies: {
        '@types/react': '^18.3.0',
        '@types/react-dom': '^18.3.0',
        '@vitejs/plugin-react': '^4.3.0',
        typescript: '^5.5.0',
        vite: '^5.4.0',
      },
    };

    // bazari.manifest.json
    const manifest = {
      appId,
      name: config.name,
      slug,
      version: '0.1.0',
      description: config.description,
      category: config.category,
      tags: [config.category, 'bazari-app'],
      icon: 'Package',
      color: 'from-blue-500 to-purple-600',
      entryPoint: '/index.html',
      permissions: [
        { id: 'user.profile.read', reason: 'Para exibir informacoes do seu perfil' },
        { id: 'wallet.balance.read', reason: 'Para exibir seu saldo' },
      ],
      sdkVersion: '0.2.0',
      monetizationType: 'FREE',
    };

    // Escrever arquivos
    await fs.writeFile(
      path.join(projectPath, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );

    await fs.writeFile(
      path.join(projectPath, 'bazari.manifest.json'),
      JSON.stringify(manifest, null, 2)
    );

    // Outros arquivos do template...
    // (index.html, vite.config.ts, tsconfig.json, src/main.tsx, src/App.tsx, etc)
  }
}

export const projectService = new ProjectService();
```

### Build Route

```typescript
// server/routes/build.ts

import { Router } from 'express';
import path from 'path';
import { buildService } from '../services/build.service';

export function buildRoutes(ctx: { projectDir: string }) {
  const router = Router();

  // Executa build do projeto
  router.post('/projects/:projectId/build', async (req, res) => {
    try {
      const projectPath = path.join(ctx.projectDir, req.params.projectId);
      const result = await buildService.build(projectPath);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Obtem status do ultimo build
  router.get('/projects/:projectId/build', async (req, res) => {
    try {
      const projectPath = path.join(ctx.projectDir, req.params.projectId);
      const buildInfo = await buildService.getBuildInfo(projectPath);
      res.json(buildInfo);
    } catch (error) {
      res.status(404).json({ error: 'No build found' });
    }
  });

  return router;
}
```

### Build Service

```typescript
// server/services/build.service.ts

import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import crypto from 'crypto';

const execAsync = promisify(exec);

interface BuildResult {
  success: boolean;
  buildInfo?: BuildInfo;
  output?: string;
  error?: string;
}

interface BuildInfo {
  hash: string;
  size: number;
  timestamp: string;
  builder: string;
}

class BuildService {
  // Executa build completo (mesma logica do CLI)
  async build(projectPath: string): Promise<BuildResult> {
    let output = '';

    try {
      // 1. npm install se necessario
      const nodeModulesExists = await this.pathExists(
        path.join(projectPath, 'node_modules')
      );

      if (!nodeModulesExists) {
        const { stdout } = await execAsync('npm install', { cwd: projectPath });
        output += stdout;
      }

      // 2. Type check
      try {
        const { stdout: tscOutput } = await execAsync('npx tsc --noEmit', {
          cwd: projectPath,
        });
        output += tscOutput;
      } catch (error) {
        // Erros de tipo sao warnings, nao falha o build
        output += error.stdout || '';
      }

      // 3. Vite build
      const { stdout: buildOutput } = await execAsync('npx vite build --outDir dist', {
        cwd: projectPath,
      });
      output += buildOutput;

      // 4. Copiar manifest para dist/
      const manifest = await fs.readFile(
        path.join(projectPath, 'bazari.manifest.json'),
        'utf-8'
      );
      await fs.writeFile(
        path.join(projectPath, 'dist', 'bazari.manifest.json'),
        manifest
      );

      // 5. Calcular hash e tamanho
      const distPath = path.join(projectPath, 'dist');
      const hash = await this.calculateDirectoryHash(distPath);
      const size = await this.calculateDirectorySize(distPath);

      // 6. Salvar build-info
      const buildInfo: BuildInfo = {
        hash,
        size,
        timestamp: new Date().toISOString(),
        builder: 'studio',
      };

      await fs.writeFile(
        path.join(distPath, '.build-info.json'),
        JSON.stringify(buildInfo, null, 2)
      );

      return { success: true, buildInfo, output };
    } catch (error) {
      return { success: false, error: error.message, output };
    }
  }

  // Obtem info do ultimo build
  async getBuildInfo(projectPath: string): Promise<BuildInfo | null> {
    try {
      const content = await fs.readFile(
        path.join(projectPath, 'dist', '.build-info.json'),
        'utf-8'
      );
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  // Calcula hash de um diretorio
  private async calculateDirectoryHash(dirPath: string): Promise<string> {
    const hash = crypto.createHash('sha256');
    await this.hashDirectory(dirPath, hash);
    return hash.digest('hex');
  }

  private async hashDirectory(
    dirPath: string,
    hash: crypto.Hash,
    basePath = dirPath
  ): Promise<void> {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const fullPath = path.join(dirPath, entry.name);
      const relativePath = path.relative(basePath, fullPath);

      if (entry.name === '.build-info.json') continue;

      if (entry.isDirectory()) {
        hash.update(`dir:${relativePath}`);
        await this.hashDirectory(fullPath, hash, basePath);
      } else {
        const content = await fs.readFile(fullPath);
        hash.update(`file:${relativePath}:${content.length}`);
        hash.update(content);
      }
    }
  }

  // Calcula tamanho total de um diretorio
  private async calculateDirectorySize(dirPath: string): Promise<number> {
    let size = 0;
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        size += await this.calculateDirectorySize(fullPath);
      } else {
        const stat = await fs.stat(fullPath);
        size += stat.size;
      }
    }

    return size;
  }

  private async pathExists(p: string): Promise<boolean> {
    try {
      await fs.access(p);
      return true;
    } catch {
      return false;
    }
  }
}

export const buildService = new BuildService();
```

### Terminal WebSocket

```typescript
// server/websocket/terminal.ts

import WebSocket from 'ws';
import * as pty from 'node-pty';
import path from 'path';

interface TerminalMessage {
  type: 'input' | 'resize' | 'cd';
  data?: string;
  cols?: number;
  rows?: number;
  projectId?: string;
}

export function handleTerminalConnection(
  ws: WebSocket,
  ctx: { projectDir: string }
) {
  const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash';

  const ptyProcess = pty.spawn(shell, [], {
    name: 'xterm-256color',
    cols: 80,
    rows: 30,
    cwd: ctx.projectDir,
    env: {
      ...process.env,
      TERM: 'xterm-256color',
    },
  });

  // Output do PTY → WebSocket
  ptyProcess.onData((data) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'output', data }));
    }
  });

  // Exit do PTY
  ptyProcess.onExit(({ exitCode }) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'exit', exitCode }));
      ws.close();
    }
  });

  // WebSocket → PTY
  ws.on('message', (msg) => {
    try {
      const message: TerminalMessage = JSON.parse(msg.toString());

      switch (message.type) {
        case 'input':
          ptyProcess.write(message.data || '');
          break;

        case 'resize':
          if (message.cols && message.rows) {
            ptyProcess.resize(message.cols, message.rows);
          }
          break;

        case 'cd':
          if (message.projectId) {
            const projectPath = path.join(ctx.projectDir, message.projectId);
            ptyProcess.write(`cd "${projectPath}"\r`);
          }
          break;
      }
    } catch (error) {
      console.error('Terminal message error:', error);
    }
  });

  // Cleanup
  ws.on('close', () => {
    ptyProcess.kill();
  });

  ws.on('error', () => {
    ptyProcess.kill();
  });
}
```

### File Watcher WebSocket

```typescript
// server/websocket/watcher.ts

import WebSocket from 'ws';
import chokidar from 'chokidar';
import path from 'path';

interface WatcherMessage {
  type: 'watch' | 'unwatch';
  projectId: string;
}

export function handleWatcherConnection(
  ws: WebSocket,
  ctx: { projectDir: string }
) {
  let watcher: chokidar.FSWatcher | null = null;

  ws.on('message', (msg) => {
    try {
      const message: WatcherMessage = JSON.parse(msg.toString());

      if (message.type === 'watch') {
        // Fechar watcher anterior
        if (watcher) {
          watcher.close();
        }

        const projectPath = path.join(ctx.projectDir, message.projectId);

        watcher = chokidar.watch(projectPath, {
          ignored: [
            '**/node_modules/**',
            '**/.git/**',
            '**/dist/**',
            '**/target/**',
          ],
          persistent: true,
          ignoreInitial: true,
        });

        watcher.on('all', (event, filePath) => {
          if (ws.readyState === WebSocket.OPEN) {
            const relativePath = path.relative(projectPath, filePath);
            ws.send(JSON.stringify({
              type: 'change',
              event,
              path: relativePath,
            }));
          }
        });
      } else if (message.type === 'unwatch') {
        if (watcher) {
          watcher.close();
          watcher = null;
        }
      }
    } catch (error) {
      console.error('Watcher message error:', error);
    }
  });

  // Cleanup
  ws.on('close', () => {
    if (watcher) {
      watcher.close();
    }
  });
}
```

### Contract Build Route

```typescript
// server/routes/contracts.ts

import { Router } from 'express';
import path from 'path';
import { contractService } from '../services/contract.service';

export function contractRoutes(ctx: { projectDir: string }) {
  const router = Router();

  // Compila smart contract ink!
  router.post('/projects/:projectId/contract/build', async (req, res) => {
    try {
      const projectPath = path.join(ctx.projectDir, req.params.projectId);
      const result = await contractService.build(projectPath);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
}
```

### Contract Service

```typescript
// server/services/contract.service.ts

import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface ContractBuildResult {
  success: boolean;
  wasmPath?: string;
  metadataPath?: string;
  output?: string;
  error?: string;
}

class ContractService {
  // Compila contrato ink! usando cargo-contract
  async build(projectPath: string): Promise<ContractBuildResult> {
    try {
      // Verificar se cargo-contract esta instalado
      try {
        await execAsync('cargo contract --version');
      } catch {
        return {
          success: false,
          error: 'cargo-contract not installed. Run: cargo install cargo-contract',
        };
      }

      // Executar build
      const { stdout, stderr } = await execAsync('cargo contract build --release', {
        cwd: projectPath,
        env: {
          ...process.env,
          CARGO_TARGET_DIR: path.join(projectPath, 'target'),
        },
      });

      // Encontrar arquivos gerados
      const targetPath = path.join(projectPath, 'target', 'ink');
      const files = await fs.readdir(targetPath);

      const wasmFile = files.find((f) => f.endsWith('.wasm'));
      const jsonFile = files.find((f) => f.endsWith('.json'));

      return {
        success: true,
        wasmPath: wasmFile ? path.join(targetPath, wasmFile) : undefined,
        metadataPath: jsonFile ? path.join(targetPath, jsonFile) : undefined,
        output: stdout + stderr,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        output: error.stdout || error.stderr,
      };
    }
  }
}

export const contractService = new ContractService();
```

## Uso

### Iniciar o Servidor

```bash
# Forma simples
bazari studio --serve

# Com opcoes
bazari studio --serve --port 4444 --dir ~/meus-projetos
```

### Testar Endpoints

```bash
# Status
curl http://localhost:4444/api/status

# Listar projetos
curl http://localhost:4444/api/projects

# Criar projeto
curl -X POST http://localhost:4444/api/projects \
  -H "Content-Type: application/json" \
  -d '{"name": "Meu App", "description": "...", "template": "react-ts"}'

# Listar arquivos
curl http://localhost:4444/api/projects/meu-app/files

# Ler arquivo
curl http://localhost:4444/api/projects/meu-app/files/src/App.tsx

# Salvar arquivo
curl -X PUT http://localhost:4444/api/projects/meu-app/files/src/App.tsx \
  -H "Content-Type: application/json" \
  -d '{"content": "// novo conteudo"}'

# Build
curl -X POST http://localhost:4444/api/projects/meu-app/build
```

## Criterios de Aceite

### Verificacao de Ambiente
1. [ ] GET /api/status retorna info do servidor
2. [ ] GET /api/status/tools retorna status de node, npm, rust, cargo-contract
3. [ ] Cada ferramenta retorna { installed: boolean, version?: string }
4. [ ] Ferramentas nao instaladas retornam { installed: false } sem erro

### Servidor
5. [ ] Comando `bazari studio --serve` inicia servidor na porta 4444
6. [ ] CORS configurado para bazari.libervia.xyz e localhost:5173

### Projetos e Arquivos
7. [ ] CRUD de projetos funciona (/api/projects)
8. [ ] CRUD de arquivos funciona (/api/projects/:id/files)
9. [ ] Path traversal prevenido (seguranca)

### Build e Contract
10. [ ] Build executa e gera dist/ com .build-info.json
11. [ ] Contract build executa cargo contract build

### WebSocket
12. [ ] WebSocket terminal funciona (/ws/terminal)
13. [ ] File watcher notifica mudancas (/ws/watch)

## Proximos Passos

Seguir para [04-EDITOR.md](./04-EDITOR.md) para implementacao do Monaco Editor no Studio UI.
