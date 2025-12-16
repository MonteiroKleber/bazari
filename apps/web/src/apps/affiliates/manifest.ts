import { lazy } from 'react';
import type { BazariApp } from '@/platform/types';

export const affiliatesApp: BazariApp = {
  id: 'affiliates',
  name: 'Afiliações',
  slug: 'affiliates',
  version: '1.0.0',

  icon: 'UserCheck',
  color: 'from-amber-500 to-yellow-600',
  description: 'Gerencie suas parcerias e comissões',

  category: 'commerce',
  tags: ['afiliados', 'comissões', 'parcerias'],

  entryPoint: '/app/promoter/affiliates',
  component: lazy(() =>
    import('@/pages/promoter/MyAffiliationsPage').then((m) => ({ default: m.MyAffiliationsPage }))
  ),

  permissions: [
    { id: 'auth:read', reason: 'Ver perfil de parceiros' },
    { id: 'wallet:read', reason: 'Exibir comissões' },
    { id: 'orders.read', reason: 'Rastrear vendas afiliadas' },
  ],

  status: 'stable',
  native: true,
  featured: false,
  preInstalled: false,
  defaultOrder: 12,
};
