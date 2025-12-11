import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs-extra';
import path from 'path';
import http from 'http';
import { spawn } from 'child_process';
import { loadManifest } from '../utils/config.js';

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

export const devCommand = new Command('dev')
  .description('Start development server with hot reload')
  .option('-p, --port <port>', 'Port to run on', '3333')
  .option('-d, --dir <dir>', 'Directory to serve', 'public')
  .option('--host <host>', 'Host to bind to', 'localhost')
  .action(async (options) => {
    console.log(chalk.bold.blue('\n🔧 Bazari Dev Server\n'));

    // Check for manifest
    const manifest = await loadManifest();
    if (!manifest) {
      console.log(chalk.red('Error: bazari.manifest.json not found'));
      console.log(chalk.dim('Run "bazari create" to create a new project'));
      return;
    }

    const port = parseInt(options.port, 10);
    const host = options.host;

    // Check if it's a Vite project (has vite.config.ts or vite in package.json)
    const isViteProject = await detectViteProject();

    if (isViteProject) {
      await startViteServer(manifest.name, manifest.version, port, host);
    } else {
      await startSimpleServer(manifest.name, manifest.version, port, host, options.dir);
    }
  });

async function detectViteProject(): Promise<boolean> {
  const cwd = process.cwd();

  // Check for vite.config files
  const viteConfigs = [
    'vite.config.ts',
    'vite.config.js',
    'vite.config.mjs',
  ];

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
      const allDeps = {
        ...pkg.dependencies,
        ...pkg.devDependencies,
      };
      if (allDeps['vite']) {
        return true;
      }
    } catch {
      // Ignore errors
    }
  }

  return false;
}

async function startViteServer(
  appName: string,
  appVersion: string,
  port: number,
  host: string
): Promise<void> {
  const spinner = ora('Starting Vite dev server...').start();

  // Check if node_modules exists
  const nodeModulesExists = await fs.pathExists(path.join(process.cwd(), 'node_modules'));
  if (!nodeModulesExists) {
    spinner.text = 'Installing dependencies...';
    await new Promise<void>((resolve, reject) => {
      const npm = spawn('npm', ['install'], {
        stdio: 'inherit',
        shell: true,
      });
      npm.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`npm install failed with code ${code}`));
      });
    });
  }

  spinner.text = 'Starting Vite...';

  // Start Vite via npx
  const vite = spawn('npx', ['vite', '--port', port.toString(), '--host', host], {
    stdio: ['inherit', 'pipe', 'pipe'],
    shell: true,
  });

  let serverStarted = false;

  vite.stdout?.on('data', (data) => {
    const output = data.toString();
    process.stdout.write(output);

    // Detect when server is ready
    if (!serverStarted && (output.includes('Local:') || output.includes('ready in'))) {
      serverStarted = true;
      spinner.succeed('Vite dev server started');

      const localUrl = `http://${host === '0.0.0.0' ? 'localhost' : host}:${port}`;
      const previewUrl = `https://bazari.libervia.xyz/app/developer/preview?url=${encodeURIComponent(localUrl)}`;

      console.log(`
${chalk.bold('App:')} ${appName}
${chalk.bold('Version:')} ${appVersion}

${chalk.bold.green('✓ Hot Module Replacement (HMR) ativo')}
${chalk.bold.green('✓ TypeScript suportado')}
${chalk.bold.green('✓ SDK integrado')}

${chalk.bold.yellow('📱 Preview no Bazari:')}
${chalk.cyan(previewUrl)}

${chalk.dim('Ou abra https://bazari.libervia.xyz/app/developer/preview e cole:')} ${localUrl}
`);
    }
  });

  vite.stderr?.on('data', (data) => {
    process.stderr.write(data);
  });

  vite.on('close', (code) => {
    if (!serverStarted) {
      spinner.fail(`Vite exited with code ${code}`);
    }
    process.exit(code || 0);
  });

  vite.on('error', (error) => {
    spinner.fail(`Failed to start Vite: ${error.message}`);
    console.log(chalk.yellow('\nTrying fallback to simple server...'));
    startSimpleServer(appName, appVersion, port, host, 'public');
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log(chalk.dim('\nShutting down...'));
    vite.kill();
  });
}

async function startSimpleServer(
  appName: string,
  appVersion: string,
  port: number,
  host: string,
  dir: string
): Promise<void> {
  const publicDir = path.resolve(dir);

  // Check if public directory exists
  if (!(await fs.pathExists(publicDir))) {
    console.log(chalk.red(`Error: Directory "${dir}" not found`));
    return;
  }

  const spinner = ora('Starting dev server...').start();

  const server = http.createServer(async (req, res) => {
    try {
      let filePath = path.join(publicDir, req.url === '/' ? 'index.html' : req.url || '');

      // Remove query string
      filePath = filePath.split('?')[0];

      // Security: prevent directory traversal
      if (!filePath.startsWith(publicDir)) {
        res.statusCode = 403;
        res.end('Forbidden');
        return;
      }

      // Check if file exists
      if (!(await fs.pathExists(filePath))) {
        // Try with .html extension
        if (await fs.pathExists(filePath + '.html')) {
          filePath = filePath + '.html';
        } else {
          // Fallback to index.html for SPA
          filePath = path.join(publicDir, 'index.html');
        }
      }

      // Check if it's a directory
      const stat = await fs.stat(filePath);
      if (stat.isDirectory()) {
        filePath = path.join(filePath, 'index.html');
      }

      if (!(await fs.pathExists(filePath))) {
        res.statusCode = 404;
        res.end('Not Found');
        return;
      }

      const ext = path.extname(filePath);
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      // Add CORS headers for development
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', '*');

      // Cache control for development
      res.setHeader('Cache-Control', 'no-store');

      const content = await fs.readFile(filePath);
      res.setHeader('Content-Type', contentType);
      res.end(content);
    } catch (error) {
      res.statusCode = 500;
      res.end('Internal Server Error');
      console.error(chalk.red('Error:'), error);
    }
  });

  server.listen(port, host, () => {
    spinner.succeed('Dev server started');

    const localUrl = `http://${host}:${port}`;
    const previewUrl = `https://bazari.libervia.xyz/app/developer/preview?url=${encodeURIComponent(localUrl)}`;

    console.log(`
${chalk.bold('App:')} ${appName}
${chalk.bold('Version:')} ${appVersion}
${chalk.bold('URL:')} ${chalk.cyan(localUrl)}

${chalk.dim('Press Ctrl+C to stop')}

${chalk.bold.yellow('📱 Preview no Bazari:')}
${chalk.cyan(previewUrl)}

${chalk.dim('Ou abra https://bazari.libervia.xyz/app/developer/preview e cole:')} ${localUrl}
`);

    // Watch for file changes (simple polling)
    let lastChange = Date.now();
    const checkChanges = async () => {
      try {
        const files = await fs.readdir(publicDir);
        for (const file of files) {
          const filePath = path.join(publicDir, file);
          const stat = await fs.stat(filePath);
          if (stat.mtimeMs > lastChange) {
            lastChange = Date.now();
            console.log(chalk.dim(`[${new Date().toLocaleTimeString()}]`), chalk.green('File changed:'), file);
          }
        }
      } catch {
        // Ignore errors
      }
    };

    const watcher = setInterval(checkChanges, 1000);

    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log(chalk.dim('\nShutting down...'));
      clearInterval(watcher);
      server.close(() => {
        process.exit(0);
      });
    });
  });

  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      spinner.fail(`Port ${port} is already in use`);
    } else {
      spinner.fail(`Server error: ${error.message}`);
    }
    process.exit(1);
  });
}
