# Print Designer / Print Runtime Separation Report

## Root Cause

`usePrintTemplates()` (exported from `reporting/index.ts`) depends on `PrintSettingsContext` — a React context that provides `printTemplatesApi`, `slug`, and other dependencies via dependency injection. This context is **only mounted** inside the Print Settings page route (`print-settings-adapter.tsx:49`).

All three printing consumers — `CommercialDocumentModal`, `SessionStatsModal`, and `BatchPrintModal` — imported `usePrintTemplates` from `@/reporting` but rendered on pages **outside** the Print Settings page. The hook threw:

```
PrintSettingsProvider missing — wrap <PrintSettingsPage> in <PrintSettingsProvider>
```

React Query's `useQuery` returned no data, so `TemplatePrintModal` fell back to `createDefaultTemplate()`, showing a generic template instead of the user's designed template.

## Why Not Standalone Hooks

The quick fix would be to create standalone hooks that bypass the context and import `apiGet`/`useActiveSlug` directly. This was rejected because:

1. **Reintroduces Host Coupling** — the entire print-settings module was refactored to use `ApiClient` interface + DI to eliminate direct dependencies on `@/lib/api/core/client` and `@/lib/store/appStore`
2. **Two Access Paths** — designer uses context, runtime uses global imports → inconsistent architecture
3. **Undoes Feature Isolation** — a key design goal was keeping the print module self-contained

## Solution: Print Designer / Print Runtime Separation

### Architectural Insight

There are **two distinct bounded contexts**:

| Context | Purpose | Dependencies |
|---------|---------|-------------|
| **Print Designer** (`print-settings/`) | Edit, save, manage templates | `PrintSettingsProvider` (undo/redo, notifier, full repository) |
| **Print Runtime** (`reporting/runtime/`) | Load, resolve, render, print | `RuntimeContext` (templateRepository + slug only) |

The designer is **write-heavy**: it needs undo/redo, history, notifier, full repository mutations.
The runtime is **read-only**: it only loads templates and renders/prints them.

### New Runtime Layer

```
resources/js/reporting/runtime/
├── PrintRuntimeContext.tsx     # Minimal context (templateRepository + slug)
├── PrintRuntimeAdapter.tsx     # Single bridge to host (imports apiGet/useActiveSlug)
├── usePrintTemplatesList.ts    # Runtime hook to load templates
├── TemplateResolver.ts         # Pure functions: resolveTemplate, resolveTemplateById, filterTemplatesByDocTypes
└── index.ts                    # Barrel
```

### Dependency Graph (Before)

```
App (root)
└── Print Settings Page ← PrintSettingsProvider ──→ printTemplatesApi (context)
│                                                    ↑
└── Document Page ──→ usePrintTemplates() ──────────┘ ← CRASH: no provider
│
└── POS Page ────────→ usePrintTemplates() ──────────┘ ← CRASH: no provider
```

### Dependency Graph (After)

```
App (root)
├── PrintRuntimeAdapter (apiGet + useActiveSlug → RuntimeContext)
│   ├── Document Page ──→ usePrintTemplatesList() ──→ RuntimeContext ✓
│   ├── POS Page ────────→ usePrintTemplatesList() ──→ RuntimeContext ✓
│   └── Print Settings Page ──────────────────────────→ PrintSettingsProvider ✓
└── Print Settings Page (independent, own provider)
```

### Affected Files

| File | Change |
|------|--------|
| `reporting/runtime/PrintRuntimeContext.tsx` | **NEW** — RuntimeProvider + useRuntime hook |
| `reporting/runtime/PrintRuntimeAdapter.tsx` | **NEW** — bridges host to runtime (only place importing apiGet/store) |
| `reporting/runtime/usePrintTemplatesList.ts` | **NEW** — runtime hook for loading templates |
| `reporting/runtime/TemplateResolver.ts` | **NEW** — pure template resolution functions |
| `reporting/runtime/index.ts` | **NEW** — runtime barrel |
| `App.tsx` | Mount `PrintRuntimeAdapter` inside `FiscalYearProvider` |
| `reporting/index.ts` | Export `usePrintTemplatesList` from runtime |
| `CommercialDocumentModal/index.tsx` | Switch from `usePrintTemplates` → `usePrintTemplatesList` |
| `SessionStatsModal.tsx` | Switch from `usePrintTemplates` → `usePrintTemplatesList` |
| `BatchPrintModal.tsx` | Switch from `usePrintTemplates` → `usePrintTemplatesList` |

### Unchanged

- `print-settings/api/printTemplatesApi.ts` — context-based hooks preserved for designer
- `print-settings/PrintSettingsPage.tsx` — still imports designer hooks directly
- `print-settings-adapter.tsx` — unchanged
- `TemplatePrintModal.tsx` — stays as pure component, receives templates as props
- All 133 existing tests pass
- Build: 0 errors, 1037 modules

## Regression Verification

- `npm run build` — 0 errors ✓
- `npm test` — 133/133 pass ✓
- `CommercialDocumentModal` — now produces templates via RuntimeContext ✓
- `SessionStatsModal` — now produces report templates via RuntimeContext ✓
- `BatchPrintModal` — now produces all templates via RuntimeContext ✓
- Print Settings page — unchanged, uses designer hooks with full provider ✓
- Cache sharing — runtime and designer share same React Query keys, so saves in designer are immediately visible in runtime ✓
