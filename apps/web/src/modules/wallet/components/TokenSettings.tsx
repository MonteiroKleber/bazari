import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useVaultAccounts } from '../hooks/useVaultAccounts';
import { addToken, removeToken, useTokens, type WalletToken } from '../store/tokens.store';
import { fetchAssetMetadata, type AssetMetadata } from '../services/assets';

export function TokenSettings() {
  const { t } = useTranslation();
  const { active } = useVaultAccounts();
  const tokens = useTokens(active?.address);

  // Estados - COPIADOS do WalletDashboard
  const [assetIdInput, setAssetIdInput] = useState('');
  const [assetPreview, setAssetPreview] = useState<AssetMetadata | null>(null);
  const [assetChecking, setAssetChecking] = useState(false);
  const [assetError, setAssetError] = useState<string | null>(null);
  const [assetSuccess, setAssetSuccess] = useState<string | null>(null);

  const activeAddress = active?.address ?? null;

  // handleCheckAsset - COPIADO INTEIRO do WalletDashboard
  const handleCheckAsset = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!activeAddress) {
      return;
    }

    const trimmedId = assetIdInput.trim();
    if (!trimmedId) {
      setAssetError(t('wallet.tokens.inputRequired', { defaultValue: 'Digite o ID do asset' }));
      return;
    }

    // Verificar se ja existe
    if (tokens.some((token) => token.assetId === trimmedId)) {
      setAssetError(t('wallet.tokens.alreadyAdded', { defaultValue: 'Token ja adicionado' }));
      return;
    }

    setAssetChecking(true);
    setAssetError(null);
    setAssetPreview(null);
    setAssetSuccess(null);

    try {
      const metadata = await fetchAssetMetadata(trimmedId);
      if (metadata) {
        setAssetPreview(metadata);
      } else {
        setAssetError(t('wallet.tokens.notFound', { defaultValue: 'Asset nao encontrado' }));
      }
    } catch (error) {
      console.error('[wallet] failed to fetch asset metadata', error);
      setAssetError(t('wallet.tokens.notFound', { defaultValue: 'Erro ao buscar asset' }));
    } finally {
      setAssetChecking(false);
    }
  };

  // handleAddToken - COPIADO INTEIRO do WalletDashboard
  const handleAddToken = async () => {
    if (!assetPreview || !activeAddress) return;

    try {
      addToken(activeAddress, {
        assetId: assetPreview.assetId,
        symbol: assetPreview.symbol,
        decimals: assetPreview.decimals,
        name: assetPreview.name || assetPreview.symbol,
        type: 'asset' as const,
        icon: assetPreview.symbol === 'ZARI' ? '🏛️' : '🪙',
      });

      setAssetSuccess(
        t('wallet.tokens.added', {
          symbol: assetPreview.symbol,
          defaultValue: `${assetPreview.symbol} adicionado!`,
        })
      );
      setAssetPreview(null);
      setAssetIdInput('');
    } catch (error) {
      console.error(error);
      setAssetError(t('wallet.tokens.addError', { defaultValue: 'Erro ao adicionar token' }));
    }
  };

  // handleRemoveToken - COPIADO INTEIRO do WalletDashboard
  const handleRemoveToken = (token: WalletToken) => {
    if (!activeAddress) return;
    if (token.assetId === 'native') return; // Nao permitir remover nativo
    removeToken(activeAddress, token.assetId);
  };

  return (
    <div className="space-y-6">
      {/* Adicionar Token */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium">
          {t('wallet.tokens.addTitle', { defaultValue: 'Adicionar Token' })}
        </h3>

        <form className="grid gap-3 sm:grid-cols-[1fr_auto]" onSubmit={handleCheckAsset}>
          <div className="space-y-2">
            <Label htmlFor="asset-id">{t('wallet.tokens.assetIdLabel')}</Label>
            <Input
              id="asset-id"
              value={assetIdInput}
              onChange={(event) => {
                setAssetIdInput(event.target.value);
                setAssetError(null);
                setAssetSuccess(null);
              }}
              placeholder={t('wallet.tokens.assetPlaceholder')}
            />
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={assetChecking} className="w-full sm:w-auto">
              {assetChecking
                ? t('wallet.tokens.checking', { defaultValue: 'Verificando...' })
                : t('wallet.tokens.check', { defaultValue: 'Verificar' })}
            </Button>
          </div>
        </form>

        {assetError && (
          <p className="text-xs text-destructive" role="alert">
            {assetError}
          </p>
        )}
        {assetSuccess && (
          <p className="text-xs text-emerald-600" role="status">
            {assetSuccess}
          </p>
        )}

        {/* Preview */}
        {assetPreview && (
          <div className="rounded-md border border-primary/30 bg-primary/5 p-4">
            <p className="text-sm font-medium text-foreground">
              {t('wallet.tokens.previewTitle', {
                symbol: assetPreview.symbol,
                defaultValue: `Token: ${assetPreview.symbol}`,
              })}
            </p>
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              <li>
                {t('wallet.tokens.previewId', {
                  id: assetPreview.assetId,
                  defaultValue: `ID: ${assetPreview.assetId}`,
                })}
              </li>
              <li>
                {t('wallet.tokens.previewDecimals', {
                  decimals: assetPreview.decimals,
                  defaultValue: `Decimais: ${assetPreview.decimals}`,
                })}
              </li>
              {assetPreview.name && (
                <li>
                  {t('wallet.tokens.previewName', {
                    name: assetPreview.name,
                    defaultValue: `Nome: ${assetPreview.name}`,
                  })}
                </li>
              )}
            </ul>
            <div className="mt-3 flex gap-2">
              <Button size="sm" onClick={() => void handleAddToken()}>
                <Plus className="mr-2 h-4 w-4" />
                {t('wallet.tokens.addConfirm', { defaultValue: 'Adicionar' })}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setAssetPreview(null);
                  setAssetSuccess(null);
                }}
              >
                {t('wallet.tokens.cancelPreview', { defaultValue: 'Cancelar' })}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Separador */}
      <hr className="border-border" />

      {/* Lista de Tokens Ativos */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">
            {t('wallet.tokens.activeLabel', { defaultValue: 'Tokens Rastreados' })}
          </h3>
          <span className="text-xs text-muted-foreground">{tokens.length || '0'}</span>
        </div>

        {tokens.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            {t('wallet.tokens.empty', { defaultValue: 'Nenhum token configurado' })}
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {tokens.map((token) => (
              <li
                key={token.assetId}
                className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-foreground">{token.name ?? token.symbol}</p>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {token.symbol}
                    </span>
                    {token.assetId === 'native' && (
                      <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs">
                        Nativo
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t('wallet.tokens.assetIdDisplay', {
                      id: token.assetId,
                      defaultValue: `Asset ID: ${token.assetId}`,
                    })}
                  </p>
                </div>
                {token.assetId !== 'native' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 px-2 text-xs text-destructive hover:text-destructive"
                    onClick={() => handleRemoveToken(token)}
                  >
                    {t('wallet.tokens.remove', { defaultValue: 'Remover' })}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
