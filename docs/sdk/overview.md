# SDK Overview

O `@bazari.libervia.xyz/app-sdk` é a biblioteca oficial para desenvolver apps que integram com a plataforma Bazari.

## Modos de Uso

O SDK suporta dois modos de operação:

| Modo | Descrição | Caso de Uso |
|------|-----------|-------------|
| **App Store** | App roda em iframe dentro do Bazari | Apps nativos da plataforma |
| **External** | App roda em site externo | Integração em e-commerce, sites, etc |

## Instalação

```bash
npm install @bazari.libervia.xyz/app-sdk
```

Ou via CDN:

```html
<script type="module">
  import { BazariSDK } from 'https://unpkg.com/@bazari.libervia.xyz/app-sdk@latest/dist/index.mjs';
</script>
```

## Inicialização

### Modo App Store (iframe)

Para apps que rodam dentro da plataforma Bazari:

```javascript
import { BazariSDK } from '@bazari.libervia.xyz/app-sdk';

const sdk = new BazariSDK({
  apiKey: import.meta.env.VITE_BAZARI_API_KEY,  // Opcional em dev, obrigatória em prod
  debug: import.meta.env.DEV,                    // Mostra logs em desenvolvimento
});
```

### Modo Externo (SDK Externo)

Para apps que rodam em sites externos:

```javascript
import { BazariSDK } from '@bazari.libervia.xyz/app-sdk';

const sdk = new BazariSDK({
  apiKey: 'baz_sdk_abc123...',      // Obrigatória
  secretKey: 'sk_secret_xyz789...', // Obrigatória (server-side apenas!)
  mode: 'external',                  // Indica modo externo
});
```

> **Segurança:** O `secretKey` deve ser usado apenas no servidor. Nunca exponha no frontend!

## API Key e Secret Key

### Para App Store

| Ambiente | API Key |
|----------|---------|
| Developer Preview | Opcional |
| Produção | Obrigatória |

Obtenha sua API Key em: https://bazari.libervia.xyz/app/developer/api-keys

### Para SDK Externo

| Credencial | Onde usar | Propósito |
|------------|-----------|-----------|
| API Key | Frontend + Backend | Identifica o app |
| Secret Key | Backend apenas | Autentica requisições |

Gere credenciais via CLI:

```bash
bazari publish --target external --origin https://meusite.com
```

Gerencie credenciais:

```bash
bazari keys list      # Listar todas
bazari keys show      # Ver detalhes
bazari keys rotate    # Rotacionar secret
bazari keys revoke    # Revogar (permanente)
```

Veja [gerenciamento de API Keys](../cli/keys.md) para mais detalhes.

## APIs Disponíveis

### sdk.auth
Gerencia autenticação e informações do usuário.

```javascript
// Obter usuário atual
const user = await sdk.auth.getCurrentUser();
// { id, handle, displayName, avatar, roles }

// Verificar permissões
const perms = await sdk.auth.getPermissions();
// { granted: ['wallet:read'], denied: ['wallet:write'] }
```

[Referência completa de Auth →](./auth.md)

### sdk.wallet
Interage com a wallet BZR do usuário.

```javascript
// Obter saldo
const balance = await sdk.wallet.getBalance();
// { bzr: '1000', zari: '50', formatted: { bzr: '1.000,00', zari: '50,00' } }

// Solicitar transferência
const result = await sdk.wallet.requestTransfer({
  to: '@recipiente',
  amount: 10,
  token: 'BZR',
  memo: 'Pagamento'
});
```

[Referência completa de Wallet →](./wallet.md)

### sdk.storage
Armazena dados persistentes do app.

```javascript
// Salvar
await sdk.storage.set('key', 'value');

// Recuperar
const value = await sdk.storage.get('key');

// Remover
await sdk.storage.remove('key');

// Limpar tudo
await sdk.storage.clear();
```

[Referência completa de Storage →](./storage.md)

### sdk.ui
Componentes de interface e navegação.

```javascript
// Toasts
await sdk.ui.success('Sucesso!');
await sdk.ui.error('Erro!');
await sdk.ui.info('Informação');
await sdk.ui.warning('Aviso');

// Modal de confirmação
const confirmed = await sdk.ui.showConfirm({
  title: 'Confirmar',
  message: 'Tem certeza?',
  confirmText: 'Sim',
  cancelText: 'Não'
});
```

[Referência completa de UI →](./ui.md)

### sdk.events
Sistema de eventos do app.

```javascript
// Escutar evento
sdk.events.on('wallet:balance-changed', (data) => {
  console.log('Novo saldo:', data.balance);
});

// Remover listener
sdk.events.off('wallet:balance-changed', handler);
```

[Referência completa de Events →](./events.md)

### sdk.contracts
Interage com smart contracts ink!.

```javascript
// Deploy de contrato de fidelidade
const contract = await sdk.contracts.deployLoyalty({
  name: 'Meus Pontos',
  symbol: 'PTS',
  bzrToPointsRatio: 100,
  pointsToBzrRatio: 100
});

// Interagir com contrato
const loyalty = sdk.contracts.loyalty(contract.address);
await loyalty.issuePoints(userAddress, 1000, 'Compra');
```

[Referência completa de Contracts →](./contracts.md)

## Métodos Utilitários

### isInBazari()

Verifica se o app está rodando dentro da plataforma Bazari.

```javascript
if (!sdk.isInBazari()) {
  showMessage('Por favor, abra este app dentro do Bazari');
}
```

### getVersion()

Retorna a versão do SDK.

```javascript
const version = sdk.getVersion();
// '0.2.0'
```

## TypeScript

O SDK é escrito em TypeScript e inclui tipos completos:

```typescript
import { BazariSDK, SDKUser, SDKBalance } from '@bazari.libervia.xyz/app-sdk';

const sdk = new BazariSDK();

const user: SDKUser = await sdk.auth.getCurrentUser();
const balance: SDKBalance = await sdk.wallet.getBalance();
```

## Tratamento de Erros

Todas as chamadas do SDK podem lançar erros:

```javascript
try {
  await sdk.wallet.requestTransfer({ ... });
} catch (error) {
  if (error.code === 'PERMISSION_DENIED') {
    // App não tem permissão wallet:write
  } else if (error.code === 'USER_CANCELLED') {
    // Usuário cancelou a operação
  } else if (error.code === 'INSUFFICIENT_BALANCE') {
    // Saldo insuficiente
  } else if (error.code === 'TIMEOUT') {
    // Timeout na operação
  } else {
    // Erro desconhecido
    console.error(error);
  }
}
```

## Próximos Passos

- [API de Autenticação](./auth.md)
- [API de Wallet](./wallet.md)
- [API de Storage](./storage.md)
- [API de UI](./ui.md)
- [API de Contratos](./contracts.md)
