# Runbook: Missing API Endpoint (404)

**Categoria:** Development | API
**Última Atualização:** 2025-11-02
**Owner:** Backend Team
**Severidade Tratada:** High
**Tempo Médio de Resolução:** 2-4 horas

---

## 📋 Quando Usar Este Runbook

- API endpoint retorna 404 (Not Found)
- Frontend faz chamada mas backend não responde
- Novo endpoint documentado mas não implementado
- Erro "Failed to load resource: 404" no console do navegador
- Usuários reportam funcionalidade não funcionando

**Sintomas Comuns:**
- Console do navegador mostra erro 404
- Network tab mostra status 404 em request
- Funcionalidade específica não completa
- Nenhuma mensagem de erro amigável ao usuário

---

## ⚠️ Pré-requisitos

- [ ] Acesso ao repositório de código
- [ ] Acesso SSH ao servidor (para produção)
- [ ] Conhecimento de TypeScript/Fastify
- [ ] Acesso a logs (NGINX + API)
- [ ] DevTools do navegador aberto

**Ferramentas Necessárias:**
```bash
# Verificar que ferramentas estão disponíveis
which grep
which curl
which git
pnpm --version
```

---

## 🔍 Diagnóstico

### Passo 1: Confirmar o Erro 404

**No Navegador:**
```javascript
// Abrir DevTools (F12) → Network tab
// Reproduzir ação que causa erro
// Procurar por requests com status 404
// Copiar URL completa do endpoint
```

**Logs do NGINX:**
```bash
# Ver requests 404 recentes
sudo tail -f /var/log/nginx/access.log | grep "404"

# Filtrar por endpoint específico
sudo grep "POST /api/governance/.*propose.*404" /var/log/nginx/access.log | tail -20
```

**Logs da API:**
```bash
# Verificar se há logs de erro
sudo tail -f /var/log/bazari/api.log | grep -E "404|not found"
```

### Passo 2: Identificar Endpoint Faltante

**Extrair informações:**
- **Method**: GET, POST, PUT, DELETE, PATCH
- **Path**: `/api/module/action`
- **Expected by**: Frontend file + line number

**Exemplo:**
```
Method: POST
Path: /api/governance/democracy/propose
Expected by: apps/web/src/modules/governance/pages/CreateProposalPage.tsx:144
```

### Passo 3: Verificar se Endpoint Existe no Código

**Buscar no backend:**
```bash
cd /root/bazari/apps/api

# Buscar endpoint no código
grep -r "democracy/propose" src/routes/

# Buscar método específico
grep -r "app\.post.*democracy/propose" src/routes/governance.ts

# Listar todos os endpoints do módulo
grep -E "app\.(get|post|put|delete|patch)" src/routes/governance.ts
```

**Verificar registro de rotas:**
```bash
# Verificar se rota foi registrada no servidor
grep -A 10 "governanceRoutes" src/server.ts

# Exemplo esperado:
# await app.register(governanceRoutes, { prisma });
```

### Passo 4: Verificar NGINX Config (se aplicável)

**Production only:**
```bash
# Ver configuração do proxy
cat /etc/nginx/sites-enabled/bazari.conf | grep -A 5 "/api/"

# Verificar proxy_pass
# Deve ter algo como:
# location /api/ {
#     proxy_pass http://localhost:3000/;
# }

# Testar se NGINX está passando request
curl -v http://localhost/api/governance/democracy/propose
```

---

## 🔧 Resolução

### Opção A: Endpoint Não Implementado (Mais Comum)

**Tempo Estimado:** 1-2 horas
**Complexidade:** Média

**Passos:**

1. **Criar branch para fix:**
```bash
cd /root/bazari
git checkout -b fix/gov-001-missing-propose-endpoint
```

2. **Abrir arquivo de rotas relevante:**
```bash
# Identificar arquivo correto
# Exemplo: apps/api/src/routes/governance.ts

code apps/api/src/routes/governance.ts
# ou
vim apps/api/src/routes/governance.ts
```

3. **Adicionar imports necessários:**
```typescript
import { z } from 'zod';
import { authOnRequest } from '../lib/auth/middleware.js';
```

4. **Implementar endpoint:**
```typescript
// POST /governance/democracy/propose
app.post('/governance/democracy/propose', {
  onRequest: authOnRequest,  // Requer autenticação
  schema: {
    body: z.object({
      title: z.string().min(1).max(100),
      description: z.string().min(1).max(2000),
      // ... outros campos necessários
    })
  }
}, async (request, reply) => {
  try {
    const { title, description, ... } = request.body as any;
    const authUser = (request as any).authUser;

    // TODO: Implementar lógica de negócio
    // 1. Validar dados
    // 2. Interagir com blockchain (se necessário)
    // 3. Salvar em banco de dados (se necessário)

    // Por enquanto, retornar simulado:
    const result = {
      id: Math.floor(Math.random() * 1000),
      title,
      description,
      status: 'created',
      createdAt: new Date().toISOString(),
    };

    return reply.status(201).send({
      success: true,
      data: result,
      message: 'Proposta criada com sucesso (simulado).'
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return reply.status(500).send({ success: false, error: errorMsg });
  }
});
```

5. **Validar sintaxe TypeScript:**
```bash
cd apps/api
pnpm exec tsc --noEmit src/routes/governance.ts
```

6. **Testar localmente:**
```bash
# Terminal 1: Iniciar servidor
cd apps/api
pnpm dev

# Terminal 2: Testar endpoint
curl -X POST http://localhost:3000/governance/democracy/propose \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "title": "Test Proposal",
    "description": "Test description"
  }'

# Esperado: Status 201, não 404
```

7. **Criar testes:**
```typescript
// apps/api/src/routes/__tests__/governance.test.ts
describe('POST /governance/democracy/propose', () => {
  it('should create proposal successfully', async () => {
    const response = await request(app.server)
      .post('/governance/democracy/propose')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Test',
        description: 'Test description'
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.id).toBeDefined();
  });

  it('should return 401 without auth', async () => {
    const response = await request(app.server)
      .post('/governance/democracy/propose')
      .send({});

    expect(response.status).toBe(401);
  });
});
```

8. **Commit e push:**
```bash
git add apps/api/src/routes/governance.ts
git commit -m "fix(governance): add missing POST endpoints for proposal creation

- Add POST /governance/democracy/propose
- Add POST /governance/treasury/propose
- Add POST /governance/council/propose
- Add POST /governance/tech-committee/propose

Resolves GOV-001: Proposal creation was returning 404
Endpoints are currently simulated - full blockchain integration pending

Refs: /knowledge/30-operations/errors/by-module/governance/GOV-001-propose-endpoint-404.md"

git push origin fix/gov-001-missing-propose-endpoint
```

9. **Criar PR e solicitar review**

### Opção B: Rota Não Registrada

**Tempo Estimado:** 15-30 minutos
**Complexidade:** Baixa

**Sintoma:** Endpoint existe no código mas não está registrado no servidor.

```typescript
// apps/api/src/server.ts

// Verificar se linha existe:
await app.register(governanceRoutes, { prisma });

// Se estiver comentada ou ausente, adicionar:
import { governanceRoutes } from './routes/governance.js';

// No setup de rotas:
await app.register(governanceRoutes, { prisma });
```

### Opção C: Path Incorreto no Frontend

**Tempo Estimado:** 10-20 minutos
**Complexidade:** Baixa

**Sintoma:** Frontend chama endpoint com path errado.

```typescript
// Encontrar chamada no frontend
cd /root/bazari/apps/web
grep -r "democracy/propose" src/

// Corrigir path no arquivo identificado
// Antes:
const response = await fetch('/api/governance/democracy/propose', ...);

// Depois (se endpoint estiver em outro lugar):
const response = await fetch('/api/governance/proposals', ...);
```

### Opção D: NGINX Config Issue (Production)

**Tempo Estimado:** 10-15 minutos
**Complexidade:** Baixa

```bash
# Editar config
sudo vim /etc/nginx/sites-enabled/bazari.conf

# Adicionar ou corrigir location block:
location /api/governance/ {
    proxy_pass http://localhost:3000/governance/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}

# Testar config
sudo nginx -t

# Recarregar NGINX
sudo systemctl reload nginx

# Verificar
curl -v http://localhost/api/governance/democracy/propose
```

---

## ✅ Verificação

**Checklist de Verificação:**

- [ ] **Sintaxe OK**: `pnpm exec tsc --noEmit` sem erros
- [ ] **Servidor inicia**: `pnpm dev` sem crashes
- [ ] **Endpoint responde**: `curl` retorna 200/201, não 404
- [ ] **Autenticação funciona**: Request sem token retorna 401
- [ ] **Validação funciona**: Request com dados inválidos retorna 400
- [ ] **Frontend funciona**: Testar na UI, não mostra erro 404
- [ ] **Testes passam**: `pnpm test` verde
- [ ] **Logs limpos**: Sem erros no console do servidor

**Comandos de Verificação:**

```bash
# 1. Type-check
cd /root/bazari/apps/api
pnpm exec tsc --noEmit

# 2. Teste manual (backend rodando)
curl -X POST http://localhost:3000/governance/democracy/propose \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <valid_token>" \
  -d '{"title":"Test","description":"Test description"}'

# Esperado: status 201, não 404

# 3. Teste no navegador
# Acessar frontend e tentar criar proposta
# Console não deve mostrar 404

# 4. Rodar testes
pnpm test governance

# 5. Verificar logs
tail -f /var/log/bazari/api.log
# Não deve ter 404 errors no endpoint fixado
```

---

## 📞 Escalação

**Se a solução não funcionar, escalar para:**

### Nível 1: Backend Team Lead
**Quando escalar:**
- Endpoint implementado mas ainda retorna 404
- Erros de TypeScript não resolvidos
- Lógica de negócio complexa necessária

**Informações para fornecer:**
- Error code: GOV-001 (ou similar)
- Endpoint afetado (method + path)
- Código implementado (link para branch/PR)
- Logs relevantes
- Passos já tentados neste runbook

### Nível 2: Tech Lead / Arquiteto
**Quando escalar:**
- Mudança de arquitetura necessária
- Endpoint requer integração complexa (blockchain, external API)
- Decisão sobre implementação simulada vs completa
- Impacto em outros módulos

### Nível 3: CTO
**Quando escalar:**
- Issue bloqueia release crítico
- Requer mudança de prioridades
- Afeta SLA com clientes
- Decisão de negócio necessária

---

## 🔗 Referências

**Documentação:**
- Error Template: [/30-operations/errors/README.md](/root/bazari/knowledge/30-operations/errors/README.md)
- Governance Module: [/10-modules/governance/](/root/bazari/knowledge/10-modules/governance/)
- API Blueprints: [/20-blueprints/module-blueprints/](/root/bazari/knowledge/20-blueprints/module-blueprints/)

**Exemplos:**
- GOV-001 Error Doc: [/30-operations/errors/by-module/governance/GOV-001-propose-endpoint-404.md](/root/bazari/knowledge/30-operations/errors/by-module/governance/GOV-001-propose-endpoint-404.md)
- Governance Routes: `apps/api/src/routes/governance.ts`

**Tools:**
- Fastify Docs: https://fastify.dev/
- Zod Validation: https://zod.dev/
- TypeScript Docs: https://www.typescriptlang.org/docs/

---

## 📝 Notas Adicionais

### Implementação Simulada vs Completa

**Quando usar simulada:**
- ✅ Desbloquear frontend urgentemente
- ✅ Validar fluxo end-to-end
- ✅ Integração com blockchain é complexa/lenta
- ✅ Prototipagem rápida

**Quando implementar completa:**
- ✅ Feature em produção
- ✅ Dados reais necessários
- ✅ Auditoria/compliance requerido
- ✅ Integração com outros sistemas

### Padrão de Response

**Sempre retornar formato consistente:**
```typescript
// Sucesso
{
  success: true,
  data: { ... },
  message: "Optional success message"
}

// Erro
{
  success: false,
  error: "Error message",
  details: { ... }  // Optional
}
```

### Status Codes Apropriados

- `200 OK` - GET bem-sucedido
- `201 Created` - POST cria recurso com sucesso
- `400 Bad Request` - Validação falhou
- `401 Unauthorized` - Autenticação ausente/inválida
- `403 Forbidden` - Autenticado mas sem permissão
- `404 Not Found` - Endpoint não existe
- `500 Internal Server Error` - Erro no servidor

---

**Última Revisão:** 2025-11-02
**Próxima Revisão:** 2025-12-02
**Feedback:** contato via issue tracker ou @backend-team no Slack
