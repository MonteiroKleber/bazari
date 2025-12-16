# 02 - Tipos de Distribuição

## Visão Geral

Este documento detalha as diferenças entre os dois tipos de distribuição de apps no Bazari.

## Comparação Detalhada

| Aspecto | App Store (ThirdPartyApp) | SDK Externo (DeveloperApp) |
|---------|--------------------------|----------------------------|
| **Onde roda** | Iframe dentro do Bazari | Domínio do desenvolvedor |
| **Hospedagem do bundle** | IPFS (Bazari gerencia) | Desenvolvedor gerencia |
| **Autenticação** | Session do usuário logado | API Key + Secret Key |
| **Descoberta** | App Store marketplace | Link direto do dev |
| **Instalação** | Usuário clica "Instalar" | Não aplicável |
| **Permissões** | Concedidas na instalação | Definidas na criação |
| **Revisão** | DAO/Admin review | Auto-aprovado |
| **Monetização** | BZR (in-app, paid, etc) | Externo ao Bazari |
| **Modelo Prisma** | `ThirdPartyApp` | `DeveloperApp` |

## App Store (ThirdPartyApp)

### Fluxo de Vida

```
DRAFT → PENDING_REVIEW → IN_REVIEW → APPROVED → PUBLISHED
                                  ↘ REJECTED → (edita) → PENDING_REVIEW
```

### Características

1. **Bundle IPFS**
   - Tarball extraído e uploadado
   - CID imutável
   - Servido via `https://bazari.libervia.xyz/ipfs/{CID}`

2. **Sandbox de Segurança**
   - Iframe com `sandbox="allow-scripts allow-same-origin allow-forms"`
   - Comunicação via postMessage
   - Sem acesso direto a APIs do Bazari

3. **Sistema de Permissões**
   - Usuário concede permissões ao instalar
   - Armazenado em localStorage: `grantedPermissions[appId]`
   - Verificado em runtime pelo host-bridge

4. **Revisão de Segurança**
   - Admin/DAO revisa antes de publicar
   - Pode ser rejeitado com feedback
   - Changelog obrigatório em updates

### Modelo de Dados

```prisma
model ThirdPartyApp {
  id String @id @default(cuid())

  appId String @unique           // com.dev.myapp
  name String
  slug String @unique

  developerId String
  developer User @relation()

  bundleUrl String               // https://bazari.libervia.xyz/ipfs/Qm...
  bundleHash String              // CID do IPFS

  permissions Json               // [{ id, reason, optional }]
  status AppStatus

  // ... outros campos
}
```

## SDK Externo (DeveloperApp)

### Fluxo de Vida

```
PENDING → APPROVED (auto)
       ↘ SUSPENDED (manual admin)
       ↘ REJECTED (violação)
```

### Características

1. **Credenciais de API**
   - `apiKey`: Identificador único (`baz_app_xxx`)
   - `secretKey`: Para HMAC signing (armazenado como hash)
   - Pode ser rotacionado a qualquer momento

2. **Controle de Origem**
   - `allowedOrigins[]`: Lista de domínios permitidos
   - Validado no host-bridge antes de processar mensagens

3. **Rate Limiting**
   - Token bucket por app
   - Default: 100 capacity, 10 tokens/sec
   - Customizável por app

4. **Segurança Adicional**
   - HMAC signature verification
   - Replay protection (nonce + timestamp)
   - Origin validation

### Modelo de Dados

```prisma
model DeveloperApp {
  id String @id @default(cuid())

  developerId String
  developer Profile @relation()

  name String
  slug String @unique

  apiKey String @unique          // baz_app_xxx
  secretKeyHash String?          // SHA256 hash

  allowedOrigins String[]        // ["https://meusite.com"]
  permissions String[]           // ["wallet:read", "user:read"]

  status DeveloperAppStatus

  // Rate limiting
  rateLimitCapacity Int?
  rateLimitRefillRate Int?

  // ... outros campos
}
```

## Sistema de Permissões

### Permissões Comuns

Ambos os tipos usam o mesmo catálogo de permissões:

```typescript
type PermissionId =
  | 'user.profile.read'
  | 'user.profile.write'
  | 'wallet.balance.read'
  | 'wallet.history.read'
  | 'wallet.transfer.request'
  | 'storage.app'
  | 'notifications.send'
  | 'blockchain.read'
  | 'blockchain.sign'
  // ... etc
```

### Diferença na Verificação

**App Store:**
```typescript
// host-bridge.ts
function checkPermission(appId: string, messageType: string): boolean {
  const permissionId = permissionMap[messageType];
  const userStore = useUserAppsStore.getState();
  return userStore.hasPermission(appId, permissionId);
}
```

**SDK Externo:**
```typescript
// host-bridge.ts
function checkPermission(apiKey: string, messageType: string): boolean {
  const app = await getVerifiedApp(apiKey);
  const permissionId = permissionMap[messageType];
  return app.permissions.includes(permissionId);
}
```

### Permission Map

Mapeia tipos de mensagem SDK para IDs de permissão:

```typescript
const permissionMap: Record<string, PermissionId> = {
  'auth:getCurrentUser': 'user.profile.read',
  'auth:requestPermission': 'user.profile.read',
  'wallet:getBalance': 'wallet.balance.read',
  'wallet:getHistory': 'wallet.history.read',
  'wallet:transfer': 'wallet.transfer.request',
  'storage:get': 'storage.app',
  'storage:set': 'storage.app',
  'ui:toast': 'notifications.send',
  'ui:success': 'notifications.send',
  'ui:error': 'notifications.send',
  // ... precisa completar
};
```

## Quando Usar Cada Tipo

### Use App Store quando:
- Quer alcançar usuários do marketplace Bazari
- Quer usar infraestrutura IPFS do Bazari
- Quer monetizar via BZR token
- App é standalone e completo
- Precisa de revisão de segurança (compliance)

### Use SDK Externo quando:
- Já tem um site/app existente
- Quer integrar funcionalidades Bazari
- Precisa de controle sobre hospedagem
- Quer autenticação entre serviços (backend)
- App é complemento do seu serviço principal

### Use Ambos quando:
- Quer presença no marketplace E integração externa
- Quer oferecer mesmo app em múltiplos contextos
- Quer maximizar alcance

## Migração de Apps Existentes

### App Store → SDK Externo
1. Criar DeveloperApp com mesmas permissões
2. Gerar API Key
3. Configurar allowedOrigins
4. Linkar com ThirdPartyApp (opcional)

### SDK Externo → App Store
1. Criar bundle do app
2. Upload para IPFS
3. Submeter para review
4. Linkar com DeveloperApp (opcional)

## Considerações de Segurança

### App Store
- Bundle imutável (IPFS)
- Revisão humana antes de publicar
- Sandbox restrito
- Permissões explícitas do usuário

### SDK Externo
- API Key pode vazar (responsabilidade do dev)
- Secret Key deve ser mantida segura
- Origins devem ser específicas (não usar `*`)
- HMAC signing recomendado para operações sensíveis
