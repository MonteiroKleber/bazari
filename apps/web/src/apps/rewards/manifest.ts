import { lazy } from 'react';
import type { BazariApp } from '@/platform/types';

export const rewardsApp: BazariApp = {
  id: 'rewards',
  name: 'Rewards & Missões',
  slug: 'rewards',
  version: '1.0.0',

  icon: 'Trophy',
  color: 'from-yellow-500 to-amber-600',
  description: 'Complete missões e ganhe ZARI e BZR',

  category: 'entertainment',
  tags: ['missões', 'rewards', 'gamificação', 'zari'],

  entryPoint: '/app/rewards/missions',
  component: lazy(() => import('@/pages/rewards/MissionsHubPage')),

  permissions: [
    { id: 'auth:read', reason: 'Verificar progresso' },
    { id: 'wallet:read', reason: 'Exibir recompensas' },
    { id: 'ui:toast', reason: 'Alertar missões completas' },
  ],

  status: 'stable',
  native: true,
  featured: true,
  preInstalled: false,
  defaultOrder: 9,
};
