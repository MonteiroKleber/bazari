import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import archiver from 'archiver';
import { loadManifest, isLoggedIn } from '../utils/config.js';
import { submitForReview, createApp, getDeveloperApps, uploadBundle } from '../utils/api.js';

export const publishCommand = new Command('publish')
  .description('Publish app to Bazari App Store')
  .option('-d, --dir <dir>', 'Build directory', 'dist')
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

    // Check build directory
    const buildDir = path.resolve(options.dir);
    if (!(await fs.pathExists(buildDir))) {
      console.log(chalk.red(`Error: Build directory "${options.dir}" not found`));
      console.log(chalk.dim('Run "bazari build" first'));
      return;
    }

    // Check build info
    const buildInfoPath = path.join(buildDir, '.build-info.json');
    if (!(await fs.pathExists(buildInfoPath))) {
      console.log(chalk.red('Error: Build info not found'));
      console.log(chalk.dim('Run "bazari build" first'));
      return;
    }

    const buildInfo = await fs.readJson(buildInfoPath);

    console.log(`
${chalk.bold('App Details:')}

  ${chalk.dim('Name:')}     ${manifest.name}
  ${chalk.dim('ID:')}       ${manifest.appId}
  ${chalk.dim('Version:')}  ${manifest.version}
  ${chalk.dim('Size:')}     ${formatBytes(buildInfo.size)}
  ${chalk.dim('Hash:')}     ${buildInfo.hash.substring(0, 16)}...
`);

    // Ask for confirmation
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Publish this version?',
        default: true,
      },
    ]);

    if (!confirm) {
      console.log(chalk.dim('Cancelled'));
      return;
    }

    // Get changelog if not provided
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

    try {
      // Check if app exists in developer portal
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

        // Create app in developer portal
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
          spinner.fail(`Failed to register app: ${createResponse.error}`);
          return;
        }

        appDbId = (createResponse.data as any)?.app?.id;
        spinner.succeed('App registered');
      } else {
        appDbId = existingApp.id;
      }

      // Create tarball of build directory
      spinner.start('Creating bundle tarball...');
      const tarballPath = path.join(os.tmpdir(), `${manifest.appId}-${Date.now()}.tar.gz`);

      await createTarball(buildDir, tarballPath);
      const tarballStats = await fs.stat(tarballPath);
      spinner.succeed(`Bundle tarball created (${formatBytes(tarballStats.size)})`);

      // Upload bundle to IPFS via API
      spinner.start('Uploading bundle to IPFS...');

      const uploadResponse = await uploadBundle(appDbId, tarballPath, buildInfo.hash);

      // Clean up tarball
      await fs.remove(tarballPath);

      if (uploadResponse.error) {
        spinner.fail(`Failed to upload: ${uploadResponse.error}`);
        return;
      }

      const { bundleUrl, cid } = uploadResponse.data!;

      spinner.succeed(`Bundle uploaded to IPFS: ${cid}`);

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
          spinner.fail(`Failed to submit: ${submitResponse.error}`);
          return;
        }

        spinner.succeed('Submitted for review');

        console.log(`
${chalk.bold.green('✓ App published successfully!')}

${chalk.dim('Status:')} Pending Review
${chalk.dim('Version:')} ${manifest.version}
${chalk.dim('CID:')} ${cid}
${chalk.dim('Bundle:')} ${bundleUrl}

${chalk.dim('Your app will be reviewed by the Bazari team.')}
${chalk.dim('You can check the status at:')}
${chalk.cyan('https://bazari.libervia.xyz/app/developer')}
`);
      } else {
        console.log(`
${chalk.bold.green('✓ Bundle uploaded!')}

${chalk.dim('CID:')} ${cid}
${chalk.dim('Bundle URL:')} ${bundleUrl}
${chalk.dim('Hash:')} ${buildInfo.hash}

${chalk.dim('Run without --no-submit to submit for review')}
`);
      }
    } catch (error) {
      spinner.fail('Publish failed');
      console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
    }
  });

/**
 * Create a tarball from a directory
 */
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
