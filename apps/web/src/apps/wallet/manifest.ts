import { lazy } from 'react';
import type { BazariApp } from '@/platform/types';

export const walletApp: BazariApp = {
  id: 'wallet',
  name: 'Wallet',
  slug: 'wallet',
  version: '1.0.0',

  icon: 'Wallet',
  color: 'from-green-500 to-emerald-600',
  description: 'Gerencie seus tokens BZR e ZARI',

  category: 'finance',
  tags: ['tokens', 'saldo', 'transferência', 'bzr', 'zari'],

  entryPoint: '/app/wallet',
  component: lazy(() => import('@/modules/wallet/pages/WalletHome')),

  permissions: [
    { id: 'wallet.balance.read', reason: 'Exibir seu saldo de tokens' },
    { id: 'wallet.history.read', reason: 'Mostrar histórico de transações' },
    { id: 'wallet.transfer.request', reason: 'Realizar transferências' },
    { id: 'blockchain.read', reason: 'Consultar dados on-chain' },
    { id: 'blockchain.sign', reason: 'Assinar transações blockchain' },
  ],

  status: 'stable',
  native: true,
  featured: true,
  preInstalled: true,
  defaultOrder: 1,
};
