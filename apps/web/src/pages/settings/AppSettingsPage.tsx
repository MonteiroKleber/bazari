import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Pin,
  PinOff,
  Trash2,
  Shield,
  GripVertical,
  RotateCcw,
} from 'lucide-react';
import * as Icons from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useInstalledApps } from '@/platform/hooks';
import { useUserAppsStore } from '@/platform/store';
import { appRegistry } from '@/platform/registry/app-registry';
import type { BazariApp } from '@/platform/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

function AppIcon({ iconName, className }: { iconName: string; className?: string }) {
  const IconComponent = (Icons as Record<string, React.ComponentType<{ className?: string }>>)[iconName];
  if (!IconComponent) {
    return <div className={cn('bg-muted rounded', className)} />;
  }
  return <IconComponent className={className} />;
}

function AppSettingsCard({ app }: { app: BazariApp }) {
  const { isPinned, pinApp, unpinApp, uninstallApp, getAppPermissions } = useUserAppsStore();
  const pinned = isPinned(app.id);
  const permissions = getAppPermissions(app.id);
  const canUninstall = !app.preInstalled;

  const handleTogglePin = () => {
    if (pinned) {
      unpinApp(app.id);
      toast.success(`${app.name} removido dos fixados`);
    } else {
      pinApp(app.id);
      toast.success(`${app.name} adicionado aos fixados`);
    }
  };

  const handleUninstall = () => {
    uninstallApp(app.id);
    toast.success(`${app.name} desinstalado`);
  };

  return (
    <Card className="group">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Drag Handle (placeholder for future drag-n-drop) */}
          <div className="flex items-center text-muted-foreground/50 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity">
            <GripVertical className="h-5 w-5" />
          </div>

          {/* App Icon */}
          <div className={cn('p-2.5 rounded-lg', app.color.includes('from-') ? `bg-gradient-to-br ${app.color}` : app.color)}>
            <AppIcon iconName={app.icon} className="h-6 w-6 text-white" />
          </div>

          {/* App Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm">{app.name}</h3>
              {pinned && (
                <Badge variant="secondary" className="text-xs">
                  <Pin className="h-3 w-3 mr-1" />
                  Fixado
                </Badge>
              )}
              {app.status === 'beta' && (
                <Badge variant="outline" className="text-xs">BETA</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{app.description}</p>
            <p className="text-xs text-muted-foreground mt-1">
              v{app.version} • {permissions.length} permissões
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Pin Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleTogglePin}
              title={pinned ? 'Remover dos fixados' : 'Fixar app'}
            >
              {pinned ? (
                <PinOff className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Pin className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>

            {/* Uninstall */}
            {canUninstall ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" title="Desinstalar">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Desinstalar {app.name}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      O app será removido da sua lista. Você pode reinstalá-lo a qualquer momento na App Store.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleUninstall} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Desinstalar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <Button variant="ghost" size="icon" disabled title="App nativo">
                <Shield className="h-4 w-4 text-muted-foreground/50" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AppSettingsPage() {
  const { apps, pinnedApps, count } = useInstalledApps();
  const { resetPreferences } = useUserAppsStore();
  const [showResetDialog, setShowResetDialog] = useState(false);

  const handleReset = () => {
    resetPreferences();
    toast.success('Preferências restauradas para o padrão');
    setShowResetDialog(false);
  };

  return (
    <div className="container max-w-3xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/app/hub">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Configurações de Apps</h1>
          <p className="text-muted-foreground text-sm">
            {count} apps instalados • {pinnedApps.length} fixados
          </p>
        </div>
      </div>

      {/* Instructions */}
      <Card className="mb-6 bg-muted/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Pin className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium text-sm">Organize seus apps</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Fixe seus apps favoritos para acesso rápido. Apps fixados aparecem primeiro na Home.
                Apps nativos não podem ser desinstalados.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Apps List */}
      <div className="space-y-3 mb-8">
        {apps.map((app) => (
          <AppSettingsCard key={app.id} app={app} />
        ))}
      </div>

      {/* Empty State */}
      {count === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <div className="text-4xl mb-3">📱</div>
            <h3 className="text-lg font-semibold mb-2">Nenhum app instalado</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Explore a App Store para instalar apps.
            </p>
            <Button asChild>
              <Link to="/app/store">Ir para App Store</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Reset Preferences */}
      {count > 0 && (
        <Card className="border-destructive/20">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <RotateCcw className="h-4 w-4" />
              Restaurar Padrões
            </CardTitle>
            <CardDescription>
              Restaura todos os apps para a configuração inicial. Apps instalados manualmente serão removidos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="text-destructive border-destructive/50 hover:bg-destructive/10">
                  Restaurar configuração padrão
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Restaurar configurações?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Isso irá remover todos os apps instalados manualmente e restaurar os apps padrão.
                    Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleReset} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Restaurar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
