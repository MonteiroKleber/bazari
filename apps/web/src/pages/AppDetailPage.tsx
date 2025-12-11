import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, Download, Trash2, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AppIcon, PermissionList, AppInstallModal, AppPurchaseButton } from '@/components/platform';
import { appRegistry } from '@/platform/registry';
import { useAppInstall, useAppPermissions, useAppLauncher } from '@/platform/hooks';
import { isExternalApp } from '@/platform/services';
import type { PermissionDefinition } from '@/platform/types';

export default function AppDetailPage() {
  const { appId } = useParams<{ appId: string }>();
  const navigate = useNavigate();
  const { launch } = useAppLauncher();

  const app = appRegistry.get(appId || '');

  const {
    isInstalled,
    install,
    uninstall,
    showPermissionModal,
    closePermissionModal,
    confirmInstall,
    isProcessing,
  } = useAppInstall(appId || '');

  const { requiredPermissions, optionalPermissions } = useAppPermissions(appId || '');

  if (!app) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">App não encontrado</h1>
        <Button asChild>
          <Link to="/app/store">Voltar para App Store</Link>
        </Button>
      </div>
    );
  }

  const allPermissions: PermissionDefinition[] = [
    ...requiredPermissions,
    ...optionalPermissions,
  ];

  const handleUninstall = async () => {
    await uninstall();
    navigate('/app');
  };

  const handleOpenApp = async () => {
    if (isExternalApp(app)) {
      await launch(app);
    } else {
      navigate(app.entryPoint);
    }
  };

  return (
    <div className="container max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/app/store">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
      </div>

      {/* App Info */}
      <div className="flex items-start gap-6 mb-8">
        <AppIcon app={app} size="xl" />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold">{app.name}</h1>
            {app.status !== 'stable' && (
              <Badge variant="secondary">{app.status.toUpperCase()}</Badge>
            )}
          </div>
          <p className="text-muted-foreground mb-3">{app.description}</p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="capitalize">{app.category}</span>
            {app.rating && (
              <span className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                {app.rating.toFixed(1)}
              </span>
            )}
            {app.installCount && (
              <span className="flex items-center gap-1">
                <Download className="w-4 h-4" />
                {app.installCount.toLocaleString()}
              </span>
            )}
            <span>v{app.version}</span>
          </div>
        </div>
      </div>

      {/* Price Badge */}
      {app.monetizationType && app.monetizationType !== 'FREE' && app.price && (
        <div className="flex items-center gap-2 mb-4">
          <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
            <DollarSign className="w-3 h-3 mr-1" />
            {app.price.toFixed(2)} {app.currency || 'BZR'}
          </Badge>
          {app.monetizationType === 'SUBSCRIPTION' && (
            <Badge variant="outline">Assinatura</Badge>
          )}
        </div>
      )}

      {/* Action Button */}
      <div className="flex gap-3 mb-8">
        {isInstalled ? (
          <>
            <Button onClick={handleOpenApp} className="flex-1">
              Abrir App
            </Button>
            <Button
              variant="destructive"
              size="icon"
              onClick={handleUninstall}
              disabled={isProcessing}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </>
        ) : (
          <>
            {/* Show purchase button for paid apps */}
            {app.monetizationType && app.monetizationType !== 'FREE' && app.price ? (
              <AppPurchaseButton
                appId={app.id}
                appName={app.name}
                price={app.price}
                currency={app.currency}
                monetizationType={app.monetizationType}
                onPurchaseComplete={() => {
                  // After purchase, user can install
                }}
              />
            ) : null}
            <Button onClick={install} disabled={isProcessing} className="flex-1">
              {isProcessing ? 'Instalando...' : 'Instalar'}
            </Button>
          </>
        )}
      </div>

      <Separator className="mb-8" />

      {/* Long Description */}
      {app.longDescription && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Sobre</h2>
          <p className="text-muted-foreground whitespace-pre-line">
            {app.longDescription}
          </p>
        </div>
      )}

      {/* Screenshots */}
      {app.screenshots && app.screenshots.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Screenshots</h2>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {app.screenshots.map((src, idx) => (
              <img
                key={idx}
                src={src}
                alt={`Screenshot ${idx + 1}`}
                className="w-64 h-auto rounded-lg border"
              />
            ))}
          </div>
        </div>
      )}

      {/* Permissions */}
      {allPermissions.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Permissões</h2>
          <PermissionList permissions={allPermissions} />
        </div>
      )}

      {/* Tags */}
      {app.tags.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Tags</h2>
          <div className="flex flex-wrap gap-2">
            {app.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Install Modal */}
      <AppInstallModal
        app={app}
        open={showPermissionModal}
        onOpenChange={(open) => !open && closePermissionModal()}
        onConfirm={confirmInstall}
        isProcessing={isProcessing}
      />
    </div>
  );
}
