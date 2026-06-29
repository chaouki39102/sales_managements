# Architectural Audit Report — Print Settings Module

**Date:** 2026-06-28  
**Scope:** `resources/js/pages/settings/print-settings/` + `resources/js/reporting/` (related)  
**Auditor:** AI Codebase Refactoring Agent  

---

## Table of Contents

1. [Architecture Score](#1-architecture-score)
2. [Dead Code Detection](#2-dead-code-detection)
3. [Duplicate Logic Detection](#3-duplicate-logic-detection)
4. [Folder Structure Review](#4-folder-structure-review)
5. [Type Definition Review](#5-type-definition-review)
6. [Rendering Architecture Review](#6-rendering-architecture-review)
7. [Business Logic Location Review](#7-business-logic-location-review)
8. [Naming Review](#8-naming-review)
9. [Dependency Direction Review](#9-dependency-direction-review)
10. [Over-Engineering Detection](#10-over-engineering-detection)
11. [Proposed Architecture](#11-proposed-architecture)
12. [Refactoring Plan](#12-refactoring-plan)

---

## 1. Architecture Score

| Metric | Score | Notes |
|---|---|---|
| **Overall Architecture** | 5.5 / 10 | Functional but heavily duplicated, mixed concerns, confusing structure |
| **Maintainability** | 4 / 10 | Duplicate code means changes must be made in multiple places; confusing file locations |
| **Scalability** | 6 / 10 | Template library is extensible; PreviewSelector abstracts well; but adding a new component requires touching many files |

---

## 2. Dead Code Detection

### 2.1 Entire `template-library/` in `print-settings/` — DEAD COPY

- **Path:** `resources/js/pages/settings/print-settings/template-library/`
- **Files:** `index.ts`, `types.ts`, `registry.ts`, `constants.ts`, `categories.ts`, `mockData.ts`, `TemplateLibraryModal.tsx`, `config/` (7 files)
- **Total:** ~14 files, ~800 lines
- **Why dead:** `PrintSettingsPage.tsx` line 41 imports `TemplateLibraryModal` from `@/reporting` (which resolves to `reporting/templates/library/`). No file in the codebase imports anything from `./template-library` or `../template-library`. The `print-settings/index.ts` does not re-export template library items.
- **Duplicate of:** `resources/js/reporting/templates/library/` (identical code, different import paths)
- **Can remove:** ✅ Safely. The `@/reporting` version is the one actually used.

### 2.2 `components/RulesSection.tsx` — DEAD COPY

- **Path:** `resources/js/pages/settings/print-settings/components/RulesSection.tsx`
- **Lines:** 326
- **Why dead:** `PrintSettingsPage.tsx` imports `RulesSection` from `@/reporting` (line 41). No other file imports this local copy.
- **Duplicate of:** `resources/js/reporting/components/shared/RulesSection.tsx`
- **Can remove:** ✅ Safely.

### 2.3 `components/FormulaEditor.tsx` — TRANSITIVELY DEAD COPY

- **Path:** `resources/js/pages/settings/print-settings/components/FormulaEditor.tsx`
- **Lines:** 425
- **Why dead:** Only imported by the local `RulesSection.tsx` (which is dead). Not imported by any alive file.
- **Duplicate of:** `resources/js/reporting/components/shared/FormulaEditor.tsx`
- **Can remove:** ✅ Safely. (But see 2.6 — actually needs separate treatment)

### 2.4 `components/preview/UniversalPreview.tsx` — USED COPY (ALIVE but duplicated)

- **Path:** `resources/js/pages/settings/print-settings/components/preview/UniversalPreview.tsx`
- **Lines:** 1177
- **Why alive:** `PreviewSelector.tsx` renders it. It IS used.
- **Why problematic:** It's a duplicate of `reporting/components/preview/UniversalPreview.tsx` with only import path differences (imports local `ChartSection` vs reporting's `ChartSection`). Any Preview fix must be applied to BOTH files.
- **Can remove:** ❌ Not yet — `PreviewSelector` explicitly references it. But should be unified.

### 2.5 `components/preview/shared.tsx` — USED COPY (ALIVE but duplicated)

- **Path:** `resources/js/pages/settings/print-settings/components/preview/shared.tsx`
- **Lines:** 200
- **Why alive:** Imported by the local `UniversalPreview.tsx`. Contains `getCompany()` which handles `logo_source` logic that the reporting version's `shared.tsx` does NOT have (the reporting version has an older `getCompany()`).
- **Why problematic:** The `getCompany()` with `logo_source` support is the IMPROVED version. This improvement exists only in the copy, not in the original. If someone uses `@/reporting`'s preview directly, they won't get `logo_source` support.
- **Can remove:** ❌ Not yet. But the improvements should be merged back to `reporting/components/preview/shared.tsx`, then this can point to that.

### 2.6 `components/ChartSection.tsx` — USED COPY (ALIVE but duplicated)

- **Path:** `resources/js/pages/settings/print-settings/components/ChartSection.tsx`
- **Lines:** 109
- **Why alive:** Imported by the local `UniversalPreview.tsx` (line 13: `import ChartSection from '../ChartSection'`).
- **Duplicate of:** `resources/js/reporting/components/shared/ChartSection.tsx`
- **Can remove:** ❌ Not yet. Requires the local UniversalPreview to import from `@/reporting` instead.

### 2.7 `todo/` directory — NOT CODE

- **Path:** `resources/js/pages/settings/print-settings/todo/`
- **Files:** `add reports models task.md`, `BL A4.jpg`, `bl a5.png`, `FV A4.jpg`
- **Why dead:** Notes and image mockups. Not code. Should be in project documentation, not source tree.
- **Can remove:** ✅ Move to `docs/` or delete.

### 2.8 `sections/ToggleSwitch.tsx:ColorToggle` — UNUSED EXPORT

- **Lines:** 54-56
- **Why dead:** `ColorToggle` is exported but never imported by any file.
- **Can remove:** ✅

### 2.9 `types.ts`: `DetectedPrinter` and `DocumentPrintConfig` — POTENTIALLY DEAD

- **Lines:** 448-466
- **Why:** These interfaces are defined but never imported or used in the print-settings module. They might be used externally (e.g., POS printer setup), but within `print-settings/` they are dead.
- **Can remove:** ❌ Might be used by POS. Needs manual verification.

### 2.10 `types.ts`: Backward-compat aliases — DEAD LEGACY

- **Lines:** 471-477
- `ReceiptTemplate80mm` = `PrintTemplate` — used ONLY by section files (which should use `PrintTemplate` directly)
- `CompanyPreviewData` = `CompanyData` — unnecessary alias
- `defaultTemplate()` — calls `createDefaultTemplate('FV', '80mm')` but never imported
- **Can remove:** ✅ Replace usages of `ReceiptTemplate80mm` with `PrintTemplate` in sections.

### 2.11 `print-settings/index.ts:ReceiptLiveData` re-export — DEAD

- **Lines:** 4
- `ReceiptLiveData` is re-exported as a type but `ReceiptLiveData` is defined in `types.ts` as `TemplateLiveData`. No external consumer needs this specific re-export path.
- **Can remove:** ✅ Type-only — no runtime impact.

---

## 3. Duplicate Logic Detection

### 3.1 DUPLICATE: PrintTemplate type (177 properties) in 2 files

| Location | File |
|---|---|
| Canonical | `reporting/core/domain/PrintTemplate.ts` (lines 60-241) |
| Local copy | `print-settings/types.ts` (lines 43-204) |

**Impact:** Adding a new template property requires editing BOTH files. Already caused issues with `logo_source`/`custom_logo_url` needing to be added to both.

**Fix:** Delete the local `PrintTemplate` from `types.ts`; import from `@/reporting`. The section files already import from `../types` — change their imports to `@/reporting`.

### 3.2 DUPLICATE: `createDefaultTemplate()` — 220 lines in each file

- `reporting/core/domain/PrintTemplate.ts` (lines 264-429) — canonical
- `print-settings/types.ts` (lines 219-385) — copy

**Impact:** Changing the default template requires editing two files. Values WILL diverge over time.

### 3.3 DUPLICATE: `DOC_TYPE_LIST` in 2 files

- `reporting/core/domain/PrintTemplate.ts` (lines 35-48)
- `print-settings/types.ts` (lines 24-37)

### 3.4 DUPLICATE: Column manager logic

- `PrintSettingsPage.tsx` has `ColumnManager` component (lines 271-380) — 110 lines
- `ItemsSection.tsx` has identical column toggle/move/width logic (lines 25-59) — inline

**Impact:** Double the maintenance. The `ColumnManager` in PrintSettingsPage is the full-featured version with ALL columns always displayed. The ItemsSection version only shows columns that are already visible. Two different UX patterns for the same thing.

### 3.5 DUPLICATE: Accordion / Section components

- `PrintSettingsPage.tsx` has `Accordion` component (lines 228-267)
- `ToggleSwitch.tsx` has `Section` component (lines 33-52)
- Both do the same thing: collapsible panel with title, icon, toggle behavior.

**Impact:** Inconsistency — `Accordion` uses inline styles, `Section` uses CSS class names. Two visual styles for the same UI pattern.

### 3.6 DUPLICATE: UI primitives (Toggle, Slider)

- `PrintSettingsPage.tsx` has inline `Toggle` (lines 53-80) and `Slider` (lines 82-105)
- `ToggleSwitch.tsx` has `Toggle` (lines 4-13) and `SliderField` (lines 15-31)

**Impact:** Two different visual styles. The page-level ones use inline styles, the section-level ones use CSS class names. Different behavior (page Slider shows value in monospace badge, section SliderField shows value inline).

### 3.7 DUPLICATE: Template library (14 files)

- `print-settings/template-library/` (14 files) — dead copy
- `reporting/templates/library/` (14 files) — canonical

**Impact:** Clear copy-paste error. The `@/reporting` re-exports from `reporting/templates/library/` but someone also copied it to `print-settings/template-library/` during the Phase 7 migration.

### 3.8 DUPLICATE: `CompanyData` type

- `print-settings/types.ts` (lines 434-444) — used by sections
- `print-settings/components/preview/shared.tsx` (lines 89-99) — used by preview

**Impact:** Two identical interfaces with the same name in the same module. If one is updated, the other won't be.

### 3.9 DUPLICATE: RulesSection, FormulaEditor, ChartSection

- `print-settings/components/RulesSection.tsx` — dead copy
- `print-settings/components/FormulaEditor.tsx` — dead copy
- `print-settings/components/ChartSection.tsx` — alive copy

All exist in `reporting/components/shared/` as originals.

---

## 4. Folder Structure Review

### Current structure

```
print-settings/
├── index.ts                     # Re-exports
├── PrintSettingsPage.tsx         # Main page (1449 lines — TOO LARGE)
├── types.ts                      # Types (477 lines — duplicated from reporting)
├── api/
│   └── printTemplatesApi.ts      # API layer (161 lines)
├── sections/                     # Form controls (7 files)
│   ├── HeaderSection.tsx         # (205 lines)
│   ├── DocumentSection.tsx       # (50 lines)
│   ├── ItemsSection.tsx          # (175 lines)
│   ├── TotalsSection.tsx         # (51 lines)
│   ├── FooterSection.tsx         # (108 lines)
│   ├── FormattingSection.tsx     # (37 lines)
│   └── ToggleSwitch.tsx          # Shared UI primitives (56 lines)
├── components/                   # Mixed concerns
│   ├── PreviewSelector.tsx       # (22 lines — thin wrapper)
│   ├── ImagePreviewModal.tsx     # (39 lines)
│   ├── ChartSection.tsx          # DUPLICATE of reporting
│   ├── RulesSection.tsx          # DEAD — DUPLICATE of reporting
│   ├── FormulaEditor.tsx         # DEAD — DUPLICATE of reporting
│   └── preview/
│       ├── UniversalPreview.tsx  # DUPLICATE of reporting (1177 lines)
│       └── shared.tsx            # DUPLICATE of reporting (200 lines)
├── template-library/             # DEAD — DUPLICATE of reporting
│   ├── ... (14 files)
└── todo/                         # Not code — belongs in docs/
    └── ...
```

### Problems

1. **`PrintSettingsPage.tsx` is 1449 lines** — violates Single Responsibility Principle. Contains page layout, 12 inline components (Toggle, Slider, Field, Input, Textarea, Select, Pills, ColorField, Divider, SectionTitle, Accordion, ColumnManager, TinyBtn), data fetching, save logic, keyboard shortcuts, undo/redo, modals.

2. **`sections/` has mixed concerns** — `HeaderSection.tsx` exports `AlignButtons`, `BorderSelect`, `CompanyField` used by OTHER sections. This creates an awkward dependency where `DocumentSection.tsx` imports from `HeaderSection.tsx` for `AlignButtons`.

3. **`components/` conflates presentation UI (ImagePreviewModal) with business components (ChartSection, RulesSection) with preview rendering (UniversalPreview).**

4. **`template-library/` is in the wrong place** — it's a dead copy, but even if alive, template library is a feature that spans the app, not specific to print settings.

5. **`api/` is flat** — only one file, fine for now.

### Suggested changes

| Current | Proposed | Reason |
|---|---|---|
| `PrintSettingsPage.tsx` | Split into `page/` (or keep as is but extract inline components) | 1449 lines is unmaintainable |
| `sections/HeaderSection.tsx` exports AlignButtons | Move shared UI to `components/ui/` or `sections/shared/` | Avoids circular-like dependencies |
| `types.ts` (local PrintTemplate) | Delete; import `@/reporting` | Single source of truth |
| `template-library/` | DELETE (dead copy) | Eliminates confusion |
| `components/preview/` | Merge with `@/reporting` preview | Single preview engine |
| `todo/` | Move to `docs/` or delete | Not code |

---

## 5. Type Definition Review

### Type Duplication Analysis

| Type | Local (`types.ts`) | Canonical (`reporting`) | Status |
|---|---|---|---|
| `PrintTemplate` | ✅ 177 props | ✅ 177 props | **DUPLICATED** — must be reconciled |
| `PaperSize` | ✅ | ✅ | Duplicated (union literal) |
| `AlignOption` | ✅ | ✅ | Duplicated (union literal) |
| `BorderStyle` | ✅ | ✅ | Duplicated (union literal) |
| `ColumnKey` | ✅ | ✅ | Duplicated (union literal) |
| `DocTypeCode` | ✅ | ✅ | Duplicated |
| `FontFamily` | ✅ | ✅ | Duplicated (union literal) |
| `PriceMode` | ✅ | ✅ | Duplicated (union literal) |
| `PageOrientation` | ✅ | ✅ | Duplicated (union literal) |
| `DOC_TYPE_LIST` | ✅ | ✅ | **DUPLICATED** — const array |
| `ReportRule` | ✅ | ✅ | **DUPLICATED** — interface |
| `SectionTarget` | ✅ | ✅ | **DUPLICATED** |
| `createDefaultTemplate()` | ✅ | ✅ | **DUPLICATED** — 220 lines each |
| `CompanyData` | ✅ (types.ts:434) | ✅ (shared.tsx:89) | **DUPLICATED WITHIN MODULE** |
| `ReceiptTemplate80mm` | ✅ | — | Useless alias |
| `CompanyPreviewData` | ✅ | — | Useless alias |
| `TemplateLiveData` | ✅ | — | Local, OK |
| `PrintTemplateApiResponse` | ✅ | — | Local, needed for API |

### Recommendation

1. **Primary action:** Delete local `PrintTemplate` from `types.ts`. All code in `print-settings/` should import types from `@/reporting`.

2. **Secondary action:** Delete local `createDefaultTemplate()` from `types.ts`. Import from `@/reporting`.

3. **Tertiary action:** Delete `CompanyData` from `shared.tsx` (preview) — import it from the canonical source which is exposed by `@/reporting` already as a type export.

4. **Backward compat:** Keep `PrintTemplateApiResponse` and `TemplateLiveData` locally — they are API-specific and not part of the canonical domain model.

---

## 6. Rendering Architecture Review

### Current Rendering Pipeline

```
PrintSettingsPage.tsx
  └── PreviewSelector.tsx
        └── print-settings/components/preview/UniversalPreview.tsx  ← LOCAL COPY
              ├── print-settings/components/preview/shared.tsx       ← LOCAL COPY
              ├── print-settings/components/ChartSection.tsx         ← LOCAL COPY
              ├── print-settings/components/RulesSection.tsx         ← LOCAL COPY (DEAD)
              │     └── print-settings/components/FormulaEditor.tsx  ← LOCAL COPY (DEAD)
              ├── @/reporting RulesEngine
              ├── @/reporting FormulaEngine
              └── @/reporting CalculatedFieldService
```

### Problems

1. **Two parallel preview systems:** `reporting/components/preview/UniversalPreview.tsx` (the canonical one) and `print-settings/components/preview/UniversalPreview.tsx` (the copy). The copy exists because it imports a local `ChartSection` and has a modified `getCompany()` in `shared.tsx`.

2. **Rendering + business logic mixed:** `shared.tsx` contains both pure presentational helpers (`DocRow`, `TotalRow`, `InfoRow`) and business logic (`buildTvaByRate()`, `getCompany()`).

3. **No renderer abstraction:** The preview renders directly to React DOM. There is no intermediate "render plan" or "document model" that could be used by PDF or thermal backends. The `IRenderer` interface exists in `reporting/renderers/IRenderer.ts` but is NOT used by the preview.

4. **ChartSection is inside the preview rendering chain** but has nothing to do with printing — it should be a composable widget, not hardcoded in the preview.

### Proposed Architecture

```
Rendering Layer (reporting/renderers/)
├── IRenderer.ts                   # Interface: render(PrintTemplate, UniversalDocumentData) → RenderResult
├── HtmlPreviewRenderer.ts         # Current React preview (extracted from UniversalPreview)
│   ├── components/
│   │   ├── DocInfoBlock.tsx
│   │   ├── ItemsTable.tsx
│   │   ├── TotalsBlock.tsx
│   │   ├── FooterBlock.tsx
│   │   ├── LogoRenderer.tsx
│   │   ├── BarcodeBlock.tsx
│   │   └── ...
│   └── helpers/
│       ├── colValue.ts            # Pure function: colValue(col, line, tpl) → string
│       ├── getCompany.ts          # Pure function
│       └── buildTvaByRate.ts      # Pure function
└── PdfRenderer.ts                 # Future
    └── ThermalRenderer.ts         # Future
```

This separation would allow reusing the same rendering logic for preview, PDF export, and thermal printing.

---

## 7. Business Logic Location Review

### Business Logic Currently in Components

| Logic | Current File | Type | Should Move To |
|---|---|---|---|
| `buildTvaByRate()` | `shared.tsx` (preview) | Pure calculation | `reporting/data/` or `reporting/core/engines/` |
| `getCompany()` with `logo_source` | `shared.tsx` (preview) | Data mapping | `reporting/data/DocumentDataBuilder.ts` |
| `colValue()` | `UniversalPreview.tsx` | Data formatting | `reporting/renderers/helpers/` |
| `barcodeText()` | `UniversalPreview.tsx` | Data formatting | `reporting/renderers/helpers/` |
| `qrDataText()` | `UniversalPreview.tsx` | Data formatting | `reporting/renderers/helpers/` |
| `buildEvalContext()` | `UniversalPreview.tsx` | Engine integration | `reporting/core/engines/RulesEngine.ts` or helper |
| `toApiPayload()` | `printTemplatesApi.ts` | API serialization | OK where it is (API layer) |
| `fromApiResponse()` | `printTemplatesApi.ts` | API deserialization | OK where it is (API layer) |
| Undo/Redo history | `PrintSettingsPage.tsx` | State management | Custom hook `useUndoRedo.ts` |
| Keyboard shortcuts | `PrintSettingsPage.tsx` | UI behavior | Custom hook `useKeyboardShortcuts.ts` |
| Template detail fetch | `PrintSettingsPage.tsx` | Data fetching | OK (React Query query) |

---

## 8. Naming Review

| Current Name | Problem | Suggested |
|---|---|---|
| `ReceiptTemplate80mm` | Misleading — it's the full PrintTemplate, not receipt-specific | Delete, use `PrintTemplate` |
| `CompanyPreviewData` | Unnecessary alias for `CompanyData` | Delete, use `CompanyData` |
| `defaultTemplate()` | Returns FV 80mm, not universally "default" | Delete, use `createDefaultTemplate('FV', '80mm')` directly |
| `TemplateLiveData` | "Live data" is vague — live compared to what? | `DocumentPreviewData` or keep as is |
| `DetectedPrinter` | Not printer detection — just printer config | `PrinterConfig` |
| `DocumentPrintConfig` | Generic name, hard to find | `DocTypePrintConfig` |
| `toggleActive` → `handleToggleActive` | Too long, "toggle active" is redundant | `handleToggleStatus` |
| `ALL_COLS` in `PrintSettingsPage.tsx` | Same as `COLUMNS` in `ItemsSection.tsx` | Unify to one constant |
| `Section` in `ToggleSwitch.tsx` vs `Accordion` in `PrintSettingsPage.tsx` | Same thing, different names | Use `Accordion` everywhere |
| `TinyBtn` | Informal name for production code | `IconButton` |
| `styledInput` | "Styled" is redundant (all inputs are styled) | `inputBaseStyle` |
| `PAPER_DIM` | Abbreviation of "Dimension" | `PAPER_DIMENSIONS` |

---

## 9. Dependency Direction Review

### Rules of Clean Architecture
1. UI should not contain business logic ❌
2. Rendering should not depend on API calls ✅
3. Business logic should not depend on React components ✅
4. Layers should point INWARD (UI → Domain) ❌

### Violations Found

| Violation | Description | Severity |
|---|---|---|
| **Cross-store import** | `PrintSettingsPage.tsx` imports `dbSaveTemplate` from `@/pos/store/printStore` (POS store depends on print settings, but print settings imports from POS — circular potential) | 🔴 HIGH |
| **PrintSettingsPage imports from @/reporting AND local duplicates** | Line 41 imports `RulesSection` from `@/reporting` while local `components/RulesSection.tsx` sits unused. External imports should be preferred, but the local copy being dead demonstrates confusion about which dependency direction the team chose. | 🟡 MEDIUM |
| **Section -> HeaderSection dependency** | `DocumentSection.tsx`, `ItemsSection.tsx`, `TotalsSection.tsx`, `FooterSection.tsx` all import from `HeaderSection.tsx` for `AlignButtons`, `BorderSelect`, `CompanyField`. The shared UI components live inside a specific section file. | 🟡 MEDIUM |
| **PreviewSelector imports both from @/reporting and local** | Imports `UniversalPreview` from `@/reporting` (line 3) but the actual `UniversalPreview` used is the local one because `PreviewSelector` doesn't exist in reporting... wait, looking again: line 3 imports `{ UniversalPreview } from '@/reporting'` but `PreviewSelector` renders `<UniversalPreview>` — this actually resolves to the reporting version! But the import `ChartSection from '../ChartSection'` in the local UniversalPreview uses the local copy. So both are mixed. | 🟡 MEDIUM |
| **Business logic in preview shared.tsx** | `buildTvaByRate()` is a pure data calculation living inside a UI helper file | 🟢 LOW |

---

## 10. Over-Engineering Detection

### 10.1 `template-library/config/config/` — DOUBLE NESTING

```
template-library/config/config/PaperConfig.ts
template-library/config/config/TypographyConfig.ts
... (7 files in nested config)
```

The `config/` directory is unnecessarily nested. It should be either:
- `template-library/config/PaperConfig.ts` (flatten)
- Or the parent should be named differently if `config/` was meant to be `builders/`

**Fix:** Flatten to `template-library/config/PaperConfig.ts` or rename parent to `template-library/builders/`.

### 10.2 `buildTemplate()` — 160 lines of boilerplate

The `buildTemplate()` function in `registry.ts` manually assigns every single one of the 177 PrintTemplate properties. The "builder pattern" layers (`paperConfig`, `typographyConfig`, `headerConfig`, `INVOICE_COLUMNS`, etc.) each return partial configs, but they're manually spread into the template object.

**Simplify:** Instead of:
```ts
const base: PrintTemplate = {
  margin_top: paper.marginTop,
  margin_bottom: paper.marginBottom,
  // ... 170 more lines
};
```

Do:
```ts
const base: PrintTemplate = {
  ...createDefaultTemplate(docTypeCode, paperSize),
  ...paper.build(),
  ...typo.build(),
  ...header.build(),
  ...table.build(),
  ...totals.build(),
  ...footer.build(),
  ...overrides,
};
```

This eliminates 160 lines of manual assignment and is more maintainable.

### 10.3 `ImagePreviewModal.tsx` — 39 lines, valid but trivial

This is a simple modal wrapper. It's correctly factored. Not over-engineered.

### 10.4 `MemoizedSeparator` — needless memoization

```ts
export const MemoizedSeparator = React.memo(Separator);
```

A 3-line component wrapping a 5-line component. The `Separator` component has no props that change dynamically. This is premature optimization.

### 10.5 Section files with only 37-50 lines

`FormattingSection.tsx` (37 lines), `DocumentSection.tsx` (50 lines), `TotalsSection.tsx` (51 lines). These are correctly factored — small focused components are good. Not over-engineered.

### 10.6 `ColorToggle` — wrapper with zero value

```ts
export function ColorToggle({ label, value, onChange }: { ... }) {
  return <Toggle value={value} onChange={onChange} label={label} />;
}
```

This adds zero value. It's just `Toggle` with no additional behavior. Delete.

---

## 11. Proposed Architecture

### Target Folder Structure

```
print-settings/
├── index.ts                       # Re-exports only
├── page/
│   ├── PrintSettingsPage.tsx      # Main page (extracted from current)
│   ├── useUndoRedo.ts             # Undo/redo hook
│   ├── useKeyboardShortcuts.ts    # Keyboard shortcut hook
│   └── usePreviewData.ts          # Preview data fetching logic
├── api/
│   └── printTemplatesApi.ts       # API layer (unchanged)
├── types/
│   └── index.ts                   # ONLY local types (API response, live data, printer config)
│                                  # PrintTemplate and domain types imported from @/reporting
├── sections/                      # Form controls (unchanged structure)
│   ├── HeaderSection.tsx
│   ├── DocumentSection.tsx
│   ├── ItemsSection.tsx
│   ├── TotalsSection.tsx
│   ├── FooterSection.tsx
│   ├── FormattingSection.tsx
│   └── ui/
│       ├── ToggleSwitch.tsx       # Shared UI primitives for sections
│       ├── AlignButtons.tsx       # Extracted from HeaderSection
│       └── BorderSelect.tsx       # Extracted from HeaderSection
├── components/                    # ONLY local components
│   ├── PreviewSelector.tsx
│   ├── ImagePreviewModal.tsx
│   └── ColumnManager.tsx          # Extracted from PrintSettingsPage
│
└── (NO template-library/ — deleted)
    (NO todo/ — moved to docs/)
    (NO preview/ — uses @/reporting)
    (NO dead copies of RulesSection, FormulaEditor, ChartSection)
```

### Key Architecture Decisions

1. **Single source of truth for types:** `@/reporting` provides `PrintTemplate` and all domain types. Local `types.ts` only has API-specific types (`PrintTemplateApiResponse`, `TemplateLiveData`, `DetectedPrinter`, `DocumentPrintConfig`).

2. **Single preview engine:** `print-settings/components/preview/` is deleted. Preview uses `@/reporting`'s `UniversalPreview` directly. The `getCompany()` improvement (with `logo_source`) is merged into `reporting/components/preview/shared.tsx`. `PreviewSelector` still provides the boundary layer.

3. **Dead code eliminated:** `template-library/`, `RulesSection.tsx`, `FormulaEditor.tsx`, `todo/` are deleted. Local `ChartSection.tsx` is deleted; UniversalPreview imports from `@/reporting`.

4. **Inline components extracted:** ColumnManager, useUndoRedo, useKeyboardShortcuts extracted from PrintSettingsPage.

5. **Shared UI extracted from HeaderSection:** AlignButtons, BorderSelect, CompanyField move to `sections/ui/`.

6. **Accordion unified:** Only one Accordion component exists (in `sections/ui/`), so PrintSettingsPage and sections use the same visual style.

---

## 12. Refactoring Plan

### Step 1: Merge `getCompany()` improvement into reporting (SAFEST)

- **Goal:** Move the `logo_source`-aware `getCompany()` from `print-settings/components/preview/shared.tsx` to `reporting/components/preview/shared.tsx`
- **Files affected:**
  - `reporting/components/preview/shared.tsx` — update `getCompany()`
  - `print-settings/components/preview/shared.tsx` — after merge, change to re-export from `@/reporting`
- **Risk:** 🟢 LOW (pure function change, same interface)
- **Benefit:** Single source of truth for company data resolution

### Step 2: Delete dead template library copy

- **Goal:** Remove `print-settings/template-library/` entirely
- **Files affected:**
  - Delete `print-settings/template-library/` (14 files)
  - Verify `reporting/index.ts` re-exports from `reporting/templates/library/` — already works
- **Risk:** 🟢 LOW (nobody imports from it)
- **Benefit:** Eliminates confusion, saves 14 files of dead weight

### Step 3: Delete dead RulesSection + FormulaEditor copies

- **Goal:** Remove `print-settings/components/RulesSection.tsx` and `FormulaEditor.tsx`
- **Files affected:**
  - Delete both files
  - Verify nothing imports them (they don't)
- **Risk:** 🟢 LOW
- **Benefit:** Cleaner structure

### Step 4: Delete `todo/` directory

- **Goal:** Remove non-code artifacts from source
- **Files affected:** Delete `print-settings/todo/`
- **Risk:** 🟢 LOW (notes only)
- **Benefit:** Cleaner source tree

### Step 5: Unify PrintTemplate type — delete local copy

- **Goal:** `print-settings/types.ts` no longer defines `PrintTemplate`, `createDefaultTemplate`, `DOC_TYPE_LIST`, `PaperSize`, etc.
- **Files affected:**
  - `print-settings/types.ts` — remove duplicated types; keep only `PrintTemplateApiResponse`, `TemplateLiveData`, `DetectedPrinter`, `DocumentPrintConfig`
  - All `sections/*.tsx` — change imports from `'../types'` to `'@/reporting'` for `PrintTemplate` and friends
  - `printTemplatesApi.ts` — imports from `'../types'` — change to `'@/reporting'`
- **Risk:** 🟡 MEDIUM (touches many files, but purely mechanical import changes)
- **Benefit:** **CRITICAL** — single source of truth for the 177-property core type

### Step 6: Merge local UniversalPreview back to reporting

- **Goal:** `print-settings/components/preview/UniversalPreview.tsx` points to `@/reporting` instead of local copy
- **Files affected:**
  - `print-settings/components/preview/UniversalPreview.tsx` — delete this file
  - `print-settings/components/preview/shared.tsx` — already handled in Step 1
  - `PreviewSelector.tsx` — already imports from `@/reporting`, verify
  - `print-settings/components/ChartSection.tsx` — delete (no longer needed)
- **Risk:** 🟡 MEDIUM (must verify the reporting UniversalPreview has the `logo_source` support from Step 1)
- **Benefit:** Single preview engine, eliminates 1377 lines of duplicate code

### Step 7: Extract inline components from PrintSettingsPage

- **Goal:** Split 1449-line file into maintainable pieces
- **Files affected:**
  - `PrintSettingsPage.tsx` — remove `ColumnManager`, `Toggle`, `Slider`, `Accordion`, undo/redo logic, keyboard shortcuts
  - New: `components/ColumnManager.tsx` — extracted
  - New: `sections/ui/Accordion.tsx` — extracted (replaces both `Accordion` in page and `Section` in ToggleSwitch)
  - New: `page/useUndoRedo.ts` — custom hook
  - New: `page/useKeyboardShortcuts.ts` — custom hook
- **Risk:** 🟡 MEDIUM (many extractions, but each is testable independently)
- **Benefit:** PrintSettingsPage drops to ~600 lines, each file has single responsibility

### Step 8: Unify UI primitives (Toggle, Slider)

- **Goal:** Page and sections use the same Toggle/Slider components
- **Files affected:**
  - `PrintSettingsPage.tsx` — remove inline `Toggle`/`Slider`; import from `sections/ui/ToggleSwitch.tsx`
  - `sections/ToggleSwitch.tsx` — update to support both CSS class and inline style modes (or unify styles)
  - Delete `ColorToggle` and `MemoizedSeparator`
- **Risk:** 🟡 MEDIUM (visual changes possible if styles differ)
- **Benefit:** Consistent UI, single source of truth

### Step 9: Extract shared section UI from HeaderSection

- **Goal:** `AlignButtons`, `BorderSelect`, `CompanyField` move to `sections/ui/`
- **Files affected:**
  - `sections/HeaderSection.tsx` — remove 3 exports
  - New: `sections/ui/AlignButtons.tsx`
  - New: `sections/ui/BorderSelect.tsx`
  - New: `sections/ui/CompanyField.tsx`
  - All other sections — update import paths
- **Risk:** 🟢 LOW (mechanical import changes)
- **Benefit:** Eliminates awkward cross-section imports, proper separation

### Step 10: Eliminate `CompanyData` duplication

- **Goal:** Single `CompanyData` type used across the module
- **Files affected:**
  - `print-settings/components/preview/shared.tsx` — remove local `CompanyData` interface; import from `@/reporting`
  - `print-settings/types.ts` — remove local `CompanyData` interface; import from `@/reporting`
- **Risk:** 🟢 LOW (interfaces are structurally identical)
- **Benefit:** Single source of truth

### Step 11: Refactor Column Manager (unify duplicates)

- **Goal:** Single column manager component used by both ItemsSection and the on-page extras
- **Files affected:**
  - `PrintSettingsPage.tsx` — `ColumnManager` extracted in Step 7 already
  - `ItemsSection.tsx` — use the shared `ColumnManager` instead of inline logic
- **Risk:** 🟡 MEDIUM (UX behavior must remain identical)
- **Benefit:** Eliminates duplicate logic

### Step 12: Streamline `buildTemplate()` (optional, MEDIUM-HIGH impact)

- **Goal:** Reduce `buildTemplate()` from 160 lines to ~20 by using `createDefaultTemplate()` as base
- **Files affected:**
  - `reporting/templates/library/registry.ts` or `print-settings/template-library/registry.ts`
  - Requires `createDefaultTemplate()` to accept `PaperSize` and `DocTypeCode` (already does)
- **Risk:** 🔴 HIGH (must ensure all 177 properties are set correctly — existing templates depend on exact values)
- **Benefit:** Dramatic reduction in boilerplate, easier template creation

---

### Summary of Key Actions (Ordered by Priority)

| # | Action | Risk | Effort | Impact |
|---|---|---|---|---|
| 1 | Delete dead `print-settings/template-library/` | 🟢 LOW | 5 min | Eliminates confusion |
| 2 | Delete dead `RulesSection.tsx`, `FormulaEditor.tsx` | 🟢 LOW | 5 min | Cleaner structure |
| 3 | Delete `todo/` | 🟢 LOW | 1 min | Source cleanliness |
| 4 | Merge `getCompany()` improvement to `@/reporting` | 🟢 LOW | 15 min | Foundation for Step 6 |
| 5 | Unify `PrintTemplate` type (use `@/reporting` only) | 🟡 MED | 30 min | **Critical** — single source of truth |
| 6 | Merge local `UniversalPreview` back to `@/reporting` | 🟡 MED | 30 min | Single preview engine |
| 7 | Extract inline components from PrintSettingsPage | 🟡 MED | 1 hr | Reduces 1449→~600 lines |
| 8 | Unify UI primitives (Toggle, Slider, Accordion) | 🟡 MED | 30 min | Consistent UI |
| 9 | Extract shared section UI from HeaderSection | 🟢 LOW | 20 min | Proper separation |
| 10 | Eliminate `CompanyData` duplication | 🟢 LOW | 10 min | Clean types |
| 11 | Unify ColumnManager (ItemsSection + Page) | 🟡 MED | 30 min | Remove duplicate logic |
| 12 | Streamline `buildTemplate()` with `createDefaultTemplate()` base | 🔴 HIGH | 45 min | Eliminate 140 lines boilerplate |

---

## Appendix: File Inventory

### Files to DELETE (12-14 files, ~1400 lines)

| File | Lines | Reason |
|---|---|---|
| `print-settings/template-library/` (14 files) | ~800 | Dead duplicate of `reporting/templates/library/` |
| `print-settings/components/RulesSection.tsx` | 326 | Dead duplicate of `reporting/components/shared/RulesSection.tsx` |
| `print-settings/components/FormulaEditor.tsx` | 425 | Transitively dead (only used by dead RulesSection) |
| `print-settings/components/ChartSection.tsx` | 109 | Can delete after Step 6 (merge local UP → reporting) |
| `print-settings/components/preview/UniversalPreview.tsx` | 1177 | Can delete after Step 6 |
| `print-settings/components/preview/shared.tsx` | 200 | Can delete after Step 1 (merge to reporting) |
| `print-settings/todo/` (4 files) | — | Notes/images, not code |

### Files to MODIFY (7-8 files)

| File | Change |
|---|---|
| `print-settings/types.ts` | Remove duplicated `PrintTemplate`, `createDefaultTemplate`, `DOC_TYPE_LIST` |
| `print-settings/sections/HeaderSection.tsx` | Remove 3 exports (AlignButtons, BorderSelect, CompanyField) |
| `print-settings/sections/DocumentSection.tsx` | Change import of AlignButtons to `sections/ui/` |
| `print-settings/sections/ItemsSection.tsx` | Change import of BorderSelect to `sections/ui/` |
| `print-settings/sections/TotalsSection.tsx` | Change import of AlignButtons, BorderSelect to `sections/ui/` |
| `print-settings/sections/FooterSection.tsx` | Change import of BorderSelect to `sections/ui/` |
| `print-settings/PrintSettingsPage.tsx` | Extract inline components; change imports |
| `reporting/components/preview/shared.tsx` | Merge improved `getCompany()` |
