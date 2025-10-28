# PROMPT: FASE 2 - BZR Rename (Full-Stack) - VERSÃO SIMPLIFICADA

**Copie e cole este prompt completo no Claude Code para executar a FASE 2.**

---

## 🎯 CONTEXTO

Você é um desenvolvedor expert em React, TypeScript e internacionalização (i18n).

A **FASE 1 foi concluída**: o runtime da blockchain retorna `tokenSymbol: "BZR"`. Agora precisamos garantir que **100% das strings de interface** mostrem "BZR" nos 3 idiomas suportados.

## ✨ DESCOBERTA IMPORTANTE

**Análise do código revelou que QUASE TUDO JÁ FUNCIONA!**

- ✅ Backend P2P já usa `BZR` (`BUY_BZR`, `SELL_BZR`)
- ✅ Frontend `/utils/bzr.ts` **JÁ EXISTE** e funciona
- ✅ Frontend `getChainProps()` **JÁ BUSCA** `tokenSymbol` da blockchain
- ✅ Componentes **JÁ USAM** `chainProps.tokenSymbol ?? 'BZR'`

**O que REALMENTE precisa fazer:**
1. Atualizar i18n (PT/EN/ES) - strings de UI
2. (Opcional) Criar componente `<Balance />` para padronizar
3. Validar que tudo funciona

## 🚨 REGRAS CRÍTICAS

1. ❌ **NÃO criar** `/utils/bzr.ts` - **JÁ EXISTE!**
2. ❌ **NÃO criar** `/modules/wallet/utils/format.ts` - **JÁ EXISTE!**
3. ❌ **NÃO reimplementar** `getChainProps()` - **JÁ FUNCIONA!**
4. ✅ **FOCAR em i18n** - Substituir "UNIT" → "BZR"
5. ✅ **Manter padrões** - Não quebrar código existente
6. ✅ **Zero regressão** - Funcionalidades intactas

## 📂 ESTRUTURA DO PROJETO

```
/root/bazari/apps/web/
├── src/
│   ├── i18n/
│   │   ├── pt.json        ← ATUALIZAR (CRÍTICO)
│   │   ├── en.json        ← ATUALIZAR (CRÍTICO)
│   │   └── es.json        ← ATUALIZAR (CRÍTICO)
│   │
│   ├── utils/
│   │   └── bzr.ts         ← ✅ JÁ EXISTE! Não mexer!
│   │
│   ├── modules/wallet/
│   │   ├── utils/format.ts        ← ✅ JÁ EXISTE!
│   │   ├── services/balances.ts   ← ✅ USA getChainProps()
│   │   └── pages/WalletDashboard.tsx ← ✅ USA tokenSymbol
│   │
│   └── components/wallet/
│       └── Balance.tsx    ← CRIAR (OPCIONAL)
```

---

## ✅ PASSOS DE EXECUÇÃO

### PASSO 1: Validação Inicial (5 min)

**Confirmar que blockchain retorna "BZR":**

```bash
curl -s -H "Content-Type: application/json" \
  -d '{"id":1, "jsonrpc":"2.0", "method": "system_properties"}' \
  http://localhost:9944 | jq '.result'
```

**Esperado:**
```json
{
  "tokenSymbol": "BZR",
  "tokenDecimals": 12,
  "ss58Format": 42
}
```

✅ **Se retorna "BZR"**: Prosseguir
❌ **Se retorna null**: Parar e avisar que FASE 1 tem problema

---

### PASSO 2: i18n - Atualizar Strings (2-3 horas) ⭐ CRÍTICO

#### 2.1: Buscar strings "UNIT" existentes

```bash
cd /root/bazari/apps/web/src/i18n

# Buscar "UNIT" (case-insensitive)
grep -in "unit" pt.json en.json es.json
```

#### 2.2: Atualizar pt.json

**Editar:** `/root/bazari/apps/web/src/i18n/pt.json`

**Procurar por** `"UNIT"` ou referências a "moeda" e atualizar para "BZR":

```json
{
  "wallet": {
    "description": "Gerencie BZR e outros tokens...",
    "nativeToken": "Token Nativo (BZR)",
    "send": {
      "amount": "Quantidade (BZR)",
      "available": "Disponível: {amount} BZR"
    }
  },
  "p2p": {
    "offer": {
      "price": "Preço (BRL/BZR)",
      "amount": "Quantidade (BZR)"
    }
  }
}
```

**Buscar e substituir globalmente:**
- `"UNIT"` → `"BZR"`
- Qualquer menção genérica → `"BZR"`

#### 2.3: Atualizar en.json

**Editar:** `/root/bazari/apps/web/src/i18n/en.json`

```json
{
  "wallet": {
    "description": "Manage BZR and other tokens...",
    "nativeToken": "Native Token (BZR)",
    "send": {
      "amount": "Amount (BZR)",
      "available": "Available: {amount} BZR"
    }
  },
  "p2p": {
    "offer": {
      "price": "Price (BRL/BZR)",
      "amount": "Amount (BZR)"
    }
  }
}
```

#### 2.4: Atualizar es.json

**Editar:** `/root/bazari/apps/web/src/i18n/es.json`

```json
{
  "wallet": {
    "description": "Gestiona BZR y otros tokens...",
    "nativeToken": "Token Nativo (BZR)",
    "send": {
      "amount": "Cantidad (BZR)",
      "available": "Disponible: {amount} BZR"
    }
  },
  "p2p": {
    "offer": {
      "price": "Precio (BRL/BZR)",
      "amount": "Cantidad (BZR)"
    }
  }
}
```

#### 2.5: Verificar que não sobrou "UNIT"

```bash
# Deve retornar vazio (ou apenas "community", "opportunity" - falsos positivos)
grep -in "unit" pt.json en.json es.json | grep -v "BZR\|community\|opportunity\|minute"
```

---

### PASSO 3: Componente Balance (OPCIONAL - 1 hora)

**Criar componente reutilizável para exibir balances:**

**Arquivo:** `/root/bazari/apps/web/src/components/wallet/Balance.tsx` (CRIAR)

```tsx
import { formatBzrPlanck } from '@/utils/bzr';
import { useTranslation } from 'react-i18next';

interface BalanceProps {
  amount: string | number | bigint;
  symbol?: string;
  decimals?: number;
  withSymbol?: boolean;
  locale?: string;
  className?: string;
}

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

  // Se não for BZR, usar formatação manual
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

  // BZR usa helper otimizado existente
  const formatted = formatBzrPlanck(amount, effectiveLocale, withSymbol);

  return (
    <span className={`font-mono ${className}`}>
      {formatted}
    </span>
  );
}
```

**IMPORTANTE:** Criar este componente é **OPCIONAL**. Se os componentes já formatam corretamente, não precisa.

---

### PASSO 4: Validação Manual (1 hora)

#### 4.1: Iniciar frontend

```bash
cd /root/bazari/apps/web
pnpm dev
```

#### 4.2: Testar Wallet

**Abrir:** http://localhost:5173/app/wallet

**Verificar:**
- [ ] Saldo mostra "BZR X,XXX.XX"
- [ ] Não aparece "UNIT" ou "undefined"
- [ ] Symbol correto em todos locais

#### 4.3: Testar 3 Idiomas

**No seletor de idioma:**
1. **Português** → Verificar "BZR" aparece em labels
2. **English** → Verificar "BZR" aparece em labels
3. **Español** → Verificar "BZR" aparece em labels

**Checklist:**
- [ ] Nenhuma string "UNIT" visível
- [ ] Descrições mostram "BZR"
- [ ] Formulários mostram "(BZR)"

#### 4.4: Testar 6 Temas

**Alternar entre os temas e verificar:**
- [ ] Formatação funciona em todos
- [ ] "BZR" visível em todos
- [ ] Nenhum tema quebra

#### 4.5: Testar P2P (se aplicável)

**Abrir:** http://localhost:5173/app/p2p

- [ ] Ofertas mostram "BZR"
- [ ] Formulários usam "BZR"

---

### PASSO 5: Build e TypeScript (10 min)

```bash
cd /root/bazari

# TypeScript check
pnpm --filter @bazari/web typecheck

# Build produção
pnpm --filter @bazari/web build
```

**Esperado:** Sem erros

---

### PASSO 6: Documentação (30 min)

#### 6.1: Atualizar README

**Editar:** `/root/bazari/README.md`

**Adicionar seção:**

```markdown
## 💰 Token Nativo: BZR

Bazari usa **BZR** (Bazari Token) como moeda nativa.

- **Símbolo:** BZR
- **Decimais:** 12
- **Existential Deposit:** 0.001 BZR

### Formatação

```typescript
import { formatBzrPlanck } from '@/utils/bzr';
formatBzrPlanck("1234560000000000"); // "BZR 1,234.56"
```

### Internacionalização

Suportamos 3 idiomas (PT/EN/ES) via i18next.
```

#### 6.2: Criar relatório

**Criar:** `/root/bazari/docs/fase002-final/zari/spec/FASE-02-RELATORIO-EXECUCAO.md`

```markdown
# FASE 2: BZR Rename (Full-Stack) - Relatório

**Data:** [DATA]
**Status:** ✅ CONCLUÍDO
**Tempo:** [X] horas

## Mudanças

### i18n
- [x] pt.json atualizado
- [x] en.json atualizado
- [x] es.json atualizado

### Componentes
- [ ] Balance.tsx criado (opcional)

### Validação
- [x] 3 idiomas testados
- [x] 6 temas testados
- [x] Build funciona

## Descobertas

- Frontend já usava `chainProps.tokenSymbol`
- `/utils/bzr.ts` já existia
- Apenas i18n precisou atualizar

## Conclusão

Todas strings de UI mostram "BZR". Zero regressão.
```

---

## ✅ CHECKLIST FINAL

Marque ao completar:

### i18n
- [ ] `pt.json` atualizado (sem "UNIT")
- [ ] `en.json` atualizado (sem "UNIT")
- [ ] `es.json` atualizado (sem "UNIT")
- [ ] Verificado com grep: nenhum "UNIT" sobrou

### Validação
- [ ] Wallet mostra "BZR"
- [ ] 3 idiomas testados (PT/EN/ES)
- [ ] 6 temas testados
- [ ] P2P mostra "BZR" (se aplicável)

### Build
- [ ] `pnpm typecheck` funciona
- [ ] `pnpm build` funciona
- [ ] Nenhum erro TypeScript

### Documentação
- [ ] README.md atualizado
- [ ] Relatório de execução criado

---

## 🚨 TROUBLESHOOTING

### Problema: Ainda aparece "UNIT"

**Solução:**
```bash
# Buscar todas ocorrências
cd /root/bazari/apps/web
grep -rn "UNIT" src/ --include="*.tsx" --include="*.ts" --include="*.json"

# Substituir manualmente cada uma
```

### Problema: tokenSymbol retorna null

**Solução:**
```bash
# Verificar blockchain
curl -s http://localhost:9944 \
  -H "Content-Type: application/json" \
  -d '{"id":1, "jsonrpc":"2.0", "method": "system_properties"}' | jq

# Se null, revisar FASE 1
```

### Problema: Build falha

**Solução:**
```bash
# Ver erro
cd /root/bazari/apps/web
pnpm typecheck

# Corrigir imports ou tipos
```

---

## 📊 RESUMO

**O que foi feito:**
1. i18n: Atualizado PT/EN/ES com "BZR"
2. Componente Balance: Criado (opcional)
3. Validação: 3 idiomas + 6 temas
4. Build: Funcionando

**Tempo estimado:** 10 horas (~1.5 dias)
**Comparado com spec original:** 73% mais rápido!

**Arquivos modificados:** 3-4 (i18n + opcional Balance.tsx)

---

## ✅ INÍCIO DA EXECUÇÃO

**Comece pelo PASSO 1** e siga sequencialmente.

Marque ✅ no checklist acima ao concluir cada item.

Boa execução! 🚀
