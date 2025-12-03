import { lazy } from 'react';
import type { BazariApp } from '@/platform/types';

export const marketplaceApp: BazariApp = {
  id: 'marketplace',
  name: 'Marketplace',
  slug: 'marketplace',
  version: '1.0.0',

  icon: 'ShoppingBag',
  color: 'from-purple-500 to-pink-600',
  description: 'Compre e venda produtos na comunidade',

  category: 'commerce',
  tags: ['compras', 'vendas', 'produtos', 'loja'],

  entryPoint: '/app/marketplace',
  component: lazy(() => import('@/pages/MarketplacePage')),

  permissions: [
    { id: 'products.read', reason: 'Listar produtos disponíveis' },
    { id: 'orders.read', reason: 'Ver seus pedidos' },
    { id: 'orders.write', reason: 'Realizar compras', optional: true },
  ],

  status: 'stable',
  native: true,
  featured: true,
  preInstalled: true,
  defaultOrder: 3,
};
