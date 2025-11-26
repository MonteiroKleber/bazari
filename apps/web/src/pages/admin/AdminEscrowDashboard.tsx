import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Shield,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { useActiveEscrows, useEscrowsNearAutoRelease } from '@/hooks/blockchain/useEscrow';
import { useIsDAOMember } from '@/hooks/useIsDAOMember';
import { useBlockchainQuery } from '@/hooks/useBlockchainQuery';
import { AdminEscrowBreadcrumbs } from '@/components/escrow/EscrowBreadcrumbs';
import { CountdownTimer } from '@/components/blockchain/CountdownTimer';
import { EscrowState } from '@/hooks/blockchain/useEscrow';

/**
 * AdminEscrowDashboard - DAO member dashboard for escrow management
 *
 * Route: /app/admin/escrows
 *
 * Features:
 * - Tab 1: All Active Escrows
 * - Tab 2: Urgent (near auto-release <24h)
 * - Tab 3: Disputed Escrows
 * - Quick actions: View details, Refund
 *
 * Permissions:
 * - Only accessible to DAO members
 * - If not DAO member, show access denied
 *
 * @example
 * // Route in App.tsx
 * <Route path="/app/admin/escrows" element={<AdminEscrowDashboard />} />
 */

export default function AdminEscrowDashboard() {
  const isDAOMember = useIsDAOMember();
  const [activeTab, setActiveTab] = useState<string>('all');

  const { data: activeEscrows, isLoading: loadingActive } = useActiveEscrows();
  const { data: urgentEscrows, isLoading: loadingUrgent } = useEscrowsNearAutoRelease();

  const { data: blockData } = useBlockchainQuery<{ currentBlock: number }>({
    endpoint: '/api/blockchain/current-block',
    refetchInterval: 6000, // Update every block
  });

  const currentBlock = blockData?.currentBlock ?? 0;

  // Filter disputed escrows
  const disputedEscrows = activeEscrows?.filter(
    (e) => e.state === EscrowState.Disputed
  ) ?? [];

  // Access denied for non-DAO members
  if (!isDAOMember) {
    return (
      <div className="container max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Shield className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">
              You need to be a DAO member to access this page.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Breadcrumbs */}
      <AdminEscrowBreadcrumbs />

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Shield className="h-8 w-8" />
          Admin Escrow Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage payment protection and resolve disputes
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Escrows
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {loadingActive ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                activeEscrows?.length ?? 0
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 dark:border-orange-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-orange-600 dark:text-orange-400 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Urgent (&lt;24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
              {loadingUrgent ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                urgentEscrows?.length ?? 0
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 dark:border-red-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Disputed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600 dark:text-red-400">
              {loadingActive ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                disputedEscrows.length
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">All Active</TabsTrigger>
          <TabsTrigger value="urgent">Urgent</TabsTrigger>
          <TabsTrigger value="disputed">Disputed</TabsTrigger>
        </TabsList>

        {/* All Active Escrows */}
        <TabsContent value="all" className="space-y-4">
          {loadingActive ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-muted-foreground mt-2">Loading escrows...</p>
            </div>
          ) : activeEscrows && activeEscrows.length > 0 ? (
            activeEscrows.map((escrow) => (
              <EscrowListItem
                key={escrow.orderId}
                escrow={escrow}
                currentBlock={currentBlock}
              />
            ))
          ) : (
            <div className="text-center py-12">
              <CheckCircle2 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No active escrows</p>
            </div>
          )}
        </TabsContent>

        {/* Urgent Escrows */}
        <TabsContent value="urgent" className="space-y-4">
          {loadingUrgent ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-muted-foreground mt-2">Loading urgent escrows...</p>
            </div>
          ) : urgentEscrows && urgentEscrows.length > 0 ? (
            urgentEscrows.map((escrow) => (
              <EscrowListItem
                key={escrow.orderId}
                escrow={escrow}
                currentBlock={currentBlock}
                urgent
              />
            ))
          ) : (
            <div className="text-center py-12">
              <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No urgent escrows</p>
            </div>
          )}
        </TabsContent>

        {/* Disputed Escrows */}
        <TabsContent value="disputed" className="space-y-4">
          {loadingActive ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-muted-foreground mt-2">Loading disputed escrows...</p>
            </div>
          ) : disputedEscrows.length > 0 ? (
            disputedEscrows.map((escrow) => (
              <EscrowListItem
                key={escrow.orderId}
                escrow={escrow}
                currentBlock={currentBlock}
                disputed
              />
            ))
          ) : (
            <div className="text-center py-12">
              <CheckCircle2 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No disputed escrows</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

/**
 * EscrowListItem - Single escrow in the list
 */
interface EscrowListItemProps {
  escrow: any;
  currentBlock: number;
  urgent?: boolean;
  disputed?: boolean;
}

function EscrowListItem({
  escrow,
  currentBlock,
  urgent = false,
  disputed = false,
}: EscrowListItemProps) {
  const blocksUntilRelease = escrow.autoReleaseAt - currentBlock;
  const secondsUntilRelease = blocksUntilRelease * 6;
  const autoReleaseTimestamp = Date.now() + secondsUntilRelease * 1000;

  return (
    <Card
      className={
        disputed
          ? 'border-red-200 dark:border-red-800'
          : urgent
          ? 'border-orange-200 dark:border-orange-800'
          : ''
      }
    >
      <CardContent className="pt-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Left: Order Info */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg">{escrow.orderId}</h3>
              <Badge
                variant={disputed ? 'destructive' : 'default'}
                className={
                  disputed
                    ? ''
                    : urgent
                    ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                }
              >
                {disputed ? 'Disputed' : urgent ? 'Urgent' : 'Active'}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Amount:</span>{' '}
                <span className="font-semibold text-green-600 dark:text-green-400">
                  {escrow.amountFormatted} BZR
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Block:</span>{' '}
                <span className="font-mono text-xs">
                  #{escrow.createdAt.toLocaleString()}
                </span>
              </div>
            </div>

            {disputed && escrow.dispute && (
              <div className="mt-2 p-2 bg-red-50 dark:bg-red-950/20 rounded border border-red-200 dark:border-red-800">
                <p className="text-sm font-medium text-red-700 dark:text-red-300">
                  Reason: {escrow.dispute.reason}
                </p>
              </div>
            )}
          </div>

          {/* Right: Countdown & Actions */}
          <div className="flex flex-col gap-3 md:items-end md:w-64">
            {escrow.state === EscrowState.Active && (
              <CountdownTimer
                targetTimestamp={autoReleaseTimestamp}
                compact={true}
              />
            )}

            <Link to={`/app/orders/${escrow.orderId}/escrow`}>
              <Button variant="outline" size="sm" className="w-full md:w-auto">
                View Details
                <ExternalLink className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
