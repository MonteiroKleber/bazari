import { lazy } from 'react';
import type { BazariApp } from '@/platform/types';

/**
 * Developer Portal App
 *
 * Permite que desenvolvedores criem e gerenciem apps para o BazariOS.
 * Inclui:
 * - Dashboard de apps
 * - Criação de novos apps
 * - Gestão de monetização
 * - Analytics de receita
 * - Documentação do SDK
 */
export const developerPortalApp: BazariApp = {
  id: 'developer-portal',
  name: 'Developer Portal',
  slug: 'developer',
  version: '1.0.0',

  icon: 'Code2',
  color: 'from-violet-500 to-purple-600',
  description: 'Crie e gerencie apps para o BazariOS',

  category: 'tools',
  tags: ['desenvolvimento', 'sdk', 'apps', 'monetização', 'developer'],

  entryPoint: '/app/developer',
  component: lazy(() => import('@/pages/developer/DevPortalDashboardPage')),

  permissions: [
    { id: 'developer.apps.read', reason: 'Ver seus apps' },
    { id: 'developer.apps.write', reason: 'Criar e editar apps' },
    { id: 'developer.revenue.read', reason: 'Ver métricas de receita' },
    { id: 'developer.analytics.read', reason: 'Ver analytics dos apps' },
  ],

  status: 'stable',
  native: true,
  featured: false,
  preInstalled: false,
  defaultOrder: 50,

  longDescription: `O Developer Portal é sua central de desenvolvimento para o ecossistema Bazari.

## Recursos

### Dashboard de Apps
Veja todos os seus apps, status de review, instalações e receita em um só lugar.

### Criação de Apps
Crie novos apps usando o @bazari.libervia.xyz/app-sdk. Suporte para apps gratuitos, pagos, freemium e por assinatura.

### Monetização
Configure preços, In-App Purchases e acompanhe sua receita. Revenue share progressivo de 70% a 85% baseado em instalações.

### Analytics
Métricas detalhadas de instalações, retenção, ratings e receita por período.

### SDK Documentation
Acesse a documentação completa do @bazari.libervia.xyz/app-sdk para integrar seu app com wallet, storage, UI e eventos.`,

  // Screenshots will be added later
  screenshots: [],
};
