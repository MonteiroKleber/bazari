# PROMPT 5.3 - Catalog Pagination Completed

## Summary
Created a professional pagination component for navigating through catalog pages with item count display and smart ellipsis handling.

## Files Created

### 1. `/apps/web/src/components/ui/pagination.tsx`
**Purpose:** Base shadcn/ui pagination primitives

**Components:**
- `Pagination` - Root nav container
- `PaginationContent` - List wrapper
- `PaginationItem` - List item wrapper
- `PaginationLink` - Page number link
- `PaginationPrevious` - Previous button with icon
- `PaginationNext` - Next button with icon
- `PaginationEllipsis` - Three dots indicator

**Features:**
- Semantic HTML (`<nav>`, `<ul>`, `<li>`, `<a>`)
- Accessibility built-in (aria-label, aria-current)
- Keyboard navigation support
- Icons from lucide-react

### 2. `/apps/web/src/components/store/CatalogPagination.tsx`
**Purpose:** Catalog-specific pagination with item count

**Key Features:**
✅ **Smart page number display**
- Maximum 5 visible pages (configurable)
- Ellipsis when too many pages
- Always shows first and last page
- Range adapts to current position

✅ **Item count display**
- "Mostrando 25-48 de 120 produtos"
- Accurate range calculation
- Internationalized via i18next

✅ **Navigation buttons**
- Previous/Next with icons
- Disabled states (first/last page)
- Smooth scroll to top on page change

✅ **Store theme styling**
- Active page highlighted (border-store-brand)
- Hover effects (text-store-brand)
- Consistent with filter components

**Interface:**
```typescript
interface CatalogPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}
```

**Example Usage:**
```typescript
<CatalogPagination
  currentPage={filters.page}
  totalPages={Math.ceil(page.total / page.limit)}
  totalItems={page.total}
  itemsPerPage={page.limit}
  onPageChange={(newPage) => updateFilter('page', newPage)}
/>
```

### 3. Integration

**Updated files:**
- `/apps/web/src/components/store/index.ts` - Barrel export
- `/apps/web/src/pages/StorePublicPage.tsx` - Integration

**Integration code:**
```typescript
{/* Pagination */}
{!catalogLoading && !catalogError && catalogItems.length > 0 && (
  <CatalogPagination
    currentPage={filters.page}
    totalPages={Math.ceil(page.total / page.limit)}
    totalItems={page.total}
    itemsPerPage={page.limit}
    onPageChange={(newPage) => updateFilter('page', newPage)}
  />
)}
```

**Placement:** After catalog grid, before closing tag of catalog area

## Technical Implementation

### Page Number Generation Algorithm

**generatePageNumbers function:**
```typescript
function generatePageNumbers(
  currentPage: number,
  totalPages: number,
  maxVisible: number
): Array<number | 'ellipsis-start' | 'ellipsis-end'>
```

**Logic:**
1. If `totalPages <= maxVisible`, show all pages
2. Always include first page (1)
3. Always include last page (if > 1)
4. Calculate range around current page
5. Add ellipsis where gaps exist
6. Adjust range if near start or end

**Examples:**

**Total 5 pages, current 3:**
```
[1] [2] [3] [4] [5]
```

**Total 20 pages, current 10:**
```
[1] [...] [8] [9] [10] [11] [12] [...] [20]
```

**Total 20 pages, current 2:**
```
[1] [2] [3] [4] [5] [...] [20]
```

**Total 20 pages, current 19:**
```
[1] [...] [16] [17] [18] [19] [20]
```

### Item Range Calculation

**Start item:**
```typescript
const startItem = (currentPage - 1) * itemsPerPage + 1;
```

**End item:**
```typescript
const endItem = Math.min(currentPage * itemsPerPage, totalItems);
```

**Examples:**
- Page 1, limit 24: `1-24`
- Page 2, limit 24: `25-48`
- Page 6, limit 24, total 143: `121-143` (incomplete page)

### Scroll to Top

**Implementation:**
```typescript
window.scrollTo({ top: 0, behavior: 'smooth' });
```

**When triggered:**
- Click on page number
- Click on Previous/Next buttons
- Ensures user sees beginning of new items

**Why smooth:**
- Better UX than instant jump
- User understands page changed
- Native browser animation (no JS library)

### Conditional Rendering

**Don't render if:**
1. `totalPages <= 1` - Only one page, pagination unnecessary
2. `totalItems === 0` - No items to paginate

**Guard clause:**
```typescript
if (totalPages <= 1 || totalItems === 0) {
  return null;
}
```

### State Management

**No internal state:**
- Fully controlled component
- All state from props (currentPage, totalPages, etc.)
- onPageChange callback for updates

**Integration with filters:**
```typescript
// useStoreFilters manages page
filters.page = 3;

// Update page
updateFilter('page', 5);

// URL syncs
// ?page=5

// useStoreCatalog refetches
// offset = (5 - 1) * 24 = 96
```

## UX Features

### Visual Feedback

**Active page:**
- Border: `border-store-brand`
- Background: `bg-store-brand/10`
- Text: `text-store-brand`
- Not clickable (prevents redundant action)

**Inactive pages:**
- Border: `border-store-ink/20`
- Text: `text-store-ink`
- Hover: `bg-store-ink/5`, `text-store-brand`

**Disabled buttons:**
- Opacity: `opacity-50`
- Pointer events: `pointer-events-none`
- No hover effect

### Responsive Design

**Desktop:**
- Full text labels: "Anterior" / "Próxima"
- All page numbers visible
- Comfortable spacing

**Mobile:**
- Text hidden: `hidden sm:inline`
- Only icons visible (ChevronLeft/ChevronRight)
- Compact layout
- Touch-friendly tap targets

### Internationalization

**Translatable strings:**
```typescript
t('store.catalog.pagination.showing', {
  defaultValue: 'Mostrando {{start}}-{{end}} de {{total}} produtos',
  start, end, total,
})

t('store.catalog.pagination.previous', { defaultValue: 'Anterior' })
t('store.catalog.pagination.next', { defaultValue: 'Próxima' })
```

**Fallbacks provided** for missing translations.

## Accessibility

### Semantic HTML
```html
<nav role="navigation" aria-label="pagination">
  <ul>
    <li>
      <a aria-current="page">3</a>
    </li>
  </ul>
</nav>
```

### ARIA Attributes
- `aria-label="pagination"` on nav
- `aria-label="Go to previous page"` on Previous
- `aria-label="Go to next page"` on Next
- `aria-current="page"` on active page
- `aria-hidden` on ellipsis

### Keyboard Navigation
- Tab cycles through page links
- Enter/Space activates focused link
- Focus outline visible (default browser or custom)
- Disabled links not focusable

### Screen Readers
- "Page 3" announced on links
- "Current page: 3" on active page
- "Go to previous page" on Previous button
- "Showing 25-48 of 120 products" read
- Ellipsis ignored (decorative)

## Data Flow

### Props Flow
```
useStoreCatalog
  ↓
page = { total: 143, limit: 24, offset: 48 }
  ↓
StorePublicPage
  ↓
currentPage = filters.page (3)
totalPages = Math.ceil(143 / 24) = 6
totalItems = 143
itemsPerPage = 24
  ↓
CatalogPagination
```

### User Action Flow
```
1. User clicks "Page 5"
2. onPageChange(5) called
3. updateFilter('page', 5)
4. URL updated: ?page=5
5. useStoreCatalog refetches with offset=96
6. New items loaded
7. Pagination re-renders with currentPage={5}
8. Scroll to top (smooth)
```

## Edge Cases Handled

1. **Single page:** Component doesn't render
2. **Empty results:** Component doesn't render
3. **Incomplete last page:** Correct item range shown
4. **Click on current page:** No action (early return)
5. **First page:** Previous button disabled
6. **Last page:** Next button disabled
7. **Many pages (50+):** Ellipsis shown, only 5 visible
8. **Page range validation:** Not implemented (backend/hook responsibility)

## Integration Notes

### Filter Reset on Other Changes

**Important:** When other filters change (category, price, etc.), page should reset to 1.

**Implementation in useStoreFilters:**
```typescript
updateFilter(key, value) {
  setFilters(prev => ({
    ...prev,
    [key]: value,
    // Reset page EXCEPT for sort and page itself
    page: key === 'sort' || key === 'page' ? prev.page : 1,
  }));
}
```

### URL Synchronization

**Page in URL:**
```
/loja/minhaloja?page=3
```

**Combined with filters:**
```
/loja/minhaloja?categoryPath=Eletrônicos&priceMin=100&page=3
```

**Browser back/forward:**
- Works correctly
- Page number from URL
- Catalog refetches

## Performance Considerations

**Minimal re-renders:**
- Pure component (no internal state)
- React.memo not needed (props change legitimately)

**Scroll optimization:**
- Native smooth scroll (hardware accelerated)
- No JavaScript animation libraries

**Page number calculation:**
- O(n) where n = maxVisible (5)
- Fast even for 1000+ pages

## Testing Checklist

- [ ] Shows correct item range
- [ ] Page numbers generated correctly
- [ ] Ellipsis appears when needed
- [ ] Previous disabled on page 1
- [ ] Next disabled on last page
- [ ] Click changes page
- [ ] Scrolls to top on change
- [ ] Active page highlighted
- [ ] Hover effects work
- [ ] Doesn't render if 1 page
- [ ] Doesn't render if 0 items
- [ ] Mobile layout correct
- [ ] Keyboard navigation works
- [ ] Screen reader announces correctly
- [ ] Integrates with useStoreFilters
- [ ] URL syncs properly

## Future Enhancements (Optional)

1. **Page input field**: "Go to page: [__]"
2. **Items per page selector**: 12, 24, 48, 96
3. **First/Last buttons**: Jump to extremes
4. **Keyboard shortcuts**: Arrow keys, Home, End
5. **Infinite scroll option**: Load more on scroll
6. **Prefetch next page**: Instant transitions
7. **Animation**: Fade in/out on page change
8. **Top + Bottom**: Pagination at both ends
9. **Sticky pagination**: Always visible while scrolling
10. **Progress indicator**: "Page 5 of 20" bar

## Status
✅ **COMPLETED** - Full pagination system with item count, smart ellipsis, and accessibility.

Users can now easily navigate through large catalogs!
