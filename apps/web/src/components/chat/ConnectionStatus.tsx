import { useEffect, useState } from 'react';
import { WifiOff, Loader2 } from 'lucide-react';
import { chatWs } from '../../lib/chat/websocket';
import { Alert, AlertDescription } from '../ui/alert';

export function ConnectionStatus() {
  const [connected, setConnected] = useState(chatWs.isConnected());
  const [queueSize, setQueueSize] = useState(0);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  useEffect(() => {
    // Subscribe to connection status
    const unsubscribe = chatWs.onStatusChange((isConnected) => {
      setConnected(isConnected);
      setQueueSize(chatWs.getQueueSize());
      setReconnectAttempts(chatWs.getReconnectAttempts());
    });

    // Poll for queue size updates
    const interval = setInterval(() => {
      setQueueSize(chatWs.getQueueSize());
      setReconnectAttempts(chatWs.getReconnectAttempts());
    }, 1000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  // Don't show anything if connected and no queued messages
  if (connected && queueSize === 0) {
    return null;
  }

  // Show reconnecting state
  if (!connected && reconnectAttempts > 0) {
    return (
      <Alert className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
        <Loader2 className="h-4 w-4 animate-spin text-yellow-600" />
        <AlertDescription className="text-sm text-yellow-800 dark:text-yellow-200">
          Reconectando... (tentativa {reconnectAttempts})
          {queueSize > 0 && ` • ${queueSize} mensagens na fila`}
        </AlertDescription>
      </Alert>
    );
  }

  // Show offline state
  if (!connected) {
    return (
      <Alert variant="destructive" className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
        <WifiOff className="h-4 w-4" />
        <AlertDescription className="text-sm">
          Desconectado
          {queueSize > 0 && ` • ${queueSize} mensagens serão enviadas quando reconectar`}
        </AlertDescription>
      </Alert>
    );
  }

  // Show syncing state (connected but has queued messages)
  if (connected && queueSize > 0) {
    return (
      <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
        <AlertDescription className="text-sm text-blue-800 dark:text-blue-200">
          Sincronizando {queueSize} {queueSize === 1 ? 'mensagem' : 'mensagens'}...
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
