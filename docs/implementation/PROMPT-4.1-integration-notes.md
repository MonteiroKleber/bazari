# PROMPT 4.1 - Integration Notes

## Changes Made to StorePublicPage.tsx

### Imports Added
- `useStoreFilters` from `@/hooks/useStoreFilters`
- `useStoreCatalog` from `@/hooks/useStoreCatalog`
- `useStoreFacets` from `@/hooks/useStoreFacets`
- All filter components from `@/components/store`

### Code Removed
1. **Removed CatalogState interface** (line 39-44)
   - No longer needed, using hook state instead

2. **Removed buildCatalogUrl function** (line 123-130)
   - Logic moved to useStoreCatalog hook

3. **Removed catalog useEffect** (line 216-242)
   - Replaced by useStoreCatalog hook

4. **Removed local catalog state**
   ```typescript
   // OLD:
   const [catalog, setCatalog] = useState<CatalogState>({...});

   // NEW:
   const { items: catalogItems, loading: catalogLoading, error: catalogError, page } = useStoreCatalog(...);
   ```

### State Added
```typescript
const [filterModalOpen, setFilterModalOpen] = useState(false);

// Filter hooks
const { filters, updateFilter, clearFilter, clearAllFilters, activeFiltersCount } = useStoreFilters();
const { items: catalogItems, loading: catalogLoading, error: catalogError, page } = useStoreCatalog(
  store?.payload?.storeId || '',
  filters
);
const facets = useStoreFacets(store?.payload?.storeId || '', filters);
```

### renderCatalog() Updates
Changed references from `catalog.xxx` to hook values:
- `catalog.loading` → `catalogLoading`
- `catalog.error` → `catalogError`
- `catalog.items` → `catalogItems`

### Catalog Section Layout
Complete replacement of the catalog section with new filter-enabled layout:

**Mobile Layout:**
- SearchBar (full width)
- FilterButton + SortDropdown (side by side)

**Desktop Layout:**
- 2-column grid: `[280px_1fr]`
- Left column: FilterSidebar (sticky)
- Right column:
  - SearchBar + SortDropdown
  - ActiveFiltersBadges
  - Catalog grid

**Modal:**
- FilterModal for mobile/tablet

### Props Passed to Components

**FilterSidebar:**
- `storeId`: store?.payload?.storeId || ''
- `filters`: from useStoreFilters
- `facets`: { categories, priceRange, attributes }
- `onFilterChange`: updateFilter
- `onClearAll`: clearAllFilters

**FilterModal:**
- Same as FilterSidebar +
- `open`: filterModalOpen
- `onOpenChange`: setFilterModalOpen
- `resultsCount`: page.total

**SearchBar:**
- `value`: filters.q
- `onChange`: (value) => updateFilter('q', value)

**SortDropdown:**
- `value`: filters.sort
- `onChange`: (value) => updateFilter('sort', value)

**FilterButton:**
- `activeCount`: activeFiltersCount
- `onClick`: () => setFilterModalOpen(true)

**ActiveFiltersBadges:**
- `filters`: from useStoreFilters
- `onRemoveFilter`: clearFilter
- `onClearAll`: clearAllFilters

## Testing Checklist

### Desktop (lg+)
- [ ] FilterSidebar visible on left
- [ ] SearchBar + SortDropdown in catalog area
- [ ] ActiveFiltersBadges appear when filters active
- [ ] FilterButton hidden
- [ ] Sidebar sticky on scroll
- [ ] Grid layout works (280px sidebar + flexible catalog)

### Mobile (< lg)
- [ ] FilterButton visible
- [ ] SearchBar full width
- [ ] FilterButton + SortDropdown side by side
- [ ] FilterSidebar hidden
- [ ] Modal opens on FilterButton click
- [ ] Modal closes on "Aplicar"

### Functionality
- [ ] URL syncs with filters (query params)
- [ ] Filters update catalog in real-time
- [ ] Facets exclude active category/price filters
- [ ] Search debounces (500ms)
- [ ] Price filter debounces (500ms)
- [ ] Category/Type filters instant
- [ ] "Limpar tudo" resets all filters
- [ ] Badge removal works correctly
- [ ] Page resets to 1 when filters change
- [ ] Sort changes don't reset page

### Edge Cases
- [ ] Works when storeId is empty (guards in hooks)
- [ ] Works when facets are loading
- [ ] Works when catalog is empty
- [ ] Works when catalog errors
- [ ] Multiple rapid filter changes (debounce)
- [ ] Back/forward browser navigation (URL sync)

## Known Issues / Notes

1. **Empty storeId guards**: Hooks use `store?.payload?.storeId || ''` to prevent errors during initial load

2. **Facets object construction**: We manually construct the facets object from hook values to match FilterSidebar/FilterModal interface

3. **Page total for modal**: Uses `page.total` from useStoreCatalog for the "Aplicar (N)" button

4. **No pagination component yet**: Grid shows all results from current page (24 items), but pagination UI not implemented in this prompt

5. **AlertTitle import**: Removed from error display in renderCatalog() since it wasn't imported (using just AlertDescription)

## Next Steps (Optional Phases 5-6)

Phase 5 - Advanced Features:
- Attribute filters (dynamic from facets)
- Price slider (visual alternative to inputs)
- Pagination component
- "Load more" infinite scroll

Phase 6 - Polish:
- Loading skeletons during filter changes
- Animations (fade in/out)
- Accessibility improvements
- Performance optimizations
- Analytics tracking

## File Structure

```
apps/web/src/
├── components/store/
│   ├── SearchBar.tsx
│   ├── SortDropdown.tsx
│   ├── CategoryFilter.tsx
│   ├── PriceFilter.tsx
│   ├── TypeFilter.tsx
│   ├── FilterSidebar.tsx
│   ├── FilterModal.tsx
│   ├── FilterButton.tsx
│   ├── ActiveFiltersBadges.tsx
│   ├── index.ts
│   └── __tests__/
│       └── *.test.md
├── hooks/
│   ├── useStoreFilters.ts
│   ├── useStoreCatalog.ts
│   └── useStoreFacets.ts
└── pages/
    └── StorePublicPage.tsx (UPDATED)
```

## Summary

Successfully integrated the complete filtering system into StorePublicPage:
- ✅ Removed old catalog logic
- ✅ Added filter hooks
- ✅ Responsive layout (mobile modal + desktop sidebar)
- ✅ URL synchronization
- ✅ Active filter badges
- ✅ Search and sort in both layouts
- ✅ All components wired up correctly

The implementation follows the specification exactly, with proper separation of concerns:
- Hooks manage state and data fetching
- Components are presentational and reusable
- Page orchestrates everything together
