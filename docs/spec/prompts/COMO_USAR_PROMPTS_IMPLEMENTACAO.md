# 📘 Como Passar Especificações para Claude Code Implementar

## 🎯 Estratégia Recomendada

### Opção 1: Prompt Direto (Melhor para MVP)

**Como fazer:**
1. Abra o Claude Code
2. Cole o seguinte comando:

```
Leia a especificação completa em /home/bazari/bazari/docs/specs/BAZARI_AFFILIATE_MARKETPLACE_SPEC.md

Depois leia o guia de implementação da Fase 1 em /home/bazari/bazari/docs/prompts/IMPLEMENTAR_MARKETPLACE_AFILIADO_FASE1.md

Implemente TUDO da Fase 1 seguindo rigorosamente o checklist. Use a ferramenta TodoWrite para rastrear o progresso.

Comece pela PARTE 1 (Blockchain), depois PARTE 2 (Backend), depois PARTE 3 (Frontend).

Se tiver dúvidas, pergunte ANTES de implementar.
```

**Vantagens:**
- ✅ Contexto completo desde o início
- ✅ Claude segue o checklist estruturado
- ✅ Usa TodoWrite para rastrear progresso
- ✅ Implementação incremental e testada

---

### Opção 2: Implementação Faseada (Melhor para Grandes Projetos)

**Fase por fase:**

#### Passo 1: Blockchain
```
Leia /home/bazari/bazari/docs/prompts/IMPLEMENTAR_MARKETPLACE_AFILIADO_FASE1.md

Implemente APENAS a PARTE 1 (Blockchain - BazariChain):
- Criar pallet bazari-commerce
- Implementar extrinsics e storage
- Escrever testes unitários
- Integrar no runtime

Use TodoWrite para rastrear. Me avise quando terminar os testes passarem.
```

#### Passo 2: Backend
```
Agora implemente a PARTE 2 (Backend):
- Schema Prisma
- Rotas da API
- Serviço de blockchain
- Worker de sync

Reutilize o BazariChainService se já existir em src/services/.
```

#### Passo 3: Frontend
```
Finalmente, implemente a PARTE 3 (Frontend):
- Página pública da vitrine
- Dashboard do afiliado
- Modais de criação

Use componentes shadcn/ui existentes.
```

**Vantagens:**
- ✅ Controle granular
- ✅ Testa cada camada antes de avançar
- ✅ Reduz erros de contexto
- ✅ Fácil de revisar

---

### Opção 3: Implementação Paralela (Para Times)

**Se tiver múltiplos Claude Codes (ou desenvolvedores):**

**Claude 1 (Blockchain):**
```
Implemente apenas a PARTE 1 do guia em /home/bazari/bazari/docs/prompts/IMPLEMENTAR_MARKETPLACE_AFILIADO_FASE1.md
```

**Claude 2 (Backend):**
```
Implemente apenas a PARTE 2, assumindo que o pallet bazari-commerce já existe e funciona.
```

**Claude 3 (Frontend):**
```
Implemente apenas a PARTE 3, assumindo que a API já está pronta.
```

**Vantagens:**
- ✅ Desenvolvimento paralelo
- ✅ Mais rápido
- ⚠️ Requer coordenação

---

## 📋 Checklist de Uso

### Antes de Começar:

- [ ] Leia a especificação completa (`BAZARI_AFFILIATE_MARKETPLACE_SPEC.md`)
- [ ] Revise o guia de implementação (`IMPLEMENTAR_MARKETPLACE_AFILIADO_FASE1.md`)
- [ ] Configure variáveis de ambiente (`.env`)
- [ ] Tenha a blockchain rodando em dev (`~/bazari-chain`)
- [ ] Tenha o banco PostgreSQL rodando

### Durante a Implementação:

- [ ] Claude está usando TodoWrite para rastrear?
- [ ] Os testes unitários estão passando?
- [ ] Cada commit tem mensagem descritiva?
- [ ] Revise o código antes de avançar para próxima parte

### Após Concluir:

- [ ] Rode todos os testes (`cargo test`, `pnpm test`)
- [ ] Teste o fluxo completo manualmente
- [ ] Verifique se eventos da chain estão sendo sincronizados
- [ ] Documente qualquer desvio da especificação

---

## 🎨 Dicas para Melhor Resultado

### 1. Seja Específico nos Prompts

❌ **Ruim:**
```
Implemente o sistema de afiliados
```

✅ **Bom:**
```
Leia /docs/prompts/IMPLEMENTAR_MARKETPLACE_AFILIADO_FASE1.md e implemente a PARTE 1 (Blockchain).

Checklist:
- Criar pallet em ~/bazari-chain/pallets/bazari-commerce/
- Implementar extrinsics: set_commission_policy, create_sale
- Escrever 5 testes unitários
- Integrar no runtime

Use TodoWrite para rastrear.
```

### 2. Forneça Contexto de Arquitetura

Sempre mencione:
- Localização dos arquivos (`~/bazari-chain`, `~/bazari/apps/api`)
- Tecnologias usadas (Substrate, Fastify, React)
- Padrões existentes (ex: "use o mesmo padrão de pallet_stores")

### 3. Peça Testes Desde o Início

```
Após implementar cada extrinsic, escreva um teste unitário que valida:
1. Caso de sucesso
2. Casos de erro (não autorizado, valor inválido)
```

### 4. Use TodoWrite para Rastreamento

```
Crie uma lista de tarefas com TodoWrite:
- [ ] Criar struct CommissionPolicy
- [ ] Implementar extrinsic set_commission_policy
- [ ] Escrever teste test_set_commission_policy_works
- [ ] ...
```

### 5. Peça Revisão Incremental

```
Após implementar a PARTE 1, me mostre:
1. Resumo do que foi feito
2. Testes que estão passando
3. Qualquer decisão técnica que tomou
```

---

## 🚨 Problemas Comuns e Soluções

### Problema: Claude não encontra os arquivos

**Solução:**
```
Os arquivos estão em:
- Spec: /home/bazari/bazari/docs/specs/BAZARI_AFFILIATE_MARKETPLACE_SPEC.md
- Guia: /home/bazari/bazari/docs/prompts/IMPLEMENTAR_MARKETPLACE_AFILIADO_FASE1.md

Use a ferramenta Read para ler ambos antes de começar.
```

### Problema: Claude desvia da especificação

**Solução:**
```
IMPORTANTE: Siga EXATAMENTE a especificação.
Não adicione funcionalidades extras.
Não mude nomes de structs/tabelas.
Se precisar fazer alterações, me consulte primeiro.
```

### Problema: Testes não passam

**Solução:**
```
Rode os testes com verbose:
cargo test -p bazari-commerce -- --nocapture

Me mostre o output completo para debugar.
```

### Problema: Integração blockchain não funciona

**Solução:**
```
Verifique:
1. A blockchain está rodando? (./target/release/bazari-chain --dev)
2. O CHAIN_WS_URL está correto no .env?
3. O CHAIN_SIGNER_SEED está configurado?

Teste a conexão com:
pnpm tsx src/scripts/test-chain-connection.ts
```

---

## 📦 Exemplos de Prompts Prontos

### Prompt Completo (Fase 1 Inteira)

```
📋 TAREFA: Implementar Marketplace do Afiliado - Fase 1 (MVP)

1. Leia a especificação:
   /home/bazari/bazari/docs/specs/BAZARI_AFFILIATE_MARKETPLACE_SPEC.md

2. Leia o guia de implementação:
   /home/bazari/bazari/docs/prompts/IMPLEMENTAR_MARKETPLACE_AFILIADO_FASE1.md

3. Implemente seguindo o checklist do guia:
   - PARTE 1: Blockchain (pallet bazari-commerce)
   - PARTE 2: Backend (API + Prisma + Worker)
   - PARTE 3: Frontend (Vitrine + Dashboard)

4. Use TodoWrite para rastrear progresso de TODAS as tarefas

5. Rode testes após cada parte:
   - Blockchain: cargo test -p bazari-commerce
   - Backend: pnpm test
   - Frontend: verificação manual

6. Me avise quando cada PARTE estiver completa para eu revisar

IMPORTANTE:
- Siga EXATAMENTE a especificação
- Não pule testes
- Não adicione features extras
- Pergunte se tiver dúvidas

Comece pela PARTE 1 (Blockchain).
```

### Prompt Apenas Blockchain

```
Leia /home/bazari/bazari/docs/prompts/IMPLEMENTAR_MARKETPLACE_AFILIADO_FASE1.md

Implemente APENAS a PARTE 1 (Blockchain):

Crie o pallet bazari-commerce em ~/bazari-chain/pallets/bazari-commerce/ com:

1. Arquivos:
   - Cargo.toml
   - src/lib.rs
   - src/mock.rs
   - src/tests.rs

2. Implementar em lib.rs:
   - Storage (CommissionPolicies, Sales, AffiliateStatsMap)
   - Extrinsics (set_commission_policy, create_sale)
   - Events (CommissionPolicySet, SaleCompleted)
   - Errors

3. Escrever 5 testes em tests.rs:
   - test_set_commission_policy_works
   - test_create_sale_with_split_works
   - test_commission_too_high_fails
   - test_not_store_owner_fails
   - test_affiliate_stats_updated

4. Integrar no runtime (~/bazari-chain/runtime/src/lib.rs)

Use TodoWrite. Rode cargo test ao final.
```

### Prompt Apenas Backend

```
Leia /home/bazari/bazari/docs/prompts/IMPLEMENTAR_MARKETPLACE_AFILIADO_FASE1.md

Implemente APENAS a PARTE 2 (Backend):

1. Schema Prisma (~/bazari/apps/api/prisma/schema.prisma):
   - AffiliateMarketplace
   - AffiliateProduct
   - AffiliateSale
   - StoreCommissionPolicy

2. Rotas (~/bazari/apps/api/src/routes/affiliates.ts):
   - POST /marketplaces (criar)
   - GET /marketplaces/:slug (obter público)
   - PUT /marketplaces/:id (atualizar)
   - POST /marketplaces/:id/products (adicionar produto)
   - DELETE /marketplaces/:id/products/:productId (remover)
   - GET /marketplaces/:id/analytics (estatísticas)
   - GET /products (listar afiliáveis)

3. Serviço blockchain (~/bazari/apps/api/src/services/bazari-chain.ts):
   - createSale
   - getCommissionPolicy
   - setCommissionPolicy
   - subscribeToEvents

4. Worker de sync (~/bazari/apps/api/src/workers/chain-sync.worker.ts)

Rode: npx prisma migrate dev && pnpm dev
```

### Prompt Apenas Frontend

```
Leia /home/bazari/bazari/docs/prompts/IMPLEMENTAR_MARKETPLACE_AFILIADO_FASE1.md

Implemente APENAS a PARTE 3 (Frontend):

1. Página pública (~/bazari/apps/web/src/pages/AffiliateMarketplacePage.tsx):
   - Header com logo/nome/descrição
   - Grid de produtos
   - ProductCard com botão "Comprar"
   - Rota /@:slug

2. Dashboard (~/bazari/apps/web/src/pages/affiliate/AffiliateDashboardPage.tsx):
   - Estatísticas (vendas, receita, comissão)
   - Lista de produtos
   - Botão "Adicionar Produtos"
   - Botão "Criar Marketplace" se não existir

3. Modal (~/bazari/apps/web/src/components/affiliates/CreateMarketplaceDialog.tsx):
   - Form (nome, slug, descrição)
   - Validação de slug
   - Submit para API

Use componentes shadcn/ui existentes.
Teste em http://localhost:5173
```

---

## 🎯 Template de Prompt Ideal

```
📋 TAREFA: [Nome da tarefa]

📖 CONTEXTO:
- Leia: [caminho da spec]
- Leia: [caminho do guia]

✅ CHECKLIST:
- [ ] Item 1
- [ ] Item 2
- [ ] Item 3

⚙️ TECNOLOGIAS:
- Linguagem: [Rust/TypeScript]
- Framework: [Substrate/Fastify/React]
- Localização: [~/caminho]

🧪 TESTES:
- Comando: [cargo test / pnpm test]
- Critério de sucesso: [todos passando]

📝 RASTREAMENTO:
- Use TodoWrite para rastrear progresso
- Me avise quando concluir cada seção

⚠️ IMPORTANTE:
- Siga EXATAMENTE a especificação
- Não adicione features extras
- Pergunte antes de desviar

🚀 COMECE AGORA
```

---

## 📚 Recursos Adicionais

### Documentos Relacionados:
- Especificação completa: `/docs/specs/BAZARI_AFFILIATE_MARKETPLACE_SPEC.md`
- Guia Fase 1: `/docs/prompts/IMPLEMENTAR_MARKETPLACE_AFILIADO_FASE1.md`
- Arquitetura blockchain: `/docs/specs/BAZCHAT_BLOCKCHAIN_REQUIREMENTS.md`

### Comandos Úteis:
```bash
# Blockchain
cd ~/bazari-chain
cargo test -p bazari-commerce
cargo build --release
./target/release/bazari-chain --dev

# Backend
cd ~/bazari/apps/api
npx prisma migrate dev
pnpm dev

# Frontend
cd ~/bazari/apps/web
pnpm dev
```

---

**Boa implementação! 🚀**
