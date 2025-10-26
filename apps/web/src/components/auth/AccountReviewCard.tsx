import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Copy, Check, Wallet } from 'lucide-react';
import { toast } from 'sonner';

interface AccountReviewCardProps {
  address: string;
  accountName: string;
  onAccountNameChange: (name: string) => void;
}

export function AccountReviewCard({ address, accountName, onAccountNameChange }: AccountReviewCardProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      toast.success(t('auth.review.addressCopied', { defaultValue: 'Endereço copiado!' }));
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error(t('auth.review.copyError', { defaultValue: 'Erro ao copiar endereço' }));
    }
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="pt-6 space-y-5">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-3">
            <Wallet className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-1">
            {t('auth.review.title', { defaultValue: 'Sua Nova Conta' })}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t('auth.review.subtitle', { defaultValue: 'Revise os detalhes antes de finalizar' })}
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">
            {t('auth.review.walletAddress', { defaultValue: 'Endereço da Carteira' })}
          </Label>
          <div className="flex gap-2">
            <div className="flex-1 p-3 bg-background rounded-lg border font-mono text-xs sm:text-sm break-all">
              {address}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={handleCopyAddress}
              className="flex-shrink-0"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="accountName" className="text-sm font-medium">
            {t('auth.review.accountName', { defaultValue: 'Nome da Conta' })}
            <span className="text-muted-foreground ml-1">
              ({t('common.optional', { defaultValue: 'opcional' })})
            </span>
          </Label>
          <Input
            id="accountName"
            value={accountName}
            onChange={(e) => onAccountNameChange(e.target.value)}
            placeholder={t('auth.review.accountNamePlaceholder', { defaultValue: 'Minha Conta Principal' })}
            maxLength={50}
          />
          <p className="text-xs text-muted-foreground">
            {t('auth.review.accountNameHint', { defaultValue: 'Ajuda a identificar esta conta se você tiver múltiplas' })}
          </p>
        </div>

        <div className="pt-4 border-t space-y-2">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
            <span className="text-sm text-muted-foreground">
              {t('auth.review.check1', { defaultValue: '12 palavras secretas salvas' })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
            <span className="text-sm text-muted-foreground">
              {t('auth.review.check2', { defaultValue: 'Backup verificado' })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
            <span className="text-sm text-muted-foreground">
              {t('auth.review.check3', { defaultValue: 'PIN de proteção criado' })}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
