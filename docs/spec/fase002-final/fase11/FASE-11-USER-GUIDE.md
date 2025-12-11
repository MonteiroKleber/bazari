# FASE 11 - Integration Tests - Guia do Usuário

**Versão**: 1.0.0
**Data**: 31 de Outubro de 2025

---

## 📋 Índice

1. [Introdução](#introdução)
2. [Executando E2E Tests](#executando-e2e-tests)
3. [Executando Load Tests](#executando-load-tests)
4. [Executando Security Tests](#executando-security-tests)
5. [Interpretando Resultados](#interpretando-resultados)
6. [FAQ](#faq)
7. [Troubleshooting](#troubleshooting)

---

## 🎯 Introdução

Este guia ensina como executar os testes de integração da FASE 11 do projeto Bazari. Os testes são divididos em três categorias:

- **E2E Tests** - Testes end-to-end com Playwright
- **Load Tests** - Testes de carga com k6
- **Security Tests** - Testes de segurança com OWASP ZAP

### Pré-requisitos

- Node.js 20+
- pnpm 8+
- Docker (para alguns testes)
- Acesso ao servidor (root privileges para instalações)

---

## 🎭 Executando E2E Tests

### Setup Inicial

```bash
# Navegar para o diretório web
cd /root/bazari/apps/web

# Instalar dependências (se necessário)
pnpm install

# Instalar browsers do Playwright
pnpm exec playwright install chromium firefox

# Verificar instalação
pnpm exec playwright --version
```

### Executando Todos os Testes

```bash
# Executar todos os testes E2E
pnpm exec playwright test

# Resultado esperado:
# ✓ 25 passed (30s)
```

### Executando Testes Específicos

```bash
# Por diretório
pnpm exec playwright test tests/vesting/
pnpm exec playwright test tests/auth/
pnpm exec playwright test tests/marketplace/

# Por arquivo
pnpm exec playwright test tests/vesting/stats-overview.spec.ts

# Por teste específico
pnpm exec playwright test -g "should display vesting stats"
```

### Executando em Browser Específico

```bash
# Apenas Chrome
pnpm exec playwright test --project=chromium

# Apenas Firefox
pnpm exec playwright test --project=firefox

# Apenas Safari
pnpm exec playwright test --project=webkit

# Mobile Chrome
pnpm exec playwright test --project="Mobile Chrome"

# Mobile Safari
pnpm exec playwright test --project="Mobile Safari"
```

### Modo Debug (UI Mode)

```bash
# Abrir UI interativo para debug
pnpm exec playwright test --ui

# Modo headed (ver browser)
pnpm exec playwright test --headed

# Com slow motion
pnpm exec playwright test --headed --slow-mo=1000
```

### Gerando Relatórios

```bash
# Executar testes e gerar relatório HTML
pnpm exec playwright test

# Visualizar relatório
pnpm exec playwright show-report

# Relatório será aberto em http://localhost:9323
```

### Exemplo de Output

```
Running 25 tests using 4 workers

  ✓ tests/auth/create-account.spec.ts:5:3 › should create new account (2s)
  ✓ tests/auth/unlock-wallet.spec.ts:5:3 › should unlock wallet with PIN (1s)
  ✓ tests/vesting/stats-overview.spec.ts:5:3 › should display vesting stats (3s)
  ✓ tests/marketplace/search-products.spec.ts:5:3 › should search products (2s)
  ...

  25 passed (45s)

To open last HTML report run:

  pnpm exec playwright show-report
```

---

## ⚡ Executando Load Tests

### Setup Inicial

```bash
# Instalar k6 (Ubuntu/Debian)
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Verificar instalação
k6 version
```

### Executando Testes de Carga

```bash
# Navegar para diretório de testes
cd /root/bazari

# Executar teste de API REST
k6 run tests/load/api-rest.js

# Executar teste de WebSocket
k6 run tests/load/websocket.js

# Executar teste de Blockchain
k6 run tests/load/blockchain.js

# Executar teste de Database
k6 run tests/load/database.js
```

### Com Variáveis de Ambiente

```bash
# Especificar URL da API
API_URL=https://bazari.libervia.xyz k6 run tests/load/api-rest.js

# Especificar múltiplas variáveis
API_URL=https://bazari.libervia.xyz \
WS_URL=wss://bazari.libervia.xyz/chat/ws \
k6 run tests/load/api-rest.js
```

### Diferentes Níveis de Carga

```bash
# Smoke test (10 usuários, 1 minuto)
k6 run --stage 1m:10 tests/load/api-rest.js

# Average load (50 usuários, 5 minutos)
k6 run --stage 5m:50 tests/load/api-rest.js

# Stress test (200 usuários, 10 minutos)
k6 run --stage 10m:200 tests/load/api-rest.js

# Spike test (0→500→0 em 2 minutos)
k6 run --stage 30s:500 --stage 1m:500 --stage 30s:0 tests/load/api-rest.js
```

### Gerando Relatórios

```bash
# JSON output
k6 run --out json=test-results/load/results.json tests/load/api-rest.js

# Analisar resultados
cat test-results/load/results.json | jq '.metrics.http_req_duration'

# HTML report (com extensão)
k6 run --out html=test-results/load/report.html tests/load/api-rest.js
```

### Exemplo de Output

```
          /\      |‾‾| /‾‾/   /‾‾/
     /\  /  \     |  |/  /   /  /
    /  \/    \    |     (   /   ‾‾\
   /          \   |  |\  \ |  (‾)  |
  / __________ \  |__| \__\ \_____/ .io

  execution: local
     script: tests/load/api-rest.js
     output: -

  scenarios: (100.00%) 1 scenario, 100 max VUs, 18m0s max duration
           * default: Up to 100 looping VUs for 16m0s over 5 stages

     ✓ products status 200
     ✓ search status 200
     ✓ vesting status 200
     ✓ proposals status 200

     checks.........................: 100.00% ✓ 24000 ✗ 0
     data_received..................: 120 MB  125 kB/s
     data_sent......................: 2.4 MB  2.5 kB/s
     http_req_blocked...............: avg=1.2ms  min=2µs   med=5µs   max=150ms p(95)=3ms   p(99)=12ms
     http_req_connecting............: avg=800µs  min=0s    med=0s    max=120ms p(95)=2ms   p(99)=8ms
   ✓ http_req_duration..............: avg=245ms  min=50ms  med=180ms max=950ms p(95)=450ms p(99)=720ms
     http_req_failed................: 0.00%   ✓ 0    ✗ 6000
     http_req_receiving.............: avg=150µs  min=20µs  med=100µs max=2ms   p(95)=300µs p(99)=800µs
     http_req_sending...............: avg=50µs   min=10µs  med=40µs  max=1ms   p(95)=100µs p(99)=250µs
     http_req_tls_handshaking.......: avg=400µs  min=0s    med=0s    max=80ms  p(95)=1ms   p(99)=5ms
     http_req_waiting...............: avg=244ms  min=49ms  med=179ms max=949ms p(95)=449ms p(99)=719ms
     http_reqs......................: 6000    6.25/s
     iteration_duration.............: avg=4.9s   min=4s    med=4.8s  max=6.5s  p(95)=5.4s  p(99)=6s
     iterations.....................: 1500    1.56/s
     vus............................: 100     min=10 max=100
     vus_max........................: 100     min=100 max=100

running (16m00.0s), 000/100 VUs, 1500 complete and 0 interrupted iterations
default ✓ [======================================] 000/100 VUs  16m0s
```

**Interpretação:**
- ✓ Checks passaram (100%)
- ✓ p95 = 450ms (< 500ms threshold)
- ✓ p99 = 720ms (< 1000ms threshold)
- ✓ Error rate = 0% (< 1% threshold)
- ✅ **TESTE PASSOU!**

---

## 🔒 Executando Security Tests

### OWASP ZAP Scan

```bash
# Executar script de ZAP scan
cd /root/bazari
chmod +x tests/security/zap-scan.sh
./tests/security/zap-scan.sh

# Aguardar conclusão (~10 minutos)
# ...

# Visualizar relatório HTML
open test-results/security/zap-report.html

# Ou visualizar JSON
cat test-results/security/zap-report.json | jq
```

### npm Audit

```bash
# Executar script de audit
chmod +x tests/security/npm-audit.sh
./tests/security/npm-audit.sh

# Resultado será exibido no console:
# ✓ found 0 vulnerabilities (API)
# ✓ found 0 vulnerabilities (Web)
# ✓ found 0 vulnerabilities (Root)

# Visualizar relatórios JSON
cat test-results/security/audit-api.json | jq '.vulnerabilities'
cat test-results/security/audit-web.json | jq '.vulnerabilities'
```

### Security Checklist

```bash
# Abrir checklist
cat tests/security/security-checklist.md

# Verificar cada item manualmente e marcar como completo
# [ ] → [x]
```

### Rate Limiting Test

```bash
# Executar teste de rate limiting
chmod +x tests/security/rate-limit-test.sh
./tests/security/rate-limit-test.sh

# Resultado esperado:
# Rate limiting test complete!
# API: 20/120 requests blocked (429)
# Auth: 5/10 requests blocked (429)
```

### Exemplo de Output (npm audit)

```bash
$ pnpm audit

✓ No vulnerabilities found

Summary:
  Total dependencies: 1234
  Vulnerabilities:
    Critical: 0
    High: 0
    Moderate: 0
    Low: 0
```

### Exemplo de Output (ZAP Scan)

```
ZAP Scanning Report

Target: https://bazari.libervia.xyz
Date: 2025-10-31 14:30:00

Summary:
  Total Alerts: 12
  Risk Level:
    High: 0
    Medium: 2
    Low: 5
    Informational: 5

Medium Risk Alerts:
  1. Content Security Policy (CSP) Header Not Set
     URL: https://bazari.libervia.xyz/
     Solution: Implement CSP header

  2. X-Frame-Options Header Not Set
     URL: https://bazari.libervia.xyz/api/
     Solution: Add X-Frame-Options: DENY

Low Risk Alerts:
  3. Cookie Without SameSite Attribute (5 instances)
  4. Timestamp Disclosure (2 instances)
  ...
```

---

## 📊 Interpretando Resultados

### E2E Tests - Playwright

**Pass Rate**:
- ✅ 95-100%: Excelente
- ⚠️ 90-94%: Aceitável (investigar falhas)
- ❌ < 90%: Problemas críticos

**Test Duration**:
- ✅ < 60s: Rápido
- ⚠️ 60-120s: Aceitável
- ❌ > 120s: Lento (otimizar)

**Exemplo de Relatório**:
```
25 passed (45s)
├── auth: 4 passed (8s)
├── vesting: 4 passed (12s)
├── marketplace: 5 passed (10s)
├── p2p: 4 passed (7s)
├── delivery: 4 passed (5s)
└── orders: 4 passed (3s)
```

### Load Tests - k6

**Métricas Importantes**:

| Métrica | Threshold | Significado |
|---------|-----------|-------------|
| **p95** | < 500ms | 95% das requisições < 500ms |
| **p99** | < 1000ms | 99% das requisições < 1s |
| **Error Rate** | < 1% | Menos de 1% de erros |
| **Throughput** | > 100 RPS | Mais de 100 req/s |

**Interpretação de Percentis**:
- **p50 (median)**: Tempo típico de resposta
- **p95**: 95% das requisições são mais rápidas
- **p99**: 99% das requisições são mais rápidas
- **max**: Pior caso

**Exemplo**:
```
http_req_duration:
  avg=245ms
  p(95)=450ms  ✅ (< 500ms)
  p(99)=720ms  ✅ (< 1000ms)

http_req_failed: 0.00%  ✅ (< 1%)

Conclusão: Sistema está dentro dos SLAs
```

### Security Tests

**npm Audit Severity**:
- **Critical**: Vulnerabilidade crítica - FIX IMEDIATO
- **High**: Vulnerabilidade alta - FIX URGENTE
- **Moderate**: Vulnerabilidade média - FIX EM BREVE
- **Low**: Vulnerabilidade baixa - FIX QUANDO POSSÍVEL

**ZAP Risk Levels**:
- **High**: Risco alto - CORRIGIR IMEDIATAMENTE
- **Medium**: Risco médio - CORRIGIR EM 1 SEMANA
- **Low**: Risco baixo - CORRIGIR EM 1 MÊS
- **Informational**: Informativo - AVALIAR

**Critérios de Aceitação**:
- ✅ Critical: 0
- ✅ High: 0
- ✅ Moderate: < 5
- ⚠️ Low: < 20

---

## ❓ FAQ

### E2E Tests

**Q: Os testes estão falhando por timeout. O que fazer?**

A: Aumentar o timeout no `playwright.config.ts`:
```typescript
export default defineConfig({
  timeout: 60000, // 60 segundos
});
```

**Q: Como executar apenas um teste específico?**

A: Use a flag `-g`:
```bash
pnpm exec playwright test -g "should display vesting stats"
```

**Q: Como ver o browser durante os testes?**

A: Use a flag `--headed`:
```bash
pnpm exec playwright test --headed
```

**Q: Como debugar um teste que está falhando?**

A: Use o UI mode:
```bash
pnpm exec playwright test --ui
```

### Load Tests

**Q: k6 diz "connection refused". O que fazer?**

A: Verificar se a API está rodando:
```bash
curl http://localhost:3000/health
systemctl status bazari-api
```

**Q: Como testar com mais usuários simultâneos?**

A: Modificar os stages no script:
```javascript
stages: [
  { duration: '5m', target: 500 }, // 500 usuários
]
```

**Q: Os resultados estão muito lentos. É normal?**

A: Depende do cenário:
- Smoke test (10 users): p95 < 200ms
- Load test (100 users): p95 < 500ms
- Stress test (500 users): p95 < 1000ms

**Q: Como salvar os resultados?**

A: Use `--out json`:
```bash
k6 run --out json=results.json tests/load/api-rest.js
```

### Security Tests

**Q: ZAP scan está demorando muito. É normal?**

A: Sim, pode levar 10-30 minutos dependendo do tamanho do site.

**Q: Encontrei uma vulnerabilidade High. O que fazer?**

A:
1. Ler descrição e solução no relatório ZAP
2. Aplicar fix imediatamente
3. Re-executar scan para confirmar
4. Documentar em FASE-11-PROMPT-03-COMPLETE.md

**Q: npm audit encontrou vulnerabilidades. Posso ignorar?**

A: Depende da severidade:
- Critical/High: NÃO, fix imediato
- Moderate: Avaliar e fix em breve
- Low: Pode aguardar próximo sprint

**Q: Como atualizar dependências vulneráveis?**

A:
```bash
# Atualizar automaticamente
pnpm update

# Ou manualmente
pnpm add package@latest

# Re-executar audit
pnpm audit
```

---

## 🔧 Troubleshooting

### Problemas Comuns E2E

**1. "Browser not found"**
```bash
# Solução: Instalar browsers
pnpm exec playwright install
```

**2. "Port 5173 already in use"**
```bash
# Solução: Matar processo
lsof -ti:5173 | xargs kill -9
```

**3. "Tests timing out"**
```typescript
// Solução: Aumentar timeout
test.setTimeout(60000);
```

**4. "Element not found"**
```typescript
// Solução: Adicionar wait
await page.waitForSelector('button');
await page.click('button');
```

### Problemas Comuns Load Tests

**1. "k6: command not found"**
```bash
# Solução: Instalar k6
sudo apt-get install k6
```

**2. "Too many open files"**
```bash
# Solução: Aumentar limite
ulimit -n 10000
```

**3. "Connection pool exhausted"**
```bash
# Solução: Aumentar pool de conexões no Postgres
# postgresql.conf:
max_connections = 200
```

**4. "High error rate"**
```bash
# Solução: Reduzir carga ou otimizar API
# Reduzir target de VUs:
stages: [
  { duration: '5m', target: 50 }, // Reduzido de 100
]
```

### Problemas Comuns Security Tests

**1. "ZAP container keeps failing"**
```bash
# Solução: Dar permissões corretas
chmod 777 test-results/security
docker run -v $(pwd)/test-results/security:/zap/wrk:rw ...
```

**2. "npm audit shows vulnerabilities but pnpm update doesn't fix"**
```bash
# Solução: Atualizar manualmente
pnpm outdated
pnpm add package@latest
```

**3. "Rate limiting test not working"**
```bash
# Solução: Verificar se rate limiting está ativado
# Verificar logs do nginx:
tail -f /var/log/nginx/error.log | grep limit
```

---

## 📞 Suporte

Se encontrar problemas não listados aqui:

1. Verificar logs:
   ```bash
   # API logs
   journalctl -u bazari-api -f

   # Nginx logs
   tail -f /var/log/nginx/error.log

   # Playwright logs
   DEBUG=pw:api pnpm exec playwright test
   ```

2. Consultar documentação:
   - `FASE-11-TECHNICAL-SPEC.md` - Detalhes técnicos
   - `FASE-11-PROMPT.md` - Instruções de implementação
   - `FASE-11-README.md` - Visão geral

3. Verificar issues conhecidos:
   - [Playwright Issues](https://github.com/microsoft/playwright/issues)
   - [k6 Issues](https://github.com/grafana/k6/issues)
   - [OWASP ZAP Issues](https://github.com/zaproxy/zaproxy/issues)

---

## ✅ Checklist de Execução

### Antes de Executar
- [ ] Todos os serviços estão rodando (API, Chain, IPFS, DB)
- [ ] Dependências instaladas (`pnpm install`)
- [ ] Browsers instalados (Playwright)
- [ ] k6 instalado
- [ ] Docker instalado (para ZAP)

### Durante a Execução
- [ ] Monitorar logs de erro
- [ ] Verificar uso de recursos (CPU, RAM)
- [ ] Anotar falhas e problemas

### Após a Execução
- [ ] Revisar relatórios (HTML)
- [ ] Analisar métricas
- [ ] Documentar problemas encontrados
- [ ] Aplicar fixes necessários
- [ ] Re-executar testes após fixes
- [ ] Atualizar documentação

---

## 🎯 Conclusão

Este guia cobre os principais cenários de uso dos testes de integração da FASE 11. Para detalhes técnicos aprofundados, consulte `FASE-11-TECHNICAL-SPEC.md`.

**Lembre-se:**
- Testes E2E garantem que features funcionam end-to-end
- Testes de carga garantem que o sistema escala
- Testes de segurança garantem proteção contra ataques

**Boa sorte com os testes! 🚀**

---

*Documento criado em: 31 de Outubro de 2025*
*Versão: 1.0.0*
