import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Shield,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  Clock,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEscrowDetails, EscrowState } from '@/hooks/blockchain/useEscrow';
import { CountdownTimer } from '@/components/blockchain/CountdownTimer';
import { cn } from '@/lib/utils';

/**
 * PaymentProtectionCard - Entry point for escrow from OrderPage
 *
 * Shows:
 * - If escrow exists: State, amount, compact countdown, link to full page
 * - If no escrow: Explanation of protection + setup button
 *
 * This component is integrated into OrderPage (addendum requirement).
 *
 * @example
 * // In OrderPage.tsx
 * <PaymentProtectionCard orderId="ORD-123" currentBlock={12345} />
 */

interface PaymentProtectionCardProps {
  /** Order ID (e.g., "ORD-123") */
  orderId: string;

  /** Current block number */
  currentBlock: number;

  /** Custom className */
  className?: string;
}

export function PaymentProtectionCard({
  orderId,
  currentBlock,
  className,
}: PaymentProtectionCardProps) {
  const { data: escrow, isLoading, error } = useEscrowDetails(orderId);

  // Loading state
  if (isLoading) {
    return <PaymentProtectionCardSkeleton />;
  }

  // Error state
  if (error) {
    return (
      <Card className={cn('border-red-200 dark:border-red-800', className)}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertCircle className="h-5 w-5" />
            <p className="text-sm">Failed to load escrow details</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No escrow exists
  if (!escrow) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-5 w-5 text-muted-foreground" />
            Payment Protection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            This order does not have payment protection enabled.
          </p>
          <div className="bg-muted/50 p-3 rounded-lg text-sm space-y-2">
            <p className="font-medium">How Payment Protection works:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Funds held securely on-chain</li>
              <li>Auto-release to seller after 7 days</li>
              <li>Buyer can release early</li>
              <li>DAO can refund if dispute occurs</li>
            </ul>
          </div>
          <Button variant="outline" size="sm" className="w-full" disabled>
            <Shield className="h-4 w-4 mr-2" />
            Protection not available for this order
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Escrow exists - show compact view with link to full page
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Payment Protection
          </CardTitle>
          <EscrowStateBadge state={escrow.state} />
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* Amount */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Escrow Amount</span>
          <span className="font-bold text-green-600 dark:text-green-400">
            {escrow.amountFormatted} BZR
          </span>
        </div>

        {/* Compact Countdown (Active only) */}
        {escrow.state === EscrowState.Active && (
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Auto-release in:</span>
            <CountdownTimer
              targetTimestamp={
                Date.now() +
                (escrow.autoReleaseAt - currentBlock) * 6 * 1000
              }
              compact={true}
            />
          </div>
        )}

        {/* State Messages */}
        {escrow.state === EscrowState.Released && (
          <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950/20 rounded text-sm text-green-700 dark:text-green-300">
            <CheckCircle2 className="h-4 w-4" />
            <span>Funds released to seller</span>
          </div>
        )}

        {escrow.state === EscrowState.Refunded && (
          <div className="flex items-center gap-2 p-2 bg-orange-50 dark:bg-orange-950/20 rounded text-sm text-orange-700 dark:text-orange-300">
            <XCircle className="h-4 w-4" />
            <span>Buyer refunded by DAO</span>
          </div>
        )}

        {escrow.state === EscrowState.Disputed && (
          <div className="flex items-start gap-2 p-2 bg-red-50 dark:bg-red-950/20 rounded text-sm text-red-700 dark:text-red-300">
            <AlertCircle className="h-4 w-4 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium">Dispute active</p>
              <p className="text-xs mt-1">{escrow.dispute?.reason}</p>
            </div>
          </div>
        )}

        {/* Link to Full Escrow Page */}
        <Link to={`/app/orders/${orderId}/escrow`} className="block">
          <Button variant="outline" size="sm" className="w-full">
            View Escrow Details
            <ExternalLink className="h-4 w-4 ml-2" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

/**
 * EscrowStateBadge - Reusable badge component
 */
function EscrowStateBadge({ state }: { state: EscrowState }) {
  const config = {
    [EscrowState.Active]: {
      label: 'Active',
      className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    },
    [EscrowState.Released]: {
      label: 'Released',
      className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    },
    [EscrowState.Refunded]: {
      label: 'Refunded',
      className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    },
    [EscrowState.Disputed]: {
      label: 'Disputed',
      className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    },
  };

  const { label, className } = config[state];

  return (
    <Badge variant="default" className={className}>
      {label}
    </Badge>
  );
}

/**
 * PaymentProtectionCardSkeleton - Loading skeleton
 */
function PaymentProtectionCardSkeleton() {
  return (
    <Card>
      <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
        <div className="flex items-center justify-between">
          <div className="h-5 w-40 bg-muted animate-pulse rounded" />
          <div className="h-5 w-16 bg-muted animate-pulse rounded" />
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        <div className="h-4 bg-muted animate-pulse rounded" />
        <div className="h-4 bg-muted animate-pulse rounded" />
        <div className="h-8 bg-muted animate-pulse rounded" />
      </CardContent>
    </Card>
  );
}
