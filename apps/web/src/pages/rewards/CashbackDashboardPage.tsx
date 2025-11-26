import { useState } from 'react';
import {
  useZariBalance,
  useCashbackHistory,
  useConvertZari,
} from '@/hooks/blockchain/useRewards';
import { CashbackBalance } from '@/components/rewards';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Wallet, TrendingUp, ArrowRightLeft, ExternalLink, Calendar } from 'lucide-react';
import { toast } from 'sonner';

/**
 * CashbackDashboardPage - ZARI balance and transaction history
 *
 * Route: /app/rewards/cashback
 *
 * Features:
 * - View ZARI token balance
 * - Transaction history
 * - Convert ZARI to BZR
 * - Cashback statistics
 */

export const CashbackDashboardPage = () => {
  const { data: balanceData, isLoading: balanceLoading } = useZariBalance();
  const { data: history, isLoading: historyLoading } = useCashbackHistory(50);
  const { convertZari, isLoading: converting } = useConvertZari();

  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [convertAmount, setConvertAmount] = useState('');

  const balance = balanceData?.formatted || '0.00';
  const rawBalance = parseFloat(balanceData?.balance || '0');

  // Calculate stats
  const totalCashback = history?.reduce((sum, tx) => sum + tx.amount, 0) || 0;
  const monthlyAverage = history ? totalCashback / Math.max(1, history.length / 30) : 0;

  const handleConvert = async () => {
    const amount = parseFloat(convertAmount);
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (amount > rawBalance) {
      toast.error('Insufficient ZARI balance');
      return;
    }

    try {
      const result = await convertZari(amount);
      if (result?.success) {
        toast.success(`Successfully converted ${amount} ZARI to BZR`);
        setShowConvertDialog(false);
        setConvertAmount('');
      }
    } catch (error) {
      toast.error('Failed to convert ZARI');
    }
  };

  if (balanceLoading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <Skeleton className="h-12 w-64 mb-6" />
        <Skeleton className="h-64 mb-6" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-4xl font-bold flex items-center gap-3 mb-2">
          <Wallet className="text-yellow-600" size={36} />
          Cashback Dashboard
        </h1>
        <p className="text-gray-600">
          Manage your ZARI tokens and view cashback earnings
        </p>
      </div>

      {/* Balance Card */}
      <div className="mb-6">
        <CashbackBalance
          onConvert={() => setShowConvertDialog(true)}
          onViewHistory={() => {
            document.getElementById('history-section')?.scrollIntoView({ behavior: 'smooth' });
          }}
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="text-green-500" size={24} />
              <span className="text-sm text-gray-600 font-medium">Total Earned</span>
            </div>
            <p className="text-3xl font-bold text-green-600">
              {totalCashback.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 mt-1">ZARI</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="text-blue-500" size={24} />
              <span className="text-sm text-gray-600 font-medium">Monthly Avg</span>
            </div>
            <p className="text-3xl font-bold text-blue-600">
              {monthlyAverage.toFixed(0)}
            </p>
            <p className="text-xs text-gray-500 mt-1">ZARI/month</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-2">
              <Wallet className="text-purple-500" size={24} />
              <span className="text-sm text-gray-600 font-medium">Transactions</span>
            </div>
            <p className="text-3xl font-bold text-purple-600">{history?.length || 0}</p>
            <p className="text-xs text-gray-500 mt-1">all time</p>
          </CardContent>
        </Card>
      </div>

      {/* Transaction History */}
      <Card id="history-section">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp size={24} className="text-green-600" />
            Transaction History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : history && history.length > 0 ? (
            <div className="space-y-2">
              {history.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-full bg-green-100">
                      <TrendingUp className="text-green-600" size={20} />
                    </div>
                    <div>
                      <p className="font-medium">{tx.source}</p>
                      <p className="text-xs text-gray-600">
                        {new Date(tx.timestamp * 1000).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">+{tx.amount.toLocaleString()}</p>
                    <p className="text-xs text-gray-600">ZARI</p>
                    {tx.txHash && (
                      <a
                        href={`https://polkadot.js.org/apps/?rpc=wss://bazari.network#/explorer/query/${tx.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                      >
                        View TX <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Wallet className="mx-auto mb-3 text-gray-300" size={48} />
              <p>No transactions yet</p>
              <p className="text-sm mt-1">Complete missions to start earning ZARI</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="mt-6 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200">
        <CardContent className="pt-6">
          <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
            <Wallet className="text-yellow-600" />
            About ZARI Tokens
          </h3>
          <div className="space-y-2 text-sm text-gray-700">
            <p>
              <strong>ZARI</strong> is the cashback token of the Bazari ecosystem. Earn ZARI by:
            </p>
            <ul className="space-y-1 ml-4">
              <li className="flex items-start gap-2">
                <span className="text-yellow-600">•</span>
                <span>Completing missions and challenges</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-600">•</span>
                <span>Making purchases on the marketplace (cashback rewards)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-600">•</span>
                <span>Maintaining daily streaks</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-600">•</span>
                <span>Referring new users</span>
              </li>
            </ul>
            <p className="mt-3">
              <strong>Convert ZARI:</strong> You can convert your ZARI tokens to BZR (Bazari's
              governance token) at any time.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Convert Dialog */}
      <Dialog open={showConvertDialog} onOpenChange={setShowConvertDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft size={24} />
              Convert ZARI to BZR
            </DialogTitle>
            <DialogDescription>
              Convert your ZARI cashback tokens to BZR governance tokens
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (ZARI)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={convertAmount}
                onChange={(e) => setConvertAmount(e.target.value)}
                min="0"
                max={rawBalance}
                step="0.01"
              />
              <p className="text-xs text-gray-600">
                Available: {balance} ZARI
              </p>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-gray-700">
                <strong>Conversion Rate:</strong> 1 ZARI = 1 BZR
              </p>
              <p className="text-sm text-gray-700 mt-2">
                You will receive: <strong>{convertAmount || '0'} BZR</strong>
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConvertDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleConvert} disabled={converting || !convertAmount}>
              {converting ? 'Converting...' : 'Convert'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CashbackDashboardPage;
