# Fase 4: Unificação do Fluxo de Desenvolvimento

## Objetivo

Unificar o Bazari Studio para suportar desenvolvimento de **ambos os tipos de apps**:
- **ThirdPartyApp** (App Store) - Apps publicados na loja Bazari
- **DeveloperApp** (SDK Externo) - Apps que usam SDK em domínios externos

## Documentos

### Especificações
- [01-UNIFIED-DEVELOPER-FLOW.md](./01-UNIFIED-DEVELOPER-FLOW.md) - Fluxo unificado de desenvolvimento
- [02-DISTRIBUTION-TYPES.md](./02-DISTRIBUTION-TYPES.md) - Tipos de distribuição (App Store vs SDK)
- [03-IPFS-UPLOAD-FIX.md](./03-IPFS-UPLOAD-FIX.md) - Correções no fluxo IPFS
- [04-PERMISSION-SYSTEM.md](./04-PERMISSION-SYSTEM.md) - Sistema de permissões unificado
- [05-CLI-UPDATES.md](./05-CLI-UPDATES.md) - Atualizações necessárias no CLI
- [06-SDK-UPDATES.md](./06-SDK-UPDATES.md) - Atualizações necessárias no SDK
- [07-DEVELOPER-PORTAL-ANALYSIS.md](./07-DEVELOPER-PORTAL-ANALYSIS.md) - Análise Developer Portal vs Studio

### Prompts de Implementação
- [prompts/PROMPT-01-MANIFEST-SCHEMA.md](./prompts/PROMPT-01-MANIFEST-SCHEMA.md) - Atualizar schema do manifesto
- [prompts/PROMPT-02-STUDIO-UI.md](./prompts/PROMPT-02-STUDIO-UI.md) - UI de distribuição no Studio
- [prompts/PROMPT-03-IPFS-FIX.md](./prompts/PROMPT-03-IPFS-FIX.md) - Corrigir fluxo IPFS
- [prompts/PROMPT-04-CLI-DISTRIBUTION.md](./prompts/PROMPT-04-CLI-DISTRIBUTION.md) - CLI com targets
- [prompts/PROMPT-05-API-UNIFICATION.md](./prompts/PROMPT-05-API-UNIFICATION.md) - Unificar APIs
- [prompts/PROMPT-06-DEVELOPER-PORTAL.md](./prompts/PROMPT-06-DEVELOPER-PORTAL.md) - Ajustes no Developer Portal

## Estado Atual do Sistema

### ThirdPartyApp (App Store)
- **Database**: `ThirdPartyApp` model em Prisma
- **API**: `/developer/apps/*`, `/developer/submit-version`, `/developer/upload-bundle`
- **Frontend**: App Store pages, Developer Portal
- **Publicação**: Upload tarball → IPFS → bundleUrl → PENDING_REVIEW
- **Permissões**: `grantedPermissions` em localStorage por usuário

### DeveloperApp (SDK Externo)
- **Database**: `DeveloperApp` model em Prisma
- **API**: `/developer/sdk-apps/*`, `/developer/internal/validate-api-key`
- **Frontend**: ApiKeysPage no Developer Portal
- **Autenticação**: API Key + Secret Key (HMAC)
- **Permissões**: `permissions[]` no DeveloperApp, validado em `host-bridge.ts`

### Problemas Identificados

1. **Fluxos Separados**: Dev precisa escolher entre App Store ou SDK manualmente
2. **Manifesto Incompleto**: `bazari.manifest.json` não tem campo `distribution`
3. **Endpoint Duplicado**: `/developer/apps/:id/bundle` vs `/developer/upload-bundle`
4. **IPFS Port Mismatch**: Nginx aponta para 8081, API serve em 3000
5. **Permission Mapping**: `permissionMap` incompleto no host-bridge
6. **Auto-grant Problemático**: Código de auto-grant adicionado precisa ser removido

## Mudanças Necessárias

### 1. Manifesto (`bazari.manifest.json`)
```json
{
  "distribution": {
    "appStore": true,
    "external": false
  }
}
```

### 2. CLI
- `bazari publish --target appstore|external|both`
- `bazari keys generate` (para SDK externo)

### 3. Studio UI
- Wizard de criação com escolha de tipo
- Página de publish com seções separadas

### 4. API
- Unificar endpoints de upload
- Endpoint para criar DeveloperApp do Studio

### 5. IPFS
- Corrigir configuração de portas
- Adicionar validação de bundle

## Ordem de Implementação

1. **PROMPT-03: IPFS Fix** - Corrigir roteamento de portas (CRÍTICO)
2. **PROMPT-05: API Unification** - Corrigir permissionMap e unificar endpoints
3. **PROMPT-01: Schema & Manifest** - Atualizar schema do manifesto
4. **PROMPT-02: Studio UI** - Wizard de distribuição no Studio
5. **PROMPT-06: Developer Portal** - Ajustes no Portal para integrar com novo fluxo
6. **PROMPT-04: CLI Distribution** - Adicionar flag `--target` (opcional)
