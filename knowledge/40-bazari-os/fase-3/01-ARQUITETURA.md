# 01 - Arquitetura Tecnica do Bazari Studio

## Visao Geral da Arquitetura

O Bazari Studio utiliza uma arquitetura **local-first** composta por dois componentes principais:

1. **Studio UI**: Interface web rodando no browser como app nativo do BazariOS
2. **CLI Server**: Servidor local rodando na maquina do desenvolvedor

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BROWSER                                         │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         BAZARIOS (Host)                               │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │                  BAZARI STUDIO (App Nativo)                     │  │  │
│  │  │                                                                 │  │  │
│  │  │  ┌───────────────────────────────────────────────────────────┐  │  │  │
│  │  │  │                    UI LAYER (React)                       │  │  │  │
│  │  │  │  - StudioLayout (sidebar, editor, preview, terminal)      │  │  │  │
│  │  │  │  - ProjectExplorer (arvore de arquivos)                   │  │  │  │
│  │  │  │  - CodeEditor (Monaco)                                    │  │  │  │
│  │  │  │  - PreviewPanel (iframe)                                  │  │  │  │
│  │  │  │  - TerminalPanel (xterm.js)                               │  │  │  │
│  │  │  │  - AIAssistant (Especialista Bazari)                      │  │  │  │
│  │  │  └───────────────────────────────────────────────────────────┘  │  │  │
│  │  │                              │                                  │  │  │
│  │  │                              ▼                                  │  │  │
│  │  │  ┌───────────────────────────────────────────────────────────┐  │  │  │
│  │  │  │                 API CLIENT LAYER                          │  │  │  │
│  │  │  │  - LocalServerClient (HTTP/WebSocket para localhost)      │  │  │  │
│  │  │  │  - FileSystemClient (operacoes de arquivo)                │  │  │  │
│  │  │  │  - TerminalClient (execucao de comandos)                  │  │  │  │
│  │  │  │  - AIClient (Claude API com contexto Bazari)              │  │  │  │
│  │  │  └───────────────────────────────────────────────────────────┘  │  │  │
│  │  │                                                                 │  │  │
│  │  └─────────────────────────────────────────────────────────────────┘  │  │
│  │                                                                       │  │
│  │  APIs do Host Disponiveis (para o Studio):                            │  │
│  │  - auth.getCurrentUser() → usuario logado                             │  │
│  │  - wallet.getBalance() → saldo BZR/ZARI                              │  │
│  │  - storage.get/set() → configuracoes do Studio                       │  │
│  │  - ui.showToast() → notificacoes                                     │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                              │                                               │
└──────────────────────────────│───────────────────────────────────────────────┘
                               │
                               │ HTTP: localhost:4444
                               │ WS: localhost:4444/ws
                               │
┌──────────────────────────────│───────────────────────────────────────────────┐
│                              ▼                                               │
│                    MAQUINA LOCAL DO DESENVOLVEDOR                           │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │              CLI SERVER (bazari studio --serve)                       │  │
│  │                                                                       │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │                    EXPRESS SERVER (:4444)                       │  │  │
│  │  │                                                                 │  │  │
│  │  │  REST Endpoints:                                                │  │  │
│  │  │  ├── GET    /api/status           → Status do servidor          │  │  │
│  │  │  ├── GET    /api/projects         → Lista projetos              │  │  │
│  │  │  ├── POST   /api/projects         → Cria projeto (bazari create)│  │  │
│  │  │  ├── GET    /api/files            → Lista arquivos              │  │  │
│  │  │  ├── GET    /api/files/:path      → Le arquivo                  │  │  │
│  │  │  ├── PUT    /api/files/:path      → Salva arquivo               │  │  │
│  │  │  ├── DELETE /api/files/:path      → Remove arquivo              │  │  │
│  │  │  ├── POST   /api/build            → Executa bazari build        │  │  │
│  │  │  ├── POST   /api/publish          → Executa bazari publish      │  │  │
│  │  │  └── POST   /api/contract/build   → Compila contrato ink!       │  │  │
│  │  │                                                                 │  │  │
│  │  │  WebSocket Endpoints:                                           │  │  │
│  │  │  ├── /ws/terminal    → PTY com streaming bidirecional           │  │  │
│  │  │  └── /ws/watch       → File watcher (notifica mudancas)         │  │  │
│  │  │                                                                 │  │  │
│  │  └─────────────────────────────────────────────────────────────────┘  │  │
│  │                              │                                        │  │
│  │                              ▼                                        │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │                    SERVICES                                     │  │  │
│  │  │                                                                 │  │  │
│  │  │  - FileService     → CRUD arquivos no disco                     │  │  │
│  │  │  - ProjectService  → Gerencia projetos (create, list, delete)   │  │  │
│  │  │  - BuildService    → Executa npm install, vite build            │  │  │
│  │  │  - PublishService  → Upload IPFS, submit review                 │  │  │
│  │  │  - ContractService → Compila ink! com cargo                     │  │  │
│  │  │  - TerminalService → Spawn PTY, streaming output                │  │  │
│  │  │  - DevServerService → Gerencia Vite dev server                  │  │  │
│  │  │                                                                 │  │  │
│  │  └─────────────────────────────────────────────────────────────────┘  │  │
│  │                              │                                        │  │
│  │                              ▼                                        │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │                    SYSTEM LAYER                                 │  │  │
│  │  │                                                                 │  │  │
│  │  │  - Node.js (npm install, npm run build)                         │  │  │
│  │  │  - Vite (dev server :3333, HMR)                                 │  │  │
│  │  │  - Rust/Cargo (cargo contract build)                            │  │  │
│  │  │  - Sistema de arquivos local                                    │  │  │
│  │  │                                                                 │  │  │
│  │  └─────────────────────────────────────────────────────────────────┘  │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  Projetos salvos em: ~/bazari-projects/                                    │
│  ├── my-app/                                                               │
│  │   ├── src/                                                              │
│  │   ├── package.json                                                      │
│  │   └── bazari.manifest.json                                              │
│  └── my-contract/                                                          │
│      ├── lib.rs                                                            │
│      └── Cargo.toml                                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Componentes do Studio UI (Browser)

### Estrutura de Arquivos

```
apps/web/src/apps/studio/
├── manifest.ts                    // Registro como app nativo
├── StudioApp.tsx                  // Componente principal
├── components/
│   ├── layout/
│   │   ├── StudioLayout.tsx       // Layout principal (split panes)
│   │   ├── Sidebar.tsx            // Navegacao lateral
│   │   ├── Toolbar.tsx            // Barra de ferramentas
│   │   └── StatusBar.tsx          // Status de conexao, projeto
│   ├── explorer/
│   │   ├── ProjectExplorer.tsx    // Arvore de arquivos (via API)
│   │   ├── FileTreeItem.tsx       // Item da arvore
│   │   └── NewFileDialog.tsx      // Criar arquivo/pasta
│   ├── editor/
│   │   ├── CodeEditor.tsx         // Monaco Editor wrapper
│   │   ├── EditorTabs.tsx         // Abas de arquivos
│   │   └── EditorStatusBar.tsx    // Linha, coluna, linguagem
│   ├── preview/
│   │   ├── PreviewPanel.tsx       // iframe apontando para localhost:3333
│   │   ├── PreviewToolbar.tsx     // Reload, open external
│   │   └── DeviceFrame.tsx        // Simulacao mobile/desktop
│   ├── terminal/
│   │   ├── TerminalPanel.tsx      // xterm.js conectado via WebSocket
│   │   └── TerminalTabs.tsx       // Multiplos terminais
│   └── ai/
│       ├── AIAssistant.tsx        // Painel de chat (Especialista Bazari)
│       ├── AIPromptInput.tsx      // Input de prompt
│       └── AICodeSuggestion.tsx   // Sugestoes de codigo
├── services/
│   ├── local-server.client.ts     // HTTP/WS client para CLI Server
│   ├── file.client.ts             // Operacoes de arquivo via API
│   ├── terminal.client.ts         // Terminal via WebSocket
│   ├── build.client.ts            // Build via API
│   ├── publish.client.ts          // Publish via API
│   └── ai.service.ts              // Claude API com contexto Bazari
├── stores/
│   ├── studio.store.ts            // Estado global do studio
│   ├── connection.store.ts        // Estado da conexao com servidor local
│   ├── project.store.ts           // Projeto atual
│   ├── editor.store.ts            // Estado do editor
│   └── terminal.store.ts          // Estado dos terminais
├── hooks/
│   ├── useLocalServer.ts          // Hook para conexao
│   ├── useProject.ts              // Hook para projeto atual
│   ├── useFileSystem.ts           // Hook para arquivos
│   └── useAI.ts                   // Hook para IA
└── types/
    ├── project.types.ts           // Tipos de projeto
    ├── file.types.ts              // Tipos de arquivo
    ├── api.types.ts               // Tipos das APIs
    └── terminal.types.ts          // Tipos de terminal
```

### API Client Layer

```typescript
// services/local-server.client.ts

const LOCAL_SERVER_URL = 'http://localhost:4444';
const LOCAL_WS_URL = 'ws://localhost:4444';

class LocalServerClient {
  private baseUrl = LOCAL_SERVER_URL;
  private wsUrl = LOCAL_WS_URL;

  // Verifica se servidor local esta rodando
  async checkConnection(): Promise<ConnectionStatus> {
    try {
      const response = await fetch(`${this.baseUrl}/api/status`);
      const data = await response.json();
      return {
        connected: true,
        projectDir: data.projectDir,
        version: data.version,
      };
    } catch {
      return { connected: false };
    }
  }

  // HTTP requests
  async get<T>(path: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`);
    return response.json();
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    return response.json();
  }

  async put<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return response.json();
  }

  async delete(path: string): Promise<void> {
    await fetch(`${this.baseUrl}${path}`, { method: 'DELETE' });
  }

  // WebSocket para terminal
  connectTerminal(): WebSocket {
    return new WebSocket(`${this.wsUrl}/ws/terminal`);
  }

  // WebSocket para file watcher
  connectWatcher(): WebSocket {
    return new WebSocket(`${this.wsUrl}/ws/watch`);
  }
}

export const localServer = new LocalServerClient();
```

### File Client

```typescript
// services/file.client.ts

class FileClient {
  // Lista arquivos do projeto
  async listFiles(projectId: string): Promise<FileNode[]> {
    return localServer.get(`/api/projects/${projectId}/files`);
  }

  // Le conteudo de um arquivo
  async readFile(projectId: string, path: string): Promise<string> {
    const data = await localServer.get<{ content: string }>(
      `/api/projects/${projectId}/files/${encodeURIComponent(path)}`
    );
    return data.content;
  }

  // Salva arquivo
  async writeFile(projectId: string, path: string, content: string): Promise<void> {
    await localServer.put(`/api/projects/${projectId}/files/${encodeURIComponent(path)}`, {
      content,
    });
  }

  // Cria arquivo ou diretorio
  async createFile(projectId: string, path: string, isDirectory: boolean): Promise<void> {
    await localServer.post(`/api/projects/${projectId}/files`, {
      path,
      isDirectory,
    });
  }

  // Remove arquivo ou diretorio
  async deleteFile(projectId: string, path: string): Promise<void> {
    await localServer.delete(`/api/projects/${projectId}/files/${encodeURIComponent(path)}`);
  }
}

export const fileClient = new FileClient();
```

## Componentes do CLI Server (Local)

### Estrutura do CLI Server

```
packages/bazari-cli/src/
├── commands/
│   ├── studio.ts              // Comando: bazari studio --serve
│   ├── create.ts              // Existente: bazari create
│   ├── build.ts               // Existente: bazari build
│   ├── publish.ts             // Existente: bazari publish
│   └── dev.ts                 // Existente: bazari dev
├── server/
│   ├── index.ts               // Entry point do servidor
│   ├── routes/
│   │   ├── status.ts          // GET /api/status
│   │   ├── projects.ts        // CRUD projetos
│   │   ├── files.ts           // CRUD arquivos
│   │   ├── build.ts           // POST /api/build
│   │   ├── publish.ts         // POST /api/publish
│   │   └── contracts.ts       // POST /api/contract/build
│   ├── websocket/
│   │   ├── terminal.ts        // WS /ws/terminal
│   │   └── watcher.ts         // WS /ws/watch
│   └── services/
│       ├── file.service.ts    // Operacoes de arquivo
│       ├── project.service.ts // Gerencia projetos
│       ├── build.service.ts   // Executa build
│       ├── publish.service.ts // Executa publish
│       ├── contract.service.ts// Compila contratos
│       ├── terminal.service.ts// PTY/shell
│       └── dev-server.service.ts // Gerencia Vite
└── utils/
    └── ...
```

### Studio Command

```typescript
// commands/studio.ts

import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';

export async function studioCommand(options: { port?: number; dir?: string }) {
  const port = options.port || 4444;
  const projectDir = options.dir || path.join(os.homedir(), 'bazari-projects');

  // Garantir que diretorio existe
  await fs.mkdir(projectDir, { recursive: true });

  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ server });

  // CORS para permitir requests do browser
  app.use(cors({
    origin: ['https://bazari.libervia.xyz', 'http://localhost:5173'],
    credentials: true,
  }));
  app.use(express.json());

  // Registrar rotas
  app.use('/api', statusRoutes);
  app.use('/api', projectRoutes(projectDir));
  app.use('/api', fileRoutes(projectDir));
  app.use('/api', buildRoutes(projectDir));
  app.use('/api', publishRoutes(projectDir));
  app.use('/api', contractRoutes(projectDir));

  // WebSocket handlers
  wss.on('connection', (ws, req) => {
    if (req.url === '/ws/terminal') {
      handleTerminalConnection(ws, projectDir);
    } else if (req.url === '/ws/watch') {
      handleWatcherConnection(ws, projectDir);
    }
  });

  server.listen(port, () => {
    console.log(`
🚀 Bazari Studio Server running on http://localhost:${port}
📂 Project directory: ${projectDir}

Abra o Studio em: https://bazari.libervia.xyz/app/studio
Ou conecte via: bazari studio connect
    `);
  });
}
```

### File Routes

```typescript
// server/routes/files.ts

export function fileRoutes(projectDir: string) {
  const router = Router();

  // Lista arquivos de um projeto
  router.get('/projects/:projectId/files', async (req, res) => {
    const { projectId } = req.params;
    const projectPath = path.join(projectDir, projectId);

    const files = await buildFileTree(projectPath);
    res.json(files);
  });

  // Le arquivo
  router.get('/projects/:projectId/files/:path(*)', async (req, res) => {
    const { projectId } = req.params;
    const filePath = decodeURIComponent(req.params.path);
    const fullPath = path.join(projectDir, projectId, filePath);

    // Seguranca: verificar que esta dentro do projeto
    if (!fullPath.startsWith(path.join(projectDir, projectId))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const content = await fs.readFile(fullPath, 'utf-8');
    res.json({ content });
  });

  // Salva arquivo
  router.put('/projects/:projectId/files/:path(*)', async (req, res) => {
    const { projectId } = req.params;
    const filePath = decodeURIComponent(req.params.path);
    const { content } = req.body;
    const fullPath = path.join(projectDir, projectId, filePath);

    // Seguranca: verificar que esta dentro do projeto
    if (!fullPath.startsWith(path.join(projectDir, projectId))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content);
    res.json({ success: true });
  });

  // Cria arquivo/diretorio
  router.post('/projects/:projectId/files', async (req, res) => {
    const { projectId } = req.params;
    const { path: filePath, isDirectory } = req.body;
    const fullPath = path.join(projectDir, projectId, filePath);

    if (isDirectory) {
      await fs.mkdir(fullPath, { recursive: true });
    } else {
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, '');
    }
    res.json({ success: true });
  });

  // Remove arquivo/diretorio
  router.delete('/projects/:projectId/files/:path(*)', async (req, res) => {
    const { projectId } = req.params;
    const filePath = decodeURIComponent(req.params.path);
    const fullPath = path.join(projectDir, projectId, filePath);

    await fs.rm(fullPath, { recursive: true });
    res.json({ success: true });
  });

  return router;
}
```

### Build Routes

```typescript
// server/routes/build.ts

export function buildRoutes(projectDir: string) {
  const router = Router();

  router.post('/projects/:projectId/build', async (req, res) => {
    const { projectId } = req.params;
    const projectPath = path.join(projectDir, projectId);

    // Reutiliza a logica existente do CLI
    try {
      // 1. npm install se necessario
      if (!await fs.exists(path.join(projectPath, 'node_modules'))) {
        await execAsync('npm install', { cwd: projectPath });
      }

      // 2. Type check
      await execAsync('npx tsc --noEmit', { cwd: projectPath });

      // 3. Vite build
      await execAsync('npx vite build --outDir dist', { cwd: projectPath });

      // 4. Copiar manifest
      const manifest = await fs.readFile(
        path.join(projectPath, 'bazari.manifest.json'),
        'utf-8'
      );
      await fs.writeFile(
        path.join(projectPath, 'dist', 'bazari.manifest.json'),
        manifest
      );

      // 5. Calcular hash
      const hash = await calculateDirectoryHash(path.join(projectPath, 'dist'));

      // 6. Salvar build-info
      const buildInfo = {
        hash,
        timestamp: new Date().toISOString(),
        builder: 'studio',
      };
      await fs.writeFile(
        path.join(projectPath, 'dist', '.build-info.json'),
        JSON.stringify(buildInfo, null, 2)
      );

      res.json({ success: true, buildInfo });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
}
```

### Terminal WebSocket

```typescript
// server/websocket/terminal.ts

import * as pty from 'node-pty';

export function handleTerminalConnection(ws: WebSocket, projectDir: string) {
  // Criar PTY
  const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash';
  const ptyProcess = pty.spawn(shell, [], {
    name: 'xterm-color',
    cols: 80,
    rows: 30,
    cwd: projectDir,
    env: process.env,
  });

  // Output do terminal → WebSocket
  ptyProcess.onData((data) => {
    ws.send(JSON.stringify({ type: 'output', data }));
  });

  // Input do WebSocket → terminal
  ws.on('message', (msg) => {
    const message = JSON.parse(msg.toString());

    if (message.type === 'input') {
      ptyProcess.write(message.data);
    } else if (message.type === 'resize') {
      ptyProcess.resize(message.cols, message.rows);
    }
  });

  // Cleanup
  ws.on('close', () => {
    ptyProcess.kill();
  });
}
```

## Fluxo de Dados

### Criar Novo Projeto

```
Usuario clica "Novo Projeto" no Studio
           │
           ▼
┌─────────────────────────┐
│    NewProjectDialog     │
│  - Nome                 │
│  - Descricao           │
│  - Template            │
└─────────────────────────┘
           │
           ▼
POST localhost:4444/api/projects
{
  name: "Meu App",
  description: "...",
  template: "react-ts"
}
           │
           ▼
┌─────────────────────────┐
│    CLI Server           │
│  ProjectService         │
│  1. Criar diretorio     │
│  2. Copiar template     │
│  3. npm install         │
│  4. Iniciar Vite dev    │
└─────────────────────────┘
           │
           ▼
┌─────────────────────────┐
│    Response             │
│  {                      │
│    id: "meu-app",       │
│    devServerUrl:        │
│    "http://localhost:3333"
│  }                      │
└─────────────────────────┘
           │
           ▼
┌─────────────────────────┐
│    UI Atualiza          │
│  - File tree carrega    │
│  - Preview aponta para  │
│    localhost:3333       │
└─────────────────────────┘
```

### Editar Arquivo

```
Usuario edita no Monaco
           │
           ▼ (debounce 500ms)
PUT localhost:4444/api/projects/meu-app/files/src%2FApp.tsx
{ content: "..." }
           │
           ▼
┌─────────────────────────┐
│    CLI Server           │
│  1. Escreve no disco    │
│  2. Vite detecta (HMR)  │
└─────────────────────────┘
           │
           ▼
┌─────────────────────────┐
│    Preview Atualiza     │
│  (HMR via iframe)       │
└─────────────────────────┘
```

### Build e Publish

```
Usuario clica "Build"
           │
           ▼
POST localhost:4444/api/projects/meu-app/build
           │
           ▼
┌─────────────────────────┐
│    CLI Server           │
│  1. npm install         │
│  2. tsc --noEmit        │
│  3. vite build          │
│  4. Copia manifest      │
│  5. Calcula hash        │
└─────────────────────────┘
           │
           ▼
{ success: true, buildInfo: { hash, size } }
           │
           ▼
Usuario clica "Publish"
           │
           ▼
POST localhost:4444/api/projects/meu-app/publish
{ changelog: "...", token: "..." }
           │
           ▼
┌─────────────────────────┐
│    CLI Server           │
│  1. Cria tarball        │
│  2. Upload IPFS         │
│  3. Submit para review  │
└─────────────────────────┘
           │
           ▼
┌─────────────────────────┐
│    "Submetido para      │
│     review"             │
│    Admin aprova         │
└─────────────────────────┘
```

## Integracao com BazariOS

O Studio e registrado como app nativo:

```typescript
// apps/web/src/apps/studio/manifest.ts

export const studioManifest: NativeAppManifest = {
  id: 'studio',
  name: 'Bazari Studio',
  description: 'IDE para criar apps e smart contracts Bazari',
  icon: 'Code2',
  color: 'from-violet-500 to-purple-600',
  route: '/app/studio',
  permissions: [
    'user.profile.read',      // Info do usuario para publish
    'wallet.balance.read',    // Mostrar saldo (opcional)
    'storage.app',            // Configuracoes do Studio
    'notifications',          // Notificar build/publish
  ],
  category: 'tools',
  isNative: true,
};
```

## Consideracoes de Seguranca

1. **Path Traversal**: Validar que todos os paths de arquivo estao dentro do projeto
2. **CORS**: Permitir apenas origens conhecidas (bazari.libervia.xyz, localhost)
3. **Token**: Token do usuario nao e armazenado no servidor local
4. **Localhost Only**: Servidor so aceita conexoes de localhost por padrao

## Performance

1. **Debounce**: Salvar arquivo com debounce de 500ms
2. **File Watcher**: Usar chokidar para detectar mudancas externas
3. **HMR**: Vite fornece hot module replacement nativo
4. **Lazy Loading**: Carregar Monaco e xterm.js sob demanda

## Proximos Passos

Seguir para [02-ESTRUTURA-BASE.md](./02-ESTRUTURA-BASE.md) para implementacao da estrutura base do app nativo.
