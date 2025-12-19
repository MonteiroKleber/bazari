# Bazari Work - Prompts de Implementação

## Visão Geral

Prompts organizados por fase para implementação incremental do Bazari Work.

## Fases

| Fase | Prompt | Descrição | Dependências | Status |
|------|--------|-----------|--------------|--------|
| 1 | [PROMPT-01](./PROMPT-01-PROFESSIONAL-PROFILE.md) | Extensão de Perfil Profissional | - | ✅ |
| 2 | [PROMPT-02](./PROMPT-02-TALENT-SEARCH.md) | Busca de Talentos (Marketplace) | Fase 1 | ✅ |
| 3 | [PROMPT-03](./PROMPT-03-JOB-POSTINGS.md) | Publicação de Vagas | Fase 1 | ✅ |
| 4 | [PROMPT-04](./PROMPT-04-PROPOSALS.md) | Propostas e Negociação | Fases 1, 2, 3 | ✅ |
| 5 | [PROMPT-05](./PROMPT-05-AGREEMENTS.md) | Acordos de Contratação | Fase 4 | ✅ |
| 6 | [PROMPT-06](./PROMPT-06-ONCHAIN.md) | Registro On-Chain | Fase 5 | ✅ |
| 7 | [PROMPT-07](./PROMPT-07-EVALUATIONS.md) | Avaliações e Reputação | Fase 5 | ✅ |
| 8 | [PROMPT-08](./PROMPT-08-PAY-INTEGRATION.md) | Integração com Bazari Pay | Bazari Pay | ⏸️ |
| 9 | [PROMPT-09](./PROMPT-09-HOME-APPSTORE.md) | Home Dashboard e App Store | Fases 1-7 | 🔲 |

## Legenda de Status

- ✅ Implementado
- 🔲 Pendente
- ⏸️ Aguardando dependência externa

## Ordem de Execução

```
Fase 1: Perfil Profissional
    ↓
Fase 2: Busca de Talentos  ←  Fase 3: Vagas
    ↓                            ↓
         Fase 4: Propostas
              ↓
         Fase 5: Acordos
              ↓
    ┌─────────┼─────────┐
    ↓         ↓         ↓
Fase 6    Fase 7    Fase 8
On-chain  Avaliações Pay (aguardando)
              ↓
         Fase 9: Home + App Store
```

## Pré-requisitos Técnicos

- Prisma schema existente com User, Company
- Sistema de autenticação JWT
- BazChat para mensagens
- Feed para eventos públicos
- Infraestrutura blockchain (para Fase 6)
- App Store do BazariOS (para Fase 9)
