# PROMPT 5.1 - AttributeFilter Completed

## Summary
Created dynamic attribute filter component with collapsible sections for filtering by product attributes (color, size, brand, etc.).

## Files Created

### 1. `/apps/web/src/components/ui/collapsible.tsx`
**Purpose:** Radix UI Collapsible wrapper component

**Dependencies installed:**
```bash
pnpm add @radix-ui/react-collapsible --filter @bazari/web
```

**Exports:**
- `Collapsible` (root)
- `CollapsibleTrigger`
- `CollapsibleContent`

### 2. `/apps/web/src/components/store/AttributeFilter.tsx`
**Purpose:** Dynamic attribute filter with expandable sections

**Key Features:**
- ✅ Collapsible sections for each attribute
- ✅ Multiple selection per attribute (checkboxes)
- ✅ Value counters showing item counts
- ✅ "Ver mais" button when > 8 values
- ✅ Capitalization of attribute names
- ✅ Alphabetical sorting of attributes
- ✅ Store theme styling

**Interface:**
```typescript
interface AttributeFilterProps {
  attributes: Record<string, Array<{ value: string; count: number }>>;
  selected: Record<string, string[]>;
  onChange: (attrKey: string, values: string[]) => void;
}
```

**Example Usage:**
```typescript
<AttributeFilter
  attributes={{
    cor: [
      { value: 'Preto', count: 8 },
      { value: 'Branco', count: 5 },
    ],
    tamanho: [
      { value: 'P', count: 4 },
      { value: 'M', count: 12 },
    ],
  }}
  selected={{ cor: ['Preto'] }}
  onChange={(key, values) => {
    // Update filters.attrs
  }}
/>
```

### 3. Test Documentation
Created `/apps/web/src/components/store/__tests__/AttributeFilter.test.md` with comprehensive test scenarios.

## Integration

### FilterSidebar
Added AttributeFilter between TypeFilter and "Limpar Filtros" button:

```typescript
{/* Filtro de Atributos */}
{Object.keys(facets.attributes).length > 0 && (
  <AttributeFilter
    attributes={facets.attributes}
    selected={filters.attrs}
    onChange={(attrKey, values) => {
      const newAttrs = { ...filters.attrs };
      if (values.length === 0) {
        delete newAttrs[attrKey];
      } else {
        newAttrs[attrKey] = values;
      }
      onFilterChange('attrs', newAttrs);
    }}
  />
)}
```

### FilterModal
Same integration as FilterSidebar - added in scrollable content area.

### Barrel Export
Updated `/apps/web/src/components/store/index.ts`:
```typescript
export { AttributeFilter } from './AttributeFilter';
export type { AttributeFilterProps } from './AttributeFilter';
```

## Technical Implementation

### State Management
Component manages two local states:
1. **expandedSections**: Tracks which attribute sections are expanded/collapsed
2. **showAllValues**: Tracks "ver mais" state for each attribute

Both use `Record<string, boolean>` for per-attribute tracking.

### Collapsible Behavior
- Sections expanded by default (`isExpanded ?? true`)
- ChevronUp/ChevronDown icons indicate state
- Clicking header toggles expansion
- Smooth native Radix UI animation

### "Ver Mais" Logic
- Shows first 8 values initially (MAX_VISIBLE = 8)
- Button appears if `values.length > 8`
- Shows count of hidden values: "Ver mais (5)"
- Click toggles between showing 8 or all values
- `e.stopPropagation()` prevents collapsible toggle

### onChange Handler
Smart logic to clean up empty attributes:
```typescript
const newAttrs = { ...filters.attrs };
if (values.length === 0) {
  delete newAttrs[attrKey];  // Remove attribute key if no values selected
} else {
  newAttrs[attrKey] = values;
}
onFilterChange('attrs', newAttrs);
```

This keeps the filters object clean and prevents empty arrays in URL params.

## Data Flow

### From Backend (useStoreFacets)
```typescript
facets.attributes = {
  cor: [
    { value: 'Preto', count: 8 },
    { value: 'Branco', count: 5 },
  ],
  tamanho: [
    { value: 'P', count: 4 },
    { value: 'M', count: 12 },
  ],
}
```

### To Filters (useStoreFilters)
```typescript
filters.attrs = {
  cor: ['Preto', 'Branco'],
  tamanho: ['M'],
}
```

### To URL
```
?attrs[cor]=Preto,Branco&attrs[tamanho]=M
```

### To Backend (useStoreCatalog)
Query params sent to `/search` endpoint for filtering.

## Styling

### Theme Variables
- `text-store-ink`: Primary text color
- `text-store-brand`: Brand color (hover, active states)
- `border-store-ink/30`: Checkbox borders
- `bg-store-brand`: Checked checkboxes

### Layout
- `space-y-4`: Between attribute sections
- `space-y-2`: Between checkboxes
- `space-x-2`: Between checkbox and label
- `mt-3`: Content below collapsible trigger

### Responsive
- Works in both FilterSidebar (desktop) and FilterModal (mobile)
- No specific mobile/desktop differences needed
- Collapsible saves vertical space

## Edge Cases Handled

1. **No attributes**: Returns `null`, nothing rendered
2. **Empty attribute values**: Section rendered but empty
3. **Long attribute names**: Text wraps naturally
4. **Long value names**: Label can expand with flex-1
5. **Selected values not in facets**: Ignored (only facets rendered)
6. **Rapid toggle clicks**: React batching handles gracefully

## Testing Checklist

- [ ] Renders multiple attribute sections
- [ ] Sections can expand/collapse independently
- [ ] Checkboxes toggle correctly
- [ ] Multiple values can be selected per attribute
- [ ] "Ver mais" shows/hides additional values
- [ ] onChange called with correct parameters
- [ ] Empty selections remove attribute from filters
- [ ] Alphabetical sorting works
- [ ] Capitalization applied correctly
- [ ] Counters display accurately
- [ ] Store theme applied
- [ ] Works in both sidebar and modal
- [ ] Syncs with URL params
- [ ] Integrates with ActiveFiltersBadges

## Future Enhancements (Optional)

1. **Search within attributes**: Input field to filter long attribute lists
2. **Sort options**: By name or by count
3. **Clear per attribute**: "Limpar" button in each section
4. **Select all/none**: Quick actions for bulk selection
5. **Icons for values**: Visual representation (color swatches, size icons)
6. **Persist expansion state**: Save to localStorage
7. **Smart defaults**: Auto-expand sections with selections

## Status
✅ **COMPLETED** - AttributeFilter fully implemented and integrated into both FilterSidebar and FilterModal.

The filter system now supports dynamic product attributes from the backend!
