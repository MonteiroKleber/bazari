/**
 * Permission detection utilities
 * Analyzes source code to detect SDK API usage and required permissions
 */

import fs from 'fs-extra';
import path from 'path';
import { glob } from 'glob';

/**
 * SDK method to permission mapping
 */
export const SDK_PERMISSION_MAP: Record<string, string> = {
  // Auth - now public (no permission needed)
  // 'sdk.auth.getCurrentUser': 'auth:read',
  // 'sdk.auth.getPermissions': 'auth:read',

  // Wallet
  'sdk.wallet.getBalance': 'wallet:read',
  'wallet.getBalance': 'wallet:read',
  'getBalance': 'wallet:read',

  'sdk.wallet.getHistory': 'wallet:read',
  'wallet.getHistory': 'wallet:read',
  'getHistory': 'wallet:read',

  'sdk.wallet.requestTransfer': 'wallet:transfer',
  'wallet.requestTransfer': 'wallet:transfer',
  'requestTransfer': 'wallet:transfer',

  // Storage
  'sdk.storage.get': 'storage:read',
  'storage.get': 'storage:read',

  'sdk.storage.set': 'storage:write',
  'storage.set': 'storage:write',

  'sdk.storage.remove': 'storage:write',
  'storage.remove': 'storage:write',

  'sdk.storage.clear': 'storage:write',
  'storage.clear': 'storage:write',

  // UI
  'sdk.ui.showToast': 'ui:toast',
  'sdk.ui.success': 'ui:toast',
  'sdk.ui.error': 'ui:toast',
  'sdk.ui.info': 'ui:toast',
  'sdk.ui.warning': 'ui:toast',
  'ui.showToast': 'ui:toast',

  'sdk.ui.showConfirm': 'ui:modal',
  'sdk.ui.showModal': 'ui:modal',
  'ui.showConfirm': 'ui:modal',
  'ui.showModal': 'ui:modal',

  // Events
  'sdk.events.subscribe': 'events:subscribe',
  'sdk.events.on': 'events:subscribe',
  'events.subscribe': 'events:subscribe',
  'events.on': 'events:subscribe',

  'sdk.events.emit': 'events:emit',
  'events.emit': 'events:emit',

  // Location
  'sdk.location.getCurrentPosition': 'location:read',
  'sdk.location.watchPosition': 'location:read',
  'location.getCurrentPosition': 'location:read',
  'location.watchPosition': 'location:read',

  'sdk.location.geocode': 'location:geocode',
  'sdk.location.reverseGeocode': 'location:geocode',
  'location.geocode': 'location:geocode',
  'location.reverseGeocode': 'location:geocode',

  // Maps
  'sdk.maps.create': 'maps:display',
  'sdk.maps.addMarker': 'maps:display',
  'maps.create': 'maps:display',
  'maps.addMarker': 'maps:display',

  // Contracts
  'sdk.contracts.call': 'contracts:read',
  'sdk.contracts.query': 'contracts:read',
  'contracts.call': 'contracts:read',
  'contracts.query': 'contracts:read',

  'sdk.contracts.execute': 'contracts:write',
  'sdk.contracts.deploy': 'contracts:write',
  'contracts.execute': 'contracts:write',
  'contracts.deploy': 'contracts:write',
};

/**
 * Permission metadata
 */
export const PERMISSION_METADATA: Record<string, { name: string; description: string; risk: string }> = {
  'wallet:read': {
    name: 'Ler Carteira',
    description: 'Ver saldo e histórico de transações',
    risk: 'low',
  },
  'wallet:transfer': {
    name: 'Solicitar Transferências',
    description: 'Solicitar envio de BZR (requer aprovação)',
    risk: 'high',
  },
  'storage:read': {
    name: 'Ler Dados',
    description: 'Acessar dados salvos pelo app',
    risk: 'low',
  },
  'storage:write': {
    name: 'Salvar Dados',
    description: 'Salvar dados persistentes',
    risk: 'low',
  },
  'ui:toast': {
    name: 'Mostrar Notificações',
    description: 'Exibir mensagens temporárias',
    risk: 'low',
  },
  'ui:modal': {
    name: 'Mostrar Modais',
    description: 'Exibir diálogos e confirmações',
    risk: 'low',
  },
  'events:subscribe': {
    name: 'Escutar Eventos',
    description: 'Receber notificações de eventos',
    risk: 'low',
  },
  'events:emit': {
    name: 'Emitir Eventos',
    description: 'Enviar eventos para a plataforma',
    risk: 'low',
  },
  'location:read': {
    name: 'Acessar Localização',
    description: 'Obter posição GPS do usuário',
    risk: 'medium',
  },
  'location:geocode': {
    name: 'Geocodificação',
    description: 'Converter endereços em coordenadas',
    risk: 'low',
  },
  'maps:display': {
    name: 'Exibir Mapas',
    description: 'Mostrar mapas interativos',
    risk: 'low',
  },
  'contracts:read': {
    name: 'Ler Contratos',
    description: 'Consultar smart contracts',
    risk: 'low',
  },
  'contracts:write': {
    name: 'Executar Contratos',
    description: 'Chamar métodos de smart contracts',
    risk: 'high',
  },
};

export interface DetectedPermission {
  id: string;
  sources: Array<{
    file: string;
    line: number;
    code: string;
  }>;
}

export interface PermissionDetectionResult {
  detected: DetectedPermission[];
  missing: DetectedPermission[];
  declared: string[];
  suggestions: string[];
}

/**
 * Detect SDK usage in source files and return required permissions
 */
export async function detectPermissions(projectDir: string): Promise<DetectedPermission[]> {
  const srcDir = path.join(projectDir, 'src');

  // Find all source files
  const patterns = ['**/*.{ts,tsx,js,jsx}'];
  const files = await glob(patterns, {
    cwd: srcDir,
    nodir: true,
    ignore: ['**/node_modules/**', '**/*.d.ts', '**/*.test.*', '**/*.spec.*']
  });

  const permissionSources: Map<string, DetectedPermission['sources']> = new Map();

  for (const file of files) {
    const filePath = path.join(srcDir, file);
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      // Check for SDK method calls
      for (const [pattern, permission] of Object.entries(SDK_PERMISSION_MAP)) {
        // Create regex that matches the pattern as a method call
        const regex = new RegExp(`\\b${pattern.replace(/\./g, '\\.')}\\s*\\(`, 'g');

        if (regex.test(line)) {
          const sources = permissionSources.get(permission) || [];
          sources.push({
            file: `src/${file}`,
            line: index + 1,
            code: line.trim().substring(0, 80),
          });
          permissionSources.set(permission, sources);
        }
      }

      // Also check for destructured usage like: const { getBalance } = sdk.wallet
      // or useBazari hook patterns
      if (line.includes('useBazari') || line.includes('sdk.')) {
        for (const [pattern, permission] of Object.entries(SDK_PERMISSION_MAP)) {
          const methodName = pattern.split('.').pop();
          if (methodName && line.includes(methodName)) {
            const sources = permissionSources.get(permission) || [];
            // Avoid duplicates for same file+line
            if (!sources.some(s => s.file === `src/${file}` && s.line === index + 1)) {
              sources.push({
                file: `src/${file}`,
                line: index + 1,
                code: line.trim().substring(0, 80),
              });
              permissionSources.set(permission, sources);
            }
          }
        }
      }
    });
  }

  // Convert to array
  const detected: DetectedPermission[] = [];
  for (const [id, sources] of permissionSources) {
    detected.push({ id, sources });
  }

  return detected;
}

/**
 * Compare detected permissions with declared permissions in manifest
 */
export function comparePermissions(
  detected: DetectedPermission[],
  declared: Array<{ id: string; reason?: string; optional?: boolean }>
): PermissionDetectionResult {
  const declaredIds = declared.map(p => p.id);

  const missing = detected.filter(d => !declaredIds.includes(d.id));

  const suggestions = missing.map(m => {
    const meta = PERMISSION_METADATA[m.id];
    return meta
      ? `{ "id": "${m.id}", "reason": "${meta.description}" }`
      : `{ "id": "${m.id}" }`;
  });

  return {
    detected,
    missing,
    declared: declaredIds,
    suggestions,
  };
}

/**
 * Generate permission entries for manifest
 */
export function generatePermissionEntries(
  permissions: DetectedPermission[]
): Array<{ id: string; reason: string }> {
  return permissions.map(p => {
    const meta = PERMISSION_METADATA[p.id];
    return {
      id: p.id,
      reason: meta?.description || `Required for ${p.id}`,
    };
  });
}
