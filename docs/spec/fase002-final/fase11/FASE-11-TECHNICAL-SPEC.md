# FASE 11 - Integration Tests - Especificação Técnica

**Versão**: 1.0.0
**Data**: 31 de Outubro de 2025
**Autor**: Claude (AI Assistant)

---

## 📑 Índice

1. [Arquitetura de Testes](#arquitetura-de-testes)
2. [E2E Tests (Playwright)](#e2e-tests-playwright)
3. [Load Tests (k6)](#load-tests-k6)
4. [Security Tests](#security-tests)
5. [CI/CD Pipeline](#cicd-pipeline)
6. [Configurações](#configurações)
7. [Troubleshooting](#troubleshooting)

---

## 🏗️ Arquitetura de Testes

### Visão Geral

```
┌─────────────────────────────────────────────────────────┐
│                   FASE 11 - Test Suite                  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   E2E Tests  │  │  Load Tests  │  │Security Tests│ │
│  │  (Playwright)│  │     (k6)     │  │  (OWASP ZAP) │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘ │
│         │                  │                  │          │
│         └──────────────────┴──────────────────┘          │
│                           │                              │
└───────────────────────────┼──────────────────────────────┘
                            │
              ┌─────────────▼─────────────┐
              │   Bazari Stack (Running)   │
              ├────────────────────────────┤
              │ • Frontend (React/Vite)    │
              │ • Backend API (Fastify)    │
              │ • Blockchain (Substrate)   │
              │ • Database (PostgreSQL)    │
              │ • IPFS Node                │
              └────────────────────────────┘
```

### Stack de Testes

| Componente | Tecnologia | Versão | Propósito |
|------------|------------|--------|-----------|
| E2E Tests | Playwright | 1.56.1 | Browser automation |
| Unit Tests | Vitest | Latest | Component testing |
| Load Tests | k6 | Latest | Performance testing |
| Security | OWASP ZAP | 2.14+ | Vulnerability scanning |
| CI/CD | GitHub Actions | N/A | Automation |
| Reporting | HTML/JSON | N/A | Test results |

---

## 🎭 E2E Tests (Playwright)

### Configuração Existente

**Arquivo**: `/root/bazari/apps/web/playwright.config.ts`

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: [
    '**/tests/**/*.spec.ts',
    '**/src/modules/governance/__tests__/e2e/**/*.spec.ts'
  ],
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }]
  ],

  use: {
    baseURL: process.env.WEB_BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
    { name: 'Mobile Safari', use: { ...devices['iPhone 12'] } },
  ],

  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
```

### Estrutura de Diretórios

```
apps/web/
├── tests/                           # Novos testes E2E
│   ├── auth/
│   │   ├── create-account.spec.ts
│   │   ├── import-account.spec.ts
│   │   ├── unlock-wallet.spec.ts
│   │   └── device-link.spec.ts
│   ├── vesting/
│   │   ├── stats-overview.spec.ts
│   │   ├── category-navigation.spec.ts
│   │   ├── schedule-details.spec.ts
│   │   └── timeline-visualization.spec.ts
│   ├── marketplace/
│   │   ├── search-products.spec.ts
│   │   ├── filters-sorting.spec.ts
│   │   ├── pdp-navigation.spec.ts
│   │   ├── add-to-cart.spec.ts
│   │   └── checkout-flow.spec.ts
│   ├── p2p/
│   │   ├── create-offer.spec.ts
│   │   ├── accept-offer.spec.ts
│   │   ├── negotiation-chat.spec.ts
│   │   └── complete-transaction.spec.ts
│   ├── delivery/
│   │   ├── request-delivery.spec.ts
│   │   ├── accept-request.spec.ts
│   │   ├── tracking.spec.ts
│   │   └── complete-delivery.spec.ts
│   ├── orders/
│   │   ├── create-order.spec.ts
│   │   ├── seller-chat.spec.ts
│   │   ├── payment-process.spec.ts
│   │   └── confirm-receipt.spec.ts
│   └── helpers/
│       ├── auth-helpers.ts
│       ├── wallet-helpers.ts
│       └── test-data.ts
└── src/modules/governance/__tests__/e2e/  # Testes existentes
    ├── council-interaction.spec.ts
    ├── proposal-lifecycle.spec.ts
    ├── multisig-approval.spec.ts
    ├── filters-navigation.spec.ts
    └── voting-flow.spec.ts
```

### Padrões de Teste E2E

#### Template Básico

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: navigate, authenticate, etc
    await page.goto('/feature');
  });

  test('should do something', async ({ page }) => {
    // Arrange
    const button = page.getByRole('button', { name: 'Action' });

    // Act
    await button.click();

    // Assert
    await expect(page.getByText('Success')).toBeVisible();
  });

  test.afterEach(async ({ page }) => {
    // Cleanup if needed
  });
});
```

#### Helpers de Autenticação

```typescript
// apps/web/tests/helpers/auth-helpers.ts

export async function createTestAccount(page: Page) {
  await page.goto('/auth/create');
  await page.fill('input[name="name"]', 'Test User');
  await page.fill('input[name="handle"]', `testuser${Date.now()}`);
  await page.fill('input[name="pin"]', '123456');
  await page.fill('input[name="pinConfirm"]', '123456');
  await page.click('button[type="submit"]');
  await page.waitForURL('/app');
}

export async function unlockWallet(page: Page, pin: string = '123456') {
  await page.goto('/auth/unlock');
  await page.fill('input[name="pin"]', pin);
  await page.click('button[type="submit"]');
  await page.waitForURL('/app');
}

export async function importAccount(page: Page, seedPhrase: string) {
  await page.goto('/auth/import');
  await page.fill('textarea[name="seed"]', seedPhrase);
  await page.fill('input[name="pin"]', '123456');
  await page.click('button[type="submit"]');
  await page.waitForURL('/app');
}
```

#### Helpers de Wallet

```typescript
// apps/web/tests/helpers/wallet-helpers.ts

export async function getBalance(page: Page): Promise<string> {
  await page.goto('/app/wallet');
  const balance = await page.locator('[data-testid="balance"]').textContent();
  return balance || '0';
}

export async function sendTokens(
  page: Page,
  recipient: string,
  amount: string
) {
  await page.goto('/app/wallet');
  await page.click('button:has-text("Send")');
  await page.fill('input[name="recipient"]', recipient);
  await page.fill('input[name="amount"]', amount);
  await page.click('button[type="submit"]');
  await page.waitForSelector('text=Transaction successful');
}
```

### Exemplo de Teste: Vesting UI

```typescript
// apps/web/tests/vesting/stats-overview.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Vesting - Stats Overview', () => {
  test('should display vesting stats', async ({ page }) => {
    // Navigate to vesting page
    await page.goto('/vesting');

    // Check title
    await expect(page.getByRole('heading', {
      name: 'Token Vesting'
    })).toBeVisible();

    // Check stats cards
    const cards = [
      'Total Alocado',
      'Total Liberado',
      'Ainda Locked',
      'Progresso'
    ];

    for (const cardTitle of cards) {
      await expect(page.getByText(cardTitle)).toBeVisible();
    }

    // Check categories tabs
    const categories = ['Fundadores', 'Equipe', 'Parceiros', 'Marketing'];

    for (const category of categories) {
      await expect(page.getByRole('tab', {
        name: new RegExp(category)
      })).toBeVisible();
    }
  });

  test('should navigate between categories', async ({ page }) => {
    await page.goto('/vesting');

    // Click on Team tab
    await page.click('button:has-text("Equipe")');

    // Check team-specific content
    await expect(page.getByText('100M BZR • 3 anos • 6 meses cliff')).toBeVisible();

    // Click on Partners tab
    await page.click('button:has-text("Parceiros")');

    // Check partners-specific content
    await expect(page.getByText('80M BZR • 2 anos • 3 meses cliff')).toBeVisible();
  });

  test('should display schedule details', async ({ page }) => {
    await page.goto('/vesting');

    // Click on Founders tab (default)
    await page.click('button:has-text("Fundadores")');

    // Check schedule details section
    await expect(page.getByText('Detalhes do Schedule:')).toBeVisible();
    await expect(page.getByText(/Início: Block #/)).toBeVisible();
    await expect(page.getByText(/Duração:/)).toBeVisible();
    await expect(page.getByText(/Cliff:/)).toBeVisible();
    await expect(page.getByText(/Account:/)).toBeVisible();
  });
});
```

### Comandos de Execução

```bash
# Executar todos os testes E2E
cd /root/bazari/apps/web
pnpm exec playwright test

# Executar testes específicos
pnpm exec playwright test tests/vesting/

# Executar em browser específico
pnpm exec playwright test --project=chromium

# Executar com UI mode (debug)
pnpm exec playwright test --ui

# Executar em modo headed (ver browser)
pnpm exec playwright test --headed

# Gerar relatório HTML
pnpm exec playwright show-report
```

---

## ⚡ Load Tests (k6)

### Instalação do k6

```bash
# Ubuntu/Debian
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Verificar instalação
k6 version
```

### Estrutura de Diretórios

```
tests/
└── load/
    ├── api-rest.js           # API REST endpoints
    ├── websocket.js          # WebSocket (Chat)
    ├── blockchain.js         # Blockchain RPC
    ├── database.js           # Database load
    ├── scenarios/
    │   ├── smoke.js          # Smoke test (low load)
    │   ├── average.js        # Average load
    │   ├── stress.js         # Stress test (high load)
    │   └── spike.js          # Spike test
    ├── helpers/
    │   ├── auth.js
    │   └── data.js
    └── README.md
```

### Exemplo: API REST Load Test

```javascript
// tests/load/api-rest.js

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration
export const options = {
  stages: [
    { duration: '1m', target: 10 },   // Ramp up to 10 users
    { duration: '5m', target: 50 },   // Ramp up to 50 users
    { duration: '5m', target: 100 },  // Ramp up to 100 users
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '2m', target: 0 },    // Ramp down to 0 users
  ],

  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% < 500ms, 99% < 1s
    http_req_failed: ['rate<0.01'],                 // Error rate < 1%
    errors: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.API_URL || 'https://bazari.libervia.xyz';

export default function () {
  // Test 1: GET /products
  let res = http.get(`${BASE_URL}/products?limit=20`);
  check(res, {
    'products status 200': (r) => r.status === 200,
    'products has data': (r) => JSON.parse(r.body).success === true,
  }) || errorRate.add(1);

  sleep(1);

  // Test 2: GET /search
  res = http.get(`${BASE_URL}/search?q=laptop&limit=10`);
  check(res, {
    'search status 200': (r) => r.status === 200,
    'search has results': (r) => JSON.parse(r.body).items.length > 0,
  }) || errorRate.add(1);

  sleep(1);

  // Test 3: GET /vesting/stats
  res = http.get(`${BASE_URL}/vesting/stats`);
  check(res, {
    'vesting status 200': (r) => r.status === 200,
    'vesting has data': (r) => JSON.parse(r.body).success === true,
  }) || errorRate.add(1);

  sleep(1);

  // Test 4: GET /governance/proposals
  res = http.get(`${BASE_URL}/governance/proposals?limit=10`);
  check(res, {
    'proposals status 200': (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(2);
}

export function handleSummary(data) {
  return {
    'test-results/load-api-rest.json': JSON.stringify(data),
    'test-results/load-api-rest.html': htmlReport(data),
  };
}

function htmlReport(data) {
  // Generate HTML report
  const metrics = data.metrics;
  return `
    <!DOCTYPE html>
    <html>
    <head><title>k6 Load Test Report</title></head>
    <body>
      <h1>API REST Load Test Results</h1>
      <table>
        <tr><th>Metric</th><th>Value</th></tr>
        <tr><td>Duration</td><td>${metrics.http_req_duration.values.avg.toFixed(2)} ms (avg)</td></tr>
        <tr><td>p95</td><td>${metrics.http_req_duration.values['p(95)'].toFixed(2)} ms</td></tr>
        <tr><td>p99</td><td>${metrics.http_req_duration.values['p(99)'].toFixed(2)} ms</td></tr>
        <tr><td>Requests</td><td>${metrics.http_reqs.values.count}</td></tr>
        <tr><td>Failed</td><td>${metrics.http_req_failed.values.rate * 100}%</td></tr>
      </table>
    </body>
    </html>
  `;
}
```

### Exemplo: WebSocket Load Test

```javascript
// tests/load/websocket.js

import ws from 'k6/ws';
import { check } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '2m', target: 50 },
    { duration: '2m', target: 100 },
    { duration: '1m', target: 0 },
  ],
};

const WS_URL = __ENV.WS_URL || 'wss://bazari.libervia.xyz/chat/ws';

export default function () {
  const res = ws.connect(WS_URL, {}, function (socket) {
    socket.on('open', () => {
      // Send test message
      socket.send(JSON.stringify({
        type: 'join',
        room: 'test-room',
      }));
    });

    socket.on('message', (data) => {
      const message = JSON.parse(data);
      check(message, {
        'message received': (m) => m.type !== undefined,
      });
    });

    socket.on('error', (e) => {
      console.error('WebSocket error:', e);
    });

    // Keep connection open for 30 seconds
    socket.setTimeout(() => {
      socket.close();
    }, 30000);
  });

  check(res, {
    'WebSocket connected': (r) => r && r.status === 101,
  });
}
```

### Comandos de Execução

```bash
# Executar teste de carga API
k6 run tests/load/api-rest.js

# Com variáveis de ambiente
API_URL=https://bazari.libervia.xyz k6 run tests/load/api-rest.js

# Com output para InfluxDB
k6 run --out influxdb=http://localhost:8086/k6 tests/load/api-rest.js

# Cloud k6 (streaming)
k6 cloud tests/load/api-rest.js

# Modo smoke test (baixa carga)
k6 run --stage 1m:10 tests/load/api-rest.js
```

---

## 🔒 Security Tests

### OWASP ZAP Configuration

**Instalação:**
```bash
# Docker (recomendado)
docker pull zaproxy/zap-stable

# Ubuntu
sudo add-apt-repository ppa:zaproxy/release
sudo apt-get update
sudo apt-get install zaproxy
```

**Script de Scan:**
```bash
#!/bin/bash
# tests/security/zap-scan.sh

TARGET_URL="https://bazari.libervia.xyz"
ZAP_PORT=8090

# Start ZAP daemon
docker run -d --name zap \
  -u zap \
  -p ${ZAP_PORT}:${ZAP_PORT} \
  -v $(pwd)/test-results/zap:/zap/wrk:rw \
  zaproxy/zap-stable \
  zap.sh -daemon -port ${ZAP_PORT} \
  -config api.disablekey=true

# Wait for ZAP to start
sleep 30

# Spider the target
docker exec zap \
  zap-cli --zap-url http://localhost:${ZAP_PORT} \
  spider ${TARGET_URL}

# Active scan
docker exec zap \
  zap-cli --zap-url http://localhost:${ZAP_PORT} \
  active-scan ${TARGET_URL}

# Wait for scan to complete
sleep 300

# Generate reports
docker exec zap \
  zap-cli --zap-url http://localhost:${ZAP_PORT} \
  report -o /zap/wrk/zap-report.html -f html

docker exec zap \
  zap-cli --zap-url http://localhost:${ZAP_PORT} \
  report -o /zap/wrk/zap-report.json -f json

# Stop ZAP
docker stop zap
docker rm zap

echo "ZAP scan complete. Reports in test-results/zap/"
```

### npm Audit Script

```bash
#!/bin/bash
# tests/security/npm-audit.sh

echo "Running npm audit..."

# API audit
cd /root/bazari/apps/api
pnpm audit --json > ../../test-results/security/audit-api.json
pnpm audit

# Web audit
cd /root/bazari/apps/web
pnpm audit --json > ../../test-results/security/audit-web.json
pnpm audit

# Root audit
cd /root/bazari
pnpm audit --json > test-results/security/audit-root.json
pnpm audit

echo "Audit complete. Reports in test-results/security/"
```

### Security Checklist

```markdown
# Security Checklist - FASE 11

## Injection Attacks
- [ ] SQL Injection (Prisma ORM protege)
- [ ] NoSQL Injection (validação de input)
- [ ] Command Injection (sem exec() de user input)
- [ ] LDAP Injection (N/A)

## Authentication
- [ ] JWT token validation
- [ ] Token expiration (1 hour)
- [ ] Refresh token rotation
- [ ] Session management
- [ ] Brute force protection (rate limiting)

## Authorization
- [ ] RBAC (seller, buyer, admin)
- [ ] Resource ownership validation
- [ ] API endpoint protection
- [ ] Horizontal privilege escalation check
- [ ] Vertical privilege escalation check

## Data Exposure
- [ ] HTTPS only (no HTTP)
- [ ] Secrets in .env (not committed)
- [ ] No sensitive data in logs
- [ ] No stack traces in production
- [ ] API keys rotation

## XSS (Cross-Site Scripting)
- [ ] React auto-escaping
- [ ] DOMPurify for rich text
- [ ] CSP headers
- [ ] X-XSS-Protection header

## CSRF (Cross-Site Request Forgery)
- [ ] CSRF tokens on state-changing operations
- [ ] SameSite cookie attribute
- [ ] Origin validation

## Security Misconfiguration
- [ ] CORS policy (specific origins only)
- [ ] X-Frame-Options: DENY
- [ ] X-Content-Type-Options: nosniff
- [ ] Referrer-Policy: strict-origin
- [ ] Error handling (no stack traces)

## Sensitive Data
- [ ] Password hashing (N/A - wallet-based)
- [ ] Encryption at rest (database)
- [ ] Encryption in transit (TLS 1.3)
- [ ] PII protection (GDPR compliance)

## Components with Known Vulnerabilities
- [ ] npm audit score: 0 critical
- [ ] Dependencies up to date
- [ ] Outdated packages review

## Logging & Monitoring
- [ ] Access logs (nginx)
- [ ] API request logs
- [ ] Error tracking (Sentry ready)
- [ ] Security events logging
- [ ] Anomaly detection (TODO)

## Rate Limiting
- [ ] API: 100 req/min per IP
- [ ] Auth: 5 req/min per IP
- [ ] WebSocket: 10 connections per user
- [ ] File upload: 5 files/min

## Input Validation
- [ ] Schema validation (Zod)
- [ ] File upload restrictions (size, type)
- [ ] IPFS content validation
- [ ] URL validation
- [ ] Email validation (N/A)

## File Upload Security
- [ ] File type validation (whitelist)
- [ ] File size limits (150MB)
- [ ] Virus scanning (TODO)
- [ ] Filename sanitization
- [ ] Storage isolation

## API Security
- [ ] Authentication required
- [ ] Input validation
- [ ] Output encoding
- [ ] Error handling
- [ ] Rate limiting
- [ ] Versioning

## Blockchain Security
- [ ] Transaction validation
- [ ] Balance checks
- [ ] Nonce management
- [ ] Gas estimation
- [ ] Private key protection (browser wallet)
```

---

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/fase11-integration-tests.yml

name: FASE 11 - Integration Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  e2e-tests:
    name: E2E Tests (Playwright)
    runs-on: ubuntu-latest
    timeout-minutes: 30

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Install Playwright browsers
        run: pnpm exec playwright install --with-deps chromium firefox

      - name: Start services
        run: |
          # Start PostgreSQL
          docker-compose up -d postgres

          # Start IPFS
          docker-compose up -d ipfs

          # Start Blockchain
          docker-compose up -d chain

          # Wait for services
          sleep 30

      - name: Run migrations
        run: |
          cd apps/api
          pnpm prisma migrate deploy

      - name: Start API
        run: |
          cd apps/api
          pnpm dev &
          sleep 10

      - name: Start Web
        run: |
          cd apps/web
          pnpm dev &
          sleep 10

      - name: Run E2E tests
        run: |
          cd apps/web
          pnpm exec playwright test

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-results
          path: apps/web/test-results/
          retention-days: 30

      - name: Upload HTML report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: apps/web/playwright-report/
          retention-days: 30

  load-tests:
    name: Load Tests (k6)
    runs-on: ubuntu-latest
    timeout-minutes: 20
    needs: e2e-tests

    steps:
      - uses: actions/checkout@v4

      - name: Install k6
        run: |
          sudo gpg -k
          sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6

      - name: Run load tests
        run: |
          k6 run --out json=test-results/load-results.json tests/load/api-rest.js

      - name: Upload load test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: load-test-results
          path: test-results/
          retention-days: 30

  security-tests:
    name: Security Tests
    runs-on: ubuntu-latest
    timeout-minutes: 30

    steps:
      - uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Run npm audit
        run: |
          mkdir -p test-results/security
          pnpm audit --json > test-results/security/audit.json || true
          pnpm audit

      - name: Run OWASP ZAP scan
        run: |
          docker run -v $(pwd)/test-results:/zap/wrk:rw \
            zaproxy/zap-stable \
            zap-baseline.py \
            -t https://bazari.libervia.xyz \
            -J zap-report.json \
            -r zap-report.html || true

      - name: Upload security reports
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: security-reports
          path: test-results/security/
          retention-days: 90
```

---

## ⚙️ Configurações

### Environment Variables

```bash
# .env.test

# API
API_URL=http://localhost:3000
WEB_BASE_URL=http://localhost:5173

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/bazari_test

# Blockchain
CHAIN_RPC_URL=ws://localhost:9944

# IPFS
IPFS_URL=http://localhost:5001

# WebSocket
WS_URL=ws://localhost:3000/chat/ws

# Test Configuration
CI=false
TEST_TIMEOUT=30000
PARALLEL_WORKERS=4
```

### Docker Compose (Services for Testing)

```yaml
# docker-compose.test.yml

version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: bazari
      POSTGRES_PASSWORD: bazari123
      POSTGRES_DB: bazari_test
    ports:
      - "5432:5432"
    volumes:
      - postgres-test-data:/var/lib/postgresql/data

  ipfs:
    image: ipfs/kubo:latest
    ports:
      - "5001:5001"
      - "8081:8080"
    volumes:
      - ipfs-test-data:/data/ipfs

  chain:
    image: bazari-chain:latest
    ports:
      - "9944:9944"
    command: --dev --rpc-external

volumes:
  postgres-test-data:
  ipfs-test-data:
```

---

## 🐛 Troubleshooting

### Problemas Comuns

#### 1. Playwright tests timeout
**Sintoma**: Tests falham com timeout error
**Solução**:
```typescript
// Aumentar timeout
test.setTimeout(60000); // 60 segundos

// Ou no config
export default defineConfig({
  timeout: 60000,
});
```

#### 2. k6 connection refused
**Sintoma**: `connection refused` durante load test
**Solução**:
```bash
# Verificar se API está rodando
curl http://localhost:3000/health

# Verificar logs
docker logs bazari-api
```

#### 3. ZAP scan fails
**Sintoma**: ZAP scan não completa
**Solução**:
```bash
# Aumentar timeout
docker run -e ZAP_TIMEOUT=600 zaproxy/zap-stable ...

# Verificar logs
docker logs zap
```

#### 4. CI/CD failures
**Sintoma**: Tests passam local, mas falham no CI
**Solução**:
```yaml
# Adicionar retries
retries: 2

# Aumentar workers
workers: 1 # No CI, evitar paralelismo
```

---

## 📊 Relatórios e Métricas

### Playwright Reports

```bash
# Gerar relatório HTML
pnpm exec playwright show-report

# Relatório JSON
cat test-results/results.json | jq

# Relatório JUnit (CI/CD)
cat test-results/junit.xml
```

### k6 Reports

```bash
# Resultado em console
k6 run tests/load/api-rest.js

# JSON output
k6 run --out json=results.json tests/load/api-rest.js

# HTML report (via extensão)
k6 run --out html=report.html tests/load/api-rest.js
```

### Security Reports

```bash
# npm audit
pnpm audit --json

# ZAP report
open test-results/zap/zap-report.html
```

---

## 🔗 Referências

- [Playwright Documentation](https://playwright.dev)
- [k6 Documentation](https://k6.io/docs)
- [OWASP ZAP User Guide](https://www.zaproxy.org/docs)
- [OWASP Top 10](https://owasp.org/www-project-top-ten)
- [GitHub Actions](https://docs.github.com/en/actions)

---

*Documento criado em: 31 de Outubro de 2025*
*Versão: 1.0.0*
