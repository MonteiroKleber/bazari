import { lazy } from 'react';
import type { BazariApp } from '@/platform/types';

export const vrApp: BazariApp = {
  id: 'vr',
  name: 'Bazari VR',
  slug: 'vr',
  version: '0.1.0',

  icon: 'Glasses',
  color: 'from-fuchsia-500 to-purple-600',
  description: 'Explore o metaverso do marketplace',

  category: 'entertainment',
  tags: ['vr', 'metaverso', '3d', 'realidade virtual'],

  entryPoint: '/vr',
  component: lazy(() => import('@/pages/ExplorePage')),

  permissions: [
    { id: 'user.profile.read', reason: 'Criar avatar' },
    { id: 'camera', reason: 'Experiência AR', optional: true },
  ],

  status: 'beta',
  native: true,
  featured: true,
  preInstalled: false,
  defaultOrder: 14,
};
