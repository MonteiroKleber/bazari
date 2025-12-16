import { lazy } from 'react';
import type { BazariApp } from '@/platform/types';

export const discoverApp: BazariApp = {
  id: 'discover',
  name: 'Descobrir',
  slug: 'discover',
  version: '1.0.0',

  icon: 'Compass',
  color: 'from-orange-500 to-red-600',
  description: 'Encontre pessoas e tendências',

  category: 'social',
  tags: ['descobrir', 'pessoas', 'trending', 'explorar'],

  entryPoint: '/app/discover/people',
  component: lazy(() => import('@/pages/DiscoverPeoplePage')),

  permissions: [
    { id: 'auth:read', reason: 'Mostrar perfis sugeridos' },
    { id: 'feed.read', reason: 'Exibir tendências' },
  ],

  status: 'stable',
  native: true,
  featured: false,
  preInstalled: false,
  defaultOrder: 11,
};
