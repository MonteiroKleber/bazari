/**
 * Definições de permissões do SDK
 */

export interface PermissionDefinition {
  id: string;
  name: string;
  description: string;
  risk: 'low' | 'medium' | 'high';
}

/**
 * Permissões de localização
 */
export const LOCATION_PERMISSIONS: Record<string, PermissionDefinition> = {
  'location.coarse': {
    id: 'location.coarse',
    name: 'Localização Aproximada',
    description: 'Acesso à localização aproximada (cidade/bairro)',
    risk: 'medium',
  },
  'location.precise': {
    id: 'location.precise',
    name: 'Localização Precisa',
    description: 'Acesso à localização GPS precisa',
    risk: 'high',
  },
  'location.background': {
    id: 'location.background',
    name: 'Localização em Background',
    description: 'Rastrear localização mesmo com app em segundo plano',
    risk: 'high',
  },
};

/**
 * Permissões de wallet
 */
export const WALLET_PERMISSIONS: Record<string, PermissionDefinition> = {
  'wallet.read': {
    id: 'wallet.read',
    name: 'Ler Saldo',
    description: 'Ver saldo e histórico de transações',
    risk: 'low',
  },
  'wallet.write': {
    id: 'wallet.write',
    name: 'Enviar Transações',
    description: 'Enviar BZR para outros endereços',
    risk: 'high',
  },
};

/**
 * Permissões de storage
 */
export const STORAGE_PERMISSIONS: Record<string, PermissionDefinition> = {
  'storage.read': {
    id: 'storage.read',
    name: 'Ler Dados',
    description: 'Ler dados salvos pelo app',
    risk: 'low',
  },
  'storage.write': {
    id: 'storage.write',
    name: 'Salvar Dados',
    description: 'Salvar dados persistentes',
    risk: 'low',
  },
};

/**
 * Permissões de contratos
 */
export const CONTRACT_PERMISSIONS: Record<string, PermissionDefinition> = {
  'contracts.read': {
    id: 'contracts.read',
    name: 'Consultar Contratos',
    description: 'Ler dados de smart contracts',
    risk: 'low',
  },
  'contracts.write': {
    id: 'contracts.write',
    name: 'Executar Contratos',
    description: 'Executar transações em smart contracts',
    risk: 'high',
  },
};

/**
 * Todas as permissões disponíveis
 */
export const ALL_PERMISSIONS: Record<string, PermissionDefinition> = {
  ...LOCATION_PERMISSIONS,
  ...WALLET_PERMISSIONS,
  ...STORAGE_PERMISSIONS,
  ...CONTRACT_PERMISSIONS,
};

/**
 * Tipo de permissão válida
 */
export type PermissionId = keyof typeof ALL_PERMISSIONS;

/**
 * Verifica se uma permissão é válida
 */
export function isValidPermission(permission: string): permission is PermissionId {
  return permission in ALL_PERMISSIONS;
}

/**
 * Obtém definição de uma permissão
 */
export function getPermissionDefinition(permission: string): PermissionDefinition | null {
  return ALL_PERMISSIONS[permission] || null;
}

/**
 * Filtra permissões por nível de risco
 */
export function filterPermissionsByRisk(
  permissions: string[],
  risk: 'low' | 'medium' | 'high'
): string[] {
  return permissions.filter((p) => {
    const def = ALL_PERMISSIONS[p];
    return def && def.risk === risk;
  });
}
