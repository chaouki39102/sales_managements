# AGENTS.md — Context Cache for AI Coding Agents

## Date
2026-06-27

## Session Notes (Post-Phase-6)
- Restored 7 `print-settings/sections/` files deleted in commit `88d2075` from parent commit `3a771af`
- Rewrote ~130 snake_case property access mismatches in restored section files to match the canonical `PrintTemplate` type
- Integrated section components into `PrintSettingsPage.tsx` — `HeaderSectionControls`, `DocumentSectionControls`, `ItemsSectionControls`, `TotalsSectionControls`, `FooterSectionControls`, `FormattingSectionControls` replace inline accordion blocks; extra fields not covered by sections appended inline after each component
- Fixed 3 legacy preview files' `emptyDocumentData()` type bugs — A4Preview/A5Preview/ReceiptPreview used `emptyDocumentData()` (returns `UniversalDocumentData`) where their internal types (`A4Data`, `A5Data`, `PreviewTotals`) were expected; replaced with proper empty typed objects
- Wired legacy previews into `PreviewSelector.tsx` via optional `useLegacy` prop — routes to `A4Preview`/`A5Preview`/`ReceiptPreview` based on `tpl.paper_size`; defaults to `UniversalPreview` when `false`
- Added "كلاسيكي"/"حديث" toggle button in `PrintSettingsPage` preview toolbar that sets `useLegacyPreview` state, passed to both `PreviewSelector` usages (inline + test-print window)
- Remaining dead code: `RulesEngineAdvanced.ts` — uses private `rulesEngine['applyAction']()` bracket notation, nested/else rules not wired

---

## Goal
Build the ERP Report Designer Framework incrementally: Phase 0 (Foundation) → Phase 1 (Core Engines) → Phase 2 (Universal Preview + UI Components) → Phase 3+ (Rules, Rich Reports, Enhancement, Advanced Features).

---

## Build / Test / Lint
- **Build**: `npm run build` — uses Vite + Rolldown. Must pass cleanly (currently ~1014 modules, ~2.5s).
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

## Current State (Phase 6 complete)
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
- `docs/erp_report_designer_adr.html`: full architecture document
- `resources/js/reporting/index.ts`: framework public API
- `resources/js/reporting/core/domain/PrintTemplate.ts`: canonical type
- `resources/js/reporting/data/UniversalDocumentData.ts`: single data contract
- `resources/js/reporting/data/DocumentDataBuilder.ts`: builds from API/POS
- `resources/js/reporting/core/engines/FormulaEngine.ts`: expression evaluator
- `resources/js/reporting/core/engines/RulesEngine.ts`: condition evaluator
- `resources/js/reporting/core/engines/LayoutEngine.ts`: layout computation
- `resources/js/reporting/core/theme/ThemeSystem.ts`: theme presets + CSS vars
- `resources/js/reporting/data/FieldRegistry.ts`: 79 cataloged fields
- `resources/js/reporting/data/CalculatedFieldService.ts`: 8 computed fields
- `resources/js/reporting/renderers/IRenderer.ts`: renderer interface + registry
- `resources/js/reporting/components/preview/UniversalPreview.tsx`: unified preview (~630 lines)
- `resources/js/reporting/components/preview/shared.tsx`: shared helpers
- `resources/js/reporting/components/shared/FormulaEditor.tsx`: formula editor with field picker
- `resources/js/reporting/components/shared/TemplatePrintModal.tsx`: template-based print
- `resources/js/reporting/components/shared/RulesSection.tsx`: condition builder with rules UI
- `resources/js/pages/settings/print-settings/components/PreviewSelector.tsx`: delegates to UniversalPreview or legacy A4/A5/Receipt previews via `useLegacy` prop
- `resources/js/pages/settings/PrintSettingsPage.tsx`: section-integrated template controls; modern/legacy preview toggle
- `resources/js/pages/settings/print-settings/sections/ToggleSwitch.tsx`: restored — base accordion/toggle primitives
- `resources/js/pages/settings/print-settings/sections/HeaderSection.tsx`: restored — logo, company, info visibility controls
- `resources/js/pages/settings/print-settings/sections/DocumentSection.tsx`: restored — title, doc fields, client, separator
- `resources/js/pages/settings/print-settings/sections/ItemsSection.tsx`: restored — column manager, table formatting
- `resources/js/pages/settings/print-settings/sections/TotalsSection.tsx`: restored — totals visibility, TTC, payments
- `resources/js/pages/settings/print-settings/sections/FooterSection.tsx`: restored — footer lines, barcode, signatures
- `resources/js/pages/settings/print-settings/sections/FormattingSection.tsx`: restored — margins, spacing, fonts
- `resources/js/pages/settings/print-settings/A4Preview.tsx`, `A5Preview.tsx`, `components/ReceiptPreview.tsx`: wired via `PreviewSelector.useLegacy`; type bugs fixed
- `resources/js/pages/documents/CommercialDocumentModal/`: target for Phase 4 wiring
- `resources/css/theme/print-settings.css`: print settings page styles
