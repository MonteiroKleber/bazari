import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs-extra';
import path from 'path';
import { loadManifest } from '../utils/config.js';

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

const REQUIRED_MANIFEST_FIELDS = [
  'appId',
  'name',
  'slug',
  'version',
  'description',
  'category',
  'icon',
  'entryPoint',
  'permissions',
  'sdkVersion',
];

const VALID_CATEGORIES = [
  'finance',
  'social',
  'commerce',
  'tools',
  'governance',
  'entertainment',
];

const VALID_PERMISSION_IDS = [
  'user.profile.read',
  'user.profile.write',
  'wallet.balance.read',
  'wallet.history.read',
  'wallet.transfer.request',
  'storage.app',
  'notifications.send',
  'camera',
  'location',
  'contacts.read',
];

export const validateCommand = new Command('validate')
  .description('Validate app manifest and build')
  .option('-d, --dir <dir>', 'Build directory to validate', 'dist')
  .option('--fix', 'Attempt to fix issues', false)
  .action(async (options) => {
    console.log(chalk.bold.blue('\n🔍 Validating Bazari App\n'));

    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
    };

    // Check manifest
    const spinner = ora('Checking manifest...').start();
    const manifest = await loadManifest();

    if (!manifest) {
      result.valid = false;
      result.errors.push('bazari.manifest.json not found');
      spinner.fail('Manifest not found');
      printResult(result);
      return;
    }

    // Validate required fields
    for (const field of REQUIRED_MANIFEST_FIELDS) {
      if (!(field in manifest) || (manifest as any)[field] === undefined) {
        result.valid = false;
        result.errors.push(`Missing required field: ${field}`);
      }
    }

    // Validate appId format
    if (manifest.appId) {
      if (!/^[a-z][a-z0-9.-]*$/i.test(manifest.appId)) {
        result.valid = false;
        result.errors.push('appId must start with a letter and contain only letters, numbers, dots, and hyphens');
      }
    }

    // Validate slug format
    if (manifest.slug) {
      if (!/^[a-z0-9-]+$/.test(manifest.slug)) {
        result.valid = false;
        result.errors.push('slug must be lowercase and contain only letters, numbers, and hyphens');
      }
    }

    // Validate version format (semver)
    if (manifest.version) {
      if (!/^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/.test(manifest.version)) {
        result.warnings.push('version should follow semver format (e.g., 1.0.0)');
      }
    }

    // Validate category
    if (manifest.category && !VALID_CATEGORIES.includes(manifest.category)) {
      result.valid = false;
      result.errors.push(`Invalid category: ${manifest.category}. Valid: ${VALID_CATEGORIES.join(', ')}`);
    }

    // Validate permissions
    if (manifest.permissions) {
      for (const perm of manifest.permissions) {
        if (!perm.id) {
          result.valid = false;
          result.errors.push('Permission missing "id" field');
        } else if (!VALID_PERMISSION_IDS.includes(perm.id)) {
          result.warnings.push(`Unknown permission: ${perm.id}`);
        }
        if (!perm.reason) {
          result.warnings.push(`Permission "${perm.id}" missing "reason" field`);
        }
      }
    }

    // Validate description length
    if (manifest.description) {
      if (manifest.description.length < 10) {
        result.warnings.push('Description should be at least 10 characters');
      }
      if (manifest.description.length > 500) {
        result.errors.push('Description must be less than 500 characters');
        result.valid = false;
      }
    }

    // Validate monetization
    if (manifest.monetizationType) {
      const validTypes = ['FREE', 'PAID', 'FREEMIUM', 'SUBSCRIPTION'];
      if (!validTypes.includes(manifest.monetizationType)) {
        result.errors.push(`Invalid monetizationType: ${manifest.monetizationType}`);
        result.valid = false;
      }
      if (manifest.monetizationType === 'PAID' && !manifest.price) {
        result.errors.push('PAID apps must have a price');
        result.valid = false;
      }
    }

    spinner.succeed('Manifest checked');

    // Check build directory
    const spinner2 = ora('Checking build...').start();
    const buildDir = path.resolve(options.dir);

    if (!(await fs.pathExists(buildDir))) {
      result.warnings.push(`Build directory "${options.dir}" not found (run "bazari build")`);
      spinner2.warn('Build not found');
    } else {
      // Check for index.html
      const indexPath = path.join(buildDir, 'index.html');
      if (!(await fs.pathExists(indexPath))) {
        result.errors.push('index.html not found in build directory');
        result.valid = false;
      } else {
        // Check index.html content
        const indexContent = await fs.readFile(indexPath, 'utf-8');

        if (!indexContent.includes('<!DOCTYPE html>')) {
          result.warnings.push('index.html should start with <!DOCTYPE html>');
        }

        if (!indexContent.includes('<meta name="viewport"')) {
          result.warnings.push('index.html should include viewport meta tag for mobile');
        }

        // Check for SDK import
        if (!indexContent.includes('@bazari.libervia.xyz/app-sdk')) {
          result.warnings.push('No @bazari.libervia.xyz/app-sdk import found in index.html');
        }
      }

      // Check build info
      const buildInfoPath = path.join(buildDir, '.build-info.json');
      if (await fs.pathExists(buildInfoPath)) {
        const buildInfo = await fs.readJson(buildInfoPath);

        // Check bundle size
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (buildInfo.size > maxSize) {
          result.warnings.push(`Bundle size (${formatBytes(buildInfo.size)}) exceeds recommended 5MB`);
        }
      }

      // Check for manifest in build
      const buildManifestPath = path.join(buildDir, 'bazari.manifest.json');
      if (!(await fs.pathExists(buildManifestPath))) {
        result.warnings.push('bazari.manifest.json not copied to build directory');
      }

      spinner2.succeed('Build checked');
    }

    // Print results
    printResult(result);

    if (!result.valid) {
      process.exit(1);
    }
  });

function printResult(result: ValidationResult): void {
  console.log('\n' + chalk.bold('Validation Results:\n'));

  if (result.errors.length > 0) {
    console.log(chalk.bold.red('Errors:'));
    for (const error of result.errors) {
      console.log(chalk.red(`  ✗ ${error}`));
    }
    console.log();
  }

  if (result.warnings.length > 0) {
    console.log(chalk.bold.yellow('Warnings:'));
    for (const warning of result.warnings) {
      console.log(chalk.yellow(`  ⚠ ${warning}`));
    }
    console.log();
  }

  if (result.valid && result.warnings.length === 0) {
    console.log(chalk.bold.green('✓ All checks passed!\n'));
  } else if (result.valid) {
    console.log(chalk.bold.green('✓ Validation passed with warnings\n'));
  } else {
    console.log(chalk.bold.red('✗ Validation failed\n'));
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
