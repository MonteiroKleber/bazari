# 🤖 Prompts para Claude Code - Propostas Multi-Loja

## 📋 FASE 1: Schema e Migração

### Prompt 1.1: Atualizar Schema para Multi-Store

```
Implementar FASE 1 das Propostas Multi-Loja - Schema de Banco de Dados

Repositório: ~/bazari
Documento de referência: ~/bazari/docs/specs/BAZCHAT_MULTISTORE_PROPOSALS_SPEC.md

OBJETIVO:
Atualizar schema para suportar propostas com produtos de múltiplas lojas.

EXECUTAR NA ORDEM:

1. Atualizar ~/bazari/apps/api/prisma/schema.prisma
   - Adicionar campos ao model ChatProposal:
     → isMultiStore Boolean @default(false)
     → storeGroups Json?
   - Adicionar relação ChatProposal → ChatSale (um para muitos)
   - Adicionar proposalId em ChatSale

2. Gerar migração
   - Executar: npx prisma migrate dev --name add_multistore_proposals
   - Verificar se a migração foi criada

3. Gerar cliente Prisma
   - Executar: npx prisma generate

4. Verificar compilação
   - Executar: pnpm exec tsc --noEmit (no diretório apps/api)

VALIDAÇÃO:
- Campos adicionados ao schema
- Migração aplicada sem erros
- Cliente Prisma atualizado
- TypeScript compila sem erros
```

---

## 🔧 FASE 2: Backend API

### Prompt 2.1: Atualizar Criar Proposta para Multi-Store

```
Implementar FASE 2.1 das Propostas Multi-Loja - Criar Proposta

Repositório: ~/bazari
Documento de referência: ~/bazari/docs/specs/BAZCHAT_MULTISTORE_PROPOSALS_SPEC.md

PRÉ-REQUISITO: FASE 1 completa

OBJETIVO:
Atualizar endpoint POST /api/chat/proposals para suportar múltiplas lojas.

EXECUTAR NA ORDEM:

1. Criar função auxiliar groupProductsByStore em ~/bazari/apps/api/src/chat/routes/chat.orders.ts
   - Input: Array<ProposalItem>
   - Output: Map<storeId, ProposalItem[]>
   - Buscar product.sellerStoreId para cada item

2. Criar função auxiliar createStoreGroups
   - Para cada loja:
     → Buscar SellerProfile e política de comissão
     → Validar acesso do promotor
     → Calcular subtotal
     → Criar StoreGroup object

3. Modificar POST /api/chat/proposals:
   - Detectar se há múltiplas lojas
   - Se sim:
     → isMultiStore = true
     → storeGroups = await createStoreGroups(...)
     → commissionPercent = 0 (não usado)
   - Se não:
     → Fluxo atual (single-store)

4. Adicionar validação de limite:
   - Máximo 5 lojas por proposta
   - Máximo 20 produtos total

5. Testar:
   - Criar proposta com produtos de 2 lojas
   - Verificar storeGroups no banco
   - Verificar comissões diferentes por loja

VALIDAÇÃO:
- Proposta multi-loja criada com sucesso
- storeGroups contém dados corretos
- Validações funcionando
```

### Prompt 2.2: Atualizar Checkout para Multi-Store

```
Implementar FASE 2.2 das Propostas Multi-Loja - Checkout Multi-Store

Repositório: ~/bazari
Documento de referência: ~/bazari/docs/specs/BAZCHAT_MULTISTORE_PROPOSALS_SPEC.md

PRÉ-REQUISITO: FASE 2.1 completa

OBJETIVO:
Atualizar endpoint POST /api/chat/checkout para processar múltiplas lojas.

EXECUTAR NA ORDEM:

1. Modificar POST /api/chat/checkout em ~/bazari/apps/api/src/chat/routes/chat.orders.ts

2. Adicionar lógica de detecção:
   ```typescript
   if (proposal.isMultiStore) {
     return await checkoutMultiStore(proposal, buyerId, promoterId);
   } else {
     return await checkoutSingleStore(proposal, buyerId, promoterId);
   }
   ```

3. Implementar função checkoutMultiStore:
   - Parsear storeGroups
   - Para cada StoreGroup:
     → Buscar dono da loja (seller)
     → Chamar commissionService.settleSale
     → Guardar resultado
   - Atualizar proposta status = 'paid'
   - Criar mensagem com múltiplos recibos

4. Implementar processamento em paralelo:
   - Usar Promise.all para processar splits simultaneamente
   - Melhorar performance

5. Tratamento de erros:
   - Se um split falhar, logar mas continuar os outros
   - Marcar proposta como 'partially_paid' se necessário

6. Testar:
   - Checkout de proposta com 2 lojas
   - Verificar que 2 ChatSale foram criados
   - Verificar 2 recibos NFT gerados

VALIDAÇÃO:
- Múltiplos ChatSale criados
- Cada um com receiptNftCid
- Splits corretos por loja
- Mensagem enviada com todos os recibos
```

### Prompt 2.3: Atualizar CommissionService

```
Implementar FASE 2.3 das Propostas Multi-Loja - Serviço de Comissão

Repositório: ~/bazari
Documento de referência: ~/bazari/docs/specs/BAZCHAT_MULTISTORE_PROPOSALS_SPEC.md

PRÉ-REQUISITO: FASE 2.2 completa

OBJETIVO:
Adicionar função settleSaleGroup ao CommissionService.

EXECUTAR NA ORDEM:

1. Atualizar ~/bazari/apps/api/src/chat/services/commission.ts

2. Adicionar interface:
   ```typescript
   interface StoreGroup {
     storeId: number;
     storeName: string;
     items: ProposalItem[];
     subtotal: number;
     total: number;
     commissionPercent: number;
   }
   ```

3. Implementar método settleSaleGroup:
   - Input: proposalId, storeGroups, buyer, promoter
   - Para cada grupo:
     → Buscar dono da loja
     → Chamar settleSale individual
   - Retornar array de resultados

4. Otimizar:
   - Executar em paralelo quando possível
   - Cachear buscas de loja

5. Testar:
   - Processar 3 lojas simultaneamente
   - Verificar todos os splits corretos

VALIDAÇÃO:
- settleSaleGroup funciona
- Performance aceitável
- Todos os recibos gerados
```

---

## 🎨 FASE 3: Frontend UI

### Prompt 3.1: Atualizar ProductSelectorGrid

```
Implementar FASE 3.1 das Propostas Multi-Loja - Seletor de Produtos

Repositório: ~/bazari
Documento de referência: ~/bazari/docs/specs/BAZCHAT_MULTISTORE_PROPOSALS_SPEC.md

PRÉ-REQUISITO: FASE 2 completa (Backend)

OBJETIVO:
Remover restrição de loja única e permitir seleção multi-loja.

EXECUTAR NA ORDEM:

1. Modificar ~/bazari/apps/web/src/components/chat/ProductSelectorGrid.tsx

2. Remover validação de loja única:
   - Permitir addItem de qualquer loja
   - Incluir storeId no ProposalItem

3. Adicionar agrupamento visual:
   - useMemo para agrupar items por storeId
   - Renderizar um Card por loja
   - Mostrar subtotal por loja

4. Criar componente StoreGroupCard:
   - Header: Nome da loja
   - Body: Lista de produtos
   - Footer: Subtotal

5. Adicionar toggle de configuração:
   - Checkbox "Permitir múltiplas lojas"
   - Se desmarcado, comportamento atual

6. Testar:
   - Adicionar produtos de 3 lojas
   - Ver agrupamento visual
   - Calcular subtotais corretos

VALIDAÇÃO:
- Pode selecionar produtos de várias lojas
- Visual agrupa por loja
- Subtotais corretos
- Toggle funciona
```

### Prompt 3.2: Criar MultiStoreProposalCard

```
Implementar FASE 3.2 das Propostas Multi-Loja - Card de Proposta

Repositório: ~/bazari
Documento de referência: ~/bazari/docs/specs/BAZCHAT_MULTISTORE_PROPOSALS_SPEC.md

PRÉ-REQUISITO: FASE 3.1 completa

OBJETIVO:
Criar componente para exibir propostas multi-loja.

EXECUTAR NA ORDEM:

1. Criar ~/bazari/apps/web/src/components/chat/MultiStoreProposalCard.tsx

2. Props:
   - proposal: ChatProposal
   - onAccept?: () => Promise<void>
   - isSender: boolean

3. Layout:
   - Header: "Proposta Multi-Loja"
   - Subtitle: "{N} lojas • {M} produtos"
   - Body: Card por loja
     → Nome da loja
     → Lista de itens
     → Comissão
     → Subtotal
   - Footer: Total geral

4. Visual:
   - Usar border-left colorido por loja
   - Ícone de loja
   - Badge de comissão

5. Integrar em ~/bazari/apps/web/src/components/chat/MessageBubble.tsx
   - Detectar proposal.isMultiStore
   - Se true: usar MultiStoreProposalCard
   - Se false: usar ProposalCard

6. Testar:
   - Enviar proposta multi-loja
   - Visualizar no chat
   - Aceitar proposta

VALIDAÇÃO:
- Card renderiza corretamente
- Mostra todas as lojas
- Totais calculados corretamente
```

### Prompt 3.3: Atualizar PaymentSuccessDialog

```
Implementar FASE 3.3 das Propostas Multi-Loja - Diálogo de Sucesso

Repositório: ~/bazari
Documento de referência: ~/bazari/docs/specs/BAZCHAT_MULTISTORE_PROPOSALS_SPEC.md

PRÉ-REQUISITO: FASE 3.2 completa

OBJETIVO:
Mostrar múltiplos recibos após checkout multi-loja.

EXECUTAR NA ORDEM:

1. Atualizar ~/bazari/apps/web/src/components/chat/PaymentSuccessDialog.tsx

2. Adicionar suporte para array de vendas:
   ```typescript
   interface Props {
     sales: Array<{
       saleId: string;
       storeId: number;
       storeName: string;
       amount: string;
       receiptCid?: string;
     }>;
   }
   ```

3. Layout multi-sale:
   - Header: "Pagamento Confirmado!"
   - Subtitle: "Dividido entre {N} lojas"
   - Body: Card por venda
     → Nome da loja
     → Valor
     → Link "Ver Recibo"

4. Fallback para single-sale:
   - Se sales.length === 1: layout atual
   - Se sales.length > 1: layout multi

5. Integrar com ProposalCard:
   - onAccept retorna array de sales
   - Passar para PaymentSuccessDialog

6. Testar:
   - Aceitar proposta multi-loja
   - Ver dialog com múltiplos recibos
   - Clicar nos links

VALIDAÇÃO:
- Dialog mostra todas as vendas
- Links para recibos funcionam
- UX clara
```

### Prompt 3.4: Criar UI de Carrinho Visual

```
Implementar FASE 3.4 das Propostas Multi-Loja - Visualização de Carrinho

Repositório: ~/bazari
Documento de referência: ~/bazari/docs/specs/BAZCHAT_MULTISTORE_PROPOSALS_SPEC.md

PRÉ-REQUISITO: FASE 3.3 completa

OBJETIVO:
Melhorar visualização do carrinho com separação clara por loja.

EXECUTAR NA ORDEM:

1. Criar ~/bazari/apps/web/src/components/chat/MultiStoreCart.tsx

2. Componentes:
   - CartStoreSection: Uma seção por loja
   - CartItemRow: Linha de produto
   - CartSummary: Resumo total

3. Layout:
   ```
   🛒 Seu Carrinho

   📦 Loja A
     2x Produto 1 - R$ 100
     Frete: R$ 10
     ─────────────
     Subtotal: R$ 110

   📦 Loja B
     1x Produto 2 - R$ 80
     ─────────────
     Subtotal: R$ 80

   ═════════════════
   💰 Total: R$ 190

   ℹ️ Dividido entre 2 lojas
   ```

4. Usar em CreateProposalDialog step 3 (Review)

5. Adicionar indicadores visuais:
   - Cores diferentes por loja
   - Ícones
   - Separadores claros

VALIDAÇÃO:
- Visual claro e organizado
- Fácil entender divisão por loja
- Totais corretos
```

---

## 🔄 FASE 4: Melhorias e Otimização

### Prompt 4.1: Configuração e Toggle

```
Implementar FASE 4.1 das Propostas Multi-Loja - Configurações

Repositório: ~/bazari
Documento de referência: ~/bazari/docs/specs/BAZCHAT_MULTISTORE_PROPOSALS_SPEC.md

PRÉ-REQUISITO: FASE 3 completa

OBJETIVO:
Adicionar configuração para habilitar/desabilitar multi-loja.

EXECUTAR NA ORDEM:

1. Adicionar campo em StoreCommissionPolicy:
   - allowMultiStore Boolean @default(true)

2. Gerar migração:
   - npx prisma migrate dev --name add_allow_multistore

3. Adicionar toggle em CommissionPolicyPage:
   - Switch: "Permitir propostas multi-loja"
   - Descrição explicativa

4. Validar no backend:
   - Se proposta multi-loja + allowMultiStore = false
   - Retornar erro

5. Atualizar UI:
   - ProductSelectorGrid verifica allowMultiStore
   - Mostra aviso se desabilitado

VALIDAÇÃO:
- Toggle salva corretamente
- Validação backend funciona
- UI reflete estado
```

### Prompt 4.2: Performance e Otimização

```
Implementar FASE 4.2 das Propostas Multi-Loja - Otimizações

Repositório: ~/bazari
Documento de referência: ~/bazari/docs/specs/BAZCHAT_MULTISTORE_PROPOSALS_SPEC.md

PRÉ-REQUISITO: FASE 4.1 completa

OBJETIVO:
Otimizar performance de checkout multi-loja.

EXECUTAR NA ORDEM:

1. Implementar processamento paralelo:
   - Promise.all para settleSale
   - Reduzir tempo total

2. Cachear políticas de comissão:
   - Evitar múltiplas queries
   - Cache de 5 minutos

3. Otimizar queries:
   - Buscar todas as lojas de uma vez
   - Incluir relações necessárias

4. Adicionar logging:
   - Tempo de cada split
   - Tempo total
   - Identificar gargalos

5. Testar com múltiplas lojas:
   - 5 lojas
   - 20 produtos
   - Medir tempo de checkout

VALIDAÇÃO:
- Checkout < 5 segundos para 5 lojas
- Sem queries N+1
- Logs claros
```

---

## 🧪 FASE 5: Testes End-to-End

### Prompt 5.1: Testes do Fluxo Completo

```
Implementar FASE 5 das Propostas Multi-Loja - Testes

Repositório: ~/bazari
Documento de referência: ~/bazari/docs/specs/BAZCHAT_MULTISTORE_PROPOSALS_SPEC.md

PRÉ-REQUISITO: FASE 4 completa

OBJETIVO:
Testar todo o fluxo de propostas multi-loja.

EXECUTAR NA ORDEM:

1. Teste: Criar proposta multi-loja
   ✅ Selecionar produtos de 3 lojas
   ✅ Sistema agrupa automaticamente
   ✅ Cria proposta com isMultiStore = true
   ✅ storeGroups correto

2. Teste: Visualizar proposta
   ✅ MultiStoreProposalCard renderiza
   ✅ Mostra todas as lojas
   ✅ Totais corretos

3. Teste: Checkout multi-loja
   ✅ Gera 3 ChatSale
   ✅ Cada um com receiptNftCid
   ✅ Splits corretos
   ✅ Comissões diferentes respeitadas

4. Teste: Validações
   ✅ Máximo 5 lojas
   ✅ Máximo 20 produtos
   ✅ allowMultiStore desabilitado → erro

5. Teste: Edge cases
   ✅ 1 loja (comportamento single-store)
   ✅ Loja sem política (usa default)
   ✅ Promotor sem acesso a uma loja → erro

6. Teste: Performance
   ✅ 5 lojas em < 5 segundos
   ✅ Sem memory leaks
   ✅ Logs completos

VALIDAÇÃO:
- Todos os testes passando
- Sem regressões em single-store
- Performance aceitável
- UX intuitiva
```

---

## 📚 Ordem de Execução Recomendada

```
1. FASE 1 (Prompt 1.1) → Schema Multi-Store
2. FASE 2.1 (Prompt 2.1) → Criar Proposta Multi-Store
3. FASE 2.2 (Prompt 2.2) → Checkout Multi-Store
4. FASE 2.3 (Prompt 2.3) → CommissionService
5. FASE 3.1 (Prompt 3.1) → ProductSelectorGrid
6. FASE 3.2 (Prompt 3.2) → MultiStoreProposalCard
7. FASE 3.3 (Prompt 3.3) → PaymentSuccessDialog
8. FASE 3.4 (Prompt 3.4) → Carrinho Visual
9. FASE 4.1 (Prompt 4.1) → Configurações
10. FASE 4.2 (Prompt 4.2) → Otimizações
11. FASE 5.1 (Prompt 5.1) → Testes
```

**Tempo estimado:** 10-15 horas de desenvolvimento
**Complexidade:** Alta
**Dependências:** Sistema de propostas, comissões, splits
**Riscos:** Complexidade transacional, performance
