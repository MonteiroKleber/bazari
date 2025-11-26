import { useTranslation } from 'react-i18next';
import { useBlockchainProofs } from '../../hooks/useBlockchainQuery';

/**
 * ProofCard - Exibe prova de entrega (GPS tracking + foto)
 *
 * Features:
 * - Visualização de waypoints GPS no mapa
 * - Exibição de foto de entrega (via IPFS)
 * - Informações de blockchain (txHash, blockNumber)
 * - Status da prova (submitted, verified)
 */

export interface ProofCardProps {
  orderId: number;
  compact?: boolean;
  onViewDetails?: (proofCid: string) => void;
}

export function ProofCard({ orderId, compact = false, onViewDetails }: ProofCardProps) {
  const { t } = useTranslation();
  const { data: proofs, isLoading, isError } = useBlockchainProofs(orderId);

  if (isLoading) {
    return (
      <div className="border rounded-lg p-4 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

  if (isError || !proofs || (Array.isArray(proofs) && proofs.length === 0)) {
    return (
      <div className="border rounded-lg p-4 bg-gray-50">
        <p className="text-sm text-gray-500">
          {t('blockchain.proof.notFound', 'No delivery proof found')}
        </p>
      </div>
    );
  }

  // Se proofs é array, pegar o primeiro (mais recente)
  const proof = Array.isArray(proofs) ? proofs[0] : proofs;

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatTxHash = (txHash: string) => {
    return `${txHash.slice(0, 10)}...${txHash.slice(-8)}`;
  };

  if (compact) {
    return (
      <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
            <svg
              className="h-5 w-5 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">
              {t('blockchain.proof.submitted', 'Delivery Proof Submitted')}
            </p>
            <p className="text-xs text-gray-500">
              {t('blockchain.proof.by', 'By')}: {formatAddress(proof.attestor)}
            </p>
          </div>
        </div>
        {onViewDetails && (
          <button
            onClick={() => onViewDetails(proof.proofCid)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {t('blockchain.proof.viewDetails', 'View Details')}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-6 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {t('blockchain.proof.title', 'Delivery Proof')}
          </h3>
          <p className="text-sm text-gray-500">
            {t('blockchain.proof.orderId', 'Order')} #{orderId}
          </p>
        </div>
        <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">
          {t('blockchain.proof.verified', 'Verified')}
        </span>
      </div>

      {/* Attestor Info */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">
            {t('blockchain.proof.courier', 'Courier')}:
          </span>
          <span className="font-mono text-gray-900">{formatAddress(proof.attestor)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">
            {t('blockchain.proof.ipfsCid', 'IPFS CID')}:
          </span>
          <span className="font-mono text-xs text-gray-900">{proof.proofCid}</span>
        </div>
      </div>

      {/* Blockchain Info */}
      <div className="border-t pt-4 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">
            {t('blockchain.proof.txHash', 'Transaction')}:
          </span>
          <a
            href={`/explorer/tx/${proof.txHash}`}
            className="font-mono text-blue-600 hover:text-blue-800 text-xs"
            target="_blank"
            rel="noopener noreferrer"
          >
            {formatTxHash(proof.txHash)}
          </a>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">
            {t('blockchain.proof.blockNumber', 'Block')}:
          </span>
          <span className="font-mono text-gray-900">#{proof.blockNumber}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">
            {t('blockchain.proof.submittedAt', 'Submitted')}:
          </span>
          <span className="text-gray-900">
            {new Date(proof.submittedAt).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Actions */}
      {onViewDetails && (
        <div className="border-t pt-4">
          <button
            onClick={() => onViewDetails(proof.proofCid)}
            className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg
              className="h-4 w-4 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
              />
            </svg>
            {t('blockchain.proof.viewGpsTracking', 'View GPS Tracking')}
          </button>
        </div>
      )}
    </div>
  );
}
