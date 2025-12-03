# BazariOS - Sistema Operacional Descentralizado

**Versão:** 1.0.0
**Status:** Em Desenvolvimento
**Última Atualização:** 2024-12-03

---

## ⚠️ POLÍTICA DE ZERO REGRESSÃO

> **ANTES DE IMPLEMENTAR QUALQUER COISA, LEIA:**
>
> [**ZERO-REGRESSION.md**](./04-migration/ZERO-REGRESSION.md)
>
> **Regra fundamental:** NENHUMA funcionalidade existente pode quebrar durante a migração.
> A aplicação deve continuar funcionando 100% como está hoje em CADA etapa.
> Se algo parar de funcionar, a tarefa NÃO está completa.

---

## Visão Geral

Este diretório contém toda a documentação técnica para a **transformação do Bazari** de um "super app monolítico" para um **sistema operacional descentralizado com ecossistema de apps**.

### Objetivo Principal

Permitir que usuários personalizem sua experiência instalando apenas os apps que precisam, e que desenvolvedores terceiros criem e monetizem apps no ecossistema Bazari.

---

## Estrutura da Documentação

```
40-bazari-os/
│
├── 00-INDEX.md                    # Este arquivo
│
├── 01-vision/                     # Visão e Arquitetura
│   ├── VISION.md                  # Visão estratégica do BazariOS
│   ├── ARCHITECTURE.md            # Arquitetura técnica completa
│   └── GLOSSARY.md                # Glossário de termos
│
├── 02-phases/                     # Fases de Implementação
│   ├── PHASE-01-FOUNDATION.md     # Fundação: tipos, registry, store
│   ├── PHASE-02-APP-SYSTEM.md     # Sistema de apps nativos
│   ├── PHASE-03-APP-STORE.md      # Interface da App Store
│   ├── PHASE-04-SDK.md            # SDK para desenvolvedores
│   ├── PHASE-05-DEVELOPER-PORTAL.md # Portal do desenvolvedor
│   ├── PHASE-06-MONETIZATION.md   # Monetização e blockchain
│   └── PROGRESS.md                # Tracking de progresso
│
├── 03-specs/                      # Especificações Técnicas
│   ├── APP-MANIFEST-SPEC.md       # Formato do manifest de apps
│   ├── PERMISSIONS-SPEC.md        # Sistema de permissões
│   ├── SDK-API-SPEC.md            # APIs disponíveis no SDK
│   ├── SANDBOX-SPEC.md            # Segurança e isolamento
│   ├── REGISTRY-SPEC.md           # Registry de apps
│   └── REVIEW-PROCESS-SPEC.md     # Processo de review
│
├── 04-migration/                  # Guias de Migração
│   ├── ZERO-REGRESSION.md         # ⚠️ POLÍTICA OBRIGATÓRIA - Leia primeiro!
│   ├── MIGRATION-GUIDE.md         # Como migrar módulos existentes
│   ├── CURRENT-MODULES-MAP.md     # Mapa dos módulos atuais
│   └── BREAKING-CHANGES.md        # Mudanças incompatíveis
│
└── 05-reference/                  # Referências
    ├── APP-EXAMPLES/              # Exemplos de apps
    │   ├── wallet-app.md          # Migração do Wallet
    │   └── minimal-app.md         # App mínimo
    ├── UI-COMPONENTS.md           # Componentes de UI
    └── CHECKLIST.md               # Checklist geral
```

---

## Fases de Implementação

| Fase | Nome | Descrição | Dependências |
|------|------|-----------|--------------|
| **1** | Foundation | Tipos, registry, store de preferências | - |
| **2** | App System | Migrar módulos para estrutura de apps | Fase 1 |
| **3** | App Store | UI da loja de apps | Fase 2 |
| **4** | SDK | SDK para desenvolvedores terceiros | Fase 3 |
| **5** | Developer Portal | Portal web para devs | Fase 4 |
| **6** | Monetization | Pagamentos, revenue share | Fase 5 |

---

## Como Usar Esta Documentação

### Para Implementar (Claude Code)

1. **Leia primeiro:** `01-vision/ARCHITECTURE.md` para entender a arquitetura
2. **Siga as fases:** Execute `02-phases/PHASE-01-*.md` em ordem
3. **Consulte specs:** Use `03-specs/*.md` para detalhes técnicos
4. **Atualize progresso:** Marque tasks em `02-phases/PROGRESS.md`

### Ordem de Leitura Recomendada

```
1. 01-vision/VISION.md           → Entender o "porquê"
2. 01-vision/ARCHITECTURE.md     → Entender o "como"
3. 04-migration/CURRENT-MODULES-MAP.md → Estado atual
4. 02-phases/PHASE-01-*.md       → Começar implementação
```

---

## Convenções

### Formato das Tasks

Cada task nos documentos de fase segue este formato:

```markdown
### Task X.Y: Nome da Task

**Prioridade:** Alta | Média | Baixa
**Tipo:** criar | modificar | deletar
**Arquivos:**
- `caminho/do/arquivo.ts` (criar)
- `outro/arquivo.tsx` (modificar)

**Descrição:**
O que precisa ser feito.

**Código:**
\`\`\`typescript
// Código exemplo ou estrutura esperada
\`\`\`

**Critérios de Aceite:**
- [ ] Critério 1
- [ ] Critério 2

**Notas:**
Informações adicionais relevantes.
```

### Status de Tasks

- `[ ]` - Pendente
- `[x]` - Completo
- `[~]` - Em progresso
- `[!]` - Bloqueado

### Nomenclatura de Arquivos

| Tipo | Padrão | Exemplo |
|------|--------|---------|
| Componentes React | PascalCase.tsx | `AppCard.tsx` |
| Hooks | camelCase.ts | `useApps.ts` |
| Types | kebab-case.types.ts | `app.types.ts` |
| Services | kebab-case.service.ts | `app-loader.service.ts` |
| Stores | kebab-case.store.ts | `user-apps.store.ts` |
| Specs | kebab-case.spec.ts | `app-registry.spec.ts` |

---

## Links Rápidos

### Documentos Principais

- [Visão do BazariOS](./01-vision/VISION.md)
- [Arquitetura Técnica](./01-vision/ARCHITECTURE.md)
- [Fase 1: Fundação](./02-phases/PHASE-01-FOUNDATION.md)
- [Progresso Geral](./02-phases/PROGRESS.md)

### Especificações

- [App Manifest](./03-specs/APP-MANIFEST-SPEC.md)
- [Permissões](./03-specs/PERMISSIONS-SPEC.md)
- [SDK API](./03-specs/SDK-API-SPEC.md)

### Migração

- [Guia de Migração](./04-migration/MIGRATION-GUIDE.md)
- [Módulos Atuais](./04-migration/CURRENT-MODULES-MAP.md)

---

## Métricas do Projeto

### Escopo Estimado

| Categoria | Quantidade |
|-----------|------------|
| Novos arquivos | ~45 |
| Arquivos modificados | ~15 |
| Novos componentes | ~20 |
| Novas páginas | ~5 |
| Tipos/Interfaces | ~15 |

### Apps a Migrar

| App | Prioridade | Complexidade |
|-----|------------|--------------|
| Wallet | Alta | Média |
| Feed | Alta | Baixa |
| BazChat | Alta | Alta |
| Marketplace | Alta | Média |
| Governance | Média | Média |
| P2P | Média | Alta |
| Analytics | Baixa | Baixa |
| Vesting | Baixa | Baixa |
| VR | Baixa | Alta |

---

## Changelog

### v1.0.0 (2024-12-03)
- Documentação inicial criada
- 6 fases de implementação definidas
- Especificações técnicas documentadas
- Guias de migração criados

---

**Mantido por:** Claude Code
**Repositório:** `/root/bazari`
