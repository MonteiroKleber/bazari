# ⚡ DECISÕES URGENTES - Token ZARI

**Data:** 26 de Outubro de 2025
**Prioridade:** 🔴 CRÍTICA
**Prazo:** 1-2 semanas

---

## 🎯 Contexto Rápido

Queremos lançar **ZARI** (token de governança) para:
1. Financiar desenvolvimento da Bazari
2. Criar DAO descentralizada
3. Alinhar incentivos (quem investe cedo, governa)

**Problema:** Precisamos tomar decisões-chave ANTES de começar a implementar.

---

## ✅ DECISÃO 1: Modelo de Venda

### Opção A: Extensão do P2P (RECOMENDADO ⭐)

**Como funciona:**
- Usar sistema P2P já existente
- Criar seção especial "Oferta Oficial DAO"
- DAO vende ZARI, usuários compram com BZR
- Fluxo de escrow/segurança já testado

**Pros:**
- ✅ **Rápido:** 1-2 semanas vs 3-4
- ✅ **Seguro:** código já testado em produção
- ✅ **Consistente:** mesma filosofia descentralizada
- ✅ **Menos código:** reutiliza 80% do P2P

**Cons:**
- ❌ UX menos customizada
- ❌ Dificulta fases de venda progressivas

**Custo:** Baixo (~R$ 10k dev)
**Tempo:** 2-3 semanas

---

### Opção B: Módulo Separado

**Como funciona:**
- Criar sistema novo `/api/zari-sale`
- UI específica para venda de ZARI
- Controle total do fluxo

**Pros:**
- ✅ UX otimizada para venda de token
- ✅ Fases de venda fáceis
- ✅ KYC/whitelist integrado
- ✅ Métricas específicas

**Cons:**
- ❌ **Lento:** 3-4 semanas
- ❌ **Arriscado:** código novo, bugs potenciais
- ❌ **Caro:** duplicação de lógica
- ❌ Fragmenta liquidez

**Custo:** Alto (~R$ 25k dev)
**Tempo:** 4-5 semanas

---

### ➡️ **DECISÃO REQUERIDA:**

**[ ] Opção A - Extensão P2P** (Recomendado)
**[ ] Opção B - Módulo Separado**

---

## ✅ DECISÃO 2: Tokenomics

### Distribuição (21M ZARI Total)

| Destinatário | % | Quantidade | Vesting | Preço (BZR) |
|--------------|---|------------|---------|-------------|
| Fundadores | 10% | 2,1M | ? | 0,10 |
| Comunidade Fase 2A | 10% | 2,1M | Nenhum | ? |
| Comunidade Fase 2B | 10% | 2,1M | Nenhum | ? |
| Parcerias | 10% | 2,1M | ? | ? |
| Tesouro DAO | 25% | 5,25M | - | - |
| Staking Rewards | 15% | 3,15M | Progressivo | - |
| Reservas | 20% | 4,2M | ? | - |

### ➡️ **DECISÕES REQUERIDAS:**

**1. Vesting de Fundadores:**
- **[ ] Opção A:** 6 meses cliff + 24 meses linear (Recomendado - evita dump)
- **[ ] Opção B:** Apenas 6 meses (Original - mais arriscado)

**2. Preços de Venda:**

| Fase | Original | Recomendado | Sua Decisão |
|------|----------|-------------|-------------|
| 2A (Early) | 0,25-0,50 | 0,25 | [ ] |
| 2B (Regular) | 0,25-0,50 | 0,35 | [ ] |
| 3 (Parcerias) | 0,75-1,00 | 0,50 | [ ] |

**Por que mudamos?**
- Aumento mais gradual (menos "pump" artificial)
- Mais transparente
- Early adopters ainda ganham 2x-4x

**3. Inflação Futura:**
- **[ ] Opção A:** 0% inicial, DAO pode votar inflação depois (Recomendado)
- **[ ] Opção B:** Inflação fixa 2% ao ano para staking

**4. Vesting de Parcerias:**
- **[ ] Opção A:** 3 meses cliff + 12 meses linear (Recomendado)
- **[ ] Opção B:** Apenas 3 meses (Original)

---

## ✅ DECISÃO 3: Descentralização

### Quando remover Sudo (controle centralizado)?

**Contexto:** Hoje a chain é controlada por Sudo (1 chave). Não é descentralizado.

**Opção A:** Antes da venda
- ✅ Mais honesto (vender "governança" em sistema descentralizado)
- ❌ Mais arriscado (se der bug, não tem emergency brake)

**Opção B:** Depois da venda
- ✅ Mais seguro (pode reverter problemas)
- ❌ Contraditório (vender governança em sistema centralizado)

**Opção C:** Progressivo (RECOMENDADO ⭐)

```
Antes da venda → Multi-sig 5-of-7
  (5 fundadores + 2 validadores precisam assinar)

3 meses após → Council eleito
  (7 membros votados pela comunidade)

6 meses após → Remover Sudo completamente
  (100% descentralizado)
```

**Pros:**
- ✅ Segurança gradual
- ✅ Permite ajustes
- ✅ Mostra compromisso com descentralização

**Cons:**
- ❌ Mais complexo
- ❌ Ainda parcialmente centralizado no início

### ➡️ **DECISÃO REQUERIDA:**

**[ ] Opção A** - Descentralizar antes
**[ ] Opção B** - Descentralizar depois
**[ ] Opção C** - Progressivo (Recomendado)

---

## ✅ DECISÃO 4: Segurança/Audit

### Quanto investir em auditoria?

**Opção A:** Audit Externo Completo
- **Custo:** R$ 120k - R$ 200k (US$ 30k-50k)
- **Empresa:** Trail of Bits, Halborn, OpenZeppelin
- **Timeline:** 2-4 semanas
- **Pros:** ✅ Máxima credibilidade ✅ Segurança garantida
- **Cons:** ❌ Muito caro

**Opção B:** Audit Interno + Bug Bounty (RECOMENDADO ⭐)
- **Custo:** R$ 20k - R$ 40k
- **Equipe:** Desenvolvedores experientes + comunidade
- **Timeline:** 2-3 semanas
- **Pros:** ✅ Custo-benefício ✅ Envolve comunidade
- **Cons:** ❌ Menos credibilidade

**Opção C:** Sem Audit (NÃO RECOMENDADO ❌)
- **Custo:** R$ 0
- **Pros:** Nenhum
- **Cons:** ❌ ALTO RISCO DE EXPLOITS ❌ Má reputação

### ➡️ **DECISÃO REQUERIDA:**

**[ ] Opção A** - Audit Externo (R$ 120k-200k)
**[ ] Opção B** - Audit Interno + Bug Bounty (R$ 20k-40k) ⭐
**[ ] Opção C** - Sem Audit (NÃO FAÇA ISSO)

---

## ✅ DECISÃO 5: Timeline

### Quando lançar?

**Opção A:** MVP Rápido (6-8 semanas)

**O que inclui:**
- Token ZARI on-chain
- Compra básica (sem governança ainda)
- Wallet com ZARI

**Pros:**
- ✅ Funding rápido
- ✅ Momentum

**Cons:**
- ❌ Sem DAO real (só promessa)
- ❌ Maior risco técnico
- ❌ Compliance apressado

**Timeline:**
```
Semana 1-2:  pallet-assets + ZARI
Semana 3-4:  API de compra
Semana 5-6:  UI de compra
Semana 7-8:  Lançamento (sem DAO)
```

---

**Opção B:** Completo (3-4 meses) - RECOMENDADO ⭐

**O que inclui:**
- Token ZARI on-chain
- Sistema de compra robusto
- DAO funcional (votação real)
- Multi-sig/descentralização parcial
- Audit de segurança

**Pros:**
- ✅ Produto completo
- ✅ Governança REAL desde dia 1
- ✅ Compliance adequado
- ✅ Mais confiável

**Cons:**
- ❌ Funding demora
- ❌ Risco de perder momentum

**Timeline:**
```
Mês 1: Blockchain (pallet-assets, treasury, multi-sig)
Mês 2: Backend + Frontend (sistema de compra)
Mês 3: Governança + Audit
Mês 4: Lançamento público
```

### ➡️ **DECISÃO REQUERIDA:**

**[ ] Opção A** - MVP Rápido (6-8 semanas)
**[ ] Opção B** - Completo (3-4 meses) ⭐

---

## ✅ DECISÃO 6: Compliance Legal

### Precisamos de advogado especializado?

**Risco:** ZARI pode ser classificado como "security" (investimento) por órgãos reguladores:
- 🇺🇸 SEC (EUA)
- 🇧🇷 CVM (Brasil)
- 🇪🇺 MiCA (Europa)

**Se for security, precisamos:**
- Registro formal
- KYC/AML obrigatório
- Restrições de venda
- Possíveis multas

### Opções:

**Opção A:** Consultar advogado ANTES de lançar (RECOMENDADO ⭐)
- **Custo:** R$ 10k - R$ 20k
- **Timeline:** 1-2 semanas
- **Pros:** ✅ Evita multas ✅ Estrutura correta
- **Cons:** ❌ Custo ❌ Pode atrasar

**Opção B:** Lançar e resolver depois
- **Custo:** R$ 0 inicial (mas potencial multa de milhões)
- **Pros:** ✅ Mais rápido
- **Cons:** ❌ RISCO ENORME ❌ Pode forçar shutdown

### ➡️ **DECISÃO REQUERIDA:**

**[ ] Opção A** - Consultar advogado ⭐
**[ ] Opção B** - Lançar sem consulta (ARRISCADO ❌)

---

## 📊 Resumo de Custos

### Cenário Mínimo Viável

| Item | Custo |
|------|-------|
| Desenvolvimento (3-4 meses) | R$ 60k - R$ 80k |
| Audit interno + Bug bounty | R$ 20k - R$ 40k |
| Advogado compliance | R$ 10k - R$ 20k |
| Infra (servers, testnet) | R$ 5k - R$ 10k |
| Marketing inicial | R$ 10k - R$ 20k |
| **TOTAL** | **R$ 105k - R$ 170k** |

### Cenário Ideal

| Item | Custo |
|------|-------|
| Desenvolvimento (3-4 meses) | R$ 60k - R$ 80k |
| Audit externo profissional | R$ 120k - R$ 200k |
| Advogado + estrutura legal | R$ 20k - R$ 40k |
| Infra robusta | R$ 10k - R$ 20k |
| Marketing agressivo | R$ 30k - R$ 50k |
| **TOTAL** | **R$ 240k - R$ 390k** |

---

## 💰 Funding Esperado (Venda de ZARI)

**Venda Fase 2 (20% do supply = 4,2M ZARI)**

| Cenário | Preço Médio | Funding em BZR | Funding em R$ (se 1 BZR = R$ 0,50) |
|---------|-------------|----------------|-------------------------------------|
| Conservador | 0,25 BZR | 1,05M BZR | R$ 525k |
| Realista | 0,30 BZR | 1,26M BZR | R$ 630k |
| Otimista | 0,40 BZR | 1,68M BZR | R$ 840k |

**Análise:** Mesmo no cenário conservador, funding cobre custos mínimos (R$ 525k > R$ 105k)

---

## ⏰ Próximas Ações

### Esta Semana

- [ ] **Você decide:** Preencher este documento com suas escolhas
- [ ] **Time revisa:** Análise técnica das decisões
- [ ] **Consulta legal:** Contatar 2-3 advogados crypto para orçamento
- [ ] **Orçamento:** Aprovar budget inicial

### Semana Próxima

- [ ] **Tokenomics final:** Documento formal
- [ ] **Legal:** Iniciar due diligence
- [ ] **Kickoff:** Primeira reunião de planejamento
- [ ] **Testnet:** Setup de ambiente de desenvolvimento

---

## 📝 Template para Resposta

**Para facilitar, copie e cole suas respostas:**

```
DECISÕES - Token ZARI

1. MODELO DE VENDA:
   [X] Extensão P2P
   [ ] Módulo Separado

2. TOKENOMICS:
   2.1 Vesting Fundadores:
       [X] 6m cliff + 24m linear
       [ ] Apenas 6 meses

   2.2 Preços:
       Fase 2A: 0,25 BZR
       Fase 2B: 0,35 BZR
       Fase 3: 0,50 BZR

   2.3 Inflação:
       [X] 0% inicial, DAO decide depois
       [ ] 2% fixo

   2.4 Vesting Parcerias:
       [X] 3m cliff + 12m linear
       [ ] Apenas 3 meses

3. DESCENTRALIZAÇÃO:
   [ ] Antes da venda
   [ ] Depois da venda
   [X] Progressivo

4. AUDIT:
   [ ] Externo (R$ 120k-200k)
   [X] Interno + Bug Bounty (R$ 20k-40k)
   [ ] Sem audit

5. TIMELINE:
   [ ] MVP Rápido (6-8 semanas)
   [X] Completo (3-4 meses)

6. COMPLIANCE:
   [X] Consultar advogado
   [ ] Lançar sem consulta

ORÇAMENTO APROVADO: R$ _______

COMENTÁRIOS ADICIONAIS:
___________________________________
___________________________________
```

---

## 🚨 IMPORTANTE

**Não começar implementação até:**
1. ✅ Todas as 6 decisões acima tomadas
2. ✅ Orçamento aprovado
3. ✅ Consulta legal iniciada
4. ✅ Tokenomics documentado formalmente

**Por quê?**
- Evitar retrabalho (mudar decisão no meio = perder semanas)
- Compliance (problemas legais são caros de resolver depois)
- Segurança (audit precisa de spec completa)

---

**Prazo para decisões:** 🔴 **1 semana**

Após decisões → Criamos documentos técnicos detalhados e iniciamos desenvolvimento.

---

*Documento criado em: 26/Out/2025*
*Última atualização: 26/Out/2025*
