# PROMPT 05: Unificar APIs e Corrigir Permissões

## Contexto

A API precisa de ajustes para suportar o fluxo unificado e corrigir o sistema de permissões.

## Arquivos a Modificar

1. `apps/api/src/routes/developer.ts` - Unificar endpoints
2. `apps/web/src/platform/sdk/host-bridge.ts` - Corrigir permissionMap
3. `apps/api/prisma/schema.prisma` - Adicionar relação ThirdPartyApp ↔ DeveloperApp (opcional)

## Requisitos

### 1. Unificar Endpoint de Upload (developer.ts)

Remover duplicação entre `/developer/apps/:id/bundle` e `/developer/upload-bundle`:

```typescript
// apps/api/src/routes/developer.ts

// MANTER APENAS UM ENDPOINT:
// POST /developer/bundle/upload

app.post('/developer/bundle/upload', {
  onRequest: authOnRequest,
  config: {
    rawBody: true,
  },
}, async (request, reply) => {
  const userId = (request as any).authUser?.sub;

  // Validar headers
  const appSlug = request.headers['x-app-slug'] as string;
  const appVersion = request.headers['x-app-version'] as string;

  if (!appSlug || !appVersion) {
    return reply.status(400).send({
      error: 'Missing required headers: X-App-Slug, X-App-Version',
    });
  }

  // ... resto da implementação do PROMPT-03
});

// DEPRECAR o endpoint antigo (manter por compatibilidade)
app.post('/developer/apps/:id/bundle', {
  onRequest: authOnRequest,
}, async (request, reply) => {
  console.warn('[DEPRECATED] Use POST /developer/bundle/upload instead');

  // Redirecionar para novo endpoint
  const appId = (request.params as { id: string }).id;
  const app = await prisma.thirdPartyApp.findUnique({
    where: { id: appId },
    select: { slug: true, currentVersion: true },
  });

  if (!app) {
    return reply.status(404).send({ error: 'App not found' });
  }

  // Forward para novo handler
  request.headers['x-app-slug'] = app.slug;
  request.headers['x-app-version'] = app.currentVersion;

  // ... chamar handler do novo endpoint
});
```

### 2. Corrigir permissionMap (host-bridge.ts)

```typescript
// apps/web/src/platform/sdk/host-bridge.ts

// REMOVER código de auto-grant (se existir)
// Este código foi adicionado incorretamente e deve ser removido:
/*
if (userStore.isInstalled(appId)) {
  if (!userStore.hasPermission(appId, requiredPermission as PermissionId)) {
    userStore.grantPermission(appId, requiredPermission as PermissionId);
    console.log(`[HostBridge] Auto-granted permission: ${requiredPermission}`);
  }
}
*/

// SUBSTITUIR permissionMap por versão completa:

const permissionMap: Record<string, string> = {
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

// Mapear formato legado para novo
const legacyPermissionMap: Record<string, string> = {
  'user.profile.read': 'auth:read',
  'user.profile.write': 'auth:write',
  'wallet.balance.read': 'wallet:read',
  'wallet.history.read': 'wallet:read',
  'wallet.transfer.request': 'wallet:transfer',
  'storage.app': 'storage:read', // Também implica storage:write
  'notifications.send': 'ui:toast',
  'blockchain.read': 'contracts:read',
  'blockchain.sign': 'contracts:execute',
};

function normalizePermission(permission: string): string {
  return legacyPermissionMap[permission] || permission;
}
```

### 3. Corrigir checkPermission

```typescript
// apps/web/src/platform/sdk/host-bridge.ts

async function checkPermission(
  appId: string,
  messageType: string
): Promise<{ allowed: boolean; reason?: string }> {
  // 1. Verificar se o tipo de mensagem requer permissão
  const requiredPermission = permissionMap[messageType];

  if (!requiredPermission) {
    // Mensagem não requer permissão especial
    return { allowed: true };
  }

  // 2. Para 'dev-preview', permitir tudo (modo desenvolvimento)
  if (appId === 'dev-preview') {
    console.log(`[HostBridge] Dev preview: auto-allowing ${messageType}`);
    return { allowed: true };
  }

  // 3. Verificar se é um app externo (tem apiKey)
  // Apps externos são verificados via getVerifiedApp
  const verifiedApp = await getVerifiedApp(appId);
  if (verifiedApp) {
    // App externo - verificar permissões do DeveloperApp
    const normalizedRequired = normalizePermission(requiredPermission);
    const hasPermission = verifiedApp.permissions.some(
      (p) => normalizePermission(p) === normalizedRequired
    );

    if (!hasPermission) {
      return {
        allowed: false,
        reason: `App does not have permission: ${requiredPermission}`,
      };
    }
    return { allowed: true };
  }

  // 4. App da App Store - verificar localStorage
  const userStore = useUserAppsStore.getState();

  // Verificar se app está instalado
  if (!userStore.isInstalled(appId)) {
    return {
      allowed: false,
      reason: `App not installed: ${appId}`,
    };
  }

  // Verificar se permissão foi concedida (normalizar antes)
  const normalizedRequired = normalizePermission(requiredPermission);
  const grantedPermissions = userStore.getAppPermissions(appId);
  const hasPermission = grantedPermissions.some(
    (p) => normalizePermission(p) === normalizedRequired
  );

  // Verificar também versão legada
  const hasLegacyPermission = grantedPermissions.includes(requiredPermission as any);

  if (!hasPermission && !hasLegacyPermission) {
    return {
      allowed: false,
      reason: `Permission not granted: ${requiredPermission}`,
    };
  }

  return { allowed: true };
}
```

### 4. Adicionar Endpoint distribute (Opcional)

Endpoint unificado para publicar em múltiplos targets:

```typescript
// apps/api/src/routes/developer.ts

interface DistributeRequest {
  appSlug: string;
  version: string;
  manifest: Record<string, unknown>;
  targets: {
    appStore?: {
      bundleUrl: string;
      bundleHash: string;
      changelog?: string;
    };
    external?: {
      allowedOrigins: string[];
      permissions: string[];
    };
  };
}

app.post('/developer/apps/distribute', {
  onRequest: authOnRequest,
}, async (request, reply) => {
  const userId = (request as any).authUser?.sub;
  const body = request.body as DistributeRequest;

  const result: {
    appStore?: { appId: string; status: string; bundleUrl: string };
    external?: { appId: string; apiKey: string; secretKey?: string };
  } = {};

  // 1. Publicar na App Store
  if (body.targets.appStore) {
    const { bundleUrl, bundleHash, changelog } = body.targets.appStore;

    // Criar/atualizar ThirdPartyApp
    let thirdPartyApp = await prisma.thirdPartyApp.findFirst({
      where: { appId: body.appSlug, developerId: userId },
    });

    if (!thirdPartyApp) {
      thirdPartyApp = await prisma.thirdPartyApp.create({
        data: {
          appId: body.appSlug,
          name: (body.manifest.name as string) || body.appSlug,
          slug: body.appSlug,
          developerId: userId,
          description: (body.manifest.description as string) || '',
          category: (body.manifest.category as string) || 'tools',
          sdkVersion: (body.manifest.sdkVersion as string) || '0.2.0',
          permissions: body.manifest.permissions || [],
          bundleUrl,
          bundleHash,
          currentVersion: body.version,
          status: 'PENDING_REVIEW',
        },
      });
    } else {
      thirdPartyApp = await prisma.thirdPartyApp.update({
        where: { id: thirdPartyApp.id },
        data: {
          bundleUrl,
          bundleHash,
          currentVersion: body.version,
          status: 'PENDING_REVIEW',
        },
      });
    }

    // Criar versão
    await prisma.appVersion.create({
      data: {
        appId: thirdPartyApp.id,
        version: body.version,
        changelog: changelog || null,
        bundleUrl,
        bundleHash,
      },
    });

    result.appStore = {
      appId: thirdPartyApp.id,
      status: 'PENDING_REVIEW',
      bundleUrl,
    };
  }

  // 2. Configurar SDK Externo
  if (body.targets.external) {
    const { allowedOrigins, permissions } = body.targets.external;

    // Verificar se já existe
    let developerApp = await prisma.developerApp.findFirst({
      where: { slug: body.appSlug, developerId: userId },
    });

    let secretKey: string | undefined;

    if (!developerApp) {
      // Criar novo
      const apiKey = generateApiKey();
      secretKey = generateSecretKey();
      const secretKeyHash = hashSecretKey(secretKey);

      developerApp = await prisma.developerApp.create({
        data: {
          name: (body.manifest.name as string) || body.appSlug,
          slug: body.appSlug,
          developerId: userId,
          description: (body.manifest.description as string) || null,
          apiKey,
          secretKeyHash,
          allowedOrigins,
          permissions,
          status: 'APPROVED',
        },
      });
    } else {
      // Atualizar existente
      developerApp = await prisma.developerApp.update({
        where: { id: developerApp.id },
        data: {
          allowedOrigins,
          permissions,
        },
      });
    }

    result.external = {
      appId: developerApp.id,
      apiKey: developerApp.apiKey,
      secretKey, // Undefined se app já existia
    };
  }

  return result;
});
```

### 5. Criar Migration para Relação (Opcional)

Se quiser linkar ThirdPartyApp com DeveloperApp:

```prisma
// prisma/schema.prisma

model ThirdPartyApp {
  // ... campos existentes ...

  // Link para DeveloperApp (se também usado externamente)
  externalAppId String? @unique
  externalApp   DeveloperApp? @relation("AppStoreToExternal", fields: [externalAppId], references: [id])
}

model DeveloperApp {
  // ... campos existentes ...

  // Link para ThirdPartyApp (se também está na App Store)
  appStoreApp ThirdPartyApp? @relation("AppStoreToExternal")
}
```

```bash
# Criar migration
npx prisma migrate dev --name add_app_linking
```

## Testes

1. Verificar que permissionMap tem todos os tipos de mensagem do SDK
2. Testar app instalado com permissões - deve funcionar
3. Testar app instalado sem permissões - deve retornar erro claro
4. Testar dev-preview - deve permitir tudo
5. Testar app externo com API Key válida
6. Testar app externo sem permissão necessária
7. Testar endpoint distribute com appStore
8. Testar endpoint distribute com external
9. Testar endpoint distribute com ambos

## Critérios de Aceitação

- [ ] permissionMap completo com todos os tipos de mensagem
- [ ] Código de auto-grant removido
- [ ] checkPermission funciona para App Store apps
- [ ] checkPermission funciona para External apps
- [ ] checkPermission permite dev-preview
- [ ] Normalização de permissões legadas funciona
- [ ] Endpoint /developer/bundle/upload funcional
- [ ] Endpoint /developer/apps/distribute funcional
- [ ] Mensagens de erro claras e úteis
