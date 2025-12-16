import { lazy } from 'react';
import type { BazariApp } from '@/platform/types';

export const deliveryApp: BazariApp = {
  id: 'delivery',
  name: 'Entregas',
  slug: 'delivery',
  version: '1.0.0',

  icon: 'Truck',
  color: 'from-emerald-500 to-green-600',
  description: 'Gerencie entregas ou torne-se entregador',

  category: 'tools',
  tags: ['entregas', 'delivery', 'logística'],

  entryPoint: '/app/delivery/dashboard',
  component: lazy(() =>
    import('@/pages/delivery/DeliveryDashboardPage').then((m) => ({ default: m.DeliveryDashboardPage }))
  ),

  permissions: [
    { id: 'location:read', reason: 'Rastrear entregas' },
    { id: 'orders.read', reason: 'Ver pedidos para entrega' },
    { id: 'ui:toast', reason: 'Alertar status de entrega' },
  ],

  requiredRoles: ['delivery'],

  status: 'stable',
  native: true,
  featured: false,
  preInstalled: false,
  defaultOrder: 10,
};
