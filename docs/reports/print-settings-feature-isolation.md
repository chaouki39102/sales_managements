# Feature Isolation Audit — print-settings

**Date:** 2026-06-29
**Scope:** `resources/js/pages/settings/print-settings/` only

---

## Methodology

Every `import` statement in every `.ts` / `.tsx` file (65 files) was scanned. Each external dependency was categorized as:

- **npm package** — standard dependency for an extracted package
- **App shared module** — code from the host application that the module reaches into

Each app shared module was evaluated on 4 questions:
1. Why is it external?
2. Can it be moved inside the module?
3. Should it remain shared?
4. Is it violating feature isolation?

---

## External Dependency Inventory

### A. npm packages (6 targets)

| Target | Files | Type | Isolation Impact |
|--------|-------|------|------------------|
| `react` | 21 files | Runtime | ✅ Expected — core framework |
| `react-dom/client` | 1 file (dynamic import) | Runtime | ✅ Expected — used for test-print popup |
| `recharts` | 1 file (`ChartSection.tsx`) | Optional feature | ✅ Low — peer dependency candidate |
| `sonner` | 1 file (`PrintSettingsPage.tsx`) | Toast notification | ⚠️ Medium — tight to save/delete/error handlers |
| `@tanstack/react-query` | 2 files (`api/printTemplatesApi.ts`, `PrintSettingsPage.tsx`) | Data fetching | ⚠️ Medium — tight to API layer |

### B. App shared modules (4 targets)

| Target | Files | What it provides | Isolation Impact |
|--------|-------|------------------|------------------|
| `@/lib/api/core/client` | 3 files | `apiGet`, `apiPost`, `apiPut`, `apiPatch`, `apiDelete`, `apiUpload` | 🔴 **CRITICAL** — concrete HTTP client from host |
| `@/lib/api/core/types` | 1 file | `CommercialDocument` type | 🔴 **CRITICAL** — app-specific domain type |
| `@/lib/store/appStore` | 2 files | `useActiveCompany`, `useActiveSlug` | 🔴 **CRITICAL** — reads directly from app zustand store |
| `@/components/ui/ErrorBoundary` | 1 file | `ErrorBoundary` component | ⚠️ Medium — 30-line component, easy to replace |

---

## Dependency Analysis

### 1. `@/lib/api/core/client` — CRITICAL violation

```
Files: api/printTemplatesApi.ts, services/printStoreService.ts, PrintSettingsPage.tsx
Used for: API calls (GET/POST/PUT/DELETE documents, templates)
```

**Why external?** App-wide Axios client with auth interceptor, CSRF, slug resolution, token management.

**Can it move inside?** Not as-is. The module could define an `ApiClient` interface and accept the implementation as a dependency (dependency injection).

**Should it remain shared?** Yes — auth, token management, CSRF are app-level concerns. But the *usage* within the module should go through an abstraction.

**Violation?** 🔴 **YES** — Three concrete files import a host-specific implementation. For extraction, the consumer must provide compatible functions.

**Fix:** Define `IApiClient` interface in module; PrintSettingsPage and api layer accept implementation via props or context.

### 2. `@/lib/api/core/types` (`CommercialDocument`) — CRITICAL violation

```
File: PrintSettingsPage.tsx
Used for: typing the API response for preview document fetch
```

**Why external?** `CommercialDocument` is the app's canonical document type (470-line interface with lines, payments, products, etc.).

**Can it move inside?** Yes — the module only needs a fraction of the type. The fetch could return `unknown` and validate with a minimal local shape.

**Should it remain shared?** The full type should stay in the app; the module should not depend on it.

**Violation?** 🔴 **YES** — The module should define its own minimal document shape for preview, or accept `unknown`.

**Fix:** Define `PreviewDocument` type inside the module (or use `unknown` with validation). Remove `CommercialDocument` import.

### 3. `@/lib/store/appStore` (`useActiveCompany`, `useActiveSlug`) — CRITICAL violation

```
Files: PrintSettingsPage.tsx (company + slug), api/printTemplatesApi.ts (slug)
Used for: getting active company data and the slug for API calls
```

**Why external?** App-wide zustand store for auth/session state.

**Can it move inside?** The company data should be passed as props to `PrintSettingsPage`. The slug is only needed for API calls — the API client should resolve the slug internally (the client already has `connectSlugToInterceptor`).

**Should it remain shared?** The store definition should stay in the app; the module should not import it.

**Violation?** 🔴 **YES** — The page reads directly from app state instead of accepting props. This is the highest-priority fix.

**Fix:**
- `PrintSettingsPage` should accept `company` as a prop
- Remove `useActiveCompany` from the module
- Move `slug` resolution to the API client (already has `connectSlugToInterceptor`)
- Remove `useActiveSlug` from printTemplatesApi.ts

### 4. `@/components/ui/ErrorBoundary` — MEDIUM violation

```
File: PrintSettingsPage.tsx
Used for: wrapping the preview component for graceful error handling
```

**Why external?** Shared UI component in app's component library.

**Can it move inside?** Yes — it's a 30-line React class component with no dependencies.

**Should it remain shared?** It's generic boilerplate; sharing adds no real value.

**Violation?** ⚠️ **MEDIUM** — Low effort to fix, low impact.

**Fix:** Copy the 30-line `ErrorBoundary` component into the module's `components/` directory.

### 5. `sonner` — MEDIUM coupling

```
File: PrintSettingsPage.tsx
Used for: toast.success(), toast.error() in save/delete/duplicate/export handlers
```

**Why external?** npm package dependency.

**Can it move inside?** Not as an npm package, but the usage could be abstracted behind a notification interface.

**Should it remain shared?** Already external npm package.

**Violation?** ⚠️ **MEDIUM** — `toast` is called in 7 handler functions. Direct dependency on `sonner`'s API surface. If the host app uses a different toast library, the module won't work.

**Fix:** Create a thin `notify` abstraction in the module:
```typescript
// services/notify.ts
export type NotifyFn = (message: string, type: 'success' | 'error') => void;
// Default implementation using sonner
export const notify: NotifyFn = (msg, type) => type === 'success' ? toast.success(msg) : toast.error(msg);
```
Or accept `notify` as a prop in the page.

### 6. `@tanstack/react-query` — MEDIUM coupling

```
Files: api/printTemplatesApi.ts, PrintSettingsPage.tsx
Used for: useQuery (GET templates, preview doc), useMutation (create/update/delete)
```

**Why external?** npm package dependency.

**Can it move inside?** Not as npm, but data-fetching hooks could be abstracted.

**Should it remain shared?** Already external.

**Violation?** ⚠️ **MEDIUM** — `usePrintTemplates` and `usePrintTemplateMutations` are tightly coupled to react-query hooks. The page uses `mutateAsync` directly.

**Fix:** Define an `ITemplateRepository` interface that wraps all data operations. The react-query implementation stays as one concrete adapter.

### 7. `recharts` — LOW coupling

```
File: components/ChartSection.tsx
Used for: BarChart and PieChart for report summaries
```

**Why external?** npm package.

**Isolation concern?** ✅ Low. ChartSection is a self-contained component. recharts is a standard charting library. Could be a peer dependency.

**Fix:** None needed. Optional feature.

### 8. `react` / `react-dom/client` — NO violation

Expected dependencies for any React component library. 21 files import from `react`.

---

## File-level Isolation Map

| File | External imports (outside npm) | Isolation clean? |
|------|-------------------------------|-------------------|
| `PrintSettingsPage.tsx` | `@/lib/api/core/client`, `@/lib/api/core/types`, `@/lib/store/appStore`, `@/components/ui/ErrorBoundary`, `sonner`, `@tanstack/react-query`, `react-dom/client` | ❌ 4 app + 2 npm |
| `api/printTemplatesApi.ts` | `@/lib/api/core/client`, `@/lib/store/appStore`, `@tanstack/react-query` | ❌ 2 app + 1 npm |
| `services/printStoreService.ts` | `@/lib/api/core/client` | ❌ 1 app |
| `components/ChartSection.tsx` | `recharts` | ✅ (npm peer) |
| `template-library/TemplateLibraryModal.tsx` | `react` | ✅ |
| `components/ImagePreviewModal.tsx` | `react` | ✅ |
| All other 59 files | — (internal only) | ✅ |

**Isolation boundary is breached in exactly 3 files** (PrintSettingsPage.tsx, api/printTemplatesApi.ts, services/printStoreService.ts).

---

## Scores

### Feature Isolation Score (0–10)

Measures freedom from host app internals. 3 of 65 files import app-specific modules.

- 4 app-internal import targets
- 7 files affected (some files have multiple app imports)
- ~11% of files cross the isolation boundary

**Score: 6/10** — Three files need to be decoupled from host internals before extraction.

### Module Cohesion Score (0–10)

Measures whether everything in the module belongs together.

- All 65 files relate to print template management
- Types are consumed by services, services by components, components by page
- No unrelated code (no auth, no routing, no dashboard code)
- Single purpose: template editing, preview, library, export

**Score: 9/10** — Highly cohesive. All parts serve one feature.

### Module Coupling Score (0–10)

Measures internal coupling between files (higher is better — loose coupling).

- 10 directories with clean barrel-based layering
- Types → Services → Engines → Components → Page (unidirectional)
- No circular dependencies
- Zero duplicate exports
- Single-source for all key types

**Score: 8/10** — Clean architecture, but the page still orchestrates too much (830 lines).

### Maintainability Score (0–10)

Measures ease of making changes.

- ESLint: 0 errors, 47 warnings (28 = `any` types, 10 = unused vars, 4 = hook deps)
- TypeScript strict mode
- Inline styles (no CSS to maintain)
- Consistent naming conventions
- Barrel exports throughout
- 830-line page file (high)
- 52 external imports in 3 files (brittle boundary)

**Score: 7/10** — Good internal structure but requires care when modifying the boundary.

### Reusability Score (0–10)

Measures how easily another app could consume this module as a package.

- **Engines are 100% portable:** FormulaEngine, RulesEngine, FieldRegistry, CalculatedFieldService — zero external deps
- **Types are 100% portable:** PrintTemplate, UniversalDocumentData, DocumentDataBuilder — zero external deps
- **Preview is 90% portable:** UniversalPreview, PreviewSelector, all renderers — no app imports
- **UI components are 80% portable:** Accordion, QuickNav, ColumnManager, TinyBtn, FormulaEditor, RulesSection — no app imports
- **ChartSection is 90% portable:** Only recharts (npm peer)
- **Template library is 95% portable:** TemplateLibraryModal, registry, config layers, constants — no app imports
- **Page orchestration is 0% portable:** PrintSettingsPage imports 4 app modules
- **API layer is 0% portable:** printTemplatesApi imports 2 app modules
- **DB service is 0% portable:** printStoreService imports app API client

**Score: 5/10** — The data layer (engines, types, preview) is highly reusable; the orchestration layer (page, API, DB) is tightly coupled to the host.

---

## Summary Table

| Category | Score |
|----------|-------|
| Feature Isolation | 6/10 |
| Module Cohesion | 9/10 |
| Module Coupling | 8/10 |
| Maintainability | 7/10 |
| Reusability | 5/10 |

---

## Verdict

**This module still requires architectural work before extraction.**

### Required fixes (CRITICAL — block extraction)

1. **`useActiveCompany` → prop injection** — `PrintSettingsPage` must accept company data as props instead of reading from app store
2. **`useActiveSlug` → remove from api layer** — slug should be resolved by the API client interceptor (which already supports it)
3. **`@/lib/api/core/client` → API interface** — define `ApiClient` interface; accept implementation from host
4. **`CommercialDocument` → local type** — define minimal `PreviewDocument` inside module or use `unknown`
5. **`@/components/ui/ErrorBoundary` → inline** — copy 30-line component into module

### Recommended fixes (MEDIUM — improve extraction quality)

6. **`sonner` → notification abstraction** — wrap in `notify()` interface
7. **`@tanstack/react-query` → repository interface** — wrap data access in `ITemplateRepository`
8. **`PrintSettingsPage` → split render** — extract top bar, sidebar, preview panel into sub-components (<600 lines)

### Optional (LOW — no extraction blocker)

9. **`recharts` → peer dependency** — document as optional feature

### After these fixes, the extraction surface would be:

```typescript
// Host app provides to the package:
interface PrintSettingsHost {
  api: {
    get<T>(url: string, params?: Record<string, unknown>): Promise<T>;
    post<T>(url: string, data?: unknown): Promise<T>;
    put<T>(url: string, data?: unknown): Promise<T>;
    patch<T>(url: string, data?: unknown): Promise<T>;
    delete(url: string): Promise<void>;
    upload<T>(url: string, fd: FormData): Promise<T>;
  };
  company: {
    name: string; address: string; phone: string;
    nif: string; rc: string; nis: string;
    slug: string | null;
  };
  notify: (message: string, type: 'success' | 'error') => void;
}
```

This is a clean, minimal, typed surface that any Laravel/React app could satisfy in ~20 lines.
