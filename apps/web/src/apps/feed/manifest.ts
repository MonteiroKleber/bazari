import { lazy } from 'react';
import type { BazariApp } from '@/platform/types';

export const feedApp: BazariApp = {
  id: 'feed',
  name: 'Feed Social',
  slug: 'feed',
  version: '1.0.0',

  icon: 'Newspaper',
  color: 'from-blue-500 to-cyan-600',
  description: 'Veja posts da comunidade Bazari',

  category: 'social',
  tags: ['posts', 'social', 'comunidade', 'timeline'],

  entryPoint: '/app/feed',
  component: lazy(() => import('@/pages/FeedPage')),

  permissions: [
    { id: 'feed.read', reason: 'Exibir posts do feed' },
    { id: 'feed.write', reason: 'Criar e interagir com posts', optional: true },
    { id: 'user.profile.read', reason: 'Mostrar informações dos autores' },
  ],

  status: 'stable',
  native: true,
  featured: true,
  preInstalled: true,
  defaultOrder: 2,
};
