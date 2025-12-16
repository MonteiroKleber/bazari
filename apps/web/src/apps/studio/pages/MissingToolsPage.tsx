import { AlertTriangle, Check, X, RefreshCw, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { EnvironmentStatus } from '../types/studio.types';
import { getInstallInstructions } from '../services/environment.service';

interface MissingToolsPageProps {
  tools: EnvironmentStatus;
  onRetry: () => void;
}

export function MissingToolsPage({ tools, onRetry }: MissingToolsPageProps) {
  const missingRequired: string[] = [];
  const missingOptional: string[] = [];

  if (!tools.node.installed) missingRequired.push('Node.js');
  if (!tools.npm.installed) missingRequired.push('npm');
  if (!tools.rust.installed) missingOptional.push('Rust');
  if (!tools.cargoContract.installed) missingOptional.push('cargo-contract');

  const instructions = getInstallInstructions([
    ...missingRequired,
    ...missingOptional,
  ]);

  return (
    <div className="flex items-center justify-center min-h-screen h-screen p-8 bg-background overflow-auto">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 rounded-full bg-yellow-500/10 w-fit">
            <AlertTriangle className="h-8 w-8 text-yellow-600" />
          </div>
          <CardTitle className="text-xl">Ferramentas necessarias</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          <p className="text-muted-foreground text-center">
            Algumas ferramentas de desenvolvimento estao faltando no seu
            sistema.
          </p>

          {/* Tools status */}
          <div className="grid grid-cols-2 gap-3">
            <ToolStatus
              name="Node.js"
              installed={tools.node.installed}
              version={tools.node.version}
              required
            />
            <ToolStatus
              name="npm"
              installed={tools.npm.installed}
              version={tools.npm.version}
              required
            />
            <ToolStatus
              name="Rust"
              installed={tools.rust.installed}
              version={tools.rust.version}
            />
            <ToolStatus
              name="cargo-contract"
              installed={tools.cargoContract.installed}
              version={tools.cargoContract.version}
            />
          </div>

          {/* Required tools warning */}
          {missingRequired.length > 0 && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <h4 className="font-medium text-destructive mb-2">
                Obrigatorio para usar o Studio:
              </h4>
              <ul className="text-sm text-destructive/80 list-disc list-inside">
                {missingRequired.map((tool) => (
                  <li key={tool}>{tool}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Optional tools info */}
          {missingOptional.length > 0 && missingRequired.length === 0 && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
              <h4 className="font-medium text-yellow-700 mb-2">
                Opcional (para smart contracts):
              </h4>
              <ul className="text-sm text-yellow-600/80 list-disc list-inside">
                {missingOptional.map((tool) => (
                  <li key={tool}>{tool}</li>
                ))}
              </ul>
              <p className="text-xs text-yellow-600/60 mt-2">
                Voce pode criar apps sem essas ferramentas.
              </p>
            </div>
          )}

          {/* Installation instructions */}
          <details className="bg-muted/50 rounded-lg">
            <summary className="p-4 cursor-pointer font-medium text-sm hover:bg-muted/70 rounded-lg">
              Ver instrucoes de instalacao
            </summary>
            <div className="px-4 pb-4">
              <pre className="bg-background rounded p-3 text-xs overflow-x-auto whitespace-pre-wrap">
                {instructions}
              </pre>
            </div>
          </details>

          <div className="flex flex-col gap-3">
            <Button onClick={onRetry} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Verificar novamente
            </Button>

            <Button variant="outline" className="w-full" asChild>
              <a
                href="https://docs.bazari.io/studio/requirements"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Ver documentacao completa
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface ToolStatusProps {
  name: string;
  installed: boolean;
  version?: string;
  required?: boolean;
}

function ToolStatus({ name, installed, version, required }: ToolStatusProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border',
        installed
          ? 'bg-green-500/5 border-green-500/20'
          : required
            ? 'bg-destructive/5 border-destructive/20'
            : 'bg-muted/50 border-border'
      )}
    >
      {installed ? (
        <Check className="h-5 w-5 text-green-600" />
      ) : (
        <X
          className={cn(
            'h-5 w-5',
            required ? 'text-destructive' : 'text-muted-foreground'
          )}
        />
      )}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'font-medium text-sm',
            !installed && required && 'text-destructive'
          )}
        >
          {name}
          {required && (
            <span className="text-xs text-muted-foreground ml-1">
              (obrigatorio)
            </span>
          )}
        </p>
        {installed && version && (
          <p className="text-xs text-muted-foreground truncate">{version}</p>
        )}
      </div>
    </div>
  );
}
