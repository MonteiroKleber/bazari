// path: apps/api/src/config/payments.ts

import { decodeAddress, encodeAddress } from '@polkadot/util-crypto';

export interface PaymentsConfig {
  escrowAddress: string;
  feeBps: number;
}

let cachedConfig: PaymentsConfig | null = null;

export function getPaymentsConfig(): PaymentsConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const escrowAccount = process.env.ESCROW_ACCOUNT;
  const feeBpsStr = process.env.MARKETPLACE_FEE_BPS;

  // Validar ESCROW_ACCOUNT
  if (!escrowAccount || escrowAccount.trim() === '') {
    throw new Error('ESCROW_ACCOUNT é obrigatório');
  }

  let normalizedAddress: string;
  try {
    // Validar se é um endereço SS58 válido
    const decoded = decodeAddress(escrowAccount.trim());
    // Re-encode com prefixo padrão (42 = substrate generic)
    normalizedAddress = encodeAddress(decoded, 42);
  } catch (err) {
    throw new Error(`ESCROW_ACCOUNT inválido: deve ser um endereço SS58 válido (${err instanceof Error ? err.message : 'erro desconhecido'})`);
  }

  // Validar MARKETPLACE_FEE_BPS
  if (!feeBpsStr || feeBpsStr.trim() === '') {
    throw new Error('MARKETPLACE_FEE_BPS é obrigatório');
  }

  const feeBps = parseInt(feeBpsStr.trim(), 10);
  if (isNaN(feeBps) || feeBps < 0 || feeBps > 10000) {
    throw new Error('MARKETPLACE_FEE_BPS deve ser um número entre 0 e 10000 (0% a 100%)');
  }

  cachedConfig = {
    escrowAddress: normalizedAddress,
    feeBps,
  };

  return cachedConfig;
}

export function getLogSafeConfig(): { escrowAddress: string; feeBps: number } {
  const config = getPaymentsConfig();
  return {
    escrowAddress: config.escrowAddress.substring(0, 8) + '...' + config.escrowAddress.substring(config.escrowAddress.length - 8),
    feeBps: config.feeBps,
  };
}