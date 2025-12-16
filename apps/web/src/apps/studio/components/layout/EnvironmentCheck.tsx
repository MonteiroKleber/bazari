import { Loader2 } from 'lucide-react';
import { useServerConnection } from '../../hooks/useServerConnection';
import { useEnvironmentCheck } from '../../hooks/useEnvironmentCheck';
import { ServerNotFoundPage } from '../../pages/ServerNotFoundPage';
import { MissingToolsPage } from '../../pages/MissingToolsPage';
import type { EnvironmentStatus } from '../../types/studio.types';

interface EnvironmentCheckProps {
  children: (environment: EnvironmentStatus | null) => React.ReactNode;
}

export function EnvironmentCheck({ children }: EnvironmentCheckProps) {
  const {
    status: server,
    loading: serverLoading,
    retry: retryServer,
  } = useServerConnection();

  const {
    status: env,
    loading: envLoading,
    isReady,
  } = useEnvironmentCheck(server.connected);

  // 1. Verificando conexao
  if (serverLoading) {
    return <LoadingScreen message="Conectando ao CLI Server..." />;
  }

  // 2. Servidor nao encontrado
  if (!server.connected) {
    return <ServerNotFoundPage onRetry={retryServer} />;
  }

  // 3. Verificando ferramentas
  if (envLoading) {
    return <LoadingScreen message="Verificando ambiente..." />;
  }

  // 4. Node/npm faltando (bloqueia)
  if (!isReady && env) {
    return <MissingToolsPage tools={env} onRetry={retryServer} />;
  }

  // 5. Ambiente OK - passa o environment para os filhos
  return <>{children(env)}</>;
}

interface LoadingScreenProps {
  message: string;
}

function LoadingScreen({ message }: LoadingScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center h-screen min-h-screen bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
}
