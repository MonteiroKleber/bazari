# Zero Regression Policy - Política de Zero Regressão

**Versão:** 1.0.0
**Status:** OBRIGATÓRIO
**Data:** 2024-12-03
**Prioridade:** CRÍTICA

---

## ⚠️ REGRA FUNDAMENTAL

> **NENHUMA FUNCIONALIDADE EXISTENTE PODE QUEBRAR DURANTE A MIGRAÇÃO.**
>
> A aplicação deve continuar funcionando 100% como está hoje em cada etapa da migração.
> Se algo parar de funcionar, a tarefa NÃO está completa.

---

## Princípios Inegociáveis

### 1. Funcionalidade Primeiro

```
❌ ERRADO: "Migrei o Wallet, mas o envio de tokens parou de funcionar"
✅ CERTO:  "Migrei o Wallet, testei todas as funcionalidades, tudo funciona como antes"
```

### 2. Nenhuma Remoção Prematura

```
❌ ERRADO: Deletar código antigo antes de confirmar que o novo funciona
✅ CERTO:  Manter código antigo até validar completamente o novo
```

### 3. Rotas Preservadas

```
❌ ERRADO: Mudar URLs existentes (ex: /app/wallet → /apps/wallet)
✅ CERTO:  Manter exatamente as mesmas URLs (ex: /app/wallet)
```

### 4. APIs Intactas

```
❌ ERRADO: Modificar assinaturas de funções/hooks existentes
✅ CERTO:  Adicionar novas funcionalidades sem alterar as existentes
```

---

## Checklist de Validação OBRIGATÓRIO

Antes de considerar QUALQUER tarefa como concluída, verificar:

### Checklist Global

- [ ] `pnpm build` executa sem erros
- [ ] `pnpm typecheck` passa sem erros
- [ ] Aplicação inicia normalmente
- [ ] Login/Logout funcionam
- [ ] Navegação principal funciona
- [ ] Todas as rotas existentes respondem

### Por Módulo Migrado

- [ ] Todas as páginas do módulo renderizam
- [ ] Todos os formulários funcionam
- [ ] Todas as ações (botões, links) funcionam
- [ ] Dados são carregados corretamente
- [ ] Dados são salvos corretamente
- [ ] Navegação interna do módulo funciona
- [ ] Integração com blockchain funciona (se aplicável)
- [ ] Uploads funcionam (se aplicável)
- [ ] WebSocket/real-time funciona (se aplicável)

---

## Estratégia de Migração Segura

### Fase 1: Adicionar Novo (Sem Modificar Antigo)

```typescript
// ✅ CERTO: Criar novo ao lado do antigo

// Estrutura atual (NÃO MEXER):
pages/WalletHome.tsx           // Mantém funcionando
components/wallet/*.tsx        // Mantém funcionando
modules/wallet/*.ts            // Mantém funcionando

// Nova estrutura (ADICIONAR):
apps/wallet/manifest.ts        // Novo
apps/wallet/index.tsx          // Novo
apps/wallet/pages/*.tsx        // Novo (cópia adaptada)
apps/wallet/components/*.tsx   // Novo (cópia adaptada)
```

### Fase 2: Redirecionar (Manter Fallback)

```typescript
// ✅ CERTO: Usar feature flag para trocar gradualmente

const USE_NEW_WALLET = process.env.NEXT_PUBLIC_USE_NEW_APPS === 'true';

// Em App.tsx
<Route
  path="/app/wallet/*"
  element={
    USE_NEW_WALLET
      ? <Suspense fallback={<Loading />}><NewWalletApp /></Suspense>
      : <WalletHome />  // Fallback para código antigo
  }
/>
```

### Fase 3: Validar Extensivamente

```bash
# Testar TODAS as funcionalidades manualmente:
1. Acessar /app/wallet
2. Ver saldo
3. Ver histórico
4. Enviar tokens (teste real ou testnet)
5. Receber tokens (gerar QR)
6. Navegar entre abas
7. Voltar para dashboard
8. Verificar em mobile
9. Verificar em desktop
```

### Fase 4: Remover Antigo (Apenas Após Validação Total)

```typescript
// ✅ CERTO: Só remover depois de:
// - 100% das funcionalidades validadas
// - Nenhum bug reportado
// - Período de observação (mínimo 1 dia)

// Então, e SOMENTE então:
// - Remover arquivos antigos
// - Remover feature flag
// - Limpar imports não utilizados
```

---

## Regras para Cada Tipo de Mudança

### Criando Novos Arquivos

```
✅ PERMITIDO: Criar qualquer arquivo novo em apps/ ou platform/
⚠️  CUIDADO:   Não criar com nomes que conflitem com existentes
```

### Modificando Arquivos Existentes

```
⚠️  CUIDADO:   Apenas modificações aditivas (adicionar, não remover)
❌ PROIBIDO:  Remover código que está em uso
❌ PROIBIDO:  Alterar assinaturas de funções públicas
❌ PROIBIDO:  Mudar comportamento de funções existentes
```

### Deletando Arquivos

```
❌ PROIBIDO:  Deletar qualquer arquivo antes de migração validada
❌ PROIBIDO:  Deletar arquivos referenciados por outros arquivos
✅ PERMITIDO: Deletar APENAS após:
              - Novo código funcionando 100%
              - Nenhuma referência ao arquivo antigo
              - Verificação de que nada quebrou
```

### Modificando Rotas

```
❌ PROIBIDO:  Mudar paths de rotas existentes
❌ PROIBIDO:  Remover rotas existentes
✅ PERMITIDO: Adicionar novas rotas
✅ PERMITIDO: Redirecionar internamente mantendo path externo
```

### Modificando API Endpoints

```
❌ PROIBIDO:  Mudar paths de endpoints existentes
❌ PROIBIDO:  Alterar formato de request/response
✅ PERMITIDO: Adicionar novos campos opcionais
✅ PERMITIDO: Criar novos endpoints
```

---

## Processo de Validação

### 1. Build Check

```bash
# OBRIGATÓRIO antes de qualquer commit
pnpm build

# Se falhar: NÃO PROSSIGA
# Corrija o erro primeiro
```

### 2. Type Check

```bash
# OBRIGATÓRIO
pnpm typecheck

# Se houver erros de tipo: NÃO PROSSIGA
```

### 3. Teste Manual

```
Para CADA funcionalidade do módulo migrado:
1. Abrir no navegador
2. Executar ação
3. Verificar resultado
4. Comparar com versão anterior (se possível)
```

### 4. Teste de Regressão

```
Verificar que outros módulos NÃO foram afetados:
1. Dashboard carrega
2. Outros apps funcionam
3. Navegação global funciona
4. Header/Footer funcionam
5. Login persiste
```

---

## O Que Fazer Se Algo Quebrar

### Passo 1: Parar Imediatamente

```bash
# NÃO continue implementando
# NÃO faça commit do código quebrado
```

### Passo 2: Reverter para Estado Funcional

```bash
# Opção A: Desfazer mudanças
git checkout -- .

# Opção B: Stash e investigar
git stash

# Opção C: Reverter commits
git revert HEAD
```

### Passo 3: Investigar a Causa

```
1. O que foi alterado?
2. Qual arquivo causou o problema?
3. Há dependência não mapeada?
4. Há efeito colateral não previsto?
```

### Passo 4: Corrigir e Continuar

```
1. Entender completamente a causa
2. Planejar solução que não quebre nada
3. Implementar com cuidado
4. Validar novamente
```

---

## Módulos Críticos - Atenção Redobrada

Estes módulos requerem EXTREMO CUIDADO por serem críticos para o negócio:

### 🔴 Wallet
- Transferências de tokens
- Assinatura de transações
- Saldos

### 🔴 Marketplace
- Checkout
- Pagamentos
- Pedidos

### 🔴 BazChat
- Mensagens E2E
- Chaves de criptografia
- Histórico de conversas

### 🔴 Governance
- Votação
- Propostas
- Transações on-chain

### 🟡 Feed
- Posts
- Comentários
- Mídia

### 🟡 P2P
- Escrow
- Trades
- Chat de negociação

---

## Métricas de Sucesso

A migração só é considerada bem-sucedida quando:

| Métrica | Requisito |
|---------|-----------|
| Erros de build | 0 |
| Erros de tipo | 0 |
| Funcionalidades quebradas | 0 |
| Rotas indisponíveis | 0 |
| Erros no console (produção) | 0 |
| Testes falhando | 0 |

---

## Compromisso

> Ao implementar qualquer tarefa do BazariOS, comprometo-me a:
>
> 1. **Nunca** quebrar funcionalidades existentes
> 2. **Sempre** validar antes de considerar tarefa completa
> 3. **Imediatamente** reverter se algo quebrar
> 4. **Preservar** 100% das funcionalidades atuais
>
> A aplicação DEVE funcionar exatamente como antes em TODAS as etapas.

---

**Documento:** ZERO-REGRESSION.md
**Versão:** 1.0.0
**Prioridade:** CRÍTICA - LEITURA OBRIGATÓRIA ANTES DE QUALQUER IMPLEMENTAÇÃO
