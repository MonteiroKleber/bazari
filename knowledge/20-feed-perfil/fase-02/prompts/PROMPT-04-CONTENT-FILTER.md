# Prompt: Implementar Filtro de Conteudo

## IMPORTANTE: Codigo de Producao

**ATENCAO**: Toda implementacao deve ser **CODIGO FINAL DE PRODUCAO**.

- **NAO** usar dados mockados
- **NAO** usar placeholders ou TODOs
- **NAO** deixar funcionalidades incompletas
- **NAO** usar valores hardcoded que deveriam vir do banco/API
- **NAO** assumir como algo deve funcionar - PERGUNTE se tiver duvida

**EM CASO DE DUVIDA**: Pare e pergunte ao usuario antes de implementar.

---

## Objetivo

Adicionar filtros para personalizar tipo de conteudo no feed.

## Especificacao

Leia a especificacao completa em: `knowledge/20-feed-perfil/fase-02/04-CONTENT-FILTER.md`

## Ordem de Implementacao

### Etapa 1: Hook useFeedFilters

Criar `apps/web/src/hooks/useFeedFilters.ts`:

```typescript
interface FeedFilters {
  showReposts: boolean;    // default: true
  showPolls: boolean;      // default: true
  onlyWithMedia: boolean;  // default: false
}
```

Funcionalidades:
- Carregar de localStorage na inicializacao
- Salvar em localStorage ao mudar
- Funcao `filterPosts()` para aplicar filtros
- Contador `activeFiltersCount`
- Funcao `resetFilters()`

### Etapa 2: Componente FeedFilterDropdown

Criar `apps/web/src/components/social/FeedFilterDropdown.tsx`:

- DropdownMenu com DropdownMenuCheckboxItem
- Badge com contador de filtros ativos
- Botao "Limpar filtros" quando ha filtros ativos

### Etapa 3: Integrar em PersonalizedFeed

Modificar `apps/web/src/components/social/PersonalizedFeed.tsx`:

1. Importar hook e componente
2. Adicionar dropdown ao lado do botao "Atualizar"
3. Aplicar `filterPosts()` antes de renderizar
4. Mostrar estado vazio especifico quando filtros removem tudo

## Arquivos a Criar/Modificar

### Criar
- [ ] `apps/web/src/hooks/useFeedFilters.ts`
- [ ] `apps/web/src/components/social/FeedFilterDropdown.tsx`

### Modificar
- [ ] `apps/web/src/components/social/PersonalizedFeed.tsx`

## Cenarios de Teste

1. [ ] Toggle reposts funciona
2. [ ] Toggle enquetes funciona
3. [ ] "Apenas com midia" funciona
4. [ ] Filtros persistem apos reload
5. [ ] Badge mostra contagem correta
6. [ ] "Limpar filtros" reseta tudo
7. [ ] Estado vazio quando filtros removem tudo

## Commit

```bash
git add .
git commit -m "feat(feed): add content filters

- Create useFeedFilters hook with localStorage persistence
- Create FeedFilterDropdown component
- Filter reposts, polls, and media-only posts
- Show active filters count badge"
```
