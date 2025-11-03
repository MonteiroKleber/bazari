# Bazari Platform - Error Catalog

Este diretório contém documentação estruturada de todos os erros conhecidos da plataforma Bazari, suas causas raízes, soluções e impactos.

---

## 📁 Estrutura de Organização

### Por Módulo (`/by-module/`)
Erros organizados pelo módulo afetado:
- **[governance/](/root/bazari/knowledge/30-operations/errors/by-module/governance/)** - Erros de governança DAO
- **auth/** - Erros de autenticação
- **marketplace/** - Erros de marketplace
- **orders/** - Erros de pedidos e escrow
- **blockchain/** - Erros de integração blockchain

### Por Severidade (`/by-severity/`)
- **critical/** - P0: Sistema down, perda de dados
- **high/** - P1: Feature bloqueada, impacto grande
- **medium/** - P2: Degradação de performance
- **low/** - P3: Issues cosméticos

### Por Tipo (`/by-type/`)
- **database/** - Erros de PostgreSQL, Prisma
- **network/** - Timeouts, conexões, latência
- **validation/** - Input validation, Zod errors
- **authentication/** - Auth, JWT, SIWS errors
- **authorization/** - Permission denied, ownership
- **blockchain/** - Chain errors, extrinsics
- **integration/** - External APIs (PIX, email, SMS)

---

## 📊 Erros Catalogados

### Governance (GOV)

| Código | Título | Severidade | Status | Primeira Ocorrência |
|--------|--------|------------|--------|---------------------|
| **[GOV-001](by-module/governance/GOV-001-propose-endpoint-404.md)** | Proposal Creation Endpoint Not Found (404) | High | ✅ Resolved | 2025-11-02 |

---

## 🏷️ Convenção de Nomenclatura

### Código de Erro
```
{MODULE}-{NUMBER}-{slug}
```

**Exemplos:**
- `GOV-001-propose-endpoint-404` - Governance, erro #1, endpoint não encontrado
- `AUTH-003-token-rotation-failed` - Auth, erro #3, rotação de token falhou
- `ORDER-042-escrow-timeout` - Orders, erro #42, timeout de escrow
- `CHAIN-007-extrinsic-failed` - Blockchain, erro #7, extrinsic falhou

### Severidades

| Nível | Nome | Descrição | Exemplo |
|-------|------|-----------|---------|
| **P0** | **Critical** | Sistema completamente down, perda de dados | Database down, blockchain node crash |
| **P1** | **High** | Feature principal bloqueada, >50% usuários afetados | Login não funciona, checkout bloqueado |
| **P2** | **Medium** | Degradação de performance, <50% usuários afetados | API lenta, search não otimizado |
| **P3** | **Low** | Issues cosméticos, workaround disponível | Typo na UI, ícone errado |

---

## 📝 Template de Documentação de Erro

Ao documentar um novo erro, use o template abaixo:

```markdown
# {CODE}: {Error Title}

**Módulo:** {module}
**Severidade:** Critical | High | Medium | Low
**Tipo:** database | network | validation | authentication | authorization | blockchain | integration
**Primeira Ocorrência:** YYYY-MM-DD
**Última Ocorrência:** YYYY-MM-DD
**Frequência:** {número} vezes / {período}
**Status:** Active | Resolved | Monitoring

---

## 🔴 Descrição do Erro
{Descrição detalhada}

## 🔍 Sintomas
- Sintoma 1
- Sintoma 2

## 🎯 Causa Raiz
{Explicação técnica da causa}

## 📊 Impacto
**Usuários Afetados:** {número ou %}
**Downtime:** {tempo}
**Módulos Impactados:** {lista}

## 🔧 Solução Imediata (Workaround)
```bash
# Comandos
```

## ✅ Solução Definitiva
```bash
# Comandos ou código
```

## 🚨 Detecção
**Log pattern:** `{regex}`
**Métrica:** `{prometheus query}`

## 🔗 Referências
- Issue: #{number}
- PR: #{number}
- Runbook: [link]

## 📚 Histórico
| Data | Ocorrências | Ação | Resultado |
|------|-------------|------|-----------|
| ... | ... | ... | ... |

## 🛡️ Prevenção
- [ ] Ação preventiva 1
- [ ] Ação preventiva 2
```

**Arquivo de exemplo:** [GOV-001-propose-endpoint-404.md](by-module/governance/GOV-001-propose-endpoint-404.md)

---

## 🔍 Como Usar Este Catálogo

### Para Desenvolvedores

**Reportar novo erro:**
1. Criar arquivo em `/by-module/{module}/{CODE}-{slug}.md`
2. Preencher template completo
3. Adicionar entrada neste README
4. Criar issue no GitHub com link para doc
5. Adicionar alert no Prometheus (se aplicável)

**Investigar erro existente:**
1. Buscar por código ou palavras-chave
2. Ler seção de "Causa Raiz"
3. Seguir "Solução Imediata" para hotfix
4. Seguir "Solução Definitiva" para fix permanente
5. Verificar seção de "Prevenção"

**Resolver erro:**
1. Atualizar documento com solução aplicada
2. Atualizar Status para "Resolved"
3. Adicionar entrada na tabela de Histórico
4. Fechar issue relacionado

### Para DevOps

**Configurar monitoramento:**
1. Ler seção "Detecção" do erro
2. Adicionar alert no Prometheus
3. Configurar dashboard no Grafana
4. Adicionar runbook_url no alert

**Responder a incidente:**
1. Identificar código do erro via alert
2. Abrir documento do erro
3. Seguir runbook linkado
4. Documentar ações tomadas no Histórico

### Para Product Managers

**Entender impacto:**
1. Filtrar erros por Status: Active
2. Ordenar por Severidade
3. Ver "Impacto" de cada erro
4. Priorizar fixes no roadmap

---

## 📈 Estatísticas

### Por Severidade

| Severidade | Quantidade | % do Total |
|------------|------------|------------|
| Critical (P0) | 0 | 0% |
| High (P1) | 1 | 100% |
| Medium (P2) | 0 | 0% |
| Low (P3) | 0 | 0% |
| **Total** | **1** | **100%** |

### Por Status

| Status | Quantidade | % do Total |
|--------|------------|------------|
| Active | 0 | 0% |
| Resolved | 1 | 100% |
| Monitoring | 0 | 0% |
| **Total** | **1** | **100%** |

### Por Módulo

| Módulo | Erros | Críticos | Resolvidos |
|--------|-------|----------|------------|
| governance | 1 | 0 | 1 |
| **Total** | **1** | **0** | **1** |

---

## 🔗 Recursos Relacionados

### Documentação
- **[Solutions & Runbooks](/root/bazari/knowledge/30-operations/solutions/runbooks/)** - Playbooks para resolver erros
- **[Incidents](/root/bazari/knowledge/30-operations/incidents/)** - Post-mortems de incidentes
- **[Impacts](/root/bazari/knowledge/30-operations/impacts/)** - Análise de impactos de mudanças
- **[Module Docs](/root/bazari/knowledge/10-modules/)** - Documentação de módulos
- **[Architecture](/root/bazari/knowledge/20-blueprints/architecture/)** - Diagramas de arquitetura

### Tools
- **Prometheus Alerts**: `http://prometheus.bazari.xyz/alerts`
- **Grafana Dashboards**: `http://grafana.bazari.xyz/dashboards`
- **Issue Tracker**: `https://github.com/{org}/bazari/issues`
- **Slack Channel**: `#incidents` ou `#platform-alerts`

---

## 🤝 Contribuindo

### Adicionar Novo Erro

```bash
# 1. Criar branch
git checkout -b docs/error-{CODE}

# 2. Criar arquivo do erro
cp 30-operations/errors/template.md \
   30-operations/errors/by-module/{module}/{CODE}-{slug}.md

# 3. Preencher template completo
vim 30-operations/errors/by-module/{module}/{CODE}-{slug}.md

# 4. Atualizar README (este arquivo)
vim 30-operations/errors/README.md

# 5. Commit e push
git add 30-operations/errors/
git commit -m "docs(errors): add {CODE} - {title}"
git push origin docs/error-{CODE}

# 6. Criar PR
```

### Atualizar Erro Existente

```bash
# Sempre atualizar:
# - Data de "Última Ocorrência"
# - Tabela de "Histórico"
# - Status (se mudou)
# - Seção de "Solução" (se nova solução aplicada)
```

---

## 📞 Suporte

**Dúvidas sobre este catálogo:**
- **Slack:** `#platform-docs` ou `#backend-team`
- **Email:** dev@bazari.xyz
- **Issue:** Abrir issue com label `documentation`

**Reportar erro não catalogado:**
- **Slack:** `#incidents` (urgente) ou `#platform-team`
- **Issue:** Criar issue com label `bug` + severity label

---

**Última Atualização:** 2025-11-02
**Maintainer:** Platform Team
**Version:** 1.0.0
