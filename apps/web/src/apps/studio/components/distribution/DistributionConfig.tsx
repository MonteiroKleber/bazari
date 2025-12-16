/**
 * DistributionConfig - Configure how the app will be distributed
 * Supports App Store (IPFS) and External SDK (API Key) modes
 */

import React, { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Store, ExternalLink, Plus, X, AlertCircle } from 'lucide-react';

export interface DistributionConfigValue {
  appStore: boolean;
  external: boolean;
  allowedOrigins: string[];
}

interface DistributionConfigProps {
  value: DistributionConfigValue;
  onChange: (config: DistributionConfigValue) => void;
  compact?: boolean;
}

export const DistributionConfig: React.FC<DistributionConfigProps> = ({
  value,
  onChange,
  compact = false,
}) => {
  const [newOrigin, setNewOrigin] = useState('');
  const [originError, setOriginError] = useState<string | null>(null);

  const addOrigin = () => {
    setOriginError(null);

    if (!newOrigin.trim()) {
      return;
    }

    // Validate URL
    try {
      const url = new URL(newOrigin);
      // Only allow http/https
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        setOriginError('Use http:// ou https://');
        return;
      }
    } catch {
      setOriginError('URL inválida');
      return;
    }

    // Check for duplicates
    if (value.allowedOrigins.includes(newOrigin)) {
      setOriginError('Origem já adicionada');
      return;
    }

    onChange({
      ...value,
      allowedOrigins: [...value.allowedOrigins, newOrigin],
    });
    setNewOrigin('');
  };

  const removeOrigin = (origin: string) => {
    onChange({
      ...value,
      allowedOrigins: value.allowedOrigins.filter((o) => o !== origin),
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addOrigin();
    }
  };

  if (compact) {
    return (
      <div className="space-y-3">
        {/* App Store Toggle */}
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div className="flex items-center gap-2">
            <Store className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">App Store</span>
          </div>
          <Switch
            checked={value.appStore}
            onCheckedChange={(checked) =>
              onChange({ ...value, appStore: checked })
            }
          />
        </div>

        {/* External SDK Toggle */}
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div className="flex items-center gap-2">
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">SDK Externo</span>
          </div>
          <Switch
            checked={value.external}
            onCheckedChange={(checked) =>
              onChange({ ...value, external: checked })
            }
          />
        </div>

        {/* Origins (if external enabled) */}
        {value.external && (
          <div className="rounded-lg border p-3 space-y-2">
            <Label className="text-xs">Origens Permitidas</Label>
            <div className="flex gap-2">
              <Input
                placeholder="https://meusite.com"
                value={newOrigin}
                onChange={(e) => {
                  setNewOrigin(e.target.value);
                  setOriginError(null);
                }}
                onKeyDown={handleKeyDown}
                className="h-8 text-sm"
              />
              <Button size="sm" variant="outline" onClick={addOrigin}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            {originError && (
              <p className="text-xs text-destructive">{originError}</p>
            )}
            {value.allowedOrigins.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {value.allowedOrigins.map((origin) => (
                  <Badge key={origin} variant="secondary" className="text-xs">
                    {origin}
                    <button
                      className="ml-1 hover:text-destructive"
                      onClick={() => removeOrigin(origin)}
                    >
                      <X className="h-2 w-2" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Warning if none selected */}
        {!value.appStore && !value.external && (
          <div className="flex items-center gap-2 rounded-lg bg-yellow-500/10 p-2 text-xs text-yellow-600">
            <AlertCircle className="h-3 w-3" />
            Selecione pelo menos uma forma de distribuição
          </div>
        )}
      </div>
    );
  }

  // Full version with cards
  return (
    <div className="space-y-4">
      {/* App Store Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Store className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">App Store</CardTitle>
                <CardDescription>
                  Publicar no marketplace Bazari
                </CardDescription>
              </div>
            </div>
            <Switch
              checked={value.appStore}
              onCheckedChange={(checked) =>
                onChange({ ...value, appStore: checked })
              }
            />
          </div>
        </CardHeader>
        {value.appStore && (
          <CardContent className="pt-0">
            <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
              <li>Bundle hospedado no IPFS</li>
              <li>Usuários instalam pelo marketplace</li>
              <li>Revisão antes de publicar</li>
            </ul>
          </CardContent>
        )}
      </Card>

      {/* External SDK Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
                <ExternalLink className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <CardTitle className="text-base">SDK Externo</CardTitle>
                <CardDescription>
                  Integrar via API Key no seu domínio
                </CardDescription>
              </div>
            </div>
            <Switch
              checked={value.external}
              onCheckedChange={(checked) =>
                onChange({ ...value, external: checked })
              }
            />
          </div>
        </CardHeader>
        {value.external && (
          <CardContent className="space-y-4 pt-0">
            <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
              <li>Roda no seu site/app</li>
              <li>Autenticação via API Key</li>
              <li>Você gerencia a hospedagem</li>
            </ul>

            <div className="space-y-2">
              <Label>Origens Permitidas</Label>
              <p className="text-xs text-muted-foreground">
                Domínios que podem usar a API Key
              </p>

              <div className="flex gap-2">
                <Input
                  placeholder="https://meusite.com"
                  value={newOrigin}
                  onChange={(e) => {
                    setNewOrigin(e.target.value);
                    setOriginError(null);
                  }}
                  onKeyDown={handleKeyDown}
                />
                <Button size="sm" onClick={addOrigin}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {originError && (
                <p className="text-sm text-destructive">{originError}</p>
              )}

              <div className="flex flex-wrap gap-2">
                {value.allowedOrigins.map((origin) => (
                  <Badge key={origin} variant="secondary">
                    {origin}
                    <button
                      className="ml-1 hover:text-destructive"
                      onClick={() => removeOrigin(origin)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                {value.allowedOrigins.length === 0 && (
                  <span className="text-xs text-muted-foreground">
                    Nenhuma origem configurada
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Warning if none selected */}
      {!value.appStore && !value.external && (
        <div className="flex items-center gap-2 rounded-lg bg-yellow-500/10 p-3 text-sm text-yellow-600">
          <AlertCircle className="h-4 w-4" />
          Selecione pelo menos uma forma de distribuição
        </div>
      )}
    </div>
  );
};

export default DistributionConfig;
