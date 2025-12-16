import { Terminal, RefreshCw, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ServerNotFoundPageProps {
  onRetry: () => void;
}

export function ServerNotFoundPage({ onRetry }: ServerNotFoundPageProps) {
  return (
    <div className="flex items-center justify-center min-h-screen h-screen p-8 bg-background">
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 rounded-full bg-destructive/10 w-fit">
            <Terminal className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-xl">CLI Server nao encontrado</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Explicacao do modelo local */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 text-sm">
            <p className="text-muted-foreground">
              O Bazari Studio roda localmente na sua maquina. Compilar Rust e smart contracts
              exige recursos pesados demais para rodar na nuvem. Desenvolva no seu ambiente local
              e publique na rede quando estiver pronto e testado.
            </p>
          </div>

          <p className="text-muted-foreground text-center">
            O Studio precisa do CLI Server rodando em{' '}
            <code className="px-1 py-0.5 bg-muted rounded text-sm">
              localhost:4444
            </code>
          </p>

          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <h4 className="font-medium text-sm">Como iniciar o CLI Server:</h4>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                1. Instale o Bazari CLI (se ainda nao instalou):
              </p>
              <pre className="bg-background rounded p-2 text-xs overflow-x-auto">
                npm install -g @bazari.libervia.xyz/cli
              </pre>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                2. Inicie o servidor do Studio:
              </p>
              <pre className="bg-background rounded p-2 text-xs overflow-x-auto">
                bazari studio
              </pre>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                3. Mantenha o terminal aberto e retorne aqui.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Button onClick={onRetry} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar novamente
            </Button>

            <Button variant="outline" className="w-full" asChild>
              <a
                href="https://docs.bazari.io/studio/setup"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Ver documentacao
              </a>
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            O Studio tentara reconectar automaticamente a cada 5 segundos.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
