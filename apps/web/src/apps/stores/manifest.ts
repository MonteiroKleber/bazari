import { lazy } from 'react';
import type { BazariApp } from '@/platform/types';

export const storesApp: BazariApp = {
  id: 'stores',
  name: 'Minhas Lojas',
  slug: 'sellers',
  version: '1.0.0',

  icon: 'Store',
  color: 'from-pink-500 to-rose-600',
  description: 'Gerencie suas lojas e produtos',

  category: 'commerce',
  tags: ['lojas', 'vendas', 'produtos', 'seller'],

  entryPoint: '/app/sellers',
  component: lazy(() => import('@/pages/SellersListPage')),

  permissions: [
    { id: 'products.read', reason: 'Listar seus produtos' },
    { id: 'products.write', reason: 'Gerenciar produtos' },
    { id: 'orders.read', reason: 'Ver pedidos recebidos' },
  ],

  requiredRoles: ['seller'],

  status: 'stable',
  native: true,
  featured: false,
  preInstalled: true,
  defaultOrder: 13,
};
