# Arquitetura de Rotas - Bazari

Este documento especifica o padrão de rotas na arquitetura Bazari, que usa uma combinação de:
- **Backend API** (Fastify na porta 3000)
- **Frontend SPA** (React com React Router)
- **Nginx** como reverse proxy

## Visão Geral

```
┌─────────────────────────────────────────────────────────────────┐
│                         NGINX (porta 443)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  /api/*                    ──────────►  Backend API (:3000)     │
│  /auth/nonce, /auth/login  ──────────►  Backend API (:3000)     │
│  /governance/treasury      ──────────►  Backend API (:3000)     │
│  /vesting/accounts         ──────────►  Backend API (:3000)     │
│  /chat/ws                  ──────────►  WebSocket (:3000)       │
│  /rpc                      ──────────►  Blockchain (:9944)      │
│  /ipfs/*                   ──────────►  IPFS Gateway (:8081)    │
│  /doc/*                    ──────────►  Static HTML             │
│  /*                        ──────────►  SPA (React)             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Padrão de Registro de Rotas no Backend

Todas as rotas da API são registradas **duas vezes** no `server.ts`:

```typescript
// Sem prefixo (raiz) - para compatibilidade
await app.register(authRoutes, { prefix: '/', prisma });

// Com prefixo /api - padrão principal
await app.register(authRoutes, { prefix: '/api', prisma });
```

Isso significa que cada rota está disponível em dois caminhos:
- `/auth/nonce` → API
- `/api/auth/nonce` → API (mesma rota)

## Padrão de Configuração no Nginx

### Regra 1: Rotas com prefixo `/api` sempre vão para o backend

```nginx
location /api {
    proxy_pass http://127.0.0.1:3000;
    # ...
}
```

### Regra 2: Módulos com rotas mistas (SPA + API) usam regex específico

Quando um módulo tem tanto páginas React quanto endpoints de API no mesmo prefixo, **DEVE** usar um location específico que lista apenas as sub-rotas de API.

**Padrão CORRETO (usado em governance, vesting, auth):**

```nginx
# Auth API routes (específicas, /auth sem subpath é SPA - WelcomePage)
location ~ ^/auth/(nonce|login-siws|refresh|logout|device-link|google|social|social-backup|issue-vr-token) {
    proxy_pass http://127.0.0.1:3000;
}

# Governance API routes (específicas, /app/governance é SPA)
location ~ ^/governance/(treasury|democracy|council|tech-committee|stats|multisig|events) {
    proxy_pass http://127.0.0.1:3000;
}

# Vesting API routes (específicas, /vesting é SPA)
location ~ ^/vesting/(accounts|stats|schedule/|0x) {
    proxy_pass http://127.0.0.1:3000;
}
```

**Padrão INCORRETO (evitar):**

```nginx
# NÃO FAZER: Isso envia TODAS as rotas /auth para API, incluindo páginas React
location ~ ^/(auth|me|media|...) {
    proxy_pass http://127.0.0.1:3000;
}
```

### Regra 3: Rotas puramente de API podem usar regex genérico

Módulos que **não têm páginas React** no mesmo prefixo podem usar o regex genérico:

```nginx
# Rotas que são 100% API (sem páginas React)
location ~ ^/(me|media|profiles|products|services|search|orders|...) {
    proxy_pass http://127.0.0.1:3000;
}
```

### Regra 4: Fallback para SPA

Qualquer rota não capturada pelos locations anteriores vai para o SPA:

```nginx
location / {
    root /root/bazari/apps/web/dist;
    try_files $uri $uri/ /index.html;
}
```

## Exemplo Completo: Módulo Auth

### Rotas no Backend (API)

```typescript
// apps/api/src/routes/auth.ts
app.get('/auth/nonce', ...)           // GET  /auth/nonce
app.post('/auth/login-siws', ...)     // POST /auth/login-siws
app.post('/auth/refresh', ...)        // POST /auth/refresh
app.post('/auth/logout', ...)         // POST /auth/logout
app.post('/auth/device-link', ...)    // POST /auth/device-link
```

### Rotas no Frontend (SPA)

```tsx
// apps/web/src/App.tsx
<Route path="/auth" element={<WelcomePage />} />
<Route path="/auth/welcome" element={<WelcomePage />} />
<Route path="/auth/create" element={<CreateAccount />} />
<Route path="/auth/import" element={<ImportAccount />} />
<Route path="/auth/unlock" element={<Unlock />} />
<Route path="/auth/recover-pin" element={<RecoverPin />} />
<Route path="/auth/device-link" element={<DeviceLink />} />
```

### Configuração no Nginx

```nginx
# Auth API routes (específicas)
location ~ ^/auth/(nonce|login-siws|refresh|logout|device-link|google|social|social-backup|issue-vr-token) {
    proxy_pass http://127.0.0.1:3000;
    # ...
}

# Todas as outras rotas /auth/* vão para SPA via fallback
location / {
    root /root/bazari/apps/web/dist;
    try_files $uri $uri/ /index.html;
}
```

### Resultado

| Rota | Destino | Tipo |
|------|---------|------|
| `/auth` | SPA (WelcomePage) | Página React |
| `/auth/create` | SPA (CreateAccount) | Página React |
| `/auth/unlock` | SPA (Unlock) | Página React |
| `/auth/nonce` | API | Endpoint GET |
| `/auth/login-siws` | API | Endpoint POST |
| `/auth/device-link` | API (POST) ou SPA (GET) | Misto |

## Checklist para Adicionar Novo Módulo

1. **Definir se o módulo tem rotas mistas (SPA + API)**

2. **Se SIM (rotas mistas):**
   - Criar location específico no nginx listando APENAS sub-rotas de API
   - Páginas React caem no fallback SPA automaticamente

3. **Se NÃO (apenas API):**
   - Adicionar prefixo ao regex genérico existente

4. **Registrar rotas no backend:**
   ```typescript
   await app.register(novoModuloRoutes, { prefix: '/', prisma });
   await app.register(novoModuloRoutes, { prefix: '/api', prisma });
   ```

5. **Testar:**
   ```bash
   # Página React deve retornar HTML
   curl -I "https://bazari.libervia.xyz/novo-modulo"
   # content-type: text/html

   # Endpoint API deve retornar JSON
   curl "https://bazari.libervia.xyz/novo-modulo/endpoint"
   # {"data": ...}
   ```

## Arquivos de Referência

- **Nginx config:** `/etc/nginx/sites-enabled/bazari.conf`
- **Backend routes:** `apps/api/src/server.ts`
- **Frontend routes:** `apps/web/src/App.tsx`

## Histórico

| Data | Alteração |
|------|-----------|
| 2025-12-15 | Corrigido padrão de rotas `/auth` - separado em location específico |
| 2025-12-15 | Documentação inicial criada |
