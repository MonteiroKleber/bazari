import { WebSocketServer, WebSocket } from 'ws';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import type { IncomingMessage } from 'http';

interface TerminalMessage {
  type: 'input' | 'resize';
  data?: string;
  cols?: number;
  rows?: number;
}

/**
 * Configura WebSocket para terminal interativo
 * Usa spawn ao inves de node-pty para evitar dependencia nativa
 */
export function setupTerminalWS(wss: WebSocketServer) {
  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    if (!req.url?.startsWith('/terminal')) return;

    // Parse cwd from URL
    const url = new URL(req.url, 'http://localhost');
    const cwd = url.searchParams.get('cwd') || process.cwd();

    // Determina shell baseado na plataforma
    const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash';
    const shellArgs = process.platform === 'win32' ? [] : ['-i'];

    let proc: ChildProcessWithoutNullStreams | null = null;

    try {
      proc = spawn(shell, shellArgs, {
        cwd,
        env: {
          ...process.env,
          TERM: 'xterm-256color',
          COLORTERM: 'truecolor',
        },
        shell: false,
      });

      // stdout -> WebSocket
      proc.stdout.on('data', (data: Buffer) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'output', data: data.toString() }));
        }
      });

      // stderr -> WebSocket
      proc.stderr.on('data', (data: Buffer) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'output', data: data.toString() }));
        }
      });

      // Process exit
      proc.on('close', (code) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              type: 'exit',
              code: code ?? 0,
            })
          );
          ws.close();
        }
      });

      proc.on('error', (error) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              type: 'error',
              message: error.message,
            })
          );
        }
      });

      // WebSocket -> stdin
      ws.on('message', (message) => {
        try {
          const msg: TerminalMessage = JSON.parse(message.toString());

          if (msg.type === 'input' && msg.data && proc) {
            proc.stdin.write(msg.data);
          }
          // resize nao e suportado sem node-pty
        } catch {
          // Ignora mensagens invalidas
        }
      });

      // Cleanup on close
      ws.on('close', () => {
        if (proc && !proc.killed) {
          proc.kill('SIGTERM');
        }
      });

      // Envia mensagem de conexao
      ws.send(
        JSON.stringify({
          type: 'connected',
          shell,
          cwd,
        })
      );
    } catch (error) {
      ws.send(
        JSON.stringify({
          type: 'error',
          message:
            error instanceof Error ? error.message : 'Failed to spawn terminal',
        })
      );
      ws.close();
    }
  });
}

/**
 * Executa um comando unico e retorna output via WebSocket
 */
export function setupCommandWS(wss: WebSocketServer) {
  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    if (!req.url?.startsWith('/command')) return;

    ws.on('message', async (message) => {
      try {
        const { command, cwd } = JSON.parse(message.toString());

        if (!command) {
          ws.send(JSON.stringify({ type: 'error', message: 'Missing command' }));
          return;
        }

        const proc = spawn(command, [], {
          cwd: cwd || process.cwd(),
          shell: true,
          env: { ...process.env, FORCE_COLOR: '1' },
        });

        proc.stdout.on('data', (data: Buffer) => {
          ws.send(JSON.stringify({ type: 'stdout', data: data.toString() }));
        });

        proc.stderr.on('data', (data: Buffer) => {
          ws.send(JSON.stringify({ type: 'stderr', data: data.toString() }));
        });

        proc.on('close', (code) => {
          ws.send(JSON.stringify({ type: 'exit', code: code ?? 0 }));
        });

        proc.on('error', (error) => {
          ws.send(JSON.stringify({ type: 'error', message: error.message }));
        });
      } catch {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid message' }));
      }
    });
  });
}
