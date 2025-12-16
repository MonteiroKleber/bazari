import { lazy } from 'react';
import type { BazariApp } from '@/platform/types';

export const analyticsApp: BazariApp = {
  id: 'analytics',
  name: 'Analytics',
  slug: 'analytics',
  version: '1.0.0',

  icon: 'BarChart3',
  color: 'from-purple-500 to-indigo-600',
  description: 'Métricas e insights do seu perfil',

  category: 'tools',
  tags: ['métricas', 'estatísticas', 'insights', 'dashboard'],

  entryPoint: '/app/analytics',
  component: lazy(() => import('@/pages/AnalyticsDashboard')),

  permissions: [
    { id: 'auth:read', reason: 'Analisar seu perfil' },
    { id: 'feed.read', reason: 'Métricas de engajamento' },
    { id: 'orders.read', reason: 'Estatísticas de vendas', optional: true },
  ],

  status: 'stable',
  native: true,
  featured: false,
  preInstalled: false,
  defaultOrder: 7,
};
