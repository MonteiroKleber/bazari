import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useBlockchainDispute } from '../../hooks/useBlockchainQuery';
import { useOpenDispute } from '../../hooks/useBlockchainTx';

/**
 * DisputePanel - Painel para gerenciar disputas
 *
 * Features:
 * - Abrir nova disputa
 * - Visualizar disputa existente
 * - Exibir status da disputa (OPENED, VOTING, RESOLVED)
 * - Mostrar jurados e votos (quando disponível)
 * - Upload de evidências para IPFS
 */

export interface DisputePanelProps {
  orderId: number;
  disputeId?: number | null;
  userAddress?: string;
  onDisputeCreated?: (disputeId: number) => void;
}

export function DisputePanel({
  orderId,
  disputeId,
  userAddress,
  onDisputeCreated,
}: DisputePanelProps) {
  const { t } = useTranslation();
  const [isCreating, setIsCreating] = useState(false);
  const [evidenceCid, setEvidenceCid] = useState<string>('');
  const [defendant, setDefendant] = useState<string>('');

  // Query para buscar disputa existente
  const {
    data: dispute,
    isLoading: isLoadingDispute,
    refetch,
  } = useBlockchainDispute(disputeId);

  // Mutation para abrir disputa
  const { openDispute, isLoading: isSubmitting, isSuccess, error } = useOpenDispute({
    onSuccess: (data) => {
      setIsCreating(false);
      refetch();
      if (onDisputeCreated && data.disputeId) {
        onDisputeCreated(data.disputeId);
      }
    },
  });

  const handleSubmitDispute = async () => {
    if (!userAddress || !defendant || !evidenceCid) {
      return;
    }

    await openDispute({
      orderId,
      plaintiff: userAddress,
      defendant,
      evidenceCid,
    });
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPENED':
        return 'bg-yellow-100 text-yellow-800';
      case 'VOTING':
        return 'bg-blue-100 text-blue-800';
      case 'RESOLVED':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'OPENED':
        return t('blockchain.dispute.status.opened', 'Opened');
      case 'VOTING':
        return t('blockchain.dispute.status.voting', 'In Voting');
      case 'RESOLVED':
        return t('blockchain.dispute.status.resolved', 'Resolved');
      default:
        return status;
    }
  };

  // Se existe disputeId, mostrar disputa existente
  if (disputeId && !isCreating) {
    if (isLoadingDispute) {
      return (
        <div className="border rounded-lg p-6 animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      );
    }

    if (!dispute) {
      return (
        <div className="border rounded-lg p-6 bg-gray-50">
          <p className="text-sm text-gray-500">
            {t('blockchain.dispute.notFound', 'Dispute not found')}
          </p>
        </div>
      );
    }

    return (
      <div className="border rounded-lg p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {t('blockchain.dispute.title', 'Dispute')} #{dispute.disputeId}
            </h3>
            <p className="text-sm text-gray-500">
              {t('blockchain.dispute.forOrder', 'For Order')} #{orderId}
            </p>
          </div>
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(
              dispute.status
            )}`}
          >
            {getStatusLabel(dispute.status)}
          </span>
        </div>

        {/* Parties */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-500 uppercase">
              {t('blockchain.dispute.plaintiff', 'Plaintiff')}
            </p>
            <p className="font-mono text-sm text-gray-900">
              {formatAddress(dispute.plaintiff)}
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-500 uppercase">
              {t('blockchain.dispute.defendant', 'Defendant')}
            </p>
            <p className="font-mono text-sm text-gray-900">
              {formatAddress(dispute.defendant)}
            </p>
          </div>
        </div>

        {/* Blockchain Info */}
        <div className="border-t pt-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">
              {t('blockchain.dispute.txHash', 'Transaction')}:
            </span>
            <a
              href={`/explorer/tx/${dispute.txHash}`}
              className="font-mono text-blue-600 hover:text-blue-800 text-xs"
              target="_blank"
              rel="noopener noreferrer"
            >
              {dispute.txHash.slice(0, 10)}...{dispute.txHash.slice(-8)}
            </a>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">
              {t('blockchain.dispute.blockNumber', 'Block')}:
            </span>
            <span className="font-mono text-gray-900">#{dispute.blockNumber}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">
              {t('blockchain.dispute.createdAt', 'Created')}:
            </span>
            <span className="text-gray-900">
              {new Date(dispute.createdAt).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Evidence (if available) */}
        {dispute.evidenceCid && (
          <div className="border-t pt-4">
            <p className="text-sm font-medium text-gray-900 mb-2">
              {t('blockchain.dispute.evidence', 'Evidence')}
            </p>
            <a
              href={`https://ipfs.io/ipfs/${dispute.evidenceCid}`}
              className="text-sm text-blue-600 hover:text-blue-800 font-mono break-all"
              target="_blank"
              rel="noopener noreferrer"
            >
              {dispute.evidenceCid}
            </a>
          </div>
        )}
      </div>
    );
  }

  // Formulário para abrir disputa
  return (
    <div className="border rounded-lg p-6 space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900">
          {t('blockchain.dispute.openDispute', 'Open Dispute')}
        </h3>
        <p className="text-sm text-gray-500">
          {t('blockchain.dispute.forOrder', 'For Order')} #{orderId}
        </p>
      </div>

      {/* Form */}
      <div className="space-y-4">
        <div>
          <label
            htmlFor="defendant"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {t('blockchain.dispute.defendantAddress', 'Defendant Address')}
          </label>
          <input
            type="text"
            id="defendant"
            value={defendant}
            onChange={(e) => setDefendant(e.target.value)}
            placeholder="5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label
            htmlFor="evidence"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {t('blockchain.dispute.evidenceCid', 'Evidence IPFS CID')}
          </label>
          <input
            type="text"
            id="evidence"
            value={evidenceCid}
            onChange={(e) => setEvidenceCid(e.target.value)}
            placeholder="QmXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
            disabled={isSubmitting}
          />
          <p className="mt-1 text-xs text-gray-500">
            {t(
              'blockchain.dispute.evidenceHelp',
              'Upload evidence to IPFS and paste the CID here'
            )}
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error.message}</p>
        </div>
      )}

      {/* Success */}
      {isSuccess && (
        <div className="rounded-md bg-green-50 p-4">
          <p className="text-sm text-green-800">
            {t('blockchain.dispute.success', 'Dispute opened successfully!')}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleSubmitDispute}
          disabled={isSubmitting || !defendant || !evidenceCid || !userAddress}
          className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              {t('blockchain.dispute.submitting', 'Submitting...')}
            </>
          ) : (
            t('blockchain.dispute.submit', 'Open Dispute')
          )}
        </button>
      </div>
    </div>
  );
}
