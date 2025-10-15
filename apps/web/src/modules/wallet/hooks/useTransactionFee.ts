import { useState, useEffect } from 'react';
import { getApi } from '../services/polkadot';
import { formatBalance } from '../utils/format';
import type { SubmittableExtrinsic } from '@polkadot/api/types';

interface FeeEstimate {
  value: bigint;
  formatted: string;
  loading: boolean;
  error: string | null;
}

/**
 * Hook para estimar fee de uma transação blockchain
 *
 * @param address - Endereço da conta que vai assinar a transação
 * @param extrinsicFn - Função que retorna a extrinsic a ser estimada
 * @param deps - Dependências para recalcular a estimativa
 * @returns Objeto com valor da fee, formatação, estado de loading e erro
 *
 * @example
 * const { formatted, loading, error } = useTransactionFee(
 *   activeAddress,
 *   async () => {
 *     const api = await getApi();
 *     return api.tx.balances.transferKeepAlive(recipient, amount);
 *   },
 *   [recipient, amount]
 * );
 */
export function useTransactionFee(
  address: string | null | undefined,
  extrinsicFn: (() => Promise<SubmittableExtrinsic<'promise'>>) | null,
  deps: any[] = []
): FeeEstimate {
  const [fee, setFee] = useState<FeeEstimate>({
    value: 0n,
    formatted: '...',
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (!address || !extrinsicFn) {
      setFee({ value: 0n, formatted: '...', loading: false, error: null });
      return;
    }

    let cancelled = false;

    const estimateFee = async () => {
      try {
        setFee(prev => ({ ...prev, loading: true, error: null }));

        const api = await getApi();
        const extrinsic = await extrinsicFn();
        const info = await extrinsic.paymentInfo(address);

        const feeValue = BigInt(info.partialFee.toString());
        const decimals = api.registry.chainDecimals[0] ?? 12;
        const symbol = api.registry.chainTokens[0] ?? 'BZR';

        if (!cancelled) {
          setFee({
            value: feeValue,
            formatted: `${formatBalance(feeValue, decimals)} ${symbol}`,
            loading: false,
            error: null,
          });
        }
      } catch (error) {
        console.error('[useTransactionFee] Failed to estimate fee:', error);
        if (!cancelled) {
          setFee({
            value: 0n,
            formatted: 'Erro ao estimar',
            loading: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    };

    estimateFee();

    return () => {
      cancelled = true;
    };
  }, [address, extrinsicFn, ...deps]);

  return fee;
}
