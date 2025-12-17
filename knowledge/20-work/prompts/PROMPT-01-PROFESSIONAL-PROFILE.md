# Prompt 01: Extensão de Perfil Profissional

## Objetivo

Implementar a extensão profissional do perfil Bazari existente, permitindo que usuários ativem funcionalidades de trabalho.

## Contexto

O Bazari Work **não cria perfis novos**. Ele estende o perfil único existente com campos profissionais opcionais.

## Entrega Esperada

### 1. Backend (API)

#### 1.1 Schema Prisma

Criar/atualizar em `apps/api/prisma/schema.prisma`:

```prisma
model ProfessionalProfile {
  id                String   @id @default(uuid())
  userId            String   @unique
  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Dados profissionais
  professionalArea  String?
  skills            String[]
  experience        String?
  hourlyRate        Decimal? @db.Decimal(10, 2)
  hourlyRateCurrency String @default("BRL")
  workPreference    WorkPreference @default(REMOTE)

  // Visibilidade
  status            ProfessionalStatus @default(AVAILABLE)
  showHourlyRate    Boolean @default(false)

  // Metadados
  activatedAt       DateTime?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}

enum ProfessionalStatus {
  AVAILABLE
  NOT_AVAILABLE
  INVISIBLE
}

enum WorkPreference {
  REMOTE
  ON_SITE
  HYBRID
}
```

#### 1.2 Endpoints

Criar em `apps/api/src/routes/work/professional.ts`:

```typescript
// GET /api/work/profile - Obtém perfil profissional do usuário logado
// POST /api/work/profile - Cria/ativa perfil profissional
// PATCH /api/work/profile - Atualiza perfil profissional
// DELETE /api/work/profile - Desativa perfil profissional (soft delete)
// PATCH /api/work/profile/status - Altera status de disponibilidade
```

**Request POST/PATCH:**
```json
{
  "professionalArea": "Desenvolvimento de Software",
  "skills": ["typescript", "react", "nodejs"],
  "experience": "5 anos de experiência...",
  "hourlyRate": 150.00,
  "hourlyRateCurrency": "BRL",
  "workPreference": "REMOTE",
  "status": "AVAILABLE",
  "showHourlyRate": true
}
```

**Response:**
```json
{
  "profile": {
    "id": "uuid",
    "userId": "uuid",
    "professionalArea": "Desenvolvimento de Software",
    "skills": ["typescript", "react", "nodejs"],
    "experience": "5 anos de experiência...",
    "hourlyRate": "150.00",
    "workPreference": "REMOTE",
    "status": "AVAILABLE",
    "showHourlyRate": true,
    "activatedAt": "2025-01-15T10:00:00Z"
  }
}
```

#### 1.3 Validações

- `skills`: máximo 20 itens, cada tag max 50 chars, normalizar para lowercase
- `professionalArea`: selecionar de lista predefinida
- `hourlyRate`: mínimo 0, máximo 10000
- `experience`: máximo 5000 caracteres

#### 1.4 Lista de Áreas Profissionais

```typescript
const PROFESSIONAL_AREAS = [
  'Desenvolvimento de Software',
  'Design',
  'Marketing',
  'Vendas',
  'Suporte ao Cliente',
  'Recursos Humanos',
  'Finanças',
  'Jurídico',
  'Administração',
  'Produção de Conteúdo',
  'Educação',
  'Saúde',
  'Engenharia',
  'Arquitetura',
  'Consultoria',
  'Outro'
];
```

### 2. Frontend (Web)

#### 2.1 Páginas

Criar em `apps/web/src/modules/work/`:

```
pages/
  WorkProfilePage.tsx      # Visualização do próprio perfil
  WorkProfileEditPage.tsx  # Edição do perfil
components/
  ProfessionalStatusBadge.tsx
  SkillsInput.tsx
  WorkPreferenceSelector.tsx
  AreaSelector.tsx
```

#### 2.2 WorkProfilePage.tsx

- Exibir dados do perfil profissional
- Se não ativado, mostrar CTA para ativar
- Botão "Editar Perfil"
- Toggle rápido de status (disponível/indisponível/invisível)

#### 2.3 WorkProfileEditPage.tsx

- Formulário completo de edição
- Validação em tempo real
- Preview do perfil
- Botão salvar/cancelar

#### 2.4 Componentes

**ProfessionalStatusBadge:**
```tsx
interface Props {
  status: 'AVAILABLE' | 'NOT_AVAILABLE' | 'INVISIBLE';
  size?: 'sm' | 'md' | 'lg';
}
// Verde = disponível, Amarelo = não disponível, Cinza = invisível
```

**SkillsInput:**
```tsx
interface Props {
  value: string[];
  onChange: (skills: string[]) => void;
  max?: number;
  suggestions?: string[];
}
// Input com tags, autocomplete, limite de itens
```

### 3. Integração com Feed

Ao ativar perfil profissional pela primeira vez:

```typescript
await createFeedEvent({
  type: 'PROFESSIONAL_PROFILE_ACTIVATED',
  userId: user.id,
  data: {
    area: profile.professionalArea,
    skills: profile.skills.slice(0, 5) // primeiras 5 skills
  }
});
```

### 4. Rotas

Adicionar ao App.tsx:
```tsx
<Route path="work/profile" element={<WorkProfilePage />} />
<Route path="work/profile/edit" element={<WorkProfileEditPage />} />
```

## Critérios de Aceite

- [ ] Usuário pode ativar perfil profissional
- [ ] Usuário pode editar todos os campos
- [ ] Validações funcionam corretamente
- [ ] Status de disponibilidade reflete na UI
- [ ] Evento publicado no Feed ao ativar
- [ ] Perfis invisíveis não aparecem em buscas (preparar para Fase 2)

## Arquivos a Criar/Modificar

```
apps/api/
  prisma/schema.prisma (modificar)
  src/routes/work/professional.ts (criar)
  src/routes/work/index.ts (criar)

apps/web/src/
  modules/work/
    pages/WorkProfilePage.tsx
    pages/WorkProfileEditPage.tsx
    components/ProfessionalStatusBadge.tsx
    components/SkillsInput.tsx
    components/WorkPreferenceSelector.tsx
    components/AreaSelector.tsx
    api.ts
    index.ts
  App.tsx (modificar - adicionar rotas)
```

## Não Implementar Nesta Fase

- Busca de talentos (Fase 2)
- Publicação de vagas (Fase 3)
- Propostas (Fase 4)
- On-chain (Fase 6)
