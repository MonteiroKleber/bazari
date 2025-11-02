# Auth Module - Use Cases

## 👤 Actors

- **User** - Usuário final da plataforma
- **System** - Backend API
- **Wallet** - Wallet não-custodial (Polkadot.js)

---

## 📋 Use Cases

### UC-01: Create Account & First Login

**Actor:** User
**Goal:** Criar conta e fazer primeiro login na plataforma
**Preconditions:** User possui uma wallet Substrate ou deseja criar uma nova

**Main Flow:**
1. User acessa `/auth/create`
2. System gera novo mnemonic (12 palavras)
3. User confirma que salvou mnemonic
4. System cria keyring e armazena seed criptografada (PIN-protected)
5. System extrai address da primeira account
6. System solicita nonce (`POST /api/auth/nonce`)
7. System assina mensagem SIWS com keyring
8. System verifica assinatura (`POST /api/auth/verify`)
9. System cria User no DB (se não existir)
10. System cria Profile (handle, displayName)
11. System retorna JWT tokens
12. User é redirecionado para `/app`

**Alternative Flow 1a:** User já possui mnemonic
- 1a.1. User escolhe "Import Account"
- 1a.2. User insere mnemonic (12/24 palavras)
- 1a.3. System valida mnemonic
- 1a.4. Continua no passo 4

**Alternative Flow 4a:** PIN fraco
- 4a.1. System valida força do PIN
- 4a.2. Se fraco, exibe aviso e sugere PIN mais forte
- 4a.3. User redefine PIN

---

### UC-02: Login (Unlock Wallet)

**Actor:** User
**Goal:** Fazer login com wallet existente
**Preconditions:** User já criou conta anteriormente e possui seed armazenada

**Main Flow:**
1. User acessa `/auth/unlock`
2. System verifica se existe seed criptografada (IndexedDB)
3. User insere PIN
4. System descriptografa seed com PIN
5. System carrega keyring
6. System extrai address
7. System solicita nonce
8. System assina mensagem SIWS
9. System verifica assinatura
10. System retorna JWT tokens
11. User é redirecionado para `/app`

**Alternative Flow 3a:** PIN incorreto
- 3a.1. System incrementa contador de tentativas
- 3a.2. Se >3 tentativas, bloqueia por 5 minutos
- 3a.3. System exibe erro "PIN incorreto"

**Alternative Flow 8a:** Nonce expirado
- 8a.1. System solicita novo nonce
- 8a.2. System assina nova mensagem
- 8a.3. Continua no passo 9

---

### UC-03: Access Protected Resource

**Actor:** User
**Goal:** Acessar recurso protegido (ex: listar pedidos)
**Preconditions:** User está autenticado e possui JWT válido

**Main Flow:**
1. User faz request para endpoint protegido (`GET /api/orders`)
2. Client inclui JWT no header `Authorization: Bearer <token>`
3. Middleware `requireAuth` intercepta request
4. Middleware extrai token do header
5. Middleware verifica assinatura JWT
6. Middleware verifica expiração
7. Middleware decodifica payload
8. Middleware injeta `req.user = { id, address }`
9. Handler processa request usando `req.user.id`
10. System retorna response

**Alternative Flow 5a:** Token inválido
- 5a.1. Middleware retorna 401 Unauthorized
- 5a.2. Client tenta refresh token (UC-04)

**Alternative Flow 6a:** Token expirado
- 6a.1. Middleware retorna 401 Unauthorized
- 6a.2. Client tenta refresh token (UC-04)

---

### UC-04: Refresh Access Token

**Actor:** System (Auto)
**Goal:** Renovar access token expirado usando refresh token
**Preconditions:** User possui refresh token válido em cookie

**Main Flow:**
1. Client detecta token expirado (401)
2. Client faz request `POST /api/auth/refresh`
3. Client inclui cookie com refresh token
4. System extrai refresh token do cookie
5. System calcula hash do token
6. System busca token no DB
7. System verifica se não foi revogado
8. System verifica expiração
9. System gera novo access token (JWT)
10. System gera novo refresh token (rotation)
11. System revoga refresh token antigo
12. System retorna novo access token
13. Client retenta request original com novo token

**Alternative Flow 7a:** Token revogado
- 7a.1. System retorna 401 Unauthorized
- 7a.2. Client redireciona para `/auth/unlock`

**Alternative Flow 8a:** Refresh token expirado
- 8a.1. System retorna 401 Unauthorized
- 8a.2. Client redireciona para `/auth/unlock`

---

### UC-05: Logout

**Actor:** User
**Goal:** Fazer logout e invalidar sessão
**Preconditions:** User está autenticado

**Main Flow:**
1. User clica em "Logout"
2. Client faz request `POST /api/auth/logout`
3. Client inclui cookie com refresh token
4. System extrai refresh token
5. System marca token como revogado no DB
6. System limpa cookie de refresh token
7. Client limpa access token da memória
8. Client redireciona para `/`

**Alternative Flow:** Logout de todos os dispositivos
- 1a.1. User seleciona "Logout everywhere"
- 5a.1. System revoga todos refresh tokens do userId
- 5a.2. Continua no passo 6

---

### UC-06: Recover Account (Lost PIN)

**Actor:** User
**Goal:** Recuperar acesso à conta após perder PIN
**Preconditions:** User possui mnemonic salvo

**Main Flow:**
1. User acessa `/auth/recover-pin`
2. User insere mnemonic (12/24 palavras)
3. System valida mnemonic
4. System deriva seed do mnemonic
5. System extrai address
6. System verifica se User existe no DB
7. User define novo PIN
8. System re-encripta seed com novo PIN
9. System armazena seed criptografada
10. System autentica User (UC-02)

**Alternative Flow 3a:** Mnemonic inválido
- 3a.1. System exibe erro "Mnemonic inválido"
- 3a.2. Retorna ao passo 2

**Alternative Flow 6a:** Address não encontrado
- 6a.1. System exibe aviso "Conta não encontrada com este mnemonic"
- 6a.2. System oferece criar nova conta
- 6a.3. Se User aceita, continua UC-01 passo 4

---

### UC-07: Link Additional Device

**Actor:** User
**Goal:** Fazer login em novo dispositivo usando QR code
**Preconditions:** User está autenticado em dispositivo A e quer acessar em dispositivo B

**Main Flow:**
1. User acessa `/auth/device-link` em dispositivo B
2. System gera token de link temporário (5 min)
3. System exibe QR code com token
4. User escaneia QR code com dispositivo A (autenticado)
5. Dispositivo A abre link `/auth/device-link/approve?token=...`
6. System verifica se User está autenticado em dispositivo A
7. System valida token
8. User confirma "Autorizar este dispositivo"
9. System marca token como usado
10. System gera JWT para dispositivo B
11. Dispositivo B recebe tokens via WebSocket/polling
12. Dispositivo B redireciona para `/app`

**Alternative Flow 7a:** Token expirado
- 7a.1. System exibe erro "QR code expirado"
- 7a.2. System oferece gerar novo QR code

---

### UC-08: Handle Multiple Accounts

**Actor:** User
**Goal:** Alternar entre múltiplas accounts na mesma wallet
**Preconditions:** User possui múltiplas accounts derivadas do mesmo seed

**Main Flow:**
1. User acessa `/app/wallet/accounts`
2. System lista todas accounts derivadas (0, 1, 2, ...)
3. User seleciona account diferente
4. System extrai address da account selecionada
5. System solicita novo nonce para novo address
6. System assina mensagem com account selecionada
7. System verifica assinatura
8. System gera novo JWT (com novo address)
9. System atualiza sessão
10. User continua navegando com nova account

**Alternative Flow 4a:** Account não possui User no DB
- 4a.1. System oferece criar novo Profile
- 4a.2. Se User aceita, cria novo User + Profile
- 4a.3. Continua no passo 5

---

### UC-09: Detect Suspicious Activity

**Actor:** System
**Goal:** Detectar e prevenir atividade suspeita
**Preconditions:** User está tentando autenticar

**Main Flow:**
1. User faz tentativa de login (UC-02)
2. System verifica histórico de autenticação
3. System detecta padrão anômalo:
   - >5 tentativas falhadas em 10 minutos
   - Login de IP/país novo
   - User-agent inconsistente
4. System bloqueia temporariamente (15 min)
5. System envia notificação (se email cadastrado)
6. System exige confirmação adicional:
   - Resolver CAPTCHA
   - Confirmar via email
   - Esperar cooldown
7. User completa verificação adicional
8. System desbloqueia e permite login

**Alternative Flow 3a:** Padrão de bot/spam
- 3a.1. System ativa rate limiting agressivo
- 3a.2. System adiciona IP em blacklist temporária

---

## 🔐 Security Use Cases

### UC-S1: Prevent Replay Attack

**Attack:** Attacker intercepta assinatura SIWS válida e tenta reusar

**Defense:**
1. System gera nonce único por tentativa
2. Nonce é incluído na mensagem assinada
3. Após verificação bem-sucedida, nonce é marcado como usado
4. Tentativa de reusar nonce retorna erro "Nonce already used"

---

### UC-S2: Prevent CSRF Attack

**Attack:** Attacker induz User a fazer request malicioso

**Defense:**
1. Refresh tokens são armazenados em cookies `HttpOnly` e `SameSite=Strict`
2. Cookies não são acessíveis via JavaScript
3. Cookies só são enviados para mesma origem
4. Access tokens são stateless (não requerem cookies)

---

### UC-S3: Prevent Token Theft

**Attack:** Attacker rouba access token (XSS, interceptação)

**Defense:**
1. Access tokens são short-lived (15 min)
2. Tokens são armazenados apenas em memória (não localStorage)
3. Refresh tokens são `HttpOnly` (não acessíveis via JS)
4. HTTPS obrigatório em produção

---

## 📊 Non-Functional Requirements

### Performance
- **Auth Latency**: <200ms (p95)
- **Token Verification**: <10ms (p99)
- **Concurrent Logins**: 1000+ req/s

### Scalability
- **Stateless JWT**: Permite horizontal scaling sem session store
- **DB Queries**: Apenas nonce verification e user lookup
- **Cache**: Nonces podem ser cached (Redis)

### Availability
- **Uptime**: 99.9%
- **Degradation**: Auth continua funcionando se DB de nonces falhar (usa memory store temporário)

---

**Document Owner:** Auth Module Team
**Last Updated:** 2025-11-02
**Version:** 1.0.0
