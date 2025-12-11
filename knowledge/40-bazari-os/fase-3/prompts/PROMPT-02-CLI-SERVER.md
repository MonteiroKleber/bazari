# PROMPT 02 - CLI Server Local

## Contexto

O Bazari Studio precisa se comunicar com o sistema local do desenvolvedor. Vamos implementar o CLI Server que roda em localhost:4444 e expoe APIs HTTP/WebSocket.

## Pre-requisito

PROMPT-01 deve estar implementado (estrutura base do Studio).

## Especificacao

Leia a especificacao completa em:
- `knowledge/40-bazari-os/fase-3/03-CLI-SERVER.md`

## Tarefa

### 1. Criar Estrutura do CLI Server

```
packages/bazari-cli/src/server/
├── index.ts                  // Entry point
├── routes/
│   ├── status.routes.ts      // GET /status
│   ├── project.routes.ts     // /projects/*
│   ├── file.routes.ts        // /files/*
│   ├── build.routes.ts       // /build/*
│   └── publish.routes.ts     // /publish/*
├── ws/
│   ├── terminal.ws.ts        // WebSocket terminal (pty)
│   └── watcher.ws.ts         // WebSocket file watcher
└── services/
    ├── file.service.ts       // Operacoes de arquivo
    ├── project.service.ts    // Operacoes de projeto
    └── build.service.ts      // Build e compilacao
```

### 2. index.ts - Server Principal

```typescript
import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';

import statusRoutes from './routes/status.routes';
import projectRoutes from './routes/project.routes';
import fileRoutes from './routes/file.routes';
import buildRoutes from './routes/build.routes';
import publishRoutes from './routes/publish.routes';

import { setupTerminalWS } from './ws/terminal.ws';
import { setupWatcherWS } from './ws/watcher.ws';

const PORT = 4444;

export async function startServer() {
  const app = express();
  const server = createServer(app);

  // Middleware
  app.use(cors({
    origin: ['http://localhost:5173', 'https://bazari.libervia.xyz'],
    credentials: true,
  }));
  app.use(express.json());

  // Routes
  app.use('/status', statusRoutes);
  app.use('/projects', projectRoutes);
  app.use('/files', fileRoutes);
  app.use('/build', buildRoutes);
  app.use('/publish', publishRoutes);

  // WebSocket
  const wss = new WebSocketServer({ server });
  setupTerminalWS(wss);
  setupWatcherWS(wss);

  server.listen(PORT, () => {
    console.log(`CLI Server running on http://localhost:${PORT}`);
  });

  return server;
}
```

### 3. status.routes.ts

```typescript
import { Router } from 'express';
import * as os from 'os';

const router = Router();

router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    version: '0.1.0',
    platform: os.platform(),
    nodeVersion: process.version,
    cwd: process.cwd(),
  });
});

router.get('/tools', async (req, res) => {
  // Verificar ferramentas instaladas
  const tools = {
    node: await checkTool('node --version'),
    npm: await checkTool('npm --version'),
    rust: await checkTool('rustc --version'),
    cargoContract: await checkTool('cargo contract --version'),
  };
  res.json(tools);
});

export default router;
```

### 4. file.routes.ts

```typescript
import { Router } from 'express';
import * as fs from 'fs/promises';
import * as path from 'path';

const router = Router();

// Ler arquivo
router.get('/', async (req, res) => {
  const { path: filePath } = req.query;
  try {
    const content = await fs.readFile(filePath as string, 'utf-8');
    res.json({ content });
  } catch (error) {
    res.status(404).json({ error: 'File not found' });
  }
});

// Escrever arquivo
router.put('/', async (req, res) => {
  const { path: filePath, content } = req.body;
  try {
    await fs.writeFile(filePath, content, 'utf-8');
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Listar diretorio
router.get('/list', async (req, res) => {
  const { path: dirPath } = req.query;
  try {
    const entries = await fs.readdir(dirPath as string, { withFileTypes: true });
    const files = entries.map(entry => ({
      name: entry.name,
      isDirectory: entry.isDirectory(),
      path: path.join(dirPath as string, entry.name),
    }));
    res.json({ files });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Criar diretorio
router.post('/mkdir', async (req, res) => {
  const { path: dirPath } = req.body;
  try {
    await fs.mkdir(dirPath, { recursive: true });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Deletar arquivo/diretorio
router.delete('/', async (req, res) => {
  const { path: filePath, recursive } = req.body;
  try {
    await fs.rm(filePath, { recursive: recursive ?? false });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

### 5. build.routes.ts

```typescript
import { Router } from 'express';
import { spawn } from 'child_process';
import * as path from 'path';

const router = Router();

// npm install
router.post('/install', async (req, res) => {
  const { projectPath } = req.body;
  try {
    await runCommand('npm', ['install'], projectPath);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// npm run build
router.post('/build', async (req, res) => {
  const { projectPath } = req.body;
  try {
    const output = await runCommand('npm', ['run', 'build'], projectPath);
    res.json({ success: true, output });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// npm run dev (inicia dev server)
router.post('/dev', async (req, res) => {
  const { projectPath, port = 3333 } = req.body;
  try {
    // Inicia em background, retorna imediatamente
    const process = spawn('npm', ['run', 'dev', '--', '--port', String(port)], {
      cwd: projectPath,
      detached: true,
    });

    res.json({
      success: true,
      pid: process.pid,
      url: `http://localhost:${port}`,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Parar dev server
router.post('/dev/stop', async (req, res) => {
  const { pid } = req.body;
  try {
    process.kill(pid);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

async function runCommand(cmd: string, args: string[], cwd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const output: string[] = [];
    const proc = spawn(cmd, args, { cwd });

    proc.stdout.on('data', (data) => output.push(data.toString()));
    proc.stderr.on('data', (data) => output.push(data.toString()));

    proc.on('close', (code) => {
      if (code === 0) resolve(output.join(''));
      else reject(new Error(`Command failed with code ${code}: ${output.join('')}`));
    });
  });
}

export default router;
```

### 6. terminal.ws.ts - Terminal WebSocket

```typescript
import { WebSocketServer, WebSocket } from 'ws';
import * as pty from 'node-pty';

export function setupTerminalWS(wss: WebSocketServer) {
  wss.on('connection', (ws: WebSocket, req) => {
    if (!req.url?.startsWith('/terminal')) return;

    // Parse cwd from URL
    const url = new URL(req.url, 'http://localhost');
    const cwd = url.searchParams.get('cwd') || process.cwd();

    // Criar terminal
    const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash';
    const ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-256color',
      cols: 80,
      rows: 30,
      cwd,
    });

    // PTY -> WebSocket
    ptyProcess.onData((data) => {
      ws.send(JSON.stringify({ type: 'output', data }));
    });

    // WebSocket -> PTY
    ws.on('message', (message) => {
      const msg = JSON.parse(message.toString());
      if (msg.type === 'input') {
        ptyProcess.write(msg.data);
      } else if (msg.type === 'resize') {
        ptyProcess.resize(msg.cols, msg.rows);
      }
    });

    // Cleanup
    ws.on('close', () => {
      ptyProcess.kill();
    });
  });
}
```

### 7. watcher.ws.ts - File Watcher WebSocket

```typescript
import { WebSocketServer, WebSocket } from 'ws';
import * as chokidar from 'chokidar';

export function setupWatcherWS(wss: WebSocketServer) {
  wss.on('connection', (ws: WebSocket, req) => {
    if (!req.url?.startsWith('/watcher')) return;

    const url = new URL(req.url, 'http://localhost');
    const watchPath = url.searchParams.get('path');

    if (!watchPath) {
      ws.close(1008, 'Missing path parameter');
      return;
    }

    const watcher = chokidar.watch(watchPath, {
      ignored: /(^|[\/\\])\..|(node_modules|dist|\.git)/,
      persistent: true,
    });

    watcher
      .on('change', (path) => {
        ws.send(JSON.stringify({ type: 'change', path }));
      })
      .on('add', (path) => {
        ws.send(JSON.stringify({ type: 'add', path }));
      })
      .on('unlink', (path) => {
        ws.send(JSON.stringify({ type: 'unlink', path }));
      });

    ws.on('close', () => {
      watcher.close();
    });
  });
}
```

### 8. Instalar Dependencias

```bash
cd packages/bazari-cli
pnpm add express cors ws node-pty chokidar
pnpm add -D @types/express @types/cors @types/ws
```

### 9. Adicionar Comando no CLI

```typescript
// packages/bazari-cli/src/commands/studio.ts

import { Command } from 'commander';
import { startServer } from '../server';

export function studioCommand(program: Command) {
  program
    .command('studio')
    .description('Start Bazari Studio development environment')
    .option('-p, --port <port>', 'Server port', '4444')
    .option('--serve', 'Start CLI server only (headless)')
    .action(async (options) => {
      if (options.serve) {
        await startServer();
        console.log('CLI Server running. Connect from Studio UI.');
      } else {
        // Futuramente: abrir browser automaticamente
        await startServer();
        console.log('Open https://bazari.libervia.xyz/studio in your browser');
      }
    });
}
```

### 10. Criar Cliente no Frontend

```typescript
// apps/web/src/apps/studio/services/localServer.client.ts

const LOCAL_SERVER = 'http://localhost:4444';

export class LocalServerClient {
  async getStatus() {
    const res = await fetch(`${LOCAL_SERVER}/status`);
    return res.json();
  }

  async readFile(path: string) {
    const res = await fetch(`${LOCAL_SERVER}/files?path=${encodeURIComponent(path)}`);
    return res.json();
  }

  async writeFile(path: string, content: string) {
    const res = await fetch(`${LOCAL_SERVER}/files`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, content }),
    });
    return res.json();
  }

  async listDirectory(path: string) {
    const res = await fetch(`${LOCAL_SERVER}/files/list?path=${encodeURIComponent(path)}`);
    return res.json();
  }

  async runBuild(projectPath: string) {
    const res = await fetch(`${LOCAL_SERVER}/build/build`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectPath }),
    });
    return res.json();
  }

  async startDevServer(projectPath: string, port = 3333) {
    const res = await fetch(`${LOCAL_SERVER}/build/dev`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectPath, port }),
    });
    return res.json();
  }

  connectTerminal(cwd: string): WebSocket {
    return new WebSocket(`ws://localhost:4444/terminal?cwd=${encodeURIComponent(cwd)}`);
  }

  watchFiles(path: string): WebSocket {
    return new WebSocket(`ws://localhost:4444/watcher?path=${encodeURIComponent(path)}`);
  }
}

export const localServer = new LocalServerClient();
```

## Criterios de Aceite

1. [ ] CLI Server inicia com `bazari studio --serve`
2. [ ] GET /status retorna info do sistema
3. [ ] APIs de arquivo funcionam (read, write, list, mkdir, delete)
4. [ ] Terminal WebSocket funciona (input/output)
5. [ ] File watcher WebSocket funciona
6. [ ] Build routes executam npm install/build
7. [ ] Dev server inicia e retorna URL
8. [ ] Cliente frontend conecta ao server local
9. [ ] Build do CLI nao quebra

## Nao Fazer Nesta Fase

- Monaco Editor (fase 3)
- Preview iframe (fase 4)
- Publish para IPFS (fase 5)
- Smart contracts (fase 8)

## Notas Importantes

1. CLI Server roda SOMENTE na maquina do desenvolvedor
2. CORS configurado para aceitar localhost e bazari.libervia.xyz
3. node-pty pode precisar de rebuild nativo (postinstall)
4. WebSocket paths: /terminal, /watcher

## Troubleshooting

Se CLI Server nao iniciar:
1. Verificar se porta 4444 esta livre: `lsof -i :4444`
2. Verificar se node-pty compilou: `npm rebuild node-pty`
3. Testar endpoint: `curl http://localhost:4444/status`
