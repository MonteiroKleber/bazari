/**
 * CommissionAnalyticsPage - Seller commission analytics dashboard
 *
 * Displays comprehensive commission data for sellers:
 * - Total commissions paid
 * - This month's commissions
 * - Average commission per sale
 * - Top performing affiliate
 * - Commission trends chart
 * - Full commission history table
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TrendingUp, DollarSign, Users, Award, AlertCircle } from 'lucide-react';
import { CommissionChart } from '@/components/commerce/CommissionChart';
import { CommissionHistoryTable } from '@/components/commerce/CommissionHistoryTable';
import {
  useSellerCommissionStats,
  useCommissionTrends,
  useCommissionHistory,
} from '@/hooks/blockchain/useCommerce';
import { useWallet } from '@/modules/wallet';

export const CommissionAnalyticsPage = () => {
  const { address } = useWallet();
  const [days, setDays] = useState(30);

  // Fetch commission data
  const {
    data: stats,
    isLoading: statsLoading,
    isError: statsError,
  } = useSellerCommissionStats(address);

  const {
    data: trends,
    isLoading: trendsLoading,
    isError: trendsError,
  } = useCommissionTrends(address, days);

  const {
    data: history,
    isLoading: historyLoading,
    isError: historyError,
  } = useCommissionHistory(address);

  // Format currency
  const formatAmount = (amount: number) => {
    return `${(amount / 1e12).toFixed(2)} BZR`;
  };

  // Format percentage
  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  // Truncate address
  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
  };

  // Error state
  if (statsError || trendsError || historyError) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load commission data. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Loading state
  if (statsLoading || trendsLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-[400px] mb-8" />
        <Skeleton className="h-[600px]" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Commission Analytics
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Track your commission earnings and performance metrics
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Commissions Paid */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Commissions Paid
            </CardTitle>
            <DollarSign className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatAmount(stats?.totalPaid ?? 0)}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              All-time commission payments
            </p>
          </CardContent>
        </Card>

        {/* This Month */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              This Month
            </CardTitle>
            <TrendingUp className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatAmount(stats?.thisMonth ?? 0)}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {stats?.thisMonthCount ?? 0} sales this month
            </p>
          </CardContent>
        </Card>

        {/* Average Per Sale */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Avg Per Sale
            </CardTitle>
            <Award className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatAmount(stats?.avgPerSale ?? 0)}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Based on {stats?.totalSales ?? 0} sales
            </p>
          </CardContent>
        </Card>

        {/* Top Affiliate */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Top Affiliate
            </CardTitle>
            <Users className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold text-gray-900 dark:text-white font-mono mb-1">
              {stats?.topAffiliate
                ? truncateAddress(stats.topAffiliate.address)
                : 'No affiliates yet'}
            </div>
            {stats?.topAffiliate && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formatAmount(stats.topAffiliate.totalEarned)} earned
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Time Period Selector */}
      <div className="mb-6 flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Show trends for:
        </label>
        <div className="flex gap-2">
          {[7, 30, 90].map((period) => (
            <button
              key={period}
              onClick={() => setDays(period)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                days === period
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {period} days
            </button>
          ))}
        </div>
      </div>

      {/* Commission Trends Chart */}
      <CommissionChart
        data={trends ?? []}
        className="mb-8"
      />

      {/* Commission History Table */}
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Commission History
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Complete record of all commission payments
        </p>
      </div>

      {historyLoading ? (
        <Skeleton className="h-[600px]" />
      ) : (
        <CommissionHistoryTable
          commissions={history ?? []}
          showRecipient={true}
        />
      )}
    </div>
  );
};
