# UniversalPreview Runtime Crash: Root-Cause Analysis & Fix

## Symptom

```
Uncaught TypeError: o is not a function
    at UniversalPreview-*.js:1:237
```

## Root Cause

**Circular chunk dependency** between the main app chunk and the UniversalPreview lazy chunk.

### Mechanism

1. **`reporting/index.ts:139`** statically re-exported `UniversalPreview`:
   ```ts
   export { default as UniversalPreview } from '@/pages/settings/print-settings/components/preview/UniversalPreview';
   ```

2. **`components/index.ts:6`** (print-settings barrel) also statically re-exported:
   ```ts
   export { default as UniversalPreview } from './preview/UniversalPreview';
   ```

3. **`TemplatePrintModal.tsx:6`** had a static import:
   ```ts
   import UniversalPreview from '@/pages/settings/print-settings/components/preview/UniversalPreview';
   ```

4. `UniversalPreview` was simultaneously dynamically imported via `React.lazy()` in `PreviewSelector.tsx`, `TemplateLibraryModal.tsx`, and `BatchPrintModal.tsx`.

### The bundler's dilemma

Rolldown saw:
- **Static imports** from `reporting/index.ts`, `components/index.ts`, `TemplatePrintModal.tsx` → place UniversalPreview in the main app chunk
- **Dynamic imports** from `React.lazy()` → create a separate chunk

Verdict: split the module into its own chunk, but generated:

```
app-*.js:    import{t as y}from"./UniversalPreview-*.js"    (static)
UniversalPreview-*.js:  import{W as o}from"./app-*.js"       (static)
```

**Circular chunk dependency.**

### The crash

In the app chunk, `export{..., ui as W, ...}` — `ui` is a chunk-level variable. But `ui` is ONLY assigned during module body execution (position 210638: `ui = t(...)` — the React JSX runtime wrapper).

The ESM evaluation order for circular dependencies:

1. Browser starts evaluating the app chunk (entry point)
2. Before its body runs, all static dependencies must evaluate first
3. The lazy chunk is a static dependency (`import{t as y}from...`)
4. Lazy chunk evaluates — calls `c = o()` at top level
5. `o` = live binding to `W` = live binding to chunk-level `ui`
6. **But chunk-level `ui` hasn't been assigned yet** (app chunk body hasn't executed)
7. `undefined()` → `TypeError: o is not a function`

The first `function ui(e,t)` in the app chunk (React event handler registration at position 44478) is INSIDE a `t()` module wrapper (`ee`), NOT at chunk level. So it doesn't initialize the chunk-level `ui` variable.

### Why it worked before code-splitting

Before `React.lazy()`, UniversalPreview was statically bundled into the main app chunk. No circular chunk dependency. Rolldown's internal module wrapper system handled initialization order correctly within a single chunk.

## Affected Files

| File | Change | Why |
|------|--------|-----|
| `resources/js/reporting/index.ts:139` | **Removed** `export { default as UniversalPreview }` | Broke circular dependency |
| `resources/js/pages/settings/print-settings/components/index.ts:6` | **Removed** `export { default as UniversalPreview }` | Same barrel export issue |
| `resources/js/reporting/components/shared/TemplatePrintModal.tsx` | **Converted** static import → `React.lazy()` | Eliminated last static import from app chunk |

## Before vs After (Chunk Dependency Graph)

### BEFORE (crashes)
```
app-*.js ──static──import──→ UniversalPreview-*.js
     ↑                              │
     └──────── static import ────────┘
     (circular! lazy chunk evaluates first)
```

### AFTER (works)
```
app-*.js  (no static import to lazy chunk)
     ↑
     └── dynamic import (React.lazy) ──→ UniversalPreview-*.js
     (one-way, app chunk evaluates first)
```

## Build Verification

- **`npm run build`**: 0 errors, 1,032 modules
- **`npm test`**: 133/133 tests passing (990ms)
- **Circular dependency**: CONFIRMED BROKEN — app chunk has no `import` from UniversalPreview chunk
- **One-way dependency**: CONFIRMED — UniversalPreview chunk imports from app chunk (correct direction)

## Regression

### Chunk sizes (before → after)

| Chunk | Before | After | Delta |
|-------|--------|-------|-------|
| `app-*.js` | 385.70 kB | 791.19 kB | +405 kB (deps moved back) |
| `UniversalPreview-*.js` | 428.23 kB | 32.81 kB | −395 kB (only component code) |

The 395 kB of shared dependencies (recharts, d3-shape, d3-array, lodash, decimal.js-light, etc.) moved from the lazy chunk to the app chunk. This is **neutral for total load** (same JS parsed) but **worse for initial load** (browser parses more upfront). UniversalPreview's lazy chunk is now small and fast to load.

To restore aggressive code-splitting while maintaining correctness, a future enhancement could inline the shared dependencies into a separate shared chunk that both the app chunk and lazy chunk import from, avoiding the circular dependency while keeping the heavy deps out of the initial load.

### Verified functionality

- Build succeeds (0 errors)
- All 133 unit tests pass
- All 3 test suites pass (registry-validation, serializer, visibility-engine)
- TypeScript: no new errors (all errors are pre-existing across the codebase)
