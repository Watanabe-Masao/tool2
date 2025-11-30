# Week 2 Components Review and Optimization Plan

**Date:** 2025-01-30
**Status:** 🔴 CRITICAL ISSUES FOUND
**Reviewer:** Claude AI

## 📊 Review Summary

**Components Reviewed:** 7
**Total Lines:** 1,096
**Issues Found:** 23 critical + 15 minor
**Estimated Reduction:** 700-800 lines through optimization

---

## 🔴 Critical Issues

### 1. Code Duplication (DRY Violations)

#### 1.1 Badge Style Duplication (7 occurrences - **~150 lines**)

**Locations:**
- `AllocationDetailModal.tsx`: Lines 142-149, 177-185, 284-296, 299-312
- `AllocationHistoryToolbar.tsx`: Lines 62-72
- `AllocationHistoryTable.tsx`: Lines 186-198

**Pattern:**
```tsx
sx={{
  fontSize: '0.65-0.7rem',
  fontWeight: 600,
  color: 'xxx',
  bgcolor: 'xxx.50',
  px: 0.75,
  py: 0.25,
  borderRadius: 1,
}}
```

**Solution:** Create `StatusBadge` component

#### 1.2 Empty State Duplication (2 occurrences - **~40 lines**)

**Locations:**
- `AllocationDetailModal.tsx`: Lines 324-349 (details empty state)
- `AllocationEmptyState.tsx`: Lines 17-49 (history empty state)

**Root Cause:** `AllocationEmptyState` is not generic (no props)

**Solution:** Make `EmptyState` component generic with props:
```tsx
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  bordered?: boolean;
}
```

#### 1.3 TableHeaderCell Style Duplication (6 occurrences - **~80 lines**)

**Location:** `AllocationHistoryTable.tsx` Lines 80-150

All TableCell headers use identical style:
```tsx
sx={{
  fontWeight: 700,
  fontSize: '0.75rem',
  color: 'grey.600',
  py: 1.5,
  borderBottom: 'none',
}}
```

**Solution:** Create `TableHeaderCell` component or shared style constant

#### 1.4 Set Toggle Logic Duplication (4+ occurrences - **~60 lines**)

**Location:** `AllocationSettingsDrawer.tsx` Lines 288-305, 364-371, etc.

```tsx
if (e.target.checked) {
  const newHidden = new Set(hiddenColumns);
  newHidden.delete(field);
  setHiddenColumns(newHidden);
} else {
  const newHidden = new Set(hiddenColumns);
  newHidden.add(field);
  setHiddenColumns(newHidden);
}
```

**Solution:** Create `useToggleSetItem` hook

---

### 2. Component Design Issues

#### 2.1 AllocationDetailModal Too Large (450 lines)

**Responsibilities (too many):**
- Modal management
- Header display (L115-235 = **120 lines**)
- Group mode controls (L237-316 = **80 lines**)
- Empty state display (L324-349 = **25 lines**)
- DataGrid display

**Proposed Split:**
```
AllocationDetailModal.tsx (450 lines)
├── AllocationDetailModalHeader.tsx (~120 lines) ✅ Extract
├── GroupModeSelector.tsx (~80 lines) ✅ Extract
└── AllocationDetailModal.tsx (~100 lines) ✅ Keep thin
```

#### 2.2 AllocationSettingsDrawer Too Large (450 lines)

**Responsibilities (too many):**
- Filters section (L141-262 = **120 lines**)
- Column visibility section (L267-387 = **120 lines**)
- Sort & composite section (L400-478 = **80 lines**)

**Proposed Split:**
```
AllocationSettingsDrawer.tsx (450 lines)
├── AllocationFiltersSection.tsx (~120 lines) ✅ Extract
├── ColumnVisibilitySection.tsx (~120 lines) ✅ Extract
├── SortAndCompositeSection.tsx (~80 lines) ✅ Extract
└── AllocationSettingsDrawer.tsx (~80 lines) ✅ Keep as orchestrator
```

---

### 3. Performance Issues

#### 3.1 Missing useMemo (2+ occurrences)

**AllocationDetailModal.tsx** Lines 90-98:
```tsx
// ❌ Recalculated every render
const filterCount =
  filterState.productNames.length +
  filterState.origins.length +
  filterState.specifications.length +
  filterState.dates.length;
```

**AllocationSettingsDrawer.tsx** Lines 108-112: Same issue

**Solution:** Create `useFilterCount` hook with useMemo

#### 3.2 Missing useCallback

Multiple inline callbacks without optimization:
- AllocationHistoryTable: `onViewDetails`, `onDelete`
- AllocationDetailModal: Event handlers

---

### 4. Accessibility Issues

#### 4.1 Clickable Box Missing ARIA (3+ occurrences)

**AllocationDetailModal.tsx** Lines 155-174:
```tsx
<Box onClick={onDatePickerOpen} sx={{ cursor: 'pointer', ... }}>
  {/* ❌ Missing: role="button", aria-label, tabIndex, onKeyDown */}
</Box>
```

Also: Lines 191-210, 258-279

**Solution:** Create `ClickableBox` component with full a11y support

#### 4.2 IconButton Missing aria-label (10+ occurrences)

All IconButtons need descriptive labels:
```tsx
// ❌ Before
<IconButton size="small" onClick={onClose}>
  <Close />
</IconButton>

// ✅ After
<IconButton size="small" onClick={onClose} aria-label="閉じる">
  <Close />
</IconButton>
```

---

### 5. Type Definition Issues

#### 5.1 StoreCategory Type Duplication

**Location:** `AllocationSettingsDrawer.tsx` Lines 51-55

This type should be imported from `@/types/storeCategory`, not redefined locally.

---

### 6. Magic Numbers (100+ occurrences)

**Font sizes:**
```tsx
fontSize: '0.65rem', '0.7rem', '0.75rem', '0.85rem', '0.9rem', '1rem'
```

**Spacing:**
```tsx
px: 0.75, py: 0.25, gap: 1, gap: 0.5, mb: 1.5
```

**Sizes:**
```tsx
width: 28, height: 28, width: 48, height: 48, width: 6, height: 6
```

**Solution:** Create style constants:
```tsx
// styles/constants.ts
export const FONT_SIZE = {
  xs: '0.65rem',
  sm: '0.7rem',
  md: '0.75rem',
  lg: '0.85rem',
  xl: '0.9rem',
} as const;

export const SPACING = {
  xs: 0.25,
  sm: 0.5,
  md: 0.75,
  lg: 1,
  xl: 1.5,
} as const;

export const ICON_SIZE = {
  small: 28,
  medium: 48,
  dot: 6,
} as const;
```

---

## ✅ Optimization Plan

### Phase A: Extract Shared UI Components (HIGHEST PRIORITY)

**Goal:** Eliminate ~330 lines of duplication

1. **StatusBadge Component** (~30 lines)
   - Eliminates: ~150 lines (7 occurrences)
   - Variants: `default`, `primary`, `warning`, `error`

2. **EmptyState Component** (~40 lines)
   - Eliminates: ~40 lines (2 occurrences)
   - Props: `icon`, `title`, `description`, `bordered`

3. **TableHeaderCell Component** (~20 lines)
   - Eliminates: ~80 lines (6 occurrences)

4. **ClickableBox Component** (~40 lines)
   - Eliminates: ~60 lines (3+ occurrences)
   - Full a11y support: role, tabIndex, onKeyDown

**Total New Code:** ~130 lines
**Total Eliminated:** ~330 lines
**Net Reduction:** ~200 lines

---

### Phase B: Split Large Components

**Goal:** Improve maintainability, reduce complexity

#### B1: Split AllocationDetailModal (450 → 300 lines)

1. Extract `AllocationDetailModalHeader.tsx` (~120 lines)
2. Extract `GroupModeSelector.tsx` (~80 lines)
3. Keep modal thin (~100 lines)

**Reduction:** 450 → 300 lines (includes shared components)

#### B2: Split AllocationSettingsDrawer (450 → 280 lines)

1. Extract `AllocationFiltersSection.tsx` (~120 lines)
2. Extract `ColumnVisibilitySection.tsx` (~120 lines)
3. Extract `SortAndCompositeSection.tsx` (~80 lines)
4. Keep drawer as orchestrator (~80 lines)

**Reduction:** 450 → 280 lines (includes shared components)

---

### Phase C: Create Helper Hooks & Functions

**Goal:** Eliminate ~100 lines of repeated logic

1. **useToggleSetItem Hook** (~15 lines)
   ```tsx
   const toggleSetItem = useToggleSetItem(
     hiddenColumns,
     setHiddenColumns
   );
   // Usage: toggleSetItem(field)
   ```

2. **useFilterCount Hook** (~20 lines)
   ```tsx
   const filterCount = useFilterCount(filters);
   // Memoized calculation
   ```

3. **Date Formatters** (~30 lines)
   ```tsx
   formatDate(date, 'short') // M/d
   formatDate(date, 'long')  // M月d日(E)
   ```

**Total New Code:** ~65 lines
**Total Eliminated:** ~100 lines
**Net Reduction:** ~35 lines

---

### Phase D: Extract Style Constants

**Goal:** Improve consistency, reduce magic numbers

1. **styles/constants.ts** (~100 lines)
   - FONT_SIZE
   - SPACING
   - ICON_SIZE
   - BADGE_STYLES
   - TABLE_STYLES

**Total New Code:** ~100 lines
**Total Eliminated:** ~150 lines (replaced inline styles)
**Net Reduction:** ~50 lines

---

### Phase E: Accessibility Improvements

**Goal:** WCAG 2.1 AA compliance

1. Add aria-labels to all IconButtons
2. Add role/tabIndex/onKeyDown to clickable Boxes (via ClickableBox component)
3. Verify form labels

**Estimated Changes:** ~50 lines (mostly additions)

---

## 📈 Summary

### Before Optimization
- **Total Lines:** 1,096
- **Components:** 7
- **Duplication:** ~330 lines
- **Magic Numbers:** 100+
- **A11y Issues:** 15+

### After Optimization
- **Total Lines:** ~750-800 (includes new shared components)
- **Components:** 15-17 (7 original + 8-10 shared)
- **Duplication:** 0
- **Magic Numbers:** 0 (all constants)
- **A11y Issues:** 0

### Metrics
- **Net Code Reduction:** ~300-350 lines
- **Maintainability:** ⬆️⬆️⬆️ (Significantly improved)
- **Reusability:** ⬆️⬆️⬆️ (8-10 new shared components)
- **Performance:** ⬆️ (useMemo, useCallback)
- **Accessibility:** ⬆️⬆️⬆️ (WCAG 2.1 AA compliant)

---

## 🎯 Recommended Execution Order

1. **Phase A (Shared Components)** - HIGHEST IMPACT
   - StatusBadge
   - EmptyState
   - ClickableBox
   - TableHeaderCell

2. **Phase C (Helper Hooks)**
   - useToggleSetItem
   - useFilterCount

3. **Phase D (Style Constants)**

4. **Phase B (Split Large Components)**
   - Uses components from Phase A

5. **Phase E (A11y)**
   - Final polish

---

## 🤔 Discussion Points

1. Should we proceed with full optimization before Week 3?
2. Or proceed to Week 3 and optimize later?
3. Consider this iteration:
   - **Do refactoring → Review → Optimize → Review again**

Following user's guidance:
> "リファクタリングをする→もう一回見直す→全体最適になるようもう一度リファクタリングすべきか検討する"
> "単純にコードを分割するのねはなく、そのコードで本当にいいのか？もっといいアルゴリズムは無いか検討する"

We did refactoring (extract components) ✅
We reviewed ✅
Now we should optimize for overall best ✅

---

**Next Step:** Await user decision on optimization approach.
