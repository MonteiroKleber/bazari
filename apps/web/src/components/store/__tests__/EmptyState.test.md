# EmptyState Component - Testing Guide

## Overview
The EmptyState component provides contextual feedback when no products are found in the catalog. It adapts its message and suggestions based on whether filters or search terms are active.

## Component Location
`/apps/web/src/components/store/EmptyState.tsx`

## Visual Design

### Variant 1: Empty Store (No Filters)
```
┌────────────────────────────────────┐
│                                    │
│           ┌──────────┐            │
│           │    📦    │            │
│           └──────────┘            │
│                                    │
│    Esta loja ainda não tem         │
│         produtos                   │
│                                    │
│  O vendedor ainda não adicionou    │
│  produtos ao catálogo. Volte mais  │
│  tarde para conferir novidades!    │
│                                    │
└────────────────────────────────────┘
```

**When shown:**
- `hasFilters = false`
- `searchTerm = undefined`
- No products in catalog

**Elements:**
- 📦 Package icon in circle background
- Heading: "Esta loja ainda não tem produtos"
- Description: Encourages user to check back later
- No action button

### Variant 2: Search No Results
```
┌────────────────────────────────────┐
│                                    │
│           ┌──────────┐            │
│           │    🔍    │            │
│           └──────────┘            │
│                                    │
│    Nenhum produto encontrado       │
│      para "notebook gamer"         │
│                                    │
│           Tente:                   │
│   • Buscar outros termos ou        │
│     verificar a ortografia         │
│   • Ajustar os filtros aplicados   │
│   • Remover alguns filtros         │
│                                    │
│   ┌──────────────────────────┐   │
│   │ Limpar todos os filtros  │   │
│   └──────────────────────────┘   │
│                                    │
└────────────────────────────────────┘
```

**When shown:**
- `hasFilters = true` (search counts as filter)
- `searchTerm = "notebook gamer"`
- 0 results

**Elements:**
- 🔍 Search icon in circle background
- Heading: "Nenhum produto encontrado para '[term]'"
- 3 suggestions (search-focused first)
- "Limpar todos os filtros" button

### Variant 3: Filters No Results
```
┌────────────────────────────────────┐
│                                    │
│           ┌──────────┐            │
│           │    🎛️    │            │
│           └──────────┘            │
│                                    │
│      Nenhum produto                │
│       encontrado                   │
│                                    │
│           Tente:                   │
│   • Ajustar os filtros aplicados   │
│   • Remover alguns filtros para    │
│     ver mais produtos              │
│   • Navegar por todas as           │
│     categorias                     │
│                                    │
│   ┌──────────────────────────┐   │
│   │ Limpar todos os filtros  │   │
│   └──────────────────────────┘   │
│                                    │
└────────────────────────────────────┘
```

**When shown:**
- `hasFilters = true`
- `searchTerm = undefined`
- 0 results

**Elements:**
- 🎛️ Filter icon in circle background
- Heading: "Nenhum produto encontrado"
- 3 suggestions (filter-focused)
- "Limpar todos os filtros" button

## Props Interface

```typescript
export interface EmptyStateProps {
  hasFilters: boolean;
  searchTerm?: string;
  onClearFilters: () => void;
}
```

### hasFilters
- **Type:** `boolean`
- **Required:** Yes
- **Description:** Indicates if any filters are currently active
- **Active filters include:**
  - Search term (`q`)
  - Product/Service type (`kind !== 'all'`)
  - Category selection
  - Price range
  - Attributes

### searchTerm
- **Type:** `string | undefined`
- **Required:** No
- **Description:** The current search query (if any)
- **Used for:** Showing search term in heading and adjusting suggestions

### onClearFilters
- **Type:** `() => void`
- **Required:** Yes
- **Description:** Callback to clear all active filters
- **Connected to:** `clearAllFilters()` from `useStoreFilters`

## Usage Examples

### Example 1: Empty Store
```tsx
<EmptyState
  hasFilters={false}
  searchTerm={undefined}
  onClearFilters={() => {}}
/>
```

### Example 2: Search No Results
```tsx
<EmptyState
  hasFilters={true}
  searchTerm="notebook gamer"
  onClearFilters={clearAllFilters}
/>
```

### Example 3: Filters No Results
```tsx
<EmptyState
  hasFilters={true}
  searchTerm={undefined}
  onClearFilters={clearAllFilters}
/>
```

### Example 4: Integration in StorePublicPage
```tsx
if (catalogItems.length === 0) {
  const hasActiveFilters =
    filters.q !== '' ||
    filters.kind !== 'all' ||
    filters.categoryPath.length > 0 ||
    filters.priceMin !== '' ||
    filters.priceMax !== '' ||
    Object.keys(filters.attrs).length > 0;

  return (
    <EmptyState
      hasFilters={hasActiveFilters}
      searchTerm={filters.q || undefined}
      onClearFilters={clearAllFilters}
    />
  );
}
```

## Styling

### Theme Variables Used
- `bg-store-ink/5` - Icon circle background
- `text-store-ink` - Primary text
- `text-store-ink/40` - Icon color
- `text-store-ink/60` - Description text
- `text-store-ink/70` - Suggestions text
- `text-store-brand` - Bullet points
- `border-store-brand` - Button border
- `text-store-brand` - Button text
- `hover:bg-store-brand` - Button hover background
- `hover:text-white` - Button hover text

### Layout Classes
- Container: `flex flex-col items-center justify-center py-16 px-4 text-center`
- Icon circle: `rounded-full bg-store-ink/5 p-6 mb-6`
- Icon: `h-12 w-12 text-store-ink/40`
- Heading: `text-lg font-semibold text-store-ink mb-2`
- Description: `text-sm text-store-ink/60 max-w-md`
- Suggestions container: `text-sm text-store-ink/70 mb-6 max-w-md`
- List: `space-y-2 text-left inline-block`
- Button: `border-store-brand text-store-brand hover:bg-store-brand hover:text-white transition-colors`

### Responsive Behavior
- Padding: `py-16 px-4` (fixed on all screen sizes)
- Max width: `max-w-md` on text elements
- Icon size: `h-12 w-12` (fixed)
- Button: Full width implied by Button component defaults

## Accessibility

### ARIA Attributes

**Empty state with filters:**
```tsx
<div
  role="status"
  aria-live="polite"
>
  {/* Content */}
</div>
```

**Empty store (no filters):**
```tsx
<div>
  {/* Content - no live region needed */}
</div>
```

### Why the difference?
- **With filters:** Changes are dynamic (user action triggers), so `aria-live="polite"` announces the state change
- **Without filters:** Static state (store is empty), no announcement needed

### Icons
All icons have `aria-hidden="true"`:
```tsx
<Package className="h-12 w-12 text-store-ink/40" aria-hidden="true" />
<Search className="h-12 w-12 text-store-ink/40" aria-hidden="true" />
<Filter className="h-12 w-12 text-store-ink/40" aria-hidden="true" />
```

### Button
Uses standard Button component accessibility:
- Keyboard focusable
- Enter/Space activates
- Focus indicator visible

## Internationalization (i18n)

### Translation Keys

| Key | Default Value | Used When |
|-----|---------------|-----------|
| `store.catalog.empty.noProducts` | "Esta loja ainda não tem produtos" | Empty store |
| `store.catalog.empty.noProductsDesc` | "O vendedor ainda não adicionou produtos ao catálogo..." | Empty store |
| `store.catalog.empty.searchNoResults` | "Nenhum produto encontrado para \"{{term}}\"" | Search no results |
| `store.catalog.empty.filtersNoResults` | "Nenhum produto encontrado" | Filters no results |
| `store.catalog.empty.suggestions` | "Tente:" | All filtered states |
| `store.catalog.empty.suggestOtherTerms` | "Buscar outros termos ou verificar a ortografia" | With search |
| `store.catalog.empty.suggestAdjustFilters` | "Ajustar os filtros aplicados" | With filters |
| `store.catalog.empty.suggestRemoveFilters` | "Remover alguns filtros para ver mais produtos" | With filters |
| `store.catalog.empty.suggestBrowseAll` | "Navegar por todas as categorias" | With filters, no search |
| `store.catalog.empty.clearFilters` | "Limpar todos os filtros" | Button text |

### Variable Interpolation
```tsx
{t('store.catalog.empty.searchNoResults', {
  defaultValue: 'Nenhum produto encontrado para "{{term}}"',
  term: searchTerm,
})}
```

## Testing Scenarios

### Scenario 1: Empty Store on First Visit
**Setup:**
1. Navigate to a store with 0 products
2. No filters applied

**Expected:**
- Shows Package icon
- Heading: "Esta loja ainda não tem produtos"
- Description about checking back later
- No button visible

**Test:**
```bash
1. Open store page for empty store
2. Verify Package icon displayed
3. Verify correct heading text
4. Verify description text
5. Verify no "Clear filters" button
```

### Scenario 2: Search Returns No Results
**Setup:**
1. Store has products
2. Enter search term that matches nothing (e.g., "xyzabc123")
3. Submit search

**Expected:**
- Shows Search icon
- Heading includes search term
- Shows 3 suggestions (search-focused first)
- "Clear filters" button visible

**Test:**
```bash
1. Enter "xyzabc123" in search
2. Press Enter
3. Verify Search icon displayed
4. Verify heading shows "Nenhum produto encontrado para \"xyzabc123\""
5. Verify 3 suggestions listed
6. Verify "Clear filters" button present
7. Click button
8. Verify filters cleared and results shown
```

### Scenario 3: Filters Return No Results
**Setup:**
1. Store has products
2. Apply filters that match nothing (e.g., very narrow price range)
3. No search term

**Expected:**
- Shows Filter icon
- Heading: "Nenhum produto encontrado"
- Shows 3 suggestions (filter-focused)
- "Clear filters" button visible

**Test:**
```bash
1. Set price range to 999999-1000000
2. Verify Filter icon displayed
3. Verify heading text
4. Verify suggestions don't mention search
5. Verify "Clear filters" button present
6. Click button
7. Verify all filters cleared
```

### Scenario 4: Search + Filters Return No Results
**Setup:**
1. Store has products
2. Enter search term
3. Also apply category filter
4. No results

**Expected:**
- Shows Search icon (search takes precedence)
- Heading includes search term
- Shows all 3 suggestions (including search + filter)
- "Clear filters" button visible

**Test:**
```bash
1. Search for "notebook"
2. Select category "Roupas"
3. Verify Search icon (not Filter)
4. Verify heading mentions search term
5. Verify all 3 suggestions present
6. Click "Clear filters"
7. Verify both search and category cleared
```

### Scenario 5: Screen Reader Announcements
**Setup:**
1. Enable screen reader (NVDA/JAWS/VoiceOver)
2. Navigate to store and apply filters
3. Trigger empty state

**Expected:**
- Screen reader announces: "Nenhum produto encontrado" (or similar)
- Due to `aria-live="polite"`

**Test:**
```bash
1. Enable NVDA
2. Apply filters that yield no results
3. Listen for announcement
4. Verify empty state message is read
5. Verify suggestions are readable via arrow keys
6. Verify button is reachable and labeled
```

## Decision Tree

```
catalogItems.length === 0?
├─ YES
│  ├─ hasFilters?
│  │  ├─ NO → Variant 1 (Empty Store)
│  │  │     Icon: Package
│  │  │     Button: None
│  │  │
│  │  └─ YES
│  │     ├─ searchTerm exists?
│  │     │  ├─ YES → Variant 2 (Search No Results)
│  │     │  │     Icon: Search
│  │     │  │     Heading: Includes search term
│  │     │  │     Suggestions: 3 (search-focused)
│  │     │  │     Button: "Clear filters"
│  │     │  │
│  │     │  └─ NO → Variant 3 (Filters No Results)
│  │     │        Icon: Filter
│  │     │        Heading: Generic
│  │     │        Suggestions: 3 (filter-focused)
│  │     │        Button: "Clear filters"
│  │
└─ NO → Show catalog grid
```

## Performance

- **No heavy computation:** Simple conditional rendering
- **No images:** Uses Lucide icons (SVG)
- **No animations:** Static display (instant)
- **Small bundle:** ~2KB when gzipped

## Browser Support

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ✅ Mobile browsers (iOS Safari, Chrome Android)

## Future Enhancements

### Potential Improvements
1. Add animation when transitioning to empty state
2. Show "Related products" from same category
3. Add "Popular products" section below empty state
4. Track empty searches for analytics
5. Suggest spell-corrected search terms
6. Add image/illustration instead of icon
7. Show recent searches if applicable
8. Add "Contact seller" button for empty stores

### A/B Testing Ideas
1. Icon vs illustration
2. Suggestions list vs single CTA
3. Button color/style variants
4. Message tone (friendly vs professional)

## Known Issues

None currently.

## Related Components

- **ResultsCounter** - Shows count when results exist
- **CatalogSkeleton** - Shows during loading
- **FilterSidebar/Modal** - Where filters are applied
- **ActiveFiltersBadges** - Shows active filters above results

## Version History

- **1.0.0** (PROMPT 6.3) - Initial implementation with 3 variants
