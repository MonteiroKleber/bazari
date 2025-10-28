import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { WalletToken, BalanceSnapshot } from './TokenList';

interface TokenSelectorProps {
  tokens: WalletToken[];
  selectedToken: WalletToken | null;
  onSelect: (token: WalletToken) => void;
  balances: Record<string, BalanceSnapshot | null>;
  label?: string;
}

function getTokenIcon(token: WalletToken): string {
  if (token.icon) return token.icon;
  if (token.assetId === 'native') return '💎';
  if (token.symbol === 'ZARI') return '🏛️';
  return '🪙';
}

function formatBalance(amount: bigint, decimals: number): string {
  const divisor = 10n ** BigInt(decimals);
  const integerPart = amount / divisor;
  const fractionalPart = amount % divisor;

  const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
  const formatted = `${integerPart}.${fractionalStr.slice(0, 2)}`;

  return Number(formatted).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function TokenSelector({
  tokens,
  selectedToken,
  onSelect,
  balances,
  label,
}: TokenSelectorProps) {
  const { t } = useTranslation();

  if (tokens.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground text-sm">
        {t('wallet.noTokensAvailable')}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label>{label || t('wallet.selectToken')}</Label>
      <div className="grid gap-3">
        {tokens.map((token) => {
          const isSelected = selectedToken?.assetId === token.assetId;
          const balance = balances[token.assetId];

          return (
            <button
              key={token.assetId}
              type="button"
              onClick={() => onSelect(token)}
              className={cn(
                'flex items-center justify-between p-4',
                'border rounded-lg transition-all',
                'hover:bg-accent hover:text-accent-foreground',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isSelected && 'border-primary border-2 bg-primary/5'
              )}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl" aria-hidden="true">
                  {getTokenIcon(token)}
                </span>
                <div className="text-left">
                  <div className="font-semibold flex items-center gap-2">
                    {token.symbol}
                    {isSelected && (
                      <Badge variant="default" className="text-xs">
                        {t('wallet.selected')}
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {token.name}
                  </div>
                </div>
              </div>

              {balance && (
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">
                    {t('wallet.available')}
                  </div>
                  <div className="font-mono text-sm">
                    {formatBalance(balance.free - balance.frozen, balance.decimals)} {token.symbol}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
