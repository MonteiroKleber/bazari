# Feature: Filtro de Conteudo no Feed

## Objetivo

Adicionar opcoes de filtro para personalizar o tipo de conteudo exibido no feed (mostrar/ocultar reposts, enquetes, apenas midia, etc).

## Requisitos Funcionais

### Comportamento
- Botao de filtro ao lado do botao "Atualizar"
- Dropdown com opcoes de toggle:
  - Mostrar reposts (default: true)
  - Mostrar enquetes (default: true)
  - Apenas com midia (default: false)
- Filtros persistidos em localStorage
- Aplicados client-side (filtrar array de posts)

### Visual
- Icone de filtro (SlidersHorizontal ou Filter)
- Badge com contador de filtros ativos
- Dropdown com checkboxes
- Botao "Limpar filtros"

## Implementacao

### 1. Hook de Filtros

```typescript
// apps/web/src/hooks/useFeedFilters.ts

import { useState, useEffect, useCallback } from 'react';

interface FeedFilters {
  showReposts: boolean;
  showPolls: boolean;
  onlyWithMedia: boolean;
}

const DEFAULT_FILTERS: FeedFilters = {
  showReposts: true,
  showPolls: true,
  onlyWithMedia: false,
};

const STORAGE_KEY = 'bazari:feed-filters';

export function useFeedFilters() {
  const [filters, setFilters] = useState<FeedFilters>(() => {
    if (typeof window === 'undefined') return DEFAULT_FILTERS;

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return { ...DEFAULT_FILTERS, ...JSON.parse(stored) };
      } catch {
        return DEFAULT_FILTERS;
      }
    }
    return DEFAULT_FILTERS;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  }, [filters]);

  const updateFilter = useCallback(<K extends keyof FeedFilters>(
    key: K,
    value: FeedFilters[K]
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const activeFiltersCount = [
    !filters.showReposts,
    !filters.showPolls,
    filters.onlyWithMedia,
  ].filter(Boolean).length;

  const filterPosts = useCallback(<T extends { kind?: string; repostedBy?: any; media?: any[] }>(
    posts: T[]
  ): T[] => {
    return posts.filter((post) => {
      // Filtrar reposts
      if (!filters.showReposts && post.repostedBy) {
        return false;
      }

      // Filtrar enquetes
      if (!filters.showPolls && post.kind === 'poll') {
        return false;
      }

      // Apenas com midia
      if (filters.onlyWithMedia && (!post.media || post.media.length === 0)) {
        return false;
      }

      return true;
    });
  }, [filters]);

  return {
    filters,
    updateFilter,
    resetFilters,
    activeFiltersCount,
    filterPosts,
  };
}
```

### 2. Componente FeedFilterDropdown

```typescript
// apps/web/src/components/social/FeedFilterDropdown.tsx

import { SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

interface FeedFilters {
  showReposts: boolean;
  showPolls: boolean;
  onlyWithMedia: boolean;
}

interface FeedFilterDropdownProps {
  filters: FeedFilters;
  activeFiltersCount: number;
  onUpdateFilter: <K extends keyof FeedFilters>(key: K, value: FeedFilters[K]) => void;
  onReset: () => void;
}

export function FeedFilterDropdown({
  filters,
  activeFiltersCount,
  onUpdateFilter,
  onReset,
}: FeedFilterDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 relative">
          <SlidersHorizontal className="h-4 w-4" />
          <span className="hidden sm:inline">Filtros</span>
          {activeFiltersCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuCheckboxItem
          checked={filters.showReposts}
          onCheckedChange={(checked) => onUpdateFilter('showReposts', checked)}
        >
          Mostrar reposts
        </DropdownMenuCheckboxItem>

        <DropdownMenuCheckboxItem
          checked={filters.showPolls}
          onCheckedChange={(checked) => onUpdateFilter('showPolls', checked)}
        >
          Mostrar enquetes
        </DropdownMenuCheckboxItem>

        <DropdownMenuCheckboxItem
          checked={filters.onlyWithMedia}
          onCheckedChange={(checked) => onUpdateFilter('onlyWithMedia', checked)}
        >
          Apenas com midia
        </DropdownMenuCheckboxItem>

        {activeFiltersCount > 0 && (
          <>
            <DropdownMenuSeparator />
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-muted-foreground"
              onClick={onReset}
            >
              <X className="h-4 w-4 mr-2" />
              Limpar filtros
            </Button>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

### 3. Integrar em PersonalizedFeed

```typescript
// apps/web/src/components/social/PersonalizedFeed.tsx

import { useFeedFilters } from '@/hooks/useFeedFilters';
import { FeedFilterDropdown } from './FeedFilterDropdown';

export function PersonalizedFeed({ ... }) {
  const {
    filters,
    updateFilter,
    resetFilters,
    activeFiltersCount,
    filterPosts,
  } = useFeedFilters();

  // Aplicar filtros aos posts
  const filteredPosts = filterPosts(posts);

  return (
    <div className="w-full">
      {/* ... tabs ... */}

      {/* Toolbar com Refresh e Filtros */}
      <div className="flex justify-end gap-2 p-4 border-b bg-background/50">
        <FeedFilterDropdown
          filters={filters}
          activeFiltersCount={activeFiltersCount}
          onUpdateFilter={updateFilter}
          onReset={resetFilters}
        />

        <Button variant="ghost" size="sm" onClick={refresh} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline ml-2">Atualizar</span>
        </Button>
      </div>

      {/* Renderizar filteredPosts ao inves de posts */}
      {filteredPosts.map((post) => (
        <PostCard key={post.id} post={post} ... />
      ))}

      {/* Estado vazio quando filtros removem tudo */}
      {!loading && !error && filteredPosts.length === 0 && posts.length > 0 && (
        <div className="py-12 text-center">
          <p className="text-muted-foreground mb-4">
            Nenhum post corresponde aos filtros selecionados
          </p>
          <Button variant="outline" onClick={resetFilters}>
            Limpar filtros
          </Button>
        </div>
      )}
    </div>
  );
}
```

## Arquivos a Criar/Modificar

### Criar
- `apps/web/src/hooks/useFeedFilters.ts`
- `apps/web/src/components/social/FeedFilterDropdown.tsx`

### Modificar
- `apps/web/src/components/social/PersonalizedFeed.tsx` - Integrar filtros

## Consideracoes

### Performance
- Filtragem client-side e suficiente para feeds paginados
- Para filtros mais complexos, considerar backend

### UX
- Filtros persistem entre sessoes
- Badge indica quantos filtros ativos
- Facil de limpar todos os filtros

### Futuro
- Filtro por periodo (hoje, esta semana)
- Filtro por tipo de midia (so imagens, so videos)
- Salvar presets de filtros

## Testes

- [ ] Toggle de reposts funciona
- [ ] Toggle de enquetes funciona
- [ ] "Apenas com midia" funciona
- [ ] Filtros persistem apos reload
- [ ] Badge mostra contagem correta
- [ ] "Limpar filtros" reseta tudo
- [ ] Estado vazio quando filtros removem tudo
