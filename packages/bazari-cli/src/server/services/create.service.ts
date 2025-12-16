/**
 * Create Service - Handles project creation via CLI Server
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { projectService } from './project.service.js';

const PROJECTS_DIR = path.join(os.homedir(), 'bazari-projects');

export interface ProcessedFile {
  path: string;
  content: string;
}

export interface CreateProjectOptions {
  name: string;
  description: string;
  template: string;
  category: string;
  author?: string;
  files?: ProcessedFile[];
}

export interface CreateProjectResult {
  success: boolean;
  projectPath?: string;
  slug?: string;
  error?: string;
}

// Template básico Vanilla
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
    }
    button:hover { transform: translateY(-2px); }
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
        userInfo.innerHTML = '<p>Modo de Desenvolvimento - Execute dentro do Bazari</p>';
        return;
      }

      try {
        await sdk.init();
        const user = await sdk.auth.getCurrentUser();
        const balance = await sdk.wallet.getBalance();

        if (user) {
          userInfo.innerHTML = \`
            <p><strong>Usuário:</strong> \${user.displayName || user.address}</p>
            <p><strong>Saldo:</strong> \${balance.free || '0'} BZR</p>
          \`;
        }
      } catch (error) {
        userInfo.innerHTML = '<p>Erro ao carregar dados</p>';
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

// React TypeScript template files
const REACT_TS_PACKAGE_JSON = `{
  "name": "{{slug}}",
  "version": "0.1.0",
  "private": true,
  "description": "{{description}}",
  "author": "{{author}}",
  "type": "module",
  "scripts": {
    "dev": "vite --port 3333",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@bazari.libervia.xyz/app-sdk": "^0.2.2",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0"
  }
}`;

const REACT_TS_INDEX_HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{name}}</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>`;

const REACT_TS_MAIN_TSX = `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`;

const REACT_TS_APP_TSX = `import { useEffect, useState } from 'react';
import { BazariSDK } from '@bazari.libervia.xyz/app-sdk';

const sdk = new BazariSDK({ debug: true });

interface User {
  address: string;
  displayName?: string;
}

interface Balance {
  free: string;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [loading, setLoading] = useState(true);
  const [inBazari, setInBazari] = useState(false);

  useEffect(() => {
    const init = async () => {
      const isInBazari = sdk.isInBazari();
      setInBazari(isInBazari);

      if (!isInBazari) {
        setLoading(false);
        return;
      }

      try {
        await sdk.init();
        const userData = await sdk.auth.getCurrentUser();
        const balanceData = await sdk.wallet.getBalance();
        setUser(userData);
        setBalance(balanceData);
      } catch (error) {
        console.error('Init error:', error);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  const handleShowToast = async () => {
    if (inBazari) {
      await sdk.ui.success('Hello from {{name}}!');
    } else {
      alert('Toast: Hello from {{name}}!');
    }
  };

  return (
    <div className="container">
      <h1>{{name}}</h1>
      <p className="description">{{description}}</p>

      <div className="user-info">
        {loading ? (
          <p className="loading">Carregando...</p>
        ) : !inBazari ? (
          <p className="warning">Modo de Desenvolvimento - Execute dentro do Bazari</p>
        ) : user ? (
          <>
            <p><strong>Usuário:</strong> {user.displayName || user.address}</p>
            <p><strong>Saldo:</strong> {balance?.free || '0'} BZR</p>
          </>
        ) : (
          <p>Conecte sua carteira</p>
        )}
      </div>

      <button onClick={handleShowToast}>Mostrar Notificação</button>
    </div>
  );
}`;

const REACT_TS_INDEX_CSS = `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

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

h1 {
  color: #1a1a2e;
  margin-bottom: 8px;
  font-size: 28px;
}

.description {
  color: #666;
  line-height: 1.6;
  margin-bottom: 24px;
}

.user-info {
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
}

.loading {
  text-align: center;
  color: #666;
}

.warning {
  text-align: center;
  color: #856404;
  background: #fff3cd;
  padding: 12px;
  border-radius: 8px;
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
}`;

const REACT_TS_VITE_CONFIG = `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3333,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});`;

const REACT_TS_TSCONFIG = `{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}`;

const REACT_TS_TSCONFIG_NODE = `{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}`;

const GITIGNORE = `node_modules/
dist/
.env
.bazari/
*.log
.DS_Store
`;

export class CreateService {
  /**
   * Cria um novo projeto Bazari
   */
  async createProject(options: CreateProjectOptions): Promise<CreateProjectResult> {
    const { name, description, template, category, author = 'Developer', files } = options;

    // Gera slug a partir do nome
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const appId = `com.bazari.${slug}`;
    const projectDir = path.join(PROJECTS_DIR, slug);

    try {
      // Garante que o diretório de projetos existe
      await fs.mkdir(PROJECTS_DIR, { recursive: true });

      // Verifica se já existe
      try {
        await fs.access(projectDir);
        return {
          success: false,
          error: `Project directory already exists: ${slug}`,
        };
      } catch {
        // Não existe, podemos criar
      }

      // Se foram fornecidos arquivos processados, usa eles
      if (files && files.length > 0) {
        await this.createProjectFromFiles(projectDir, files, {
          name,
          slug,
          appId,
          description,
          category,
          author,
        });
      }
      // Senão, usa os templates legados
      else if (template === 'react-ts') {
        await this.createReactTsProject(projectDir, {
          name,
          slug,
          appId,
          description,
          category,
          author,
        });
      } else {
        await this.createVanillaProject(projectDir, {
          name,
          slug,
          appId,
          description,
          category,
          author,
        });
      }

      return {
        success: true,
        projectPath: projectDir,
        slug,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Cria projeto a partir de arquivos processados do template
   */
  private async createProjectFromFiles(
    projectDir: string,
    files: ProcessedFile[],
    config: {
      name: string;
      slug: string;
      appId: string;
      description: string;
      category: string;
      author: string;
    }
  ): Promise<void> {
    // Cria diretório do projeto
    await fs.mkdir(projectDir, { recursive: true });

    // Escreve cada arquivo
    for (const file of files) {
      const filePath = path.join(projectDir, file.path);
      const fileDir = path.dirname(filePath);

      // Garante que o diretório existe
      await fs.mkdir(fileDir, { recursive: true });

      // Escreve o arquivo
      await fs.writeFile(filePath, file.content, 'utf-8');
    }

    // Se não houver manifest, cria um
    const hasManifest = files.some(
      (f) => f.path === 'bazari.manifest.json' || f.path.endsWith('/bazari.manifest.json')
    );

    if (!hasManifest) {
      const manifest = {
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
        permissions: [],
        sdkVersion: '1.0.0',
        monetizationType: 'FREE',
      };

      await fs.writeFile(
        path.join(projectDir, 'bazari.manifest.json'),
        JSON.stringify(manifest, null, 2)
      );
    }

    // Adiciona .gitignore se não existir
    const hasGitignore = files.some((f) => f.path === '.gitignore');
    if (!hasGitignore) {
      await fs.writeFile(path.join(projectDir, '.gitignore'), GITIGNORE);
    }
  }

  private async createReactTsProject(
    projectDir: string,
    config: {
      name: string;
      slug: string;
      appId: string;
      description: string;
      category: string;
      author: string;
    }
  ): Promise<void> {
    // Cria estrutura de diretórios
    await fs.mkdir(projectDir, { recursive: true });
    await fs.mkdir(path.join(projectDir, 'src'), { recursive: true });
    await fs.mkdir(path.join(projectDir, 'public'), { recursive: true });

    // Substitui placeholders
    const replace = (content: string) =>
      content
        .replace(/\{\{name\}\}/g, config.name)
        .replace(/\{\{slug\}\}/g, config.slug)
        .replace(/\{\{description\}\}/g, config.description)
        .replace(/\{\{author\}\}/g, config.author);

    // Escreve arquivos
    await fs.writeFile(path.join(projectDir, 'package.json'), replace(REACT_TS_PACKAGE_JSON));
    await fs.writeFile(path.join(projectDir, 'index.html'), replace(REACT_TS_INDEX_HTML));
    await fs.writeFile(path.join(projectDir, 'src', 'main.tsx'), replace(REACT_TS_MAIN_TSX));
    await fs.writeFile(path.join(projectDir, 'src', 'App.tsx'), replace(REACT_TS_APP_TSX));
    await fs.writeFile(path.join(projectDir, 'src', 'index.css'), replace(REACT_TS_INDEX_CSS));
    await fs.writeFile(path.join(projectDir, 'vite.config.ts'), replace(REACT_TS_VITE_CONFIG));
    await fs.writeFile(path.join(projectDir, 'tsconfig.json'), replace(REACT_TS_TSCONFIG));
    await fs.writeFile(path.join(projectDir, 'tsconfig.node.json'), replace(REACT_TS_TSCONFIG_NODE));
    await fs.writeFile(path.join(projectDir, '.gitignore'), GITIGNORE);

    // Cria manifest
    const manifest = {
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
        { id: 'user.profile.read', reason: 'Para exibir informações do seu perfil' },
        { id: 'wallet.balance.read', reason: 'Para exibir seu saldo' },
      ],
      sdkVersion: '0.2.0',
      monetizationType: 'FREE',
    };

    await fs.writeFile(
      path.join(projectDir, 'bazari.manifest.json'),
      JSON.stringify(manifest, null, 2)
    );
  }

  private async createVanillaProject(
    projectDir: string,
    config: {
      name: string;
      slug: string;
      appId: string;
      description: string;
      category: string;
      author: string;
    }
  ): Promise<void> {
    // Cria estrutura de diretórios
    await fs.mkdir(projectDir, { recursive: true });
    await fs.mkdir(path.join(projectDir, 'public'), { recursive: true });

    // Substitui placeholders
    const replace = (content: string) =>
      content
        .replace(/\{\{name\}\}/g, config.name)
        .replace(/\{\{description\}\}/g, config.description);

    // Escreve arquivos
    await fs.writeFile(
      path.join(projectDir, 'public', 'index.html'),
      replace(VANILLA_INDEX_HTML)
    );

    // package.json para vanilla
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

    await fs.writeFile(
      path.join(projectDir, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );

    await fs.writeFile(path.join(projectDir, '.gitignore'), GITIGNORE);

    // README
    const readme = `# ${config.name}

${config.description}

## Desenvolvimento

\`\`\`bash
npm run dev
\`\`\`

## SDK

\`\`\`javascript
import { BazariSDK } from '@bazari.libervia.xyz/app-sdk';

const sdk = new BazariSDK();
await sdk.init();
\`\`\`
`;
    await fs.writeFile(path.join(projectDir, 'README.md'), readme);

    // Cria manifest
    const manifest = {
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
        { id: 'user.profile.read', reason: 'Para exibir informações do seu perfil' },
      ],
      sdkVersion: '0.2.0',
      monetizationType: 'FREE',
    };

    await fs.writeFile(
      path.join(projectDir, 'bazari.manifest.json'),
      JSON.stringify(manifest, null, 2)
    );
  }

  /**
   * Lista templates disponíveis
   */
  getTemplates() {
    return [
      {
        id: 'react-ts',
        name: 'React + TypeScript',
        description: 'Template moderno com React 18, TypeScript e Vite',
      },
      {
        id: 'vanilla',
        name: 'Vanilla JavaScript',
        description: 'Template simples com HTML, CSS e JavaScript puro',
      },
    ];
  }

  /**
   * Lista categorias disponíveis
   */
  getCategories() {
    return [
      { id: 'finance', name: 'Finance' },
      { id: 'social', name: 'Social' },
      { id: 'commerce', name: 'Commerce' },
      { id: 'tools', name: 'Tools' },
      { id: 'governance', name: 'Governance' },
      { id: 'entertainment', name: 'Entertainment' },
    ];
  }
}

export const createService = new CreateService();
