import {
  Plus,
  FolderOpen,
  Save,
  Play,
  Package,
  Rocket,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { BuildStatus, Project } from '../../types/studio.types';

interface ToolbarProps {
  project: Project | null;
  buildStatus: BuildStatus;
  onNewProject: () => void;
  onOpenProject: () => void;
  onSave: () => void;
  onDev: () => void;
  onBuild: () => void;
  onPublish: () => void;
}

export function Toolbar({
  project,
  buildStatus,
  onNewProject,
  onOpenProject,
  onSave,
  onDev,
  onBuild,
  onPublish,
}: ToolbarProps) {
  const isBuilding = buildStatus === 'building';
  const canPublish = buildStatus === 'success';

  return (
    <div className="flex items-center h-12 px-2 bg-muted/30 border-b border-border">
      {/* Project actions */}
      <div className="flex items-center gap-1">
        <ToolbarButton icon={Plus} label="Novo" onClick={onNewProject} />
        <ToolbarButton icon={FolderOpen} label="Abrir" onClick={onOpenProject} />
        <ToolbarButton
          icon={Save}
          label="Salvar"
          onClick={onSave}
          disabled={!project}
          shortcut="Ctrl+S"
        />
      </div>

      <Separator orientation="vertical" className="mx-2 h-6" />

      {/* Build actions */}
      <div className="flex items-center gap-1">
        <ToolbarButton
          icon={Play}
          label="Dev"
          onClick={onDev}
          disabled={!project}
          variant="success"
        />
        <ToolbarButton
          icon={isBuilding ? RefreshCw : Package}
          label={isBuilding ? 'Buildando...' : 'Build'}
          onClick={onBuild}
          disabled={!project || isBuilding}
          loading={isBuilding}
        />
        <ToolbarButton
          icon={Rocket}
          label="Publicar"
          onClick={onPublish}
          disabled={!project || !canPublish}
          variant="primary"
        />
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Project name */}
      {project && (
        <div className="text-sm text-muted-foreground mr-2">
          <span className="font-medium text-foreground">{project.name}</span>
          <span className="mx-1">|</span>
          <span>{project.version}</span>
        </div>
      )}

      {/* Build status indicator */}
      <BuildStatusIndicator status={buildStatus} />
    </div>
  );
}

interface ToolbarButtonProps {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  shortcut?: string;
  variant?: 'default' | 'success' | 'primary';
}

function ToolbarButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  loading,
  shortcut,
  variant = 'default',
}: ToolbarButtonProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'h-8 px-2 gap-1.5',
        variant === 'success' && 'text-green-600 hover:text-green-700 hover:bg-green-100/50',
        variant === 'primary' && 'text-primary hover:bg-primary/10'
      )}
      title={shortcut ? `${label} (${shortcut})` : label}
    >
      <Icon className={cn('h-4 w-4', loading && 'animate-spin')} />
      <span className="hidden sm:inline">{label}</span>
    </Button>
  );
}

interface BuildStatusIndicatorProps {
  status: BuildStatus;
}

function BuildStatusIndicator({ status }: BuildStatusIndicatorProps) {
  const statusConfig = {
    idle: { color: 'bg-muted-foreground', label: 'Pronto' },
    building: { color: 'bg-yellow-500 animate-pulse', label: 'Buildando...' },
    success: { color: 'bg-green-500', label: 'Build OK' },
    error: { color: 'bg-red-500', label: 'Erro' },
  };

  const config = statusConfig[status];

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <div className={cn('w-2 h-2 rounded-full', config.color)} />
      <span>{config.label}</span>
    </div>
  );
}
