// path: apps/web/src/apps/pay/manifest.ts
// Bazari Pay - Manifest para App Store

import { lazy } from 'react';
import type { BazariApp } from '@/platform/types';

export const payApp: BazariApp = {
  id: 'pay',
  name: 'Bazari Pay',
  slug: 'pay',
  version: '1.0.0',

  icon: 'Banknote',
  color: 'from-emerald-500 to-teal-600',
  description: 'Pagamentos recorrentes automáticos',

  category: 'finance',
  tags: ['pagamentos', 'recorrente', 'salário', 'contratos', 'automático'],

  entryPoint: '/app/pay',
  component: lazy(() =>
    import('@/modules/pay/pages/PayDashboardPage').then((m) => ({
      default: m.PayDashboardPage,
    }))
  ),

  permissions: [
    { id: 'wallet:read', reason: 'Verificar saldo para pagamentos' },
    { id: 'wallet:transfer', reason: 'Executar transferências automáticas' },
    { id: 'contracts:read', reason: 'Consultar contratos de pagamento' },
    { id: 'contracts:write', reason: 'Criar e gerenciar contratos' },
    { id: 'chat:access', reason: 'Enviar notificações e comprovantes' },
  ],

  requiredRoles: ['user'],

  status: 'stable',
  native: true,
  featured: true,
  preInstalled: false,
  defaultOrder: 6,

  longDescription: `
O Bazari Pay é o banco programável de pagamentos recorrentes da Bazari.

Para Pagadores (Empresas/Pessoas):
- Crie contratos de pagamento automático
- Configure periodicidade (semanal, quinzenal, mensal)
- Adicione extras e descontos
- Acompanhe execuções em tempo real
- Importe contratos via CSV

Para Recebedores:
- Receba pagamentos automaticamente
- Visualize histórico completo
- Acesse comprovantes
- Acompanhe próximos pagamentos

Características:
- Execução automática no dia programado
- Registro on-chain para auditabilidade
- Notificações via BazChat
- Retry automático em caso de falha
  `.trim(),

  screenshots: [],
};
