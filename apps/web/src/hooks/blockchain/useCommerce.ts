/**
 * useCommerce - Blockchain hooks for bazari-commerce pallet
 *
 * Hooks for querying sales and commission data from blockchain
 *
 * Used for:
 * - Commission tracking
 * - Sale details
 * - Commission analytics
 */

import { useBlockchainQuery } from '../useBlockchainQuery';

/**
 * Sale data structure from blockchain
 */
export interface Sale {
  id: number;
  orderId: number;
  seller: string;
  buyer: string;
  amount: number;
  commissionPaid: number;
  createdAt: number;
}

/**
 * Commission entry structure
 */
export interface CommissionEntry {
  recipient: string;
  amount: number;
  type: 'platform' | 'affiliate' | 'seller';
  percentage: number;
  level?: number;
  timestamp?: number;
  txHash?: string;
}

/**
 * useSale - Get sale details by ID
 *
 * Queries the blockchain for sale information including commission data
 *
 * @param saleId - Blockchain sale ID
 * @returns Sale data or null
 *
 * @example
 * const { data: sale, isLoading } = useSale(123);
 */
export function useSale(saleId?: number) {
  return useBlockchainQuery<Sale | null>({
    endpoint: `/api/blockchain/sales/${saleId}`,
    enabled: !!saleId && saleId > 0,
  });
}

/**
 * useSaleCommissions - Get commission history for a sale
 *
 * Fetches all CommissionRecorded events for a specific sale
 *
 * @param saleId - Blockchain sale ID
 * @returns Array of commission entries
 *
 * @example
 * const { data: commissions } = useSaleCommissions(123);
 */
export function useSaleCommissions(saleId?: number) {
  return useBlockchainQuery<CommissionEntry[]>({
    endpoint: `/api/sales/${saleId}/commissions`,
    enabled: !!saleId && saleId > 0,
  });
}

/**
 * useSellerCommissionStats - Get commission statistics for a seller
 *
 * Aggregated commission data for analytics
 *
 * @param sellerAddress - Seller blockchain address
 * @returns Commission statistics
 *
 * @example
 * const { data: stats } = useSellerCommissionStats('5GrwvaEF...');
 */
export function useSellerCommissionStats(sellerAddress?: string) {
  return useBlockchainQuery<{
    totalPaid: number;
    thisMonth: number;
    avgPerSale: number;
    topAffiliate: string;
    totalSales: number;
  }>({
    endpoint: `/api/seller/${sellerAddress}/commission-stats`,
    enabled: !!sellerAddress,
    refetchInterval: 60000, // 1 minute
  });
}

/**
 * useCommissionHistory - Get commission history for a seller
 *
 * All commission payments made by a seller
 *
 * @param sellerAddress - Seller blockchain address
 * @param options - Query options (limit, offset)
 * @returns Array of commission entries
 *
 * @example
 * const { data: history } = useCommissionHistory('5GrwvaEF...', { limit: 50 });
 */
export function useCommissionHistory(
  sellerAddress?: string,
  options?: { limit?: number; offset?: number }
) {
  const params = new URLSearchParams();
  if (options?.limit) params.set('limit', options.limit.toString());
  if (options?.offset) params.set('offset', options.offset.toString());

  return useBlockchainQuery<CommissionEntry[]>({
    endpoint: `/api/seller/${sellerAddress}/commissions?${params.toString()}`,
    enabled: !!sellerAddress,
  });
}

/**
 * useCommissionTrends - Get commission trends over time
 *
 * Time-series data for charts
 *
 * @param sellerAddress - Seller blockchain address
 * @param days - Number of days to fetch (default: 30)
 * @returns Array of daily commission data
 *
 * @example
 * const { data: trends } = useCommissionTrends('5GrwvaEF...', 30);
 */
export function useCommissionTrends(sellerAddress?: string, days: number = 30) {
  return useBlockchainQuery<Array<{
    date: string;
    total: number;
    platform: number;
    affiliate: number;
    count: number;
  }>>({
    endpoint: `/api/seller/${sellerAddress}/commission-trends?days=${days}`,
    enabled: !!sellerAddress,
    refetchInterval: 300000, // 5 minutes
  });
}
