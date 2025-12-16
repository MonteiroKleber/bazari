# PROMPT 04: Adicionar Suporte a Distribuição no CLI

## Contexto

O CLI precisa suportar o novo campo `distribution` no manifesto e comandos para gerenciar API Keys.

## Arquivos a Modificar

1. `packages/bazari-cli/src/commands/publish.ts` - Adicionar flag --target
2. `packages/bazari-cli/src/commands/keys.ts` - Novo comando
3. `packages/bazari-cli/src/utils/api.ts` - Funções para DeveloperApp

## Requisitos

### 1. Atualizar publish.ts

```typescript
// packages/bazari-cli/src/commands/publish.ts

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import archiver from 'archiver';
import { loadManifest, isLoggedIn, type AppManifest } from '../utils/config.js';
import {
  submitForReview,
  createApp,
  getDeveloperApps,
  uploadBundle,
  createSdkApp,
  getSdkAppBySlug,
} from '../utils/api.js';

type DistributionTarget = 'appstore' | 'external' | 'both';

export const publishCommand = new Command('publish')
  .description('Publish app to Bazari')
  .option('-d, --dir <dir>', 'Build directory', 'dist')
  .option('-t, --target <target>', 'Target: appstore, external, both')
  .option('-o, --origin <urls...>', 'Allowed origins for external SDK')
  .option('--changelog <changelog>', 'Version changelog')
  .option('--no-submit', 'Upload without submitting for review')
  .action(async (options) => {
    console.log(chalk.bold.blue('\n🚀 Publishing to Bazari\n'));

    // Check login
    if (!(await isLoggedIn())) {
      console.log(chalk.red('Error: Not logged in'));
      console.log(chalk.dim('Run "bazari login" first'));
      return;
    }

    // Check manifest
    const manifest = await loadManifest();
    if (!manifest) {
      console.log(chalk.red('Error: bazari.manifest.json not found'));
      return;
    }

    // Determine target
    const target = determineTarget(manifest, options.target);
    console.log(chalk.dim(`Target: ${target}`));

    // Validate origins for external
    if (target === 'external' || target === 'both') {
      const origins = options.origin || manifest.distribution?.allowedOrigins;
      if (!origins || origins.length === 0) {
        console.log(chalk.red('Error: --origin required for external target'));
        console.log(chalk.dim('Example: bazari publish --target external --origin https://meusite.com'));
        return;
      }
      options.resolvedOrigins = origins;
    }

    // Check build directory for appstore
    if (target === 'appstore' || target === 'both') {
      const buildDir = path.resolve(options.dir);
      if (!(await fs.pathExists(buildDir))) {
        console.log(chalk.red(`Error: Build directory "${options.dir}" not found`));
        console.log(chalk.dim('Run "bazari build" first'));
        return;
      }
    }

    // Execute based on target
    try {
      switch (target) {
        case 'appstore':
          await publishToAppStore(manifest, options);
          break;
        case 'external':
          await publishToExternal(manifest, options);
          break;
        case 'both':
          await publishToAppStore(manifest, options);
          console.log(''); // Separator
          await publishToExternal(manifest, options);
          break;
      }
    } catch (error) {
      console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
    }
  });

function determineTarget(manifest: AppManifest, explicitTarget?: string): DistributionTarget {
  if (explicitTarget) {
    if (!['appstore', 'external', 'both'].includes(explicitTarget)) {
      throw new Error(`Invalid target: ${explicitTarget}. Use: appstore, external, or both`);
    }
    return explicitTarget as DistributionTarget;
  }

  const dist = manifest.distribution;
  if (dist?.appStore && dist?.external) return 'both';
  if (dist?.external) return 'external';
  return 'appstore';
}

async function publishToAppStore(manifest: AppManifest, options: any) {
  console.log(chalk.bold('📦 Publishing to App Store\n'));

  const buildDir = path.resolve(options.dir);
  const buildInfoPath = path.join(buildDir, '.build-info.json');

  if (!(await fs.pathExists(buildInfoPath))) {
    throw new Error('Build info not found. Run "bazari build" first');
  }

  const buildInfo = await fs.readJson(buildInfoPath);

  console.log(`
${chalk.dim('Name:')}     ${manifest.name}
${chalk.dim('Version:')}  ${manifest.version}
${chalk.dim('Size:')}     ${formatBytes(buildInfo.size)}
${chalk.dim('Hash:')}     ${buildInfo.hash.substring(0, 16)}...
`);

  // Ask for confirmation
  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: 'Publish this version to App Store?',
      default: true,
    },
  ]);

  if (!confirm) {
    console.log(chalk.dim('Cancelled'));
    return;
  }

  // Get changelog
  let changelog = options.changelog;
  if (!changelog && options.submit !== false) {
    const { changelogInput } = await inquirer.prompt([
      {
        type: 'input',
        name: 'changelogInput',
        message: 'Changelog (optional):',
        default: `Version ${manifest.version}`,
      },
    ]);
    changelog = changelogInput;
  }

  const spinner = ora('Checking app registration...').start();

  // Check/create app
  const appsResponse = await getDeveloperApps();
  if (appsResponse.error) {
    spinner.fail(`API error: ${appsResponse.error}`);
    return;
  }

  const existingApp = (appsResponse.data?.apps || []).find(
    (app: any) => app.appId === manifest.appId
  );

  let appDbId: string;

  if (!existingApp) {
    spinner.text = 'Registering new app...';
    const createResponse = await createApp({
      appId: manifest.appId,
      name: manifest.name,
      slug: manifest.slug,
      description: manifest.description,
      category: manifest.category,
      permissions: manifest.permissions,
      sdkVersion: manifest.sdkVersion,
    });

    if (createResponse.error) {
      spinner.fail(`Failed to register: ${createResponse.error}`);
      return;
    }

    appDbId = (createResponse.data as any)?.app?.id;
    spinner.succeed('App registered');
  } else {
    appDbId = existingApp.id;
  }

  // Create tarball
  spinner.start('Creating bundle tarball...');
  const tarballPath = path.join(os.tmpdir(), `${manifest.appId}-${Date.now()}.tar.gz`);
  await createTarball(buildDir, tarballPath);
  const tarballStats = await fs.stat(tarballPath);
  spinner.succeed(`Bundle created (${formatBytes(tarballStats.size)})`);

  // Upload to IPFS
  spinner.start('Uploading to IPFS...');
  const uploadResponse = await uploadBundle(appDbId, tarballPath, buildInfo.hash);
  await fs.remove(tarballPath);

  if (uploadResponse.error) {
    spinner.fail(`Upload failed: ${uploadResponse.error}`);
    return;
  }

  const { bundleUrl, cid } = uploadResponse.data!;
  spinner.succeed(`Uploaded to IPFS: ${cid}`);

  // Submit for review
  if (options.submit !== false) {
    spinner.start('Submitting for review...');
    const submitResponse = await submitForReview(
      appDbId,
      manifest.version,
      bundleUrl,
      buildInfo.hash,
      changelog
    );

    if (submitResponse.error) {
      spinner.fail(`Submit failed: ${submitResponse.error}`);
      return;
    }

    spinner.succeed('Submitted for review');

    console.log(`
${chalk.bold.green('✓ App published to App Store!')}

${chalk.dim('Status:')} Pending Review
${chalk.dim('Version:')} ${manifest.version}
${chalk.dim('CID:')} ${cid}
${chalk.dim('Bundle:')} ${bundleUrl}
`);
  } else {
    console.log(`
${chalk.bold.green('✓ Bundle uploaded!')}

${chalk.dim('CID:')} ${cid}
${chalk.dim('Bundle:')} ${bundleUrl}

${chalk.dim('Run without --no-submit to submit for review')}
`);
  }
}

async function publishToExternal(manifest: AppManifest, options: any) {
  console.log(chalk.bold('🔑 Configuring External SDK\n'));

  const origins = options.resolvedOrigins || manifest.distribution?.allowedOrigins || [];

  console.log(`
${chalk.dim('Name:')}    ${manifest.name}
${chalk.dim('Origins:')} ${origins.join(', ')}
`);

  const spinner = ora('Checking existing API Key...').start();

  // Check if API Key already exists
  const existingResponse = await getSdkAppBySlug(manifest.slug);

  if (existingResponse.data?.app) {
    const app = existingResponse.data.app;
    spinner.info('API Key already exists');

    console.log(`
${chalk.bold('API Key:')} ${app.apiKey}
${chalk.dim('Status:')} ${app.status}
${chalk.dim('Origins:')} ${app.allowedOrigins.join(', ')}

${chalk.dim('Use "bazari keys rotate" to regenerate credentials')}
`);
    return;
  }

  // Create new API Key
  spinner.text = 'Generating API Key...';

  const permissions = convertPermissions(manifest.permissions);

  const createResponse = await createSdkApp({
    name: manifest.name,
    slug: manifest.slug,
    description: manifest.description,
    allowedOrigins: origins,
    permissions,
  });

  if (createResponse.error) {
    spinner.fail(`Failed: ${createResponse.error}`);
    return;
  }

  spinner.succeed('API Key generated');

  const { app, secretKey } = createResponse.data!;

  console.log(`
${chalk.bold.green('✓ External SDK configured!')}

${chalk.bold('API Key:')} ${app.apiKey}
${chalk.bold('Secret Key:')} ${secretKey}

${chalk.yellow('⚠️  Save the Secret Key securely!')}
${chalk.yellow('   It will NOT be shown again.')}

${chalk.bold('Usage:')}
${chalk.dim(`
import { BazariSDK } from '@bazari/app-sdk';

const sdk = new BazariSDK({
  apiKey: '${app.apiKey}',
  secretKey: '${secretKey}'
});
`)}
`);
}

function convertPermissions(permissions: AppManifest['permissions']): string[] {
  const mapping: Record<string, string> = {
    'user.profile.read': 'user:read',
    'user.profile.write': 'user:write',
    'wallet.balance.read': 'wallet:read',
    'wallet.history.read': 'wallet:read',
    'wallet.transfer.request': 'wallet:transfer',
    'storage.app': 'storage:read',
    'notifications.send': 'ui:toast',
    'auth:read': 'user:read',
    'wallet:read': 'wallet:read',
    'wallet:transfer': 'wallet:transfer',
  };

  const converted = new Set<string>();
  for (const p of permissions) {
    const mapped = mapping[p.id] || p.id;
    converted.add(mapped);
  }
  return Array.from(converted);
}

async function createTarball(sourceDir: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('tar', { gzip: true });

    output.on('close', () => resolve());
    archive.on('error', (err) => reject(err));

    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
```

### 2. Criar keys.ts

```typescript
// packages/bazari-cli/src/commands/keys.ts

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { isLoggedIn, loadManifest } from '../utils/config.js';
import {
  getSdkApps,
  createSdkApp,
  rotateSdkAppSecret,
  rotateSdkAppKey,
  deleteSdkApp,
  getSdkAppBySlug,
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

    const response = await getSdkApps();
    spinner.stop();

    if (response.error) {
      console.log(chalk.red(`Error: ${response.error}`));
      return;
    }

    const apps = response.data?.apps || [];

    if (apps.length === 0) {
      console.log(chalk.dim('\nNo API keys found'));
      console.log(chalk.dim('Run "bazari publish --target external" to create one'));
      return;
    }

    console.log(chalk.bold('\nYour API Keys:\n'));

    for (const app of apps) {
      const statusColor = app.status === 'APPROVED' ? chalk.green : chalk.yellow;

      console.log(`${chalk.bold(app.name)} ${chalk.dim(`(${app.slug})`)}`);
      console.log(`  ${chalk.dim('API Key:')}  ${app.apiKey}`);
      console.log(`  ${chalk.dim('Status:')}   ${statusColor(app.status)}`);
      console.log(`  ${chalk.dim('Origins:')}  ${app.allowedOrigins.join(', ')}`);
      console.log(`  ${chalk.dim('Requests:')} ${app.totalRequests || 0}`);
      console.log(`  ${chalk.dim('Created:')}  ${new Date(app.createdAt).toLocaleDateString()}`);
      console.log('');
    }
  });

keysCommand
  .command('show [slug]')
  .description('Show API key details')
  .action(async (slug?: string) => {
    if (!(await isLoggedIn())) {
      console.log(chalk.red('Error: Not logged in'));
      return;
    }

    // If no slug provided, try to get from manifest
    if (!slug) {
      const manifest = await loadManifest();
      if (manifest) {
        slug = manifest.slug;
      } else {
        console.log(chalk.red('Error: Provide slug or run from project directory'));
        return;
      }
    }

    const spinner = ora('Loading API key...').start();
    const response = await getSdkAppBySlug(slug);
    spinner.stop();

    if (response.error || !response.data?.app) {
      console.log(chalk.red(`No API key found for: ${slug}`));
      return;
    }

    const app = response.data.app;

    console.log(`
${chalk.bold(app.name)} ${chalk.dim(`(${app.slug})`)}

${chalk.bold('API Key:')}     ${app.apiKey}
${chalk.bold('Status:')}      ${app.status}
${chalk.bold('Origins:')}     ${app.allowedOrigins.join(', ')}
${chalk.bold('Permissions:')} ${app.permissions.join(', ')}

${chalk.dim('Statistics:')}
  Total Requests: ${app.totalRequests || 0}
  Last Request:   ${app.lastRequestAt ? new Date(app.lastRequestAt).toLocaleString() : 'Never'}
  Created:        ${new Date(app.createdAt).toLocaleString()}
`);
  });

keysCommand
  .command('rotate [slug]')
  .description('Rotate API key or secret')
  .option('--api', 'Rotate the API key')
  .option('--secret', 'Rotate only the secret key (default)')
  .action(async (slug?: string, options?: { api?: boolean; secret?: boolean }) => {
    if (!(await isLoggedIn())) {
      console.log(chalk.red('Error: Not logged in'));
      return;
    }

    // Get slug from manifest if not provided
    if (!slug) {
      const manifest = await loadManifest();
      if (manifest) {
        slug = manifest.slug;
      } else {
        console.log(chalk.red('Error: Provide slug or run from project directory'));
        return;
      }
    }

    // Get app ID
    const appResponse = await getSdkAppBySlug(slug);
    if (!appResponse.data?.app) {
      console.log(chalk.red(`No API key found for: ${slug}`));
      return;
    }

    const appId = appResponse.data.app.id;
    const rotateApi = options?.api;

    // Confirm
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: rotateApi
          ? chalk.yellow('This will invalidate the current API key. Continue?')
          : 'Rotate secret key?',
        default: !rotateApi,
      },
    ]);

    if (!confirm) {
      console.log(chalk.dim('Cancelled'));
      return;
    }

    const spinner = ora(`Rotating ${rotateApi ? 'API key' : 'secret key'}...`).start();

    if (rotateApi) {
      const response = await rotateSdkAppKey(appId);
      if (response.error) {
        spinner.fail(`Error: ${response.error}`);
        return;
      }
      spinner.succeed('API key rotated');
      console.log(`\n${chalk.bold('New API Key:')} ${response.data?.apiKey}`);
    } else {
      const response = await rotateSdkAppSecret(appId);
      if (response.error) {
        spinner.fail(`Error: ${response.error}`);
        return;
      }
      spinner.succeed('Secret key rotated');
      console.log(`
${chalk.bold('New Secret Key:')} ${response.data?.secretKey}

${chalk.yellow('⚠️  Save this securely! It will NOT be shown again.')}
`);
    }
  });

keysCommand
  .command('revoke [slug]')
  .description('Revoke API key')
  .action(async (slug?: string) => {
    if (!(await isLoggedIn())) {
      console.log(chalk.red('Error: Not logged in'));
      return;
    }

    // Get slug from manifest if not provided
    if (!slug) {
      const manifest = await loadManifest();
      if (manifest) {
        slug = manifest.slug;
      } else {
        console.log(chalk.red('Error: Provide slug or run from project directory'));
        return;
      }
    }

    // Get app ID
    const appResponse = await getSdkAppBySlug(slug);
    if (!appResponse.data?.app) {
      console.log(chalk.red(`No API key found for: ${slug}`));
      return;
    }

    const appId = appResponse.data.app.id;

    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: chalk.yellow('This will permanently revoke the API key. Continue?'),
        default: false,
      },
    ]);

    if (!confirm) {
      console.log(chalk.dim('Cancelled'));
      return;
    }

    const spinner = ora('Revoking API key...').start();

    const response = await deleteSdkApp(appId);
    if (response.error) {
      spinner.fail(`Error: ${response.error}`);
      return;
    }

    spinner.succeed('API key revoked');
  });
```

### 3. Atualizar api.ts

```typescript
// packages/bazari-cli/src/utils/api.ts

// Adicionar funções para SDK Apps

export async function getSdkApps(): Promise<ApiResponse<{ apps: any[] }>> {
  return makeRequest('/developer/sdk-apps', 'GET');
}

export async function getSdkAppBySlug(slug: string): Promise<ApiResponse<{ app: any }>> {
  const response = await getSdkApps();
  if (response.error) return response;

  const app = response.data?.apps?.find((a: any) => a.slug === slug);
  return { data: { app } };
}

export async function createSdkApp(data: {
  name: string;
  slug?: string;
  description?: string;
  allowedOrigins: string[];
  permissions: string[];
}): Promise<ApiResponse<{ app: any; secretKey: string }>> {
  return makeRequest('/developer/sdk-apps', 'POST', data);
}

export async function rotateSdkAppSecret(appId: string): Promise<ApiResponse<{ secretKey: string }>> {
  return makeRequest(`/developer/sdk-apps/${appId}/rotate-secret`, 'POST');
}

export async function rotateSdkAppKey(appId: string): Promise<ApiResponse<{ apiKey: string }>> {
  return makeRequest(`/developer/sdk-apps/${appId}/rotate-api-key`, 'POST');
}

export async function deleteSdkApp(appId: string): Promise<ApiResponse<void>> {
  return makeRequest(`/developer/sdk-apps/${appId}`, 'DELETE');
}
```

### 4. Atualizar index.ts

```typescript
// packages/bazari-cli/src/index.ts

import { keysCommand } from './commands/keys.js';

// Adicionar ao programa
program.addCommand(keysCommand);
```

## Testes

1. `bazari publish` - deve usar target do manifesto
2. `bazari publish --target appstore` - publicar apenas na App Store
3. `bazari publish --target external --origin https://test.com` - gerar API Key
4. `bazari publish --target both --origin https://test.com` - ambos
5. `bazari keys list` - listar API Keys
6. `bazari keys show` - mostrar detalhes (usa manifesto)
7. `bazari keys rotate` - rotacionar secret
8. `bazari keys rotate --api` - rotacionar API key
9. `bazari keys revoke` - revogar API key

## Critérios de Aceitação

- [ ] publish.ts suporta flag --target
- [ ] publish.ts suporta flag --origin
- [ ] Publica para App Store corretamente
- [ ] Gera API Key para external
- [ ] keys command funcional
- [ ] keys list mostra todas as keys
- [ ] keys rotate funciona para secret e API
- [ ] keys revoke funciona com confirmação
