import { lazy } from 'react';
import type { BazariApp } from '@/platform/types';

export const p2pApp: BazariApp = {
  id: 'p2p',
  name: 'P2P Exchange',
  slug: 'p2p',
  version: '1.0.0',

  icon: 'ArrowLeftRight',
  color: 'from-cyan-500 to-teal-600',
  description: 'Troca direta de tokens entre usuários',

  category: 'finance',
  tags: ['exchange', 'troca', 'p2p', 'escrow'],

  entryPoint: '/app/p2p',
  component: lazy(() => import('@/modules/p2p/pages/P2PHomePage')),

  permissions: [
    { id: 'wallet.balance.read', reason: 'Verificar saldo disponível' },
    { id: 'wallet.transfer.request', reason: 'Executar trocas' },
    { id: 'blockchain.sign', reason: 'Assinar transações de escrow' },
    { id: 'messages.write', reason: 'Negociar com contraparte', optional: true },
  ],

  status: 'stable',
  native: true,
  featured: false,
  preInstalled: true,
  defaultOrder: 5,
};
