import { WebSocketServer, WebSocket } from 'ws';
import { watch, type FSWatcher } from 'chokidar';
import type { IncomingMessage } from 'http';

interface WatcherEvent {
  type: 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir' | 'ready' | 'error';
  path?: string;
  message?: string;
}

/**
 * Configura WebSocket para file watcher
 */
export function setupWatcherWS(wss: WebSocketServer) {
  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    if (!req.url?.startsWith('/watcher')) return;

    const url = new URL(req.url, 'http://localhost');
    const watchPath = url.searchParams.get('path');

    if (!watchPath) {
      ws.send(JSON.stringify({ type: 'error', message: 'Missing path parameter' }));
      ws.close(1008, 'Missing path parameter');
      return;
    }

    let watcher: FSWatcher | null = null;

    try {
      watcher = watch(watchPath, {
        // Ignora arquivos e pastas comuns que nao devem ser monitorados
        ignored: [
          /(^|[\/\\])\../, // Arquivos ocultos
          /node_modules/,
          /dist/,
          /\.git/,
          /\.cache/,
          /\.turbo/,
          /\.next/,
          /\.nuxt/,
          /\.output/,
          /coverage/,
          /\.nyc_output/,
        ],
        persistent: true,
        ignoreInitial: false,
        awaitWriteFinish: {
          stabilityThreshold: 100,
          pollInterval: 100,
        },
      });

      // Eventos de arquivo
      watcher.on('add', (path: string) => {
        sendEvent(ws, { type: 'add', path });
      });

      watcher.on('change', (path: string) => {
        sendEvent(ws, { type: 'change', path });
      });

      watcher.on('unlink', (path: string) => {
        sendEvent(ws, { type: 'unlink', path });
      });

      // Eventos de diretorio
      watcher.on('addDir', (path: string) => {
        sendEvent(ws, { type: 'addDir', path });
      });

      watcher.on('unlinkDir', (path: string) => {
        sendEvent(ws, { type: 'unlinkDir', path });
      });

      // Watcher pronto
      watcher.on('ready', () => {
        sendEvent(ws, { type: 'ready' });
      });

      // Erros
      watcher.on('error', (error: Error) => {
        sendEvent(ws, { type: 'error', message: error.message });
      });

      // Mensagem de conexao
      ws.send(
        JSON.stringify({
          type: 'connected',
          watchPath,
        })
      );
    } catch (error) {
      ws.send(
        JSON.stringify({
          type: 'error',
          message: error instanceof Error ? error.message : 'Failed to setup watcher',
        })
      );
      ws.close();
      return;
    }

    // Cleanup on close
    ws.on('close', () => {
      if (watcher) {
        watcher.close();
      }
    });

    // Permite adicionar/remover paths dinamicamente
    ws.on('message', (message) => {
      try {
        const msg = JSON.parse(message.toString());

        if (msg.type === 'add' && msg.path && watcher) {
          watcher.add(msg.path);
        } else if (msg.type === 'unwatch' && msg.path && watcher) {
          watcher.unwatch(msg.path);
        }
      } catch {
        // Ignora mensagens invalidas
      }
    });
  });
}

function sendEvent(ws: WebSocket, event: WatcherEvent) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(event));
  }
}
