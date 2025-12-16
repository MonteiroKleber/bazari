import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileJson, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { DeveloperLayout } from '@/layouts/DeveloperLayout';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface ManifestData {
  appId?: string;
  name?: string;
  slug?: string;
  version?: string;
  description?: string;
  category?: string;
  permissions?: Array<{ id: string; reason: string }>;
  distribution?: {
    appStore?: boolean;
    external?: boolean;
    allowedOrigins?: string[];
  };
}

export default function ImportAppPage() {
  const navigate = useNavigate();
  const [manifest, setManifest] = useState<ManifestData | null>(null);
  const [bundleUrl, setBundleUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as ManifestData;

      // Basic validation
      if (!parsed.name || !parsed.slug || !parsed.appId) {
        toast.error('Manifesto invalido', {
          description: 'O arquivo deve conter name, slug e appId',
        });
        return;
      }

      setManifest(parsed);
      toast.success('Manifesto carregado!');
    } catch {
      toast.error('Arquivo invalido', {
        description: 'Use o arquivo bazari.manifest.json',
      });
    }
  };

  const handleImport = async () => {
    if (!manifest) return;

    setIsImporting(true);
    try {
      const response = await api.post<{ app: { id: string } }>(
        '/developer/apps/import',
        {
          manifest,
          bundleUrl: bundleUrl || undefined,
        }
      );

      toast.success('App importado com sucesso!');
      navigate(`/app/developer/apps/${response.app.id}`);
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error('Erro ao importar', {
        description: err.message || 'Tente novamente',
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <DeveloperLayout
      title="Importar App"
      description="Registre um app existente no Developer Portal"
    >
      <div className="max-w-2xl space-y-6">
        {/* Step 1: Upload manifest */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileJson className="h-5 w-5" />
              1. Upload do Manifesto
            </CardTitle>
            <CardDescription>
              Faca upload do arquivo bazari.manifest.json do seu projeto
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
                id="manifest-upload"
              />
              <Label
                htmlFor="manifest-upload"
                className="cursor-pointer flex flex-col items-center"
              >
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">
                  Clique para selecionar bazari.manifest.json
                </span>
              </Label>
            </div>

            {manifest && (
              <div className="mt-4 p-4 bg-green-500/10 rounded-lg">
                <div className="flex items-center gap-2 text-green-600 mb-2">
                  <Check className="h-4 w-4" />
                  <span className="font-medium">Manifesto carregado</span>
                </div>
                <div className="text-sm space-y-1">
                  <p>
                    <strong>Nome:</strong> {manifest.name}
                  </p>
                  <p>
                    <strong>Slug:</strong> {manifest.slug}
                  </p>
                  <p>
                    <strong>Versao:</strong> {manifest.version || '0.1.0'}
                  </p>
                  {manifest.category && (
                    <p>
                      <strong>Categoria:</strong> {manifest.category}
                    </p>
                  )}
                  {manifest.distribution && (
                    <p>
                      <strong>Distribuicao:</strong>{' '}
                      {manifest.distribution.appStore && 'App Store'}
                      {manifest.distribution.appStore &&
                        manifest.distribution.external &&
                        ' + '}
                      {manifest.distribution.external && 'SDK Externo'}
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 2: Bundle URL (optional) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              2. Bundle URL (Opcional)
            </CardTitle>
            <CardDescription>
              Se ja fez upload do bundle para IPFS, cole a URL aqui
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="https://bazari.libervia.xyz/ipfs/Qm..."
              value={bundleUrl}
              onChange={(e) => setBundleUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-2">
              Deixe em branco se ainda vai publicar pelo CLI ou Studio
            </p>
          </CardContent>
        </Card>

        {/* Import Button */}
        <Button
          onClick={handleImport}
          disabled={!manifest || isImporting}
          className="w-full"
          size="lg"
        >
          {isImporting ? 'Importando...' : 'Importar App'}
        </Button>

        {/* Warning */}
        <div className="flex items-start gap-3 p-4 bg-yellow-500/10 rounded-lg text-sm">
          <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-yellow-700 dark:text-yellow-300">
              Importante
            </p>
            <p className="text-muted-foreground">
              A importacao apenas registra o app no portal. Para publicar na App
              Store, voce precisara fazer upload do bundle via CLI ou Studio.
            </p>
          </div>
        </div>
      </div>
    </DeveloperLayout>
  );
}
