# App Review Process Specification

**Versão:** 1.0.0
**Status:** Draft
**Data:** 2024-12-03

---

## Visão Geral

Todo app de terceiro deve passar por um processo de review antes de ser publicado na App Store. Este documento define os critérios, fluxo, e responsabilidades.

---

## Fluxo de Submissão

```
┌─────────┐    ┌───────────┐    ┌───────────┐    ┌───────────┐    ┌───────────┐
│  DRAFT  │───▶│ SUBMITTED │───▶│ IN_REVIEW │───▶│ APPROVED  │───▶│ PUBLISHED │
└─────────┘    └───────────┘    └───────────┘    └───────────┘    └───────────┘
                    │                │
                    │                │
                    │                ▼
                    │          ┌───────────┐
                    │          │ REJECTED  │
                    │          └───────────┘
                    │                │
                    └────────────────┘
                         (correção)
```

### Estados

| Estado | Descrição |
|--------|-----------|
| `DRAFT` | App em desenvolvimento, não submetido |
| `SUBMITTED` | Aguardando início do review |
| `IN_REVIEW` | Em análise por reviewer |
| `APPROVED` | Aprovado, aguardando publicação |
| `REJECTED` | Não aprovado, requer correções |
| `PUBLISHED` | Publicado na App Store |
| `SUSPENDED` | Removido temporariamente |
| `DEPRECATED` | Descontinuado |

---

## Checklist de Review

### 1. Validação Automática (CI)

```yaml
# .github/workflows/app-review.yml
name: App Review CI

on:
  workflow_dispatch:
    inputs:
      submission_id:
        required: true

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - name: Validate Manifest
        run: |
          bazari validate --manifest

      - name: Security Scan
        run: |
          npm audit
          snyk test

      - name: Bundle Analysis
        run: |
          bazari build
          # Verifica tamanho < 5MB
          # Verifica hash

      - name: Check External Dependencies
        run: |
          # Verifica se não há scripts externos
          # Verifica CSP compliance
```

### 2. Checklist Manual

#### Funcionalidade

- [ ] App faz o que a descrição promete
- [ ] Todas as features principais funcionam
- [ ] Não há crashes óbvios
- [ ] Navegação é intuitiva

#### UI/UX

- [ ] Segue guidelines de design do Bazari
- [ ] Responsivo (mobile e desktop)
- [ ] Textos legíveis e traduzidos
- [ ] Loading states adequados
- [ ] Error states adequados

#### Segurança

- [ ] Não tenta escapar do sandbox
- [ ] Usa apenas APIs do SDK
- [ ] Permissões são justificadas
- [ ] Não armazena dados sensíveis indevidamente

#### Performance

- [ ] Carrega em < 3 segundos
- [ ] Bundle < 5MB (gzip)
- [ ] Sem memory leaks óbvios
- [ ] Sem loops infinitos

#### Privacidade

- [ ] Política de privacidade presente
- [ ] Dados coletados declarados
- [ ] LGPD/GDPR compliance

#### Conteúdo

- [ ] Sem conteúdo ofensivo
- [ ] Sem spam ou enganação
- [ ] Sem violação de propriedade intelectual
- [ ] Apropriado para todas as idades (ou marcado)

---

## Critérios de Rejeição

### Rejeição Automática

| Motivo | Código |
|--------|--------|
| Manifest inválido | `INVALID_MANIFEST` |
| Bundle > 5MB | `BUNDLE_TOO_LARGE` |
| Vulnerabilidades críticas | `SECURITY_VULNERABILITY` |
| Scripts externos detectados | `EXTERNAL_SCRIPTS` |
| Hash não confere | `HASH_MISMATCH` |

### Rejeição Manual

| Motivo | Código |
|--------|--------|
| App não funciona | `NON_FUNCTIONAL` |
| UI quebrada | `BROKEN_UI` |
| Permissões excessivas | `EXCESSIVE_PERMISSIONS` |
| Conteúdo inapropriado | `INAPPROPRIATE_CONTENT` |
| Descrição enganosa | `MISLEADING_DESCRIPTION` |
| Violação de termos | `TOS_VIOLATION` |
| Spam | `SPAM` |
| Malware detectado | `MALWARE` |

---

## Modelo de Dados

```prisma
model AppSubmission {
  id            String   @id @default(cuid())
  appId         String
  version       String

  // Estado
  status        SubmissionStatus @default(PENDING)

  // Timestamps
  submittedAt   DateTime @default(now())
  startedAt     DateTime?  // Quando review começou
  completedAt   DateTime?  // Quando review terminou

  // Reviewer
  reviewerId    String?
  reviewer      User?    @relation(fields: [reviewerId], references: [id])

  // Resultado
  approved      Boolean?
  rejectionCode String?
  rejectionNote String?

  // Checklist
  checklist     Json?    // { item: boolean }

  // Notas internas
  internalNotes String?

  // Relação
  app           ThirdPartyApp @relation(fields: [appId], references: [id])

  @@index([appId])
  @@index([status])
  @@index([reviewerId])
}

enum SubmissionStatus {
  PENDING
  IN_REVIEW
  APPROVED
  REJECTED
  CANCELLED
}
```

---

## API de Review (Admin)

```typescript
// GET /admin/reviews/pending
// Lista submissões pendentes
{
  submissions: AppSubmission[];
  total: number;
}

// POST /admin/reviews/:id/start
// Iniciar review (reserva para reviewer)
{
  submission: AppSubmission;
}

// POST /admin/reviews/:id/approve
// Aprovar submissão
{
  submission: AppSubmission;
}

// POST /admin/reviews/:id/reject
// Rejeitar submissão
{
  body: {
    code: string;
    note: string;
  }
}
{
  submission: AppSubmission;
}

// POST /admin/reviews/:id/checklist
// Atualizar checklist
{
  body: {
    checklist: Record<string, boolean>;
    notes?: string;
  }
}
```

---

## UI de Review (Admin)

### Lista de Pendentes

```
┌─────────────────────────────────────────────────────────────────┐
│  📋 Review Queue                              [3 pendentes]     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  📊 Analytics Pro v1.2.0                  Há 2 horas       │ │
│  │  by: joao@dev                                              │ │
│  │  Categoria: Tools                                          │ │
│  │  [Ver Submissão]  [Iniciar Review]                        │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  🎮 Quiz Game v0.5.0                      Há 5 horas       │ │
│  │  by: maria@dev                                             │ │
│  │  Categoria: Entertainment                                  │ │
│  │  [Ver Submissão]  [Iniciar Review]                        │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Tela de Review

```
┌─────────────────────────────────────────────────────────────────┐
│  Review: Analytics Pro v1.2.0                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [Info] [Screenshots] [Permissões] [Código] [Checklist]         │
│                                                                  │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  CHECKLIST DE REVIEW                                            │
│                                                                  │
│  Funcionalidade                                                 │
│  ☑️ App faz o que promete                                       │
│  ☑️ Features funcionam                                          │
│  ☐ Sem crashes                                                  │
│                                                                  │
│  UI/UX                                                          │
│  ☑️ Segue guidelines                                            │
│  ☑️ Responsivo                                                  │
│  ☑️ Loading states                                              │
│                                                                  │
│  Segurança                                                      │
│  ☑️ Usa apenas SDK                                              │
│  ☑️ Permissões justificadas                                     │
│                                                                  │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  Notas internas:                                                │
│  ┌────────────────────────────────────────────────────────────┐│
│  │                                                            ││
│  └────────────────────────────────────────────────────────────┘│
│                                                                  │
│  [Cancelar]           [Rejeitar]           [✓ Aprovar]         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Comunicação com Desenvolvedor

### Email de Rejeição

```
Assunto: [Bazari] Sua submissão precisa de ajustes - {app_name}

Olá {dev_name},

Analisamos a versão {version} do seu app "{app_name}" e
encontramos alguns pontos que precisam de atenção:

❌ Motivo da rejeição: {rejection_code}

📝 Feedback do reviewer:
{rejection_note}

📋 Checklist não atendido:
- [ ] {item_1}
- [ ] {item_2}

Faça as correções necessárias e submeta novamente.

Documentação útil:
- Guidelines de UI: https://docs.bazari.io/guidelines
- Permissões: https://docs.bazari.io/permissions

Se tiver dúvidas, responda este email.

Equipe Bazari
```

### Email de Aprovação

```
Assunto: [Bazari] 🎉 Seu app foi aprovado! - {app_name}

Olá {dev_name},

Ótimas notícias! A versão {version} do seu app "{app_name}"
foi aprovada e está pronta para publicação.

✅ Checklist completo
✅ Sem problemas de segurança
✅ UI/UX adequada

Próximos passos:
1. Acesse o Developer Portal
2. Clique em "Publicar" para disponibilizar na App Store

Seu app estará disponível para todos os usuários do Bazari!

Equipe Bazari
```

---

## SLAs

| Tipo de App | SLA de Review |
|-------------|---------------|
| Primeira submissão | 72 horas |
| Update de versão | 48 horas |
| Hotfix (< 10 linhas) | 24 horas |
| App verificado | 24 horas |

---

## Métricas

| Métrica | Target |
|---------|--------|
| Tempo médio de review | < 48h |
| Taxa de aprovação | > 70% |
| Re-submissões por app | < 2 |
| Satisfação de devs | > 4.0/5 |

---

**Documento:** REVIEW-PROCESS-SPEC.md
**Versão:** 1.0.0
