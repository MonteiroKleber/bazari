/**
 * useFileWatcher - Hook for watching file changes via WebSocket
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useEditorStore } from '../stores/editor.store';

type FileChangeType = 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir';

interface FileChangeEvent {
  type: FileChangeType;
  path: string;
  timestamp: number;
}

interface UseFileWatcherOptions {
  projectPath: string;
  onFileChange?: (event: FileChangeEvent) => void;
  onFileAdd?: (path: string) => void;
  onFileDelete?: (path: string) => void;
  onFileModify?: (path: string) => void;
  enabled?: boolean;
}

interface UseFileWatcherReturn {
  isConnected: boolean;
  lastEvent: FileChangeEvent | null;
  startWatching: () => void;
  stopWatching: () => void;
}

const WATCHER_WS_URL = 'ws://localhost:4444/ws/watcher';

export function useFileWatcher({
  projectPath,
  onFileChange,
  onFileAdd,
  onFileDelete,
  onFileModify,
  enabled = true,
}: UseFileWatcherOptions): UseFileWatcherReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<FileChangeEvent | null>(null);

  const { getTabByPath } = useEditorStore();

  /**
   * Handle incoming file change events
   */
  const handleFileChange = useCallback(
    (event: FileChangeEvent) => {
      setLastEvent(event);

      // Call general callback
      onFileChange?.(event);

      // Call specific callbacks
      switch (event.type) {
        case 'add':
        case 'addDir':
          onFileAdd?.(event.path);
          break;

        case 'unlink':
        case 'unlinkDir':
          onFileDelete?.(event.path);
          break;

        case 'change':
          onFileModify?.(event.path);

          // Check if this file is open in a tab
          // Could trigger content reload here for clean tabs
          getTabByPath(event.path);
          break;
      }
    },
    [onFileChange, onFileAdd, onFileDelete, onFileModify, getTabByPath]
  );

  /**
   * Connect to WebSocket
   */
  const connect = useCallback(() => {
    if (!enabled || !projectPath) return;

    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }

    try {
      const ws = new WebSocket(WATCHER_WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);

        // Send watch request
        ws.send(
          JSON.stringify({
            type: 'watch',
            path: projectPath,
          })
        );
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'watching') {
            // Successfully started watching
          } else if (data.type === 'error') {
            // Handle watcher error silently
          } else {
            // File change event
            handleFileChange({
              type: data.type,
              path: data.path,
              timestamp: Date.now(),
            });
          }
        } catch {
          // Failed to parse message
        }
      };

      ws.onclose = () => {
        setIsConnected(false);

        // Attempt reconnection after 3 seconds
        if (enabled) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 3000);
        }
      };

      ws.onerror = () => {
        // WebSocket error - will trigger onclose
      };
    } catch {
      // Failed to connect to watcher
    }
  }, [enabled, projectPath, handleFileChange]);

  /**
   * Disconnect from WebSocket
   */
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      // Send unwatch request before closing
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'unwatch',
            path: projectPath,
          })
        );
      }

      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
  }, [projectPath]);

  /**
   * Start watching
   */
  const startWatching = useCallback(() => {
    connect();
  }, [connect]);

  /**
   * Stop watching
   */
  const stopWatching = useCallback(() => {
    disconnect();
  }, [disconnect]);

  /**
   * Connect on mount, disconnect on unmount
   */
  useEffect(() => {
    if (enabled) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  /**
   * Reconnect when project path changes
   */
  useEffect(() => {
    if (enabled && projectPath && wsRef.current?.readyState === WebSocket.OPEN) {
      // Update watched path
      wsRef.current.send(
        JSON.stringify({
          type: 'watch',
          path: projectPath,
        })
      );
    }
  }, [projectPath, enabled]);

  return {
    isConnected,
    lastEvent,
    startWatching,
    stopWatching,
  };
}
