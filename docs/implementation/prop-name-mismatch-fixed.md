# CategoryFilter Prop Name Mismatch - Fixed

## Issue
Runtime error when opening store public page:
```
Uncaught TypeError: can't access property "includes", selected is undefined
```

**Location:** `CategoryFilter.tsx:119` in `CategoryItem` component

## Root Cause
Prop name mismatch between CategoryFilter interface and usage:

**CategoryFilter interface expected:**
```typescript
export interface CategoryFilterProps {
  categories: Array<{ path: string[]; count: number }>;
  selected: string[];  // ❌ Wrong prop name
  onChange: (categoryPaths: string[]) => void;
}
```

**FilterSidebar/FilterModal passed:**
```typescript
<CategoryFilter
  categories={facets.categories}
  selectedPaths={filters.categoryPath}  // ✅ Correct prop name
  onChange={(paths) => onFilterChange('categoryPath', paths)}
/>
```

## Fix
Updated CategoryFilter interface and implementation to use `selectedPaths`:

```typescript
export interface CategoryFilterProps {
  categories: Array<{ path: string[]; count: number }>;
  selectedPaths: string[];  // ✅ Fixed
  onChange: (categoryPaths: string[]) => void;
}

export function CategoryFilter({ categories, selectedPaths, onChange }: CategoryFilterProps) {
  // Updated all internal references from 'selected' to 'selectedPaths'
  const handleToggle = (path: string[]) => {
    const pathString = path.join('/');
    const isSelected = selectedPaths.includes(pathString);  // ✅ Fixed

    if (isSelected) {
      onChange(selectedPaths.filter((s) => s !== pathString));  // ✅ Fixed
    } else {
      onChange([...selectedPaths, pathString]);  // ✅ Fixed
    }
  };

  // ...

  <CategoryItem
    key={category.id}
    category={category}
    selected={selectedPaths}  // ✅ Fixed
    onToggle={handleToggle}
  />
}
```

## Changes Made
1. **Interface:** `selected: string[]` → `selectedPaths: string[]`
2. **Component parameter:** `selected` → `selectedPaths`
3. **Internal references:** All uses of `selected` → `selectedPaths`
4. **CategoryItem prop:** `selected={selectedPaths}`

## Status
✅ **RESOLVED** - Prop name now matches across all usages.

The component will now receive the correct prop and won't throw undefined errors.
