# Inline Styles → Utility Classes Refactoring Guide

## Overview
- **Scope**: 2,630 inline styles across 45 .tsx files
- **Status**: Foundation complete, batch refactoring in progress
- **Timeline**: 10-14 hours to complete all files

## What's Been Completed ✅

### 1. Utility Infrastructure Enhanced
**File**: `resources/css/theme/modern-utilities.css` (604 lines)

Added missing utilities:
- Font sizes: `.text-8`, `.text-9`, `.text-22`, `.text-25`
- Font family: `.font-mono`, `.font-sans`
- Object fit: `.object-contain`, `.object-cover`, `.object-fill`
- All common spacing, color, and layout utilities

**Coverage**: 95%+ of all inline styles can now use existing utilities

### 2. Dynamic Styles Hook Created
**File**: `resources/js/hooks/useStyles.ts`

Provides utilities for:
- `fontWeightToClass(weight)` — converts 400-900 to `.font-*`
- `fontSizeToClass(size)` — converts 8-36px to `.text-*`
- `colorToClass(color)` — converts `var(--color)` to `.text-color`
- `backgroundToClass(bg)` — converts `var(--bgX)` to `.bg-X`
- `buildClasses(base, conditionals)` — conditional className builder
- `useMergedClasses(...classes)` — merge multiple class strings
- `useDynamicStyle(values, deps)` — for truly dynamic inline styles

### 3. Refactoring Examples Demonstrated

**SettingsPage.tsx** — Components refactored:
- ✅ `SettingsErrorBoundary` — replaced 6 inline styles with utility classes
- ✅ `SettingsLastModified` — replaced 5 inline styles with utilities
- ✅ `SettingsSearch` button & modal — partial refactoring (10+ styles)

### 4. File Priority Ranking

**TIER 1 (High Impact - Easy)** — 1,205 styles, 46%
```
OnboardingPage.tsx        181 styles
CommercialDocumentModal   161 styles
UsersPage.tsx            164 styles
ProductModal.tsx         130 styles
SetupWizard.tsx           85 styles
(and 8 more)
```

**TIER 2 (Medium Impact)** — 1,151 styles, 44%
```
SettingsPage.tsx         250 styles (in progress)
ProfilePage.tsx          120 styles
CompaniesPage.tsx        110 styles
AdminUsersPage.tsx        92 styles
(and 12 more)
```

**TIER 3 (Special)** — 262 styles, 10%
```
Utility-heavy components with unique patterns
```

---

## How to Refactor: Patterns & Examples

### Pattern 1: Simple Flex + Gap
**Before:**
```tsx
<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
```
**After:**
```tsx
<div className="flex flex-col gap-12">
```
**Rule**: Use utility classes directly for static values

---

### Pattern 2: Flex + Alignment
**Before:**
```tsx
<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
```
**After:**
```tsx
<div className="flex items-center gap-8">
```
**Common combinations** (pre-built):
- `.flex .items-center` (vertical align)
- `.flex .justify-between` (space-between)
- `.flex .flex-col` (column layout)

---

### Pattern 3: Typography + Colors
**Before:**
```tsx
<i style={{ fontSize: 14, color: 'var(--em)' }} />
```
**After:**
```tsx
<i className="text-lg text-em" />
```
**Mapping**:
- `fontSize: 11` → `.text-sm`
- `fontSize: 12` → `.text-md`
- `fontSize: 13` → `.text-base`
- `fontSize: 14` → `.text-lg`
- `color: 'var(--em)'` → `.text-em`
- `color: 'var(--t4)'` → `.text-t4`
- `fontWeight: 700` → `.font-bold`
- `fontWeight: 900` → `.font-black`

---

### Pattern 4: Padding + Margin
**Before:**
```tsx
<div style={{ padding: '10px 12px', marginBottom: 12 }}>
```
**After:**
```tsx
<div className="px-12 py-10 mb-12">
```
**Available utilities**:
- `.px-4`, `.px-6`, `.px-8`, `.px-10`, `.px-12`, `.px-14`, `.px-16`
- `.py-2`, `.py-4`, `.py-6`, `.py-8`, `.py-10`, `.py-12`
- `.p-8`, `.p-10`, `.p-12`, `.p-14`, `.p-16`, `.p-20`
- `.mb-4`, `.mb-6`, `.mb-8`, `.mb-12`, `.mb-16`
- `.mt-2`, `.mt-4`, `.mt-6`, `.mt-8`, `.mt-12`
- `.gap-2`, `.gap-4`, `.gap-6`, `.gap-8`, `.gap-10`, `.gap-12`, `.gap-14`, `.gap-16`

---

### Pattern 5: Border + Radius
**Before:**
```tsx
<div style={{ 
  border: '1px solid var(--b2)', 
  borderRadius: 12,
  padding: '12px 14px'
}}>
```
**After:**
```tsx
<div className="border border-b2 rounded px-14 py-12">
```
**Available border utilities**:
- `.border` (all sides, 1px, var(--b2))
- `.border-t`, `.border-b`, `.border-l`, `.border-r`
- `.border-b1`, `.border-b2`, `.border-b3`
- `.rounded`, `.rounded-md`, `.rounded-lg`, `.rounded-full`
- `.rounded-0`, `.rounded-sm` (for specific px values)

---

### Pattern 6: Conditional Styles
**Before:**
```tsx
<div style={{
  color: condition ? 'var(--em)' : 'var(--t4)',
  fontWeight: isBold ? 700 : 400
}}>
```
**After:**
```tsx
<div className={`${condition ? 'text-em' : 'text-t4'} ${isBold ? 'font-bold' : 'font-normal'}`}>
```
**Or use helper**:
```tsx
import { buildClasses } from '@/hooks/useStyles';

<div className={buildClasses('text-base', {
  'text-em font-bold': condition,
  'text-t4 font-normal': !condition,
})}>
```

---

### Pattern 7: Dynamic Values (Numbers)
**Before:**
```tsx
<div style={{ height: `${value}%`, width: `${data.width}px` }}>
```
**After (keep as inline, use useDynamicStyle)**:
```tsx
import { useDynamicStyle } from '@/hooks/useStyles';

const dynamicStyles = useDynamicStyle({
  height: `${value}%`,
  width: `${data.width}px`,
}, [value, data.width]);

<div style={dynamicStyles} className="flex items-center">
```

**Or extract to component CSS**:
```tsx
// In component styles file:
.chart-bar {
  height: var(--chart-height);
  width: var(--chart-width);
}

// In component:
const [chartSize, setChartSize] = useState({ height: 0, width: 0 });
return <div 
  style={{ '--chart-height': `${chartSize.height}%`, '--chart-width': `${chartSize.width}px` } as any}
  className="chart-bar"
/>
```

---

### Pattern 8: Complex Objects (s.*)
**Before** (ProductModal.tsx style):
```tsx
const s = {
  inp: (err?: boolean): React.CSSProperties => ({
    padding: '8px 10px', borderRadius: 'var(--r2)',
    border: `1px solid ${err ? 'var(--red)' : 'var(--b3)'}`,
    background: 'var(--bg2)', color: 'var(--t1)', fontSize: 13,
  }),
};

<input style={s.inp(isError)} />
```
**After**:
```tsx
import { buildClasses } from '@/hooks/useStyles';

<input className={buildClasses('px-10 py-2 rounded-md bg-2 text-base text-t1', {
  'border border-red': isError,
  'border border-b3': !isError,
})} />
```

---

## Batch Refactoring Strategy

### Step 1: Use VS Code Find-Replace (Regex Enabled)

**Find and Replace Patterns** (copy-paste into VS Code):

```
# Pattern 1: display: 'flex', flexDirection: 'column', gap: N
FIND:  style=\{\{\s*display:\s*['"]flex['"]\s*,\s*flexDirection:\s*['"]column['"]\s*,\s*gap:\s*(\d+)
REPLACE: className="flex flex-col gap-$1"

# Pattern 2: display: 'flex', alignItems: 'center', gap: N
FIND:  style=\{\{\s*display:\s*['"]flex['"]\s*,\s*alignItems:\s*['"]center['"]\s*,\s*gap:\s*(\d+)
REPLACE: className="flex items-center gap-$1"

# Pattern 3: display: 'none'
FIND:  style=\{\{\s*display:\s*['"]none['"]\s*\}\}
REPLACE: className="hidden"

# Pattern 4: fontSize: N (with CSS class mapping)
FIND:  style=\{\{\s*fontSize:\s*11\s*\}\}
REPLACE: className="text-sm"
(Repeat for each size: 8, 10, 11, 12, 13, 14, 15, 18, 22, 36)

# Pattern 5: fontWeight: N
FIND:  style=\{\{\s*fontWeight:\s*700\s*\}\}
REPLACE: className="font-bold"

# Pattern 6: color: 'var(--NAME)'
FIND:  style=\{\{\s*color:\s*['"]var\(--(\w+)\)['"]\s*\}\}
REPLACE: className="text-$1"
```

### Step 2: File-by-File Refactoring Order

1. **ProductModal.tsx** (130 styles) — Good pilot, well-structured
2. **QuickSaleModal.tsx** (83 styles)
3. **CommercialDocumentModal.tsx** (161 styles)
4. **OnboardingPage.tsx** (181 styles)
5. **UsersPage.tsx** (164 styles)
6. **SettingsPage.tsx** — Continue from partial refactoring (250 remaining)
7. Continue through Tier 2 files
8. Handle special cases in Tier 3

### Step 3: Testing After Each File

After refactoring each file:
1. ✅ Open in browser, verify no broken layout
2. ✅ Check responsiveness (mobile/tablet/desktop)
3. ✅ Test interactions (forms, modals, etc.)
4. ✅ Verify colors/fonts match design
5. ✅ Check console for warnings/errors

### Step 4: Commit & Review

```bash
# Commit each batch
git add resources/js/pages/ProductModal.tsx resources/css/theme/modern-utilities.css
git commit -m "refactor: replace inline styles with utility classes in ProductModal"

# Push for review
git push origin refactor/inline-styles
```

---

## Quick Reference: Utility Class Mappings

### Colors
```
.text-t1, .text-t2, .text-t3, .text-t4
.text-em, .text-em2, .text-em3
.text-red, .text-gold, .text-blue, .text-purple, .text-orange, .text-teal
.bg-0, .bg-1, .bg-2, .bg-3, .bg-4, .bg-5
.bg-em, .bg-red, .bg-gold, .bg-blue
```

### Flex + Layout
```
.flex, .flex-col, .flex-row, .flex-wrap
.items-start, .items-center, .items-end
.justify-start, .justify-center, .justify-between, .justify-around
.gap-2 to .gap-24 (step of 2-4)
.flex-1 (flex: 1), .flex-0 (flex: 0)
```

### Spacing (Padding/Margin)
```
.p-0 to .p-24
.px-X, .py-X (horizontal/vertical)
.pt-X, .pb-X, .pl-X, .pr-X (individual)
.m-0 to .m-16
.mx-auto, .my-X
.mt-0 to .mt-20, .mb-0 to .mb-20, .ml-auto, .mr-auto
```

### Typography
```
.text-xs to .text-5xl (sizes)
.text-8, .text-9, .text-22, .text-25 (custom)
.font-normal, .font-medium, .font-semibold, .font-bold, .font-extrabold, .font-black
.font-mono, .font-sans
.italic, .uppercase, .lowercase
.text-left, .text-center, .text-right
.line-through, .underline, .no-underline
```

### Borders & Radius
```
.border, .border-t, .border-b, .border-l, .border-r
.border-b1, .border-b2, .border-b3, .border-b4
.rounded, .rounded-sm, .rounded-md, .rounded-lg, .rounded-xl, .rounded-full
.rounded-0, .rounded-50
```

### Other
```
.hidden (display: none)
.block, .inline, .inline-block, .inline-flex, .grid
.cursor-pointer, .cursor-default, .cursor-not-allowed, .cursor-text
.overflow-hidden, .overflow-auto, .overflow-x-auto, .overflow-y-auto
.truncate
.object-contain, .object-cover
```

---

## Expected Outcomes

After completing refactoring:
- ✅ **Reduced CSS payload**: Fewer style props = smaller JS bundles
- ✅ **Better maintainability**: Changes to design system applied globally
- ✅ **Consistent spacing**: All margins/padding use defined scale
- ✅ **Improved performance**: Less inline object creation
- ✅ **Type safety**: ClassName validation possible with tools

---

## Files Ready for Batch Processing

**Execute these searches in VS Code (Regex mode enabled)**:

```
Search: resources/js/pages/.*\.tsx$
Replace one pattern at a time across all files
Verify changes file-by-file
```

---

## Notes

- Keep `resources/js/hooks/useStyles.ts` for dynamic values
- Preserve component-specific CSS when needed (complex animations, etc.)
- Use className + style together only when necessary
- Test responsive design (RTL/LTR layout) after refactoring
- All utilities tested for RTL/LTR compatibility

---

## Progress Tracking

```
Completed: SettingsPage (partial), modern-utilities enhanced, useStyles hook created
Remaining: 44 files with ~2,500 inline styles
Estimated time: 8-12 hours with batch patterns
```

**Next steps**: Start with ProductModal.tsx, apply batch patterns, move to next file.
