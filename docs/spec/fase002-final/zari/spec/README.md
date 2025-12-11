# 📚 ESPECIFICAÇÕES TÉCNICAS - Implementação ZARI

**Data:** 27 de Outubro de 2025
**Status:** ✅ FASE 1 EXECUTADA COM SUCESSO | ⏳ FASES 2-12 PENDENTES

---

## 🎯 VISÃO GERAL

Este diretório contém especificações técnicas detalhadas para implementação do token ZARI e renomeação BZR, divididas em **12 fases executáveis**.

Cada fase foi projetada para:
- ✅ Ser executável independentemente
- ✅ Não causar regressões
- ✅ Seguir padrões do projeto
- ✅ Ter critérios claros de sucesso
- ✅ Incluir prompt para Claude Code

---

## 📂 ESTRUTURA DOS DOCUMENTOS

```
spec/
├── README.md                           ← Você está aqui
├── 00-DIVISAO-FASES.md                 ← Visão geral das 12 fases
│
├── FASE-01-BZR-RENAME-BLOCKCHAIN.md    ← ✅ COMPLETA
├── FASE-01-PROMPT.md                   ← ✅ COMPLETA
│
├── FASE-02-BZR-RENAME-FULLSTACK.md     ← ⏳ A CRIAR
├── FASE-02-PROMPT.md                   ← ⏳ A CRIAR
│
├── FASE-03-ZARI-TOKEN-BLOCKCHAIN.md    ← ⏳ A CRIAR
├── FASE-03-PROMPT.md                   ← ⏳ A CRIAR
│
... (Fases 4-12 a seguir)
```

---

## 🚀 FASES IMPLEMENTADAS

### ✅ FASE 1: BZR Rename (Blockchain) — EXECUTADA

**Status:** ✅ CONCLUÍDA EM 27/OUT/2025
**Duração:** 30 minutos (estimativa: 2 semanas)
**Risco:** Baixo
**Arquivos:**
- [FASE-01-BZR-RENAME-BLOCKCHAIN.md](FASE-01-BZR-RENAME-BLOCKCHAIN.md) (16.9 KB) — Especificação
- [FASE-01-PROMPT.md](FASE-01-PROMPT.md) (5.0 KB) — Prompt executado
- [FASE-01-RELATORIO-EXECUCAO.md](FASE-01-RELATORIO-EXECUCAO.md) (14.2 KB) — Relatório de execução

**O que foi feito:**
- ✅ Renomeadas constantes UNIT → BZR no runtime
- ✅ Adicionada metadata API (TOKEN_SYMBOL="BZR", TOKEN_NAME="Bazari Token", TOKEN_DECIMALS=12)
- ✅ Runtime version incrementada (spec_version: 100 → 101)
- ✅ Atualizadas chain spec properties (development + local testnet)
- ✅ 100% backwards compatible (aliases deprecated mantidos)
- ✅ Compilação bem-sucedida (runtime + full node)
- ✅ Todos testes unitários passaram (2/2)
- ✅ Node iniciado com sucesso em modo development
- ✅ Chain spec validada com metadata BZR

**Arquivos modificados:**
1. `/root/bazari-chain/runtime/src/lib.rs` — Constantes e metadata
2. `/root/bazari-chain/runtime/src/configs/mod.rs` — Imports e deposits
3. `/root/bazari-chain/node/src/chain_spec.rs` — Chain properties
4. `/root/bazari-chain/runtime/src/genesis_config_presets.rs` — Comentários

**Critérios de sucesso:**
- [x] Compila sem erros ✅
- [x] Todos testes passam (2/2) ✅
- [x] Node inicia em --dev ✅
- [x] Chain spec mostra "BZR" em metadata ✅
- [x] Blocos são produzidos (#1, #2, #3+) ✅

**Próximo passo:** Testar em testnet antes de prosseguir para FASE 2

---

## ⏳ PRÓXIMAS FASES

### 📝 FASE 2: BZR Rename (Full-Stack) — ESPECIFICAÇÃO PRONTA

**Status:** ✅ ESPECIFICAÇÃO COMPLETA + PROMPT PRONTO
**Dependências:** FASE 1 completa ✅
**Duração:** 1 semana (5 dias úteis)
**Risco:** Baixo
**Arquivos:**
- [FASE-02-BZR-RENAME-FULLSTACK.md](FASE-02-BZR-RENAME-FULLSTACK.md) (35+ KB) — Especificação técnica completa
- [FASE-02-PROMPT.md](FASE-02-PROMPT.md) (12+ KB) — Prompt executável

**O que será feito:**
- ✅ Backend: Constantes BZR + helpers formatação + endpoint metadata
- ✅ Frontend: Constantes BZR + componente `<Balance />` + atualizar componentes
- ✅ i18n: Atualizar PT/EN/ES com "BZR"
- ✅ Validação: 3 idiomas + 6 temas + build

**Arquivos a criar/modificar:**
- Backend: 3 novos arquivos (constants.ts, format.ts, blockchain.ts)
- Frontend: 2 novos arquivos (constants.ts, Balance.tsx)
- Frontend: ~15 componentes/páginas a atualizar
- i18n: 3 arquivos JSON (pt.json, en.json, es.json)

**Como executar:**
```bash
# 1. Ler especificação
cat FASE-02-BZR-RENAME-FULLSTACK.md

# 2. Copiar prompt
cat FASE-02-PROMPT.md

# 3. Colar no Claude Code e executar passo a passo

# 4. Validar ao final
cd /root/bazari
pnpm build
pnpm --filter @bazari/web dev  # Testar frontend
```

**Critérios de sucesso:**
- [ ] Backend: Endpoint `/api/blockchain/metadata` retorna `tokenSymbol: "BZR"`
- [ ] Frontend: Wallet mostra "BZR 1,234.56" (não "UNIT")
- [ ] i18n: 3 idiomas (PT/EN/ES) mostram "BZR"
- [ ] Build: `pnpm build` funciona sem erros
- [ ] Temas: 6 temas funcionam corretamente

**Próximo passo:** Executar FASE 2 seguindo FASE-02-PROMPT.md

### FASE 3: ZARI Token (Blockchain)
**Status:** A criar
**Dependências:** FASE 1 completa
**Duração:** 2 semanas
**Escopo:** pallet-assets + asset ZARI

### FASE 4: Multi-Token Wallet (Frontend)
**Status:** A criar
**Dependências:** FASE 3 completa
**Duração:** 1.5 semanas
**Escopo:** Wallet mostra BZR + ZARI

### FASE 5: P2P Extension (Backend)
**Status:** A criar
**Dependências:** FASE 3 completa
**Duração:** 2 semanas
**Escopo:** P2P suporta ofertas ZARI

### FASE 6: ZARI Purchase UI (Frontend)
**Status:** A criar
**Dependências:** FASE 5 completa
**Duração:** 1.5 semanas
**Escopo:** Interface de compra ZARI

### FASES 7-12
**Status:** Planejadas (ver 00-DIVISAO-FASES.md)
- FASE 7: Governance (Blockchain) - 3 semanas
- FASE 8: Governance UI (Frontend) - 2 semanas
- FASE 9: Vesting (Blockchain) - 1 semana
- FASE 10: Vesting UI (Frontend) - 1 semana
- FASE 11: Integration Tests - 1 semana
- FASE 12: Audit & Deploy - 2 semanas

---

## 📋 COMO USAR ESTAS ESPECIFICAÇÕES

### Para Desenvolvedores

**1. Leia a divisão geral:**
```bash
cat 00-DIVISAO-FASES.md
```

**2. Leia a spec da fase atual:**
```bash
cat FASE-01-BZR-RENAME-BLOCKCHAIN.md
```

**3. Entenda:**
- Objetivo da fase
- Pré-requisitos
- Arquitetura da mudança
- Passos de implementação
- Critérios de sucesso
- Troubleshooting

**4. Execute usando Claude Code:**
```bash
# Copiar prompt
cat FASE-01-PROMPT.md

# Colar no Claude Code
# Aguardar execução
# Validar resultados
```

**5. Valide todos critérios antes de prosseguir**

---

### Para Gestores de Projeto

**1. Acompanhar progresso:**
- Ver [00-DIVISAO-FASES.md](00-DIVISAO-FASES.md) para timeline
- Cada fase tem duração estimada
- Dependências estão documentadas

**2. Validar entregas:**
- Cada spec tem seção "Critérios de Aceitação"
- Checklist de qualidade

**3. Gerenciar riscos:**
- Cada spec tem seção "Riscos" com mitigações
- Rollback plan documentado

---

### Para Revisores de Código

**1. Usar como guia de review:**
- Verificar se implementação segue spec
- Validar todos critérios de aceitação foram atingidos
- Checar se padrões do projeto foram seguidos

**2. Validações obrigatórias:**
- Compilação sem erros
- Testes passam
- Sem regressões
- i18n completo (se frontend)
- 6 temas funcionam (se frontend)

---

## 🎨 PADRÕES ARQUITETURAIS

Todas especificações seguem:

### Blockchain (bazari-chain):
- **Substrate Polkadot SDK v1.18.0**
- Custom pallets: stores, bazari-identity, universal-registry
- Runtime versioning correto (spec_version bump)
- Testes unitários obrigatórios
- Genesis config validation

### Backend (bazari/apps/api):
- **Fastify + Prisma + PostgreSQL**
- Zod validation em routes
- Try-catch error handling
- Cursor pagination
- Blockchain interaction via @polkadot/api

### Frontend (bazari/apps/web):
- **React 18 + Vite + TypeScript (strict)**
- Tailwind CSS + 6 temas customizáveis
- React Hook Form + Zod
- i18next: PT/EN/ES
- Zustand state management
- Shadcn/ui components
- CVA para styling condicional

---

## ⚠️ REGRAS IMPORTANTES

### 1. Nunca Quebrar Funcionalidades Existentes
- Adicionar, não remover (a menos que explicitamente requerido)
- Backwards compatibility quando possível
- Testar regressões

### 2. Seguir Padrões do Projeto
- Naming conventions existentes
- Estrutura de pastas
- Import order
- Comment style

### 3. Multiidioma Obrigatório (Frontend)
- Toda string visível em i18n
- Suportar PT/EN/ES
- Nunca hardcodar texto em componente

### 4. Suporte a 6 Temas (Frontend)
- Usar Tailwind classes (não hardcoded colors)
- Testar em light + dark
- Usar CSS variables quando necessário

### 5. Validação Completa
- Compilação sem erros
- Testes passam
- Validação manual executada
- Screenshots/video de funcionamento

---

## 📊 PROGRESSO GERAL

```
FASE 1:  ████████████████████ 100% ✅ (Spec + Prompt prontos)
FASE 2:  ░░░░░░░░░░░░░░░░░░░░   0% ⏳ (A criar)
FASE 3:  ░░░░░░░░░░░░░░░░░░░░   0% ⏳ (A criar)
FASE 4:  ░░░░░░░░░░░░░░░░░░░░   0% ⏳ (A criar)
FASE 5:  ░░░░░░░░░░░░░░░░░░░░   0% ⏳ (A criar)
FASE 6:  ░░░░░░░░░░░░░░░░░░░░   0% ⏳ (A criar)
FASE 7:  ░░░░░░░░░░░░░░░░░░░░   0% ⏳ (Planejada)
FASE 8:  ░░░░░░░░░░░░░░░░░░░░   0% ⏳ (Planejada)
FASE 9:  ░░░░░░░░░░░░░░░░░░░░   0% ⏳ (Planejada)
FASE 10: ░░░░░░░░░░░░░░░░░░░░   0% ⏳ (Planejada)
FASE 11: ░░░░░░░░░░░░░░░░░░░░   0% ⏳ (Planejada)
FASE 12: ░░░░░░░░░░░░░░░░░░░░   0% ⏳ (Planejada)

Total: 8.3% (1/12 specs completas)
```

---

## 🎯 TIMELINE ESTIMADO

```
Semana 1-2:   FASE 1 (BZR Blockchain)        ████████████████████
Semana 3:     FASE 2 (BZR Full-Stack)        ██████████
Semana 4-5:   FASE 3 (ZARI Blockchain)       ████████████████████
Semana 6:     FASE 4 (Multi-Token Wallet)    ███████████████
Semana 7-8:   FASE 5 (P2P Extension)         ████████████████████
Semana 9-10:  FASE 6 (ZARI Purchase UI)      ███████████████
Semana 11-13: FASE 7 (Governance)            ██████████████████████████████
Semana 14-15: FASE 8 (Governance UI)         ████████████████████
Semana 16:    FASE 9 (Vesting)               ██████████
Semana 17:    FASE 10 (Vesting UI)           ██████████
Semana 18:    FASE 11 (Integration Tests)    ██████████
Semana 19-20: FASE 12 (Audit & Deploy)       ████████████████████

Total: ~20 semanas (~5 meses com buffer)
```

---

## 📞 SUPORTE

**Se encontrar problemas:**

1. **Ler troubleshooting** na spec da fase
2. **Buscar em documentação:**
   - [00-DIVISAO-FASES.md](00-DIVISAO-FASES.md)
   - Spec específica da fase
3. **Consultar arquitetura original:**
   - `/root/bazari_ARCHITECTURE_AND_PATTERNS.md`
   - `/root/START_HERE.md`
4. **Validar pré-requisitos** foram atendidos
5. **Rollback** se necessário e tentar novamente

**Recursos úteis:**
- Substrate Docs: https://docs.substrate.io
- Polkadot.js API: https://polkadot.js.org/docs/
- Fastify Docs: https://fastify.dev
- React Hook Form: https://react-hook-form.com

---

## ✅ CHECKLIST ANTES DE COMEÇAR

Antes de executar qualquer fase:

- [ ] Li e entendi especificação completa
- [ ] Validei pré-requisitos (versões, dependências)
- [ ] Ambiente está funcionando (compila, testes passam)
- [ ] Backup/commit antes de mudanças
- [ ] Tenho acesso aos recursos necessários
- [ ] Sei como validar sucesso
- [ ] Conheço rollback plan

---

## 🚦 STATUS DAS ESPECIFICAÇÕES

| Fase | Nome | Spec | Prompt | Status |
|------|------|------|--------|--------|
| 1 | BZR Rename (Blockchain) | ✅ | ✅ | Pronto |
| 2 | BZR Rename (Full-Stack) | ⏳ | ⏳ | A criar |
| 3 | ZARI Token | ⏳ | ⏳ | A criar |
| 4 | Multi-Token Wallet | ⏳ | ⏳ | A criar |
| 5 | P2P Extension | ⏳ | ⏳ | A criar |
| 6 | ZARI Purchase UI | ⏳ | ⏳ | A criar |
| 7 | Governance (Blockchain) | 📋 | 📋 | Planejada |
| 8 | Governance UI | 📋 | 📋 | Planejada |
| 9 | Vesting (Blockchain) | 📋 | 📋 | Planejada |
| 10 | Vesting UI | 📋 | 📋 | Planejada |
| 11 | Integration Tests | 📋 | 📋 | Planejada |
| 12 | Audit & Deploy | 📋 | 📋 | Planejada |

**Legenda:**
- ✅ Completo
- ⏳ Em progresso / A criar
- 📋 Planejado (resumo em 00-DIVISAO-FASES.md)

---

## 📦 PRÓXIMOS PASSOS

**Para continuar o trabalho:**

1. **Criar FASE 2 spec:**
   - BZR Rename (Full-Stack)
   - Backend formatação
   - Frontend wallet updates
   - i18n translations

2. **Criar FASE 3 spec:**
   - pallet-assets integration
   - ZARI token creation
   - Genesis configuration
   - Asset metadata

3. **Criar FASES 4-6 specs:**
   - Multi-token wallet
   - P2P extension
   - Purchase interface

4. **Planejar FASES 7-12:**
   - Governance detailed specs
   - Vesting implementation
   - Testing strategy
   - Deploy procedures

---

**Status atual:** ✅ FASE 1 especificação completa e pronta para execução

**Última atualização:** 27/Out/2025

---

*Para iniciar implementação, comece com FASE 1 executando o prompt em FASE-01-PROMPT.md no Claude Code.*
