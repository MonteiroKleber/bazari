# Prompt 02: Busca de Talentos (Marketplace)

## Objetivo

Implementar o marketplace de talentos, permitindo que empresas e usuários busquem profissionais disponíveis.

## Pré-requisitos

- Fase 1 (Perfil Profissional) implementada

## Contexto

A lista de talentos **não é uma entidade separada**. É uma consulta filtrada sobre perfis existentes com extensão profissional ativa.

## Entrega Esperada

### 1. Backend (API)

#### 1.1 Endpoint de Busca

Criar em `apps/api/src/routes/work/talents.ts`:

```typescript
// GET /api/work/talents - Lista talentos com filtros
```

**Query Parameters:**
```typescript
interface TalentSearchParams {
  q?: string;                    // Busca textual (nome, skills, área)
  skills?: string[];             // Filtro por skills (OR)
  area?: string;                 // Filtro por área
  workPreference?: WorkPreference[];
  location?: string;             // Filtro por localização (se disponível)
  minHourlyRate?: number;
  maxHourlyRate?: number;
  status?: 'AVAILABLE' | 'NOT_AVAILABLE'; // INVISIBLE nunca aparece
  sortBy?: 'relevance' | 'hourlyRate' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  cursor?: string;
  limit?: number;                // max 50
}
```

**Response:**
```json
{
  "items": [
    {
      "id": "uuid",
      "user": {
        "id": "uuid",
        "handle": "johndoe",
        "displayName": "John Doe",
        "avatarUrl": "https://..."
      },
      "professionalArea": "Desenvolvimento de Software",
      "skills": ["typescript", "react", "nodejs"],
      "workPreference": "REMOTE",
      "status": "AVAILABLE",
      "hourlyRate": "150.00",       // null se showHourlyRate=false
      "hourlyRateCurrency": "BRL",
      "matchScore": 0.85            // relevância para a busca
    }
  ],
  "nextCursor": "...",
  "total": 234
}
```

#### 1.2 Lógica de Busca

```typescript
// Relevância calculada por:
// 1. Match exato de skills (peso 3)
// 2. Match parcial de skills (peso 1)
// 3. Match de área (peso 2)
// 4. Disponibilidade (AVAILABLE > NOT_AVAILABLE)

// Filtros obrigatórios:
// - status != 'INVISIBLE'
// - activatedAt IS NOT NULL
```

#### 1.3 Endpoint de Perfil Público

```typescript
// GET /api/work/talents/:handle - Perfil profissional público
```

**Response:**
```json
{
  "profile": {
    "id": "uuid",
    "user": {
      "id": "uuid",
      "handle": "johndoe",
      "displayName": "John Doe",
      "avatarUrl": "https://...",
      "bio": "..."
    },
    "professionalArea": "Desenvolvimento de Software",
    "skills": ["typescript", "react", "nodejs"],
    "experience": "5 anos de experiência...",
    "workPreference": "REMOTE",
    "status": "AVAILABLE",
    "hourlyRate": "150.00",
    "activatedAt": "2025-01-15T10:00:00Z",
    "stats": {
      "agreementsCompleted": 12,
      "averageRating": 4.8,
      "totalEvaluations": 10
    }
  },
  "canSendProposal": true  // false se próprio perfil ou já tem proposta pendente
}
```

### 2. Frontend (Web)

#### 2.1 Páginas

Criar em `apps/web/src/modules/work/`:

```
pages/
  TalentSearchPage.tsx       # Busca de talentos
  TalentProfilePage.tsx      # Perfil público do talento
```

#### 2.2 Componentes

```
components/
  TalentCard.tsx             # Card de talento na listagem
  TalentFilters.tsx          # Painel de filtros
  SkillTagList.tsx           # Lista de skills com visual
  TalentSearchBar.tsx        # Barra de busca
```

#### 2.3 TalentSearchPage.tsx

Layout:
```
┌─────────────────────────────────────────────┐
│  [🔍 Buscar talentos...]                    │
├─────────────────────────────────────────────┤
│ Filtros:                                    │
│ [Skills ▼] [Área ▼] [Preferência ▼] [Valor]│
├─────────────────────────────────────────────┤
│ 234 profissionais encontrados               │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ [Avatar] John Doe         DISPONÍVEL    │ │
│ │          Desenvolvimento de Software    │ │
│ │          typescript • react • nodejs    │ │
│ │          R$ 150/hora    [Ver Perfil]    │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ [Avatar] Jane Smith       INDISPONÍVEL  │ │
│ │          Design UX/UI                   │ │
│ │          figma • ux • design-system     │ │
│ │          R$ 200/hora    [Ver Perfil]    │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│            [Carregar mais]                  │
└─────────────────────────────────────────────┘
```

#### 2.4 TalentProfilePage.tsx

Layout:
```
┌─────────────────────────────────────────────┐
│ ← Voltar                                    │
├─────────────────────────────────────────────┤
│ [Avatar Grande]                             │
│ John Doe                    🟢 Disponível   │
│ @johndoe                                    │
│                                             │
│ Desenvolvimento de Software                 │
│ typescript • react • nodejs • graphql       │
│                                             │
│ R$ 150/hora                                 │
│ 🏠 Remoto                                   │
├─────────────────────────────────────────────┤
│ Sobre                                       │
│ 5 anos de experiência em desenvolvimento... │
├─────────────────────────────────────────────┤
│ Estatísticas                                │
│ 12 acordos • ⭐ 4.8 (10 avaliações)         │
├─────────────────────────────────────────────┤
│        [Enviar Proposta]                    │
└─────────────────────────────────────────────┘
```

#### 2.5 TalentCard.tsx

```tsx
interface TalentCardProps {
  talent: {
    id: string;
    user: { handle: string; displayName: string; avatarUrl?: string };
    professionalArea: string;
    skills: string[];
    workPreference: string;
    status: string;
    hourlyRate?: string;
    hourlyRateCurrency?: string;
  };
  onClick?: () => void;
}
```

#### 2.6 TalentFilters.tsx (Mobile-friendly)

- Desktop: filtros inline
- Mobile: bottom sheet com filtros

```tsx
interface TalentFiltersProps {
  value: FilterValues;
  onChange: (filters: FilterValues) => void;
  skillSuggestions?: string[];
  areas?: string[];
}
```

### 3. Rotas

Adicionar ao App.tsx:
```tsx
<Route path="work/talents" element={<TalentSearchPage />} />
<Route path="work/talents/:handle" element={<TalentProfilePage />} />
```

### 4. Navegação

Adicionar entrada no menu/hub do Bazari Work:
- "Buscar Talentos" → /work/talents

## Critérios de Aceite

- [ ] Busca textual funciona (nome, skills, área)
- [ ] Filtros funcionam corretamente
- [ ] Perfis INVISIBLE nunca aparecem
- [ ] Ordenação por relevância funciona
- [ ] Infinite scroll / paginação
- [ ] Perfil público exibe todas as informações
- [ ] Botão "Enviar Proposta" visível (preparar para Fase 4)
- [ ] Responsivo (mobile-first)

## Arquivos a Criar/Modificar

```
apps/api/src/routes/work/
  talents.ts (criar)
  index.ts (modificar)

apps/web/src/modules/work/
  pages/TalentSearchPage.tsx (criar)
  pages/TalentProfilePage.tsx (criar)
  components/TalentCard.tsx (criar)
  components/TalentFilters.tsx (criar)
  components/SkillTagList.tsx (criar)
  components/TalentSearchBar.tsx (criar)
  api.ts (modificar)

apps/web/src/App.tsx (modificar)
```

## Performance

- Índices no banco para skills (GIN) e área
- Cache de 5min para listagem (se sem filtros específicos)
- Debounce de 300ms na busca textual
