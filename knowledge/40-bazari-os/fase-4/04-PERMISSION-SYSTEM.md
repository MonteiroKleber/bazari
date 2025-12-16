# 04 - Sistema de Permissões Unificado

## Estado Atual

### Problema: permissionMap Incompleto

O `permissionMap` em `host-bridge.ts` mapeia apenas 11 tipos de mensagem, mas o SDK suporta 72+ tipos.

**Atual:**
```typescript
const permissionMap: Record<string, string> = {
  'auth:getCurrentUser': 'auth:read',
  'wallet:getBalance': 'wallet:read',
  'wallet:transfer': 'wallet:transfer',
  'storage:get': 'storage:read',
  'storage:set': 'storage:write',
  'ui:toast': 'ui:toast',
  'ui:success': 'ui:toast',
  'ui:error': 'ui:toast',
  'ui:showModal': 'ui:modal',
  'ui:confirm': 'ui:modal',
  'ui:prompt': 'ui:modal',
};
```

### Problema: Auto-grant Incorreto

Código problemático adicionado anteriormente:
```typescript
// REMOVER: Este código auto-concede permissões incorretamente
if (userStore.isInstalled(appId)) {
  if (!userStore.hasPermission(appId, requiredPermission as PermissionId)) {
    userStore.grantPermission(appId, requiredPermission as PermissionId);
    console.log(`[HostBridge] Auto-granted permission: ${requiredPermission}`);
  }
}
```

## Catálogo de Permissões

### Definição Completa

```typescript
// permission.types.ts

export type PermissionId =
  // Auth
  | 'auth:read'           // Ler dados do usuário
  | 'auth:write'          // Modificar perfil

  // Wallet
  | 'wallet:read'         // Ver saldo e histórico
  | 'wallet:transfer'     // Solicitar transferências

  // Storage
  | 'storage:read'        // Ler dados armazenados
  | 'storage:write'       // Escrever dados

  // UI
  | 'ui:toast'            // Mostrar notificações
  | 'ui:modal'            // Abrir modais

  // Contracts
  | 'contracts:read'      // Ler contratos
  | 'contracts:deploy'    // Deploy de contratos
  | 'contracts:execute'   // Executar contratos

  // Location
  | 'location:read'       // Acessar GPS
  | 'location:geocode'    // Geocodificação

  // Maps
  | 'maps:display'        // Exibir mapas
  | 'maps:directions'     // Calcular rotas

  // Events
  | 'events:subscribe'    // Subscrever eventos
  | 'events:emit';        // Emitir eventos
```

## Permission Map Completo

```typescript
// host-bridge.ts

const permissionMap: Record<string, PermissionId> = {
  // ============ AUTH ============
  'auth:getCurrentUser': 'auth:read',
  'auth:getPermissions': 'auth:read',
  'auth:requestPermission': 'auth:read',
  'auth:isInBazari': 'auth:read',

  // ============ WALLET ============
  'wallet:getBalance': 'wallet:read',
  'wallet:getHistory': 'wallet:read',
  'wallet:getAddress': 'wallet:read',
  'wallet:transfer': 'wallet:transfer',
  'wallet:requestTransfer': 'wallet:transfer',

  // ============ STORAGE ============
  'storage:get': 'storage:read',
  'storage:getAll': 'storage:read',
  'storage:keys': 'storage:read',
  'storage:has': 'storage:read',
  'storage:set': 'storage:write',
  'storage:delete': 'storage:write',
  'storage:clear': 'storage:write',

  // ============ UI ============
  'ui:toast': 'ui:toast',
  'ui:success': 'ui:toast',
  'ui:error': 'ui:toast',
  'ui:warning': 'ui:toast',
  'ui:info': 'ui:toast',
  'ui:showModal': 'ui:modal',
  'ui:hideModal': 'ui:modal',
  'ui:confirm': 'ui:modal',
  'ui:prompt': 'ui:modal',
  'ui:showLoading': 'ui:toast',
  'ui:hideLoading': 'ui:toast',

  // ============ CONTRACTS ============
  'contracts:query': 'contracts:read',
  'contracts:getInfo': 'contracts:read',
  'contracts:listDeployed': 'contracts:read',
  'contracts:deploy': 'contracts:deploy',
  'contracts:deployLoyalty': 'contracts:deploy',
  'contracts:deployEscrow': 'contracts:deploy',
  'contracts:deployRevenueSplit': 'contracts:deploy',
  'contracts:execute': 'contracts:execute',
  'contracts:call': 'contracts:execute',

  // ============ LOCATION ============
  'location:getCurrentPosition': 'location:read',
  'location:watchPosition': 'location:read',
  'location:clearWatch': 'location:read',
  'location:geocode': 'location:geocode',
  'location:reverseGeocode': 'location:geocode',

  // ============ MAPS ============
  'maps:showMap': 'maps:display',
  'maps:hideMap': 'maps:display',
  'maps:setCenter': 'maps:display',
  'maps:setZoom': 'maps:display',
  'maps:addMarker': 'maps:display',
  'maps:removeMarker': 'maps:display',
  'maps:clearMarkers': 'maps:display',
  'maps:getDirections': 'maps:directions',
  'maps:showDirections': 'maps:directions',

  // ============ EVENTS ============
  'events:subscribe': 'events:subscribe',
  'events:unsubscribe': 'events:subscribe',
  'events:emit': 'events:emit',
  'events:once': 'events:subscribe',
};
```

## Mapeamento de Permissões Legacy

Para compatibilidade com permissões existentes:

```typescript
// Mapear formato antigo para novo
const legacyPermissionMap: Record<string, PermissionId> = {
  'user.profile.read': 'auth:read',
  'user.profile.write': 'auth:write',
  'wallet.balance.read': 'wallet:read',
  'wallet.history.read': 'wallet:read',
  'wallet.transfer.request': 'wallet:transfer',
  'storage.app': 'storage:read',  // storage:read + storage:write
  'notifications.send': 'ui:toast',
  'camera': 'location:read',  // deprecated
  'location': 'location:read',
  'blockchain.read': 'contracts:read',
  'blockchain.sign': 'contracts:execute',
};

function normalizePermission(permission: string): PermissionId {
  return legacyPermissionMap[permission] || permission as PermissionId;
}
```

## Função checkPermission Corrigida

```typescript
// host-bridge.ts

async function checkPermission(
  appId: string,
  messageType: string,
  isExternalApp: boolean = false
): Promise<{ allowed: boolean; reason?: string }> {
  // 1. Verificar se o tipo de mensagem requer permissão
  const requiredPermission = permissionMap[messageType];

  if (!requiredPermission) {
    // Mensagem não requer permissão especial (ex: ping, version)
    return { allowed: true };
  }

  // 2. Para apps externos (DeveloperApp), verificar via API Key
  if (isExternalApp) {
    const verifiedApp = await getVerifiedApp(appId);
    if (!verifiedApp) {
      return { allowed: false, reason: 'Invalid API key' };
    }

    const hasPermission = verifiedApp.permissions.includes(requiredPermission);
    if (!hasPermission) {
      return {
        allowed: false,
        reason: `App does not have permission: ${requiredPermission}`
      };
    }

    return { allowed: true };
  }

  // 3. Para apps da App Store (ThirdPartyApp), verificar localStorage
  const userStore = useUserAppsStore.getState();

  // Verificar se app está instalado
  if (!userStore.isInstalled(appId)) {
    return {
      allowed: false,
      reason: 'App not installed'
    };
  }

  // Verificar se permissão foi concedida
  if (!userStore.hasPermission(appId, requiredPermission as PermissionId)) {
    return {
      allowed: false,
      reason: `Permission not granted: ${requiredPermission}`
    };
  }

  return { allowed: true };
}
```

## Fluxo de Concessão de Permissões

### App Store (ThirdPartyApp)

```
1. Usuário clica "Instalar" na App Store
           ↓
2. Modal mostra permissões requeridas
           ↓
3. Usuário aceita permissões
           ↓
4. installApp(appId, grantedPermissions)
           ↓
5. Salvo em localStorage:
   grantedPermissions[appId] = ['auth:read', 'wallet:read', ...]
           ↓
6. App pode fazer chamadas SDK com essas permissões
```

### SDK Externo (DeveloperApp)

```
1. Dev cria DeveloperApp no Portal
           ↓
2. Seleciona permissões desejadas
           ↓
3. Permissões salvas em DeveloperApp.permissions[]
           ↓
4. API Key gerada com essas permissões
           ↓
5. App usa SDK com API Key
           ↓
6. Host-bridge valida via /developer/internal/validate-api-key
```

## Permissões por Risco

```typescript
interface PermissionDefinition {
  id: PermissionId;
  name: string;
  description: string;
  risk: 'low' | 'medium' | 'high' | 'critical';
  requiresConfirmation?: boolean;
}

const PERMISSION_DEFINITIONS: Record<PermissionId, PermissionDefinition> = {
  // LOW RISK
  'auth:read': {
    id: 'auth:read',
    name: 'Ler Perfil',
    description: 'Ver informações do seu perfil',
    risk: 'low'
  },
  'ui:toast': {
    id: 'ui:toast',
    name: 'Notificações',
    description: 'Mostrar notificações na tela',
    risk: 'low'
  },

  // MEDIUM RISK
  'wallet:read': {
    id: 'wallet:read',
    name: 'Ver Carteira',
    description: 'Ver saldo e histórico de transações',
    risk: 'medium'
  },
  'storage:read': {
    id: 'storage:read',
    name: 'Ler Dados',
    description: 'Ler dados salvos pelo app',
    risk: 'medium'
  },

  // HIGH RISK
  'wallet:transfer': {
    id: 'wallet:transfer',
    name: 'Transferências',
    description: 'Solicitar transferências de tokens',
    risk: 'high',
    requiresConfirmation: true
  },
  'contracts:deploy': {
    id: 'contracts:deploy',
    name: 'Deploy Contratos',
    description: 'Fazer deploy de smart contracts',
    risk: 'high',
    requiresConfirmation: true
  },

  // CRITICAL
  'contracts:execute': {
    id: 'contracts:execute',
    name: 'Executar Contratos',
    description: 'Executar funções de smart contracts',
    risk: 'critical',
    requiresConfirmation: true
  }
};
```

## Checklist de Implementação

- [ ] Completar `permissionMap` com todos os tipos de mensagem
- [ ] Remover código de auto-grant
- [ ] Criar mapeamento legacy → novo formato
- [ ] Atualizar `checkPermission` para usar novo formato
- [ ] Adicionar `PERMISSION_DEFINITIONS` com metadados
- [ ] Atualizar modal de instalação para mostrar riscos
- [ ] Adicionar confirmação para permissões high/critical
- [ ] Atualizar CLI para mostrar permissões no create
- [ ] Atualizar SDK para documentar permissões
- [ ] Criar testes para validação de permissões
