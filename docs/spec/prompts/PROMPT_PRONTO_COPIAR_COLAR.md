# 🚀 PROMPT PRONTO - Copiar e Colar no Claude Code

## 📋 Prompt para Implementação Completa (Recomendado)

```
🎯 TAREFA: Implementar Marketplace do Afiliado - MVP Otimizado (2-3 semanas)

📖 CONTEXTO CRÍTICO:
70% da infraestrutura JÁ EXISTE no BazChat! Você vai REUTILIZAR e adicionar apenas o essencial.

📚 LEIA ESTES DOCUMENTOS PRIMEIRO (NA ORDEM):

1. /home/bazari/bazari/docs/APROVEITAMENTO_INFRAESTRUTURA_AFILIADOS.md
   → Entenda o que JÁ EXISTE e pode ser reutilizado

2. /home/bazari/bazari/docs/prompts/IMPLEMENTAR_MARKETPLACE_FASE1_OTIMIZADO.md
   → Guia detalhado do que REALMENTE precisa fazer

3. /home/bazari/bazari/docs/specs/BAZARI_AFFILIATE_MARKETPLACE_SPEC.md
   → Especificação completa (referência)

⚠️ REGRAS IMPORTANTES:
1. ❌ NÃO implemente blockchain - use CommissionService existente (mock)
2. ✅ REUTILIZE ao máximo: CommissionService, ChatStoreAffiliate, AffiliateStatsWorker
3. ✅ FOCO: Adicionar apenas 2 tabelas + 7 endpoints + 3 páginas
4. ✅ USE TodoWrite para rastrear TODAS as tarefas do checklist
5. ❌ NÃO adicione features extras - siga EXATAMENTE o guia

📋 CHECKLIST (use TodoWrite):
- [ ] Migration Prisma (2 tabelas + renomear ChatSale)
- [ ] Modificar CommissionService (5 linhas)
- [ ] Estender AffiliateStatsWorker (15 linhas)
- [ ] Criar rotas API (7 endpoints)
- [ ] Página pública vitrine
- [ ] Dashboard afiliado
- [ ] Modal criar marketplace
- [ ] Modal adicionar produto
- [ ] Testes E2E

⏱️ ESTIMATIVA: 10-14 dias (2-3 semanas)

🚀 COMECE PELA MIGRATION PRISMA (Parte 1.1 do guia otimizado)

Se tiver dúvidas, PERGUNTE antes de implementar.
```

---

## 📋 Prompt Apenas Backend (Se preferir fazer em etapas)

```
🎯 TAREFA: Implementar Backend do Marketplace do Afiliado (1 semana)

📖 Leia o guia completo:
/home/bazari/bazari/docs/prompts/IMPLEMENTAR_MARKETPLACE_FASE1_OTIMIZADO.md

Implemente APENAS a PARTE 1 (Backend):

✅ CHECKLIST (use TodoWrite):
- [ ] 1.1 Migration Prisma
  - Adicionar AffiliateMarketplace
  - Adicionar AffiliateProduct
  - Renomear ChatSale → AffiliateSale
  - Adicionar relação em Profile
  - Rodar: npx prisma migrate dev

- [ ] 1.2 Modificar CommissionService
  - Adicionar parâmetro marketplaceId
  - Atualizar referências chatSale → affiliateSale

- [ ] 1.3 Estender AffiliateStatsWorker
  - Adicionar update de marketplace stats

- [ ] 1.4 Criar rotas da API
  - POST /marketplaces (criar)
  - GET /marketplaces/:slug (público)
  - PUT /marketplaces/:id (atualizar)
  - POST /marketplaces/:id/products (adicionar)
  - DELETE /marketplaces/:id/products/:productId
  - GET /marketplaces/:id/analytics
  - GET /products (afiliáveis)
  - Registrar em server.ts

⚠️ IMPORTANTE:
- NÃO implemente blockchain
- REUTILIZE CommissionService existente
- Código completo está no guia (copiar/adaptar)

Quando terminar, me avise para revisar antes de ir pro frontend.
```

---

## 📋 Prompt Apenas Frontend (Após backend pronto)

```
🎯 TAREFA: Implementar Frontend do Marketplace do Afiliado (1-2 semanas)

📖 Leia o guia completo:
/home/bazari/bazari/docs/prompts/IMPLEMENTAR_MARKETPLACE_FASE1_OTIMIZADO.md

Implemente APENAS a PARTE 2 (Frontend):

✅ CHECKLIST (use TodoWrite):
- [ ] 2.1 AffiliateMarketplacePage
  - Página pública (/@:slug)
  - Header com branding
  - Grid de produtos
  - ProductCard
  - Adicionar rota em App.tsx

- [ ] 2.2 AffiliateDashboardPage
  - Dashboard do afiliado
  - Estatísticas (4 cards)
  - Top produtos
  - Botões de ação

- [ ] 2.3 CreateMarketplaceDialog
  - Form (nome, slug, descrição)
  - Auto-gerar slug
  - Validação

- [ ] 2.4 AddProductDialog
  - Buscar produtos afiliáveis
  - Grid de produtos
  - Adicionar à vitrine

⚠️ IMPORTANTE:
- Use componentes shadcn/ui existentes
- Código completo está no guia (copiar/adaptar)
- Teste cada página antes de avançar

Quando terminar, teste o fluxo completo E2E.
```

---

## 📋 Prompt de Teste (Após tudo pronto)

```
🧪 TAREFA: Testar Fluxo Completo do Marketplace

Teste o seguinte fluxo E2E:

1. ✅ Criar marketplace
   - Acessar http://localhost:5173
   - Login
   - Ir para dashboard afiliado
   - Criar marketplace "Loja Teste" (slug: loja-teste)
   - Verificar criação no banco

2. ✅ Adicionar produtos
   - Clicar "Adicionar Produtos"
   - Buscar produtos
   - Adicionar 3 produtos
   - Verificar no banco

3. ✅ Acessar vitrine pública
   - Abrir /@loja-teste
   - Verificar header, produtos
   - Clicar em "Comprar" (simular)

4. ✅ Verificar split de pagamentos
   - Simular compra com tracking de afiliado
   - Verificar registro em AffiliateSale
   - Verificar marketplaceId preenchido
   - Verificar split correto (seller/afiliado/bazari)

5. ✅ Ver estatísticas
   - Voltar ao dashboard
   - Verificar estatísticas atualizadas
   - Verificar top produtos

Se algum passo falhar, me mostre o erro completo.
```

---

## 🎯 Como Usar

### Opção 1: Implementação Completa (Recomendado)
1. Copie o **primeiro prompt** (Implementação Completa)
2. Cole em nova conversa com Claude Code
3. Deixe Claude implementar tudo seguindo o guia

### Opção 2: Por Etapas
1. Use o prompt "Apenas Backend" primeiro
2. Revise o código gerado
3. Use o prompt "Apenas Frontend"
4. Use o prompt "Teste"

### Opção 3: Paralelo (Se tiver 2+ Claude Codes)
- Claude 1: Backend
- Claude 2: Frontend
- Você: Integração final

---

## 📊 Estimativas

| Abordagem | Tempo | Vantagem |
|-----------|-------|----------|
| **Completa** | 10-14 dias | Mais rápido, menos coordenação |
| **Por etapas** | 12-16 dias | Mais controle, revisão incremental |
| **Paralelo** | 7-10 dias | Mais rápido, requer coordenação |

---

## ✅ Próximos Passos

1. Escolha uma das opções acima
2. Copie o prompt correspondente
3. Abra nova conversa com Claude Code
4. Cole o prompt
5. Aguarde Claude ler os documentos
6. Revise o plano que ele vai propor
7. Aprove e deixe ele implementar

---

**Boa implementação! 🚀**
