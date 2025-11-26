/**
 * CommissionHistoryTable - Display commission history
 *
 * Shows all CommissionRecorded events in a table format
 * with date, recipient, type, amount, and transaction hash
 */

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink } from 'lucide-react';
import type { CommissionEntry } from '@/hooks/blockchain/useCommerce';

interface CommissionHistoryTableProps {
  commissions: CommissionEntry[];
  showRecipient?: boolean;
  className?: string;
}

export const CommissionHistoryTable = ({
  commissions,
  showRecipient = true,
  className = '',
}: CommissionHistoryTableProps) => {
  const formatAmount = (amount: number) => {
    return `${(amount / 1e12).toFixed(2)} BZR`;
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return '-';
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'platform':
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
            🏛️ Platform
          </Badge>
        );
      case 'affiliate':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            👥 Affiliate
          </Badge>
        );
      case 'seller':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            🏪 Seller
          </Badge>
        );
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  };

  if (commissions.length === 0) {
    return (
      <Card className={className}>
        <div className="p-8 text-center text-gray-500">
          <p>No commission history found.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              {showRecipient && <TableHead>Recipient</TableHead>}
              <TableHead>Type</TableHead>
              {commissions.some((c) => c.level) && <TableHead>Level</TableHead>}
              <TableHead className="text-right">Amount</TableHead>
              {commissions.some((c) => c.txHash) && <TableHead>Transaction</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {commissions.map((commission, idx) => (
              <TableRow key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                <TableCell className="text-sm">
                  {formatDate(commission.timestamp)}
                </TableCell>
                {showRecipient && (
                  <TableCell className="font-mono text-xs">
                    {truncateAddress(commission.recipient)}
                  </TableCell>
                )}
                <TableCell>
                  {getTypeBadge(commission.type)}
                </TableCell>
                {commissions.some((c) => c.level) && (
                  <TableCell className="text-center">
                    {commission.level ? (
                      <Badge variant="secondary" className="text-xs">
                        L{commission.level}
                      </Badge>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                )}
                <TableCell className="text-right font-mono font-semibold">
                  {formatAmount(commission.amount)}
                </TableCell>
                {commissions.some((c) => c.txHash) && (
                  <TableCell>
                    {commission.txHash ? (
                      <a
                        href={`/tx/${commission.txHash}`}
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <span className="font-mono">
                          {truncateAddress(commission.txHash)}
                        </span>
                        <ExternalLink size={12} />
                      </a>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
};
