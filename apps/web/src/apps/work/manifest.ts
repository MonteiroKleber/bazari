// path: apps/web/src/apps/work/manifest.ts
// PROMPT-09: Manifest do Bazari Work para App Store

import { lazy } from 'react';
import type { BazariApp } from '@/platform/types';

export const workApp: BazariApp = {
  id: 'work',
  name: 'Bazari Work',
  slug: 'work',
  version: '1.0.0',

  icon: 'Briefcase',
  color: 'from-violet-500 to-purple-600',
  description: 'Marketplace de talentos e trabalho freelance',

  category: 'commerce',
  tags: ['trabalho', 'freelance', 'talentos', 'vagas', 'contratos'],

  entryPoint: '/app/work',
  component: lazy(() =>
    import('@/modules/work/pages/WorkHomePage').then((m) => ({
      default: m.WorkHomePage,
    }))
  ),

  permissions: [
    { id: 'profile:read', reason: 'Acessar seu perfil profissional' },
    { id: 'profile:write', reason: 'Editar perfil e status' },
    { id: 'jobs:read', reason: 'Ver vagas disponíveis' },
    { id: 'proposals:manage', reason: 'Enviar e receber propostas' },
    { id: 'agreements:manage', reason: 'Gerenciar acordos de trabalho' },
    { id: 'chat:access', reason: 'Negociar via chat' },
  ],

  requiredRoles: ['user'],

  status: 'stable',
  native: true,
  featured: true,
  preInstalled: false,
  defaultOrder: 5,

  longDescription: `
O Bazari Work é o marketplace de talentos do ecossistema Bazari.

Para Profissionais:
- Crie seu perfil profissional
- Receba propostas de empresas
- Candidate-se a vagas
- Gerencie acordos e pagamentos
- Construa sua reputação

Para Empresas:
- Publique vagas
- Encontre talentos qualificados
- Envie propostas diretas
- Gerencie contratos
- Avalie profissionais

Acordos são registrados on-chain para transparência e segurança.
  `.trim(),

  screenshots: [],
};
