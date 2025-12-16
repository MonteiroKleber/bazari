import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { isLoggedIn, loadManifest } from '../utils/config.js';
import {
  getSdkApps,
  getSdkAppBySlug,
  rotateSdkAppSecret,
  rotateSdkAppKey,
  deleteSdkApp,
} from '../utils/api.js';

export const keysCommand = new Command('keys')
  .description('Manage API keys for external SDK');

keysCommand
  .command('list')
  .description('List all API keys')
  .action(async () => {
    if (!(await isLoggedIn())) {
      console.log(chalk.red('Error: Not logged in'));
      console.log(chalk.dim('Run "bazari login" first'));
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
      console.log(`  ${chalk.dim('Origins:')}  ${app.allowedOrigins?.join(', ') || 'None'}`);
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
      console.log(chalk.dim('Run "bazari login" first'));
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
${chalk.bold('Origins:')}     ${app.allowedOrigins?.join(', ') || 'None'}
${chalk.bold('Permissions:')} ${app.permissions?.join(', ') || 'None'}

${chalk.dim('Statistics:')}
  Total Requests: ${app.totalRequests || 0}
  Last Request:   ${app.lastRequestAt ? new Date(app.lastRequestAt).toLocaleString() : 'Never'}
  Created:        ${new Date(app.createdAt).toLocaleString()}
`);
  });

keysCommand
  .command('rotate [slug]')
  .description('Rotate API key or secret')
  .option('--api', 'Rotate the API key (use with caution)')
  .option('--secret', 'Rotate only the secret key (default)')
  .action(async (slug?: string, options?: { api?: boolean; secret?: boolean }) => {
    if (!(await isLoggedIn())) {
      console.log(chalk.red('Error: Not logged in'));
      console.log(chalk.dim('Run "bazari login" first'));
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
          ? chalk.yellow('This will invalidate the current API key. All integrations will stop working. Continue?')
          : 'Rotate secret key? Existing integrations will need to update their secret.',
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
      console.log(`
${chalk.bold('New API Key:')} ${response.data?.apiKey}

${chalk.yellow('⚠️  Update all integrations with the new API key!')}
`);
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
${chalk.yellow('   Update your server-side integrations with the new secret.')}
`);
    }
  });

keysCommand
  .command('revoke [slug]')
  .description('Revoke API key (permanent)')
  .action(async (slug?: string) => {
    if (!(await isLoggedIn())) {
      console.log(chalk.red('Error: Not logged in'));
      console.log(chalk.dim('Run "bazari login" first'));
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
    const appName = appResponse.data.app.name;

    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: chalk.red(`This will PERMANENTLY revoke the API key for "${appName}". This cannot be undone. Continue?`),
        default: false,
      },
    ]);

    if (!confirm) {
      console.log(chalk.dim('Cancelled'));
      return;
    }

    // Double confirm
    const { confirmAgain } = await inquirer.prompt([
      {
        type: 'input',
        name: 'confirmAgain',
        message: `Type "${slug}" to confirm:`,
      },
    ]);

    if (confirmAgain !== slug) {
      console.log(chalk.dim('Cancelled - confirmation did not match'));
      return;
    }

    const spinner = ora('Revoking API key...').start();

    const response = await deleteSdkApp(appId);
    if (response.error) {
      spinner.fail(`Error: ${response.error}`);
      return;
    }

    spinner.succeed('API key revoked');
    console.log(chalk.dim('\nThe API key has been permanently revoked.'));
  });
