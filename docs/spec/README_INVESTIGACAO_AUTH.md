# Investigação do Sistema de Autenticação - Índice de Documentos

Data: 2025-11-14  
Status: Completo (4 documentos, 1114 linhas)

## Visão Geral

Esta investigação analisa o sistema de autenticação do Bazari em profundidade e identifica dois problemas específicos em `/root/bazari/apps/api/src/routes/orders.ts`:

1. **Linha 213**: userId recebe `buyerAddr` (placeholder 'buyer-placeholder' em vez de User.id real)
2. **Linha 671**: buyerUserId recebe `order.buyerAddr` (wallet em vez de User.id)

Ambos afetam o funcionamento dos rewards e precisam correção.

---

## Documentos Criados

### 1. INVESTIGACAO_RESUMO.txt (Comece aqui!)
**Tamanho:** 9.3K | **Tempo de leitura:** 5 minutos

**O que contém:**
- Resumo executivo dos problemas
- Soluções em uma linha
- Relações no banco de dados
- Padrões corretos
- Próximos passos recomendados

**Use para:** Visão geral rápida, entender escopo total

**Leitura recomendada:** PRIMEIRA

---

### 2. AUTH_QUICK_REFERENCE.md (Lookup rápido)
**Tamanho:** 7.0K | **Tempo de leitura:** 10 minutos

**O que contém:**
1. Fluxo de autenticação (simplificado)
2. JWT Access Token Payload
3. Como usar em endpoints
4. Conversões essenciais (userId ↔ wallet)
5. Campo vs Significado (tabela)
6. Padrões errados vs corretos
7. Middleware functions
8. Tipos TypeScript
9. Endpoints exemplo (corretos)
10. Checklist para novo endpoint

**Use para:** Quick reference quando desenvolvendo, lookup de padrões

**Leitura recomendada:** SEGUNDA (antes de implementar)

---

### 3. AUTH_SYSTEM_INVESTIGATION.md (Análise completa)
**Tamanho:** 11K | **Tempo de leitura:** 25 minutos

**O que contém:**
1. Sistema de Auth atual - Como funciona (detalhado)
   - Middleware de autenticação
   - JWT Token Payload
   - Autenticação SIWS completa

2. Padrão correto de auth em endpoints (social.ts e posts.ts)

3. Problema atual em orders.ts (linhas 213 e 671)

4. Relação User ↔ Profile ↔ Order (Schema Prisma)
   - Estrutura
   - Mapeamento correto
   - Conversões

5. Código correto para substituir (5.1 e 5.2)
   - POST /orders completo
   - POST /orders/:id/release completo

6. Checklist de implementação (6 seções)

7. Exemplos de conversão wallet ↔ user.id

8. Resumo final em tabela

**Use para:** Entender sistema em profundidade, implementação base

**Leitura recomendada:** TERCEIRA (para entender contexto completo)

---

### 4. AUTH_IMPLEMENTATION_FIX.md (Guia passo-a-passo)
**Tamanho:** 7.9K | **Tempo de leitura:** 15 minutos (implementação: 30 min)

**O que contém:**
1. Problema (visão geral)
2. Solução implementação (passo-a-passo)
   - Passo 1: Adicionar import
   - Passo 2: Corrigir POST /orders
   - Passo 3: Corrigir linha 213
   - Passo 4: Corrigir POST /orders/:id/release
   - Passo 5: Corrigir linha 671

3. Resumo das mudanças (tabela)
4. Testes recomendados
5. Referências

**Use para:** Implementação efetiva das mudanças, copiar/colar código

**Leitura recomendada:** QUARTA (durante a implementação)

---

## Roadmap de Leitura Recomendado

```
0. Este arquivo (2 min)
   ↓
1. INVESTIGACAO_RESUMO.txt (5 min) - Entender problemas
   ↓
2. AUTH_QUICK_REFERENCE.md (10 min) - Ver padrões corretos
   ↓
3. AUTH_SYSTEM_INVESTIGATION.md (20 min) - Entender sistema
   ↓
4. AUTH_IMPLEMENTATION_FIX.md (30 min) - Implementar mudanças
   ↓
5. Testar endpoints (15 min)

TOTAL: ~80 minutos
```

---

## Resumo Executivo

### O Sistema de Auth Funciona Assim:

```
Token JWT → { sub: User.id, address: wallet }
                           ↓
                    request.authUser
                           ↓
                    Middleware popula
                    automaticamente
```

### Os Problemas São:

1. **POST /orders** não usa auth middleware
   - `buyerAddr = 'buyer-placeholder'` (hardcoded!)
   - `userId = buyerAddr` (passa string inválido)

2. **POST /orders/:id/release** não valida permissão
   - `buyerUserId = order.buyerAddr` (passa wallet em vez de userId)

### A Solução É:

1. Adicionar `{ preHandler: authOnRequest }` aos dois endpoints
2. Extrair `userId = authUser.sub` (não buyerAddr)
3. Query para converter wallet → userId onde necessário

### Severidade:

- ALTA (rewards não funcionam)
- Complexidade BAIXA (mudanças simples)
- Tempo ~30 minutos

---

## Mapeia de Campos

| Campo | Tipo | Significado |
|-------|------|-------------|
| `authUser.sub` | UUID | **User.id** (o userId real!) |
| `authUser.address` | SS58 | User.address (wallet) |
| `Order.buyerAddr` | SS58 | Wallet do comprador (NÃO é User.id!) |

**Regra de Ouro:**
```
authUser.sub === User.id (SEMPRE!)
Order.buyerAddr === User.address (mas pode ser outro usuário!)
Order.buyerAddr !== User.id (NUNCA!)
```

---

## Arquivo Principal Afetado

```
/root/bazari/apps/api/src/routes/orders.ts
├─ Linha 72: POST /orders ← PRECISA ADICIONAR MIDDLEWARE
├─ Linha 213: userId = buyerAddr ← PRECISA CORRIGIR
├─ Linha 582: POST /orders/:id/release ← PRECISA ADICIONAR MIDDLEWARE
└─ Linha 671: buyerUserId = order.buyerAddr ← PRECISA CORRIGIR
```

---

## Checklist Rápido

- [ ] Ler INVESTIGACAO_RESUMO.txt (5 min)
- [ ] Ler AUTH_QUICK_REFERENCE.md (10 min)
- [ ] Ler AUTH_SYSTEM_INVESTIGATION.md (20 min)
- [ ] Abrir AUTH_IMPLEMENTATION_FIX.md
- [ ] Seguir passo-a-passo para implementar mudanças (30 min)
- [ ] Testar endpoints (15 min)
- [ ] Verificar que rewards funcionam

---

## Exemplos Rápidos

### ERRADO - Não faça assim:
```typescript
const buyerAddr = 'buyer-placeholder';
const userId = buyerAddr;  // ❌ userId = 'buyer-placeholder'!
await afterOrderCreated(prisma, userId, ...);  // Tipo errado!
```

### CORRETO - Faça assim:
```typescript
const authUser = (request as any).authUser as { sub: string };
const userId = authUser.sub;  // ✓ userId = User.id (UUID)
await afterOrderCreated(prisma, userId, ...);  // Tipo certo!
```

---

## Próximos Passos

1. **Agora:** Ler INVESTIGACAO_RESUMO.txt
2. **Próximo:** Ler AUTH_QUICK_REFERENCE.md
3. **Depois:** Ler AUTH_SYSTEM_INVESTIGATION.md
4. **Então:** Seguir AUTH_IMPLEMENTATION_FIX.md
5. **Finalmente:** Testar e validar mudanças

---

## Suporte

Dúvidas sobre:
- **Fluxo geral:** Ver INVESTIGACAO_RESUMO.txt seção "PADROES CORRETOS"
- **Lookup rápido:** Ver AUTH_QUICK_REFERENCE.md seção "Campo vs Significado"
- **Detalhes:** Ver AUTH_SYSTEM_INVESTIGATION.md seção "4. Relação User ↔ Profile ↔ Order"
- **Implementação:** Ver AUTH_IMPLEMENTATION_FIX.md passo-a-passo

---

## Versão

- **Data:** 2025-11-14
- **Status:** Completo
- **Análise Total:** 4000+ linhas de código
- **Documentação Total:** 1114 linhas

---

**Comece pela leitura: [INVESTIGACAO_RESUMO.txt](./INVESTIGACAO_RESUMO.txt)**

