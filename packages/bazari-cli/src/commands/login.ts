import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import open from 'open';
import http from 'http';
import { URL } from 'url';
import { saveConfig, loadConfig } from '../utils/config.js';
import { apiRequest } from '../utils/api.js';

const DEFAULT_API_URL = 'https://bazari.libervia.xyz/api';

export const loginCommand = new Command('login')
  .description('Authenticate with Bazari Developer Portal')
  .option('--token <token>', 'Use API token directly')
  .option('--api-url <url>', 'Custom API URL', DEFAULT_API_URL)
  .action(async (options) => {
    console.log(chalk.bold.blue('\n🔐 Bazari Developer Login\n'));

    const config = await loadConfig();

    // Check if already logged in
    if (config.token) {
      const { action } = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'You are already logged in. What would you like to do?',
          choices: [
            { name: 'Continue with current session', value: 'continue' },
            { name: 'Login with different account', value: 'relogin' },
            { name: 'Logout', value: 'logout' },
          ],
        },
      ]);

      if (action === 'continue') {
        console.log(chalk.green('\n✓ Using existing session\n'));
        return;
      }

      if (action === 'logout') {
        await saveConfig({ ...config, token: undefined, user: undefined });
        console.log(chalk.green('\n✓ Logged out successfully\n'));
        return;
      }
    }

    // Direct token login
    if (options.token) {
      const spinner = ora('Validating token...').start();

      try {
        const user = await apiRequest('/developer/profile', {
          method: 'GET',
          token: options.token,
          apiUrl: options.apiUrl,
        });

        await saveConfig({
          ...config,
          token: options.token,
          apiUrl: options.apiUrl,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
          },
        });

        spinner.succeed(`Logged in as ${chalk.cyan(user.name || user.email)}`);
        console.log(chalk.green('\n✓ Authentication successful!\n'));
      } catch (error: any) {
        spinner.fail('Invalid token');
        console.log(chalk.red(`\nError: ${error.message}\n`));
        process.exit(1);
      }
      return;
    }

    // Interactive login options
    const { method } = await inquirer.prompt([
      {
        type: 'list',
        name: 'method',
        message: 'Choose authentication method:',
        choices: [
          { name: 'Browser login (recommended)', value: 'browser' },
          { name: 'Enter API token manually', value: 'token' },
          { name: 'Email/Password', value: 'credentials' },
        ],
      },
    ]);

    if (method === 'browser') {
      await browserLogin(options.apiUrl, config);
    } else if (method === 'token') {
      await tokenLogin(options.apiUrl, config);
    } else {
      await credentialsLogin(options.apiUrl, config);
    }
  });

async function browserLogin(apiUrl: string, config: any): Promise<void> {
  console.log(chalk.dim('\nStarting local server for authentication...\n'));

  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url || '', `http://localhost`);

      if (url.pathname === '/callback') {
        const token = url.searchParams.get('token');
        const error = url.searchParams.get('error');

        if (error) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <html>
              <body style="font-family: sans-serif; text-align: center; padding: 50px;">
                <h1>❌ Authentication Failed</h1>
                <p>${error}</p>
                <p>You can close this window.</p>
              </body>
            </html>
          `);
          server.close();
          console.log(chalk.red(`\nAuthentication failed: ${error}\n`));
          reject(new Error(error));
          return;
        }

        if (token) {
          const spinner = ora('Validating token...').start();

          try {
            const user = await apiRequest('/developer/profile', {
              method: 'GET',
              token,
              apiUrl,
            });

            await saveConfig({
              ...config,
              token,
              apiUrl,
              user: {
                id: user.id,
                name: user.name,
                email: user.email,
              },
            });

            spinner.succeed(`Logged in as ${chalk.cyan(user.name || user.email)}`);

            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`
              <html>
                <body style="font-family: sans-serif; text-align: center; padding: 50px;">
                  <h1>✅ Authentication Successful!</h1>
                  <p>Welcome, ${user.name || user.email}!</p>
                  <p>You can close this window and return to the CLI.</p>
                </body>
              </html>
            `);

            console.log(chalk.green('\n✓ Authentication successful!\n'));
          } catch (error: any) {
            spinner.fail('Token validation failed');
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`
              <html>
                <body style="font-family: sans-serif; text-align: center; padding: 50px;">
                  <h1>❌ Token Validation Failed</h1>
                  <p>${error.message}</p>
                  <p>You can close this window.</p>
                </body>
              </html>
            `);
          }

          server.close();
          resolve();
        }
      }
    });

    // Find available port
    server.listen(0, async () => {
      const address = server.address() as any;
      const port = address.port;
      const callbackUrl = `http://localhost:${port}/callback`;
      const loginUrl = `${apiUrl.replace('/api', '')}/cli-auth?callback=${encodeURIComponent(callbackUrl)}`;

      console.log(chalk.dim(`Opening browser for authentication...`));
      console.log(chalk.dim(`If browser doesn't open, visit: ${loginUrl}\n`));

      try {
        await open(loginUrl);
      } catch {
        console.log(chalk.yellow('Could not open browser automatically.'));
        console.log(chalk.cyan(`Please open this URL manually: ${loginUrl}\n`));
      }

      // Timeout after 5 minutes
      setTimeout(() => {
        server.close();
        console.log(chalk.yellow('\nAuthentication timed out. Please try again.\n'));
        reject(new Error('Timeout'));
      }, 5 * 60 * 1000);
    });
  });
}

async function tokenLogin(apiUrl: string, config: any): Promise<void> {
  const { token } = await inquirer.prompt([
    {
      type: 'password',
      name: 'token',
      message: 'Enter your API token:',
      validate: (input) => input.length > 0 || 'Token is required',
    },
  ]);

  const spinner = ora('Validating token...').start();

  try {
    const user = await apiRequest('/developer/profile', {
      method: 'GET',
      token,
      apiUrl,
    });

    await saveConfig({
      ...config,
      token,
      apiUrl,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });

    spinner.succeed(`Logged in as ${chalk.cyan(user.name || user.email)}`);
    console.log(chalk.green('\n✓ Authentication successful!\n'));
  } catch (error: any) {
    spinner.fail('Invalid token');
    console.log(chalk.red(`\nError: ${error.message}\n`));
    process.exit(1);
  }
}

async function credentialsLogin(apiUrl: string, config: any): Promise<void> {
  const { email, password } = await inquirer.prompt([
    {
      type: 'input',
      name: 'email',
      message: 'Email:',
      validate: (input) => {
        if (!input) return 'Email is required';
        if (!input.includes('@')) return 'Invalid email format';
        return true;
      },
    },
    {
      type: 'password',
      name: 'password',
      message: 'Password:',
      validate: (input) => input.length > 0 || 'Password is required',
    },
  ]);

  const spinner = ora('Authenticating...').start();

  try {
    const response = await apiRequest('/auth/login', {
      method: 'POST',
      body: { email, password },
      apiUrl,
    });

    const { token, user } = response;

    await saveConfig({
      ...config,
      token,
      apiUrl,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });

    spinner.succeed(`Logged in as ${chalk.cyan(user.name || user.email)}`);
    console.log(chalk.green('\n✓ Authentication successful!\n'));
  } catch (error: any) {
    spinner.fail('Authentication failed');
    console.log(chalk.red(`\nError: ${error.message}\n`));
    process.exit(1);
  }
}

// Logout command
export const logoutCommand = new Command('logout')
  .description('Logout from Bazari Developer Portal')
  .action(async () => {
    const config = await loadConfig();

    if (!config.token) {
      console.log(chalk.yellow('\nYou are not logged in.\n'));
      return;
    }

    await saveConfig({ ...config, token: undefined, user: undefined });
    console.log(chalk.green('\n✓ Logged out successfully\n'));
  });

// Whoami command
export const whoamiCommand = new Command('whoami')
  .description('Show current authenticated user')
  .action(async () => {
    const config = await loadConfig();

    if (!config.token || !config.user) {
      console.log(chalk.yellow('\nNot logged in. Run `bazari login` to authenticate.\n'));
      return;
    }

    console.log(chalk.bold.blue('\n📋 Current User\n'));
    console.log(`  Name:  ${chalk.cyan(config.user.name || 'N/A')}`);
    console.log(`  Email: ${chalk.cyan(config.user.email)}`);
    console.log(`  ID:    ${chalk.dim(config.user.id)}`);
    console.log();
  });
