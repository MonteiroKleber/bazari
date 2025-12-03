import { lazy } from 'react';
import type { BazariApp } from '@/platform/types';

export const vestingApp: BazariApp = {
  id: 'vesting',
  name: 'Vesting',
  slug: 'vesting',
  version: '1.0.0',

  icon: 'TrendingUp',
  color: 'from-amber-500 to-orange-600',
  description: 'Acompanhe a liberação dos seus tokens BZR',

  category: 'finance',
  tags: ['vesting', 'tokens', 'liberação', 'schedule'],

  entryPoint: '/vesting',
  component: lazy(() =>
    import('@/modules/vesting/pages/VestingPage').then((m) => ({ default: m.VestingPage }))
  ),

  permissions: [
    { id: 'blockchain.read', reason: 'Consultar schedule de vesting' },
    { id: 'blockchain.sign', reason: 'Resgatar tokens liberados' },
    { id: 'wallet.balance.read', reason: 'Exibir tokens disponíveis' },
  ],

  status: 'stable',
  native: true,
  featured: false,
  preInstalled: false,
  defaultOrder: 8,
};
