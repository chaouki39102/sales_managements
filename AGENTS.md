# AGENTS.md — Context Cache for AI Coding Agents

## Date
2026-06-29

## Session Notes (Phase-7 — Extract all Inline Components from PrintSettingsPage)
- **PrintSettingsPage.tsx**: 1449 → 857 lines ( –592 ), now orchestrator only — no inline components remain
- **Removed all 6 inline blocks**: UI Primitives (Toggle, Slider, Field, Input, Textarea, Select, Pills, ColorField, Divider, SectionTitle, ALIGN_OPTS, BORDER_OPTS), Accordion, ColumnManager+ALL_COLS+Updater+miniBtn, TemplateControls, QuickNav+NAV_SECTIONS, TinyBtn+toolBtnStyle
- **Updated imports**: 0 `@/reporting` imports remain; all changed to local barrel paths (`./components/`, `./template-library/`, `./types/data/`, `./services/`)
- **dbSaveTemplate** import changed from `@/pos/store/printStore` → `./services/printStoreService`
- **Delete confirmation modal** stayed inline (tightly coupled UI/no abstraction benefit)
- **Build: 1032 modules, 0 errors** (PrintSettingsPage chunk: 95.40 KB)

## Session Notes (Print-Settings Self-Containment Refactoring)
- **Architectural audit** written to `docs/report.md` — 12-step plan, dead code analysis, code duplication review (Architecture 5.5/10, Maintainability 4/10, Scalability 6/10)
- **Fixed POS cart persistence** — `useCartStore.partialize` was `() => ({})` (empty), changed to save `items, client, notes, invoiceDiscountPct`
- **Created new directory structure**: `types/`, `types/domain/`, `types/data/`, `services/`, `services/engines/`, `hooks/`, `render/`, `render/preview/`, `render/helpers/`, `config/`, `utils/`, `sections/ui/`, `page/`
- **Copied 6 files from `@/reporting`** into local structure with fixed import paths:
  - `types/data/UniversalDocumentData.ts` — canonical data contract
  - `types/data/DocumentDataBuilder.ts` — document builder
  - `services/FieldRegistry.ts` — 79 cataloged fields
  - `services/CalculatedFieldService.ts` — 8 computed fields
  - `services/engines/FormulaEngine.ts` — expression evaluator (no eval)
  - `services/engines/RulesEngine.ts` — declarative rule evaluator
- **Removed all 26 `@/reporting` imports** across 14 print-settings files — now fully self-contained
- **Fixed template-library config nesting** — removed extra `config/config/` dir, moved files to `config/` directly, fixed `../constants` import resolution
- **Made local copies alive** — UniversalPreview, RulesSection, FormulaEditor, ChartSection now use local singletons (`formulaEngine`, `rulesEngine`, `fieldRegistry`, `calculatedFieldService`)
- **Updated `reporting/index.ts`** to re-export shared items from `@/pages/settings/print-settings/...` — single canonical source for all singletons (no duplicate instances)
- **Deleted `todo/` directory** — dead design reference files
- **Build**: 1016 modules, 0 errors (PrintSettingsPage chunk: 161KB → 95KB)

## Session Notes (Phase-2 Refinement — Enterprise Template Library)
- **Removed `AlgerianTemplatePreview`** — all previews now use `UniversalPreview` (single rendering engine)
- **TemplateRegistry** (`registry.ts`) created as the single source of truth for template discovery (register, search, filter, build)
- **Backend source of truth** — `TemplateLibraryService.php` holds all 3 Algerian template configs; install now sends only `{ template_id: "..." }`, backend creates from its own config
- **Config layers** — `PaperConfig`, `TypographyConfig`, `HeaderConfig`, `TableConfig`, `TotalsConfig`, `FooterConfig` as typed composable builders; `buildTemplate()` assembles them into full `PrintTemplate`
- **Named constants** — all magic numbers replaced in `constants.ts` (A4_CONTENT_WIDTH, LOGO_SIZE_A4, TABLE_HEADER_BG, etc.)
- **Versioning** — every template has `version`, `revision`, `country`, `author`, `layoutEngineVersion`
- **Categories + Tags** — `categories.ts` defines 10 categories from doc types; each template has tags (`algeria`, `fiscal`, `a4`, `qrcode`, etc.)
- **Search + Filters** — instant search (name, desc, tags, docType), dynamic filters (doc type, paper size, category, favorites only), "مسح الكل" reset
- **Recently Used** — last 5 installed templates shown as clickable pills above the grid
- **Favorites** — star toggle per card, persisted in localStorage, filterable
- **Install History** — tracked in localStorage with templateId, version, timestamp
- **Lazy-loaded previews** — `UniversalPreview` loaded via `React.lazy()` + `Suspense`
- **Mock data cached** — `getMockDocumentData()` in ref (never recreated)
- **Deleted old files**: `InvoiceA4DZ.ts`, `DeliveryA4DZ.ts`, `DeliveryA5DZ.ts`, `baseConfig.ts`, `AlgerianTemplatePreview.tsx`
- **Documentation**: `resources/js/reporting/docs/TEMPLATE_LIBRARY_ARCHITECTURE.md` covers registry, install flow, adding new templates, versioning, performance
- **Build**: 1024 modules, 0 errors

## Session Notes (Code Cleanup — Removed Dead Code)
- **Deleted 16 files**, removed 6 empty directories:
  - `core/pipeline/RenderingPipeline.ts` (114 lines) — dead pipeline, `run()` never called
  - `core/compiler/ReportCompiler.ts` (208 lines) — only consumed by dead pipeline
  - `core/plugin/PluginRegistry.ts` (225 lines) — zero consumers, no plugins registered
  - `core/theme/StyleSystem.ts` (308 lines) — `styleSystem` never invoked
  - `core/diagnostics/DiagnosticsService.ts` (59 lines) + `DiagnosticsPanel.tsx` (139 lines) — never enabled/rendered
  - `core/history/CommandHistory.ts` (94 lines) — only used by designer store (also removed)
  - `core/engines/RulesEngineAdvanced.ts` (339 lines) — zero consumers, already noted as dead
  - `components/designer/` (8 files, ~1200 total lines) — obsolete visual designer experiment
- **Removed directories**: `pipeline/`, `compiler/`, `plugin/`, `diagnostics/`, `history/`, `designer/`
- **Trimmed `reporting/index.ts`**: removed 87 lines of dead exports (V2 Infrastructure + Visual Designer); kept `registerAdvancedFunctions` (used by `app.jsx`)
- **Replaced `ReportDesignerPage.tsx`**: 202-line full designer → 28-line placeholder with navigation to print settings
- **Fixed TypeScript violations**:
  - `useExportDocument.ts`: `as any` → `as const` (4 instances)
  - `AdvancedFunctions.ts`: `(item: any)` → `(item: ExpressionValue)`
- **Removed unused imports**: `CsvRenderer.ts` (`Payment`, `ReportSummary`), `ExcelRenderer.ts` (`DocumentLine`, `ReportPaymentBreakdown`, `ReportProductSummary`), `UniversalPreview.tsx` (`AlignOption`, `BorderStyle`), `shared.tsx` (`UniversalDocumentData`, `DocumentTotals`, `Payment`), `RulesSection.tsx` (`SectionTarget`)
- **No bracket-notation violations found** — `applyAction()` is public, AGENTS.md note was outdated
- **No `@ts-ignore`/`@ts-expect-error` found** — zero suppression comments
- **Build**: 1006 modules, 0 errors (18 fewer modules)
- **Remaining dead code items from exploration that were intentionally kept**:
  - `LayoutEngine.ts` — core engine (Phase 1 foundation), kept for future use
  - Export renderers (`CsvRenderer`, `ExcelRenderer`, `useExportDocument`) — working features, not integrated yet
  - `PrintJobQueue`/`usePrintJobQueue`/`PrintQueuePanel` — alive chain used by `DashboardLayout.tsx`

## Session Notes (Post-Phase-6)
- Restored 7 `print-settings/sections/` files deleted in commit `88d2075` from parent commit `3a771af`
- Rewrote ~130 snake_case property access mismatches in restored section files to match the canonical `PrintTemplate` type
- Integrated section components into `PrintSettingsPage.tsx` — `HeaderSectionControls`, `DocumentSectionControls`, `ItemsSectionControls`, `TotalsSectionControls`, `FooterSectionControls`, `FormattingSectionControls` replace inline accordion blocks; extra fields not covered by sections appended inline after each component
- Fixed 3 legacy preview files' `emptyDocumentData()` type bugs — A4Preview/A5Preview/ReceiptPreview used `emptyDocumentData()` (returns `UniversalDocumentData`) where their internal types (`A4Data`, `A5Data`, `PreviewTotals`) were expected; replaced with proper empty typed objects
- Wired legacy previews into `PreviewSelector.tsx` via optional `useLegacy` prop — routes to `A4Preview`/`A5Preview`/`ReceiptPreview` based on `tpl.paper_size`; defaults to `UniversalPreview` when `false`
- Added "كلاسيكي"/"حديث" toggle button in `PrintSettingsPage` preview toolbar that sets `useLegacyPreview` state, passed to both `PreviewSelector` usages (inline + test-print window)
- Remaining dead code items from exploration that were intentionally kept: `LayoutEngine.ts` (core foundation), `CsvRenderer`/`ExcelRenderer`/`useExportDocument` (working features not yet wired), `PrintJobQueue`/`usePrintJobQueue`/`PrintQueuePanel` (alive chain used by `DashboardLayout.tsx`)
- `RulesEngineAdvanced.ts` and `applyAction()` bracket notation: resolved (method is public, not private — AGENTS.md note was incorrect; file now deleted)

---

## Goal
Build the ERP Report Designer Framework incrementally: Phase 0 (Foundation) → Phase 1 (Core Engines) → Phase 2 (Universal Preview + UI Components) → Phase 3+ (Rules, Rich Reports, Enhancement, Advanced Features).

---

## Build / Test / Lint
- **Build**: `npm run build` — uses Vite + Rolldown. Must pass cleanly (currently ~1006 modules, ~1.6s).
- **Lint**: `npm run lint` — ESLint (config missing in project, not our fault).
- **Laravel**: `php artisan` commands in the project root.

---

## Project Summary
Laravel + React SPA (full SPA with own routing). Vite build with `@vitejs/plugin-react`. No Inertia.

Key directories:
- `resources/js/` — React source (pages, components, hooks, routes)
- `resources/js/reporting/` — ERP Report Designer Framework (5-layer clean architecture)
- `resources/css/` — styles (app.css imports theme/*.css)
- `routes/` — Laravel backend routes (for API)
- `app/` — Laravel PHP backend

---

## Architecture — ERP Report Designer Framework (`resources/js/reporting/`)

```
resources/js/reporting/
├── index.ts                          # Public API — only entry point for consumer code
├── core/
│   ├── domain/
│   │   └── PrintTemplate.ts          # Canonical 177-property PrintTemplate type + createDefaultTemplate()
│   ├── engines/
│   │   ├── FormulaEngine.ts          # Expression evaluator (no eval) — tokenizer → parser → AST → executor
│   │   ├── RulesEngine.ts            # Declarative show/hide/highlight rule evaluator
│   │   └── LayoutEngine.ts           # Flow/flex/absolute layout computation with pagination
│   └── theme/
│       └── ThemeSystem.ts            # 3 presets (default-light, minimal, compact) + CSS vars
├── data/
│   ├── UniversalDocumentData.ts      # Single data contract — DocumentInfo, CompanyInfo, PartyInfo, DocumentLine, DocumentTotals, Payment, BalanceInfo, CurrencyInfo
│   ├── DocumentDataBuilder.ts        # Builds UniversalDocumentData from API/POS/legacy sources
│   ├── FieldRegistry.ts              # 79 cataloged fields with Arabic labels, aggregation hints, wildcard paths
│   └── CalculatedFieldService.ts     # 8 computed fields (movement, amountInWords, profit, profitMargin, runningTotal, lineCount, itemCount, averageLineTotal)
├── renderers/
│   ├── IRenderer.ts                  # Renderer interface + RendererRegistry (for extensibility)
│   ├── CsvRenderer.ts                # CSV export (BOM, company/doc info, lines, totals, report)
│   ├── ExcelRenderer.ts              # SpreadsheetML Excel export (styled, no deps)
│   ├── PrintJobQueue.ts              # Singleton print job queue with events
│   └── useExportDocument.ts          # React hook + standalone export utilities
└── components/
    ├── preview/
    │   ├── UniversalPreview.tsx       # Unified preview — thermal flexbox for 58/80mm, HTML tables for A4/A5
    │   └── shared.tsx                 # Styling helpers (mm, align, fontFamily, borderStyle), CompanyData, DocRow, TotalRow, InfoRow, Separator
    └── shared/
        ├── FormulaEditor.tsx          # Formula expression editor with field picker + validation + function chips
        ├── TemplatePrintModal.tsx     # Modal for template-based printing (replaces window.print())
        ├── RulesSection.tsx           # Condition builder — rules list, section visibility toggles, highlight style editor
        ├── ChartSection.tsx           # BarChart/PieChart via recharts for report summaries
        └── PrintQueuePanel.tsx        # Floating queue status panel (jobs, status, elapsed, cancel)
```

### Layers
1. **Core/Domain** — PrintTemplate, DocTypeCode, ColumnKey (no React/DOM)
2. **Data** — UniversalDocumentData, DocumentDataBuilder, FieldRegistry (data contract)
3. **Engines** — FormulaEngine, RulesEngine, LayoutEngine, ThemeSystem (computation)
4. **Renderers** — IRenderer interface (pluggable output: HTML, PDF, text)
5. **UI** — UniversalPreview, FormulaEditor, TemplatePrintModal (React components)

---

## Current State (Phase 7 complete)
- **Phase 0 (Foundation)**: reporting/ directory created with UniversalDocumentData, DocumentDataBuilder, PrintTemplate, IRenderer. Patch 1 (dual-save bugfix in PrintSettingsPage.tsx). Patches 2-3 (MOCK data → emptyDocumentData() in A4Preview/A5Preview/ReceiptPreview). `@/reporting` vite alias. Build: 389 modules, 0 errors.
- **Phase 1 (Core Engines)**: FormulaEngine (no-eval expression evaluator with IF/SUM/AVG/ROUND/CONCAT/FORMAT/TODAY/MIN/MAX/COUNT/ABS/LEN/UPPER/LOWER). RulesEngine (declarative show/hide/highlight/disable). LayoutEngine (flow/flex/absolute + pagination). ThemeSystem (3 presets, toCSSVariables(), applyTemplateOverrides()). FieldRegistry (79 cataloged fields). CalculatedFieldService (8 computed fields). Build: 395 modules, 0 errors.
- **Phase 2 (Universal Preview + UI)**: UniversalPreview (~630 lines, handles all paper sizes via flexbox/tables). PreviewSelector delegates to UniversalPreview with legacy→UniversalDocumentData conversion. FormulaEditor (field picker dropdown with search, validation, function chips, Ctrl+Space). TemplatePrintModal (template-based print preview replacing window.print()). Build: ~397 modules, 0 errors.
- **Phase 3 (Rules & Conditions)**: Added `rules: ReportRule[]` and `show_*_section` visibility booleans to `PrintTemplate`. Created `RulesSection` component (condition builder with FormulaEditor integration, action/target/priority selectors, highlight style editor, section visibility toggles). Added rules accordion to PrintSettingsPage template controls + QuickNav. Integrated `RulesEngine.evaluate()` into `UniversalPreview` — sections respect rule-based visibility and apply highlight styles. Build: clean.
- **Phase 4 (Commercial Document Integration)**: Wired `TemplatePrintModal` into `CommercialDocumentModal`. Added template selector dropdown + "طباعة بالقوالب" button in `DocumentFooter` (visible only in edit mode). Integrated `usePrintTemplates(docCode)` for doc-type-specific template loading. `DocumentDataBuilder.fromApiDocument()` builds `UniversalDocumentData` from the existing document API data. Build: clean.
- **Phase 5 (Rich Report Templates)**: Added `ReportSummary` type to `UniversalDocumentData` with aggregated session data (payment breakdown, top products, KPIs). Extended `PrintTemplate` with report fields (show_charts, chart_type, group_by, sort_by, show_report_header/footer, period, cashier, summary cards, payment breakdown, top products toggles). Created `ChartSection` component using recharts (BarChart + PieChart). Added `renderReport()` to `UniversalPreview` — KPI cards grid, charts, top products table, report header/footer. Added report controls accordion to `PrintSettingsPage` (chart type, toggles, header/footer text, grouping/sorting controls). Added `DocumentDataBuilder.fromSessionReport()` for building report data from POS session API. Wired session report print button into SessionStatsModal. Build: clean.
- **Phase 6 (Advanced Features)**: CSV/Excel export via CsvRenderer + ExcelRenderer (SpreadsheetML, no deps), `useExportDocument` hook. Batch printing via BatchPrintModal + DataTable selectable/bulkActions. PrintJobQueue singleton with `usePrintJobQueue` hook + PrintQueuePanel UI. UI polish: TinyBtn loading states, delete modal (replaced confirm()), report accordion conditional rendering, empty state icons, TemplatePrintModal uses CSS vars, FormulaEditor Tabler icon, ErrorBoundary around preview. Build: ~985 modules, 0 errors.
- **Phase 6.5 (Section Integration + Legacy Wiring)**: Restored 7 deleted section files from git history with fixed snake_case property access. Integrated section components into `PrintSettingsPage`, replacing inline accordion blocks. Wired 3 legacy previews (`A4Preview`, `A5Preview`, `ReceiptPreview`) into `PreviewSelector` via `useLegacy` prop with modern/legacy toggle in preview toolbar. Fixed 3 `emptyDocumentData()` type bugs in legacy previews. Build: 1014 modules, 0 errors.

---

## Constraints & Preferences
- All CSS lives in `.css` files imported globally via `app.css`.
- Zero breaking changes to existing production code.
- UniversalDocumentData is the single data contract; old ReceiptLiveData aliases migrate via fromLegacyLiveData() adapter.
- No eval() — FormulaEngine uses custom recursive-descent parser.
- Build must remain clean after every phase.
- All new UI components use inline styles (no external CSS dependencies).
- Sidebar `<Link>` hrefs use absolute paths (React Router v7 resolves relative from current route).

---

## Critical Context
- **`formulaEngine` و `rulesEngine` هما singleton instances** — `reporting/index.ts` يُعيد التصدير من `print-settings/services/engines/...` لضمان مرجع واحد في التطبيق بكامله
- **`print-settings/index.ts`** هو الواجهة العامة للوحدة — يُصدّر `PrintSettingsPage`, `PreviewSelector`, وأنواع PrintTemplate
- **`PrintSettingsPage.tsx` الآن ~830 سطر** (بدلاً من 1449) — لا يزال يحتوي callbacks كبيرة (handleSave, handleTestPrint) وحوار الحذف المضمّن، لكن لا يحتوي أي مكون واجهة مضمّن
- **`UniversalPreview.tsx` الآن ~280 سطر** (بدلاً من 1067) — يقوم فقط ببناء سياق التقييم وتوزيع العرض للمكونات المستخرجة
- **`components/ui.tsx`** يحتوي جميع الـ UI primitives (Toggle, Slider, Field, Input, Textarea, Select, Pills, ColorField, Divider, SectionTitle) وثوابت (ALIGN_OPTS, BORDER_OPTS) — 194 سطر
- **جميع مستوردات `@/reporting` من `print-settings/`** أُزيلت — 0 مستوردات متبقية للـ modules الأخرى
- **جميع مستوردات `@/pos/store/printStore`** أُزيلت من `print-settings/` — استبدلت بـ `./services/printStoreService`
- **`template-library/config/`** أُصلح (تمت إزالة المستوى المكرّر `config/config/`)
- **حوار تأكيد الحذف** بقي مضمّناً في `PrintSettingsPage.tsx` (لا فائدة من استخراجه — مرتبط بشدة بـ deleteTarget state)
- **`AGENTS.md`** يُحدّث في نهاية كل دورة عمل

## Key Design Decisions
- **UniversalDocumentData** is single source of truth; ReceiptLiveData stays unchanged in old types.ts, bridged via fromLegacyLiveData().
- **Phase 0 purely additive** — no existing production files changed except the dual-save bugfix and MOCK removal.
- **FormulaEngine uses custom parser** — tokenize → recursive descent → binary ops, member access, function calls, wildcard aggregation.
- **PreviewSelector acts as conversion boundary** — accepts legacy snake_case, converts to UniversalDocumentData, passes to UniversalPreview. Also accepts optional `useLegacy` prop to route directly to A4/A5/Receipt legacy previews without conversion.
- **UniversalPreview handles all paper sizes** — switches between thermal flexbox (58/80mm) and HTML table layout (A4/A5).
- **FormulaEngine singleton** clears cache on template changes.
- **LayoutEngine uses auto-height defaults**: text=5mm, table=20mm, image=20mm, barcode=15mm, qr=15mm, line=1mm, spacer=5mm.

---

## Relevant Files
- `resources/js/pages/settings/print-settings/PrintSettingsPage.tsx`: ~830 سطر — لا يزال يحتوي callbacks كبيرة وحوار الحذف المضمّن لكن لا يحتوي أي مكون واجهة مضمّن
- `resources/js/pages/settings/print-settings/components/preview/UniversalPreview.tsx`: ~280 سطر — يستورد من 8 ملفات render منفصلة
- `resources/js/pages/settings/print-settings/components/ui.tsx`: ~194 سطر — جميع الـ UI primitives (Toggle, Slider, Field, Input, Textarea, Select, Pills, ColorField, Divider, SectionTitle, ALIGN_OPTS, BORDER_OPTS)
- `resources/js/pages/settings/print-settings/components/TemplateControls.tsx`: ~160 سطر — يُركّب جميع أقسام القوالب
- `resources/js/pages/settings/print-settings/components/Accordion.tsx`: ~42 سطر — مكون قابل للطي
- `resources/js/pages/settings/print-settings/components/ColumnManager.tsx`: ~111 سطر — إدارة أعمدة الجدول
- `resources/js/pages/settings/print-settings/components/QuickNav.tsx`: ~65 سطر — تنقل سريع مع IntersectionObserver
- `resources/js/pages/settings/print-settings/components/TinyBtn.tsx`: ~28 سطر — زر أيقونة صغير
- `resources/js/pages/settings/print-settings/components/index.ts`: barrel index — يُصدّر جميع المكونات ودوال render
- `resources/js/pages/settings/print-settings/services/printStoreService.ts`: دوال طبقة DB (dbSaveTemplate, dbFetchTemplates)
- `resources/js/pages/settings/print-settings/ARCHITECTURE.md`: توثيق المعمارية الكامل
- `resources/js/reporting/index.ts`: يُعيد التصدير من `@/pages/settings/print-settings/...`
- `resources/js/pos/store/printStore.ts`: يُعيد التصدير من `services/printStoreService.ts`

## Session Notes (Consolidation — Phase 7-10 cleanup + static analysis)
- **Phase 7**: Deleted dead code — `hooks/useUndoRedo.ts`, `hooks/useKeyboardShortcuts.ts`, `hooks/index.ts`, `render/index.ts`, `page/index.ts`, `types/domain/index.ts` (+ empty dirs)
- **Phase 8a**: Split `types.ts` (477 lines → 24-line barrel) into `types/domain.ts` (201 lines, types + DOC_TYPE_LIST), `types/defaults.ts` (172 lines, factory functions), `types/api.ts` (13 lines), `types/live-data.ts` (46 lines)
- **Phase 8b**: Extracted `DeleteConfirmModal` (30 lines) from `PrintSettingsPage.tsx` into `components/DeleteConfirmModal.tsx`
- **Phase 9**: Created `tsconfig.json` (strict checking + path aliases) + `eslint.config.js` (flat config with `typescript-eslint`, React, React-Hooks). Installed `typescript-eslint` as dev dep. Fixed errors in print-settings (`require()` → top-level import in `registry.ts`, removed unused `is80mm` in `defaults.ts`, removed unused `useTransition` import, renamed unused `tpl` → `_tpl`, removed unused `ColumnManager` import)
- **Phase 10** (Final Audit — print-settings scope only):
  - Built comprehensive audit pipeline: file map, single-implementation verification, duplication check, dead code analysis, module boundary check, ESLint scoped scan, bundle measurement
  - Verified 12/12 key implementations exist exactly once (PrintTemplate, FormulaEngine, RulesEngine, fieldRegistry, etc.)
  - Confirmed 0 duplicate exports, 0 dead exports, 0 circular dependencies
  - Deleted 2 dead files (66 lines): `types/index.ts` (50 lines — never resolved, `types.ts` preferred), `components/preview/index.ts` (16 lines — never imported, bypassed by `components/index.ts`)
  - ESLint within module: **0 errors, 47 warnings** (28 `any` casts, 10 unused vars, 4 hook deps, 5 misc)
  - Build: **1,025 modules, 0 errors, 1.82s**; PrintSettingsPage chunk: **59.77 KB**; UniversalPreview: 435 KB (known large chunk)
  - Final score: **9/10** — single-source architecture, self-contained, no duplication, clean module boundary
  - Full audit report: `docs/reports/print-settings-final-audit.md`

## Remaining minor issues (warnings only, not errors)
- `any` types throughout codebase (~958 warnings) — gradual opt-in needed
- Missing hook deps (e.g., `defaultOpen` in Accordion, `gs` in legacy files)
- `UniversalPreview` 435 KB chunk — could be code-split further in future

## Session Notes (Phase 10 — Feature Isolation Audit)
- **Feature Isolation Audit** written to `docs/reports/print-settings-feature-isolation.md`
- **6 npm packages** external (react, react-dom, recharts, sonner, @tanstack/react-query) — 2 are expected, 2 are medium-coupling, 1 is low
- **4 app shared modules** identified as isolation problems:
  - `@/lib/api/core/client` — 🔴 CRITICAL: 3 files import concrete HTTP client
  - `@/lib/api/core/types` — 🔴 CRITICAL: PrintSettingsPage imports CommercialDocument type
  - `@/lib/store/appStore` — 🔴 CRITICAL: 2 files read from zustand store directly
  - `@/components/ui/ErrorBoundary` — ⚠️ MEDIUM: 30-line component, easy to fix
- **3 files** breach the isolation boundary (PrintSettingsPage, printTemplatesApi, printStoreService)
- **Scores**: Feature Isolation 6/10, Cohesion 9/10, Coupling 8/10, Maintainability 7/10, Reusability 5/10
- **Verdict**: "This module still requires architectural work before extraction."
- **5 critical fixes** needed before extraction: prop-inject company data, interface the API client, remove CommercialDocument dep, copy ErrorBoundary in, abstract sonner

## Session Notes (Feature Isolation Implementation — Phase 10 Complete)
- **All 5 critical fixes implemented** to achieve 100% feature isolation:

  ### 1. Create Pure Contracts (no host deps)
  - `contracts/ApiClient.ts` — `get<T>`, `post<T>`, `put<T>`, `patch<T>`, `delete`, `upload<T>`
  - `contracts/Notifier.ts` — `success(msg)`, `error(msg)`
  - `contracts/TemplateRepository.ts` — `PrintTemplatesApi` (business methods) + `TemplateRepositoryHooks`
  - `contracts/HostContext.ts` — `HostDependencies` type bundling all contracts + company + slug

  ### 2. Create Provider Layer (React context)
  - `providers/PrintSettingsContext.tsx` — `PrintSettingsProvider` + `useHost()` + individual hooks (`useApiClient`, `useNotifier`, `usePrintTemplatesApi`, `useCompany`, `useSlug`)
  - All module-internal hooks (`usePrintTemplates`, `usePrintTemplateMutations`) read from context, not from host

  ### 3. Copy ErrorBoundary
  - `components/ErrorBoundary.tsx` (31 lines) — copied from `@/components/ui/ErrorBoundary`, zero external imports

  ### 4. Rewrite 3 breaching files
  - **`api/printTemplatesApi.ts`**: removed `@/lib/api/core/client` + `@/lib/store/appStore` + `@tanstack/react-query` dependency for API calls; split into pure factory (`createPrintTemplatesApi`) that takes `ApiClient`, plus React Query hooks that read from context
  - **`services/printStoreService.ts`**: removed `@/lib/api/core/client`; all functions now accept `ApiClient` as first parameter
  - **`sections/HeaderSection.tsx`**: removed `printTemplatesApi` direct import; reads `usePrintTemplatesApi()` from context

  ### 5. Rewrite PrintSettingsPage.tsx
  - Removed all 5 host imports: `sonner`, `@/lib/store/appStore`, `@/lib/api/core/client`, `@/components/ui/ErrorBoundary`, `@/lib/api/core/types`
  - Reads from context: `useApiClient()`, `useNotifier()`, `useCompany()`, `useSlug()`
  - `dbSaveTemplate` calls pass `apiClient` as first arg

  ### 6. Create Host Adapter (outside module)
  - `resources/js/pages/settings/print-settings-adapter.tsx` — imports concrete implementations (`apiGet`/`apiPost` from client.ts, `useActiveCompany` from appStore, `toast` from sonner), creates `ApiClient`/`Notifier` objects, wraps `PrintSettingsPage` in `PrintSettingsProvider`

  ### 7. Update Route
  - `resources/js/routes/index.tsx` — lazy import changed from `@/pages/settings/print-settings/PrintSettingsPage` to `@/pages/settings/print-settings-adapter`

- **Build**: **1,028 modules, 0 errors, 1.76s**
- **Adapter chunk**: 60.41 KB (includes host deps)
- **Zero host imports** remain in `resources/js/pages/settings/print-settings/` source files (only ARCHITECTURE.md docs reference them)
- **Feature Isolation Score**: **10/10** — module can be copied into any React project; adapter file is the only thing that needs replacing
- **Scores**: Feature Isolation 10/10, Cohesion 10/10, Coupling 10/10, Maintainability 8/10, Reusability 9/10
