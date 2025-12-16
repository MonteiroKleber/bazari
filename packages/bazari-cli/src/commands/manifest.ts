import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import fs from 'fs-extra';
import path from 'path';
import { loadManifest } from '../utils/config.js';
import {
  detectPermissions,
  comparePermissions,
  generatePermissionEntries,
  PERMISSION_METADATA,
  type DetectedPermission,
} from '../utils/permissions.js';

export const manifestCommand = new Command('manifest')
  .description('Manage bazari.manifest.json');

/**
 * bazari manifest sync
 * Detect SDK usage and update permissions in manifest
 */
manifestCommand
  .command('sync')
  .description('Detect SDK usage and sync permissions to manifest')
  .option('-y, --yes', 'Auto-confirm changes')
  .option('--dry-run', 'Show changes without applying')
  .action(async (options) => {
    console.log(chalk.bold.blue('\n🔍 Analyzing SDK usage...\n'));

    const cwd = process.cwd();
    const manifestPath = path.join(cwd, 'bazari.manifest.json');

    // Load manifest
    const manifest = await loadManifest();
    if (!manifest) {
      console.log(chalk.red('Error: bazari.manifest.json not found'));
      console.log(chalk.dim('Run "bazari create" to create a new project'));
      return;
    }

    const spinner = ora('Scanning source files...').start();

    try {
      // Detect permissions from source code
      const detected = await detectPermissions(cwd);

      spinner.succeed(`Found ${detected.length} SDK API usages`);

      if (detected.length === 0) {
        console.log(chalk.dim('\nNo SDK API calls detected in source files.'));
        console.log(chalk.dim('Make sure you\'re using the @bazari.libervia.xyz/app-sdk'));
        return;
      }

      // Compare with declared permissions
      const result = comparePermissions(detected, manifest.permissions || []);

      // Show detected permissions
      console.log(chalk.bold('\n📋 Permissions detected:\n'));

      for (const perm of detected) {
        const isDeclared = result.declared.includes(perm.id);
        const meta = PERMISSION_METADATA[perm.id];
        const status = isDeclared ? chalk.green('✓') : chalk.yellow('⚠');
        const statusText = isDeclared ? chalk.dim('(declared)') : chalk.yellow('(missing)');

        console.log(`  ${status} ${chalk.bold(perm.id)} ${statusText}`);
        if (meta) {
          console.log(chalk.dim(`     ${meta.description}`));
        }

        // Show first 2 sources
        for (const source of perm.sources.slice(0, 2)) {
          console.log(chalk.dim(`     └─ ${source.file}:${source.line}`));
        }
        if (perm.sources.length > 2) {
          console.log(chalk.dim(`     └─ ... and ${perm.sources.length - 2} more`));
        }
        console.log('');
      }

      // Check if there are missing permissions
      if (result.missing.length === 0) {
        console.log(chalk.green('✓ All permissions are already declared in manifest!\n'));
        return;
      }

      console.log(chalk.yellow(`\n⚠️  ${result.missing.length} permission(s) missing from manifest:\n`));

      for (const perm of result.missing) {
        const meta = PERMISSION_METADATA[perm.id];
        console.log(`  • ${chalk.bold(perm.id)}`);
        if (meta) {
          console.log(chalk.dim(`    ${meta.description} (risk: ${meta.risk})`));
        }
      }

      if (options.dryRun) {
        console.log(chalk.dim('\n[Dry run - no changes made]'));
        console.log(chalk.dim('\nRun without --dry-run to apply changes.'));
        return;
      }

      // Ask for confirmation
      let shouldUpdate = options.yes;
      if (!shouldUpdate) {
        const { confirm } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: 'Add missing permissions to manifest?',
            default: true,
          },
        ]);
        shouldUpdate = confirm;
      }

      if (!shouldUpdate) {
        console.log(chalk.dim('\nCancelled'));
        return;
      }

      // Update manifest
      const newPermissions = generatePermissionEntries(result.missing);
      const updatedPermissions = [
        ...(manifest.permissions || []),
        ...newPermissions,
      ];

      manifest.permissions = updatedPermissions;

      await fs.writeJson(manifestPath, manifest, { spaces: 2 });

      console.log(chalk.green(`\n✓ Updated bazari.manifest.json with ${newPermissions.length} permission(s):\n`));

      for (const perm of newPermissions) {
        console.log(`  ${chalk.green('+')} ${perm.id}`);
      }

      console.log(chalk.dim('\nNext steps:'));
      console.log(chalk.cyan('  bazari build'));
      console.log(chalk.cyan('  bazari publish'));

    } catch (error) {
      spinner.fail('Analysis failed');
      console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
    }
  });

/**
 * bazari manifest check
 * Check if all SDK usages have declared permissions (validation only)
 */
manifestCommand
  .command('check')
  .description('Check if all SDK usages have declared permissions')
  .option('--strict', 'Exit with error if permissions are missing')
  .action(async (options) => {
    console.log(chalk.bold.blue('\n🔍 Checking permissions...\n'));

    const cwd = process.cwd();

    // Load manifest
    const manifest = await loadManifest();
    if (!manifest) {
      console.log(chalk.red('Error: bazari.manifest.json not found'));
      process.exit(1);
    }

    const spinner = ora('Scanning source files...').start();

    try {
      // Detect permissions from source code
      const detected = await detectPermissions(cwd);
      spinner.stop();

      if (detected.length === 0) {
        console.log(chalk.dim('No SDK API calls detected in source files.\n'));
        return;
      }

      // Compare with declared permissions
      const result = comparePermissions(detected, manifest.permissions || []);

      if (result.missing.length === 0) {
        console.log(chalk.green('✓ All SDK usages have declared permissions!\n'));

        console.log(chalk.dim('Declared permissions:'));
        for (const id of result.declared) {
          console.log(chalk.dim(`  • ${id}`));
        }
        console.log('');
        return;
      }

      console.log(chalk.red(`✗ ${result.missing.length} permission(s) missing:\n`));

      for (const perm of result.missing) {
        console.log(`  ${chalk.red('•')} ${chalk.bold(perm.id)}`);
        for (const source of perm.sources.slice(0, 3)) {
          console.log(chalk.dim(`    ${source.file}:${source.line} - ${source.code.substring(0, 50)}...`));
        }
      }

      console.log(chalk.yellow('\n💡 Run "bazari manifest sync" to add missing permissions\n'));

      if (options.strict) {
        process.exit(1);
      }

    } catch (error) {
      spinner.fail('Check failed');
      console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
      process.exit(1);
    }
  });

/**
 * bazari manifest show
 * Display current manifest permissions
 */
manifestCommand
  .command('show')
  .description('Display current manifest permissions')
  .action(async () => {
    const manifest = await loadManifest();
    if (!manifest) {
      console.log(chalk.red('Error: bazari.manifest.json not found'));
      return;
    }

    console.log(chalk.bold.blue(`\n📋 ${manifest.name} v${manifest.version}\n`));

    console.log(chalk.dim('Permissions:'));

    if (!manifest.permissions || manifest.permissions.length === 0) {
      console.log(chalk.dim('  (none declared)\n'));
      return;
    }

    for (const perm of manifest.permissions) {
      const meta = PERMISSION_METADATA[perm.id];
      console.log(`  • ${chalk.bold(perm.id)}`);
      if (perm.reason) {
        console.log(chalk.dim(`    ${perm.reason}`));
      } else if (meta) {
        console.log(chalk.dim(`    ${meta.description}`));
      }
      if (perm.optional) {
        console.log(chalk.dim('    (optional)'));
      }
    }
    console.log('');
  });
