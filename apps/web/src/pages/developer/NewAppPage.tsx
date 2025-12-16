import { Link } from 'react-router-dom';
import { Code, Upload, Terminal, ArrowRight } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DeveloperLayout } from '@/layouts/DeveloperLayout';

export default function NewAppPage() {
  return (
    <DeveloperLayout
      title="Novo App"
      description="Escolha como criar seu app Bazari"
    >
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-4xl">
        {/* Option 1: Bazari Studio */}
        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader>
            <div className="p-3 rounded-lg bg-primary/10 w-fit mb-2">
              <Code className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Bazari Studio</CardTitle>
            <CardDescription>
              IDE completa com templates, preview e publicacao integrada
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-muted-foreground space-y-1 mb-4">
              <li>• Templates prontos para usar</li>
              <li>• Editor de codigo integrado</li>
              <li>• Preview em tempo real</li>
              <li>• Assistente AI</li>
            </ul>
            <Button asChild className="w-full">
              <Link to="/app/studio">
                Abrir Studio
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Option 2: CLI */}
        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader>
            <div className="p-3 rounded-lg bg-purple-500/10 w-fit mb-2">
              <Terminal className="h-6 w-6 text-purple-500" />
            </div>
            <CardTitle>Bazari CLI</CardTitle>
            <CardDescription>
              Crie localmente com seu editor favorito
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-muted-foreground space-y-1 mb-4">
              <li>• Use VS Code, Vim, etc</li>
              <li>• Hot reload local</li>
              <li>• Controle total</li>
              <li>• CI/CD friendly</li>
            </ul>
            <div className="space-y-2">
              <code className="block text-xs bg-muted p-2 rounded font-mono">
                npm i -g @bazari/cli
              </code>
              <code className="block text-xs bg-muted p-2 rounded font-mono">
                bazari create meu-app
              </code>
            </div>
          </CardContent>
        </Card>

        {/* Option 3: Import Existing */}
        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader>
            <div className="p-3 rounded-lg bg-orange-500/10 w-fit mb-2">
              <Upload className="h-6 w-6 text-orange-500" />
            </div>
            <CardTitle>Importar Projeto</CardTitle>
            <CardDescription>
              Ja tem um projeto? Registre para publicar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-muted-foreground space-y-1 mb-4">
              <li>• Projeto criado com CLI</li>
              <li>• Migracao de outro sistema</li>
              <li>• Registrar app existente</li>
            </ul>
            <Button variant="outline" asChild className="w-full">
              <Link to="/app/developer/import">
                Importar
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Start */}
      <Card className="mt-8 max-w-4xl">
        <CardHeader>
          <CardTitle className="text-lg">Nao sabe por onde comecar?</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground mb-4">
              Se e sua primeira vez, recomendamos o{' '}
              <strong>Bazari Studio</strong>. Ele tem tudo que voce precisa para
              criar, testar e publicar seu app.
            </p>
          </div>
          <Button asChild>
            <Link to="/doc/sdk/quick-start">Ver Tutorial</Link>
          </Button>
        </CardContent>
      </Card>
    </DeveloperLayout>
  );
}
