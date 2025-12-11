import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import { build as esbuild } from 'esbuild';
import { glob } from 'glob';
import { spawn } from 'child_process';
import { loadManifest } from '../utils/config.js';

export const buildCommand = new Command('build')
  .description('Build app for production')
  .option('-o, --output <dir>', 'Output directory', 'dist')
  .option('--minify', 'Minify output', true)
  .option('--sourcemap', 'Generate sourcemaps', false)
  .action(async (options) => {
    console.log(chalk.bold.blue('\n📦 Building Bazari App\n'));

    const manifest = await loadManifest();
    if (!manifest) {
      console.log(chalk.red('Error: bazari.manifest.json not found'));
      return;
    }

    // Check if it's a Vite project
    const isViteProject = await detectViteProject();

    if (isViteProject) {
      await buildViteProject(manifest, options);
    } else {
      await buildLegacyProject(manifest, options);
    }
  });

async function detectViteProject(): Promise<boolean> {
  const cwd = process.cwd();

  // Check for vite.config files
  const viteConfigs = ['vite.config.ts', 'vite.config.js', 'vite.config.mjs'];

  for (const config of viteConfigs) {
    if (await fs.pathExists(path.join(cwd, config))) {
      return true;
    }
  }

  // Check package.json for vite dependency
  const packageJsonPath = path.join(cwd, 'package.json');
  if (await fs.pathExists(packageJsonPath)) {
    try {
      const pkg = await fs.readJson(packageJsonPath);
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
      if (allDeps['vite']) {
        return true;
      }
    } catch {
      // Ignore errors
    }
  }

  return false;
}

interface CommandResult {
  success: boolean;
  stdout: string;
  stderr: string;
}

function runCommand(command: string, args: string[]): Promise<CommandResult> {
  return new Promise((resolve) => {
    const proc = spawn(command, args, {
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: true,
    });

    let stdout = '';
    let stderr = '';

    proc.stdout?.on('data', (data) => {
      stdout += data.toString();
      process.stdout.write(data);
    });

    proc.stderr?.on('data', (data) => {
      stderr += data.toString();
      process.stderr.write(data);
    });

    proc.on('close', (code) => {
      resolve({ success: code === 0, stdout, stderr });
    });

    proc.on('error', (error) => {
      resolve({ success: false, stdout, stderr: error.message });
    });
  });
}

async function buildViteProject(manifest: any, options: any): Promise<void> {
  const spinner = ora('Building with Vite...').start();
  const outputDir = path.resolve(options.output);

  try {
    // Check if node_modules exists
    const nodeModulesExists = await fs.pathExists(path.join(process.cwd(), 'node_modules'));
    if (!nodeModulesExists) {
      spinner.text = 'Installing dependencies...';
      const installResult = await runCommand('npm', ['install']);
      if (!installResult.success) {
        spinner.fail('Failed to install dependencies');
        process.exit(1);
      }
    }

    // Run TypeScript check first
    spinner.text = 'Checking TypeScript...';
    const tscResult = await runCommand('npx', ['tsc', '--noEmit']);
    if (!tscResult.success) {
      spinner.warn('TypeScript errors found (continuing build)');
    }

    // Run Vite build
    spinner.text = 'Building with Vite...';
    const buildResult = await runCommand('npx', ['vite', 'build', '--outDir', outputDir]);

    if (!buildResult.success) {
      spinner.fail('Build failed');
      process.exit(1);
    }

    // Copy manifest to output
    await fs.writeJson(path.join(outputDir, 'bazari.manifest.json'), manifest, { spaces: 2 });

    // Calculate bundle hash
    spinner.text = 'Calculating hash...';
    const hash = await calculateDirectoryHash(outputDir);

    // Get bundle size
    const bundleSize = await getDirectorySize(outputDir);
    const bundleSizeFormatted = formatBytes(bundleSize);

    // Save build info
    const buildInfo = {
      hash,
      size: bundleSize,
      timestamp: new Date().toISOString(),
      builder: 'vite',
    };
    await fs.writeJson(path.join(outputDir, '.build-info.json'), buildInfo, { spaces: 2 });

    spinner.succeed(chalk.green('Build completed!'));

    console.log(`
${chalk.bold('Build Output:')}

  ${chalk.dim('Directory:')} ${outputDir}
  ${chalk.dim('Size:')}      ${bundleSizeFormatted}
  ${chalk.dim('Hash:')}      ${hash.substring(0, 16)}...
  ${chalk.dim('Version:')}   ${manifest.version}
  ${chalk.dim('Builder:')}   Vite

${chalk.bold.green('✓ Ready for deployment!')}

${chalk.bold('Next steps:')}

  ${chalk.cyan('bazari validate')}  - Validate the build
  ${chalk.cyan('bazari publish')}   - Publish to Bazari
`);

    // List main output files
    const outputFiles = await glob('**/*', { cwd: outputDir, nodir: true });
    console.log(chalk.dim('Files:'));
    for (const file of outputFiles.slice(0, 10)) {
      const filePath = path.join(outputDir, file);
      const stat = await fs.stat(filePath);
      console.log(`  ${chalk.dim(formatBytes(stat.size).padStart(8))}  ${file}`);
    }
    if (outputFiles.length > 10) {
      console.log(chalk.dim(`  ... and ${outputFiles.length - 10} more files`));
    }
  } catch (error) {
    spinner.fail('Build failed');
    console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
    process.exit(1);
  }
}

async function buildLegacyProject(manifest: any, options: any): Promise<void> {
  const spinner = ora('Building...').start();
  const outputDir = path.resolve(options.output);
  const publicDir = path.resolve('public');

  try {
    // Clean output directory
    await fs.emptyDir(outputDir);

    // Copy static files from public
    if (await fs.pathExists(publicDir)) {
      await fs.copy(publicDir, outputDir);
      spinner.text = 'Copied static files';
    }

    // Check for JavaScript/TypeScript entry points in src
    const srcDir = path.resolve('src');
    if (await fs.pathExists(srcDir)) {
      const jsFiles = await glob('**/*.{js,ts,jsx,tsx}', { cwd: srcDir });

      if (jsFiles.length > 0) {
        spinner.text = 'Bundling JavaScript...';

        // Find entry point
        const entryPoints = jsFiles
          .filter((f) => /^(index|main|app)\.(js|ts|jsx|tsx)$/.test(path.basename(f)))
          .map((f) => path.join(srcDir, f));

        if (entryPoints.length > 0) {
          await esbuild({
            entryPoints,
            bundle: true,
            outdir: outputDir,
            minify: options.minify,
            sourcemap: options.sourcemap,
            format: 'esm',
            platform: 'browser',
            target: ['es2020'],
            loader: {
              '.js': 'js',
              '.jsx': 'jsx',
              '.ts': 'ts',
              '.tsx': 'tsx',
            },
            external: ['@bazari.libervia.xyz/app-sdk'],
          });
        }
      }
    }

    // Process HTML files - inject version and manifest info
    const htmlFiles = await glob('**/*.html', { cwd: outputDir });
    for (const htmlFile of htmlFiles) {
      const htmlPath = path.join(outputDir, htmlFile);
      let content = await fs.readFile(htmlPath, 'utf-8');

      // Add version meta tag
      if (!content.includes('bazari-app-version')) {
        content = content.replace(
          '</head>',
          `  <meta name="bazari-app-version" content="${manifest.version}">\n  </head>`
        );
      }

      // Add app-id meta tag
      if (!content.includes('bazari-app-id')) {
        content = content.replace(
          '</head>',
          `  <meta name="bazari-app-id" content="${manifest.appId}">\n  </head>`
        );
      }

      await fs.writeFile(htmlPath, content);
    }

    // Calculate bundle hash
    spinner.text = 'Calculating hash...';
    const hash = await calculateDirectoryHash(outputDir);

    // Copy manifest to output
    await fs.writeJson(path.join(outputDir, 'bazari.manifest.json'), manifest, { spaces: 2 });

    // Get bundle size
    const bundleSize = await getDirectorySize(outputDir);
    const bundleSizeFormatted = formatBytes(bundleSize);

    spinner.succeed(chalk.green('Build completed!'));

    console.log(`
${chalk.bold('Build Output:')}

  ${chalk.dim('Directory:')} ${outputDir}
  ${chalk.dim('Size:')}      ${bundleSizeFormatted}
  ${chalk.dim('Hash:')}      ${hash.substring(0, 16)}...
  ${chalk.dim('Version:')}   ${manifest.version}

${chalk.bold('Next steps:')}

  ${chalk.cyan('bazari validate')}  - Validate the build
  ${chalk.cyan('bazari publish')}   - Publish to Bazari

${chalk.dim('Files:')}
`);

    // List output files
    const outputFiles = await glob('**/*', { cwd: outputDir, nodir: true });
    for (const file of outputFiles.slice(0, 10)) {
      const filePath = path.join(outputDir, file);
      const stat = await fs.stat(filePath);
      console.log(`  ${chalk.dim(formatBytes(stat.size).padStart(8))}  ${file}`);
    }

    if (outputFiles.length > 10) {
      console.log(chalk.dim(`  ... and ${outputFiles.length - 10} more files`));
    }

    // Save hash to local config for later use
    const buildInfo = {
      hash,
      size: bundleSize,
      timestamp: new Date().toISOString(),
      files: outputFiles.length,
      builder: 'esbuild',
    };
    await fs.writeJson(path.join(outputDir, '.build-info.json'), buildInfo, { spaces: 2 });
  } catch (error) {
    spinner.fail('Build failed');
    console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
    process.exit(1);
  }
}

async function calculateDirectoryHash(dir: string): Promise<string> {
  const hash = crypto.createHash('sha256');
  const files = await glob('**/*', { cwd: dir, nodir: true });

  files.sort(); // Ensure consistent ordering

  for (const file of files) {
    const filePath = path.join(dir, file);
    const content = await fs.readFile(filePath);
    hash.update(file);
    hash.update(content);
  }

  return hash.digest('hex');
}

async function getDirectorySize(dir: string): Promise<number> {
  const files = await glob('**/*', { cwd: dir, nodir: true });
  let totalSize = 0;

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = await fs.stat(filePath);
    totalSize += stat.size;
  }

  return totalSize;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
