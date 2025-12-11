# GUIA DE IMPLEMENTAÇÃO - BAZARI DELIVERY NETWORK

## 📖 INTRODUÇÃO

Este diretório contém todos os prompts necessários para implementar o **Bazari Delivery Network** de forma incremental e organizada.

---

## 🗂️ ESTRUTURA DE ARQUIVOS

```
docs/
├── ESPECIFICACAO_TECNICA_DELIVERY_NETWORK.md  ← Leia PRIMEIRO
├── PROPOSTA_DE_IMPLEMENTACAO.md               ← Visão geral do sistema
└── prompts/
    ├── README_IMPLEMENTACAO.md                ← Você está aqui
    ├── FASE1_DELIVERY_SCHEMA_MIGRATIONS.md    ← Criar models Prisma
    ├── FASE2_DELIVERY_CALCULATOR.md           ← Bibliotecas de cálculo
    ├── FASE3_DELIVERY_API.md                  ← API de delivery requests
    ├── FASE4_DELIVERY_PROFILE_API.md          ← API de perfil de entregador
    ├── FASE5_DELIVERY_PARTNERS_API.md         ← API de parceiros de loja
    ├── FASE6_ORDERS_INTEGRATION.md            ← Integração com Orders
    └── FASE7_TESTS_VALIDATION.md              ← Testes E2E e validação
```

---

## 🚀 COMO USAR

### PASSO 1: Leia a Documentação Base

**Antes de começar qualquer implementação:**

1. Leia **completamente** a [Especificação Técnica](../ESPECIFICACAO_TECNICA_DELIVERY_NETWORK.md)
2. Entenda a [Proposta de Implementação](../PROPOSTA_DE_IMPLEMENTACAO.md) original
3. Revise a demanda no arquivo [demanda-001-Bazari_Delivery_Network.txt](../demanda-001-Bazari_Delivery_Network.txt)

---

### PASSO 2: Implementar Fases em Ordem

**⚠️ IMPORTANTE: Execute as fases NA ORDEM! Cada fase depende da anterior.**

#### 🔵 FASE 1: Schema e Migrations (2-3h)
```bash
# Objetivo: Criar base de dados
# Arquivo: prompts/FASE1_DELIVERY_SCHEMA_MIGRATIONS.md
# O que fazer:
# - Adicionar 3 novos models ao schema.prisma
# - Atualizar Profile, Order, SellerProfile
# - Criar migrations
# - Validar no Prisma Studio
```

📄 **Prompt para Claude Code:**
```
Implementar FASE 1 do Bazari Delivery Network conforme especificado em:
/home/bazari/bazari/docs/prompts/FASE1_DELIVERY_SCHEMA_MIGRATIONS.md

Siga EXATAMENTE as instruções do arquivo. Após concluir, execute a validação descrita no final.
```

---

#### 🔵 FASE 2: Calculator e Helpers (1-2h)
```bash
# Objetivo: Criar funções de cálculo de frete e distância
# Arquivo: prompts/FASE2_DELIVERY_CALCULATOR.md
# O que fazer:
# - Criar geoUtils.ts (Haversine)
# - Criar deliveryCalculator.ts
# - Criar addressValidator.ts
# - Criar tipos TypeScript
# - Escrever testes unitários
```

📄 **Prompt para Claude Code:**
```
Implementar FASE 2 do Bazari Delivery Network conforme especificado em:
/home/bazari/bazari/docs/prompts/FASE2_DELIVERY_CALCULATOR.md

Após criar os arquivos, execute os testes unitários para validar.
```

---

#### 🔵 FASE 3: API de Delivery (3-4h)
```bash
# Objetivo: Criar endpoints principais de delivery
# Arquivo: prompts/FASE3_DELIVERY_API.md
# O que fazer:
# - Criar routes/delivery.ts
# - Implementar todos os endpoints CRUD
# - Registrar rotas no server.ts
# - Testar manualmente com curl
```

📄 **Prompt para Claude Code:**
```
Implementar FASE 3 do Bazari Delivery Network conforme especificado em:
/home/bazari/bazari/docs/prompts/FASE3_DELIVERY_API.md

Criar o arquivo delivery.ts completo e registrá-lo no server. Use os exemplos de validação com curl.
```

---

#### 🔵 FASE 4: API de Delivery Profile (1-2h)
```bash
# Objetivo: Endpoints para perfil de entregador
# Arquivo: prompts/FASE4_DELIVERY_PROFILE_API.md
```

📄 **Prompt para Claude Code:**
```
Implementar FASE 4 do Bazari Delivery Network conforme especificado em:
/home/bazari/bazari/docs/prompts/FASE4_DELIVERY_PROFILE_API.md
```

---

#### 🔵 FASE 5: API de Store Partners (1-2h)
```bash
# Objetivo: Endpoints para parcerias loja-entregador
# Arquivo: prompts/FASE5_DELIVERY_PARTNERS_API.md
```

📄 **Prompt para Claude Code:**
```
Implementar FASE 5 do Bazari Delivery Network conforme especificado em:
/home/bazari/bazari/docs/prompts/FASE5_DELIVERY_PARTNERS_API.md
```

---

#### 🔵 FASE 6: Integração com Orders (2-3h)
```bash
# Objetivo: Auto-criar DeliveryRequest ao criar Order
# Arquivo: prompts/FASE6_ORDERS_INTEGRATION.md
```

📄 **Prompt para Claude Code:**
```
Implementar FASE 6 do Bazari Delivery Network conforme especificado em:
/home/bazari/bazari/docs/prompts/FASE6_ORDERS_INTEGRATION.md

Esta é a integração crítica. Teste o fluxo completo após implementar.
```

---

#### 🔵 FASE 7: Testes e Validação (2-3h)
```bash
# Objetivo: Testes E2E e validação final
# Arquivo: prompts/FASE7_TESTS_VALIDATION.md
```

📄 **Prompt para Claude Code:**
```
Implementar FASE 7 do Bazari Delivery Network conforme especificado em:
/home/bazari/bazari/docs/prompts/FASE7_TESTS_VALIDATION.md

Criar testes E2E completos e validar todo o sistema antes de considerar pronto.
```

---

## ⏱️ ESTIMATIVA TOTAL

| Fase | Duração | Descrição |
|------|---------|-----------|
| 1 | 2-3h | Schema + Migrations |
| 2 | 1-2h | Calculator + Helpers |
| 3 | 3-4h | API Delivery |
| 4 | 1-2h | API Profile |
| 5 | 1-2h | API Partners |
| 6 | 2-3h | Integração Orders |
| 7 | 2-3h | Testes E2E |
| **TOTAL** | **14-19h** | **~2-3 dias de trabalho** |

---

## 🎯 OBJETIVOS POR FASE

### ✅ FASE 1 - Completada quando:
- [ ] 3 novos models criados (DeliveryRequest, StoreDeliveryPartner, DeliveryProfile)
- [ ] Relações adicionadas a Profile, Order, SellerProfile
- [ ] Migration executada sem erros
- [ ] Tabelas visíveis no Prisma Studio

### ✅ FASE 2 - Completada quando:
- [ ] Função `calculateDistance` funciona
- [ ] Função `calculateDeliveryFee` retorna breakdown correto
- [ ] Testes unitários passam 100%
- [ ] Variáveis de ambiente configuradas

### ✅ FASE 3 - Completada quando:
- [ ] 7 endpoints de delivery funcionando
- [ ] Validações Zod corretas
- [ ] Testes manuais com curl passam
- [ ] Rotas registradas no server

### ✅ FASE 4 - Completada quando:
- [ ] CRUD completo de DeliveryProfile
- [ ] Endpoint de disponibilidade funciona
- [ ] Estatísticas retornadas corretamente

### ✅ FASE 5 - Completada quando:
- [ ] Entregador pode solicitar parceria
- [ ] Loja pode aprovar/rejeitar
- [ ] Listagem de parceiros funciona
- [ ] Priorização implementada

### ✅ FASE 6 - Completada quando:
- [ ] Order cria DeliveryRequest automaticamente
- [ ] Feature flag funciona
- [ ] Order.status muda com pickup/deliver
- [ ] Fluxo completo testado

### ✅ FASE 7 - Completada quando:
- [ ] Testes E2E escritos e passando
- [ ] Fluxo completo validado
- [ ] Checklist de validação 100%
- [ ] Documentação atualizada

---

## 🐛 TROUBLESHOOTING

### Erro: "Cannot find module '@prisma/client'"
```bash
cd apps/api
npx prisma generate
```

### Erro: "Foreign key constraint failed"
```bash
# Verificar se migrations foram executadas na ordem
npx prisma migrate status
npx prisma migrate dev
```

### Erro: "Validation error" nos testes
```bash
# Verificar se .env está configurado corretamente
cat apps/api/.env | grep DELIVERY
```

### Erro: "Port already in use"
```bash
# Matar processo na porta 3000
lsof -ti:3000 | xargs kill -9
```

---

## 📊 PROGRESSO

Use este checklist para acompanhar o progresso:

```
[ ] FASE 1 - Schema e Migrations
[ ] FASE 2 - Calculator e Helpers
[ ] FASE 3 - API de Delivery
[ ] FASE 4 - API de Delivery Profile
[ ] FASE 5 - API de Store Partners
[ ] FASE 6 - Integração com Orders
[ ] FASE 7 - Testes E2E e Validação
```

---

## 🎉 APÓS COMPLETAR TODAS AS FASES

Você terá um sistema completo de **Delivery Network** com:

✅ Criação automática de entregas ao comprar produtos
✅ Solicitação direta de entregas (frete avulso)
✅ Rede híbrida (vinculados + abertos)
✅ Gestão de perfil de entregador
✅ Parceria loja-entregador
✅ Cálculo dinâmico de frete
✅ Tracking de status (pending → delivered)
✅ Integração com escrow (mock)
✅ Testes E2E completos

---

## 📞 SUPORTE

**Dúvidas durante implementação?**

1. Releia a [Especificação Técnica](../ESPECIFICACAO_TECNICA_DELIVERY_NETWORK.md)
2. Verifique o arquivo da fase específica
3. Consulte os exemplos de validação em cada fase

**Bugs ou comportamento inesperado?**

1. Execute os testes da fase
2. Verifique os logs do Fastify
3. Use Prisma Studio para inspecionar dados

---

## 🚢 DEPLOY

**Antes de fazer deploy em produção:**

1. Execute **TODOS** os testes (FASE 7)
2. Configure variáveis de ambiente de produção
3. Execute migrations em produção
4. Configure feature flags
5. Monitore logs na primeira hora

---

**BOA IMPLEMENTAÇÃO! 🚀**

Se surgir qualquer dúvida, consulte a especificação técnica ou os prompts específicos de cada fase.
