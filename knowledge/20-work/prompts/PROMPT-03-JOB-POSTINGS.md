# Prompt 03: Publicação de Vagas

## Objetivo

Implementar o sistema de publicação e gerenciamento de vagas de emprego por empresas.

## Pré-requisitos

- Fase 1 (Perfil Profissional) implementada
- Modelo Company existente no sistema

## Contexto

Empresas podem publicar vagas com detalhes do trabalho. **Publicar vaga não gera vínculo.** Valores são informativos.

## Entrega Esperada

### 1. Backend (API)

#### 1.1 Schema Prisma

Adicionar em `apps/api/prisma/schema.prisma`:

```prisma
model JobPosting {
  id              String   @id @default(uuid())
  companyId       String
  company         Company  @relation(fields: [companyId], references: [id])
  createdById     String
  createdBy       User     @relation(fields: [createdById], references: [id])

  // Detalhes da vaga
  title           String
  description     String
  area            String
  skills          String[]
  workType        WorkPreference
  location        String?

  // Valores (informativos)
  paymentValue    Decimal? @db.Decimal(10, 2)
  paymentPeriod   PaymentPeriod?
  paymentCurrency String @default("BRL")

  // Status
  status          JobPostingStatus @default(DRAFT)

  // Metadados
  publishedAt     DateTime?
  closedAt        DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Relações
  applications    JobApplication[]
}

enum JobPostingStatus {
  DRAFT
  OPEN
  PAUSED
  CLOSED
}

enum PaymentPeriod {
  HOURLY
  DAILY
  WEEKLY
  MONTHLY
  PROJECT
}

model JobApplication {
  id              String   @id @default(uuid())
  jobPostingId    String
  jobPosting      JobPosting @relation(fields: [jobPostingId], references: [id])
  applicantId     String
  applicant       User     @relation(fields: [applicantId], references: [id])

  coverLetter     String?
  expectedValue   Decimal? @db.Decimal(10, 2)

  status          ApplicationStatus @default(PENDING)
  appliedAt       DateTime @default(now())
  reviewedAt      DateTime?

  @@unique([jobPostingId, applicantId])
}

enum ApplicationStatus {
  PENDING
  REVIEWED
  SHORTLISTED
  REJECTED
  HIRED
}
```

#### 1.2 Endpoints de Vagas

Criar em `apps/api/src/routes/work/jobs.ts`:

```typescript
// Gestão de Vagas (empresa)
POST   /api/work/jobs              // Criar vaga
GET    /api/work/jobs              // Listar vagas da empresa
GET    /api/work/jobs/:id          // Detalhes da vaga
PATCH  /api/work/jobs/:id          // Atualizar vaga
DELETE /api/work/jobs/:id          // Deletar vaga (soft)
POST   /api/work/jobs/:id/publish  // Publicar vaga
POST   /api/work/jobs/:id/pause    // Pausar vaga
POST   /api/work/jobs/:id/close    // Fechar vaga

// Busca Pública
GET    /api/work/jobs/search       // Buscar vagas abertas
GET    /api/work/jobs/:id/public   // Detalhes públicos da vaga
```

**Request POST (Criar Vaga):**
```json
{
  "title": "Desenvolvedor Full Stack",
  "description": "Buscamos desenvolvedor...",
  "area": "Desenvolvimento de Software",
  "skills": ["typescript", "react", "nodejs"],
  "workType": "REMOTE",
  "location": null,
  "paymentValue": 8000.00,
  "paymentPeriod": "MONTHLY",
  "paymentCurrency": "BRL"
}
```

**Response:**
```json
{
  "job": {
    "id": "uuid",
    "title": "Desenvolvedor Full Stack",
    "description": "Buscamos desenvolvedor...",
    "area": "Desenvolvimento de Software",
    "skills": ["typescript", "react", "nodejs"],
    "workType": "REMOTE",
    "location": null,
    "paymentValue": "8000.00",
    "paymentPeriod": "MONTHLY",
    "status": "DRAFT",
    "company": {
      "id": "uuid",
      "name": "TechCorp",
      "logoUrl": "..."
    },
    "createdAt": "2025-01-15T10:00:00Z"
  }
}
```

#### 1.3 Busca de Vagas

**Query Parameters:**
```typescript
interface JobSearchParams {
  q?: string;
  skills?: string[];
  area?: string;
  workType?: WorkPreference[];
  location?: string;
  minPayment?: number;
  maxPayment?: number;
  paymentPeriod?: PaymentPeriod;
  companyId?: string;
  sortBy?: 'relevance' | 'payment' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  cursor?: string;
  limit?: number;
}
```

**Response:**
```json
{
  "items": [
    {
      "id": "uuid",
      "title": "Desenvolvedor Full Stack",
      "area": "Desenvolvimento de Software",
      "skills": ["typescript", "react", "nodejs"],
      "workType": "REMOTE",
      "paymentValue": "8000.00",
      "paymentPeriod": "MONTHLY",
      "company": {
        "id": "uuid",
        "name": "TechCorp",
        "logoUrl": "..."
      },
      "publishedAt": "2025-01-15T10:00:00Z",
      "applicationsCount": 23
    }
  ],
  "nextCursor": "...",
  "total": 156
}
```

#### 1.4 Endpoints de Candidaturas

```typescript
// Candidato
POST   /api/work/jobs/:id/apply           // Candidatar-se
DELETE /api/work/jobs/:id/apply           // Retirar candidatura

// Empresa
GET    /api/work/jobs/:id/applications    // Listar candidaturas
PATCH  /api/work/jobs/:id/applications/:appId  // Atualizar status
```

### 2. Frontend (Web)

#### 2.1 Páginas

```
pages/
  JobSearchPage.tsx           # Busca de vagas (público)
  JobDetailPage.tsx           # Detalhes da vaga (público)
  JobManagePage.tsx           # Gestão de vagas (empresa)
  JobCreateEditPage.tsx       # Criar/editar vaga
  JobApplicationsPage.tsx     # Ver candidaturas (empresa)
```

#### 2.2 Componentes

```
components/
  JobCard.tsx                 # Card de vaga na listagem
  JobFilters.tsx              # Filtros de busca
  JobForm.tsx                 # Formulário de vaga
  ApplicationCard.tsx         # Card de candidatura
  ApplicationModal.tsx        # Modal para candidatar-se
```

#### 2.3 JobSearchPage.tsx

Layout:
```
┌─────────────────────────────────────────────┐
│  [🔍 Buscar vagas...]                       │
├─────────────────────────────────────────────┤
│ Filtros:                                    │
│ [Skills ▼] [Área ▼] [Tipo ▼] [Valor]       │
├─────────────────────────────────────────────┤
│ 156 vagas encontradas                       │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ Desenvolvedor Full Stack                │ │
│ │ TechCorp • Remoto                       │ │
│ │ typescript • react • nodejs             │ │
│ │ R$ 8.000/mês      23 candidatos         │ │
│ │ Publicada há 2 dias    [Ver Vaga]       │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

#### 2.4 JobDetailPage.tsx

Layout:
```
┌─────────────────────────────────────────────┐
│ ← Voltar                                    │
├─────────────────────────────────────────────┤
│ Desenvolvedor Full Stack                    │
│ TechCorp                                    │
│                                             │
│ 🏠 Remoto                                   │
│ 💰 R$ 8.000/mês                             │
│ 📅 Publicada há 2 dias                      │
├─────────────────────────────────────────────┤
│ Descrição                                   │
│ Buscamos desenvolvedor com experiência...  │
├─────────────────────────────────────────────┤
│ Habilidades                                 │
│ typescript • react • nodejs • graphql       │
├─────────────────────────────────────────────┤
│ Sobre a Empresa                             │
│ [Logo] TechCorp                             │
│ Empresa de tecnologia...                    │
├─────────────────────────────────────────────┤
│        [Candidatar-se]                      │
└─────────────────────────────────────────────┘
```

#### 2.5 JobManagePage.tsx (Empresa)

Layout:
```
┌─────────────────────────────────────────────┐
│ Minhas Vagas              [+ Nova Vaga]     │
├─────────────────────────────────────────────┤
│ [Tabs: Abertas | Rascunhos | Fechadas]      │
├─────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────┐ │
│ │ Desenvolvedor Full Stack    🟢 Aberta   │ │
│ │ 23 candidatos                           │ │
│ │ [Editar] [Pausar] [Ver Candidatos]      │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

### 3. Integração com Feed

Ao publicar vaga:
```typescript
await createFeedEvent({
  type: 'JOB_POSTED',
  companyId: job.companyId,
  data: {
    jobId: job.id,
    title: job.title,
    area: job.area,
    workType: job.workType
    // NÃO incluir valores
  }
});
```

### 4. Rotas

```tsx
// Público
<Route path="work/jobs" element={<JobSearchPage />} />
<Route path="work/jobs/:id" element={<JobDetailPage />} />

// Empresa (requer auth + company)
<Route path="work/manage/jobs" element={<JobManagePage />} />
<Route path="work/manage/jobs/new" element={<JobCreateEditPage />} />
<Route path="work/manage/jobs/:id/edit" element={<JobCreateEditPage />} />
<Route path="work/manage/jobs/:id/applications" element={<JobApplicationsPage />} />
```

## Critérios de Aceite

- [ ] Empresa pode criar/editar/publicar vagas
- [ ] Busca de vagas funciona com filtros
- [ ] Usuário pode candidatar-se a vaga
- [ ] Empresa pode ver e gerenciar candidaturas
- [ ] Evento no Feed ao publicar (sem valores)
- [ ] Apenas empresas podem criar vagas
- [ ] Apenas vagas OPEN aparecem na busca pública

## Arquivos a Criar/Modificar

```
apps/api/
  prisma/schema.prisma (modificar)
  src/routes/work/jobs.ts (criar)
  src/routes/work/index.ts (modificar)

apps/web/src/modules/work/
  pages/JobSearchPage.tsx
  pages/JobDetailPage.tsx
  pages/JobManagePage.tsx
  pages/JobCreateEditPage.tsx
  pages/JobApplicationsPage.tsx
  components/JobCard.tsx
  components/JobFilters.tsx
  components/JobForm.tsx
  components/ApplicationCard.tsx
  components/ApplicationModal.tsx
  api.ts (modificar)

apps/web/src/App.tsx (modificar)
```
