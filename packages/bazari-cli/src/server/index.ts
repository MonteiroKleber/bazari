import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';

import {
  statusRoutes,
  projectRoutes,
  fileRoutes,
  buildRoutes,
  publishRoutes,
  createRoutes,
  contractRoutes,
  gitRoutes,
} from './routes/index.js';

import { setupTerminalWS, setupCommandWS } from './ws/terminal.ws.js';
import { setupWatcherWS } from './ws/watcher.ws.js';
import { setupContractCompileWS } from './ws/contract.ws.js';

const DEFAULT_PORT = 4444;

export interface ServerOptions {
  port?: number;
}

/**
 * Inicia o CLI Server para o Bazari Studio
 */
export async function startServer(options: ServerOptions = {}) {
  const port = options.port || DEFAULT_PORT;
  const app = express();
  const server = createServer(app);

  // Middleware
  app.use(
    cors({
      origin: [
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:3000',
        'https://bazari.libervia.xyz',
      ],
      credentials: true,
    })
  );
  app.use(express.json({ limit: '50mb' }));

  // Health check na raiz
  app.get('/', (_req, res) => {
    res.json({
      name: 'Bazari CLI Server',
      version: '0.1.0',
      status: 'running',
    });
  });

  // Routes HTTP
  app.use('/status', statusRoutes);
  app.use('/projects', projectRoutes);
  app.use('/files', fileRoutes);
  app.use('/build', buildRoutes);
  app.use('/publish', publishRoutes);
  app.use('/create', createRoutes);
  app.use('/contracts', contractRoutes);
  app.use('/git', gitRoutes);

  // WebSocket Server
  const wss = new WebSocketServer({ server, path: undefined });

  // Rotas WebSocket sao diferenciadas pela URL
  setupTerminalWS(wss);
  setupCommandWS(wss);
  setupWatcherWS(wss);
  setupContractCompileWS(wss);

  // Handler para upgrade de WebSocket
  server.on('upgrade', (request, socket, head) => {
    const pathname = new URL(request.url || '', 'http://localhost').pathname;

    // Verifica se e uma rota WebSocket valida
    if (
      pathname.startsWith('/terminal') ||
      pathname.startsWith('/command') ||
      pathname.startsWith('/watcher') ||
      pathname.startsWith('/contracts/compile')
    ) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  // Inicia servidor
  return new Promise<typeof server>((resolve, reject) => {
    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        reject(new Error(`Port ${port} is already in use`));
      } else {
        reject(err);
      }
    });

    server.listen(port, () => {
      console.log(`
╔═══════════════════════════════════════════════════════════╗
║                   BAZARI CLI SERVER                        ║
╠═══════════════════════════════════════════════════════════╣
║  Status:    Running                                        ║
║  HTTP:      http://localhost:${port}                          ║
║  WebSocket: ws://localhost:${port}                            ║
╠═══════════════════════════════════════════════════════════╣
║  Endpoints:                                                ║
║    GET  /status        - Server status                     ║
║    GET  /status/tools  - Check installed tools             ║
║    GET  /projects      - List projects                     ║
║    *    /files         - File operations                   ║
║    POST /build/*       - Build operations                  ║
║    POST /publish/*     - Publish operations                ║
║    *    /contracts/*   - Smart contract operations         ║
╠═══════════════════════════════════════════════════════════╣
║  WebSocket:                                                ║
║    /terminal?cwd=...   - Interactive terminal              ║
║    /command            - Run single command                ║
║    /watcher?path=...   - File watcher                      ║
║    /contracts/compile  - Stream contract compilation       ║
╚═══════════════════════════════════════════════════════════╝
      `);
      resolve(server);
    });
  });
}

/**
 * Para o servidor gracefully
 */
export function stopServer(server: ReturnType<typeof createServer>) {
  return new Promise<void>((resolve, reject) => {
    server.close((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}
