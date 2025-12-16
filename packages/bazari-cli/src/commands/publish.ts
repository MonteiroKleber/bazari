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
import {
  detectPermissions,
  comparePermissions,
  PERMISSION_METADATA,
} from '../utils/permissions.js';

type DistributionTarget = 'appstore' | 'external' | 'both';

export const publishCommand = new Command('publish')
  .description('Publish app to Bazari')
  .option('-d, --dir <dir>', 'Build directory', 'dist')
  .option('-t, --target <target>', 'Target: appstore, external, both')
  .option('-o, --origin <urls...>', 'Allowed origins for external SDK')
  .option('--changelog <changelog>', 'Version changelog')
  .option('--no-submit', 'Upload without submitting for review')
  .option('--skip-permissions', 'Skip permission validation')
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

    // Validate permissions before publishing
    if (!options.skipPermissions) {
      const permissionsValid = await validatePermissions(manifest);
      if (!permissionsValid) {
        return;
      }
    }

    // Determine target
    let target: DistributionTarget;
    try {
      target = determineTarget(manifest, options.target);
    } catch (err) {
      console.log(chalk.red(err instanceof Error ? err.message : 'Invalid target'));
      return;
    }

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

/**
 * Validate that all SDK usages have declared permissions
 */
async function validatePermissions(manifest: AppManifest): Promise<boolean> {
  const cwd = process.cwd();
  const spinner = ora('Validating permissions...').start();

  try {
    const detected = await detectPermissions(cwd);

    if (detected.length === 0) {
      spinner.succeed('No SDK API calls detected');
      return true;
    }

    const result = comparePermissions(detected, manifest.permissions || []);

    if (result.missing.length === 0) {
      spinner.succeed(`Permissions validated (${result.declared.length} declared)`);
      return true;
    }

    spinner.fail(`${result.missing.length} permission(s) missing from manifest`);

    console.log(chalk.red('\n❌ Cannot publish: Missing permissions\n'));

    for (const perm of result.missing) {
      const meta = PERMISSION_METADATA[perm.id];
      console.log(`  • ${chalk.bold(perm.id)}`);
      if (meta) {
        console.log(chalk.dim(`    ${meta.description}`));
      }
      // Show first source
      if (perm.sources.length > 0) {
        const src = perm.sources[0];
        console.log(chalk.dim(`    └─ ${src.file}:${src.line}`));
      }
    }

    console.log(chalk.yellow('\n💡 Fix with one of these commands:\n'));
    console.log(chalk.cyan('  bazari manifest sync    ') + chalk.dim('# Auto-detect and add permissions'));
    console.log(chalk.cyan('  bazari build            ') + chalk.dim('# Will prompt to add missing permissions'));
    console.log('');

    return false;

  } catch (error) {
    spinner.warn('Permission validation skipped');
    return true;
  }
}

function determineTarget(manifest: AppManifest, explicitTarget?: string): DistributionTarget {
  if (explicitTarget) {
    if (!['appstore', 'external', 'both'].includes(explicitTarget)) {
      throw new Error(`Invalid target: ${explicitTarget}. Use: appstore, external, or both`);
    }
    return explicitTarget as DistributionTarget;
  }

  // Determine from manifest distribution config
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
      longDescription: manifest.longDescription,
      category: manifest.category,
      tags: manifest.tags,
      icon: manifest.icon,
      color: manifest.color,
      permissions: manifest.permissions,
      sdkVersion: manifest.sdkVersion,
      monetizationType: manifest.monetizationType,
      price: manifest.price,
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

${chalk.dim('Your app will be reviewed by the Bazari team.')}
${chalk.dim('Check status at:')} ${chalk.cyan('https://bazari.libervia.xyz/app/developer')}
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
${chalk.dim('Origins:')} ${app.allowedOrigins?.join(', ') || 'None'}

${chalk.dim('Use "bazari keys rotate" to regenerate credentials')}
`);
    return;
  }

  // Ask for confirmation
  spinner.stop();
  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: 'Generate API Key for external SDK?',
      default: true,
    },
  ]);

  if (!confirm) {
    console.log(chalk.dim('Cancelled'));
    return;
  }

  // Create new API Key
  spinner.start('Generating API Key...');

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

// Get current user
const user = await sdk.auth.getCurrentUser();
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
