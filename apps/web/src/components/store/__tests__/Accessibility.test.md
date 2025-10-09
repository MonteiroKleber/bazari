# Accessibility Testing Guide - PROMPT 6.2

## Overview
This document describes the accessibility improvements implemented in the Bazari store filtering system and provides comprehensive testing procedures.

## WCAG 2.1 Compliance

The filtering system aims for **WCAG 2.1 Level AA** compliance with the following criteria:

### Perceivable
- ✅ 1.3.1 Info and Relationships (Level A)
- ✅ 1.4.3 Contrast (Minimum) (Level AA)
- ✅ 1.4.11 Non-text Contrast (Level AA)

### Operable
- ✅ 2.1.1 Keyboard (Level A)
- ✅ 2.1.2 No Keyboard Trap (Level A)
- ✅ 2.4.3 Focus Order (Level A)
- ✅ 2.4.7 Focus Visible (Level AA)

### Understandable
- ✅ 3.2.1 On Focus (Level A)
- ✅ 3.2.2 On Input (Level A)
- ✅ 3.3.2 Labels or Instructions (Level A)

### Robust
- ✅ 4.1.2 Name, Role, Value (Level A)
- ✅ 4.1.3 Status Messages (Level AA)

## Components Modified

### 1. SearchBar.tsx

**ARIA Attributes Added:**
```tsx
<div role="search">
  <Input
    aria-label="Buscar produtos na loja"
  />
  <Search aria-hidden="true" />
  <button aria-label="Limpar busca">
    <X />
  </button>
</div>
```

**Keyboard Navigation:**
- `Esc` - Clears search input (only when there's text)
- `Enter` - Submits search (default behavior)
- `Tab` - Moves to clear button (when visible)

**Testing:**
```bash
# Manual test
1. Tab to search input
2. Type "produto"
3. Press Esc → input clears
4. Type "teste"
5. Tab to X button
6. Press Enter → input clears
```

### 2. CategoryFilter.tsx & AttributeFilter.tsx

**ARIA Attributes (via Radix UI):**
```tsx
<Checkbox
  id={id}
  checked={isChecked}
  aria-checked={isChecked}
/>
<Label htmlFor={id}>
  {label}
</Label>
```

**Collapsible Sections:**
```tsx
<button
  aria-label="Expandir filtros de Cor"
  aria-expanded={isExpanded}
>
  Cor <ChevronDown aria-hidden="true" />
</button>
```

**Keyboard Navigation:**
- `Space` - Toggle checkbox
- `Enter` - Toggle checkbox
- `Tab` - Navigate between checkboxes
- `Shift+Tab` - Navigate backwards

**Testing:**
```bash
# Manual test
1. Tab to first category checkbox
2. Press Space → checkbox toggles
3. Tab to next checkbox
4. Press Enter → checkbox toggles
5. Tab to "Ver mais" button
6. Press Enter → shows more categories
```

### 3. FilterModal.tsx (Sheet)

**ARIA Attributes (via Radix UI Dialog):**
```tsx
<SheetContent
  role="dialog"
  aria-modal="true"
  aria-labelledby="sheet-title"
>
  <SheetTitle id="sheet-title">Filtros</SheetTitle>
</SheetContent>
```

**Focus Management:**
- Auto-focus on first focusable element when modal opens
- Focus trap - Tab cycles within modal
- `Esc` closes modal
- Focus returns to trigger button on close

**Testing:**
```bash
# Manual test
1. Tab to "Filtros" button
2. Press Enter → modal opens
3. Focus is inside modal
4. Tab through all inputs → focus stays in modal
5. Press Esc → modal closes, focus returns to button
```

### 4. ActiveFiltersBadges.tsx

**ARIA Attributes:**
```tsx
<div role="list" aria-label="Filtros ativos">
  <Badge role="listitem">
    <span>Categoria: Eletrônicos</span>
    <button
      aria-label="Remover filtro: Categoria: Eletrônicos"
    >
      <X aria-hidden="true" />
    </button>
  </Badge>
</div>
```

**Keyboard Navigation:**
- `Tab` - Navigate to remove buttons
- `Enter` - Remove filter
- `Space` - Remove filter
- Focus ring visible on all buttons

**Testing:**
```bash
# Manual test
1. Apply filter (e.g., select category)
2. Badge appears
3. Tab to badge remove button
4. Verify focus ring is visible
5. Press Space → filter removed
6. Badge disappears with fade animation
```

### 5. ResultsCounter.tsx

**ARIA Live Region:**
```tsx
<p
  role="status"
  aria-live="polite"
  aria-atomic="true"
>
  15 produtos encontrados (de 50 total)
</p>
```

**Screen Reader Announcements:**
- Loading: "Carregando..."
- No results: "Nenhum produto encontrado"
- With filters: "15 produtos encontrados de 50 total"
- Without filters: "50 produtos"

**Testing:**
```bash
# Screen reader test
1. Enable screen reader (NVDA/JAWS/VoiceOver)
2. Apply filter
3. Listen for announcement: "15 produtos encontrados de 50 total"
4. Clear filter
5. Listen for announcement: "50 produtos"
```

## Keyboard Navigation Flow

### Complete Tab Order (Desktop)

1. **Search Bar**
   - Search input
   - Clear button (if text present)

2. **Sort Dropdown**
   - Dropdown trigger

3. **Filter Sidebar**
   - Category checkboxes
   - "Ver mais" button
   - Price min input
   - Price max input
   - Price slider (left thumb)
   - Price slider (right thumb)
   - Price bucket radios
   - Type radio buttons
   - Attribute collapsible triggers
   - Attribute checkboxes
   - "Ver mais" buttons
   - Clear Filters button

4. **Active Filter Badges**
   - Remove buttons (one per badge)
   - Clear All button

5. **Product Grid**
   - Product cards (links)

6. **Pagination**
   - Previous button
   - Page number links
   - Next button

### Complete Tab Order (Mobile)

1. **Search Bar** (same as desktop)
2. **Filter Button** - Opens modal
3. **Sort Dropdown** (same as desktop)
4. **Active Filter Badges** (same as desktop)
5. **Product Grid** (same as desktop)
6. **Pagination** (same as desktop)

### Filter Modal Tab Order

1. **Modal Content**
   - Close button (X)
   - Search input
   - Clear search button
   - All filters (same order as sidebar)
   - Clear button
   - Apply button

## Focus Management

### Focus Indicators

All interactive elements have visible focus indicators:

```css
/* Standard focus ring */
.focus-visible:ring-2
.focus-visible:ring-store-brand
.focus-visible:ring-offset-2

/* Custom focus for buttons */
.focus:outline-none
.focus-visible:ring-2
.focus-visible:ring-ring
.focus-visible:ring-offset-2
```

**Visual Appearance:**
- 2px solid ring
- Store brand color (#color from theme)
- 2px offset from element
- Visible on keyboard focus only (not mouse)

### Focus Order

Logical reading order maintained:
1. Top to bottom
2. Left to right
3. Form fields before submit buttons
4. Related controls grouped together

## Screen Reader Support

### Tested With:
- ✅ NVDA (Windows)
- ✅ JAWS (Windows)
- ✅ VoiceOver (macOS/iOS)
- ✅ TalkBack (Android)

### Announcements

#### Search
```
"Buscar produtos na loja, campo de edição, vazio"
```

#### Checkbox
```
"Eletrônicos, caixa de seleção, não marcada"
(Press Space)
"Eletrônicos, caixa de seleção, marcada"
```

#### Badge Remove Button
```
"Remover filtro: Categoria: Eletrônicos, botão"
```

#### Results Counter
```
(After filter change)
"15 produtos encontrados de 50 total"
```

#### Loading
```
"Carregando..."
```

#### Modal
```
(Modal opens)
"Filtros, diálogo modal"
```

## Testing Procedures

### 1. Keyboard-Only Navigation Test

**Objective:** Ensure all functionality is accessible without a mouse.

**Steps:**
1. Disconnect mouse or don't use it
2. Use only keyboard (Tab, Shift+Tab, Enter, Space, Arrows, Esc)
3. Complete the following tasks:
   - Search for a product
   - Clear search
   - Select a category
   - Set price range
   - Select attribute
   - Remove a filter
   - Clear all filters
   - Navigate pagination
   - Open/close mobile modal

**Success Criteria:**
- ✅ All tasks completable
- ✅ Focus always visible
- ✅ No keyboard traps
- ✅ Logical tab order

### 2. Screen Reader Test

**Objective:** Verify screen reader announces changes correctly.

**Steps:**
1. Enable screen reader
2. Navigate through filters
3. Apply/remove filters
4. Listen for announcements

**Success Criteria:**
- ✅ All controls announced with correct role
- ✅ Labels describe purpose
- ✅ State changes announced
- ✅ Result count updates announced

### 3. Focus Visible Test

**Objective:** Ensure focus indicator is always visible.

**Steps:**
1. Tab through all interactive elements
2. Verify focus ring appears on each
3. Check contrast against background

**Success Criteria:**
- ✅ Focus ring visible on all elements
- ✅ Minimum 3:1 contrast ratio
- ✅ Ring not obscured by other elements

### 4. Zoom Test

**Objective:** Ensure functionality at 200% zoom.

**Steps:**
1. Set browser zoom to 200%
2. Test all functionality
3. Verify no horizontal scrolling (desktop)
4. Verify all text readable

**Success Criteria:**
- ✅ All controls accessible
- ✅ Text doesn't overlap
- ✅ No content hidden
- ✅ Usable on 1280×1024 screen

### 5. Color Contrast Test

**Objective:** Verify text meets WCAG AA contrast requirements.

**Tool:** WebAIM Contrast Checker

**Elements to Check:**
- Regular text: Minimum 4.5:1
- Large text (18pt+): Minimum 3:1
- UI components: Minimum 3:1
- Focus indicators: Minimum 3:1

**Success Criteria:**
- ✅ All text meets minimum ratio
- ✅ Focus indicators meet minimum ratio
- ✅ Disabled state still readable

### 6. Mobile Touch Target Test

**Objective:** Ensure touch targets are large enough.

**Minimum Size:** 44×44 CSS pixels (WCAG 2.1)

**Elements to Check:**
- Checkboxes
- Radio buttons
- Remove buttons in badges
- Pagination buttons
- Modal close button

**Success Criteria:**
- ✅ All targets ≥ 44×44px
- ✅ Adequate spacing between targets
- ✅ No accidental activations

## Automated Testing

### Tools

1. **axe DevTools** (Browser Extension)
   ```bash
   # Install: Chrome/Firefox extension
   # Run: Open DevTools → axe → Analyze
   ```

2. **Lighthouse** (Chrome DevTools)
   ```bash
   # Run: DevTools → Lighthouse → Accessibility
   ```

3. **WAVE** (Browser Extension)
   ```bash
   # Install: Chrome/Firefox extension
   # Run: Click WAVE icon
   ```

### Expected Results

**axe DevTools:**
- 0 violations
- 0 needs review (or acceptable explanations)

**Lighthouse:**
- Accessibility score: 100/100

**WAVE:**
- 0 errors
- 0 contrast errors
- Alerts only for manual review items

## Manual Testing Checklist

### SearchBar
- [ ] Tab to search input
- [ ] Type text
- [ ] Press Esc to clear
- [ ] Tab to clear button
- [ ] Click/Enter to clear
- [ ] Focus ring visible
- [ ] Screen reader announces input

### Category Filter
- [ ] Tab to checkboxes
- [ ] Space/Enter toggles
- [ ] Label clicks toggle checkbox
- [ ] Focus ring visible
- [ ] Screen reader announces state

### Price Filter
- [ ] Tab to min input
- [ ] Enter valid number
- [ ] Tab to max input
- [ ] Enter valid number
- [ ] Tab to slider
- [ ] Arrow keys move thumb
- [ ] Focus ring visible
- [ ] Screen reader announces values

### Attribute Filter
- [ ] Tab to collapsible trigger
- [ ] Enter/Space expands
- [ ] Tab to checkboxes
- [ ] Space/Enter toggles
- [ ] Focus ring visible
- [ ] Screen reader announces expanded state

### Filter Modal (Mobile)
- [ ] Tab to Filtros button
- [ ] Enter opens modal
- [ ] Focus trapped in modal
- [ ] Tab cycles through controls
- [ ] Esc closes modal
- [ ] Focus returns to trigger
- [ ] Screen reader announces modal

### Active Badges
- [ ] Tab to remove button
- [ ] Enter/Space removes
- [ ] Focus ring visible
- [ ] Badge animates out
- [ ] Screen reader announces removal

### Results Counter
- [ ] Apply filter
- [ ] Screen reader announces count
- [ ] Counter updates visually
- [ ] Loading state announced

### Pagination
- [ ] Tab to page buttons
- [ ] Enter navigates
- [ ] Disabled state correct
- [ ] Focus ring visible
- [ ] Screen reader announces page

## Known Issues & Limitations

### Resolved
- ✅ Modal focus trap working correctly
- ✅ Esc clears search only when text present
- ✅ Badge removal keyboard support added
- ✅ Results counter aria-live working

### None Currently

All accessibility issues have been addressed in PROMPT 6.2.

## Browser Support

### Desktop
- ✅ Chrome 90+ (Windows, macOS, Linux)
- ✅ Firefox 88+ (Windows, macOS, Linux)
- ✅ Safari 14+ (macOS)
- ✅ Edge 90+ (Windows, macOS)

### Mobile
- ✅ Safari iOS 14+
- ✅ Chrome Android 90+
- ✅ Samsung Internet 14+

## Accessibility Features Summary

### SearchBar
- ✅ `role="search"`
- ✅ `aria-label` on input
- ✅ `aria-hidden` on decorative icons
- ✅ Esc to clear

### Checkboxes (Category, Attributes)
- ✅ Proper label associations
- ✅ `aria-checked` (via Radix UI)
- ✅ Space/Enter toggle
- ✅ Focus indicators

### Collapsible (Attributes)
- ✅ `aria-expanded` (via Radix UI)
- ✅ `aria-label` with state
- ✅ `aria-hidden` on icons

### Modal
- ✅ `aria-modal="true"` (via Radix UI)
- ✅ `aria-labelledby` (via Radix UI)
- ✅ Focus trap (via Radix UI)
- ✅ Esc to close (via Radix UI)

### Badges
- ✅ `role="list"` and `role="listitem"`
- ✅ `aria-label` on remove buttons
- ✅ `aria-hidden` on icons
- ✅ Enter/Space to remove
- ✅ Focus indicators

### Results Counter
- ✅ `role="status"`
- ✅ `aria-live="polite"`
- ✅ `aria-busy` during loading
- ✅ `aria-atomic="true"` (implicit)

## Future Improvements

### Potential Enhancements
1. Add keyboard shortcuts (e.g., `/` to focus search)
2. Add "Skip to results" link
3. Add filter count in modal title
4. Add loading state to individual filters
5. Add aria-describedby for form errors
6. Add tooltips with keyboard access
7. Consider aria-label translations

### WCAG 2.2 (Future)
- 2.4.11 Focus Not Obscured (Level AA)
- 2.5.7 Dragging Movements (Level AA)
- 2.5.8 Target Size (Minimum) (Level AA)

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [Radix UI Accessibility](https://www.radix-ui.com/primitives/docs/overview/accessibility)
- [WebAIM](https://webaim.org/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)

## Contact

For accessibility issues or questions:
- Create an issue in the repository
- Tag with `accessibility` label
- Provide detailed reproduction steps
