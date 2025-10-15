import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Wallet, ArrowDownToLine, RefreshCw } from 'lucide-react';

interface CashbackWidgetProps {
  profileId?: string;
  onRedeem?: () => void;
}

export function CashbackWidget({ profileId, onRedeem }: CashbackWidgetProps) {
  const [balance, setBalance] = useState('0');
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(false);

  useEffect(() => {
    if (profileId) {
      fetchBalance();
    }
  }, [profileId]);

  const fetchBalance = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/chat/cashback/balance`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        setBalance(data.data.balance);
      }
    } catch (error) {
      console.error('Failed to fetch cashback balance:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRedeem = async () => {
    const balanceValue = parseFloat(balance);
    if (balanceValue <= 0) return;

    if (!confirm(`Resgatar ${balanceValue.toFixed(2)} BZR de cashback?`)) {
      return;
    }

    setRedeeming(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/chat/cashback/redeem`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          },
          body: JSON.stringify({ amount: balance }),
        }
      );

      const data = await response.json();

      if (data.success) {
        alert('Cashback resgatado com sucesso! (MOCK)');
        fetchBalance();
        onRedeem?.();
      } else {
        alert(data.error || 'Erro ao resgatar cashback');
      }
    } catch (error) {
      console.error('Failed to redeem cashback:', error);
      alert('Erro ao resgatar cashback');
    } finally {
      setRedeeming(false);
    }
  };

  const balanceValue = parseFloat(balance);

  return (
    <div className="border rounded-lg p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-green-600" />
          <h3 className="font-semibold">Cashback</h3>
          <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
            MOCK
          </span>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={fetchBalance}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Balance */}
      <div className="text-center py-4">
        {loading ? (
          <div className="text-sm text-muted-foreground">Carregando...</div>
        ) : (
          <>
            <div className="text-3xl font-bold text-green-600">
              {balanceValue.toFixed(2)}
            </div>
            <div className="text-sm text-muted-foreground">BZR disponível</div>
          </>
        )}
      </div>

      {/* Action */}
      <Button
        onClick={handleRedeem}
        disabled={loading || redeeming || balanceValue <= 0}
        className="w-full"
        variant={balanceValue > 0 ? 'default' : 'outline'}
      >
        {redeeming ? (
          'Resgatando...'
        ) : (
          <>
            <ArrowDownToLine className="h-4 w-4 mr-2" />
            {balanceValue > 0 ? 'Resgatar Cashback' : 'Sem saldo disponível'}
          </>
        )}
      </Button>

      {/* Info */}
      <p className="text-xs text-center text-muted-foreground">
        Ganhe cashback completando missões e promovendo vendas
      </p>
    </div>
  );
}
