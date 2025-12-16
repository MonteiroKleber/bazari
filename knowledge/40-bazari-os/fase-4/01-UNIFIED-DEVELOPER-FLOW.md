# 01 - Fluxo Unificado de Desenvolvimento

## Visão Geral

O Bazari Studio deve ser a ferramenta central para desenvolvimento de **qualquer tipo de app** no ecossistema Bazari.

## Tipos de App

### ThirdPartyApp (App Store)
- Publicado na Bazari App Store
- Roda em iframe dentro do Bazari
- Bundle hospedado no IPFS
- Usuários instalam pelo marketplace
- Permissões concedidas no momento da instalação
- Status: DRAFT → PENDING_REVIEW → APPROVED → PUBLISHED

### DeveloperApp (SDK Externo)
- Usa SDK no domínio do desenvolvedor
- Roda no site/app do desenvolvedor
- Bundle hospedado pelo desenvolvedor
- Autenticação via API Key + Secret Key
- Permissões definidas na criação do app
- Status: PENDING → APPROVED (auto-aprovado)

## Fluxo Atual

```
Developer
    │
    ├── Quer publicar na App Store?
    │   └── CLI: bazari publish
    │       └── Cria ThirdPartyApp
    │
    └── Quer usar SDK externamente?
        └── Developer Portal → API Keys
            └── Cria DeveloperApp
```

**Problema**: Fluxos completamente separados, sem integração.

## Fluxo Proposto

```
Developer
    │
    └── Bazari Studio / CLI
            │
            ├── Configuração do Manifesto
            │   └── distribution: { appStore, external }
            │
            ├── bazari publish --target appstore
            │   └── ThirdPartyApp
            │
            ├── bazari publish --target external
            │   └── DeveloperApp + API Key
            │
            └── bazari publish --target both
                ├── ThirdPartyApp
                └── DeveloperApp (linked)
```

## Modelo de Dados Proposto

### Relação entre ThirdPartyApp e DeveloperApp

```prisma
model ThirdPartyApp {
  id String @id @default(cuid())

  // ... campos existentes ...

  // Link para DeveloperApp (se também for usado externamente)
  externalAppId String? @unique
  externalApp   DeveloperApp? @relation("AppStoreToExternal", fields: [externalAppId], references: [id])
}

model DeveloperApp {
  id String @id @default(cuid())

  // ... campos existentes ...

  // Link para ThirdPartyApp (se também estiver na App Store)
  appStoreApp ThirdPartyApp? @relation("AppStoreToExternal")
}
```

## Manifesto Atualizado

```typescript
interface AppManifest {
  appId: string;
  name: string;
  slug: string;
  version: string;
  description: string;

  // NOVO: Configuração de distribuição
  distribution: {
    appStore: boolean;      // Publicar na App Store
    external: boolean;      // Usar SDK externamente
    allowedOrigins?: string[]; // Origens para SDK externo
  };

  permissions: PermissionRequest[];
  sdkVersion: string;
  // ... outros campos
}
```

## UI do Studio

### Wizard de Criação

```
┌─────────────────────────────────────────────────────────┐
│  Novo Projeto                                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Como você quer distribuir seu app?                     │
│                                                         │
│  ☑ Publicar na Bazari App Store                        │
│    Usuários instalam pelo marketplace                   │
│    Hospedado no IPFS                                    │
│                                                         │
│  ☐ Integração Externa (SDK)                            │
│    Usar em seu próprio site/app                         │
│    Você gerencia a hospedagem                           │
│                                                         │
│  [Próximo]                                              │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Página de Publish

```
┌─────────────────────────────────────────────────────────┐
│  Publicar: meu-app v1.0.0                              │
├─────────────────────────────────────────────────────────┤
│  [App Store]  [SDK Externo]                            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  📦 App Store                                          │
│  ─────────────                                         │
│  Status: Pronto para publicar                          │
│  Bundle: IPFS (QmXxx...)                               │
│                                                         │
│  [Publicar na App Store]                               │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  🔑 SDK Externo                                        │
│  ─────────────                                         │
│  Status: Ativo                                         │
│  API Key: baz_app_xxx...                               │
│  Origens: https://meusite.com                          │
│                                                         │
│  [Copiar Credenciais] [Regenerar Keys]                 │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## CLI Atualizado

### Comandos

```bash
# Criar projeto
bazari create my-app

# Durante criação, pergunta distribuição
? Como você quer distribuir seu app?
  ◉ App Store (Bazari)
  ○ SDK Externo (meu site)
  ○ Ambos

# Build
bazari build

# Publish para App Store
bazari publish --target appstore

# Publish para SDK externo (gera API Key)
bazari publish --target external --origin https://meusite.com

# Publish para ambos
bazari publish --target both --origin https://meusite.com

# Gerenciar keys (SDK externo)
bazari keys list
bazari keys rotate
bazari keys revoke
```

### Flags do Publish

| Flag | Descrição |
|------|-----------|
| `--target` | `appstore`, `external`, `both` |
| `--origin` | Origem permitida para SDK (requerido se external) |
| `--changelog` | Changelog da versão |
| `--no-submit` | Upload sem submeter para review |

## API Unificada

### Novo Endpoint: POST /developer/apps/distribute

```typescript
// Request
{
  appSlug: string;
  version: string;
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
  manifest: AppManifest;
}

// Response
{
  appStore?: {
    appId: string;
    status: 'PENDING_REVIEW';
    bundleUrl: string;
  };
  external?: {
    appId: string;
    apiKey: string;
    secretKey: string; // Mostrado apenas uma vez
  };
}
```

## Benefícios

1. **Experiência Unificada**: Dev usa mesma ferramenta para qualquer tipo de app
2. **Flexibilidade**: Pode escolher um ou ambos os modos de distribuição
3. **Reutilização**: Mesmo código pode ser publicado de múltiplas formas
4. **Transparência**: Configuração clara e visível no manifesto
5. **Simplicidade**: Um único fluxo de desenvolvimento

## Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| Complexidade do manifesto | Valores default sensatos |
| Confusão do usuário | UI clara com explicações |
| Migração de apps existentes | Campo `distribution` opcional |
| API Keys expostas | Warning na UI + docs claros |

## Dependências

- Schema do manifesto atualizado
- Modelo Prisma com relação ThirdPartyApp ↔ DeveloperApp
- CLI com suporte a `--target`
- API endpoint `/developer/apps/distribute`
- Studio UI com wizard de distribuição
