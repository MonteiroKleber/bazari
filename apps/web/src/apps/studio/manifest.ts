import { lazy } from 'react';
import type { BazariApp } from '@/platform/types';

export const studioApp: BazariApp = {
  id: 'studio',
  name: 'Bazari Studio',
  slug: 'studio',
  version: '1.0.0',

  icon: 'Code2',
  color: 'from-violet-500 to-purple-600',
  description: 'IDE para criar apps e smart contracts para Bazari',

  category: 'tools',
  tags: ['development', 'ide', 'coding', 'apps', 'contracts'],

  entryPoint: '/app/studio',
  component: lazy(() => import('./StudioApp')),

  permissions: [
    { id: 'auth:read', reason: 'Identificar o desenvolvedor' },
    { id: 'wallet:read', reason: 'Exibir saldo para publicacao' },
    { id: 'storage:read', reason: 'Salvar configuracoes locais' },
    { id: 'ui:toast', reason: 'Notificar sobre builds e publicacoes' },
  ],

  status: 'beta',
  native: true,
  featured: false,
  preInstalled: false,
  defaultOrder: 20,
};
