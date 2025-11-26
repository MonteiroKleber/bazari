import { useTranslation } from 'react-i18next';
import { useBlockchainCourier, useCourierReviews } from '../../hooks/useBlockchainQuery';

/**
 * CourierCard - Card de entregador com dados blockchain
 *
 * Features:
 * - Exibir stake, reputation score, areas de serviço
 * - Mostrar estatísticas (total deliveries, success rate)
 * - Exibir reviews com Merkle proof
 * - Status do entregador (active, inactive, suspended)
 */

export interface CourierCardProps {
  courierAddress: string;
  compact?: boolean;
  showReviews?: boolean;
  onViewProfile?: (address: string) => void;
}

export function CourierCard({
  courierAddress,
  compact = false,
  showReviews = false,
  onViewProfile,
}: CourierCardProps) {
  const { t } = useTranslation();

  const {
    data: courier,
    isLoading,
    isError,
  } = useBlockchainCourier(courierAddress);

  const {
    data: reviews,
    isLoading: isLoadingReviews,
  } = useCourierReviews(courierAddress, { limit: 5 });

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatStake = (stake: string | number | bigint) => {
    const stakeNum = typeof stake === 'bigint' ? Number(stake) : Number(stake);
    return (stakeNum / 1e12).toFixed(2); // Convert from planck to BZR
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'INACTIVE':
        return 'bg-gray-100 text-gray-800';
      case 'SUSPENDED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return t('blockchain.courier.status.active', 'Active');
      case 'INACTIVE':
        return t('blockchain.courier.status.inactive', 'Inactive');
      case 'SUSPENDED':
        return t('blockchain.courier.status.suspended', 'Suspended');
      default:
        return status;
    }
  };

  const calculateSuccessRate = (successful: number, total: number) => {
    if (total === 0) return 0;
    return ((successful / total) * 100).toFixed(1);
  };

  if (isLoading) {
    return (
      <div className="border rounded-lg p-4 animate-pulse">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 bg-gray-200 rounded-full"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !courier) {
    return (
      <div className="border rounded-lg p-4 bg-gray-50">
        <p className="text-sm text-gray-500">
          {t('blockchain.courier.notFound', 'Courier not found')}
        </p>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            <svg
              className="h-6 w-6 text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
          <div>
            <p className="font-medium text-gray-900 font-mono text-sm">
              {formatAddress(courierAddress)}
            </p>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>★ {courier.reputationScore}/100</span>
              <span>•</span>
              <span>
                {courier.successfulDeliveries}/{courier.totalDeliveries}{' '}
                {t('blockchain.courier.deliveries', 'deliveries')}
              </span>
            </div>
          </div>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(
            courier.status
          )}`}
        >
          {getStatusLabel(courier.status)}
        </span>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
            <svg
              className="h-8 w-8 text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 font-mono">
              {formatAddress(courierAddress)}
            </h3>
            <p className="text-sm text-gray-500">
              {t('blockchain.courier.title', 'Courier')}
            </p>
          </div>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(
            courier.status
          )}`}
        >
          {getStatusLabel(courier.status)}
        </span>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-xs font-medium text-gray-500 uppercase mb-1">
            {t('blockchain.courier.reputation', 'Reputation')}
          </p>
          <p className="text-2xl font-bold text-gray-900">{courier.reputationScore}</p>
          <p className="text-xs text-gray-500">/ 100</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-xs font-medium text-gray-500 uppercase mb-1">
            {t('blockchain.courier.stake', 'Stake')}
          </p>
          <p className="text-2xl font-bold text-gray-900">
            {formatStake(courier.stake)}
          </p>
          <p className="text-xs text-gray-500">BZR</p>
        </div>
      </div>

      {/* Delivery Stats */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">
            {t('blockchain.courier.totalDeliveries', 'Total Deliveries')}:
          </span>
          <span className="font-semibold text-gray-900">{courier.totalDeliveries}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">
            {t('blockchain.courier.successfulDeliveries', 'Successful')}:
          </span>
          <span className="font-semibold text-green-600">
            {courier.successfulDeliveries}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">
            {t('blockchain.courier.activeDeliveries', 'Active')}:
          </span>
          <span className="font-semibold text-blue-600">
            {courier.activeDeliveries}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">
            {t('blockchain.courier.successRate', 'Success Rate')}:
          </span>
          <span className="font-semibold text-gray-900">
            {calculateSuccessRate(courier.successfulDeliveries, courier.totalDeliveries)}%
          </span>
        </div>
      </div>

      {/* Service Areas */}
      {courier.serviceAreas && courier.serviceAreas.length > 0 && (
        <div className="border-t pt-4">
          <p className="text-sm font-medium text-gray-900 mb-2">
            {t('blockchain.courier.serviceAreas', 'Service Areas')}
          </p>
          <div className="flex flex-wrap gap-2">
            {courier.serviceAreas.map((areaId: number) => (
              <span
                key={areaId}
                className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700"
              >
                Area #{areaId}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Reviews Section */}
      {showReviews && (
        <div className="border-t pt-4 space-y-3">
          <p className="text-sm font-medium text-gray-900">
            {t('blockchain.courier.recentReviews', 'Recent Reviews')}
          </p>
          {isLoadingReviews ? (
            <div className="space-y-2">
              <div className="h-16 bg-gray-100 rounded animate-pulse"></div>
              <div className="h-16 bg-gray-100 rounded animate-pulse"></div>
            </div>
          ) : reviews && Array.isArray(reviews) && reviews.length > 0 ? (
            <div className="space-y-2">
              {reviews.slice(0, 3).map((review: any) => (
                <div
                  key={review.id}
                  className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <svg
                        key={i}
                        className={`h-4 w-4 ${
                          i < review.rating ? 'text-yellow-400' : 'text-gray-300'
                        }`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  {review.comment && (
                    <p className="text-sm text-gray-700 flex-1">{review.comment}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              {t('blockchain.courier.noReviews', 'No reviews yet')}
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      {onViewProfile && (
        <div className="border-t pt-4">
          <button
            onClick={() => onViewProfile(courierAddress)}
            className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {t('blockchain.courier.viewFullProfile', 'View Full Profile')}
          </button>
        </div>
      )}
    </div>
  );
}
