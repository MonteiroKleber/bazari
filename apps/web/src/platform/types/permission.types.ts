/**
 * IDs de permissões disponíveis no sistema
 * Formato: resource:action (padrão OAuth2)
 */
export type PermissionId =
  // Auth
  | 'auth:read'
  | 'auth:write'

  // Wallet
  | 'wallet:read'
  | 'wallet:transfer'

  // Storage
  | 'storage:read'
  | 'storage:write'

  // UI
  | 'ui:toast'
  | 'ui:modal'

  // Events
  | 'events:subscribe'
  | 'events:emit'

  // Location
  | 'location:read'
  | 'location:geocode'

  // Maps
  | 'maps:display'
  | 'maps:directions'

  // Contracts
  | 'contracts:read'
  | 'contracts:write'
  | 'contracts:deploy'
  | 'contracts:execute'

  // Camera
  | 'camera:access'

  // Legacy aliases (for backward compatibility)
  | 'user.profile.read'
  | 'user.profile.write'
  | 'wallet.balance.read'
  | 'wallet.history.read'
  | 'wallet.transfer.request'
  | 'products.read'
  | 'products.write'
  | 'orders.read'
  | 'orders.write'
  | 'feed.read'
  | 'feed.write'
  | 'messages.read'
  | 'messages.write'
  | 'notifications.send'
  | 'storage.app'
  | 'camera'
  | 'location'
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
 * Mapa de permissões legadas para o novo formato
 */
const LEGACY_TO_NEW_MAP: Record<string, PermissionId> = {
  'user.profile.read': 'auth:read',
  'user.profile.write': 'auth:write',
  'wallet.balance.read': 'wallet:read',
  'wallet.history.read': 'wallet:read',
  'wallet.transfer.request': 'wallet:transfer',
  'storage.app': 'storage:read',
  'notifications.send': 'ui:toast',
  'blockchain.read': 'contracts:read',
  'blockchain.sign': 'contracts:execute',
  'location': 'location:read',
  'camera': 'camera:access',
};

/**
 * Normaliza um ID de permissão para o formato novo
 */
export function normalizePermissionId(id: string): PermissionId {
  return (LEGACY_TO_NEW_MAP[id] || id) as PermissionId;
}

/**
 * Catálogo de todas as permissões (formato novo)
 */
export const PERMISSIONS_CATALOG: Record<string, PermissionDefinition> = {
  // ============ AUTH ============
  'auth:read': {
    id: 'auth:read',
    name: 'Ler perfil',
    description: 'Ver seu nome, avatar e handle',
    risk: 'low',
    icon: 'User',
  },
  'auth:write': {
    id: 'auth:write',
    name: 'Editar perfil',
    description: 'Modificar informações do seu perfil',
    risk: 'medium',
    icon: 'UserCog',
  },

  // ============ WALLET ============
  'wallet:read': {
    id: 'wallet:read',
    name: 'Ver carteira',
    description: 'Consultar saldo e histórico de transações',
    risk: 'low',
    icon: 'Wallet',
  },
  'wallet:transfer': {
    id: 'wallet:transfer',
    name: 'Solicitar transferência',
    description: 'Pedir autorização para transferir tokens',
    risk: 'high',
    icon: 'Send',
    requiresConfirmation: true,
  },

  // ============ STORAGE ============
  'storage:read': {
    id: 'storage:read',
    name: 'Ler dados',
    description: 'Acessar dados salvos pelo app',
    risk: 'low',
    icon: 'Database',
  },
  'storage:write': {
    id: 'storage:write',
    name: 'Salvar dados',
    description: 'Salvar dados persistentes do app',
    risk: 'low',
    icon: 'Save',
  },

  // ============ UI ============
  'ui:toast': {
    id: 'ui:toast',
    name: 'Notificações',
    description: 'Exibir mensagens temporárias',
    risk: 'low',
    icon: 'Bell',
  },
  'ui:modal': {
    id: 'ui:modal',
    name: 'Modais',
    description: 'Exibir diálogos e confirmações',
    risk: 'low',
    icon: 'MessageSquare',
  },

  // ============ EVENTS ============
  'events:subscribe': {
    id: 'events:subscribe',
    name: 'Escutar eventos',
    description: 'Receber notificações de eventos',
    risk: 'low',
    icon: 'Radio',
  },
  'events:emit': {
    id: 'events:emit',
    name: 'Emitir eventos',
    description: 'Enviar eventos para a plataforma',
    risk: 'low',
    icon: 'Megaphone',
  },

  // ============ LOCATION ============
  'location:read': {
    id: 'location:read',
    name: 'Localização',
    description: 'Acessar sua localização GPS',
    risk: 'medium',
    icon: 'MapPin',
  },
  'location:geocode': {
    id: 'location:geocode',
    name: 'Geocodificação',
    description: 'Converter endereços em coordenadas',
    risk: 'low',
    icon: 'Map',
  },

  // ============ MAPS ============
  'maps:display': {
    id: 'maps:display',
    name: 'Exibir mapas',
    description: 'Mostrar mapas interativos',
    risk: 'low',
    icon: 'Map',
  },
  'maps:directions': {
    id: 'maps:directions',
    name: 'Rotas',
    description: 'Calcular e exibir rotas',
    risk: 'low',
    icon: 'Navigation',
  },

  // ============ CONTRACTS ============
  'contracts:read': {
    id: 'contracts:read',
    name: 'Ler blockchain',
    description: 'Consultar dados on-chain',
    risk: 'low',
    icon: 'Blocks',
  },
  'contracts:write': {
    id: 'contracts:write',
    name: 'Escrever blockchain',
    description: 'Enviar transações on-chain',
    risk: 'high',
    icon: 'FileEdit',
    requiresConfirmation: true,
  },
  'contracts:deploy': {
    id: 'contracts:deploy',
    name: 'Deploy contratos',
    description: 'Fazer deploy de smart contracts',
    risk: 'critical',
    icon: 'Rocket',
    requiresConfirmation: true,
  },
  'contracts:execute': {
    id: 'contracts:execute',
    name: 'Executar contratos',
    description: 'Chamar métodos de smart contracts',
    risk: 'high',
    icon: 'Play',
    requiresConfirmation: true,
  },

  // ============ CAMERA ============
  'camera:access': {
    id: 'camera:access',
    name: 'Câmera',
    description: 'Acessar câmera do dispositivo',
    risk: 'medium',
    icon: 'Camera',
  },

  // ============ LEGACY ALIASES ============
  // Mapeiam para as definições novas
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
  'camera': {
    id: 'camera',
    name: 'Câmera',
    description: 'Acessar câmera do dispositivo',
    risk: 'medium',
    icon: 'Camera',
  },
  'location': {
    id: 'location',
    name: 'Localização',
    description: 'Acessar sua localização GPS',
    risk: 'medium',
    icon: 'MapPin',
  },
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
 * Obtém definição de uma permissão (aceita formato novo ou legado)
 */
export function getPermissionDefinition(id: string): PermissionDefinition | undefined {
  // Primeiro tenta buscar diretamente
  if (PERMISSIONS_CATALOG[id]) {
    return PERMISSIONS_CATALOG[id];
  }
  // Tenta normalizar e buscar
  const normalizedId = normalizePermissionId(id);
  return PERMISSIONS_CATALOG[normalizedId];
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
    const def = getPermissionDefinition(id);
    if (def) {
      grouped[def.risk].push(def);
    }
  }

  return grouped;
}
