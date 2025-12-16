/**
 * ExternalSDKDialog - Generate and manage API Keys for external SDK integration
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { localServer } from '../../services/localServer.client';
import {
  Loader2,
  Check,
  Key,
  Copy,
  RefreshCw,
  AlertTriangle,
  ExternalLink,
  Code2,
} from 'lucide-react';

interface ExternalSDKDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectPath: string;
  authToken?: string;
  manifest?: {
    name?: string;
    slug?: string;
    version?: string;
    distribution?: {
      external?: boolean;
      allowedOrigins?: string[];
    };
    permissions?: Array<{ id: string }>;
  };
}

interface ApiKeyInfo {
  apiKey: string;
  secretKey?: string;
  allowedOrigins: string[];
  createdAt?: string;
}

type DialogStep = 'loading' | 'no-config' | 'generate' | 'credentials' | 'error';

export const ExternalSDKDialog: React.FC<ExternalSDKDialogProps> = ({
  open,
  onOpenChange,
  projectPath,
  authToken,
  manifest,
}) => {
  const [step, setStep] = useState<DialogStep>('loading');
  const [apiKeyInfo, setApiKeyInfo] = useState<ApiKeyInfo | null>(null);
  const [newSecretKey, setNewSecretKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Check for existing API key on open
  useEffect(() => {
    if (open) {
      checkExistingApiKey();
    }
  }, [open]);

  const checkExistingApiKey = async () => {
    setStep('loading');
    setError(null);

    // Check if external distribution is enabled
    if (!manifest?.distribution?.external) {
      setStep('no-config');
      return;
    }

    try {
      // Try to get existing API key from local server cache or generate status
      const result = await localServer.getExternalSDKStatus(projectPath);

      if (result.success && result.apiKey) {
        setApiKeyInfo({
          apiKey: result.apiKey,
          allowedOrigins: result.allowedOrigins || manifest?.distribution?.allowedOrigins || [],
          createdAt: result.createdAt,
        });
        setStep('credentials');
      } else {
        setStep('generate');
      }
    } catch (err) {
      // No existing API key, show generate option
      setStep('generate');
    }
  };

  const handleGenerateApiKey = async () => {
    if (!authToken) {
      setError('Authentication required. Please login first.');
      setStep('error');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await localServer.generateExternalSDKKey(projectPath, authToken, {
        name: manifest?.name || 'App',
        slug: manifest?.slug || 'app',
        allowedOrigins: manifest?.distribution?.allowedOrigins || [],
        permissions: manifest?.permissions?.map((p) => p.id) || [],
      });

      if (!result.success || !result.apiKey) {
        throw new Error(result.error || 'Failed to generate API key');
      }

      setApiKeyInfo({
        apiKey: result.apiKey,
        allowedOrigins: result.allowedOrigins || [],
        createdAt: new Date().toISOString(),
      });
      setNewSecretKey(result.secretKey ?? null);
      setStep('credentials');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  const handleRotateSecret = async () => {
    if (!authToken || !apiKeyInfo?.apiKey) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await localServer.rotateExternalSDKSecret(projectPath, authToken, apiKeyInfo.apiKey);

      if (!result.success || !result.secretKey) {
        throw new Error(result.error || 'Failed to rotate secret');
      }

      setNewSecretKey(result.secretKey);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleClose = () => {
    setStep('loading');
    setApiKeyInfo(null);
    setNewSecretKey(null);
    setError(null);
    setLoading(false);
    onOpenChange(false);
  };

  const renderLoadingStep = () => (
    <div className="flex flex-col items-center justify-center py-8">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <h3 className="mt-4 text-lg font-medium">Checking SDK Status...</h3>
    </div>
  );

  const renderNoConfigStep = () => (
    <div className="flex flex-col items-center justify-center py-8">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-yellow-500/10">
        <AlertTriangle className="h-8 w-8 text-yellow-500" />
      </div>
      <h3 className="mt-4 text-lg font-medium">SDK Externo não configurado</h3>
      <p className="mt-2 text-center text-sm text-muted-foreground">
        Habilite a distribuição "SDK Externo" nas configurações do projeto para gerar API Keys.
      </p>
    </div>
  );

  const renderGenerateStep = () => (
    <div className="space-y-4 py-4">
      <div className="flex flex-col items-center text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Key className="h-8 w-8 text-primary" />
        </div>
        <h3 className="mt-4 text-lg font-medium">Gerar API Key</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Crie credenciais para integrar o SDK Bazari no seu site.
        </p>
      </div>

      {/* Summary */}
      <div className="rounded-lg bg-muted/50 p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">App</span>
          <span className="font-medium">{manifest?.name || 'App'}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Versão</span>
          <span>{manifest?.version || '0.1.0'}</span>
        </div>
        {(manifest?.distribution?.allowedOrigins?.length ?? 0) > 0 && (
          <div className="pt-2">
            <span className="text-sm text-muted-foreground">Origens permitidas:</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {manifest?.distribution?.allowedOrigins?.map((origin) => (
                <Badge key={origin} variant="secondary" className="text-xs">
                  {origin}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {!authToken && (
        <div className="rounded-lg bg-yellow-500/10 p-3">
          <h4 className="flex items-center gap-2 font-medium text-yellow-600">
            <AlertTriangle className="h-4 w-4" />
            Autenticação Necessária
          </h4>
          <p className="mt-1 text-sm text-muted-foreground">
            Faça login para gerar API Keys.
          </p>
        </div>
      )}
    </div>
  );

  const renderCredentialsStep = () => (
    <div className="space-y-4 py-4">
      {/* API Key */}
      <div className="space-y-2">
        <Label>API Key</Label>
        <div className="flex gap-2">
          <Input
            value={apiKeyInfo?.apiKey || ''}
            readOnly
            className="font-mono text-sm"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={() => handleCopy(apiKeyInfo?.apiKey || '', 'apiKey')}
          >
            {copiedField === 'apiKey' ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Use no cliente (pode ser exposta)
        </p>
      </div>

      {/* Secret Key (only shown once after generation/rotation) */}
      {newSecretKey && (
        <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-4 space-y-2">
          <div className="flex items-center gap-2 text-yellow-700">
            <AlertTriangle className="h-4 w-4" />
            <span className="font-medium">Salve a Secret Key!</span>
          </div>
          <p className="text-sm text-yellow-600">
            Esta chave não será mostrada novamente.
          </p>
          <div className="flex gap-2">
            <Input
              value={newSecretKey}
              readOnly
              className="font-mono text-sm"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleCopy(newSecretKey, 'secretKey')}
            >
              {copiedField === 'secretKey' ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-yellow-600">
            Use no servidor (nunca exponha no cliente)
          </p>
        </div>
      )}

      {/* Allowed Origins */}
      {(apiKeyInfo?.allowedOrigins?.length ?? 0) > 0 && (
        <div className="space-y-2">
          <Label>Origens Permitidas</Label>
          <div className="flex flex-wrap gap-2">
            {apiKeyInfo?.allowedOrigins?.map((origin) => (
              <Badge key={origin} variant="secondary">
                {origin}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Code Example */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Code2 className="h-4 w-4" />
          Código de Integração
        </Label>
        <pre className="rounded-lg bg-muted p-4 text-xs overflow-x-auto">
{`import { BazariSDK } from '@bazari/app-sdk';

const sdk = new BazariSDK({
  apiKey: '${apiKeyInfo?.apiKey || 'YOUR_API_KEY'}',
  secretKey: process.env.BAZARI_SECRET_KEY
});

// Autenticar usuário
const user = await sdk.auth.getCurrentUser();

// Ler saldo
const balance = await sdk.wallet.getBalance();`}
        </pre>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleRotateSecret}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Rotacionar Secret
        </Button>
        <a
          href="https://bazari.libervia.xyz/doc/sdk"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-sm text-primary hover:underline"
        >
          Documentação
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
    </div>
  );

  const renderErrorStep = () => (
    <div className="flex flex-col items-center justify-center py-8">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
        <AlertTriangle className="h-8 w-8 text-red-500" />
      </div>
      <h3 className="mt-4 text-lg font-medium">Erro</h3>
      <p className="mt-2 text-center text-sm text-muted-foreground">{error}</p>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            SDK Externo
          </DialogTitle>
          <DialogDescription>
            {step === 'loading' && 'Verificando status...'}
            {step === 'no-config' && 'Configuração necessária'}
            {step === 'generate' && 'Gerar credenciais para integração'}
            {step === 'credentials' && 'Suas credenciais de API'}
            {step === 'error' && 'Ocorreu um erro'}
          </DialogDescription>
        </DialogHeader>

        <div>
          {step === 'loading' && renderLoadingStep()}
          {step === 'no-config' && renderNoConfigStep()}
          {step === 'generate' && renderGenerateStep()}
          {step === 'credentials' && renderCredentialsStep()}
          {step === 'error' && renderErrorStep()}
        </div>

        <DialogFooter>
          {step === 'no-config' && (
            <Button onClick={handleClose}>Fechar</Button>
          )}

          {step === 'generate' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button
                onClick={handleGenerateApiKey}
                disabled={!authToken || loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Key className="mr-2 h-4 w-4" />
                Gerar API Key
              </Button>
            </>
          )}

          {step === 'credentials' && (
            <Button onClick={handleClose}>Concluído</Button>
          )}

          {step === 'error' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Fechar
              </Button>
              <Button onClick={() => setStep('generate')}>Tentar Novamente</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExternalSDKDialog;
