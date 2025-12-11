# 🤖 Prompts para Claude Code - Sistema de Afiliados

## 📋 FASE 1: Schema e Migração

### Prompt 1.1: Criar Tabela ChatStoreAffiliate

```
Implementar FASE 1 do Sistema de Afiliados - Schema de Banco de Dados

Repositório: ~/bazari
Documento de referência: ~/bazari/docs/specs/BAZCHAT_AFFILIATE_SYSTEM_SPEC.md

OBJETIVO:
Criar a tabela ChatStoreAffiliate e ChatAffiliateInvite no schema Prisma.

EXECUTAR NA ORDEM:

1. Atualizar ~/bazari/apps/api/prisma/schema.prisma
   - Adicionar model ChatStoreAffiliate conforme spec
   - Adicionar model ChatAffiliateInvite conforme spec
   - Verificar relações com Profile

2. Gerar migração
   - Executar: npx prisma migrate dev --name add_affiliate_system
   - Verificar se a migração foi criada corretamente

3. Gerar cliente Prisma
   - Executar: npx prisma generate

4. Verificar compilação
   - Executar: pnpm exec tsc --noEmit (no diretório apps/api)

VALIDAÇÃO:
- Tabelas criadas no banco de dados
- Cliente Prisma regenerado
- Sem erros de TypeScript
```

---

## 🔧 FASE 2: Backend API - Endpoints do Dono da Loja

### Prompt 2.1: Endpoints de Gerenciamento

```
Implementar FASE 2.1 do Sistema de Afiliados - Endpoints do Dono da Loja

Repositório: ~/bazari
Documento de referência: ~/bazari/docs/specs/BAZCHAT_AFFILIATE_SYSTEM_SPEC.md

PRÉ-REQUISITO: FASE 1 deve estar completa

OBJETIVO:
Criar endpoints para donos de loja gerenciarem afiliados.

EXECUTAR NA ORDEM:

1. Criar arquivo ~/bazari/apps/api/src/chat/routes/chat.affiliates.ts

2. Implementar endpoints:
   - GET /api/chat/affiliates/store/:storeId
     → Listar afiliados (com filtro por status)
     → Validar que usuário é dono da loja
     → Suportar paginação (cursor-based)

   - POST /api/chat/affiliates/store/:storeId/approve
     → Aprovar solicitação
     → Permitir customCommission e monthlySalesCap
     → Atualizar status e timestamps

   - POST /api/chat/affiliates/store/:storeId/reject
     → Rejeitar solicitação
     → Salvar motivo em notes

   - POST /api/chat/affiliates/store/:storeId/suspend
     → Suspender afiliado ativo
     → Salvar motivo

   - PUT /api/chat/affiliates/store/:storeId/:affiliateId
     → Atualizar configurações (comissão, limites)

3. Registrar rotas em ~/bazari/apps/api/src/server.ts
   - Import: import chatAffiliatesRoutes from './chat/routes/chat.affiliates.js'
   - Register: await app.register(chatAffiliatesRoutes, { prefix: '/api' })

4. Testar endpoints
   - GET para listar
   - POST para aprovar
   - Verificar validações

VALIDAÇÃO:
- Endpoints respondem corretamente
- Validações funcionando
- Apenas dono da loja pode gerenciar
```

### Prompt 2.2: Endpoints do Promotor

```
Implementar FASE 2.2 do Sistema de Afiliados - Endpoints do Promotor

Repositório: ~/bazari
Documento de referência: ~/bazari/docs/specs/BAZCHAT_AFFILIATE_SYSTEM_SPEC.md

PRÉ-REQUISITO: FASE 2.1 deve estar completa

OBJETIVO:
Criar endpoints para promotores solicitarem e gerenciarem afiliações.

EXECUTAR NA ORDEM:

1. Adicionar ao arquivo ~/bazari/apps/api/src/chat/routes/chat.affiliates.ts

2. Implementar endpoints:
   - POST /api/chat/affiliates/request
     → Solicitar afiliação a uma loja
     → Validar que não existe solicitação duplicada
     → Status inicial: "pending"

   - GET /api/chat/affiliates/me
     → Listar afiliações do usuário logado
     → Filtrar por status (pending/approved/rejected)
     → Incluir info da loja

   - DELETE /api/chat/affiliates/:affiliateId
     → Cancelar solicitação pendente OU
     → Desafiliar-se (se aprovado)
     → Validar que pertence ao usuário

3. Testar endpoints
   - Solicitar afiliação
   - Listar minhas afiliações
   - Cancelar solicitação

VALIDAÇÃO:
- Promotor pode solicitar afiliação
- Não permite duplicatas
- Pode cancelar suas próprias solicitações
```

### Prompt 2.3: Validação em Criar Proposta

```
Implementar FASE 2.3 do Sistema de Afiliados - Validação em Propostas

Repositório: ~/bazari
Documento de referência: ~/bazari/docs/specs/BAZCHAT_AFFILIATE_SYSTEM_SPEC.md

PRÉ-REQUISITO: FASE 2.2 deve estar completa

OBJETIVO:
Atualizar endpoint de criar proposta para validar afiliados.

EXECUTAR NA ORDEM:

1. Atualizar ~/bazari/apps/api/src/chat/routes/chat.orders.ts

2. Modificar validação de política (linha ~153):
   - Se policy.mode === 'affiliates':
     → Buscar ChatStoreAffiliate
     → Validar que status === 'approved'
     → Usar customCommission se configurada
     → Validar monthlySalesCap se configurado

3. Implementar função auxiliar getAffiliateMonthSales:
   - Calcular vendas do mês atual deste afiliado
   - Somar ChatSale.amount onde promoter = affiliateId

4. Testar fluxo completo:
   - Modo affiliates + não aprovado → erro 403
   - Modo affiliates + aprovado → sucesso
   - Comissão customizada aplicada corretamente

VALIDAÇÃO:
- Apenas afiliados aprovados podem criar propostas
- Comissão customizada é respeitada
- Limite mensal funciona
```

---

## 🎨 FASE 3: Frontend UI

### Prompt 3.1: Página de Gerenciar Afiliados

```
Implementar FASE 3.1 do Sistema de Afiliados - Página do Dono da Loja

Repositório: ~/bazari
Documento de referência: ~/bazari/docs/specs/BAZCHAT_AFFILIATE_SYSTEM_SPEC.md

PRÉ-REQUISITO: FASE 2 completa (Backend API)

OBJETIVO:
Criar página para dono da loja gerenciar afiliados.

EXECUTAR NA ORDEM:

1. Criar ~/bazari/apps/web/src/pages/seller/AffiliatesPage.tsx
   - Usar shadcn/ui: Tabs, Card, Button, Badge
   - Tabs: Pendentes | Aprovados | Rejeitados
   - Listar afiliados usando API GET /api/chat/affiliates/store/:storeId

2. Criar ~/bazari/apps/web/src/components/affiliates/AffiliateRequestCard.tsx
   - Mostrar: avatar, handle, data solicitação
   - Botões: Aprovar | Rejeitar
   - Modal para definir comissão customizada

3. Criar ~/bazari/apps/web/src/components/affiliates/ApproveAffiliateDialog.tsx
   - Form: customCommission (slider 0-20%)
   - Form: monthlySalesCap (opcional)
   - Form: notes (textarea)
   - Submit → POST /api/chat/affiliates/store/:storeId/approve

4. Integrar em ~/bazari/apps/web/src/App.tsx
   - Adicionar rota: /app/seller/affiliates
   - Importar: import { AffiliatesPage } from './pages/seller/AffiliatesPage'

5. Adicionar link em ~/bazari/apps/web/src/pages/SellerManagePage.tsx
   - Tab Settings → Nova seção "Programa de Afiliados"
   - Botão → Link para /app/seller/affiliates

VALIDAÇÃO:
- Página carrega lista de solicitações
- Aprovar funciona e atualiza UI
- Rejeitar funciona
- Badges de status corretos
```

### Prompt 3.2: Página Minhas Afiliações

```
Implementar FASE 3.2 do Sistema de Afiliados - Página do Promotor

Repositório: ~/bazari
Documento de referência: ~/bazari/docs/specs/BAZCHAT_AFFILIATE_SYSTEM_SPEC.md

PRÉ-REQUISITO: FASE 3.1 completa

OBJETIVO:
Criar página para promotor ver e solicitar afiliações.

EXECUTAR NA ORDEM:

1. Criar ~/bazari/apps/web/src/pages/promoter/MyAffiliationsPage.tsx
   - Tabs: Ativas | Pendentes
   - Botão: "+ Solicitar Afiliação"

2. Criar ~/bazari/apps/web/src/components/affiliates/StoreSearchDialog.tsx
   - Input de busca
   - Grid de lojas
   - Botão "Solicitar" por loja
   - Submit → POST /api/chat/affiliates/request

3. Criar ~/bazari/apps/web/src/components/affiliates/AffiliationCard.tsx
   - Mostrar: nome loja, comissão, estatísticas
   - Badge de status
   - Botão "Ver Loja" → /loja/:slug
   - Botão "Desafiliar" (se ativo)

4. Adicionar rota em ~/bazari/apps/web/src/App.tsx
   - /app/promoter/affiliates

5. Adicionar link no menu/dashboard

VALIDAÇÃO:
- Pode buscar lojas
- Solicitar afiliação funciona
- Ver status das solicitações
- Desafiliar funciona
```

### Prompt 3.3: Integração com CreateProposalDialog

```
Implementar FASE 3.3 do Sistema de Afiliados - UI em Criar Proposta

Repositório: ~/bazari
Documento de referência: ~/bazari/docs/specs/BAZCHAT_AFFILIATE_SYSTEM_SPEC.md

PRÉ-REQUISITO: FASE 3.2 completa

OBJETIVO:
Mostrar status de afiliado ao criar proposta.

EXECUTAR NA ORDEM:

1. Criar ~/bazari/apps/web/src/components/affiliates/AffiliateStatusBanner.tsx
   - Props: storeId, mode
   - Buscar status via GET /api/chat/affiliates/me
   - Filtrar por storeId

2. Casos:
   - Não afiliado + modo 'affiliates' →
     Alert vermelho + Botão "Solicitar Afiliação"

   - Pendente + modo 'affiliates' →
     Alert amarelo "Aguardando aprovação"

   - Aprovado + modo 'affiliates' →
     Alert verde "Afiliado Aprovado - Comissão X%"

   - Rejeitado + modo 'affiliates' →
     Alert vermelho "Solicitação rejeitada"

3. Integrar em ~/bazari/apps/web/src/components/chat/ProductSelectorGrid.tsx
   - Após mostrar banner da loja (linha ~193)
   - Adicionar <AffiliateStatusBanner> se mode === 'affiliates'

4. Bloquear avançar se não aprovado:
   - Em CreateProposalDialog, validar antes de step 2
   - Se modo affiliates e não aprovado → toast.error + return

VALIDAÇÃO:
- Banner aparece corretamente
- Botão "Solicitar" funciona
- Bloqueia criar proposta se não aprovado
```

---

## 🔄 FASE 4: Worker de Estatísticas

### Prompt 4.1: Worker de Atualização

```
Implementar FASE 4 do Sistema de Afiliados - Worker de Estatísticas

Repositório: ~/bazari
Documento de referência: ~/bazari/docs/specs/BAZCHAT_AFFILIATE_SYSTEM_SPEC.md

PRÉ-REQUISITO: FASE 3 completa

OBJETIVO:
Criar worker para atualizar estatísticas de afiliados periodicamente.

EXECUTAR NA ORDEM:

1. Criar ~/bazari/apps/api/src/workers/affiliate-stats.worker.ts

2. Implementar função updateAffiliateStats():
   - Buscar todos ChatStoreAffiliate com status 'approved'
   - Para cada afiliado:
     → Buscar ChatSale onde promoter = affiliateId
     → Calcular: totalSales, totalCommission, salesCount
     → Atualizar ChatStoreAffiliate

3. Configurar execução periódica:
   - setInterval a cada 1 hora
   - Log de início/fim

4. Registrar worker em ~/bazari/apps/api/src/server.ts
   - Import: import './workers/affiliate-stats.worker.js'

5. Testar:
   - Criar venda como afiliado
   - Aguardar worker ou executar manualmente
   - Verificar estatísticas atualizadas

VALIDAÇÃO:
- Worker executa sem erros
- Estatísticas são atualizadas
- Performance aceitável
```

---

## 🧪 FASE 5: Testes End-to-End

### Prompt 5.1: Testes do Fluxo Completo

```
Implementar FASE 5 do Sistema de Afiliados - Testes

Repositório: ~/bazari
Documento de referência: ~/bazari/docs/specs/BAZCHAT_AFFILIATE_SYSTEM_SPEC.md

PRÉ-REQUISITO: FASE 4 completa

OBJETIVO:
Criar testes para validar fluxo completo de afiliados.

EXECUTAR NA ORDEM:

1. Testar fluxo de solicitação:
   ✅ Promotor solicita afiliação
   ✅ Aparece para dono da loja como pendente
   ✅ Não pode solicitar duplicado

2. Testar aprovação:
   ✅ Dono aprova com comissão customizada
   ✅ Status muda para 'approved'
   ✅ Promotor vê como ativo

3. Testar criar proposta:
   ✅ Loja em modo 'affiliates'
   ✅ Não afiliado → erro 403
   ✅ Afiliado aprovado → sucesso
   ✅ Comissão customizada aplicada

4. Testar rejeição:
   ✅ Dono rejeita solicitação
   ✅ Promotor vê status rejeitado
   ✅ Não pode criar proposta

5. Testar suspensão:
   ✅ Dono suspende afiliado
   ✅ Afiliado não pode mais promover
   ✅ Vendas antigas mantidas

VALIDAÇÃO:
- Todos os cenários testados
- Sem bugs críticos
- UX clara e intuitiva
```

---

## 📚 Ordem de Execução Recomendada

```
1. FASE 1 (Prompt 1.1) → Schema e Migração
2. FASE 2.1 (Prompt 2.1) → Endpoints do Dono
3. FASE 2.2 (Prompt 2.2) → Endpoints do Promotor
4. FASE 2.3 (Prompt 2.3) → Validação em Propostas
5. FASE 3.1 (Prompt 3.1) → UI Dono da Loja
6. FASE 3.2 (Prompt 3.2) → UI Promotor
7. FASE 3.3 (Prompt 3.3) → UI Criar Proposta
8. FASE 4.1 (Prompt 4.1) → Worker
9. FASE 5.1 (Prompt 5.1) → Testes
```

**Tempo estimado:** 8-12 horas de desenvolvimento
**Complexidade:** Média-Alta
**Dependências:** Sistema de propostas, follows, reputação
