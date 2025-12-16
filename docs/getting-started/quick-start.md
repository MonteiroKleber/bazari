# Seu Primeiro App Bazari em 10 Minutos

Vamos criar um app React + TypeScript que mostra o saldo do usuário.

## Pré-requisitos

- Node.js 18+
- Uma conta Bazari com wallet

## Passo 1: Instalar o CLI (2 min)

```bash
npm install -g @bazari.libervia.xyz/cli
```

Verifique a instalação:

```bash
bazari --version
# @bazari.libervia.xyz/cli v0.2.25
```

## Passo 2: Fazer Login (1 min)

```bash
bazari login
```

Isso abrirá o navegador para autenticar com sua wallet Bazari.

## Passo 3: Criar o Projeto (1 min)

```bash
bazari create meu-primeiro-app
```

Escolha o template:
- **React + TypeScript** (recomendado) - Projeto moderno com Vite
- **Vanilla JavaScript** - Projeto simples com HTML/JS

Responda às perguntas:
- **Nome:** Meu Primeiro App
- **Descrição:** App de teste
- **Categoria:** Tools

```bash
cd meu-primeiro-app
npm install
```

## Passo 4: Entender a Estrutura (1 min)

### Template React + TypeScript

```
meu-primeiro-app/
├── bazari.manifest.json   # Configuração do app
├── package.json           # Dependências + Vite
├── vite.config.ts         # Configuração do Vite
├── tsconfig.json          # Configuração TypeScript
├── index.html             # HTML entry point
├── .env.example           # Exemplo de configuração
└── src/
    ├── main.tsx           # Entry point React
    ├── App.tsx            # Componente principal
    ├── index.css          # Estilos
    ├── vite-env.d.ts      # Tipos para env vars
    ├── hooks/
    │   └── useBazari.ts   # Hook do SDK (já configurado para API Key)
    └── components/
        └── UserCard.tsx   # Componente de exemplo
```

## Passo 5: Iniciar o Servidor de Dev (1 min)

```bash
npm run dev
```

Você verá:

```
🔧 Bazari Dev Server

App: Meu Primeiro App
Version: 0.1.0

✓ Hot Module Replacement (HMR) ativo
✓ TypeScript suportado
✓ SDK integrado

📱 Preview no Bazari:
https://bazari.libervia.xyz/app/developer/preview?url=http://localhost:3333
```

## Passo 6: Testar no Bazari (2 min)

1. Abra o link de Preview mostrado no terminal
2. O app carrega dentro do ambiente Bazari
3. Veja os logs do SDK no Console da página de preview

> **Importante:** O SDK só funciona completamente quando rodando dentro do Bazari. Em modo standalone, você verá a mensagem de "Modo de Desenvolvimento".

## Passo 7: Modificar o App (2 min)

Edite `src/App.tsx` para personalizar:

```tsx
import { useBazari } from './hooks/useBazari';
import { UserCard } from './components/UserCard';

function App() {
  const { sdk, user, balance, isLoading, isInBazari } = useBazari();

  const handleTransfer = async () => {
    if (sdk) {
      // Solicitar transferência (requer permissão)
      const result = await sdk.wallet.requestTransfer({
        to: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        amount: '1000000000000', // 1 BZR (12 decimais)
        token: 'BZR',
      });
      console.log('Transfer result:', result);
    }
  };

  if (isLoading) {
    return <div className="loading">Carregando...</div>;
  }

  if (!isInBazari) {
    return (
      <div className="warning-card">
        <h2>⚠️ Modo de Desenvolvimento</h2>
        <p>Use o Preview Mode para testar o SDK</p>
      </div>
    );
  }

  return (
    <div className="app-container">
      <h1>💰 Meu Primeiro App</h1>
      {user && <UserCard user={user} balance={balance} />}
      <button onClick={handleTransfer}>Enviar 1 BZR</button>
    </div>
  );
}

export default App;
```

## Passo 8: Configurar API Key para Produção (1 min)

Antes de publicar, configure sua API Key:

1. Obtenha sua API Key em: https://bazari.libervia.xyz/app/developer/api-keys
2. Crie o arquivo `.env.production`:

```bash
# .env.production
VITE_BAZARI_API_KEY=baz_app_xxxxxxxxxxxxxxxx
```

> **Importante:** Nunca commite esse arquivo! Ele já está no `.gitignore`.

## Passo 9: Build e Publicar (1 min)

```bash
# Validar o manifest
bazari validate

# Build para produção (usa .env.production)
npm run build

# Publicar na App Store
bazari publish
```

Pronto! Seu app foi enviado para review.

## Hook useBazari

O template já inclui um hook pronto para usar:

```tsx
import { useBazari } from './hooks/useBazari';

function MyComponent() {
  const {
    sdk,         // Instância do SDK
    user,        // Usuário atual (ou null)
    balance,     // Saldo em BZR
    isLoading,   // Estado de carregamento
    error,       // Erro (se houver)
    isInBazari,  // Se está rodando no Bazari
    refetch,     // Função para recarregar dados
  } = useBazari();

  // Usar os dados...
}
```

## Próximos Passos

- [Entender o SDK](../sdk/overview.md)
- [Integrar pagamentos](../guides/payment-integration.md)
- [Monetizar seu app](../guides/monetization.md)
- [Programa de Fidelidade](../guides/loyalty-program.md)

---

**Tempo total:** ~10 minutos

## Por que API Key?

A API Key identifica seu **app** (não o usuário):

| O que autentica | Propósito |
|-----------------|-----------|
| **Wallet/Login** | Identifica o usuário |
| **API Key** | Identifica o app e suas permissões |

Isso permite:
- Controlar permissões por app
- Rate limiting por app
- Revogar acesso de apps específicos
- Analytics por app
