/**
 * SaleDetailPage - Individual sale details view
 *
 * Displays comprehensive information about a single sale:
 * - Sale overview (order ID, buyer, seller, amounts)
 * - Commission breakdown with multi-level affiliates
 * - Link to full order details
 * - Transaction information
 */

import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ArrowLeft,
  ExternalLink,
  Calendar,
  User,
  ShoppingCart,
  DollarSign,
  AlertCircle,
} from 'lucide-react';
import { CommissionBreakdown } from '@/components/commerce/CommissionBreakdown';
import { useSale, useSaleCommissions } from '@/hooks/blockchain/useCommerce';

export const SaleDetailPage = () => {
  const { saleId } = useParams<{ saleId: string }>();
  const saleIdNum = saleId ? parseInt(saleId, 10) : null;

  // Fetch sale data
  const {
    data: sale,
    isLoading: saleLoading,
    isError: saleError,
  } = useSale(saleIdNum ?? undefined);

  const {
    data: commissions,
    isLoading: commissionsLoading,
    isError: commissionsError,
  } = useSaleCommissions(saleIdNum ?? undefined);

  // Format currency
  const formatAmount = (amount: number) => {
    return `${(amount / 1e12).toFixed(2)} BZR`;
  };

  // Format date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Truncate address
  const truncateAddress = (address: string) => {
    return `${address.slice(0, 12)}...${address.slice(-10)}`;
  };

  // Error state
  if (saleError || commissionsError) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load sale details. The sale may not exist or there was an error connecting to the blockchain.
          </AlertDescription>
        </Alert>
        <Link to="/app/seller/commissions">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Commissions
          </Button>
        </Link>
      </div>
    );
  }

  // Loading state
  if (saleLoading || commissionsLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Skeleton className="h-10 w-64 mb-8" />
        <Skeleton className="h-[400px] mb-6" />
        <Skeleton className="h-[300px]" />
      </div>
    );
  }

  // No sale found
  if (!sale) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Sale #{saleId} not found.
          </AlertDescription>
        </Alert>
        <Link to="/app/seller/commissions">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Commissions
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <Link to="/app/seller/commissions">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Commissions
          </Button>
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Sale #{sale.id}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Detailed breakdown of sale and commission payments
            </p>
          </div>
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-lg px-4 py-2">
            Completed
          </Badge>
        </div>
      </div>

      {/* Sale Overview */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Sale Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Order ID */}
          <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <ShoppingCart className="h-4 w-4" />
              <span className="font-medium">Order ID</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-semibold text-gray-900 dark:text-white">
                #{sale.orderId}
              </span>
              <Link to={`/app/orders/${sale.orderId}`}>
                <Button variant="ghost" size="sm">
                  View Order
                  <ExternalLink className="ml-1 h-3 w-3" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Seller */}
          <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <User className="h-4 w-4" />
              <span className="font-medium">Seller</span>
            </div>
            <span className="font-mono text-sm text-gray-900 dark:text-white">
              {truncateAddress(sale.seller)}
            </span>
          </div>

          {/* Buyer */}
          <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <User className="h-4 w-4" />
              <span className="font-medium">Buyer</span>
            </div>
            <span className="font-mono text-sm text-gray-900 dark:text-white">
              {truncateAddress(sale.buyer)}
            </span>
          </div>

          {/* Sale Amount */}
          <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <DollarSign className="h-4 w-4" />
              <span className="font-medium">Sale Amount</span>
            </div>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatAmount(sale.amount)}
            </span>
          </div>

          {/* Total Commissions */}
          <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <DollarSign className="h-4 w-4" />
              <span className="font-medium">Total Commissions</span>
            </div>
            <span className="text-xl font-bold text-purple-600 dark:text-purple-400">
              {formatAmount(sale.commissionPaid)}
            </span>
          </div>

          {/* Sale Date */}
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <Calendar className="h-4 w-4" />
              <span className="font-medium">Sale Date</span>
            </div>
            <span className="text-gray-900 dark:text-white">
              {formatDate(sale.createdAt)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Commission Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Commission Breakdown
          </CardTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Detailed breakdown of all commission payments for this sale
          </p>
        </CardHeader>
        <CardContent>
          {commissions && commissions.length > 0 ? (
            <CommissionBreakdown
              totalAmount={sale.amount}
              commissions={commissions}
              expandable={false}
              showPercentages={true}
            />
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <p>No commission breakdown available for this sale.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Additional Actions */}
      <div className="mt-8 flex gap-4">
        <Link to={`/app/orders/${sale.orderId}`} className="flex-1">
          <Button variant="outline" className="w-full">
            <ShoppingCart className="mr-2 h-4 w-4" />
            View Full Order Details
          </Button>
        </Link>
        <Link to="/app/seller/commissions" className="flex-1">
          <Button variant="outline" className="w-full">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to All Commissions
          </Button>
        </Link>
      </div>
    </div>
  );
};
