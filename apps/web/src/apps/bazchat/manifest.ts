import { lazy } from 'react';
import type { BazariApp } from '@/platform/types';

export const bazchatApp: BazariApp = {
  id: 'bazchat',
  name: 'BazChat',
  slug: 'chat',
  version: '1.0.0',

  icon: 'MessageCircle',
  color: 'from-indigo-500 to-purple-600',
  description: 'Mensagens criptografadas e negociações',

  category: 'social',
  tags: ['chat', 'mensagens', 'e2e', 'privacidade'],

  entryPoint: '/app/chat',
  component: lazy(() =>
    import('@/pages/chat/ChatInboxPage').then((m) => ({ default: m.ChatInboxPage }))
  ),

  permissions: [
    { id: 'messages.read', reason: 'Acessar suas conversas' },
    { id: 'messages.write', reason: 'Enviar mensagens' },
    { id: 'user.profile.read', reason: 'Mostrar info dos contatos' },
    { id: 'notifications.send', reason: 'Alertar novas mensagens' },
  ],

  status: 'stable',
  native: true,
  featured: false,
  preInstalled: true,
  defaultOrder: 4,
};
