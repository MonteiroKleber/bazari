# Loading States - Testing Guide

## Overview
This document describes the loading states implementation added to the Bazari store filtering system in PROMPT 6.1.

## Components Modified

### 1. FilterSkeleton.tsx (NEW)
**Location:** `/apps/web/src/components/store/FilterSkeleton.tsx`

**Exports:**
- `FilterSkeleton` - Skeleton loaders for different filter types
- `ProductCardSkeleton` - Skeleton for individual product cards
- `CatalogSkeleton` - Grid of product skeletons

**Usage:**
```tsx
// Category filter skeleton
<FilterSkeleton type="category" count={5} />

// Price filter skeleton
<FilterSkeleton type="price" />

// Attribute filter skeleton
<FilterSkeleton type="attribute" count={4} />

// Catalog grid skeleton
<CatalogSkeleton count={6} />
```

### 2. Skeleton.tsx (NEW)
**Location:** `/apps/web/src/components/ui/skeleton.tsx`

Base skeleton component with pulse animation.

### 3. FilterSidebar.tsx (MODIFIED)
**Changes:**
- Added `loading?: boolean` prop
- Shows skeleton loaders for categories, price, and attributes when loading
- Disables "Clear Filters" button during loading
- Disables price inputs/slider during loading

**Loading State:**
```tsx
<FilterSidebar
  storeId={storeId}
  filters={filters}
  facets={facets}
  loading={facetsLoading}  // NEW
  onFilterChange={updateFilter}
  onClearAll={clearAllFilters}
/>
```

### 4. FilterModal.tsx (MODIFIED)
**Changes:**
- Added `loading?: boolean` prop
- Shows skeleton loaders in modal when loading
- Shows spinner in "Apply" button during loading
- Disables both buttons during loading

**Loading State:**
```tsx
<FilterModal
  open={open}
  onOpenChange={setOpen}
  storeId={storeId}
  filters={filters}
  facets={facets}
  loading={facetsLoading}  // NEW
  onFilterChange={updateFilter}
  onClearAll={clearAllFilters}
  resultsCount={total}
/>
```

### 5. PriceFilter.tsx (MODIFIED)
**Changes:**
- Added `disabled?: boolean` prop
- Disables slider, text inputs, and radio buttons when disabled
- Adds disabled styling (opacity, cursor)

### 6. ActiveFiltersBadges.tsx (MODIFIED)
**Changes:**
- Added fade-in animations to badges
- Added `onUpdateFilter` prop for proper attribute/category removal
- Animations: `animate-in fade-in slide-in-from-left-2 duration-200`

**Fixed Bug:**
Previously passing object to `onRemoveFilter` which expected string. Now uses `onUpdateFilter` for complex updates.

### 7. StorePublicPage.tsx (MODIFIED)
**Changes:**
- Replaced catalog loading spinner with `<CatalogSkeleton count={6} />`
- Pass `loading={facets.loading}` to FilterSidebar and FilterModal
- Pass `onUpdateFilter={updateFilter}` to ActiveFiltersBadges

## Testing Scenarios

### Scenario 1: Initial Page Load
**Expected:**
1. Categories section shows 5 skeleton checkboxes
2. Price section shows slider skeleton + 2 input skeletons
3. Attributes section shows 2 attribute groups with skeletons
4. Catalog area shows 6 product card skeletons (grid layout)
5. "Clear Filters" button is disabled
6. Modal "Apply" button shows spinner

### Scenario 2: Filter Change (Fast Response)
**Expected:**
1. Facets reload briefly (< 200ms)
2. Skeletons may flash quickly or not visible
3. Catalog shows skeleton grid while loading
4. Results counter shows loading spinner

### Scenario 3: Filter Change (Slow Response)
**Expected:**
1. Facets show skeletons for 500ms+
2. Catalog shows 6 skeleton cards in grid
3. All inputs remain functional (search, sort)
4. Price slider is disabled during loading

### Scenario 4: Mobile Filter Modal
**Expected:**
1. Open modal - if loading, shows skeletons
2. "Apply" button shows: `<Spinner /> Carregando...`
3. "Clear" button is disabled
4. All filter inputs are disabled

### Scenario 5: Badge Animations
**Expected:**
1. Adding filter - badge fades in from left (200ms)
2. Removing filter - badge disappears
3. Multiple badges appear sequentially

## Visual States

### FilterSkeleton - Category
```
□ ▬▬▬▬▬▬▬▬
□ ▬▬▬▬▬▬
□ ▬▬▬▬▬▬▬
□ ▬▬▬▬▬
□ ▬▬▬▬▬▬▬▬
```

### FilterSkeleton - Price
```
▬▬▬▬▬▬▬▬▬▬ (slider)
[▬▬▬▬] [▬▬▬▬] (inputs)
```

### FilterSkeleton - Attribute
```
▬▬▬▬ (title)
□ ▬▬▬▬
□ ▬▬▬▬
□ ▬▬▬▬
```

### ProductCardSkeleton
```
┌─────────────┐
│   ▬▬▬▬▬▬   │ (image)
│   ▬▬▬▬▬▬   │
├─────────────┤
│ ▬▬▬▬▬▬▬    │ (title)
│ ▬▬▬▬        │ (description)
│ ▬▬▬   [▬▬] │ (price + button)
└─────────────┘
```

### CatalogSkeleton (6 cards)
```
┌────┐ ┌────┐ ┌────┐
│ ▬▬ │ │ ▬▬ │ │ ▬▬ │
└────┘ └────┘ └────┘
┌────┐ ┌────┐ ┌────┐
│ ▬▬ │ │ ▬▬ │ │ ▬▬ │
└────┘ └────┘ └────┘
```

## Animation Specifications

### Skeleton Pulse (via Tailwind)
- Class: `animate-pulse`
- Duration: ~2s
- Effect: Opacity 0.5 → 1.0 → 0.5

### Badge Fade In
- Classes: `animate-in fade-in slide-in-from-left-2 duration-200`
- Duration: 200ms
- Effect: Opacity 0 → 1, translate -8px → 0

### Button Transition
- Class: `transition-colors`
- Duration: 150ms (Tailwind default)
- Effect: Smooth color change on hover

## Dependencies Added

```json
{
  "class-variance-authority": "^0.7.0",
  "clsx": "^2.0.0",
  "tailwind-merge": "^2.0.0"
}
```

## Files Created

1. `/apps/web/src/components/ui/skeleton.tsx` - Base skeleton
2. `/apps/web/src/components/store/FilterSkeleton.tsx` - Filter skeletons
3. `/apps/web/src/lib/utils.ts` - Already existed, contains `cn()` utility

## Files Modified

1. `/apps/web/src/components/store/FilterSidebar.tsx`
2. `/apps/web/src/components/store/FilterModal.tsx`
3. `/apps/web/src/components/store/PriceFilter.tsx`
4. `/apps/web/src/components/store/ActiveFiltersBadges.tsx`
5. `/apps/web/src/components/store/ResultsCounter.tsx` (i18n fix)
6. `/apps/web/src/pages/StorePublicPage.tsx`
7. `/apps/web/src/components/store/index.ts` (exports)

## CSS Classes Used

### Skeleton Base
- `animate-pulse` - Pulsing animation
- `rounded-md` - Border radius
- `bg-store-ink/10` - Store-themed background

### Disabled States
- `disabled:opacity-50` - 50% opacity
- `disabled:cursor-not-allowed` - Not-allowed cursor

### Animations
- `animate-in` - Enter animation
- `fade-in` - Fade in effect
- `slide-in-from-left-2` - Slide from left
- `duration-200` - 200ms duration

## Accessibility

- Skeleton elements use semantic HTML (divs)
- Disabled inputs have `disabled` attribute
- Loading state announced via spinner icon
- No ARIA labels needed (visual-only loading indicators)

## Performance

- Skeletons are pure CSS (no JS animations)
- Minimal re-renders (loading state from hooks)
- Debouncing prevents excessive loading states
- AbortController cancels stale requests

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- CSS animations supported everywhere
- Tailwind utilities fully compatible
- No polyfills needed

## Known Issues

None related to loading states.

Pre-existing TypeScript errors in:
- StorePublicPage.tsx:188 (sync property)
- SearchPage.tsx (page possibly undefined)
- SellerSetupPage.tsx (type mismatches)

## Future Improvements

1. Add skeleton shimmer gradient (optional polish)
2. Add loading progress bar for slow connections
3. Add optimistic UI updates
4. Cache facets to reduce loading states
5. Add skeleton for mobile search bar
6. Add skeleton for sort dropdown

## Related Prompts

- PROMPT 1.1-1.3: Filter hooks
- PROMPT 2.1-2.4: Filter components
- PROMPT 3.1-3.4: Layout containers
- PROMPT 4.1: Integration
- PROMPT 5.1-5.4: Advanced features
- **PROMPT 6.1: Loading States (THIS)**
