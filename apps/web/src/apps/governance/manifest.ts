import { lazy } from 'react';
import type { BazariApp } from '@/platform/types';

export const governanceApp: BazariApp = {
  id: 'governance',
  name: 'Governança',
  slug: 'governance',
  version: '1.0.0',

  icon: 'Vote',
  color: 'from-violet-500 to-purple-600',
  description: 'Participe das decisões da DAO Bazari',

  category: 'governance',
  tags: ['dao', 'votação', 'propostas', 'governança'],

  entryPoint: '/app/governance',
  component: lazy(() =>
    import('@/modules/governance/pages/GovernancePage').then((m) => ({ default: m.GovernancePage }))
  ),

  permissions: [
    { id: 'contracts:read', reason: 'Consultar propostas on-chain' },
    { id: 'contracts:execute', reason: 'Votar em propostas' },
    { id: 'wallet:read', reason: 'Verificar poder de voto' },
  ],

  requiredRoles: ['dao_member'],

  status: 'stable',
  native: true,
  featured: false,
  preInstalled: false,
  defaultOrder: 6,
};
