import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { saveManifest, type AppManifest } from '../utils/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CATEGORIES = [
  { name: 'Finance', value: 'finance' },
  { name: 'Social', value: 'social' },
  { name: 'Commerce', value: 'commerce' },
  { name: 'Tools', value: 'tools' },
  { name: 'Governance', value: 'governance' },
  { name: 'Entertainment', value: 'entertainment' },
];

const TEMPLATES = [
  {
    name: 'React + TypeScript (recomendado)',
    value: 'react-ts',
    description: 'Template moderno com React 18, TypeScript e Vite',
  },
  {
    name: 'Vanilla JavaScript',
    value: 'vanilla',
    description: 'Template simples com HTML, CSS e JavaScript puro',
  },
];

// Template básico Vanilla para manter compatibilidade
const VANILLA_INDEX_HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{name}}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container {
      max-width: 480px;
      width: 100%;
      background: white;
      border-radius: 16px;
      padding: 32px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
    }
    h1 { color: #1a1a2e; margin-bottom: 8px; font-size: 28px; }
    .description { color: #666; line-height: 1.6; margin-bottom: 24px; }
    .user-info {
      background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 20px;
    }
    .loading { text-align: center; color: #666; }
    .warning {
      background: #fff3cd;
      border: 1px solid #ffc107;
      border-radius: 12px;
      padding: 20px;
      text-align: center;
      color: #856404;
    }
    button {
      width: 100%;
      padding: 14px 24px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      font-size: 16px;
      font-weight: 600;
      transition: all 0.2s ease;
    }
    button:hover {
      transform: translateY(-2px);
      box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4);
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>{{name}}</h1>
    <p class="description">{{description}}</p>
    <div id="user-info" class="user-info">
      <p class="loading">Carregando...</p>
    </div>
    <button onclick="showToast()">Mostrar Notificação</button>
  </div>

  <script type="module">
    import { BazariSDK } from 'https://esm.sh/@bazari.libervia.xyz/app-sdk@latest';

    const sdk = new BazariSDK({ debug: true });

    async function init() {
      const userInfo = document.getElementById('user-info');

      if (!sdk.isInBazari()) {
        userInfo.innerHTML = \`
          <div class="warning">
            <p><strong>⚠️ Modo de Desenvolvimento</strong></p>
            <p style="margin-top: 8px; font-size: 14px;">
              Este app deve rodar dentro do Bazari.<br>
              Use o Preview Mode no Developer Portal.
            </p>
          </div>
        \`;
        return;
      }

      try {
        await sdk.init();
        const user = await sdk.auth.getCurrentUser();
        const balance = await sdk.wallet.getBalance();

        if (user) {
          userInfo.innerHTML = \`
            <p><strong>Usuário:</strong> \${user.displayName || user.address}</p>
            <p style="margin-top: 8px;"><strong>Saldo:</strong> \${balance.free || '0'} BZR</p>
          \`;
        } else {
          userInfo.innerHTML = '<p>Conecte sua carteira para usar o app</p>';
        }
      } catch (error) {
        userInfo.innerHTML = '<p style="color: #dc3545;">Erro ao carregar dados</p>';
        console.error(error);
      }
    }

    window.showToast = async function() {
      if (sdk.isInBazari()) {
        await sdk.ui.success('Hello from {{name}}!');
      } else {
        alert('Toast: Hello from {{name}}!');
      }
    };

    init();
  </script>
</body>
</html>`;

export const createCommand = new Command('create')
  .description('Create a new Bazari app')
  .argument('[name]', 'App name')
  .option('-t, --template <template>', 'Template to use (react-ts, vanilla)', 'react-ts')
  .action(async (name, options) => {
    console.log(chalk.bold.blue('\n🚀 Create Bazari App\n'));

    // Template selection
    const templateAnswer = await inquirer.prompt([
      {
        type: 'list',
        name: 'template',
        message: 'Escolha um template:',
        choices: TEMPLATES.map((t) => ({
          name: `${t.name} - ${chalk.dim(t.description)}`,
          value: t.value,
        })),
        default: options.template,
      },
    ]);

    // Interactive prompts
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Nome do app:',
        default: name || 'my-bazari-app',
        validate: (input: string) => {
          if (!input.trim()) return 'Nome é obrigatório';
          if (!/^[a-zA-Z][a-zA-Z0-9-_ ]*$/.test(input)) {
            return 'Nome deve começar com letra e conter apenas letras, números, hífens, underscores e espaços';
          }
          return true;
        },
      },
      {
        type: 'input',
        name: 'description',
        message: 'Descrição:',
        default: 'Um app Bazari',
      },
      {
        type: 'list',
        name: 'category',
        message: 'Categoria:',
        choices: CATEGORIES,
      },
      {
        type: 'input',
        name: 'author',
        message: 'Autor:',
        default: 'Developer',
      },
    ]);

    const slug = answers.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const appId = `com.bazari.${slug}`;
    const projectDir = path.join(process.cwd(), slug);
    const template = templateAnswer.template;

    const spinner = ora('Criando projeto...').start();

    try {
      // Check if directory exists
      if (await fs.pathExists(projectDir)) {
        spinner.fail(`Diretório ${slug} já existe`);
        return;
      }

      if (template === 'react-ts') {
        await createReactTsProject(projectDir, {
          name: answers.name,
          slug,
          appId,
          description: answers.description,
          category: answers.category,
          author: answers.author,
        });
      } else {
        await createVanillaProject(projectDir, {
          name: answers.name,
          slug,
          appId,
          description: answers.description,
          category: answers.category,
          author: answers.author,
        });
      }

      spinner.succeed(chalk.green('Projeto criado com sucesso!'));

      console.log(`
${chalk.bold('Próximos passos:')}

  ${chalk.cyan(`cd ${slug}`)}
  ${chalk.cyan('npm install')}
  ${chalk.cyan('npm run dev')}

${chalk.bold('Para testar no Bazari:')}

  1. Execute ${chalk.cyan('npm run dev')}
  2. Acesse ${chalk.cyan('https://bazari.libervia.xyz/app/developer/preview')}
  3. Cole a URL ${chalk.yellow('http://localhost:3333')}

${chalk.dim('Happy building! 🎉')}
`);
    } catch (error) {
      spinner.fail('Falha ao criar projeto');
      console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
    }
  });

interface ProjectConfig {
  name: string;
  slug: string;
  appId: string;
  description: string;
  category: string;
  author: string;
}

async function createReactTsProject(projectDir: string, config: ProjectConfig) {
  // Find templates directory
  // __dirname is dist/, templates is at ../templates/ relative to dist/
  const templatesDir = path.resolve(__dirname, '../templates/react-ts');

  // Check if templates exist
  if (!(await fs.pathExists(templatesDir))) {
    throw new Error(`Template directory not found: ${templatesDir}`);
  }

  // Copy all files from template
  await fs.copy(templatesDir, projectDir);

  // Process template files (replace placeholders)
  const filesToProcess = [
    'package.json.template',
    'README.md.template',
    'index.html',
    'src/App.tsx',
  ];

  for (const file of filesToProcess) {
    const filePath = path.join(projectDir, file);
    if (await fs.pathExists(filePath)) {
      let content = await fs.readFile(filePath, 'utf-8');
      content = content
        .replace(/\{\{name\}\}/g, config.name)
        .replace(/\{\{slug\}\}/g, config.slug)
        .replace(/\{\{description\}\}/g, config.description)
        .replace(/\{\{author\}\}/g, config.author);

      // Rename .template files
      const finalPath = file.endsWith('.template')
        ? filePath.replace('.template', '')
        : filePath;

      await fs.writeFile(finalPath, content);

      // Remove .template file if renamed
      if (file.endsWith('.template')) {
        await fs.remove(filePath);
      }
    }
  }

  // Rename gitignore.template to .gitignore (npm doesn't include dotfiles)
  const gitignoreSrc = path.join(projectDir, 'gitignore.template');
  const gitignoreDest = path.join(projectDir, '.gitignore');
  if (await fs.pathExists(gitignoreSrc)) {
    await fs.move(gitignoreSrc, gitignoreDest);
  }

  // Create bazari.manifest.json
  const manifest: AppManifest = {
    appId: config.appId,
    name: config.name,
    slug: config.slug,
    version: '0.1.0',
    description: config.description,
    category: config.category,
    tags: [config.category, 'bazari-app'],
    icon: 'Package',
    color: 'from-blue-500 to-purple-600',
    entryPoint: '/index.html',
    permissions: [
      {
        id: 'user.profile.read',
        reason: 'Para exibir informações do seu perfil',
      },
      {
        id: 'wallet.balance.read',
        reason: 'Para exibir seu saldo',
      },
    ],
    sdkVersion: '0.2.0',
    monetizationType: 'FREE',
  };

  await saveManifest(manifest, projectDir);
}

async function createVanillaProject(projectDir: string, config: ProjectConfig) {
  // Create project structure
  await fs.ensureDir(projectDir);
  await fs.ensureDir(path.join(projectDir, 'public'));

  // Create index.html
  const indexHtml = VANILLA_INDEX_HTML
    .replace(/\{\{name\}\}/g, config.name)
    .replace(/\{\{description\}\}/g, config.description);

  await fs.writeFile(path.join(projectDir, 'public', 'index.html'), indexHtml);

  // Create package.json
  const packageJson = {
    name: config.slug,
    version: '0.1.0',
    private: true,
    description: config.description,
    author: config.author,
    scripts: {
      dev: 'npx serve public -l 3333',
      build: 'mkdir -p dist && cp -r public/* dist/',
    },
  };

  await fs.writeJson(path.join(projectDir, 'package.json'), packageJson, { spaces: 2 });

  // Create .gitignore
  const gitignore = `node_modules/
dist/
.env
.bazari/
*.log
`;
  await fs.writeFile(path.join(projectDir, '.gitignore'), gitignore);

  // Create README
  const readme = `# ${config.name}

${config.description}

## Desenvolvimento

\`\`\`bash
npm run dev
\`\`\`

## Para testar no Bazari

1. Execute \`npm run dev\`
2. Acesse https://bazari.libervia.xyz/app/developer/preview
3. Cole a URL http://localhost:3333

## SDK

\`\`\`javascript
import { BazariSDK } from 'https://esm.sh/@bazari.libervia.xyz/app-sdk@latest';

const sdk = new BazariSDK();
await sdk.init();

const user = await sdk.auth.getCurrentUser();
const balance = await sdk.wallet.getBalance();
\`\`\`
`;
  await fs.writeFile(path.join(projectDir, 'README.md'), readme);

  // Create manifest
  const manifest: AppManifest = {
    appId: config.appId,
    name: config.name,
    slug: config.slug,
    version: '0.1.0',
    description: config.description,
    category: config.category,
    tags: [config.category, 'bazari-app'],
    icon: 'Package',
    color: 'from-blue-500 to-purple-600',
    entryPoint: '/index.html',
    permissions: [
      {
        id: 'user.profile.read',
        reason: 'Para exibir informações do seu perfil',
      },
    ],
    sdkVersion: '0.2.0',
    monetizationType: 'FREE',
  };

  await saveManifest(manifest, projectDir);
}
