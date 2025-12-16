# PROMPT 01: Atualizar Schema do Manifesto

## Contexto

O `bazari.manifest.json` precisa de um novo campo `distribution` para definir como o app será distribuído.

## Arquivos a Modificar

1. `packages/bazari-cli/src/utils/config.ts` - Interface AppManifest
2. `packages/bazari-cli/src/commands/create.ts` - Adicionar pergunta de distribuição
3. `packages/bazari-cli/src/commands/validate.ts` - Validar novo campo
4. `packages/bazari-cli/templates/react-ts/` - Atualizar template

## Requisitos

### 1. Atualizar Interface AppManifest

```typescript
// packages/bazari-cli/src/utils/config.ts

export interface AppManifest {
  appId: string;
  name: string;
  slug: string;
  version: string;
  description: string;
  longDescription?: string;
  category: string;
  tags: string[];
  icon: string;
  color: string;
  entryPoint: string;
  screenshots?: string[];
  permissions: Array<{
    id: string;
    reason: string;
    optional?: boolean;
  }>;
  sdkVersion: string;

  // NOVO CAMPO
  distribution?: {
    /** Publicar na Bazari App Store */
    appStore: boolean;
    /** Usar SDK em domínio externo */
    external: boolean;
    /** Origens permitidas para SDK externo */
    allowedOrigins?: string[];
  };

  monetizationType?: 'FREE' | 'PAID' | 'FREEMIUM' | 'SUBSCRIPTION';
  price?: string;
}
```

### 2. Atualizar create.ts

Após perguntar categoria, adicionar:

```typescript
const DISTRIBUTION_CHOICES = [
  {
    name: 'App Store (Bazari)',
    value: 'appstore',
    description: 'Publicar no marketplace Bazari',
  },
  {
    name: 'SDK Externo (meu site)',
    value: 'external',
    description: 'Integrar via API Key no seu domínio',
  },
  {
    name: 'Ambos',
    value: 'both',
    description: 'App Store + integração externa',
  },
];

// Adicionar prompt
const { distributionType } = await inquirer.prompt([
  {
    type: 'list',
    name: 'distributionType',
    message: 'Como você quer distribuir seu app?',
    choices: DISTRIBUTION_CHOICES.map((c) => ({
      name: `${c.name} - ${chalk.dim(c.description)}`,
      value: c.value,
    })),
  },
]);

// Se external ou both, perguntar origens
let allowedOrigins: string[] = [];
if (distributionType === 'external' || distributionType === 'both') {
  const { origins } = await inquirer.prompt([
    {
      type: 'input',
      name: 'origins',
      message: 'Origens permitidas (separadas por vírgula):',
      default: 'http://localhost:3000',
      validate: (input: string) => {
        const urls = input.split(',').map((u) => u.trim());
        for (const url of urls) {
          try {
            new URL(url);
          } catch {
            return `URL inválida: ${url}`;
          }
        }
        return true;
      },
    },
  ]);
  allowedOrigins = origins.split(',').map((u: string) => u.trim());
}

// No manifesto
const manifest: AppManifest = {
  // ... outros campos
  distribution: {
    appStore: distributionType === 'appstore' || distributionType === 'both',
    external: distributionType === 'external' || distributionType === 'both',
    allowedOrigins:
      distributionType !== 'appstore' ? allowedOrigins : undefined,
  },
};
```

### 3. Atualizar validate.ts

Adicionar validação do campo distribution:

```typescript
function validateDistribution(
  distribution: AppManifest['distribution']
): string[] {
  const errors: string[] = [];

  if (!distribution) {
    // Campo opcional, usar defaults
    return errors;
  }

  if (!distribution.appStore && !distribution.external) {
    errors.push(
      'distribution: pelo menos appStore ou external deve ser true'
    );
  }

  if (distribution.external && !distribution.allowedOrigins?.length) {
    errors.push(
      'distribution.allowedOrigins: obrigatório quando external=true'
    );
  }

  if (distribution.allowedOrigins) {
    for (const origin of distribution.allowedOrigins) {
      try {
        new URL(origin);
      } catch {
        errors.push(`distribution.allowedOrigins: URL inválida "${origin}"`);
      }
    }
  }

  return errors;
}
```

### 4. Atualizar Template

No arquivo `packages/bazari-cli/templates/react-ts/bazari.manifest.json`:

```json
{
  "appId": "com.bazari.{{slug}}",
  "name": "{{name}}",
  "slug": "{{slug}}",
  "version": "0.1.0",
  "description": "{{description}}",
  "category": "{{category}}",
  "tags": ["{{category}}", "bazari-app"],
  "icon": "Package",
  "color": "from-blue-500 to-purple-600",
  "entryPoint": "/index.html",
  "permissions": [
    {
      "id": "auth:read",
      "reason": "Para exibir informações do seu perfil"
    },
    {
      "id": "wallet:read",
      "reason": "Para exibir seu saldo"
    }
  ],
  "distribution": {
    "appStore": true,
    "external": false
  },
  "sdkVersion": "0.2.0",
  "monetizationType": "FREE"
}
```

## Testes

1. Criar novo projeto e verificar que pergunta de distribuição aparece
2. Selecionar "App Store" e verificar manifesto
3. Selecionar "SDK Externo" e verificar que pede origens
4. Selecionar "Ambos" e verificar manifesto completo
5. Executar `bazari validate` e verificar que aceita novo formato
6. Verificar que manifesto sem distribution ainda é válido (backwards compatible)

## Critérios de Aceitação

- [ ] Interface AppManifest atualizada com campo distribution
- [ ] create.ts pergunta tipo de distribuição
- [ ] create.ts pergunta origens se external
- [ ] validate.ts valida campo distribution
- [ ] Template atualizado com distribution default
- [ ] Backwards compatible (manifesto antigo ainda funciona)
