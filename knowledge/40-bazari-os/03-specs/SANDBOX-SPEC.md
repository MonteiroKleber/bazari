# Sandbox Security Specification

**Versão:** 1.0.0
**Status:** Draft
**Data:** 2024-12-03

---

## Visão Geral

Apps de terceiros rodam em um ambiente isolado (sandbox) para proteger os usuários de código malicioso. Esta especificação define as regras de isolamento e comunicação.

---

## Modelo de Execução

```
┌─────────────────────────────────────────────────────────────────┐
│                    BAZARI HOST (Trusted)                         │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                     MAIN APP                               │  │
│  │  - Acesso total ao DOM                                    │  │
│  │  - Acesso às APIs nativas                                 │  │
│  │  - Gerenciamento de estado                                │  │
│  │  - Comunicação com backend                                │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              ▲                                   │
│                              │ postMessage (validado)            │
│                              ▼                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              IFRAME SANDBOX (Untrusted)                    │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │                 THIRD-PARTY APP                      │  │  │
│  │  │                                                      │  │  │
│  │  │  - Código isolado do host                           │  │  │
│  │  │  - Sem acesso ao DOM pai                            │  │  │
│  │  │  - Comunicação apenas via SDK                       │  │  │
│  │  │  - Permissões limitadas                             │  │  │
│  │  │                                                      │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Iframe Sandbox Attributes

### Configuração do Iframe

```html
<iframe
  src="https://app-cdn.bazari.io/apps/com.example.app/index.html"
  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
  allow="clipboard-write"
  referrerpolicy="no-referrer"
  loading="lazy"
></iframe>
```

### Atributos Sandbox

| Atributo | Incluído | Motivo |
|----------|----------|--------|
| `allow-scripts` | ✅ | App precisa executar JS |
| `allow-same-origin` | ✅ | Necessário para localStorage |
| `allow-forms` | ✅ | App pode ter formulários |
| `allow-popups` | ✅ | Para links externos |
| `allow-downloads` | ❌ | Segurança |
| `allow-top-navigation` | ❌ | Impede redirect do host |
| `allow-modals` | ❌ | Usa UI do host |
| `allow-pointer-lock` | ❌ | Não necessário |

### Atributos Allow

| Atributo | Incluído | Motivo |
|----------|----------|--------|
| `clipboard-write` | ✅ | Copiar dados |
| `clipboard-read` | ❌ | Segurança |
| `camera` | Via SDK | Controlado por permissão |
| `geolocation` | Via SDK | Controlado por permissão |
| `microphone` | ❌ | Não suportado |

---

## Content Security Policy

### CSP do Host

```
Content-Security-Policy:
  default-src 'self';
  frame-src https://app-cdn.bazari.io https://ipfs.bazari.io;
  script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  connect-src 'self' https://api.bazari.io wss://api.bazari.io;
```

### CSP do App (Injetado)

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  connect-src 'none';
  frame-ancestors https://bazari.io https://*.bazari.io;
```

---

## Comunicação via postMessage

### Estrutura da Mensagem (App -> Host)

```typescript
interface SDKMessage {
  id: string;           // UUID para correlação
  type: MessageType;    // Tipo da operação
  payload: unknown;     // Dados
  timestamp: number;    // Unix timestamp
  sdkVersion: string;   // Versão do SDK
}
```

### Estrutura da Resposta (Host -> App)

```typescript
interface HostResponse {
  id: string;           // ID da mensagem original
  success: boolean;     // Se operação foi bem sucedida
  data?: unknown;       // Dados (se sucesso)
  error?: {
    code: string;
    message: string;
  };
  timestamp: number;
}
```

### Validação no Host

```typescript
// 1. Verificar origem
if (event.source !== iframeRef.current.contentWindow) {
  return; // Ignorar mensagens de outras origens
}

// 2. Validar estrutura
if (!isValidSDKMessage(event.data)) {
  return; // Mensagem inválida
}

// 3. Verificar permissão
const hasPermission = await checkPermission(appId, message.type);
if (!hasPermission) {
  return sendError(message.id, 'PERMISSION_DENIED');
}

// 4. Rate limiting
if (isRateLimited(appId, message.type)) {
  return sendError(message.id, 'RATE_LIMITED');
}

// 5. Executar handler
const result = await handlers[message.type](appId, message.payload);
sendResponse(message.id, result);
```

---

## Isolamento de Dados

### Storage Isolation

Cada app tem namespace isolado no storage:

```typescript
// App "com.example.app" chamando storage.set('key', 'value')
// Internamente armazena como:
localStorage.setItem('bazari:app:com.example.app:key', JSON.stringify('value'));
```

### Quota de Storage

| Recurso | Limite |
|---------|--------|
| localStorage por app | 10 MB |
| Número de chaves | 1000 |
| Tamanho por valor | 1 MB |

---

## Rate Limiting

### Limites por Operação

| Operação | Limite | Janela |
|----------|--------|--------|
| `wallet.transfer.request` | 5 | 1 minuto |
| `feed.write` | 10 | 1 minuto |
| `messages.write` | 30 | 1 minuto |
| `notifications.send` | 10 | 1 hora |
| Todas as operações | 100 | 1 minuto |

### Implementação

```typescript
const rateLimiter = new Map<string, number[]>();

function isRateLimited(appId: string, operation: string): boolean {
  const key = `${appId}:${operation}`;
  const now = Date.now();
  const windowMs = RATE_LIMITS[operation]?.windowMs || 60000;
  const maxRequests = RATE_LIMITS[operation]?.max || 100;

  const timestamps = rateLimiter.get(key) || [];
  const recentTimestamps = timestamps.filter(t => now - t < windowMs);

  if (recentTimestamps.length >= maxRequests) {
    return true;
  }

  recentTimestamps.push(now);
  rateLimiter.set(key, recentTimestamps);
  return false;
}
```

---

## Validação de Origem

### Origens Permitidas para Apps

```typescript
const ALLOWED_ORIGINS = [
  'https://app-cdn.bazari.io',    // CDN oficial
  'https://ipfs.bazari.io',       // Gateway IPFS
  /^https:\/\/[a-z0-9-]+\.ipfs\.bazari\.io$/, // Subdomínios IPFS
];

function isAllowedOrigin(origin: string): boolean {
  return ALLOWED_ORIGINS.some(allowed =>
    typeof allowed === 'string'
      ? allowed === origin
      : allowed.test(origin)
  );
}
```

### Verificação de Bundle

```typescript
interface AppBundle {
  url: string;
  hash: string;      // SHA-256 do bundle
  signature: string; // Assinatura do desenvolvedor
}

async function verifyBundle(bundle: AppBundle): Promise<boolean> {
  // 1. Baixar bundle
  const content = await fetch(bundle.url).then(r => r.arrayBuffer());

  // 2. Calcular hash
  const hash = await crypto.subtle.digest('SHA-256', content);
  const hashHex = Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  // 3. Verificar hash
  if (hashHex !== bundle.hash) {
    throw new Error('Bundle hash mismatch');
  }

  // 4. Verificar assinatura (opcional, para apps verificados)
  // ...

  return true;
}
```

---

## Proteções Adicionais

### XSS Prevention

- Todas as mensagens são serializadas como JSON
- Nenhum HTML é interpretado do app
- Outputs são sanitizados antes de exibir

### Clickjacking Prevention

- Host usa `X-Frame-Options: SAMEORIGIN`
- Apps só podem rodar dentro do Bazari

### CSRF Prevention

- Todas as operações sensíveis requerem confirmação
- Tokens de sessão não são expostos ao app

### Prototype Pollution

- Payloads JSON são parsed com `JSON.parse()`
- Não usa `Object.assign()` direto em objetos do host

---

## Logging e Auditoria

### Eventos Logados

```typescript
interface SecurityLog {
  timestamp: Date;
  appId: string;
  userId: string;
  action: string;
  result: 'allowed' | 'denied' | 'error';
  metadata: {
    messageType?: string;
    permissionRequired?: string;
    errorCode?: string;
    ipAddress?: string;
  };
}
```

### Alertas

| Evento | Ação |
|--------|------|
| Rate limit excedido 3x | Alerta para review |
| Tentativa de acesso negado 10x | Bloquear temporariamente |
| Erro de hash de bundle | Bloquear app, alertar dev |
| Padrão de abuso detectado | Review manual |

---

## Recuperação de Falhas

### App Crash

```typescript
// Error boundary no container
<AppErrorBoundary onError={handleAppError}>
  <AppIframe appId={appId} src={bundleUrl} />
</AppErrorBoundary>

function handleAppError(error: Error, appId: string) {
  // Log do erro
  logSecurityEvent({
    appId,
    action: 'app_crash',
    result: 'error',
    metadata: { error: error.message }
  });

  // Mostrar UI de erro
  showAppErrorUI(appId, 'O app encontrou um erro. Tente recarregar.');
}
```

### Timeout

```typescript
// Timeout de 10s para respostas
const RESPONSE_TIMEOUT = 10000;

async function sendMessage(message: SDKMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('Timeout waiting for response'));
    }, RESPONSE_TIMEOUT);

    pendingCallbacks.set(message.id, {
      resolve: (value) => {
        clearTimeout(timeoutId);
        resolve(value);
      },
      reject
    });

    iframe.postMessage(message, '*');
  });
}
```

---

## Checklist de Segurança

### Para Review de App

- [ ] Sem scripts externos (CDNs, analytics)
- [ ] Sem iframes aninhados
- [ ] Sem tentativas de escapar sandbox
- [ ] Usa apenas APIs do SDK
- [ ] Permissões justificadas
- [ ] Sem armazenamento de dados sensíveis
- [ ] Privacy policy adequada

### Para Host

- [ ] CSP configurada corretamente
- [ ] Validação de origem em todas as mensagens
- [ ] Rate limiting ativo
- [ ] Verificação de permissões
- [ ] Logging de segurança
- [ ] Error boundaries
- [ ] Timeouts configurados

---

**Documento:** SANDBOX-SPEC.md
**Versão:** 1.0.0
