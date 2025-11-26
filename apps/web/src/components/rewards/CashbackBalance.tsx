import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useZariBalance } from '@/hooks/blockchain/useRewards';
import { Skeleton } from '@/components/ui/skeleton';
import { Wallet, RefreshCw, ArrowRightLeft, TrendingUp } from 'lucide-react';
import { useState } from 'react';

/**
 * CashbackBalance - Display ZARI token balance with refresh and convert
 */

interface CashbackBalanceProps {
  showActions?: boolean;
  onConvert?: () => void;
  onViewHistory?: () => void;
}

export const CashbackBalance = ({
  showActions = true,
  onConvert,
  onViewHistory,
}: CashbackBalanceProps) => {
  const { data: balanceData, refetch, isLoading } = useZariBalance();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <Skeleton className="h-32 w-full" />
      </Card>
    );
  }

  const balance = balanceData?.formatted || '0.00';
  const rawBalance = balanceData?.balance || '0';

  return (
    <Card className="p-6 bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50 border-2 border-yellow-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500">
            <Wallet size={24} className="text-white" />
          </div>
          <h3 className="font-semibold text-lg text-gray-800">ZARI Balance</h3>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="h-8 w-8 p-0"
        >
          <RefreshCw
            size={16}
            className={`${isRefreshing ? 'animate-spin' : ''}`}
          />
        </Button>
      </div>

      <div className="mb-6">
        <div className="flex items-baseline gap-2 mb-1">
          <p className="text-5xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
            {balance}
          </p>
          <span className="text-lg text-gray-600 font-medium">ZARI</span>
        </div>
        <p className="text-xs text-gray-500">
          Raw: {rawBalance}
        </p>
      </div>

      {showActions && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 border-yellow-300 hover:bg-yellow-100"
            onClick={onViewHistory}
          >
            <TrendingUp className="mr-2 h-4 w-4" />
            History
          </Button>
          <Button
            className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white"
            onClick={onConvert}
          >
            <ArrowRightLeft className="mr-2 h-4 w-4" />
            Convert
          </Button>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-yellow-200">
        <p className="text-xs text-gray-600 text-center">
          Earn ZARI by completing missions and spending on the marketplace
        </p>
      </div>
    </Card>
  );
};

/**
 * CashbackBalanceCompact - Compact version for dashboard
 */
export const CashbackBalanceCompact = () => {
  const { data: balanceData, isLoading } = useZariBalance();

  if (isLoading) {
    return <Skeleton className="h-12 w-32" />;
  }

  const balance = balanceData?.formatted || '0.00';

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 rounded-lg border border-yellow-200">
      <Wallet size={18} className="text-yellow-600" />
      <div>
        <p className="text-xs text-gray-600">ZARI</p>
        <p className="font-bold text-yellow-700">{balance}</p>
      </div>
    </div>
  );
};
