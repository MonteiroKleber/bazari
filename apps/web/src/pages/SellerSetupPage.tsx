import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { sellerApi, type SellerProfileDto } from '@/modules/seller/api';
import type { StoreTheme } from '@/modules/store/StoreLayout';
import {
  buildStoreMetadata,
  fetchOnChainStore,
  getCreationDeposit,
  getPendingTransfer,
  resolveIpfsUrl,
  uploadMetadataToIpfs,
  type NormalizedOnChainStore,
} from '@/modules/store/onchain';
import {
  getActiveAccount,
  decryptMnemonic,
  subscribeVault,
  type VaultAccountRecord,
} from '@/modules/auth';
import { PinService } from '@/modules/wallet/pin/PinService';
import { getApi, getChainProps, type ChainProps } from '@/modules/wallet/services/polkadot';
import { formatBalance, shortenAddress } from '@/modules/wallet/utils/format';
import { ApiError } from '@/lib/api';
import { mapChainError } from '@/lib/chainErrors';
import { toast } from 'sonner';
import { Keyring } from '@polkadot/keyring';
import type { KeyringPair } from '@polkadot/keyring/types';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import type { SubmittableExtrinsic } from '@polkadot/api/types';
import type { ApiPromise } from '@polkadot/api';
import { AlertCircle, Loader2, ShieldCheck, Users, Wallet, ArrowRight, Copy, Info, Trash2, Layers, ExternalLink, RefreshCw } from 'lucide-react';
import { Breadcrumbs } from '@/components/Breadcrumbs';

const DEFAULT_THEME: StoreTheme = {
  bg: '#0f172a',
  ink: '#ffffff',
  brand: '#2563eb',
  accent: '#f97316',
};

const THEME_PRESETS: Array<{ id: string; label: string; theme: StoreTheme }> = [
  {
    id: 'midnight',
    label: 'Midnight',
    theme: { bg: '#0f172a', ink: '#eef2ff', brand: '#7c3aed', accent: '#38bdf8' },
  },
  {
    id: 'sunrise',
    label: 'Sunrise',
    theme: { bg: '#fef2f2', ink: '#1f2937', brand: '#f97316', accent: '#14b8a6' },
  },
  {
    id: 'forest',
    label: 'Forest',
    theme: { bg: '#0d1b16', ink: '#ecfdf5', brand: '#10b981', accent: '#fcd34d' },
  },
];


function SyncBadge({ status }: { status: string | null }) {
  if (!status) return <Badge variant="outline">N/A</Badge>;

  const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    pending: { label: 'Pendente', variant: 'outline' },
    syncing: { label: 'Sincronizando', variant: 'secondary' },
    synced: { label: 'Sincronizado', variant: 'default' },
    SYNCED: { label: 'Sincronizado', variant: 'default' },
    error: { label: 'Erro', variant: 'destructive' },
    diverged: { label: 'Divergente', variant: 'destructive' },
    DIVERGED: { label: 'Divergente', variant: 'destructive' },
  };

  const config = statusMap[status] || { label: status, variant: 'outline' as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

type SignerContext = {
  api: ApiPromise;
  pair: KeyringPair;
  account: VaultAccountRecord;
  chain: ChainProps;
};

function decodeDispatchError(api: ApiPromise, dispatchError: any): string {
  if (dispatchError.isModule) {
    const meta = api.registry.findMetaError(dispatchError.asModule);
    return `${meta.section}.${meta.name}`;
  }
  return dispatchError.toString();
}

async function signAndSend(
  api: ApiPromise,
  tx: SubmittableExtrinsic<'promise'>,
  pair: KeyringPair,
): Promise<any> {
  return new Promise((resolve, reject) => {
    let unsub: (() => void) | undefined;
    tx.signAndSend(pair, (result) => {
      if (result.dispatchError) {
        const message = decodeDispatchError(api, result.dispatchError);
        if (unsub) unsub();
        reject(new Error(message));
        return;
      }
      if (result.status?.isFinalized) {
        if (unsub) unsub();
        resolve(result);
      }
    })
      .then((unsubscribe) => {
        unsub = unsubscribe;
      })
      .catch((error) => {
        if (unsub) unsub();
        reject(error);
      });
  });
}

function uniqueOperators(list: string[] | null | undefined): string[] {
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  const output: string[] = [];
  for (const item of list) {
    const value = String(item);
    if (!seen.has(value)) {
      seen.add(value);
      output.push(value);
    }
  }
  return output;
}

export default function SellerSetupPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const onChainEnabled = true; // On-chain is now always enabled

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [shopName, setShopName] = useState('');
  const [shopSlug, setShopSlug] = useState('');
  const [initialSlug, setInitialSlug] = useState<string | null>(null);
  const [about, setAbout] = useState('');
  const [themeEnabled, setThemeEnabled] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [theme, setTheme] = useState<StoreTheme>(DEFAULT_THEME);
  const [storeIdentifier, setStoreIdentifier] = useState<string | null>(null);

  const [activeAccount, setActiveAccount] = useState<VaultAccountRecord | null>(null);
  const [chainProps, setChainProps] = useState<ChainProps | null>(null);
  const [creationDeposit, setCreationDeposit] = useState<bigint>(0n);

  const [onChainStoreId, setOnChainStoreId] = useState<string | null>(null);
  const [onChainStore, setOnChainStore] = useState<NormalizedOnChainStore | null>(null);
  const [pendingTransfer, setPendingTransfer] = useState<string | null>(null);
  const [onChainStatusLoading, setOnChainStatusLoading] = useState(false);

  const [operatorInput, setOperatorInput] = useState('');
  const [operatorSubmitting, setOperatorSubmitting] = useState(false);
  const [transferInput, setTransferInput] = useState('');
  const [transferSubmitting, setTransferSubmitting] = useState(false);
  const [acceptingTransfer, setAcceptingTransfer] = useState(false);
  const [syncingCatalog, setSyncingCatalog] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [verifyingStore, setVerifyingStore] = useState(false);
  const [metadataCid, setMetadataCid] = useState<string | null>(null);
  const [categoriesCid, setCategoriesCid] = useState<string | null>(null);
  const [productsCid, setProductsCid] = useState<string | null>(null);
  const [lastSyncBlock, setLastSyncBlock] = useState<string | number | null>(null);

  const themeLabels = useMemo(
    () => ({
      bg: t('seller.setup.theme.background', { defaultValue: 'Fundo' }),
      ink: t('seller.setup.theme.foreground', { defaultValue: 'Texto' }),
      brand: t('seller.setup.theme.brand', { defaultValue: 'Primária' }),
      accent: t('seller.setup.theme.accent', { defaultValue: 'Acento' }),
    }),
    [t],
  );

  const refreshOnChainData = useCallback(
    async (storeId: string) => {
      setOnChainStatusLoading(true);
      try {
        const [store, pending] = await Promise.all([
          fetchOnChainStore(storeId),
          getPendingTransfer(storeId),
        ]);
        setOnChainStore(store);
        setPendingTransfer(pending);
        return store;
      } catch (err) {
        console.error('[seller-setup] Failed to fetch on-chain store:', err);
        setOnChainStore(null);
        setPendingTransfer(null);
        return null;
      } finally {
        setOnChainStatusLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    const selectedStoreParam = searchParams.get('store') ?? searchParams.get('id');

    (async () => {
      try {
        setLoading(true);
        let sellerProfile: SellerProfileDto | null = null;

        if (selectedStoreParam) {
          try {
            const res = await sellerApi.getMyStore(selectedStoreParam);
            sellerProfile = res.sellerProfile;
          } catch (err: any) {
            if (!cancelled) {
              setError(err?.message || t('errors.generic'));
            }
          }
        }

        if (cancelled) return;

        if (sellerProfile) {
          hydrateFromProfile(sellerProfile);
        } else {
          setShopName('');
          setShopSlug('');
          setAbout('');
          setInitialSlug(null);
          setStoreIdentifier(null);
          setOnChainStoreId(null);
          setOnChainStore(null);
          setTheme(DEFAULT_THEME);
          setThemeEnabled(false);
          setSelectedPreset(null);
        }
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : t('errors.generic');
        setError(message);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    function hydrateFromProfile(profile: SellerProfileDto) {
      setShopName(profile.shopName ?? '');
      setShopSlug(profile.shopSlug ?? '');
      setInitialSlug(profile.shopSlug ?? null);
      setStoreIdentifier(profile.id ?? profile.shopSlug ?? null);
      setAbout(profile.about ?? '');

      const policies = profile.policies ?? {};
      const storedTheme = policies?.storeTheme;
      if (storedTheme && typeof storedTheme === 'object') {
        setTheme({
          bg: storedTheme.bg ?? DEFAULT_THEME.bg,
          ink: storedTheme.ink ?? DEFAULT_THEME.ink,
          brand: storedTheme.brand ?? DEFAULT_THEME.brand,
          accent: storedTheme.accent ?? DEFAULT_THEME.accent,
        });
        setThemeEnabled(true);
      }

      if (onChainEnabled) {
        const storedId = profile.onChainStoreId != null ? String(profile.onChainStoreId) : null;
        setOnChainStoreId(storedId);
        setSyncStatus(profile.syncStatus ?? null);
        setMetadataCid(profile.metadataCid ?? null);
        setCategoriesCid(profile.categoriesCid ?? null);
        setProductsCid(profile.productsCid ?? null);
        setLastSyncBlock(profile.lastSyncBlock ?? null);
        if (storedId) {
          void refreshOnChainData(storedId);
        } else {
          setOnChainStore(null);
        }
      }
    }

    return () => {
      cancelled = true;
    };
  }, [onChainEnabled, refreshOnChainData, searchParams, t]);

  useEffect(() => {
    if (!onChainEnabled) return;
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    (async () => {
      try {
        const [account, props, deposit] = await Promise.all([
          getActiveAccount(),
          getChainProps(),
          getCreationDeposit(),
        ]);
        if (cancelled) return;
        setActiveAccount(account);
        setChainProps(props);
        setCreationDeposit(deposit);
      } catch (err) {
        console.error('[seller-setup] Failed to preload chain data:', err);
      }
      unsubscribe = subscribeVault(async () => {
        const next = await getActiveAccount();
        if (!cancelled) {
          setActiveAccount(next);
        }
      });
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [onChainEnabled]);


  const withSigner = useCallback(
    async <T,>(fn: (ctx: SignerContext) => Promise<T>) => {
      const account = await getActiveAccount();
      if (!account) {
        throw new Error(
          t('seller.onchain.walletMissing', {
            defaultValue: 'Configure a carteira na aplicação para assinar extrínsecos.',
          }),
        );
      }

      const chain = await getChainProps();
      const api = await getApi();
      await cryptoWaitReady();

      const pin = await PinService.getPin({
        title: t('seller.onchain.pinTitle', { defaultValue: 'Confirmar assinatura' }),
        description: t('seller.onchain.pinDescription', {
          defaultValue: 'Informe o PIN para assinar a transação on-chain.',
        }),
        validate: async (candidate) => {
          try {
            await decryptMnemonic(account.cipher, account.iv, account.salt, candidate, account.authTag, account.iterations);
            return null;
          } catch {
            return t('wallet.send.errors.pinInvalid') as string;
          }
        },
      });

      let mnemonic = await decryptMnemonic(
        account.cipher,
        account.iv,
        account.salt,
        pin,
        account.authTag,
        account.iterations,
      );
      const keyring = new Keyring({ type: 'sr25519', ss58Format: chain.ss58Prefix });
      const pair = keyring.addFromMnemonic(mnemonic);
      mnemonic = '';

      try {
        const result = await fn({ api, pair, account, chain });
        return { result, account, chain };
      } finally {
        try {
          pair.lock?.();
        } catch {
          // ignore lock errors
        }
      }
    },
    [t],
  );

  // NOTE: submitStoreMetadata is no longer used - publication is now handled by backend
  // Kept for reference in case direct blockchain interaction is needed in the future
  /*
  const submitStoreMetadata = useCallback(
    async (cid: string): Promise<string> => {
      const callback = async ({ api, pair }: SignerContext) => {
        if (!onChainStoreId) {
          const tx = api.tx.stores.createStore(Array.from(textEncoder.encode(cid)));
          const result = await signAndSend(api, tx, pair);
          const createdEvent = result.events.find(
            (record: any) => record.event.section === 'stores' && record.event.method === 'StoreCreated',
          );
          if (!createdEvent) {
            throw new Error(
              t('seller.onchain.missingEvent', {
                defaultValue: 'Evento StoreCreated não encontrado na confirmação.',
              }),
            );
          }
          const storeId = createdEvent.event.data[1]?.toString?.();
          if (!storeId) {
            throw new Error(
              t('seller.onchain.missingStoreId', {
                defaultValue: 'StoreId não retornado na criação.',
              }),
            );
          }
          return storeId;
        }
        const tx = api.tx.stores.updateMetadata(onChainStoreId, Array.from(textEncoder.encode(cid)));
        await signAndSend(api, tx, pair);
        return onChainStoreId;
      };

      const { result } = await withSigner(callback);
      return result;
    },
    [onChainStoreId, t, withSigner],
  );
  */

  const submitOffChainOnly = useCallback(
    async (payload: Record<string, unknown>) => {
      try {
        setSaving(true);
        setError(null);
        await persistSellerProfile(payload);
        toast.success(t('seller.setup.saved', { defaultValue: 'Configurações salvas.' }));
        navigate(`/seller/${encodeURIComponent(String(payload.shopSlug))}`);
      } catch (err) {
        handleOperationError(err);
      } finally {
        setSaving(false);
      }
    },
    [navigate, t],
  );

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      const trimmedName = shopName.trim();
      const trimmedSlug = shopSlug.trim();
      const trimmedAbout = about.trim();

      if (!trimmedName || !trimmedSlug) {
        setError(t('seller.form.required'));
        return;
      }

      const policies: Record<string, unknown> = {};
      if (themeEnabled) {
        policies.theme = theme;
      }

      const payload = {
        shopName: trimmedName,
        shopSlug: trimmedSlug,
        about: trimmedAbout || undefined,
        ...(Object.keys(policies).length > 0 ? { policies } : {}),
      } as Record<string, unknown>;

      if (!onChainEnabled) {
        await submitOffChainOnly(payload);
        return;
      }

      try {
        setSaving(true);
        setError(null);

        // 1. Salvar rascunho primeiro (ou atualizar se já existe)
        const identifier = await persistSellerProfile(payload);

        if (!identifier) {
          throw new Error('Store identifier not available after persisting profile');
        }

        // 2. Solicitar PIN para assinar transação
        const pin = await PinService.getPin({
          title: t('seller.onchain.pinTitle', { defaultValue: 'Assinar Publicação' }),
          description: t('seller.onchain.pinDescription', {
            defaultValue: 'Digite seu PIN para assinar a transação de publicação da loja.',
          }),
          validate: async (candidate) => {
            try {
              await decryptMnemonic(
                activeAccount!.cipher,
                activeAccount!.iv,
                activeAccount!.salt,
                candidate,
                activeAccount!.authTag,
                activeAccount!.iterations
              );
              return null;
            } catch {
              return t('wallet.send.errors.pinInvalid', { defaultValue: 'PIN inválido' }) as string;
            }
          },
        });

        const mnemonic = await decryptMnemonic(
          activeAccount!.cipher,
          activeAccount!.iv,
          activeAccount!.salt,
          pin,
          activeAccount!.authTag,
          activeAccount!.iterations
        );

        // 3. Chamar endpoint de publicação
        toast.info(
          t('seller.onchain.publishing', { defaultValue: 'Publicando loja on-chain...' })
        );

        const response = await sellerApi.publishStore(identifier, {
          signerMnemonic: mnemonic,
        });

        toast.success(
          t('seller.onchain.publishSuccess', {
            defaultValue: 'Loja publicada on-chain com sucesso! Versão: {{version}}',
            version: response.version,
          })
        );

        // 4. Atualizar dados on-chain localmente
        if (onChainStoreId) {
          await refreshOnChainData(onChainStoreId);
        }

        // 5. Atualizar CIDs do banco de dados
        if (response.cids) {
          setMetadataCid(response.cids.store || null);
          setCategoriesCid(response.cids.categories || null);
          setProductsCid(response.cids.products || null);
        }

        // 6. Redirecionar para página pública
        navigate(`/loja/${trimmedSlug}`);
      } catch (err) {
        handleOperationError(err);
      } finally {
        setSaving(false);
      }
    },
    [
      about,
      activeAccount,
      navigate,
      onChainEnabled,
      onChainStoreId,
      refreshOnChainData,
      shopName,
      shopSlug,
      storeIdentifier,
      submitOffChainOnly,
      theme,
      themeEnabled,
      t,
    ],
  );

  const persistSellerProfile = useCallback(
    async (payload: Record<string, unknown>): Promise<string> => {
      try {
        if (!initialSlug) {
          const response = await sellerApi.createStore(payload as any);
          const profile = response.sellerProfile;
          const identifier = profile.id ?? profile.shopSlug ?? '';
          setInitialSlug(profile.shopSlug);
          setStoreIdentifier(identifier);
          return identifier;
        } else {
          const identifier = storeIdentifier ?? initialSlug;
          const response = await sellerApi.updateMyStore(identifier, payload as any);
          const profile = response.sellerProfile;
          const newIdentifier = profile.id ?? profile.shopSlug ?? identifier;
          setInitialSlug(profile.shopSlug ?? initialSlug);
          setStoreIdentifier(newIdentifier);
          return newIdentifier;
        }
      } catch (err) {
        throw err;
      }
    },
    [initialSlug, storeIdentifier],
  );

  const handleOperationError = useCallback(
    (err: unknown) => {
      let message = t('errors.generic');

      if (err instanceof ApiError) {
        message = err.message;
      } else if (err instanceof Error) {
        // Detectar erro on-chain (formato: "pallet.Error")
        if (err.message.includes('.')) {
          message = mapChainError(err.message);
        } else {
          message = err.message;
        }
      }

      if (message === 'cancelled') {
        return;
      }

      setError(message);
      toast.error(message);
    },
    [t],
  );

  const handleAddOperator = useCallback(async () => {
    if (!onChainEnabled || !onChainStoreId) return;
    const address = operatorInput.trim();
    if (!address) return;
    try {
      setOperatorSubmitting(true);
      await withSigner(async ({ api, pair }) => {
        const tx = api.tx.stores.addOperator(onChainStoreId, address);
        await signAndSend(api, tx, pair);
      });
      const data = await refreshOnChainData(onChainStoreId);
      const operatorAddresses = uniqueOperators(data?.payload.operators);
      await persistSellerProfile({ operatorAddresses });
      toast.success(
        t('seller.onchain.operatorAdded', { defaultValue: 'Operador adicionado com sucesso.' }),
      );
      setOperatorInput('');
    } catch (err) {
      handleOperationError(err);
    } finally {
      setOperatorSubmitting(false);
    }
  }, [
    handleOperationError,
    onChainEnabled,
    onChainStoreId,
    operatorInput,
    persistSellerProfile,
    refreshOnChainData,
    t,
    withSigner,
  ]);

  const handleRemoveOperator = useCallback(
    async (address: string) => {
      if (!onChainEnabled || !onChainStoreId) return;
      try {
        setOperatorSubmitting(true);
        await withSigner(async ({ api, pair }) => {
          const tx = api.tx.stores.removeOperator(onChainStoreId, address);
          await signAndSend(api, tx, pair);
        });
        const data = await refreshOnChainData(onChainStoreId);
        const operatorAddresses = uniqueOperators(data?.payload.operators);
        await persistSellerProfile({ operatorAddresses });
        toast.success(
          t('seller.onchain.operatorRemoved', { defaultValue: 'Operador removido.' }),
        );
      } catch (err) {
        handleOperationError(err);
      } finally {
        setOperatorSubmitting(false);
      }
    },
    [handleOperationError, onChainEnabled, onChainStoreId, persistSellerProfile, refreshOnChainData, t, withSigner],
  );

  const handleBeginTransfer = useCallback(async () => {
    if (!onChainEnabled || !onChainStoreId) return;
    const target = transferInput.trim();
    if (!target) return;
    try {
      setTransferSubmitting(true);
      await withSigner(async ({ api, pair }) => {
        const tx = api.tx.stores.beginTransfer(onChainStoreId, target);
        await signAndSend(api, tx, pair);
      });
      await refreshOnChainData(onChainStoreId);
      toast.success(
        t('seller.onchain.transferBegun', {
          defaultValue: 'Transferência iniciada. O novo owner deve aceitar para concluir.',
        }),
      );
      setTransferInput('');
    } catch (err) {
      handleOperationError(err);
    } finally {
      setTransferSubmitting(false);
    }
  }, [handleOperationError, onChainEnabled, onChainStoreId, refreshOnChainData, t, transferInput, withSigner]);

  const handleAcceptTransfer = useCallback(async () => {
    if (!onChainEnabled || !onChainStoreId) return;
    try {
      setAcceptingTransfer(true);
      const { account } = await withSigner(async ({ api, pair }) => {
        const tx = api.tx.stores.acceptTransfer(onChainStoreId);
        await signAndSend(api, tx, pair);
      });
      const data = await refreshOnChainData(onChainStoreId);
      const operatorAddresses = uniqueOperators(data?.payload.operators);
      await persistSellerProfile({ ownerAddress: account.address, operatorAddresses });
      toast.success(
        t('seller.onchain.transferCompleted', { defaultValue: 'Transferência concluída com sucesso.' }),
      );
    } catch (err) {
      handleOperationError(err);
    } finally {
      setAcceptingTransfer(false);
    }
  }, [handleOperationError, onChainEnabled, onChainStoreId, persistSellerProfile, refreshOnChainData, t, withSigner]);

  const handleSyncCatalog = useCallback(async () => {
    if (!onChainEnabled || !onChainStoreId || !storeIdentifier) return;

    try {
      setSyncingCatalog(true);
      setError(null);

      // 1. Chamar API para gerar catálogo
      const response = await sellerApi.syncCatalog(storeIdentifier);
      const catalog = response.catalog;

      console.log('[sync-catalog] Catálogo recebido:', catalog);

      if (catalog.itemCount === 0) {
        toast.info(
          t('store.onchain.catalogEmpty', {
            defaultValue: 'Não há produtos ou serviços para sincronizar.',
          }),
        );
        return;
      }

      toast.info(
        t('store.onchain.catalogCount', {
          defaultValue: '{{count}} item no catálogo',
          defaultValue_other: '{{count}} itens no catálogo',
          count: catalog.itemCount,
        }),
      );

      // 2. Enviar catálogo para IPFS
      console.log('[sync-catalog] Enviando catálogo para IPFS...');
      const catalogCid = await uploadMetadataToIpfs(catalog);
      console.log('[sync-catalog] Catálogo enviado ao IPFS:', catalogCid);
      toast.success(
        t('store.onchain.catalogUploaded', {
          defaultValue: 'Catálogo enviado ao IPFS: {{cid}}',
          cid: catalogCid,
        }),
      );

      // 3. Atualizar metadata on-chain incluindo catalogCid
      console.log('[sync-catalog] Construindo metadata atualizado...');
      const updatedMetadata = buildStoreMetadata({
        name: shopName,
        description: about || undefined,
        categories: [], // Categories agora são derivadas automaticamente dos produtos
        theme: themeEnabled ? theme : undefined,
      });

      // Adicionar catalogCid ao metadata
      const metadataWithCatalog = {
        ...updatedMetadata,
        catalog: catalogCid,
      };

      console.log('[sync-catalog] Enviando metadata atualizado para IPFS...');
      const metadataCid = await uploadMetadataToIpfs(metadataWithCatalog);
      console.log('[sync-catalog] Metadata enviado ao IPFS:', metadataCid);

      console.log('[sync-catalog] Solicitando assinatura do usuário...');
      await withSigner(async ({ api, pair }) => {
        const tx = api.tx.stores.updateMetadata(onChainStoreId, Array.from(new TextEncoder().encode(metadataCid)));
        await signAndSend(api, tx, pair);
      });
      console.log('[sync-catalog] Transação assinada e enviada!');

      console.log('[sync-catalog] Atualizando dados on-chain...');
      await refreshOnChainData(onChainStoreId);
      console.log('[sync-catalog] Dados atualizados!');

      // Atualizar CIDs localmente na interface
      console.log('[sync-catalog] Atualizando CIDs locais...');
      setMetadataCid(metadataCid);
      setProductsCid(catalogCid);
      console.log('[sync-catalog] CIDs locais atualizados!');

      console.log('[sync-catalog] Mostrando mensagem de sucesso...');
      const message = t('store.onchain.catalogSynced', {
        defaultValue: 'Catálogo sincronizado com sucesso!',
      });
      console.log('[sync-catalog] Mensagem:', message);
      toast.success(message);
      console.log('[sync-catalog] toast.success() chamado!');
    } catch (err) {
      console.error('[sync-catalog] Erro capturado:', err);
      handleOperationError(err);
    } finally {
      setSyncingCatalog(false);
    }
  }, [
    about,
    handleOperationError,
    onChainEnabled,
    onChainStoreId,
    refreshOnChainData,
    shopName,
    storeIdentifier,
    t,
    theme,
    themeEnabled,
    withSigner,
  ]);

  const ownerAddress = onChainStore?.payload.owner ?? null;
  const operators = onChainStore?.payload.operators ?? [];
  const onChainMetadataCid = onChainStore?.payload.cid ?? null;
  const metadataSource = onChainStore?.payload.source ?? null;
  const metadataPreview = useMemo(() => {
    if (!onChainStore?.metadata.coverUrl) return null;
    return resolveIpfsUrl(onChainStore.metadata.coverUrl) ?? onChainStore.metadata.coverUrl;
  }, [onChainStore?.metadata.coverUrl]);

  const canAcceptTransfer = Boolean(
    pendingTransfer && activeAccount?.address && pendingTransfer === activeAccount.address,
  );

  const handleVerifyStore = useCallback(async () => {
    if (!storeIdentifier) return;

    try {
      setVerifyingStore(true);
      const response = await sellerApi.verifyStore(storeIdentifier);

      toast.success(
        t('seller.onchain.verifySuccess', {
          defaultValue: 'Verificação concluída: {{message}}',
          message: response.message,
        })
      );

      // Atualizar status local
      setSyncStatus(response.status);
    } catch (err) {
      handleOperationError(err);
    } finally {
      setVerifyingStore(false);
    }
  }, [handleOperationError, storeIdentifier, t]);

  const handleReancorar = useCallback(async () => {
    // Reancorar é o mesmo que sincronizar o catálogo novamente
    await handleSyncCatalog();
  }, [handleSyncCatalog]);

  return (
    <div className="container mx-auto px-4 py-2 md:py-3">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <Breadcrumbs items={[
          { label: t('nav.dashboard', { defaultValue: 'Dashboard' }), href: '/app' },
          { label: t('nav.myStores', { defaultValue: 'Minhas Lojas' }), href: '/app/sellers' },
          { label: t('seller.setup.title', { defaultValue: 'Configurar Loja' }) }
        ]} />

        <Card>
          <CardHeader>
            <CardTitle>{t('seller.setup.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('common.loading')}
              </div>
            ) : (
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="shopName">{t('seller.form.shopName')}</Label>
                  <Input
                    id="shopName"
                    value={shopName}
                    onChange={(event) => setShopName(event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shopSlug">{t('seller.form.shopSlug')}</Label>
                  <Input
                    id="shopSlug"
                    value={shopSlug}
                    onChange={(event) => setShopSlug(event.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">{t('seller.form.slugHint')}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="about">{t('seller.form.about')}</Label>
                  <Textarea
                    id="about"
                    value={about}
                    onChange={(event) => setAbout(event.target.value)}
                    rows={5}
                  />
                </div>

                <div className="space-y-4 rounded-md border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>{t('seller.setup.themeLabel', { defaultValue: 'Tema da loja' })}</Label>
                      <p className="text-xs text-muted-foreground">
                        {t('seller.setup.themeHint', {
                          defaultValue: 'Ative e personalize as cores principais da vitrine.',
                        })}
                      </p>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-muted-foreground">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={themeEnabled}
                        onChange={() => setThemeEnabled((prev) => !prev)}
                      />
                      {t('seller.setup.themeToggle', { defaultValue: 'Usar tema personalizado' })}
                    </label>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {THEME_PRESETS.map((preset) => (
                      <Button
                        key={preset.id}
                        type="button"
                        variant={selectedPreset === preset.id ? 'default' : 'outline'}
                        disabled={!themeEnabled}
                        onClick={() => {
                          setSelectedPreset(preset.id);
                          setThemeEnabled(true);
                          setTheme(preset.theme);
                        }}
                      >
                        {preset.label}
                      </Button>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!themeEnabled}
                      onClick={() => {
                        setSelectedPreset(null);
                        setTheme(DEFAULT_THEME);
                      }}
                    >
                      {t('common.reset', { defaultValue: 'Resetar' })}
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {(Object.keys(themeLabels) as Array<keyof StoreTheme>).map((key) => (
                      <div key={key} className="space-y-1">
                        <Label htmlFor={`theme-${key}`}>{themeLabels[key]}</Label>
                        <Input
                          id={`theme-${key}`}
                          type="color"
                          value={theme[key] ?? '#ffffff'}
                          disabled={!themeEnabled}
                          onChange={(event) =>
                            setTheme((prev) => ({
                              ...prev,
                              [key]: event.target.value,
                            }))
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {onChainEnabled && (
                  <div className="space-y-4 rounded-md border border-dashed p-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <ShieldCheck className="h-4 w-4" />
                      {onChainStoreId
                        ? t('seller.onchain.published', {
                            defaultValue: 'Loja publicada on-chain (ID {{id}})',
                            id: onChainStoreId,
                          })
                        : t('seller.onchain.notPublished', {
                            defaultValue: 'A loja ainda não foi publicada on-chain.',
                          })}
                    </div>

                    {onChainMetadataCid && (
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <span className="font-medium uppercase tracking-wide text-muted-foreground/70">
                          CID
                        </span>
                        <code className="block overflow-hidden text-ellipsis rounded bg-muted px-2 py-1">
                          {onChainMetadataCid}
                        </code>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-auto px-2"
                            onClick={() => navigator.clipboard?.writeText(onChainMetadataCid)}
                          >
                            <Copy className="h-3 w-3" />
                            {t('seller.onchain.copyCid', { defaultValue: 'Copiar' })}
                          </Button>
                          {metadataSource && (
                            <span className="text-xs text-muted-foreground/80">
                              {t('seller.onchain.cidSource', {
                                defaultValue: 'Fonte: {{source}}',
                                source: metadataSource,
                              })}
                            </span>
                          )}
                        </div>
                        {metadataPreview && (
                          <img
                            src={metadataPreview}
                            alt=""
                            className="mt-2 h-24 w-40 rounded object-cover"
                          />
                        )}
                      </div>
                    )}

                    {creationDeposit > 0n && chainProps && (
                      <div className="flex gap-2 rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
                        <Info className="mt-0.5 h-4 w-4 flex-none" />
                        <p>
                          {t('seller.onchain.creationDeposit', {
                            defaultValue:
                              'Será reservado um depósito de {{amount}} {{symbol}} durante a criação da loja. O valor é devolvido ao transferir a loja para outro owner.',
                            amount: formatBalance(creationDeposit, chainProps.tokenDecimals, 4),
                            symbol: chainProps.tokenSymbol,
                          })}
                        </p>
                      </div>
                    )}

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          <Wallet className="h-3.5 w-3.5" />
                          {t('seller.onchain.owner', { defaultValue: 'Owner atual' })}
                        </div>
                        {ownerAddress ? (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <code className="rounded bg-muted px-2 py-1 text-xs">
                              {ownerAddress}
                            </code>
                            <span className="text-xs text-muted-foreground/70">
                              {shortenAddress(ownerAddress)}
                            </span>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            {t('seller.onchain.ownerUnknown', {
                              defaultValue: 'Owner ainda não disponível.',
                            })}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          <Users className="h-3.5 w-3.5" />
                          {t('seller.onchain.operators', { defaultValue: 'Operadores atuais' })}
                        </div>
                        {operators.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {operators.map((op) => (
                              <span key={op} className="rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
                                {shortenAddress(op)}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            {t('seller.onchain.noOperators', {
                              defaultValue: 'Nenhum operador configurado.',
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {error && (
                  <Alert variant="destructive">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="mt-0.5 h-4 w-4" />
                      <div className="space-y-1">
                        <div className="text-sm font-semibold">
                          {t('seller.onchain.errorTitle', { defaultValue: 'Erro' })}
                        </div>
                        <AlertDescription>{error}</AlertDescription>
                      </div>
                    </div>
                  </Alert>
                )}

                <div className="flex gap-2">
                  <Button type="submit" disabled={saving}>
                    {saving
                      ? t('common.saving')
                      : onChainEnabled
                        ? onChainStoreId
                          ? t('seller.onchain.update', { defaultValue: 'Atualizar loja' })
                          : t('seller.onchain.publish', { defaultValue: 'Publicar loja on-chain' })
                        : t('common.save')}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                    {t('common.cancel')}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        {onChainEnabled && onChainStoreId && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                {t('store.onchain.catalogTitle', { defaultValue: 'Catálogo da Loja' })}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t('store.onchain.catalogDescription', {
                  defaultValue: 'Publique seu catálogo de produtos e serviços no IPFS',
                })}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSyncCatalog}
                  disabled={syncingCatalog}
                  className="w-full sm:w-auto"
                >
                  {syncingCatalog ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('store.onchain.syncingCatalog', { defaultValue: 'Sincronizando catálogo...' })}
                    </>
                  ) : (
                    <>
                      <Layers className="mr-2 h-4 w-4" />
                      {t('store.onchain.syncCatalog', { defaultValue: 'Sincronizar Catálogo' })}
                    </>
                  )}
                </Button>
                {syncStatus === 'diverged' && (
                  <Button
                    type="button"
                    variant="default"
                    onClick={handleVerifyStore}
                    disabled={verifyingStore}
                    className="w-full bg-red-600 hover:bg-red-700 sm:w-auto"
                  >
                    {verifyingStore ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t('store.onchain.verifying', { defaultValue: 'Verificando...' })}
                      </>
                    ) : (
                      <>
                        <AlertCircle className="mr-2 h-4 w-4" />
                        {t('store.onchain.verifyMetadata', { defaultValue: 'Reancorar Metadados' })}
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {onChainEnabled && (
          <Card>
            <CardHeader>
              <CardTitle>{t('seller.onchain.operatorManagement', { defaultValue: 'Operadores' })}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {onChainStoreId ? (
                <>
                  <div className="space-y-2">
                    <Label>{t('seller.onchain.addOperator', { defaultValue: 'Adicionar operador' })}</Label>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Input
                        value={operatorInput}
                        onChange={(event) => setOperatorInput(event.target.value)}
                        placeholder={t('seller.onchain.operatorPlaceholder', {
                          defaultValue: 'Endereço SS58 do operador',
                        })}
                      />
                      <Button
                        type="button"
                        onClick={handleAddOperator}
                        disabled={operatorSubmitting || !operatorInput.trim()}
                      >
                        {operatorSubmitting ? t('common.saving') : t('common.add')}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>{t('seller.onchain.currentOperators', { defaultValue: 'Operadores ativos' })}</Label>
                    {onChainStatusLoading ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t('common.loading')}
                      </div>
                    ) : operators.length > 0 ? (
                      <div className="space-y-2">
                        {operators.map((op) => (
                          <div
                            key={op}
                            className="flex items-center justify-between rounded border bg-muted/30 px-3 py-2 text-sm"
                          >
                            <div className="flex flex-col">
                              <span className="font-mono text-xs">{op}</span>
                              <span className="text-xs text-muted-foreground/70">
                                {shortenAddress(op)}
                              </span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={() => handleRemoveOperator(op)}
                              disabled={operatorSubmitting}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {t('seller.onchain.noOperators', { defaultValue: 'Nenhum operador configurado.' })}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t('seller.onchain.publishFirst', {
                    defaultValue: 'Publique a loja on-chain para gerenciar operadores.',
                  })}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {onChainEnabled && (
          <Card>
            <CardHeader>
              <CardTitle>{t('seller.onchain.transferTitle', { defaultValue: 'Transferência de ownership' })}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {onChainStoreId ? (
                <>
                  <div className="space-y-2">
                    <Label>
                      {t('seller.onchain.beginTransfer', {
                        defaultValue: 'Iniciar transferência para novo owner',
                      })}
                    </Label>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Input
                        value={transferInput}
                        onChange={(event) => setTransferInput(event.target.value)}
                        placeholder={t('seller.onchain.transferPlaceholder', {
                          defaultValue: 'Endereço SS58 do novo owner',
                        })}
                      />
                      <Button
                        type="button"
                        onClick={handleBeginTransfer}
                        disabled={transferSubmitting || !transferInput.trim()}
                      >
                        {transferSubmitting ? t('common.saving') : t('seller.onchain.beginButton', { defaultValue: 'Iniciar' })}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t('seller.onchain.transferHint', {
                        defaultValue: 'O novo owner precisará aceitar a transferência. O depósito será reservado no destinatário.',
                      })}
                    </p>
                  </div>

                  {pendingTransfer ? (
                    <div className="rounded-md border bg-muted/20 p-3">
                      <div className="flex items-center gap-2 text-sm">
                        <ArrowRight className="h-4 w-4" />
                        {t('seller.onchain.pendingTransfer', {
                          defaultValue: 'Transferência pendente para {{address}}',
                          address: shortenAddress(pendingTransfer),
                        })}
                      </div>
                      <code className="mt-2 block overflow-hidden text-ellipsis rounded bg-muted px-2 py-1 text-xs">
                        {pendingTransfer}
                      </code>
                      {canAcceptTransfer ? (
                        <Button
                          type="button"
                          className="mt-3"
                          onClick={handleAcceptTransfer}
                          disabled={acceptingTransfer}
                        >
                          {acceptingTransfer
                            ? t('seller.onchain.accepting', { defaultValue: 'Aceitando...' })
                            : t('seller.onchain.acceptButton', { defaultValue: 'Aceitar transferência' })}
                        </Button>
                      ) : (
                        <p className="mt-2 text-xs text-muted-foreground">
                          {t('seller.onchain.acceptHint', {
                            defaultValue: 'O destinatário indicado deve acessar esta página com a carteira correspondente para aceitar.',
                          })}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {t('seller.onchain.noTransfer', { defaultValue: 'Nenhuma transferência pendente.' })}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t('seller.onchain.publishFirst', {
                    defaultValue: 'Publique a loja on-chain para transferir ownership.',
                  })}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {onChainStoreId && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                {t('seller.onchain.diagnosticTitle', { defaultValue: 'Diagnóstico On-Chain' })}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-xs text-muted-foreground">Store ID</Label>
                  <p className="font-mono">{onChainStoreId}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    {t('seller.onchain.version', { defaultValue: 'Versão' })}
                  </Label>
                  <p className="font-mono">{onChainStore?.version || 1}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <SyncBadge status={syncStatus} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    {t('seller.onchain.lastBlock', { defaultValue: 'Último Bloco' })}
                  </Label>
                  <p className="font-mono">{lastSyncBlock?.toString() || 'N/A'}</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  {t('seller.onchain.anchoredCids', { defaultValue: 'CIDs Ancorados' })}
                </Label>
                <div className="space-y-1 text-xs font-mono">
                  <div>
                    <span className="text-muted-foreground">store:</span> {metadataCid || 'N/A'}
                  </div>
                  <div>
                    <span className="text-muted-foreground">categories:</span> {categoriesCid || 'N/A'}
                  </div>
                  <div>
                    <span className="text-muted-foreground">products:</span> {productsCid || 'N/A'}
                  </div>
                </div>
              </div>

              {syncStatus === 'DIVERGED' && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {t('seller.onchain.divergedWarning', {
                      defaultValue: 'Hash divergente detectado. Conteúdo do IPFS não corresponde ao hash ancorado no NFT.',
                    })}
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={handleReancorar}
                    >
                      {t('seller.onchain.reanchor', { defaultValue: 'Reancorar Metadados' })}
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const url = resolveIpfsUrl(metadataCid);
                    if (url) window.open(url, '_blank');
                  }}
                  disabled={!metadataCid}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  {t('seller.onchain.viewIpfs', { defaultValue: 'Ver no IPFS' })}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => storeIdentifier && sellerApi.verifyStore(storeIdentifier)}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {t('seller.onchain.verifyHashes', { defaultValue: 'Verificar Hashes' })}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
