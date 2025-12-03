# Permissions Specification

**Versão:** 1.0.0
**Status:** Draft
**Data:** 2024-12-03

---

## Visão Geral

O sistema de permissões do BazariOS controla o acesso de apps aos recursos e dados do usuário. Cada app deve declarar as permissões necessárias no manifest, e o usuário deve consentir durante a instalação.

---

## Princípios

1. **Least Privilege:** Apps só pedem o que precisam
2. **Transparency:** Usuário sabe o que cada permissão permite
3. **Revocability:** Usuário pode revogar a qualquer momento
4. **Granularity:** Permissões específicas, não genéricas

---

## Catálogo de Permissões

### User Permissions

#### `user.profile.read`
- **Nome:** Ler perfil
- **Descrição:** Ver nome, avatar, handle e informações públicas
- **Risco:** Baixo
- **Requer Confirmação:** Não
- **Dados Acessados:**
  - `id`
  - `handle`
  - `displayName`
  - `avatar`
  - `bio`
  - `createdAt`

#### `user.profile.write`
- **Nome:** Editar perfil
- **Descrição:** Modificar informações do perfil
- **Risco:** Médio
- **Requer Confirmação:** Sim (primeira vez)
- **Ações Permitidas:**
  - Atualizar displayName
  - Atualizar bio
  - Atualizar avatar

---

### Wallet Permissions

#### `wallet.balance.read`
- **Nome:** Ver saldo
- **Descrição:** Consultar saldo de tokens BZR e ZARI
- **Risco:** Baixo
- **Requer Confirmação:** Não
- **Dados Acessados:**
  - Saldo BZR
  - Saldo ZARI
  - Saldo de outros tokens

#### `wallet.history.read`
- **Nome:** Ver histórico
- **Descrição:** Acessar histórico de transações
- **Risco:** Médio
- **Requer Confirmação:** Não
- **Dados Acessados:**
  - Lista de transações
  - Valores
  - Contrapartes
  - Timestamps

#### `wallet.transfer.request`
- **Nome:** Solicitar transferência
- **Descrição:** Pedir autorização para transferir tokens
- **Risco:** Alto
- **Requer Confirmação:** Sim (sempre)
- **Ações Permitidas:**
  - Solicitar transferência (usuário confirma)
  - App NÃO pode transferir sem confirmação

---

### Commerce Permissions

#### `products.read`
- **Nome:** Ver produtos
- **Descrição:** Listar produtos e lojas do usuário
- **Risco:** Baixo
- **Requer Confirmação:** Não

#### `products.write`
- **Nome:** Gerenciar produtos
- **Descrição:** Criar, editar e remover produtos
- **Risco:** Médio
- **Requer Confirmação:** Sim (primeira vez)

#### `orders.read`
- **Nome:** Ver pedidos
- **Descrição:** Acessar histórico de pedidos
- **Risco:** Médio
- **Requer Confirmação:** Não

#### `orders.write`
- **Nome:** Gerenciar pedidos
- **Descrição:** Criar e atualizar pedidos
- **Risco:** Alto
- **Requer Confirmação:** Sim

---

### Social Permissions

#### `feed.read`
- **Nome:** Ler feed
- **Descrição:** Ver posts e interações
- **Risco:** Baixo
- **Requer Confirmação:** Não

#### `feed.write`
- **Nome:** Postar
- **Descrição:** Criar posts em nome do usuário
- **Risco:** Alto
- **Requer Confirmação:** Sim (sempre)

#### `messages.read`
- **Nome:** Ler mensagens
- **Descrição:** Acessar conversas do usuário
- **Risco:** Alto
- **Requer Confirmação:** Sim (primeira vez)

#### `messages.write`
- **Nome:** Enviar mensagens
- **Descrição:** Enviar mensagens em nome do usuário
- **Risco:** Alto
- **Requer Confirmação:** Sim (sempre)

---

### System Permissions

#### `notifications.send`
- **Nome:** Notificações
- **Descrição:** Enviar notificações push
- **Risco:** Baixo
- **Requer Confirmação:** Não
- **Limitações:**
  - Máximo 10/hora
  - Rate limiting aplicado

#### `storage.app`
- **Nome:** Armazenamento
- **Descrição:** Salvar dados do app localmente
- **Risco:** Baixo
- **Requer Confirmação:** Não
- **Limitações:**
  - Máximo 10MB por app
  - Dados isolados

#### `camera`
- **Nome:** Câmera
- **Descrição:** Acessar câmera do dispositivo
- **Risco:** Médio
- **Requer Confirmação:** Sim (por sessão)

#### `location`
- **Nome:** Localização
- **Descrição:** Acessar localização GPS
- **Risco:** Médio
- **Requer Confirmação:** Sim (por sessão)

---

### Blockchain Permissions

#### `blockchain.read`
- **Nome:** Ler blockchain
- **Descrição:** Consultar dados on-chain
- **Risco:** Baixo
- **Requer Confirmação:** Não

#### `blockchain.sign`
- **Nome:** Assinar transações
- **Descrição:** Solicitar assinatura de transações blockchain
- **Risco:** Crítico
- **Requer Confirmação:** Sim (sempre, com detalhes)
- **UI Especial:** Modal com detalhes da transação

---

## Níveis de Risco

| Nível | Cor | Descrição |
|-------|-----|-----------|
| **Baixo** | Verde | Dados públicos ou ações inofensivas |
| **Médio** | Amarelo | Dados sensíveis ou ações reversíveis |
| **Alto** | Laranja | Ações em nome do usuário |
| **Crítico** | Vermelho | Transações financeiras ou irreversíveis |

---

## Fluxo de Consentimento

### Instalação de App

```
┌─────────────────────────────────────────────────────────────┐
│              Instalar "Analytics Pro"?                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Este app solicita as seguintes permissões:                 │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  ✓ PERMISSÕES NECESSÁRIAS                              │ │
│  │                                                        │ │
│  │  👤 Ler perfil                           Baixo        │ │
│  │     Identificar seu perfil no dashboard               │ │
│  │                                                        │ │
│  │  📰 Ler feed                             Baixo        │ │
│  │     Calcular métricas de engajamento                  │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  ☐ PERMISSÕES OPCIONAIS                               │ │
│  │                                                        │ │
│  │  ☐ 📦 Ver pedidos                       Médio        │ │
│  │       Analisar suas vendas                            │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  [   Cancelar   ]              [   Instalar   ]             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Confirmação em Runtime

Para permissões com `requiresConfirmation: true`:

```
┌─────────────────────────────────────────────────────────────┐
│              Analytics Pro quer:                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  💸 Transferir tokens                                       │
│                                                              │
│  Valor: 50 BZR                                              │
│  Para: @joao                                                │
│  Motivo: "Pagamento de serviço"                             │
│                                                              │
│  ⚠️ Esta ação não pode ser desfeita                         │
│                                                              │
│  [   Negar   ]                 [   Permitir   ]             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Gerenciamento de Permissões

### Revogar Permissão

Usuário pode revogar em: `Configurações > Apps > [App] > Permissões`

```typescript
// API no SDK
sdk.auth.getPermissions();
// { granted: ['user.profile.read'], denied: ['orders.read'] }

// Se permissão foi revogada, operação falha
await sdk.wallet.getBalance();
// Error: Permission denied: wallet.balance.read
```

### Re-solicitar Permissão

Se negada, app pode solicitar novamente (com limitações):

```typescript
const hasPermission = await sdk.auth.hasPermission('orders.read');
if (!hasPermission) {
  // UI pedindo para ir nas configurações
  sdk.ui.showModal({
    title: 'Permissão necessária',
    content: 'Para ver suas vendas, habilite a permissão em Configurações.'
  });
}
```

---

## Validação no Host

```typescript
// host-bridge.ts
async function checkPermission(
  appId: string,
  messageType: MessageType
): Promise<boolean> {
  // Mapa de mensagem -> permissão
  const requiredPermission = PERMISSION_MAP[messageType];

  // Algumas operações não precisam de permissão
  if (!requiredPermission) return true;

  // Verificar se app tem permissão
  const store = useUserAppsStore.getState();
  return store.hasPermission(appId, requiredPermission);
}
```

---

## Rate Limiting

| Permissão | Limite |
|-----------|--------|
| `notifications.send` | 10/hora |
| `wallet.transfer.request` | 5/minuto |
| `feed.write` | 10/minuto |
| `messages.write` | 30/minuto |

---

## Auditoria

Todas as ações com permissão são logadas:

```typescript
interface PermissionAuditLog {
  appId: string;
  userId: string;
  permission: string;
  action: 'granted' | 'denied' | 'used' | 'revoked';
  timestamp: Date;
  metadata?: Record<string, unknown>;
}
```

---

**Documento:** PERMISSIONS-SPEC.md
**Versão:** 1.0.0
