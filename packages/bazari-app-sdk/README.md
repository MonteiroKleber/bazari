# @bazari.libervia.xyz/app-sdk

SDK oficial para desenvolvimento de apps no ecossistema Bazari.

## Instalação

```bash
npm install @bazari.libervia.xyz/app-sdk
# ou
yarn add @bazari.libervia.xyz/app-sdk
# ou
pnpm add @bazari.libervia.xyz/app-sdk
```

## Uso Básico

```typescript
import { BazariSDK } from '@bazari.libervia.xyz/app-sdk';

// Inicializar SDK
// API Key é opcional no Developer Preview, obrigatória em produção
const sdk = new BazariSDK({
  apiKey: import.meta.env.VITE_BAZARI_API_KEY,  // Variável de ambiente
  debug: import.meta.env.DEV,                    // Logs em desenvolvimento
});

// Verificar se está no Bazari
if (!sdk.isInBazari()) {
  console.warn('Este app deve rodar dentro do Bazari');
}

// Obter usuário atual
const user = await sdk.auth.getCurrentUser();
console.log('Usuário:', user.displayName);

// Verificar saldo (retorna array de SDKBalance)
const balances = await sdk.wallet.getBalance();
const bzrBalance = balances.find(b => b.symbol === 'BZR');
console.log('Saldo BZR:', bzrBalance?.formatted);

// Mostrar notificação
await sdk.ui.success('Bem-vindo ao app!');
```

## Configuração de API Key

A API Key identifica seu app e controla suas permissões.

### Desenvolvimento (Preview Mode)
No Developer Preview, a API Key é **opcional**:
```bash
npm run dev
# Testar em https://bazari.libervia.xyz/app/developer/preview
```

### Produção
Para apps publicados, a API Key é **obrigatória**:

1. Obtenha sua API Key em: https://bazari.libervia.xyz/app/developer/api-keys
2. Crie o arquivo `.env.production`:
```bash
VITE_BAZARI_API_KEY=baz_app_xxxxxxxxxxxxxxxx
```
3. Build: `npm run build`

> **Importante:** Nunca commite sua API Key no repositório. Use variáveis de ambiente.

## APIs Disponíveis

### Auth

```typescript
// Obter usuário logado
const user = await sdk.auth.getCurrentUser();

// Verificar permissões
const permissions = await sdk.auth.getPermissions();
const canTransfer = await sdk.auth.hasPermission('wallet.transfer.request');
```

### Wallet

```typescript
// Obter saldo
const balance = await sdk.wallet.getBalance();
const bzrOnly = await sdk.wallet.getBalance('BZR');

// Histórico
const transactions = await sdk.wallet.getHistory({ limit: 10 });

// Solicitar transferência (abre modal de confirmação)
const result = await sdk.wallet.requestTransfer({
  to: 'user-handle',
  amount: 100,
  token: 'BZR',
  memo: 'Pagamento'
});
```

### Storage

```typescript
// Salvar dados (isolados por app)
await sdk.storage.set('myKey', { data: 'value' });

// Recuperar dados
const data = await sdk.storage.get('myKey');

// Com fallback
const value = await sdk.storage.getOrDefault('key', 'default');

// Remover
await sdk.storage.remove('myKey');
await sdk.storage.clear(); // Limpa tudo
```

### UI

```typescript
// Toasts
await sdk.ui.showToast('Mensagem', { type: 'info' });
await sdk.ui.success('Sucesso!');
await sdk.ui.error('Erro!');
await sdk.ui.warning('Atenção!');

// Confirmação
const confirmed = await sdk.ui.showConfirm({
  title: 'Confirmar ação',
  message: 'Tem certeza?',
  confirmText: 'Sim',
  cancelText: 'Não'
});

// Modal
await sdk.ui.showModal({ title: 'Título', content: 'Conteúdo' });
await sdk.ui.closeModal();
```

### Events

```typescript
// Escutar evento
const unsubscribe = await sdk.events.on('wallet:balanceChanged', (data) => {
  console.log('Novo saldo:', data);
});

// Parar de escutar
unsubscribe();

// Escutar uma vez
await sdk.events.once('app:activated', (data) => {
  console.log('App ativado');
});
```

## Permissões

Seu app deve declarar as permissões necessárias no `bazari.manifest.json`:

```json
{
  "permissions": [
    { "id": "user.profile.read", "reason": "Para exibir seu nome" },
    { "id": "wallet.balance.read", "reason": "Para mostrar saldo" }
  ]
}
```

## Eventos Disponíveis

| Evento | Descrição |
|--------|-----------|
| `wallet:transaction` | Nova transação detectada |
| `wallet:balanceChanged` | Saldo alterado |
| `user:profileUpdated` | Perfil do usuário atualizado |
| `app:activated` | App foi ativado/focado |
| `app:deactivated` | App perdeu foco |

## TypeScript

O SDK é totalmente tipado. Importe os tipos conforme necessário:

```typescript
import type {
  SDKUser,
  SDKBalance,
  SDKTransaction,
  SDKPermissions,
  BazariEvent
} from '@bazari.libervia.xyz/app-sdk';
```

## Debug Mode

Para desenvolvimento, ative o modo debug:

```typescript
const sdk = new BazariSDK({ debug: true });
```

Isso irá:
- Mostrar warnings quando não estiver dentro do Bazari
- Logar inicialização e versão

## Segurança

- O SDK funciona via `postMessage` com a plataforma host
- Apps rodam em iframes sandboxed
- Todas as operações sensíveis requerem permissão
- Dados no storage são isolados por app
- Transferências sempre requerem confirmação do usuário

## Requisitos

- TypeScript >= 4.7.0 (para desenvolvimento)
- Navegador moderno com suporte a ES2020

## Licença

MIT
