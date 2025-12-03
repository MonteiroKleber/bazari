import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Shield,
  User,
  DollarSign,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { EscrowDetails, EscrowState } from '@/hooks/blockchain/useEscrow';
import { cn } from '@/lib/utils';
import { CountdownTimer } from '@/components/blockchain/CountdownTimer';

/**
 * EscrowCard - Display escrow state and details
 *
 * Shows:
 * - Escrow state badge (Active, Released, Refunded, Disputed)
 * - Buyer and seller addresses
 * - Escrow amount in BZR
 * - Countdown timer (if Active)
 * - Created/Released/Refunded timestamps
 *
 * @example
 * const { data: escrow } = useEscrowDetails("ORD-123");
 * <EscrowCard escrow={escrow} currentBlock={12345} />
 */

interface EscrowCardProps {
  /** Escrow details from blockchain */
  escrow: EscrowDetails;

  /** Current block number (for countdown calculation) */
  currentBlock: number;

  /** Custom className */
  className?: string;

  /** Show countdown timer (default: true) */
  showCountdown?: boolean;

  /** Compact mode (smaller, no timer) */
  compact?: boolean;
}

export function EscrowCard({
  escrow,
  currentBlock,
  className,
  showCountdown = true,
  compact = false,
}: EscrowCardProps) {
  const { state, buyer, seller, amountFormatted, createdAt, autoReleaseAt, autoReleaseBlocks } =
    escrow;

  // Calculate auto-release timestamp
  const blocksUntilRelease = autoReleaseAt - currentBlock;
  const secondsUntilRelease = blocksUntilRelease * 6; // 6s per block
  const autoReleaseTimestamp = Date.now() + secondsUntilRelease * 1000;

  // PROPOSAL-001: Use dynamic duration based on autoReleaseBlocks
  const dynamicBlocks = autoReleaseBlocks || 100_800; // fallback to 7 days
  const totalDuration = dynamicBlocks * 6 * 1000; // Convert blocks to milliseconds

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Payment Protection
          </CardTitle>
          <EscrowStateBadge state={state} />
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-4">
        {/* Amount */}
        <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
          <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-2">
            <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">Escrow Amount</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {amountFormatted} BZR
            </p>
          </div>
        </div>

        {/* Buyer */}
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-2">
            <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">Buyer</p>
            <p className="font-mono text-sm truncate" title={buyer}>
              {buyer}
            </p>
          </div>
        </div>

        {/* Seller */}
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-purple-100 dark:bg-purple-900/30 p-2">
            <User className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">Seller</p>
            <p className="font-mono text-sm truncate" title={seller}>
              {seller}
            </p>
          </div>
        </div>

        {/* Created At */}
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>Created at block #{createdAt.toLocaleString()}</span>
        </div>

        {/* Countdown Timer (Active only) */}
        {state === EscrowState.Active && showCountdown && !compact && (
          <div className="pt-2">
            <CountdownTimer
              targetTimestamp={autoReleaseTimestamp}
              totalDuration={totalDuration}
              showProgress={true}
            />
          </div>
        )}

        {/* Released/Refunded Info */}
        {state === EscrowState.Released && escrow.releasedAt && (
          <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-700 dark:text-green-300">
                Funds Released
              </p>
              <p className="text-xs text-green-600 dark:text-green-400">
                Block #{escrow.releasedAt.toLocaleString()}
              </p>
            </div>
          </div>
        )}

        {state === EscrowState.Refunded && escrow.refundedAt && (
          <div className="flex items-center gap-2 p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
            <XCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-orange-700 dark:text-orange-300">
                Buyer Refunded
              </p>
              <p className="text-xs text-orange-600 dark:text-orange-400">
                Block #{escrow.refundedAt.toLocaleString()}
              </p>
            </div>
          </div>
        )}

        {/* Dispute Info */}
        {state === EscrowState.Disputed && escrow.dispute && (
          <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-700 dark:text-red-300">
                Dispute Active
              </p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                Initiated by: {escrow.dispute.initiatedBy}
              </p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                Reason: {escrow.dispute.reason}
              </p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                Block: #{escrow.dispute.initiatedAt.toLocaleString()}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * EscrowStateBadge - Visual badge for escrow state
 */
function EscrowStateBadge({ state }: { state: EscrowState }) {
  const config = {
    [EscrowState.Active]: {
      label: 'Active',
      variant: 'default' as const,
      className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    },
    [EscrowState.Released]: {
      label: 'Released',
      variant: 'default' as const,
      className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    },
    [EscrowState.Refunded]: {
      label: 'Refunded',
      variant: 'default' as const,
      className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    },
    [EscrowState.Disputed]: {
      label: 'Disputed',
      variant: 'destructive' as const,
      className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    },
  };

  const { label, variant, className } = config[state];

  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  );
}

/**
 * EscrowCardSkeleton - Loading skeleton
 */
export function EscrowCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
        <div className="flex items-center justify-between">
          <div className="h-6 w-40 bg-muted animate-pulse rounded" />
          <div className="h-6 w-20 bg-muted animate-pulse rounded" />
        </div>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        <div className="h-20 bg-muted animate-pulse rounded-lg" />
        <div className="h-12 bg-muted animate-pulse rounded" />
        <div className="h-12 bg-muted animate-pulse rounded" />
        <div className="h-32 bg-muted animate-pulse rounded-lg" />
      </CardContent>
    </Card>
  );
}
