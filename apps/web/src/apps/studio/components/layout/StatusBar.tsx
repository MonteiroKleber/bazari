import { Check, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BuildStatus, EnvironmentStatus } from '../../types/studio.types';

interface StatusBarProps {
  status: string;
  buildStatus: BuildStatus;
  cursorPosition?: {
    line: number;
    column: number;
  };
  language?: string;
  encoding?: string;
  projectName?: string;
  environment?: EnvironmentStatus | null;
}

export function StatusBar({
  status,
  buildStatus,
  cursorPosition,
  language,
  encoding = 'UTF-8',
  projectName,
  environment,
}: StatusBarProps) {
  return (
    <div className="flex items-center justify-between h-6 px-3 bg-muted/50 border-t border-border text-xs text-muted-foreground">
      {/* Left side */}
      <div className="flex items-center gap-3">
        {/* Status */}
        <StatusIndicator status={buildStatus} message={status} />

        {/* Project name */}
        {projectName && (
          <span className="text-foreground font-medium">{projectName}</span>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Environment indicators */}
        {environment && <EnvironmentIndicators environment={environment} />}

        {/* Cursor position */}
        {cursorPosition && (
          <span>
            Ln {cursorPosition.line}, Col {cursorPosition.column}
          </span>
        )}

        {/* Language */}
        {language && <span>{language}</span>}

        {/* Encoding */}
        <span>{encoding}</span>
      </div>
    </div>
  );
}

interface StatusIndicatorProps {
  status: BuildStatus;
  message: string;
}

function StatusIndicator({ status, message }: StatusIndicatorProps) {
  const icons = {
    idle: null,
    building: <Loader2 className="h-3 w-3 animate-spin text-yellow-500" />,
    success: <Check className="h-3 w-3 text-green-500" />,
    error: <AlertCircle className="h-3 w-3 text-red-500" />,
  };

  return (
    <div className="flex items-center gap-1">
      {icons[status]}
      <span
        className={cn(
          status === 'error' && 'text-red-500',
          status === 'success' && 'text-green-500',
          status === 'building' && 'text-yellow-500'
        )}
      >
        {message}
      </span>
    </div>
  );
}

interface EnvironmentIndicatorsProps {
  environment: EnvironmentStatus;
}

function EnvironmentIndicators({ environment }: EnvironmentIndicatorsProps) {
  const tools = [
    { key: 'node', label: 'Node', status: environment.node },
    { key: 'npm', label: 'npm', status: environment.npm },
    { key: 'rust', label: 'Rust', status: environment.rust },
    { key: 'cargo', label: 'cargo-contract', status: environment.cargoContract },
  ];

  return (
    <div className="flex items-center gap-2">
      {tools.map(({ key, label, status }) => (
        <span
          key={key}
          className={cn(
            'flex items-center gap-0.5',
            status.installed ? 'text-green-600' : 'text-muted-foreground/50'
          )}
          title={
            status.installed
              ? `${label} ${status.version || ''}`
              : `${label} nao instalado`
          }
        >
          <span
            className={cn(
              'w-1.5 h-1.5 rounded-full',
              status.installed ? 'bg-green-500' : 'bg-muted-foreground/30'
            )}
          />
          <span className="hidden lg:inline">{label}</span>
        </span>
      ))}
    </div>
  );
}
