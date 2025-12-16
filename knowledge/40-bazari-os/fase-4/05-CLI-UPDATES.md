# 05 - Atualizações do CLI

## Estado Atual

### Comandos Existentes

| Comando | Descrição |
|---------|-----------|
| `bazari create [name]` | Criar novo projeto |
| `bazari dev` | Iniciar servidor de desenvolvimento |
| `bazari build` | Build do projeto |
| `bazari publish` | Publicar na App Store |
| `bazari validate` | Validar manifesto |
| `bazari login` | Autenticar via browser |
| `bazari logout` | Remover token |
| `bazari whoami` | Mostrar usuário logado |
| `bazari studio` | Abrir Bazari Studio (local) |

### Limitações Atuais

1. **publish** só suporta App Store
2. Não há comando para gerar API Key
3. Não há suporte a múltiplos targets
4. Manifesto não tem campo `distribution`

## Comandos Propostos

### bazari create (Atualizado)

```bash
bazari create [name]
```

**Novo prompt durante criação:**

```
? Como você quer distribuir seu app?
  ◉ App Store (Bazari) - Publicar no marketplace
  ○ SDK Externo (meu site) - Integrar via API Key
  ○ Ambos - App Store + integração externa
```

**Resultado no manifesto:**

```json
{
  "distribution": {
    "appStore": true,
    "external": false
  }
}
```

### bazari publish (Atualizado)

```bash
bazari publish [options]

Options:
  -d, --dir <dir>         Build directory (default: "dist")
  -t, --target <target>   Target: appstore, external, both (default: from manifest)
  -o, --origin <url>      Allowed origin for external SDK (required if external)
  --changelog <text>      Version changelog
  --no-submit             Upload without submitting for review
  -h, --help              Display help
```

**Exemplos:**

```bash
# Publicar na App Store (default se distribution.appStore)
bazari publish

# Publicar apenas para SDK externo
bazari publish --target external --origin https://meusite.com

# Publicar em ambos
bazari publish --target both --origin https://meusite.com

# Especificar múltiplas origens
bazari publish --target external --origin https://meusite.com --origin https://api.meusite.com
```

### bazari keys (Novo)

```bash
bazari keys <command>

Commands:
  list              List all API keys
  generate          Generate new API key for current project
  rotate <key-id>   Rotate API key
  revoke <key-id>   Revoke API key
  show <key-id>     Show API key details
```

**Exemplos:**

```bash
# Listar todas as API keys
bazari keys list

# Gerar nova API key
bazari keys generate --origin https://meusite.com

# Rotacionar secret key
bazari keys rotate abc123 --secret

# Revogar API key
bazari keys revoke abc123
```

### bazari bundle (Novo)

```bash
bazari bundle <command>

Commands:
  verify <cid>      Verify bundle is accessible
  info <cid>        Show bundle information
```

**Exemplos:**

```bash
# Verificar se bundle está acessível
bazari bundle verify QmXxx...

# Mostrar informações do bundle
bazari bundle info QmXxx...
```

## Implementação

### Atualizar bazari.manifest.json Schema

```typescript
// utils/config.ts

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

  // NOVO: Configuração de distribuição
  distribution?: {
    appStore: boolean;
    external: boolean;
    allowedOrigins?: string[];
  };

  // Monetização
  monetizationType?: 'FREE' | 'PAID' | 'FREEMIUM' | 'SUBSCRIPTION';
  price?: string;
}
```

### Atualizar create.ts

```typescript
// commands/create.ts

const DISTRIBUTION_CHOICES = [
  {
    name: 'App Store (Bazari)',
    value: 'appstore',
    description: 'Publicar no marketplace Bazari'
  },
  {
    name: 'SDK Externo (meu site)',
    value: 'external',
    description: 'Integrar via API Key no seu domínio'
  },
  {
    name: 'Ambos',
    value: 'both',
    description: 'App Store + integração externa'
  }
];

// Durante criação
const { distributionType } = await inquirer.prompt([
  {
    type: 'list',
    name: 'distributionType',
    message: 'Como você quer distribuir seu app?',
    choices: DISTRIBUTION_CHOICES.map(c => ({
      name: `${c.name} - ${chalk.dim(c.description)}`,
      value: c.value
    }))
  }
]);

// No manifesto
const manifest: AppManifest = {
  // ... outros campos
  distribution: {
    appStore: distributionType === 'appstore' || distributionType === 'both',
    external: distributionType === 'external' || distributionType === 'both'
  }
};
```

### Atualizar publish.ts

```typescript
// commands/publish.ts

export const publishCommand = new Command('publish')
  .description('Publish app to Bazari')
  .option('-d, --dir <dir>', 'Build directory', 'dist')
  .option('-t, --target <target>', 'Target: appstore, external, both')
  .option('-o, --origin <urls...>', 'Allowed origins for external SDK')
  .option('--changelog <changelog>', 'Version changelog')
  .option('--no-submit', 'Upload without submitting for review')
  .action(async (options) => {
    // Carregar manifesto
    const manifest = await loadManifest();
    if (!manifest) {
      console.log(chalk.red('Error: bazari.manifest.json not found'));
      return;
    }

    // Determinar target
    const target = options.target || getDefaultTarget(manifest);

    if (target === 'external' || target === 'both') {
      // Validar origens
      const origins = options.origin || manifest.distribution?.allowedOrigins;
      if (!origins || origins.length === 0) {
        console.log(chalk.red('Error: --origin required for external target'));
        return;
      }
    }

    // Executar publish baseado no target
    switch (target) {
      case 'appstore':
        await publishToAppStore(manifest, options);
        break;
      case 'external':
        await publishToExternal(manifest, options);
        break;
      case 'both':
        await publishToBoth(manifest, options);
        break;
    }
  });

function getDefaultTarget(manifest: AppManifest): string {
  const dist = manifest.distribution;
  if (dist?.appStore && dist?.external) return 'both';
  if (dist?.external) return 'external';
  return 'appstore';
}

async function publishToAppStore(manifest: AppManifest, options: any) {
  // Fluxo existente: build → tarball → upload → submit
}

async function publishToExternal(manifest: AppManifest, options: any) {
  const spinner = ora('Generating API Key...').start();

  // Verificar se já existe DeveloperApp
  const existingKey = await getExistingApiKey(manifest.slug);

  if (existingKey) {
    spinner.info('API Key already exists');
    console.log(`
${chalk.bold('API Key:')} ${existingKey.apiKey}
${chalk.bold('Origins:')} ${existingKey.allowedOrigins.join(', ')}

${chalk.dim('Use "bazari keys rotate" to generate new credentials')}
`);
    return;
  }

  // Criar novo DeveloperApp
  const result = await createDeveloperApp({
    name: manifest.name,
    slug: manifest.slug,
    description: manifest.description,
    allowedOrigins: options.origin,
    permissions: manifest.permissions.map(p => convertPermission(p.id))
  });

  spinner.succeed('API Key generated');

  console.log(`
${chalk.bold.green('✓ SDK External configured!')}

${chalk.bold('API Key:')} ${result.apiKey}
${chalk.bold('Secret Key:')} ${result.secretKey}

${chalk.yellow('⚠️ Save the Secret Key securely. It will NOT be shown again!')}

${chalk.bold('Usage:')}
${chalk.dim(`
import { BazariSDK } from '@bazari/app-sdk';

const sdk = new BazariSDK({
  apiKey: '${result.apiKey}',
  secretKey: '${result.secretKey}'
});
`)}
`);
}

async function publishToBoth(manifest: AppManifest, options: any) {
  // Primeiro App Store
  await publishToAppStore(manifest, options);

  // Depois External
  await publishToExternal(manifest, options);
}
```

### Novo comando keys.ts

```typescript
// commands/keys.ts

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { isLoggedIn } from '../utils/config.js';
import {
  getSdkApps,
  createSdkApp,
  rotateSdkAppSecret,
  rotateSdkAppKey,
  deleteSdkApp
} from '../utils/api.js';

export const keysCommand = new Command('keys')
  .description('Manage API keys for external SDK');

keysCommand
  .command('list')
  .description('List all API keys')
  .action(async () => {
    if (!(await isLoggedIn())) {
      console.log(chalk.red('Error: Not logged in'));
      return;
    }

    const spinner = ora('Loading API keys...').start();

    try {
      const response = await getSdkApps();
      spinner.stop();

      if (!response.data?.apps?.length) {
        console.log(chalk.dim('No API keys found'));
        return;
      }

      console.log(chalk.bold('\nYour API Keys:\n'));

      for (const app of response.data.apps) {
        console.log(`${chalk.bold(app.name)} (${app.slug})`);
        console.log(`  ${chalk.dim('API Key:')} ${app.apiKey}`);
        console.log(`  ${chalk.dim('Status:')} ${app.status}`);
        console.log(`  ${chalk.dim('Origins:')} ${app.allowedOrigins.join(', ')}`);
        console.log(`  ${chalk.dim('Created:')} ${new Date(app.createdAt).toLocaleDateString()}`);
        console.log('');
      }
    } catch (error) {
      spinner.fail('Failed to load API keys');
      console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
    }
  });

keysCommand
  .command('generate')
  .description('Generate new API key')
  .option('-n, --name <name>', 'App name')
  .option('-o, --origin <urls...>', 'Allowed origins')
  .action(async (options) => {
    if (!(await isLoggedIn())) {
      console.log(chalk.red('Error: Not logged in'));
      return;
    }

    // Carregar manifesto para defaults
    const manifest = await loadManifest();

    const name = options.name || manifest?.name;
    const origins = options.origin || manifest?.distribution?.allowedOrigins;

    if (!name) {
      console.log(chalk.red('Error: --name required or bazari.manifest.json'));
      return;
    }

    if (!origins?.length) {
      console.log(chalk.red('Error: --origin required'));
      return;
    }

    const spinner = ora('Generating API key...').start();

    try {
      const result = await createSdkApp({
        name,
        allowedOrigins: origins,
        permissions: manifest?.permissions?.map(p => convertPermission(p.id)) || []
      });

      spinner.succeed('API key generated');

      console.log(`
${chalk.bold('API Key:')} ${result.apiKey}
${chalk.bold('Secret Key:')} ${result.secretKey}

${chalk.yellow('⚠️ Save the Secret Key securely. It will NOT be shown again!')}
`);
    } catch (error) {
      spinner.fail('Failed to generate API key');
      console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
    }
  });

keysCommand
  .command('rotate <key-id>')
  .description('Rotate API key or secret')
  .option('--secret', 'Rotate only the secret key')
  .option('--api', 'Rotate the API key')
  .action(async (keyId, options) => {
    if (!(await isLoggedIn())) {
      console.log(chalk.red('Error: Not logged in'));
      return;
    }

    const spinner = ora('Rotating key...').start();

    try {
      if (options.api) {
        const result = await rotateSdkAppKey(keyId);
        spinner.succeed('API key rotated');
        console.log(`${chalk.bold('New API Key:')} ${result.apiKey}`);
      } else {
        const result = await rotateSdkAppSecret(keyId);
        spinner.succeed('Secret key rotated');
        console.log(`${chalk.bold('New Secret Key:')} ${result.secretKey}`);
        console.log(chalk.yellow('⚠️ Save securely!'));
      }
    } catch (error) {
      spinner.fail('Failed to rotate key');
      console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
    }
  });

keysCommand
  .command('revoke <key-id>')
  .description('Revoke API key')
  .action(async (keyId) => {
    if (!(await isLoggedIn())) {
      console.log(chalk.red('Error: Not logged in'));
      return;
    }

    const { confirm } = await inquirer.prompt([{
      type: 'confirm',
      name: 'confirm',
      message: chalk.yellow('This will permanently revoke the API key. Continue?'),
      default: false
    }]);

    if (!confirm) {
      console.log(chalk.dim('Cancelled'));
      return;
    }

    const spinner = ora('Revoking key...').start();

    try {
      await deleteSdkApp(keyId);
      spinner.succeed('API key revoked');
    } catch (error) {
      spinner.fail('Failed to revoke key');
      console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
    }
  });
```

## Fluxos de Uso

### Fluxo 1: Criar e publicar na App Store

```bash
$ bazari create my-app
? Como você quer distribuir? App Store (Bazari)
...

$ cd my-app
$ npm install
$ bazari build
$ bazari publish
✓ Bundle uploaded to IPFS
✓ Submitted for review
```

### Fluxo 2: Criar e usar externamente

```bash
$ bazari create my-integration
? Como você quer distribuir? SDK Externo
...

$ cd my-integration
$ npm install
$ bazari build
$ bazari publish --target external --origin https://meusite.com
✓ API Key generated
API Key: baz_app_xxx...
Secret Key: xxx...
```

### Fluxo 3: Criar para ambos

```bash
$ bazari create my-full-app
? Como você quer distribuir? Ambos
...

$ cd my-full-app
$ npm install
$ bazari build
$ bazari publish --target both --origin https://meusite.com
✓ Bundle uploaded to IPFS
✓ Submitted for review
✓ API Key generated
```

## Checklist de Implementação

- [ ] Atualizar schema do manifesto com `distribution`
- [ ] Atualizar `create.ts` com pergunta de distribuição
- [ ] Atualizar `publish.ts` com flag `--target`
- [ ] Criar `keys.ts` com comandos de gerenciamento
- [ ] Criar `bundle.ts` com comandos de verificação
- [ ] Atualizar `api.ts` com funções para DeveloperApp
- [ ] Atualizar templates com campo distribution
- [ ] Adicionar validação de manifesto para distribution
- [ ] Atualizar documentação/help text
- [ ] Adicionar testes para novos comandos
