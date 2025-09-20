import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getActiveAccount } from '@/modules/auth';
import { AddressQr } from '../components/AddressQr';
import { useChainProps } from '../hooks/useChainProps';
import { normaliseAddress, shortenAddress } from '../utils/format';

export function ReceivePage() {
  const { t } = useTranslation();
  const { props: chainProps, error } = useChainProps();
  const [rawAddress, setRawAddress] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let mounted = true;
    void getActiveAccount().then((account) => {
      if (mounted) {
        setRawAddress(account?.address ?? null);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const displayAddress = useMemo(() => {
    if (!rawAddress) {
      return null;
    }
    if (!chainProps) {
      return rawAddress;
    }
    try {
      return normaliseAddress(rawAddress, chainProps.ss58Prefix);
    } catch (err) {
      console.warn('[wallet] Failed to format address', err);
      return rawAddress;
    }
  }, [chainProps, rawAddress]);

  const handleCopy = async () => {
    if (!displayAddress) {
      return;
    }
    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      return;
    }
    try {
      await navigator.clipboard.writeText(displayAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('[wallet] failed to copy address', err);
    }
  };

  const shareSupported = typeof navigator !== 'undefined' && !!navigator.share;

  const handleShare = async () => {
    if (!shareSupported || !displayAddress) {
      return;
    }
    try {
      await navigator.share({
        title: t('wallet.receive.shareTitle'),
        text: t('wallet.receive.shareText'),
        url: `substrate:${displayAddress}`,
      });
    } catch (error) {
      console.warn('[wallet] share cancelled or failed', error);
    }
  };

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">{t('wallet.receive.title')}</h1>
        <p className="text-muted-foreground">{t('wallet.receive.subtitle')}</p>
      </header>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{t('wallet.receive.chainError')}</AlertDescription>
        </Alert>
      )}

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>{t('wallet.receive.addressTitle')}</CardTitle>
          <CardDescription>{t('wallet.receive.addressDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {displayAddress ? (
            <>
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-6">
                <AddressQr address={displayAddress} />
                <div className="space-y-3">
                  <code className="block max-w-lg break-all rounded-md bg-muted px-4 py-3 text-sm text-foreground">
                    {displayAddress}
                  </code>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => void handleCopy()}>
                      {copied ? t('wallet.receive.copied') : t('wallet.receive.copy')}
                    </Button>
                    {shareSupported && (
                      <Button variant="ghost" onClick={() => void handleShare()}>
                        {t('wallet.receive.share')}
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t('wallet.receive.formattedPreview', {
                      prefix: chainProps?.ss58Prefix ?? 42,
                      short: shortenAddress(displayAddress, 6),
                    })}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t('wallet.receive.noAccount')}
            </p>
          )}
        </CardContent>
      </Card>

      <Alert>
        <AlertDescription>
          {t('wallet.receive.networkHint', { symbol: chainProps ? chainProps.tokenSymbol : 'BZR' })}
        </AlertDescription>
      </Alert>
    </section>
  );
}

export default ReceivePage;
