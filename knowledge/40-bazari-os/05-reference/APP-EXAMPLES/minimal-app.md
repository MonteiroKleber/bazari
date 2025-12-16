# Minimal App - Exemplo de App de Terceiros

**Versão:** 1.0.0
**Data:** 2024-12-03
**Tipo:** App de Terceiros (Community)

---

## Visão Geral

Este documento demonstra como criar um app mínimo de terceiros para o BazariOS, desde a estrutura até a publicação.

---

## Estrutura do Projeto

```
my-bazari-app/
├── bazari.manifest.json    # Configuração obrigatória
├── package.json            # Dependências
├── tsconfig.json           # TypeScript config
├── vite.config.ts          # Build config
├── src/
│   ├── main.tsx           # Entry point
│   ├── App.tsx            # Componente principal
│   ├── index.css          # Estilos
│   └── components/
│       └── ...
├── public/
│   ├── icon.png           # Ícone 512x512
│   └── screenshots/
│       └── ...
└── dist/                   # Build output
```

---

## Arquivo: bazari.manifest.json

```json
{
  "$schema": "https://bazari.io/schemas/manifest.json",
  "id": "hello-world",
  "name": "Hello World",
  "slug": "hello-world",
  "version": "1.0.0",
  "description": "Um app simples para demonstrar o BazariOS",
  "longDescription": "Este é um app de exemplo que demonstra como criar apps para o ecossistema Bazari.",

  "developer": {
    "name": "Seu Nome",
    "email": "dev@example.com",
    "website": "https://example.com"
  },

  "icon": "./public/icon.png",
  "color": "#3B82F6",

  "category": "tools",
  "tags": ["demo", "exemplo", "tutorial"],

  "entryPoint": "./dist/index.html",
  "assets": {
    "bundle": "./dist/",
    "screenshots": [
      "./public/screenshots/home.png"
    ]
  },

  "permissions": [
    {
      "id": "user.profile.read",
      "reason": "Para exibir seu nome e avatar"
    }
  ],

  "requirements": {
    "minPlatformVersion": "3.0.0",
    "requiredPermissions": ["user.profile.read"]
  },

  "monetization": {
    "type": "free"
  }
}
```

---

## Arquivo: package.json

```json
{
  "name": "hello-world-bazari-app",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "bazari dev",
    "build": "vite build",
    "preview": "vite preview",
    "validate": "bazari validate",
    "publish": "bazari publish"
  },
  "dependencies": {
    "@bazari.libervia.xyz/app-sdk": "^0.2.2",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@bazari.libervia.xyz/cli": "^0.2.23",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.0.0",
    "typescript": "^5.0.0",
    "vite": "^5.0.0"
  }
}
```

---

## Arquivo: vite.config.ts

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './', // Importante para apps embeddados
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: undefined, // Bundle único para simplicidade
      },
    },
  },
});
```

---

## Arquivo: src/main.tsx

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BazariSDK } from '@bazari.libervia.xyz/app-sdk';
import App from './App';
import './index.css';

// Inicializar SDK antes de renderizar
async function init() {
  try {
    // Inicializa comunicação com a plataforma
    await BazariSDK.init({
      appId: 'hello-world',
      version: '1.0.0',
    });

    // Renderizar app
    ReactDOM.createRoot(document.getElementById('root')!).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (error) {
    console.error('Failed to initialize Bazari SDK:', error);

    // Mostrar erro amigável
    document.getElementById('root')!.innerHTML = `
      <div style="padding: 20px; text-align: center;">
        <h1>Erro ao carregar app</h1>
        <p>Por favor, tente novamente.</p>
      </div>
    `;
  }
}

init();
```

---

## Arquivo: src/App.tsx

```typescript
import { useState, useEffect } from 'react';
import { BazariSDK } from '@bazari.libervia.xyz/app-sdk';

interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
}

function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadUser() {
      try {
        // Usar SDK para obter perfil do usuário
        const profile = await BazariSDK.auth.getProfile();
        setUser(profile);
      } catch (err) {
        setError('Falha ao carregar perfil');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, []);

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Carregando...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="error">{error}</div>
      </div>
    );
  }

  return (
    <div className="container">
      <header className="header">
        <h1>Hello World App</h1>
      </header>

      <main className="main">
        {user ? (
          <div className="profile-card">
            {user.avatar && (
              <img
                src={user.avatar}
                alt={user.displayName}
                className="avatar"
              />
            )}
            <h2>Olá, {user.displayName}!</h2>
            <p>@{user.username}</p>
          </div>
        ) : (
          <p>Usuário não encontrado</p>
        )}

        <div className="actions">
          <button
            onClick={() => BazariSDK.ui.showToast('Você clicou no botão!')}
            className="button"
          >
            Mostrar Toast
          </button>

          <button
            onClick={() => BazariSDK.ui.showModal({
              title: 'Modal de Exemplo',
              content: 'Este é um modal criado via SDK!',
              actions: [
                { label: 'Fechar', type: 'secondary' },
                { label: 'OK', type: 'primary' },
              ],
            })}
            className="button secondary"
          >
            Abrir Modal
          </button>
        </div>
      </main>

      <footer className="footer">
        <p>Feito com ❤️ para o BazariOS</p>
      </footer>
    </div>
  );
}

export default App;
```

---

## Arquivo: src/index.css

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #f5f5f5;
  color: #333;
}

.container {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.header {
  text-align: center;
  padding: 20px 0;
  border-bottom: 1px solid #e0e0e0;
}

.header h1 {
  font-size: 24px;
  color: #3B82F6;
}

.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  padding: 40px 0;
}

.profile-card {
  background: white;
  border-radius: 12px;
  padding: 30px;
  text-align: center;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 300px;
}

.avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  margin-bottom: 15px;
}

.profile-card h2 {
  font-size: 20px;
  margin-bottom: 5px;
}

.profile-card p {
  color: #666;
}

.actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
}

.button {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  background: #3B82F6;
  color: white;
}

.button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.button.secondary {
  background: #e0e0e0;
  color: #333;
}

.button.secondary:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.loading,
.error {
  text-align: center;
  padding: 40px;
}

.error {
  color: #ef4444;
}

.footer {
  text-align: center;
  padding: 20px 0;
  border-top: 1px solid #e0e0e0;
  color: #666;
  font-size: 14px;
}
```

---

## Usando o SDK

### Autenticação

```typescript
import { BazariSDK } from '@bazari.libervia.xyz/app-sdk';

// Obter perfil do usuário logado
const profile = await BazariSDK.auth.getProfile();

// Verificar se usuário está logado
const isLoggedIn = await BazariSDK.auth.isAuthenticated();
```

### UI

```typescript
// Toast
BazariSDK.ui.showToast('Mensagem de sucesso!', 'success');
BazariSDK.ui.showToast('Algo deu errado', 'error');

// Modal
const result = await BazariSDK.ui.showModal({
  title: 'Confirmação',
  content: 'Tem certeza que deseja continuar?',
  actions: [
    { label: 'Cancelar', type: 'secondary', value: 'cancel' },
    { label: 'Confirmar', type: 'primary', value: 'confirm' },
  ],
});

if (result.action === 'confirm') {
  // Usuário confirmou
}
```

### Wallet

```typescript
// Obter saldo (requer permissão wallet.balance.read)
const balance = await BazariSDK.wallet.getBalance();

// Solicitar transação (requer permissão wallet.send)
const tx = await BazariSDK.wallet.requestTransfer({
  to: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
  amount: '1000000000000', // 1 BZR em unidades mínimas
  memo: 'Pagamento via Hello World App',
});
```

### Storage

```typescript
// Salvar dados locais do app
await BazariSDK.storage.set('lastVisit', new Date().toISOString());

// Recuperar dados
const lastVisit = await BazariSDK.storage.get('lastVisit');
```

### Eventos

```typescript
// Ouvir eventos da plataforma
BazariSDK.events.on('theme:changed', (theme) => {
  console.log('Tema mudou para:', theme);
});

// Ouvir quando app é fechado
BazariSDK.events.on('app:closing', () => {
  // Salvar estado antes de fechar
});
```

---

## Desenvolvimento Local

### 1. Criar projeto

```bash
# Via CLI (recomendado)
npx @bazari.libervia.xyz/cli create my-app

# Ou manualmente
mkdir my-app && cd my-app
npm init -y
npm install @bazari.libervia.xyz/app-sdk react react-dom
```

### 2. Desenvolver

```bash
# Iniciar servidor de desenvolvimento
npm run dev

# Isso abre o app em um iframe simulando o ambiente Bazari
```

### 3. Validar

```bash
# Validar manifest e estrutura
npm run validate

# Output:
# ✓ Manifest válido
# ✓ Permissões válidas
# ✓ Assets encontrados
# ✓ Bundle < 5MB
```

### 4. Build

```bash
# Gerar build de produção
npm run build

# Output em dist/
```

### 5. Publicar

```bash
# Publicar na App Store
npm run publish

# Isso:
# 1. Faz upload para IPFS
# 2. Gera hash do bundle
# 3. Submete para review
```

---

## Checklist de Publicação

Antes de submeter seu app:

- [ ] `bazari.manifest.json` válido
- [ ] Ícone 512x512 PNG
- [ ] Pelo menos 1 screenshot
- [ ] Descrição clara e sem erros
- [ ] Permissões justificadas
- [ ] App funciona offline (básico)
- [ ] Não há erros no console
- [ ] Bundle < 5MB
- [ ] Testado em mobile e desktop
- [ ] Política de privacidade (se coleta dados)

---

## Boas Práticas

### Performance

```typescript
// ✅ Lazy load de componentes pesados
const HeavyChart = lazy(() => import('./components/HeavyChart'));

// ✅ Memoização de cálculos
const expensiveValue = useMemo(() => computeExpensive(data), [data]);

// ✅ Debounce em inputs
const debouncedSearch = useDebouncedCallback(search, 300);
```

### Segurança

```typescript
// ✅ Nunca confiar em dados do usuário
const sanitizedInput = sanitizeHtml(userInput);

// ✅ Usar SDK para operações sensíveis
await BazariSDK.wallet.requestTransfer(...); // Abre UI nativa

// ❌ Não fazer isso
window.parent.postMessage({ type: 'TRANSFER', ... }); // Bypassing SDK
```

### UX

```typescript
// ✅ Feedback para ações
BazariSDK.ui.showToast('Salvo com sucesso!', 'success');

// ✅ Estados de loading
{loading ? <Skeleton /> : <Content />}

// ✅ Tratamento de erros
try {
  await action();
} catch (error) {
  BazariSDK.ui.showToast('Erro: ' + error.message, 'error');
}
```

---

## Exemplos de Apps

### 1. Lista de Tarefas

```typescript
// Simple todo app
function TodoApp() {
  const [todos, setTodos] = useState<string[]>([]);
  const [input, setInput] = useState('');

  useEffect(() => {
    // Carregar do storage
    BazariSDK.storage.get('todos').then((saved) => {
      if (saved) setTodos(JSON.parse(saved));
    });
  }, []);

  const addTodo = () => {
    const newTodos = [...todos, input];
    setTodos(newTodos);
    setInput('');
    BazariSDK.storage.set('todos', JSON.stringify(newTodos));
  };

  return (
    <div>
      <input value={input} onChange={(e) => setInput(e.target.value)} />
      <button onClick={addTodo}>Adicionar</button>
      <ul>
        {todos.map((todo, i) => (
          <li key={i}>{todo}</li>
        ))}
      </ul>
    </div>
  );
}
```

### 2. Verificador de Saldo

```typescript
function BalanceChecker() {
  const [balance, setBalance] = useState<string | null>(null);

  useEffect(() => {
    BazariSDK.wallet.getBalance().then(setBalance);
  }, []);

  return (
    <div>
      <h2>Seu Saldo</h2>
      <p>{balance ? `${balance} BZR` : 'Carregando...'}</p>
    </div>
  );
}
```

---

**Documento:** APP-EXAMPLES/minimal-app.md
**Versão:** 1.0.0
