# FASE 2: BZR Rename (Full-Stack) - VERSÃO SIMPLIFICADA

**Fase:** 2 de 12
**Dependências:** FASE 1 completa (Blockchain BZR) ✅
**Duração estimada:** 2-3 dias (16-24 horas)
**Risco:** 🟢 Muito Baixo
**Impacto:** Frontend i18n + Padronização

---

## 📋 SUMÁRIO EXECUTIVO

### Objetivo

Garantir que **100% das strings de interface** mostrem "BZR" em vez de "UNIT" ou referências genéricas, aproveitando a infraestrutura que já existe e funciona.

### Descoberta Importante ✨

**Análise profunda revelou que a maior parte do trabalho JÁ ESTÁ FEITA!**

- ✅ Backend P2P já usa `BZR` em enums (`BUY_BZR`, `SELL_BZR`, `amountBZR`)
- ✅ Frontend `/utils/bzr.ts` já existe e funciona perfeitamente
- ✅ Frontend `/modules/wallet/utils/format.ts` já existe
- ✅ Frontend `getChainProps()` já busca `tokenSymbol` da blockchain
- ✅ Componentes já usam `chainProps.tokenSymbol` (que retorna "BZR" da FASE 1)
- ✅ Fallback já é "BZR" quando não conectado: `chainProps?.tokenSymbol ?? 'BZR'`

### O Que REALMENTE Precisa Fazer

1. **i18n (CRÍTICO):** Atualizar strings PT/EN/ES para "BZR"
2. **Padronização (OPCIONAL):** Criar componente `<Balance />` reutilizável
3. **Validação (IMPORTANTE):** Testar que tudo já mostra "BZR" corretamente
4. **Limpeza (OPCIONAL):** Remover referências antigas a "UNIT" (se existirem)

---

## 🎯 ESCOPO REAL (Simplificado)

### ✅ DENTRO do Escopo

- ✅ Atualizar i18n (PT/EN/ES) - substituir "UNIT" → "BZR"
- ✅ Criar componente `<Balance />` para padronizar exibição
- ✅ Usar mais `formatBzrPlanck()` de `/utils/bzr.ts` (já existe)
- ✅ Validar que `chainProps.tokenSymbol` retorna "BZR"
- ✅ Testar 3 idiomas + 6 temas

### ❌ FORA do Escopo (Já existe!)

- ❌ Criar `/utils/bzr.ts` - **JÁ EXISTE** ✅
- ❌ Criar `/modules/wallet/utils/format.ts` - **JÁ EXISTE** ✅
- ❌ Implementar `getChainProps()` - **JÁ EXISTE** ✅
- ❌ Fazer componentes usarem `tokenSymbol` - **JÁ FAZEM** ✅
- ❌ Criar helpers backend (não crítico para UX)

### 🔄 Mudança vs Especificação Original

| Item | Especificação Original | Realidade | Ação |
|------|----------------------|-----------|------|
| Backend constants.ts | Criar | ❌ Não crítico | ⏭️ Skip |
| Backend format.ts | Criar | ❌ Não crítico | ⏭️ Skip |
| Backend endpoint /metadata | Criar | ❌ Não crítico | ⏭️ Skip |
| Frontend constants.ts | Criar | ❌ Não crítico | ⏭️ Skip |
| Frontend Balance.tsx | Criar | ✅ Útil | ✅ Fazer |
| Frontend bzr.ts | Criar | ✅ JÁ EXISTE | ⏭️ Skip |
| i18n PT/EN/ES | Atualizar | ✅ CRÍTICO | ✅ Fazer |
| Validação | Testar | ✅ IMPORTANTE | ✅ Fazer |

**Redução:** ~7 dias → ~2-3 dias (economia de 60%)

---

## 📝 IMPLEMENTAÇÃO SIMPLIFICADA

### PASSO 1: Validação Inicial (30 min)

**Objetivo:** Confirmar que blockchain já retorna "BZR" e frontend já usa.

#### 1.1: Verificar que blockchain retorna BZR

```bash
# Verificar metadata da blockchain
curl -s -H "Content-Type: application/json" \
  -d '{"id":1, "jsonrpc":"2.0", "method": "system_properties"}' \
  http://localhost:9944 | jq '.result'

# Esperado:
# {
#   "tokenSymbol": "BZR",
#   "tokenDecimals": 12,
#   ...
# }
```

✅ **Se retorna "BZR"**: Prosseguir
❌ **Se retorna null ou "UNIT"**: Verificar FASE 1

#### 1.2: Verificar que frontend usa tokenSymbol

```bash
# Buscar uso de tokenSymbol
cd /root/bazari/apps/web
grep -rn "tokenSymbol\|chainProps" src/modules/wallet/ --include="*.tsx" --include="*.ts"

# Confirmar que usa:
# chainProps?.tokenSymbol ?? 'BZR'
```

**Arquivos a verificar:**
- `/src/modules/wallet/services/balances.ts` ← `getChainProps()`
- `/src/modules/wallet/pages/WalletDashboard.tsx` ← `chainProps?.tokenSymbol ?? 'BZR'`

✅ **Se já usa**: Ótimo, prosseguir
❌ **Se não usa**: Adicionar uso (raro)

---

### PASSO 2: i18n - Atualizar Strings (2-3 horas)

**Objetivo:** Garantir que TODAS as strings de UI mostram "BZR" nos 3 idiomas.

#### 2.1: Buscar strings "UNIT" em i18n

```bash
cd /root/bazari/apps/web/src/i18n

# Buscar "UNIT" (case-insensitive)
grep -in "unit" pt.json en.json es.json

# Buscar contextos relacionados
grep -i "moeda\|currency\|token\|nativ" pt.json | grep -v "BZR"
```

#### 2.2: Atualizar pt.json

**Arquivo:** `/root/bazari/apps/web/src/i18n/pt.json`

**Mudanças típicas:**

```json
{
  "common": {
    "currency": "BZR",
    "nativeToken": "BZR"
  },
  "wallet": {
    "balance": "Saldo",
    "available": "Disponível",
    "nativeToken": "Token Nativo (BZR)",
    "description": "Gerencie BZR e outros tokens. Backup descentralizado.",
    "send": {
      "amount": "Quantidade (BZR)",
      "available": "Disponível: {amount} BZR"
    }
  },
  "p2p": {
    "offer": {
      "price": "Preço (BRL/BZR)",
      "amount": "Quantidade (BZR)",
      "total": "Total em BZR"
    }
  }
}
```

**Buscar e substituir:**
- "UNIT" → "BZR"
- "unidade nativa" → "BZR"
- Qualquer referência genérica → "BZR"

#### 2.3: Atualizar en.json

**Arquivo:** `/root/bazari/apps/web/src/i18n/en.json`

```json
{
  "common": {
    "currency": "BZR",
    "nativeToken": "BZR"
  },
  "wallet": {
    "nativeToken": "Native Token (BZR)",
    "description": "Manage BZR and other tokens. Decentralized backup.",
    "send": {
      "amount": "Amount (BZR)",
      "available": "Available: {amount} BZR"
    }
  },
  "p2p": {
    "offer": {
      "price": "Price (BRL/BZR)",
      "amount": "Amount (BZR)",
      "total": "Total in BZR"
    }
  }
}
```

#### 2.4: Atualizar es.json

**Arquivo:** `/root/bazari/apps/web/src/i18n/es.json`

```json
{
  "common": {
    "currency": "BZR",
    "nativeToken": "BZR"
  },
  "wallet": {
    "nativeToken": "Token Nativo (BZR)",
    "description": "Gestiona BZR y otros tokens. Respaldo descentralizado.",
    "send": {
      "amount": "Cantidad (BZR)",
      "available": "Disponible: {amount} BZR"
    }
  },
  "p2p": {
    "offer": {
      "price": "Precio (BRL/BZR)",
      "amount": "Cantidad (BZR)",
      "total": "Total en BZR"
    }
  }
}
```

#### 2.5: Verificar completude

```bash
# Garantir que não sobrou "UNIT"
grep -in "unit" pt.json en.json es.json | grep -v "BZR\|community\|opportunity\|minute"

# Deve retornar vazio ou apenas falsos positivos (como "community", "opportunity")
```

---

### PASSO 3: Componente Balance (Opcional - 1-2 horas)

**Objetivo:** Criar componente reutilizável para exibir balances formatados.

#### 3.1: Criar componente Balance

**Arquivo:** `/root/bazari/apps/web/src/components/wallet/Balance.tsx` (CRIAR)

```tsx
import { formatBzrPlanck } from '@/utils/bzr';
import { useTranslation } from 'react-i18next';

interface BalanceProps {
  /** Balance in planck (smallest unit) */
  amount: string | number | bigint;

  /** Token symbol (default: "BZR") */
  symbol?: string;

  /** Token decimals (default: 12) */
  decimals?: number;

  /** Show symbol prefix */
  withSymbol?: boolean;

  /** Locale for number formatting */
  locale?: string;

  /** Custom className */
  className?: string;
}

/**
 * Componente para exibir balances formatados
 * Usa utils/bzr.ts para formatação consistente
 */
export function Balance({
  amount,
  symbol = 'BZR',
  decimals = 12,
  withSymbol = true,
  locale,
  className = '',
}: BalanceProps) {
  const { i18n } = useTranslation();
  const effectiveLocale = locale || i18n.language || 'en-US';

  // Se não for BZR (asset custom), usar formatação manual
  if (symbol !== 'BZR' || decimals !== 12) {
    const value = typeof amount === 'bigint' ? amount : BigInt(amount);
    const divisor = 10n ** BigInt(decimals);
    const numeric = Number(value) / Number(divisor);

    const formatted = new Intl.NumberFormat(effectiveLocale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(numeric);

    return (
      <span className={`font-mono ${className}`}>
        {withSymbol ? `${symbol} ${formatted}` : formatted}
      </span>
    );
  }

  // BZR usa helper otimizado
  const formatted = formatBzrPlanck(amount, effectiveLocale, withSymbol);

  return (
    <span className={`font-mono ${className}`}>
      {formatted}
    </span>
  );
}
```

#### 3.2: Usar componente (Exemplos)

**UserMenu.tsx:**

```tsx
// ANTES
<div className="text-sm">
  Saldo: {formatBalance(balance, 12)}
</div>

// DEPOIS
import { Balance } from '@/components/wallet/Balance';

<div className="text-sm">
  <Balance amount={balance} />
</div>
```

**WalletDashboard.tsx:**

```tsx
// Onde mostra saldo nativo
<Balance amount={nativeBalance.free} />

// Onde mostra asset
<Balance
  amount={assetBalance.free}
  symbol={assetBalance.symbol}
  decimals={assetBalance.decimals}
/>
```

**IMPORTANTE:** Usar o componente é **OPCIONAL**. Se os componentes já formatam corretamente usando `formatBzrPlanck()` ou `formatBalance()`, não precisa mudar.

---

### PASSO 4: Validação Manual (1-2 horas)

**Objetivo:** Confirmar que tudo mostra "BZR" corretamente.

#### 4.1: Testar Wallet

```bash
cd /root/bazari/apps/web
pnpm dev
```

**Abrir:** http://localhost:5173/app/wallet

**Verificar:**
- [ ] Saldo mostra "BZR X,XXX.XX" (ou formato correto)
- [ ] Não aparece "UNIT" ou "undefined"
- [ ] Symbol vem de `chainProps.tokenSymbol`

#### 4.2: Testar Troca de Idioma

**No frontend:**
1. Selecionar **Português** → Verificar strings mostram "BZR"
2. Selecionar **English** → Verificar strings mostram "BZR"
3. Selecionar **Español** → Verificar strings mostram "BZR"

**Checklist:**
- [ ] Labels de formulário mostram "(BZR)"
- [ ] Descrições mencionam "BZR"
- [ ] Tooltips/hints mencionam "BZR"
- [ ] Nenhuma string "UNIT" visível

#### 4.3: Testar Temas

**Alternar entre os 6 temas:**
1. Theme 1
2. Theme 2
3. Theme 3
4. Theme 4
5. Theme 5
6. Theme 6

**Verificar:**
- [ ] Formatação de balance funciona em todos
- [ ] Symbol "BZR" visível em todos
- [ ] Nenhum tema quebra exibição

#### 4.4: Testar P2P (se aplicável)

**Abrir:** http://localhost:5173/app/p2p

**Verificar:**
- [ ] Ofertas mostram "BZR"
- [ ] Formulário de nova oferta usa "BZR"
- [ ] Preços mostram "BRL/BZR" ou similar

---

### PASSO 5: Build e TypeScript (15 min)

**Objetivo:** Garantir que código compila sem erros.

```bash
cd /root/bazari

# TypeScript check (frontend)
pnpm --filter @bazari/web typecheck

# Build produção (frontend)
pnpm --filter @bazari/web build

# Verificar sem erros
echo $?  # Deve retornar 0
```

**Se houver erros:**
- Corrigir imports
- Corrigir tipos (se criou componente Balance)
- Garantir compatibilidade

---

### PASSO 6: Documentação (30 min)

**Objetivo:** Atualizar README e criar relatório.

#### 6.1: Atualizar README principal

**Arquivo:** `/root/bazari/README.md`

**Adicionar seção:**

```markdown
## 💰 Token Nativo: BZR

Bazari usa **BZR** (Bazari Token) como moeda nativa da blockchain.

- **Símbolo:** BZR
- **Nome:** Bazari Token
- **Decimais:** 12 (como DOT/KSM)
- **Existential Deposit:** 0.001 BZR

### Formatação no Frontend

```typescript
import { formatBzrPlanck } from '@/utils/bzr';

const balance = "1234560000000000"; // planck
formatBzrPlanck(balance); // "BZR 1,234.56"

// Ou usando componente
import { Balance } from '@/components/wallet/Balance';
<Balance amount={balance} />
```

### Internacionalização

O símbolo "BZR" está traduzido em 3 idiomas (PT/EN/ES) via i18next.
```

#### 6.2: Criar relatório de execução

**Arquivo:** `/root/bazari/docs/fase002-final/zari/spec/FASE-02-RELATORIO-EXECUCAO.md` (CRIAR)

**Template:**

```markdown
# FASE 2: BZR Rename (Full-Stack) - Relatório de Execução

**Data:** [DATA]
**Status:** ✅ CONCLUÍDO
**Tempo:** [HORAS] horas

## Mudanças Realizadas

### i18n
- [x] pt.json atualizado (X strings)
- [x] en.json atualizado (X strings)
- [x] es.json atualizado (X strings)

### Componentes (se aplicável)
- [ ] Balance.tsx criado
- [ ] X componentes atualizados para usar Balance

### Validação
- [x] Wallet mostra "BZR"
- [x] 3 idiomas testados
- [x] 6 temas testados
- [x] Build funciona

## Descobertas

- Frontend já usava `chainProps.tokenSymbol`
- Formatação já existia em `/utils/bzr.ts`
- Apenas i18n precisou atualizar

## Conclusão

FASE 2 concluída com sucesso. Todas strings de UI mostram "BZR".
```

---

## ✅ CRITÉRIOS DE ACEITAÇÃO (Simplificados)

### CA-I18N: Internacionalização

- [x] **CA-I18N-01:** `pt.json` não contém "UNIT" (apenas "BZR")
- [x] **CA-I18N-02:** `en.json` não contém "UNIT" (apenas "BZR")
- [x] **CA-I18N-03:** `es.json` não contém "UNIT" (apenas "BZR")
- [x] **CA-I18N-04:** Nenhuma string "UNIT" visível em UI (todos idiomas)

### CA-FE: Frontend

- [x] **CA-FE-01:** Wallet mostra balances com "BZR"
- [x] **CA-FE-02:** `chainProps.tokenSymbol` retorna "BZR" (da blockchain)
- [x] **CA-FE-03:** Componente Balance criado (OPCIONAL)
- [x] **CA-FE-04:** `/utils/bzr.ts` sendo usado (VERIFICAR)

### CA-TEST: Testes

- [x] **CA-TEST-01:** 3 idiomas testados manualmente
- [x] **CA-TEST-02:** 6 temas testados manualmente
- [x] **CA-TEST-03:** Build produção funciona (`pnpm build`)
- [x] **CA-TEST-04:** TypeScript compila sem erros
- [x] **CA-TEST-05:** Zero regressão (funcionalidades intactas)

### CA-DOC: Documentação

- [x] **CA-DOC-01:** README.md atualizado com seção BZR
- [x] **CA-DOC-02:** Relatório de execução criado

---

## 🧪 TESTES SIMPLIFICADOS

### Teste 1: Wallet Balance

**Pré-condição:** Frontend rodando, usuário conectado

**Passos:**
1. Abrir `/app/wallet`
2. Verificar saldo

**Resultado esperado:**
```
Disponível: BZR 1,234.56
(ou qualquer formato com "BZR" visível)
```

---

### Teste 2: Troca de Idioma

**Passos:**
1. Selecionar PT → Verificar "BZR"
2. Selecionar EN → Verificar "BZR"
3. Selecionar ES → Verificar "BZR"

**Resultado esperado:** "BZR" aparece em todos

---

### Teste 3: Desconectado da Blockchain

**Passos:**
1. Parar bazari-chain (`systemctl stop bazari-chain`)
2. Recarregar frontend
3. Verificar fallback

**Resultado esperado:**
```
chainProps?.tokenSymbol ?? 'BZR'
// Deve mostrar "BZR" mesmo sem blockchain
```

---

## 🚨 TROUBLESHOOTING

### Problema 1: Ainda mostra "UNIT"

**Causa:** String hard-coded ou i18n não atualizado

**Solução:**
```bash
# Buscar "UNIT" no código
cd /root/bazari/apps/web
grep -rn "UNIT" src/ --include="*.tsx" --include="*.ts" --include="*.json"

# Substituir manualmente
```

---

### Problema 2: tokenSymbol retorna null

**Causa:** Blockchain não está retornando metadata

**Solução:**
```bash
# Verificar blockchain
curl -s http://localhost:9944 \
  -H "Content-Type: application/json" \
  -d '{"id":1, "jsonrpc":"2.0", "method": "system_properties"}' | jq

# Se retorna null, revisar FASE 1
# Verificar chain spec foi recriado com properties
```

---

### Problema 3: Build falha

**Causa:** Imports errados ou tipos quebrados

**Solução:**
```bash
# Ver erro detalhado
cd /root/bazari/apps/web
pnpm typecheck

# Corrigir imports
# Garantir que Balance.tsx exporta tipo correto
```

---

## 📊 CRONOGRAMA REAL

| Dia | Atividade | Horas | Status |
|-----|-----------|-------|--------|
| 1 | Validação inicial + i18n PT/EN/ES | 4h | ⏳ |
| 1-2 | Componente Balance (opcional) | 2h | ⏳ |
| 2 | Validação manual (3 idiomas, 6 temas) | 3h | ⏳ |
| 2 | Build + TypeScript + Docs | 1h | ⏳ |

**Total:** 10 horas (~1.5 dias)

**Comparado com spec original:** 37 horas (~5 dias)
**Economia:** 73% de tempo!

---

## 🎯 MÉTRICAS DE SUCESSO

| Métrica | Antes | Depois |
|---------|-------|--------|
| Strings "UNIT" em i18n | ? | 0 |
| Componentes mostram BZR | ~80% | 100% |
| Idiomas suportam BZR | 0% | 100% (PT/EN/ES) |
| Build funciona | ✅ | ✅ |
| Regressões | 0 | 0 |

---

## 📦 ENTREGÁVEIS

### Código

1. **i18n (MODIFICADO):**
   - `/root/bazari/apps/web/src/i18n/pt.json`
   - `/root/bazari/apps/web/src/i18n/en.json`
   - `/root/bazari/apps/web/src/i18n/es.json`

2. **Componente (NOVO - OPCIONAL):**
   - `/root/bazari/apps/web/src/components/wallet/Balance.tsx`

3. **Uso do componente (MODIFICADO - OPCIONAL):**
   - `/root/bazari/apps/web/src/components/UserMenu.tsx`
   - `/root/bazari/apps/web/src/modules/wallet/pages/*.tsx`

### Documentação

1. `/root/bazari/README.md` (atualizado)
2. `/root/bazari/docs/fase002-final/zari/spec/FASE-02-RELATORIO-EXECUCAO.md` (novo)

---

## 🔄 ROLLBACK PLAN

### Se FASE 2 falhar

```bash
cd /root/bazari

# Reverter commits Git
git log --oneline -5
git revert <commit-hash>

# OU reset hard (se não commitou ainda)
git checkout -- apps/web/src/i18n/*.json
git checkout -- apps/web/src/components/wallet/Balance.tsx

# Rebuild
pnpm build
```

---

## 🎉 CONCLUSÃO

**FASE 2 SIMPLIFICADA:**

- ✅ Foca no essencial (i18n)
- ✅ Não duplica código existente
- ✅ Mantém padrões do projeto
- ✅ Zero regressão
- ✅ 73% mais rápida (10h vs 37h)

**Próxima fase:** FASE 3 - ZARI Token (Blockchain)

---

*Documento criado em: 27/Out/2025*
*Versão: 2.0 (Simplificada)*
*Baseado em: Análise profunda do código existente*
