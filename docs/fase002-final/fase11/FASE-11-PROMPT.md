# FASE 11 - Integration Tests - Prompts de Execução

**Versão**: 1.0.0
**Data**: 31 de Outubro de 2025

---

## 📋 Índice de Prompts

- [PROMPT 1: E2E Tests Expansion](#prompt-1-e2e-tests-expansion)
- [PROMPT 2: Load Tests Implementation](#prompt-2-load-tests-implementation)
- [PROMPT 3: Security Tests](#prompt-3-security-tests)

---

## 🎭 PROMPT 1: E2E Tests Expansion

**Duração Estimada**: 2-3 dias
**Complexidade**: Média
**Dependências**: Playwright já instalado

### Objetivos

Expandir a cobertura de testes E2E de 5 testes (Governance) para 20-30 testes, cobrindo as principais features do Bazari.

### Escopo

1. **Auth Flow** (4 testes)
   - Create account flow
   - Import account with seed phrase
   - Unlock wallet with PIN
   - Device link

2. **Vesting UI** (4 testes)
   - Stats overview display
   - Category navigation (tabs)
   - Schedule details per category
   - Timeline visualization

3. **Marketplace/Search** (5 testes)
   - Search products and services
   - Apply filters and sorting
   - Navigate to PDP
   - Add to cart
   - Checkout flow

4. **P2P ZARI** (4 testes)
   - Create sell offer
   - Accept offer
   - Negotiation chat
   - Complete transaction

5. **Delivery** (4 testes)
   - Request delivery
   - Accept request (courier)
   - Real-time tracking
   - Complete delivery

6. **Orders/Chat** (4 testes)
   - Create order
   - Chat with seller
   - Process payment
   - Confirm receipt

### Estrutura de Arquivos

Criar os seguintes arquivos em `/root/bazari/apps/web/tests/`:

```
tests/
├── auth/
│   ├── create-account.spec.ts
│   ├── import-account.spec.ts
│   ├── unlock-wallet.spec.ts
│   └── device-link.spec.ts
├── vesting/
│   ├── stats-overview.spec.ts
│   ├── category-navigation.spec.ts
│   ├── schedule-details.spec.ts
│   └── timeline-visualization.spec.ts
├── marketplace/
│   ├── search-products.spec.ts
│   ├── filters-sorting.spec.ts
│   ├── pdp-navigation.spec.ts
│   ├── add-to-cart.spec.ts
│   └── checkout-flow.spec.ts
├── p2p/
│   ├── create-offer.spec.ts
│   ├── accept-offer.spec.ts
│   ├── negotiation-chat.spec.ts
│   └── complete-transaction.spec.ts
├── delivery/
│   ├── request-delivery.spec.ts
│   ├── accept-request.spec.ts
│   ├── tracking.spec.ts
│   └── complete-delivery.spec.ts
├── orders/
│   ├── create-order.spec.ts
│   ├── seller-chat.spec.ts
│   ├── payment-process.spec.ts
│   └── confirm-receipt.spec.ts
└── helpers/
    ├── auth-helpers.ts
    ├── wallet-helpers.ts
    └── test-data.ts
```

### Tarefas

#### Tarefa 1.1: Setup Helpers (30 min)

Criar helpers de autenticação e wallet em `/root/bazari/apps/web/tests/helpers/`:

**auth-helpers.ts**:
```typescript
import { Page } from '@playwright/test';

export async function createTestAccount(page: Page, name?: string, handle?: string) {
  const timestamp = Date.now();
  await page.goto('/auth/create');
  await page.fill('input[name="name"]', name || `Test User ${timestamp}`);
  await page.fill('input[name="handle"]', handle || `testuser${timestamp}`);
  await page.fill('input[name="pin"]', '123456');
  await page.fill('input[name="pinConfirm"]', '123456');
  await page.click('button[type="submit"]');
  await page.waitForURL('/app', { timeout: 10000 });
}

export async function unlockWallet(page: Page, pin: string = '123456') {
  await page.goto('/auth/unlock');
  await page.fill('input[name="pin"]', pin);
  await page.click('button[type="submit"]');
  await page.waitForURL('/app', { timeout: 10000 });
}

export async function importAccount(page: Page, seedPhrase: string, pin: string = '123456') {
  await page.goto('/auth/import');
  await page.fill('textarea[name="seed"]', seedPhrase);
  await page.fill('input[name="pin"]', pin);
  await page.fill('input[name="pinConfirm"]', pin);
  await page.click('button[type="submit"]');
  await page.waitForURL('/app', { timeout: 10000 });
}
```

**wallet-helpers.ts**:
```typescript
import { Page } from '@playwright/test';

export async function getBalance(page: Page): Promise<string> {
  await page.goto('/app/wallet');
  await page.waitForSelector('[data-testid="balance"]');
  const balance = await page.locator('[data-testid="balance"]').textContent();
  return balance || '0';
}

export async function sendTokens(page: Page, recipient: string, amount: string) {
  await page.goto('/app/wallet');
  await page.click('button:has-text("Send")');
  await page.fill('input[name="recipient"]', recipient);
  await page.fill('input[name="amount"]', amount);
  await page.click('button[type="submit"]');
  await page.waitForSelector('text=Transaction successful', { timeout: 30000 });
}
```

**test-data.ts**:
```typescript
export const TEST_SEED_PHRASES = {
  alice: 'bottom drive obey lake curtain smoke basket hold race lonely fit walk',
  bob: 'proof bargain smoke entry palace solid danger govern below barrel brick desk',
};

export const TEST_ACCOUNTS = {
  alice: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
  bob: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
};

export const TEST_PRODUCTS = {
  laptop: {
    title: 'Laptop Dell Inspiron',
    price: '1000',
    category: 'tecnologia-eletronicos',
  },
  service: {
    title: 'Consultoria Web3',
    price: '500',
    category: 'servicos-tecnologia',
  },
};
```

#### Tarefa 1.2: Auth Tests (1 dia)

Implementar os 4 testes de autenticação.

**Exemplo: tests/auth/create-account.spec.ts**
```typescript
import { test, expect } from '@playwright/test';

test.describe('Auth - Create Account', () => {
  test('should create new account successfully', async ({ page }) => {
    const timestamp = Date.now();
    const name = `Test User ${timestamp}`;
    const handle = `testuser${timestamp}`;

    await page.goto('/auth/create');

    // Fill form
    await page.fill('input[name="name"]', name);
    await page.fill('input[name="handle"]', handle);
    await page.fill('input[name="pin"]', '123456');
    await page.fill('input[name="pinConfirm"]', '123456');

    // Submit
    await page.click('button[type="submit"]');

    // Wait for redirect to app
    await page.waitForURL('/app', { timeout: 10000 });

    // Verify we're logged in
    await expect(page.getByText(name)).toBeVisible();
  });

  test('should show error for mismatched PINs', async ({ page }) => {
    await page.goto('/auth/create');

    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="handle"]', 'testuser');
    await page.fill('input[name="pin"]', '123456');
    await page.fill('input[name="pinConfirm"]', '654321');

    await page.click('button[type="submit"]');

    await expect(page.getByText(/PINs não coincidem/i)).toBeVisible();
  });

  test('should show error for duplicate handle', async ({ page }) => {
    // Create first account
    const handle = `duplicate${Date.now()}`;
    await page.goto('/auth/create');
    await page.fill('input[name="name"]', 'User 1');
    await page.fill('input[name="handle"]', handle);
    await page.fill('input[name="pin"]', '123456');
    await page.fill('input[name="pinConfirm"]', '123456');
    await page.click('button[type="submit"]');
    await page.waitForURL('/app');

    // Logout
    await page.click('button[aria-label="User menu"]');
    await page.click('text=Logout');

    // Try to create account with same handle
    await page.goto('/auth/create');
    await page.fill('input[name="name"]', 'User 2');
    await page.fill('input[name="handle"]', handle);
    await page.fill('input[name="pin"]', '123456');
    await page.fill('input[name="pinConfirm"]', '123456');
    await page.click('button[type="submit"]');

    await expect(page.getByText(/handle já existe/i)).toBeVisible();
  });
});
```

Criar testes similares para:
- `import-account.spec.ts`
- `unlock-wallet.spec.ts`
- `device-link.spec.ts`

#### Tarefa 1.3: Vesting Tests (meio dia)

Implementar os 4 testes de vesting UI.

**Exemplo: tests/vesting/stats-overview.spec.ts**
```typescript
import { test, expect } from '@playwright/test';

test.describe('Vesting - Stats Overview', () => {
  test('should display vesting stats cards', async ({ page }) => {
    await page.goto('/vesting');

    // Check page title
    await expect(page.getByRole('heading', { name: 'Token Vesting' })).toBeVisible();

    // Check 4 stats cards
    await expect(page.getByText('Total Alocado')).toBeVisible();
    await expect(page.getByText('Total Liberado')).toBeVisible();
    await expect(page.getByText('Ainda Locked')).toBeVisible();
    await expect(page.getByText('Progresso')).toBeVisible();

    // Check progress bar
    await expect(page.locator('.bg-green-600')).toBeVisible();
  });

  test('should display all category tabs', async ({ page }) => {
    await page.goto('/vesting');

    const categories = ['Fundadores', 'Equipe', 'Parceiros', 'Marketing'];

    for (const category of categories) {
      await expect(page.getByRole('tab', { name: new RegExp(category) })).toBeVisible();
    }
  });

  test('should show info card at bottom', async ({ page }) => {
    await page.goto('/vesting');

    await expect(page.getByText('Como Funciona o Vesting')).toBeVisible();
    await expect(page.getByText(/liberação gradual/i)).toBeVisible();
    await expect(page.getByText(/Block time: 6 segundos/i)).toBeVisible();
  });
});
```

Criar testes para:
- `category-navigation.spec.ts`
- `schedule-details.spec.ts`
- `timeline-visualization.spec.ts`

#### Tarefa 1.4: Marketplace Tests (1 dia)

Implementar os 5 testes de marketplace/search.

#### Tarefa 1.5: P2P, Delivery, Orders Tests (1 dia)

Implementar os 12 testes restantes.

#### Tarefa 1.6: CI/CD Integration (meio dia)

Configurar GitHub Actions para executar testes automaticamente.

### Critérios de Sucesso

- [ ] 20-30 testes E2E implementados e passando
- [ ] Cobertura de 80%+ das features principais
- [ ] Pass rate de 95%+ em execução local
- [ ] CI/CD configurado e executando testes
- [ ] Relatórios HTML gerados
- [ ] Documentação completa em FASE-11-PROMPT-01-COMPLETE.md

### Comandos de Execução

```bash
# Executar todos os testes
cd /root/bazari/apps/web
pnpm exec playwright test

# Executar categoria específica
pnpm exec playwright test tests/vesting/

# Com UI mode (debug)
pnpm exec playwright test --ui

# Gerar relatório
pnpm exec playwright show-report
```

---

## ⚡ PROMPT 2: Load Tests Implementation

**Duração Estimada**: 1-2 dias
**Complexidade**: Média-Alta
**Dependências**: k6 (instalar)

### Objetivos

Implementar testes de carga para avaliar performance do sistema sob diferentes níveis de carga e identificar gargalos.

### Escopo

1. **API REST** - 10 endpoints principais
2. **WebSocket** - Chat connections
3. **Blockchain RPC** - Query performance
4. **Database** - Connection pool limits

### Tarefas

#### Tarefa 2.1: Instalar k6 (15 min)

```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Verificar instalação
k6 version
```

#### Tarefa 2.2: Criar estrutura (15 min)

```bash
mkdir -p /root/bazari/tests/load
mkdir -p /root/bazari/tests/load/scenarios
mkdir -p /root/bazari/tests/load/helpers
mkdir -p /root/bazari/test-results/load
```

#### Tarefa 2.3: API REST Load Test (2 horas)

Criar `/root/bazari/tests/load/api-rest.js`:

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '1m', target: 10 },
    { duration: '3m', target: 50 },
    { duration: '5m', target: 100 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 0 },
  ],

  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
    errors: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.API_URL || 'https://bazari.libervia.xyz';

export default function () {
  // Test 1: GET /products
  let res = http.get(`${BASE_URL}/products?limit=20`);
  check(res, {
    'products status 200': (r) => r.status === 200,
  }) || errorRate.add(1);
  sleep(1);

  // Test 2: GET /search
  res = http.get(`${BASE_URL}/search?q=laptop&limit=10`);
  check(res, {
    'search status 200': (r) => r.status === 200,
  }) || errorRate.add(1);
  sleep(1);

  // Test 3: GET /vesting/stats
  res = http.get(`${BASE_URL}/vesting/stats`);
  check(res, {
    'vesting status 200': (r) => r.status === 200,
  }) || errorRate.add(1);
  sleep(1);

  // Test 4: GET /governance/proposals
  res = http.get(`${BASE_URL}/governance/proposals?limit=10`);
  check(res, {
    'proposals status 200': (r) => r.status === 200,
  }) || errorRate.add(1);
  sleep(2);
}
```

#### Tarefa 2.4: WebSocket Load Test (1 hora)

Criar `/root/bazari/tests/load/websocket.js`

#### Tarefa 2.5: Blockchain Load Test (1 hora)

Criar `/root/bazari/tests/load/blockchain.js`

#### Tarefa 2.6: Database Load Test (1 hora)

Criar `/root/bazari/tests/load/database.js`

#### Tarefa 2.7: Executar Testes e Gerar Relatórios (2 horas)

```bash
# Executar todos os testes
cd /root/bazari
k6 run tests/load/api-rest.js
k6 run tests/load/websocket.js
k6 run tests/load/blockchain.js

# Com output JSON
k6 run --out json=test-results/load/api-rest.json tests/load/api-rest.js

# Analisar resultados
cat test-results/load/api-rest.json | jq '.metrics'
```

### Critérios de Sucesso

- [ ] k6 instalado e funcionando
- [ ] 4 scripts de load test criados
- [ ] Todos os testes executados com sucesso
- [ ] Response time p95 < 500ms
- [ ] Response time p99 < 1000ms
- [ ] Error rate < 1%
- [ ] Relatórios gerados (JSON)
- [ ] Baseline de performance estabelecido
- [ ] Recomendações de otimização documentadas

### Comandos de Execução

```bash
# API REST
k6 run tests/load/api-rest.js

# WebSocket
k6 run tests/load/websocket.js

# Blockchain
k6 run tests/load/blockchain.js

# Com variáveis de ambiente
API_URL=https://bazari.libervia.xyz k6 run tests/load/api-rest.js

# Smoke test (baixa carga)
k6 run --stage 1m:10 tests/load/api-rest.js
```

---

## 🔒 PROMPT 3: Security Tests

**Duração Estimada**: 1-2 dias
**Complexidade**: Média
**Dependências**: OWASP ZAP, npm audit

### Objetivos

Executar testes de segurança automatizados para identificar vulnerabilidades e garantir que o sistema está protegido contra ataques comuns.

### Escopo

1. **OWASP ZAP Scan** - Automated security scanning
2. **npm Audit** - Dependency vulnerability scan
3. **Security Checklist** - Manual OWASP Top 10 verification
4. **Rate Limiting Tests** - Verify DDoS protection
5. **Input Validation** - Test injection attacks

### Tarefas

#### Tarefa 3.1: Setup OWASP ZAP (30 min)

```bash
# Instalar via Docker
docker pull zaproxy/zap-stable

# Ou via apt (Ubuntu)
sudo add-apt-repository ppa:zaproxy/release
sudo apt-get update
sudo apt-get install zaproxy
```

#### Tarefa 3.2: Criar Script de ZAP Scan (1 hora)

Criar `/root/bazari/tests/security/zap-scan.sh`:

```bash
#!/bin/bash
TARGET_URL="https://bazari.libervia.xyz"
ZAP_PORT=8090

echo "Starting OWASP ZAP scan..."

# Start ZAP daemon
docker run -d --name zap \
  -u zap \
  -p ${ZAP_PORT}:${ZAP_PORT} \
  -v $(pwd)/test-results/security:/zap/wrk:rw \
  zaproxy/zap-stable \
  zap.sh -daemon -port ${ZAP_PORT} \
  -config api.disablekey=true

sleep 30

# Spider scan
echo "Running spider scan..."
docker exec zap \
  zap-cli --zap-url http://localhost:${ZAP_PORT} \
  spider ${TARGET_URL}

sleep 60

# Active scan
echo "Running active scan..."
docker exec zap \
  zap-cli --zap-url http://localhost:${ZAP_PORT} \
  active-scan ${TARGET_URL}

sleep 300

# Generate reports
echo "Generating reports..."
docker exec zap \
  zap-cli --zap-url http://localhost:${ZAP_PORT} \
  report -o /zap/wrk/zap-report.html -f html

docker exec zap \
  zap-cli --zap-url http://localhost:${ZAP_PORT} \
  report -o /zap/wrk/zap-report.json -f json

# Cleanup
docker stop zap
docker rm zap

echo "ZAP scan complete! Reports in test-results/security/"
```

#### Tarefa 3.3: npm Audit (30 min)

Criar `/root/bazari/tests/security/npm-audit.sh`:

```bash
#!/bin/bash
mkdir -p test-results/security

echo "Running npm audit..."

# API
cd /root/bazari/apps/api
pnpm audit --json > ../../test-results/security/audit-api.json
pnpm audit

# Web
cd /root/bazari/apps/web
pnpm audit --json > ../../test-results/security/audit-web.json
pnpm audit

# Root
cd /root/bazari
pnpm audit --json > test-results/security/audit-root.json
pnpm audit

echo "Audit complete!"
```

#### Tarefa 3.4: Security Checklist (3 horas)

Verificar manualmente cada item do checklist OWASP Top 10 e documentar em:
`/root/bazari/tests/security/security-checklist.md`

#### Tarefa 3.5: Rate Limiting Tests (1 hora)

Criar script para testar rate limiting:

```bash
#!/bin/bash
# tests/security/rate-limit-test.sh

API_URL="https://bazari.libervia.xyz"

echo "Testing rate limiting..."

# Test 1: API endpoint (should allow 100 req/min)
for i in {1..120}; do
  curl -s -o /dev/null -w "%{http_code}\n" ${API_URL}/products
done | grep -c "429"

# Test 2: Auth endpoint (should allow 5 req/min)
for i in {1..10}; do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST ${API_URL}/auth/login
done | grep -c "429"

echo "Rate limiting test complete!"
```

#### Tarefa 3.6: Aplicar Fixes de Segurança (4 horas)

Corrigir vulnerabilidades encontradas:
- Atualizar dependências com vulnerabilidades
- Adicionar headers de segurança faltantes
- Melhorar validação de input
- Adicionar rate limiting onde necessário

### Critérios de Sucesso

- [ ] OWASP ZAP scan completo executado
- [ ] npm audit sem vulnerabilidades críticas
- [ ] Security checklist 100% verificado
- [ ] Rate limiting funcionando corretamente
- [ ] Input validation testada
- [ ] Relatórios gerados (HTML + JSON)
- [ ] Vulnerabilidades críticas: 0
- [ ] Vulnerabilidades altas: 0
- [ ] Vulnerabilidades médias: < 5
- [ ] Fixes aplicados e documentados

### Comandos de Execução

```bash
# ZAP Scan
cd /root/bazari
chmod +x tests/security/zap-scan.sh
./tests/security/zap-scan.sh

# npm Audit
chmod +x tests/security/npm-audit.sh
./tests/security/npm-audit.sh

# Rate Limiting Test
chmod +x tests/security/rate-limit-test.sh
./tests/security/rate-limit-test.sh

# Ver relatórios
open test-results/security/zap-report.html
cat test-results/security/audit-api.json | jq
```

---

## ✅ Checklist Geral da FASE 11

Ao completar todos os prompts, verificar:

### PROMPT 1 - E2E Tests
- [ ] 20-30 testes implementados
- [ ] Todos os testes passando (95%+ pass rate)
- [ ] Helpers criados e documentados
- [ ] CI/CD configurado
- [ ] Relatórios gerados

### PROMPT 2 - Load Tests
- [ ] k6 instalado
- [ ] 4 scripts de load test criados
- [ ] Todos os testes executados
- [ ] Métricas dentro dos thresholds
- [ ] Baseline estabelecido
- [ ] Relatórios gerados

### PROMPT 3 - Security Tests
- [ ] ZAP scan executado
- [ ] npm audit executado
- [ ] Security checklist completo
- [ ] Vulnerabilidades críticas: 0
- [ ] Fixes aplicados
- [ ] Relatórios gerados

### Documentação
- [ ] FASE-11-PROMPT-01-COMPLETE.md
- [ ] FASE-11-PROMPT-02-COMPLETE.md
- [ ] FASE-11-PROMPT-03-COMPLETE.md
- [ ] FASE-11-SUMMARY.md
- [ ] FASE-11-USER-GUIDE.md

---

## 📞 Suporte

Para dúvidas ou problemas durante a execução dos prompts:

1. Consultar `FASE-11-TECHNICAL-SPEC.md` para detalhes técnicos
2. Consultar `FASE-11-USER-GUIDE.md` para guia de execução
3. Verificar seção de Troubleshooting na documentação
4. Revisar logs de execução dos testes

---

*Documento criado em: 31 de Outubro de 2025*
*Versão: 1.0.0*
