import { Plus, FolderOpen, LayoutTemplate, Clock, Rocket, Code } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useStudioStore } from '../stores/studio.store';
import { cn } from '@/lib/utils';

export function WelcomePage() {
  const recentProjects = useStudioStore((state) => state.recentProjects);
  const setShowNewProjectDialog = useStudioStore((state) => state.setShowNewProjectDialog);
  const setShowOpenProjectDialog = useStudioStore((state) => state.setShowOpenProjectDialog);
  const openRecentProject = useStudioStore((state) => state.openRecentProject);

  const handleNewProject = () => {
    setShowNewProjectDialog(true);
  };

  const handleOpenProject = () => {
    setShowOpenProjectDialog(true);
  };

  const handleOpenTemplates = () => {
    // Templates abre o dialog de novo projeto (templates estão lá)
    setShowNewProjectDialog(true);
  };

  const handleOpenRecent = (projectId: string) => {
    openRecentProject(projectId);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-full p-8">
      <div className="max-w-3xl w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600">
              <Code className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold">Bem-vindo ao Bazari Studio</h1>
          <p className="text-muted-foreground">
            Crie apps e smart contracts para o ecossistema Bazari
          </p>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-3 gap-4">
          <QuickActionCard
            icon={Plus}
            title="Novo Projeto"
            description="Criar um novo app ou contrato"
            onClick={handleNewProject}
            variant="primary"
          />
          <QuickActionCard
            icon={FolderOpen}
            title="Abrir Projeto"
            description="Abrir projeto existente"
            onClick={handleOpenProject}
          />
          <QuickActionCard
            icon={LayoutTemplate}
            title="Templates"
            description="Explorar templates prontos"
            onClick={handleOpenTemplates}
          />
        </div>

        {/* Recent projects */}
        {recentProjects.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              Projetos Recentes
            </h2>
            <div className="space-y-2">
              {recentProjects.slice(0, 5).map((project) => (
                <RecentProjectCard
                  key={project.id}
                  name={project.name}
                  path={project.path}
                  type={project.type}
                  lastOpened={project.lastOpened}
                  onClick={() => handleOpenRecent(project.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {recentProjects.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Rocket className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="font-medium mb-2">Nenhum projeto recente</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Crie seu primeiro app ou smart contract para comecar
              </p>
              <Button onClick={handleNewProject}>
                <Plus className="h-4 w-4 mr-2" />
                Criar primeiro projeto
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Documentation links */}
        <div className="pt-4 border-t">
          <h3 className="text-sm font-medium mb-3 text-muted-foreground">
            Documentacao
          </h3>
          <div className="flex flex-wrap gap-3">
            <DocLink href="https://docs.bazari.io/studio/quickstart">
              Guia de Inicio Rapido
            </DocLink>
            <DocLink href="https://docs.bazari.io/sdk">
              Referencia do SDK
            </DocLink>
            <DocLink href="https://docs.bazari.io/examples">Exemplos</DocLink>
          </div>
        </div>
      </div>
    </div>
  );
}

interface QuickActionCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  onClick: () => void;
  variant?: 'default' | 'primary';
}

function QuickActionCard({
  icon: Icon,
  title,
  description,
  onClick,
  variant = 'default',
}: QuickActionCardProps) {
  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5',
        variant === 'primary' &&
          'bg-gradient-to-br from-violet-500/10 to-purple-600/10 border-violet-500/20 hover:border-violet-500/40'
      )}
      onClick={onClick}
    >
      <CardContent className="p-6 text-center">
        <div
          className={cn(
            'mx-auto mb-3 p-3 rounded-xl w-fit',
            variant === 'primary'
              ? 'bg-gradient-to-br from-violet-500 to-purple-600 text-white'
              : 'bg-muted'
          )}
        >
          <Icon className="h-6 w-6" />
        </div>
        <h3 className="font-medium mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

interface RecentProjectCardProps {
  name: string;
  path: string;
  type: 'app' | 'contract';
  lastOpened: string;
  onClick: () => void;
}

function RecentProjectCard({
  name,
  path,
  type,
  lastOpened,
  onClick,
}: RecentProjectCardProps) {
  const typeEmoji = type === 'app' ? '📱' : '📜';
  const timeAgo = formatTimeAgo(lastOpened);

  return (
    <Card
      className="cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={onClick}
    >
      <CardContent className="p-4 flex items-center gap-4">
        <span className="text-2xl">{typeEmoji}</span>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium truncate">{name}</h4>
          <p className="text-xs text-muted-foreground truncate">{path}</p>
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {timeAgo}
        </span>
      </CardContent>
    </Card>
  );
}

interface DocLinkProps {
  href: string;
  children: React.ReactNode;
}

function DocLink({ href, children }: DocLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-sm text-primary hover:underline"
    >
      {children}
    </a>
  );
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Agora';
  if (diffMins < 60) return `Ha ${diffMins} min`;
  if (diffHours < 24) return `Ha ${diffHours}h`;
  if (diffDays === 1) return 'Ontem';
  if (diffDays < 7) return `Ha ${diffDays} dias`;
  if (diffDays < 30) return `Ha ${Math.floor(diffDays / 7)} semanas`;
  return `Ha ${Math.floor(diffDays / 30)} meses`;
}
