import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Wallet,
} from 'lucide-react';
import {
  usePrepareRelease,
  usePrepareRefund,
  useInitiateDispute,
  EscrowDetails,
  EscrowState,
} from '@/hooks/blockchain/useEscrow';
import { toast } from 'sonner';

/**
 * EscrowActions - Conditional action buttons based on user role
 *
 * Buyer Actions (if user is buyer):
 * - Release Funds (Active state only)
 * - Initiate Dispute (Active state only)
 *
 * Seller Actions (if user is seller):
 * - Initiate Dispute (Active state only)
 *
 * DAO Actions (if user is DAO member):
 * - Refund Buyer (Active or Disputed state)
 *
 * @example
 * const { data: escrow } = useEscrowDetails("ORD-123");
 * const { profile } = useAuth();
 * const isDAOMember = useIsDAOMember();
 *
 * <EscrowActions
 *   escrow={escrow}
 *   userAddress={profile.user.address}
 *   isDAOMember={isDAOMember}
 *   onSuccess={() => refetch()}
 * />
 */

interface EscrowActionsProps {
  /** Escrow details */
  escrow: EscrowDetails;

  /** Current user's blockchain address */
  userAddress: string;

  /** Is user a DAO member? */
  isDAOMember: boolean;

  /** Callback after successful action */
  onSuccess?: () => void;

  /** Custom className */
  className?: string;
}

export function EscrowActions({
  escrow,
  userAddress,
  isDAOMember,
  onSuccess,
  className,
}: EscrowActionsProps) {
  // Use new prepare+sign hooks for on-chain transactions
  const {
    prepareRelease,
    signAndSend: signAndSendRelease,
    isLoading: isReleasing,
    isPreparing: isPreparingRelease,
    isSigning: isSigningRelease,
  } = usePrepareRelease();

  const {
    prepareRefund,
    signAndSend: signAndSendRefund,
    isLoading: isRefunding,
    isPreparing: isPreparingRefund,
    isSigning: isSigningRefund,
  } = usePrepareRefund();

  const { initiateDispute, isLoading: isDisputing } = useInitiateDispute();

  const [disputeReason, setDisputeReason] = useState('');
  const [disputeDialogOpen, setDisputeDialogOpen] = useState(false);
  const [releaseDialogOpen, setReleaseDialogOpen] = useState(false);
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);

  const isBuyer = userAddress === escrow.buyer;
  const isSeller = userAddress === escrow.seller;
  const canAct = escrow.state === EscrowState.Active;
  const canRefund =
    isDAOMember &&
    (escrow.state === EscrowState.Active ||
      escrow.state === EscrowState.Disputed);

  // Handle Release Funds with prepare+sign pattern
  const handleRelease = async () => {
    try {
      // Step 1: Prepare transaction (get callHex from backend)
      toast.info('Preparing transaction...', { id: 'release-prepare' });
      const prepared = await prepareRelease(escrow.orderId);

      if (!prepared) {
        toast.error('Failed to prepare release transaction.', { id: 'release-prepare' });
        return;
      }

      // Step 2: Sign with polkadot-js extension
      toast.info('Please sign the transaction in your wallet...', { id: 'release-sign' });
      const result = await signAndSendRelease(prepared);

      if (result.success) {
        toast.success(`Funds released to seller! TX: ${result.txHash?.slice(0, 10)}...`, { id: 'release-sign' });
        setReleaseDialogOpen(false);
        onSuccess?.();
      } else {
        toast.error(`Release failed: ${result.error}`, { id: 'release-sign' });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to release funds: ${message}`);
      console.error('Release failed:', error);
    }
  };

  // Handle Refund Buyer with prepare+sign pattern
  const handleRefund = async () => {
    try {
      // Step 1: Prepare transaction
      toast.info('Preparing refund transaction...', { id: 'refund-prepare' });
      const prepared = await prepareRefund(escrow.orderId);

      if (!prepared) {
        toast.error('Failed to prepare refund transaction.', { id: 'refund-prepare' });
        return;
      }

      // Step 2: Sign with polkadot-js extension
      toast.info('Please sign the transaction in your wallet...', { id: 'refund-sign' });
      const result = await signAndSendRefund(prepared);

      if (result.success) {
        toast.success(`Buyer refunded! TX: ${result.txHash?.slice(0, 10)}...`, { id: 'refund-sign' });
        setRefundDialogOpen(false);
        onSuccess?.();
      } else {
        toast.error(`Refund failed: ${result.error}`, { id: 'refund-sign' });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to refund buyer: ${message}`);
      console.error('Refund failed:', error);
    }
  };

  // Handle Initiate Dispute
  const handleDispute = async () => {
    if (!disputeReason.trim()) {
      toast.error('Please provide a reason for the dispute.');
      return;
    }

    try {
      await initiateDispute(escrow.orderId, disputeReason);
      toast.success('Dispute initiated. DAO will review your case.');
      setDisputeDialogOpen(false);
      setDisputeReason('');
      onSuccess?.();
    } catch (error) {
      toast.error('Failed to initiate dispute. Please try again.');
      console.error('Dispute failed:', error);
    }
  };

  return (
    <div className={className}>
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Buyer Actions */}
        {isBuyer && canAct && (
          <>
            {/* Release Funds */}
            <AlertDialog open={releaseDialogOpen} onOpenChange={setReleaseDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="default"
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  disabled={isReleasing}
                >
                  {isReleasing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                  )}
                  {isPreparingRelease
                    ? 'Preparing...'
                    : isSigningRelease
                    ? 'Sign in Wallet...'
                    : 'Release Funds to Seller'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Release Funds?</AlertDialogTitle>
                  <AlertDialogDescription className="space-y-2">
                    <p>
                      This will transfer <strong>{escrow.amountFormatted} BZR</strong> to the seller.
                      This action cannot be undone.
                    </p>
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Wallet className="h-4 w-4" />
                      You will be asked to sign this transaction with your wallet.
                    </p>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isReleasing}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleRelease}
                    className="bg-green-600 hover:bg-green-700"
                    disabled={isReleasing}
                  >
                    {isReleasing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Confirm Release'
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Initiate Dispute */}
            <AlertDialog
              open={disputeDialogOpen}
              onOpenChange={setDisputeDialogOpen}
            >
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  className="flex-1"
                  disabled={isDisputing}
                >
                  {isDisputing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 mr-2" />
                  )}
                  Open Dispute
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Initiate Dispute</AlertDialogTitle>
                  <AlertDialogDescription>
                    Describe the issue with this order. The DAO will review your
                    case.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="py-4">
                  <Label htmlFor="dispute-reason">Dispute Reason</Label>
                  <Textarea
                    id="dispute-reason"
                    placeholder="Explain what went wrong..."
                    value={disputeReason}
                    onChange={(e) => setDisputeReason(e.target.value)}
                    className="mt-2"
                    rows={4}
                  />
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setDisputeReason('')}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDispute}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Submit Dispute
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}

        {/* Seller Actions */}
        {isSeller && canAct && (
          <AlertDialog
            open={disputeDialogOpen}
            onOpenChange={setDisputeDialogOpen}
          >
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                className="flex-1"
                disabled={isDisputing}
              >
                {isDisputing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <AlertTriangle className="h-4 w-4 mr-2" />
                )}
                Open Dispute
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Initiate Dispute</AlertDialogTitle>
                <AlertDialogDescription>
                  Describe the issue with this order. The DAO will review your
                  case.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="py-4">
                <Label htmlFor="dispute-reason">Dispute Reason</Label>
                <Textarea
                  id="dispute-reason"
                  placeholder="Explain what went wrong..."
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  className="mt-2"
                  rows={4}
                />
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDisputeReason('')}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDispute}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Submit Dispute
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {/* DAO Actions */}
        {canRefund && (
          <AlertDialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                className="flex-1 border-orange-500 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/20"
                disabled={isRefunding}
              >
                {isRefunding ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4 mr-2" />
                )}
                {isPreparingRefund
                  ? 'Preparing...'
                  : isSigningRefund
                  ? 'Sign in Wallet...'
                  : 'Refund Buyer (DAO)'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Refund Buyer?</AlertDialogTitle>
                <AlertDialogDescription className="space-y-2">
                  <p>
                    This will return <strong>{escrow.amountFormatted} BZR</strong> to the buyer.
                    This action cannot be undone. Use this only after reviewing the dispute.
                  </p>
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Wallet className="h-4 w-4" />
                    You will be asked to sign this transaction with your wallet.
                  </p>
                  <p className="text-xs text-orange-600 bg-orange-50 dark:bg-orange-950/20 p-2 rounded">
                    Note: This action requires DAO Origin. May need council multisig approval.
                  </p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isRefunding}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleRefund}
                  className="bg-orange-600 hover:bg-orange-700"
                  disabled={isRefunding}
                >
                  {isRefunding ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Confirm Refund'
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {/* No Actions Available */}
        {!isBuyer && !isSeller && !canRefund && (
          <div className="text-sm text-muted-foreground text-center py-4">
            No actions available for this escrow.
          </div>
        )}
      </div>
    </div>
  );
}
