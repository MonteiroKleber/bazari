/**
 * OpenProjectDialog - Dialog to list and open existing projects
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { localServer, type ProjectInfo } from '../../services/localServer.client';
import {
  Loader2,
  FolderOpen,
  Calendar,
  Package,
  Code,
  FileCode,
  RefreshCw,
  FolderPlus,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface OpenProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectSelect: (projectPath: string) => void;
  onNewProject?: () => void;
}

export const OpenProjectDialog: React.FC<OpenProjectDialogProps> = ({
  open,
  onOpenChange,
  onProjectSelect,
  onNewProject,
}) => {
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  const loadProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const projectList = await localServer.listProjects();
      setProjects(projectList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadProjects();
      setSelectedProject(null);
    }
  }, [open]);

  const handleOpen = () => {
    if (selectedProject) {
      onProjectSelect(selectedProject);
      onOpenChange(false);
    }
  };

  const handleDoubleClick = (projectPath: string) => {
    onProjectSelect(projectPath);
    onOpenChange(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTypeIcon = (type: 'app' | 'contract') => {
    return type === 'contract' ? (
      <FileCode className="h-4 w-4 text-orange-500" />
    ) : (
      <Code className="h-4 w-4 text-blue-500" />
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Abrir Projeto
          </DialogTitle>
          <DialogDescription>
            Selecione um projeto existente para abrir no Studio
          </DialogDescription>
        </DialogHeader>

        {/* Project List */}
        <div className="min-h-[300px] max-h-[400px] overflow-auto rounded-lg border bg-muted/30">
          {loading ? (
            <div className="flex items-center justify-center h-[300px]">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-[300px] gap-3">
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" size="sm" onClick={loadProjects}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Tentar novamente
              </Button>
            </div>
          ) : projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[300px] gap-3">
              <Package className="h-12 w-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Nenhum projeto encontrado
              </p>
              {onNewProject && (
                <Button variant="outline" size="sm" onClick={() => {
                  onOpenChange(false);
                  onNewProject();
                }}>
                  <FolderPlus className="h-4 w-4 mr-2" />
                  Criar novo projeto
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {projects.map((project) => (
                <div
                  key={project.path}
                  className={cn(
                    'flex items-center gap-3 p-3 cursor-pointer transition-colors hover:bg-accent/50',
                    selectedProject === project.path && 'bg-accent'
                  )}
                  onClick={() => setSelectedProject(project.path)}
                  onDoubleClick={() => handleDoubleClick(project.path)}
                >
                  {/* Type Icon */}
                  <div className="flex-shrink-0">
                    {getTypeIcon(project.type)}
                  </div>

                  {/* Project Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium truncate">{project.name}</h4>
                      <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        v{project.version}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {project.description || 'Sem descrição'}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(project.lastModified)}
                      </span>
                      {project.category && (
                        <span className="bg-muted px-1.5 py-0.5 rounded">
                          {project.category}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Open indicator */}
                  {selectedProject === project.path && (
                    <FolderOpen className="h-4 w-4 text-primary flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={loadProjects}
              disabled={loading}
            >
              <RefreshCw className={cn('h-4 w-4 mr-1', loading && 'animate-spin')} />
              Atualizar
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleOpen}
              disabled={!selectedProject}
            >
              <FolderOpen className="h-4 w-4 mr-2" />
              Abrir
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OpenProjectDialog;
