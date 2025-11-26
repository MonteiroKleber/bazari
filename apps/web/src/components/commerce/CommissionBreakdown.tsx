/**
 * CommissionBreakdown - Display commission breakdown for a sale
 *
 * Shows platform fee, affiliate commissions, and seller net
 * Supports multi-level affiliate commission display
 */

import { Card, CardContent } from '@/components/ui/card';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import type { CommissionEntry } from '@/hooks/blockchain/useCommerce';

interface CommissionBreakdownProps {
  totalAmount: number;
  commissions: CommissionEntry[];
  expandable?: boolean;
  showPercentages?: boolean;
  className?: string;
}

export const CommissionBreakdown = ({
  totalAmount,
  commissions,
  expandable = false,
  showPercentages = true,
  className = '',
}: CommissionBreakdownProps) => {
  const [isOpen, setIsOpen] = useState(!expandable);

  const formatAmount = (amount: number) => {
    // Convert from smallest unit (1e12) to BZR
    return `${(amount / 1e12).toFixed(2)} BZR`;
  };

  const getCommissionIcon = (type: string) => {
    switch (type) {
      case 'platform':
        return '🏛️';
      case 'affiliate':
        return '👥';
      case 'seller':
        return '🏪';
      default:
        return '💰';
    }
  };

  const getCommissionLabel = (commission: CommissionEntry) => {
    if (commission.type === 'platform') {
      return 'Platform Fee';
    }
    if (commission.type === 'affiliate') {
      return `Affiliate ${commission.level ? `(Level ${commission.level})` : ''}`;
    }
    if (commission.type === 'seller') {
      return 'Seller Net';
    }
    return 'Commission';
  };

  const renderCommissionList = () => (
    <div className="space-y-2">
      {commissions.map((commission, idx) => (
        <div
          key={idx}
          className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-800"
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">{getCommissionIcon(commission.type)}</span>
            <div className="flex flex-col">
              <span className="text-sm font-medium">
                {getCommissionLabel(commission)}
              </span>
              {commission.recipient && (
                <span className="text-xs text-gray-600 dark:text-gray-400 font-mono">
                  {commission.recipient.slice(0, 8)}...
                  {commission.recipient.slice(-6)}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {showPercentages && commission.percentage > 0 && (
              <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
                {commission.percentage}%
              </span>
            )}
            <span className="font-mono font-semibold text-sm">
              {formatAmount(commission.amount)}
            </span>
          </div>
        </div>
      ))}

      <div className="flex items-center justify-between py-3 px-3 border-t-2 border-gray-200 dark:border-gray-700 mt-2">
        <span className="font-semibold">Total Sale</span>
        <span className="font-mono font-bold text-lg">
          {formatAmount(totalAmount)}
        </span>
      </div>
    </div>
  );

  if (!expandable) {
    return (
      <div className={className}>
        {renderCommissionList()}
      </div>
    );
  }

  return (
    <Card className={className}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="flex items-center gap-2 w-full py-3 px-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          {isOpen ? (
            <ChevronDown size={16} className="text-gray-600" />
          ) : (
            <ChevronRight size={16} className="text-gray-600" />
          )}
          <span className="font-medium">Commission Breakdown</span>
          <span className="ml-auto font-mono text-sm text-gray-600 dark:text-gray-400">
            {formatAmount(totalAmount)}
          </span>
        </CollapsibleTrigger>

        <CollapsibleContent className="px-4 pb-4">
          {renderCommissionList()}
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
