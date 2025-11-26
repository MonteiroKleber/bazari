import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { useEscrowDetails } from '@/hooks/blockchain/useEscrow';
import { useIsDAOMember } from '@/hooks/useIsDAOMember';
import { useBlockchainQuery } from '@/hooks/useBlockchainQuery';
import { EscrowBreadcrumbs } from '@/components/escrow/EscrowBreadcrumbs';
import { EscrowCard } from '@/components/escrow/EscrowCard';
import { EscrowActions } from '@/components/escrow/EscrowActions';
import { EscrowEventsLog } from '@/components/escrow/EscrowEventsLog';

/**
 * EscrowManagementPage - Full escrow details and management
 *
 * Route: /app/orders/:orderId/escrow
 *
 * Features:
 * - Breadcrumb navigation
 * - Back button to order page
 * - EscrowCard with countdown
 * - EscrowActions (Release/Refund/Dispute)
 * - EscrowEventsLog (real-time updates)
 *
 * Permissions:
 * - Buyer can release or dispute
 * - Seller can dispute
 * - DAO can refund
 *
 * @example
 * // Route in App.tsx
 * <Route path="/app/orders/:orderId/escrow" element={<EscrowManagementPage />} />
 */

export default function EscrowManagementPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const isDAOMember = useIsDAOMember();

  // Get current block number for countdown
  const { data: blockData } = useBlockchainQuery<{ currentBlock: number }>({
    endpoint: '/api/blockchain/current-block',
    refetchInterval: 6000, // Update every block (6s)
  });

  // Get current user's blockchain address
  const { data: userData } = useBlockchainQuery<{ address: string }>({
    endpoint: '/api/blockchain/user/address',
  });

  // Get escrow details
  const {
    data: escrow,
    isLoading,
    error,
    refetch,
  } = useEscrowDetails(orderId);

  const currentBlock = blockData?.currentBlock ?? 0;
  const userAddress = userData?.address ?? '';

  // Loading state
  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary mb-4" />
            <p className="text-muted-foreground">Loading escrow details...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
            <h2 className="text-2xl font-bold mb-2">Failed to Load Escrow</h2>
            <p className="text-muted-foreground mb-4">
              There was an error loading the escrow details.
            </p>
            <Button onClick={() => refetch()} variant="outline">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // No escrow found
  if (!escrow) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold mb-2">No Escrow Found</h2>
            <p className="text-muted-foreground mb-4">
              This order does not have payment protection enabled.
            </p>
            <Button onClick={() => navigate(`/app/orders/${orderId}`)} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Order
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Breadcrumbs */}
      <EscrowBreadcrumbs orderId={orderId!} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Payment Protection</h1>
          <p className="text-muted-foreground mt-1">
            Manage escrow for order {orderId}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate(`/app/orders/${orderId}`)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Order
        </Button>
      </div>

      {/* Escrow Card */}
      <EscrowCard
        escrow={escrow}
        currentBlock={currentBlock}
        showCountdown={true}
      />

      {/* Actions */}
      <div className="bg-card border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Actions</h2>
        <EscrowActions
          escrow={escrow}
          userAddress={userAddress}
          isDAOMember={isDAOMember}
          onSuccess={() => refetch()}
        />
      </div>

      {/* Events Log */}
      <EscrowEventsLog orderId={orderId} />

      {/* Help Text */}
      <div className="bg-muted/50 border rounded-lg p-4 text-sm space-y-2">
        <h3 className="font-semibold">How Payment Protection Works</h3>
        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
          <li>
            <strong>Buyer:</strong> Release funds when satisfied, or open dispute if issue occurs
          </li>
          <li>
            <strong>Seller:</strong> Wait for buyer to release, or open dispute if needed
          </li>
          <li>
            <strong>Auto-release:</strong> Funds automatically released to seller after 7 days
          </li>
          <li>
            <strong>DAO:</strong> Can refund buyer if dispute is valid
          </li>
        </ul>
      </div>
    </div>
  );
}
