import { lazy } from 'react';
import type { BazariApp } from '@/platform/types';

/**
 * Admin Panel App
 *
 * Painel administrativo para membros da DAO.
 * Inclui:
 * - Review de apps submetidos
 * - Analytics da App Store
 * - Gestão de escrows
 * - Gestão de missões/rewards
 */
export const adminPanelApp: BazariApp = {
  id: 'admin-panel',
  name: 'Admin Panel',
  slug: 'admin',
  version: '1.0.0',

  icon: 'Shield',
  color: 'from-red-500 to-orange-600',
  description: 'Painel administrativo para membros da DAO',

  category: 'governance',
  tags: ['admin', 'dao', 'governança', 'moderação', 'review'],

  entryPoint: '/app/admin',
  component: lazy(() => import('@/pages/admin/AdminDashboardPage')),

  permissions: [
    { id: 'admin.apps.review', reason: 'Revisar apps submetidos' },
    { id: 'admin.apps.approve', reason: 'Aprovar/rejeitar apps' },
    { id: 'admin.analytics.read', reason: 'Ver analytics da plataforma' },
    { id: 'admin.escrows.manage', reason: 'Gerenciar disputas de escrow' },
    { id: 'admin.missions.manage', reason: 'Gerenciar missões e rewards' },
  ],

  // Apenas membros da DAO podem instalar este app
  requiredRoles: ['dao_member', 'admin'],

  status: 'stable',
  native: true,
  featured: false,
  preInstalled: false, // Não vem pré-instalado, apenas para DAO members
  defaultOrder: 99,

  longDescription: `O Admin Panel é o centro de controle para membros da DAO Bazari.

## Recursos

### App Reviews
Revise apps submetidos por desenvolvedores. Aprove, rejeite ou solicite alterações antes de publicar na App Store.

### Platform Analytics
Métricas da App Store: receita total, apps mais populares, desenvolvedores top, vendas por categoria.

### Escrow Management
Gerencie disputas de escrow entre compradores e vendedores. Libere fundos ou faça reembolsos.

### Missions Management
Crie e gerencie missões para o sistema de rewards. Configure XP, cashback e requisitos.

### Moderation Tools
Ferramentas para moderação de conteúdo e usuários da plataforma.`,

  // Screenshots will be added later
  screenshots: [],
};
