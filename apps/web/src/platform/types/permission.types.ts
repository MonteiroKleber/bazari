/**
 * IDs de permissões disponíveis no sistema
 */
export type PermissionId =
  // User
  | 'user.profile.read'
  | 'user.profile.write'

  // Wallet
  | 'wallet.balance.read'
  | 'wallet.history.read'
  | 'wallet.transfer.request'

  // Commerce
  | 'products.read'
  | 'products.write'
  | 'orders.read'
  | 'orders.write'

  // Social
  | 'feed.read'
  | 'feed.write'
  | 'messages.read'
  | 'messages.write'

  // System
  | 'notifications.send'
  | 'storage.app'
  | 'camera'
  | 'location'

  // Blockchain
  | 'blockchain.read'
  | 'blockchain.sign';

/**
 * Nível de risco de uma permissão
 */
export type PermissionRisk = 'low' | 'medium' | 'high' | 'critical';

/**
 * Definição de uma permissão no catálogo
 */
export interface PermissionDefinition {
  /** ID único */
  id: PermissionId;

  /** Nome para exibição */
  name: string;

  /** Descrição do que permite */
  description: string;

  /** Nível de risco */
  risk: PermissionRisk;

  /** Ícone Lucide */
  icon: string;

  /** Se requer confirmação a cada uso */
  requiresConfirmation?: boolean;
}

/**
 * Catálogo de todas as permissões
 */
export const PERMISSIONS_CATALOG: Record<PermissionId, PermissionDefinition> = {
  // User
  'user.profile.read': {
    id: 'user.profile.read',
    name: 'Ler perfil',
    description: 'Ver seu nome, avatar e handle',
    risk: 'low',
    icon: 'User',
  },
  'user.profile.write': {
    id: 'user.profile.write',
    name: 'Editar perfil',
    description: 'Modificar informações do seu perfil',
    risk: 'medium',
    icon: 'UserCog',
  },

  // Wallet
  'wallet.balance.read': {
    id: 'wallet.balance.read',
    name: 'Ver saldo',
    description: 'Consultar saldo de tokens BZR e ZARI',
    risk: 'low',
    icon: 'Wallet',
  },
  'wallet.history.read': {
    id: 'wallet.history.read',
    name: 'Ver histórico',
    description: 'Acessar histórico de transações',
    risk: 'medium',
    icon: 'History',
  },
  'wallet.transfer.request': {
    id: 'wallet.transfer.request',
    name: 'Solicitar transferência',
    description: 'Pedir autorização para transferir tokens',
    risk: 'high',
    icon: 'Send',
    requiresConfirmation: true,
  },

  // Commerce
  'products.read': {
    id: 'products.read',
    name: 'Ver produtos',
    description: 'Listar seus produtos e lojas',
    risk: 'low',
    icon: 'Package',
  },
  'products.write': {
    id: 'products.write',
    name: 'Gerenciar produtos',
    description: 'Criar e editar produtos',
    risk: 'medium',
    icon: 'PackagePlus',
  },
  'orders.read': {
    id: 'orders.read',
    name: 'Ver pedidos',
    description: 'Acessar histórico de pedidos',
    risk: 'medium',
    icon: 'ShoppingBag',
  },
  'orders.write': {
    id: 'orders.write',
    name: 'Gerenciar pedidos',
    description: 'Criar e atualizar pedidos',
    risk: 'high',
    icon: 'ShoppingCart',
  },

  // Social
  'feed.read': {
    id: 'feed.read',
    name: 'Ler feed',
    description: 'Ver posts e interações',
    risk: 'low',
    icon: 'Newspaper',
  },
  'feed.write': {
    id: 'feed.write',
    name: 'Postar',
    description: 'Criar posts em seu nome',
    risk: 'high',
    icon: 'PenLine',
    requiresConfirmation: true,
  },
  'messages.read': {
    id: 'messages.read',
    name: 'Ler mensagens',
    description: 'Acessar suas conversas',
    risk: 'high',
    icon: 'MessageCircle',
  },
  'messages.write': {
    id: 'messages.write',
    name: 'Enviar mensagens',
    description: 'Enviar mensagens em seu nome',
    risk: 'high',
    icon: 'Send',
    requiresConfirmation: true,
  },

  // System
  'notifications.send': {
    id: 'notifications.send',
    name: 'Notificações',
    description: 'Enviar notificações push',
    risk: 'low',
    icon: 'Bell',
  },
  'storage.app': {
    id: 'storage.app',
    name: 'Armazenamento',
    description: 'Salvar dados do app localmente',
    risk: 'low',
    icon: 'Database',
  },
  camera: {
    id: 'camera',
    name: 'Câmera',
    description: 'Acessar câmera do dispositivo',
    risk: 'medium',
    icon: 'Camera',
  },
  location: {
    id: 'location',
    name: 'Localização',
    description: 'Acessar sua localização GPS',
    risk: 'medium',
    icon: 'MapPin',
  },

  // Blockchain
  'blockchain.read': {
    id: 'blockchain.read',
    name: 'Ler blockchain',
    description: 'Consultar dados on-chain',
    risk: 'low',
    icon: 'Blocks',
  },
  'blockchain.sign': {
    id: 'blockchain.sign',
    name: 'Assinar transações',
    description: 'Solicitar assinatura de transações blockchain',
    risk: 'critical',
    icon: 'KeyRound',
    requiresConfirmation: true,
  },
};

/**
 * Obtém definição de uma permissão
 */
export function getPermissionDefinition(id: PermissionId): PermissionDefinition {
  return PERMISSIONS_CATALOG[id];
}

/**
 * Agrupa permissões por nível de risco
 */
export function groupPermissionsByRisk(
  permissionIds: PermissionId[]
): Record<PermissionRisk, PermissionDefinition[]> {
  const grouped: Record<PermissionRisk, PermissionDefinition[]> = {
    low: [],
    medium: [],
    high: [],
    critical: [],
  };

  for (const id of permissionIds) {
    const def = PERMISSIONS_CATALOG[id];
    if (def) {
      grouped[def.risk].push(def);
    }
  }

  return grouped;
}
