/**
 * Contract WebSocket - Streaming compilation output
 */

import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { compileContractWithStream } from '../services/contract.service.js';

/**
 * Setup WebSocket handler for contract compilation with streaming output
 */
export function setupContractCompileWS(wss: WebSocketServer) {
  wss.on('connection', async (ws: WebSocket, request: IncomingMessage) => {
    const pathname = new URL(request.url || '', 'http://localhost').pathname;

    // Only handle /contracts/compile WebSocket connections
    if (pathname !== '/contracts/compile') {
      return;
    }

    console.log('[Contract WS] Client connected for compilation');

    ws.on('message', async (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString());
        const { projectPath } = data;

        if (!projectPath) {
          ws.send(
            JSON.stringify({
              type: 'error',
              error: 'Missing projectPath',
            })
          );
          return;
        }

        console.log(`[Contract WS] Compiling: ${projectPath}`);

        // Compile with streaming output
        const result = await compileContractWithStream(projectPath, (line) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(
              JSON.stringify({
                type: 'output',
                line,
              })
            );
          }
        });

        // Send final result
        if (ws.readyState === WebSocket.OPEN) {
          if (result.success) {
            ws.send(
              JSON.stringify({
                type: 'complete',
                result: {
                  wasm: result.wasm,
                  metadata: result.metadata,
                  hash: result.hash,
                },
              })
            );
          } else {
            ws.send(
              JSON.stringify({
                type: 'error',
                error: result.error,
              })
            );
          }
        }
      } catch (error) {
        console.error('[Contract WS] Error:', error);
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              type: 'error',
              error: error instanceof Error ? error.message : 'Unknown error',
            })
          );
        }
      }
    });

    ws.on('close', () => {
      console.log('[Contract WS] Client disconnected');
    });

    ws.on('error', (error) => {
      console.error('[Contract WS] WebSocket error:', error);
    });
  });
}

export default setupContractCompileWS;
