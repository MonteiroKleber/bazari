# Feature: Skeleton Loading no Perfil

## Objetivo

Substituir a tela de loading simples ("Carregando...") por um skeleton animado que mostra a estrutura da pagina, melhorando a percepcao de velocidade.

## Requisitos Funcionais

### Comportamento
- Exibir skeleton enquanto `loading === true`
- Skeleton deve replicar a estrutura real:
  - Banner (retangulo)
  - Avatar (circulo)
  - Nome e handle (linhas)
  - Bio (linhas)
  - Contadores (3 blocos)
  - Tabs (5 botoes)
  - Posts (cards)

### Visual
- Usar animacao pulse/shimmer do Tailwind
- Cores consistentes com tema (light/dark mode)
- Proporcoes aproximadas aos elementos reais

## Implementacao

### 1. Criar Componente ProfileSkeleton

```typescript
// apps/web/src/components/profile/ProfileSkeleton.tsx

export function ProfileSkeleton() {
  return (
    <div className="container mx-auto px-4 py-0 mobile-safe-bottom animate-pulse">
      {/* Banner Skeleton */}
      <div className="w-full h-48 md:h-64 bg-muted rounded-lg" />

      {/* Profile Header */}
      <div className="relative -mt-12 md:-mt-16 px-4 md:px-6">
        <div className="flex flex-col md:flex-row md:items-end gap-4 mb-6">
          {/* Avatar */}
          <div className="h-24 w-24 md:h-32 md:w-32 rounded-full bg-muted border-4 border-background" />

          {/* Info */}
          <div className="flex-1 space-y-3">
            <div className="h-8 w-48 bg-muted rounded" />
            <div className="h-4 w-32 bg-muted rounded" />
            <div className="h-4 w-64 bg-muted rounded" />
          </div>

          {/* Follow Button */}
          <div className="h-10 w-24 bg-muted rounded" />
        </div>
      </div>

      {/* Counters */}
      <div className="mb-6 flex gap-6">
        <div className="h-4 w-20 bg-muted rounded" />
        <div className="h-4 w-20 bg-muted rounded" />
        <div className="h-4 w-20 bg-muted rounded" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 border-b pb-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-8 w-20 bg-muted rounded" />
        ))}
      </div>

      {/* Posts Skeleton */}
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <PostCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
```

### 2. Usar Componente Existente PostCardSkeleton

O componente `PostCardSkeleton` ja existe em:
```
apps/web/src/components/social/PostCardSkeleton.tsx
```

Importar e reutilizar.

### 3. Integrar em ProfilePublicPage

```typescript
// apps/web/src/pages/ProfilePublicPage.tsx

import { ProfileSkeleton } from '@/components/profile/ProfileSkeleton';

// Substituir:
if (loading) return <div className="container mx-auto p-6">{t('profile.loading')}</div>;

// Por:
if (loading) return <ProfileSkeleton />;
```

## Arquivos a Criar/Modificar

### Criar
- `apps/web/src/components/profile/ProfileSkeleton.tsx`

### Modificar
- `apps/web/src/pages/ProfilePublicPage.tsx` - Usar skeleton no loading

## Testes

- [ ] Skeleton aparece durante loading inicial
- [ ] Proporcoes sao consistentes com layout real
- [ ] Animacao pulse funciona
- [ ] Dark mode renderiza corretamente
- [ ] Nao ha flash quando dados carregam
