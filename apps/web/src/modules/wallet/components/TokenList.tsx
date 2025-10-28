import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowDownToLine, ArrowUpToLine, History, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface WalletToken {
  assetId: string;
  symbol: string;
  name: string;
  decimals: number;
  type: 'native' | 'asset';
  icon?: string;
}

export interface BalanceSnapshot {
  assetId: string;
  symbol: string;
  decimals: number;
  free: bigint;
  reserved: bigint;
  frozen: bigint;
  updatedAt: number;
}

interface TokenListProps {
  tokens: WalletToken[];
  balances: Record<string, BalanceSnapshot | null>;
  onReceive: (token: WalletToken) => void;
  onSend: (token: WalletToken) => void;
  onHistory: (token: WalletToken) => void;
  onRemove?: (token: WalletToken) => void;
  loading?: boolean;
}

function getTokenIcon(token: WalletToken): string {
  if (token.icon) return token.icon;
  if (token.assetId === 'native') return '💎';
  if (token.symbol === 'ZARI') return '🏛️';
  return '🪙';
}

function getTokenTypeBadge(token: WalletToken, t: any): string {
  if (token.assetId === 'native') return t('wallet.tokens.nativeAsset');
  if (token.symbol === 'ZARI') return t('wallet.tokens.governanceToken');
  return 'Asset';
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

interface BalanceRowProps {
  label: string;
  amount: bigint;
  symbol: string;
  decimals: number;
  muted?: boolean;
  highlight?: boolean;
}

function BalanceRow({ label, amount, symbol, decimals, muted, highlight }: BalanceRowProps) {
  return (
    <div className={`flex justify-between items-center ${muted ? 'text-sm text-muted-foreground' : ''} ${highlight ? 'font-semibold' : ''}`}>
      <span>{label}:</span>
      <span className="font-mono">
        {formatBalance(amount, decimals)} {symbol}
      </span>
    </div>
  );
}

export function TokenList({
  tokens,
  balances,
  onReceive,
  onSend,
  onHistory,
  onRemove,
  loading,
}: TokenListProps) {
  const { t } = useTranslation();

  if (tokens.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t('wallet.noTokens')}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tokens.map((token) => {
        const balance = balances[token.assetId];

        return (
          <Card key={token.assetId}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{getTokenIcon(token)}</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-xl">{token.symbol}</CardTitle>
                      <Badge variant="secondary">
                        {getTokenTypeBadge(token, t)}
                      </Badge>
                    </div>
                    <CardDescription>{token.name}</CardDescription>
                  </div>
                </div>
                {token.assetId !== 'native' && onRemove && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemove(token)}
                    aria-label={t('wallet.removeToken')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardHeader>

            <CardContent>
              {loading || !balance ? (
                <Skeleton className="h-20 w-full" />
              ) : (
                <div className="space-y-2">
                  <BalanceRow
                    label={t('wallet.balances.title')}
                    amount={balance.free + balance.reserved}
                    symbol={token.symbol}
                    decimals={token.decimals}
                  />
                  {balance.reserved > 0n && (
                    <BalanceRow
                      label={t('wallet.balances.columns.reserved')}
                      amount={balance.reserved}
                      symbol={token.symbol}
                      decimals={token.decimals}
                      muted
                    />
                  )}
                  <BalanceRow
                    label={t('wallet.tokens.available')}
                    amount={balance.free - balance.frozen}
                    symbol={token.symbol}
                    decimals={token.decimals}
                    highlight
                  />
                </div>
              )}
            </CardContent>

            <CardFooter className="gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onReceive(token)}
              >
                <ArrowDownToLine className="mr-2 h-4 w-4" />
                {t('wallet.dashboard.actions.receive')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSend(token)}
              >
                <ArrowUpToLine className="mr-2 h-4 w-4" />
                {t('wallet.dashboard.actions.send')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onHistory(token)}
              >
                <History className="mr-2 h-4 w-4" />
                {t('wallet.history.title')}
              </Button>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
