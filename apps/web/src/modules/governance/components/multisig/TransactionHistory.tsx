import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatDistance } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { MultisigTransaction } from '../../types';

export interface TransactionHistoryProps {
  /**
   * Multisig account address
   */
  multisigAddress: string;

  /**
   * Maximum number of transactions to show
   * @default 10
   */
  limit?: number;

  /**
   * Show only specific statuses
   */
  statusFilter?: MultisigTransaction['status'][];
}

const statusConfig = {
  PENDING: {
    label: 'Pendente',
    icon: <Clock className="h-3 w-3" />,
    color: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200',
  },
  APPROVED: {
    label: 'Aprovada',
    icon: <CheckCircle className="h-3 w-3" />,
    color: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200',
  },
  EXECUTED: {
    label: 'Executada',
    icon: <CheckCircle className="h-3 w-3" />,
    color: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-200',
  },
  CANCELLED: {
    label: 'Cancelada',
    icon: <XCircle className="h-3 w-3" />,
    color: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-200',
  },
};

/**
 * Format address for display
 */
function formatAddress(address: string): string {
  if (!address) return '';
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Format relative time
 */
function formatRelativeTime(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    return formatDistance(date, new Date(), {
      addSuffix: true,
      locale: ptBR,
    });
  } catch {
    return timestamp;
  }
}

/**
 * FASE 8: Transaction History Component
 *
 * Displays chronological list of multi-sig transactions with:
 * - Status badges and icons
 * - Transaction details
 * - Approvals list
 * - Execution timestamps
 * - Filters
 *
 * @example
 * ```tsx
 * <TransactionHistory
 *   multisigAddress="5Grw..."
 *   limit={20}
 *   statusFilter={['EXECUTED', 'CANCELLED']}
 * />
 * ```
 */
export function TransactionHistory({
  multisigAddress,
  limit = 10,
  statusFilter,
}: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState<MultisigTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock data for development
    // In production, this would fetch from API
    const mockTransactions: MultisigTransaction[] = [
      {
        id: 'tx-1',
        multisigAddress,
        callHash: '0x1234...',
        description: 'Transferir 100 BZR para desenvolvimento',
        threshold: 3,
        signatories: ['5Grw...', '5Hgx...', '5Fqz...'],
        approvals: ['5Grw...', '5Hgx...', '5Fqz...'],
        status: 'EXECUTED',
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        executedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
        depositor: '5Grw...',
      },
      {
        id: 'tx-2',
        multisigAddress,
        callHash: '0x5678...',
        description: 'Atualizar configuração do sistema',
        threshold: 3,
        signatories: ['5Grw...', '5Hgx...', '5Fqz...'],
        approvals: ['5Grw...', '5Hgx...'],
        status: 'APPROVED',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        depositor: '5Hgx...',
      },
      {
        id: 'tx-3',
        multisigAddress,
        callHash: '0x9abc...',
        description: 'Cancelar proposta anterior',
        threshold: 3,
        signatories: ['5Grw...', '5Hgx...', '5Fqz...'],
        approvals: ['5Grw...'],
        status: 'CANCELLED',
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        depositor: '5Fqz...',
      },
    ];

    setTimeout(() => {
      let filtered = mockTransactions;
      if (statusFilter && statusFilter.length > 0) {
        filtered = mockTransactions.filter(tx => statusFilter.includes(tx.status));
      }
      setTransactions(filtered.slice(0, limit));
      setLoading(false);
    }, 500);
  }, [multisigAddress, limit, statusFilter]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Transações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Carregando histórico...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (transactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Transações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground">Nenhuma transação encontrada</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Histórico de Transações</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {transactions.map((tx, idx) => {
            const status = statusConfig[tx.status];

            return (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05, duration: 0.3 }}
                className="border rounded-lg p-4 hover:border-primary/50 transition-colors"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-semibold">
                        {tx.description || `Transação ${tx.id}`}
                      </h4>
                      <Badge className={cn('border', status.color)}>
                        {status.icon}
                        <span className="ml-1">{status.label}</span>
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono">
                      Hash: {formatAddress(tx.callHash)}
                    </p>
                  </div>
                  <time className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatRelativeTime(tx.createdAt)}
                  </time>
                </div>

                {/* Approvals */}
                <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                  <div>
                    <span className="text-muted-foreground">Aprovações:</span>
                    <span className="ml-2 font-medium">
                      {tx.approvals.length}/{tx.threshold}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Signatários:</span>
                    <span className="ml-2 font-medium">{tx.signatories.length}</span>
                  </div>
                </div>

                {/* Depositor */}
                <div className="text-xs text-muted-foreground">
                  <span>Criado por:</span>
                  <span className="ml-2 font-mono">{formatAddress(tx.depositor)}</span>
                </div>

                {/* Execution Time */}
                {tx.executedAt && (
                  <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
                    <span>Executado:</span>
                    <span className="ml-2">{formatRelativeTime(tx.executedAt)}</span>
                  </div>
                )}

                {/* External Link (if applicable) */}
                {tx.status === 'EXECUTED' && (
                  <a
                    href={`#/governance/multisig/${tx.id}`}
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
                  >
                    Ver detalhes
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
