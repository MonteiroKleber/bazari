/**
 * useDevServer - Hook for managing Vite dev server via CLI Server
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { localServer } from '../services/localServer.client';

interface DevServerState {
  url: string | null;
  isRunning: boolean;
  isStarting: boolean;
  pid: number | null;
  error: Error | null;
}

interface UseDevServerOptions {
  projectPath: string;
  port?: number;
  autoStart?: boolean;
}

interface UseDevServerReturn extends DevServerState {
  startServer: () => Promise<void>;
  stopServer: () => Promise<void>;
  restartServer: () => Promise<void>;
}

export function useDevServer(options: UseDevServerOptions): UseDevServerReturn {
  const { projectPath, port = 3333, autoStart = false } = options;

  const [state, setState] = useState<DevServerState>({
    url: null,
    isRunning: false,
    isStarting: false,
    pid: null,
    error: null,
  });

  // Track if we've already auto-started
  const hasAutoStarted = useRef(false);
  // Track current pid for cleanup
  const pidRef = useRef<number | null>(null);

  /**
   * Start the dev server
   */
  const startServer = useCallback(async () => {
    if (state.isRunning || state.isStarting) return;

    setState((s) => ({ ...s, isStarting: true, error: null }));

    try {
      // Start dev server via CLI Server
      const result = await localServer.startDevServer(projectPath, port);

      if (result.success && result.url && result.pid) {
        pidRef.current = result.pid;
        setState({
          url: result.url,
          isRunning: true,
          isStarting: false,
          pid: result.pid,
          error: null,
        });
      } else {
        throw new Error(result.error || 'Failed to start dev server');
      }
    } catch (error) {
      setState((s) => ({
        ...s,
        isStarting: false,
        error: error instanceof Error ? error : new Error(String(error)),
      }));
    }
  }, [projectPath, port, state.isRunning, state.isStarting]);

  /**
   * Stop the dev server
   */
  const stopServer = useCallback(async () => {
    if (!state.isRunning) return;

    try {
      await localServer.stopDevServer(projectPath);
      pidRef.current = null;
      setState({
        url: null,
        isRunning: false,
        isStarting: false,
        pid: null,
        error: null,
      });
    } catch (error) {
      console.error('Failed to stop server:', error);
      // Reset state anyway
      pidRef.current = null;
      setState({
        url: null,
        isRunning: false,
        isStarting: false,
        pid: null,
        error: null,
      });
    }
  }, [projectPath, state.isRunning]);

  /**
   * Restart the dev server
   */
  const restartServer = useCallback(async () => {
    await stopServer();
    // Small delay to ensure cleanup
    await new Promise((resolve) => setTimeout(resolve, 500));
    await startServer();
  }, [stopServer, startServer]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (pidRef.current) {
        // Best effort cleanup
        localServer.stopDevServer(projectPath).catch(() => {});
      }
    };
  }, [projectPath]);

  /**
   * Auto-start if configured
   */
  useEffect(() => {
    if (
      autoStart &&
      projectPath &&
      !state.isRunning &&
      !state.isStarting &&
      !hasAutoStarted.current
    ) {
      hasAutoStarted.current = true;
      startServer();
    }
  }, [autoStart, projectPath, state.isRunning, state.isStarting, startServer]);

  /**
   * Reset auto-start flag when project changes
   */
  useEffect(() => {
    hasAutoStarted.current = false;
  }, [projectPath]);

  return {
    ...state,
    startServer,
    stopServer,
    restartServer,
  };
}
