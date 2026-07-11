# Print-Settings Module Architecture

## Overview

`print-settings/` is a **self-contained feature module** for ERP document template management. It handles creating, editing, previewing, saving, exporting/importing, and installing print templates for all document types (invoices, deliveries, quotes, receipts, etc.).

The module is split into two bounded contexts:
- **Print Designer** — edit, save, manage templates (requires `PrintSettingsContext`)
- **Print Runtime** — load, resolve, render, print (minimal context, independent of designer)

## Directory Structure

```
print-settings/
├── index.ts                              # Public API — exports Page + PreviewSelector + types
├── ARCHITECTURE.md                       # This file
├── types.ts                              # Barrel shim → types/ subdirectory
├── PrintSettingsPage.tsx                  # Main page orchestrator (~740 lines)
│
├── types/                                # Domain + data types
│   ├── domain.ts                         #   PrintTemplate (144+ fields), DocTypeCode, PaperSize, etc.
│   ├── api.ts                            #   PrintTemplateApiResponse
│   ├── live-data.ts                      #   CompanyData, DocumentPrintConfig, DetectedPrinter
│   └── data/
│       ├── index.ts                      #   Re-exports UniversalDocumentData + DocumentDataBuilder
│       ├── UniversalDocumentData.ts      #   Single data contract (15 sub-interfaces, 319 lines)
│       └── DocumentDataBuilder.ts        #   Builds from API/POS/Session sources (552 lines)
│
├── services/                             # Business logic services
│   ├── index.ts                          #   Barrel (8 exports)
│   ├── SettingsRegistry.ts               #   144+ settings metadata (SettingMeta interface)
│   ├── SettingsSerializer.ts             #   toApiPayload / fromApiResponse (symmetric)
│   ├── PropertyVisibilityService.ts      #   Visibility facade over SettingsRegistry
│   ├── PrintFieldRegistry.ts             #   60+ canonical field IDs with metadata
│   ├── PrintFieldResolver.ts             #   Canonical field access layer (ALL renderers use this)
│   ├── FieldRegistry.ts                  #   79 cataloged fields with Arabic labels
│   ├── CalculatedFieldService.ts         #   8 computed fields
│   ├── printStoreService.ts              #   DB layer — save/fetch templates from backend
│   └── engines/
│       ├── index.ts                      #   Barrel
│       ├── FormulaEngine.ts              #   Expression evaluator (no eval, custom parser)
│       └── RulesEngine.ts                #   Declarative show/hide/highlight rules
│
├── sections/                             # Editor control sections (no barrel)
│   ├── HeaderSection.tsx
│   ├── DocumentSection.tsx
│   ├── ItemsSection.tsx
│   ├── TotalsSection.tsx
│   ├── PaymentsSection.tsx               #   Extracted from TotalsSection (Phase 11)
│   ├── FooterSection.tsx
│   ├── FormattingSection.tsx             #   Thermal/page-aware split
│   └── ToggleSwitch.tsx                  #   Section toggle primitives
│
├── components/                           # UI components
│   ├── ui.tsx                            #   UI primitives (Toggle, Slider, Field, Input, etc.)
│   ├── Accordion.tsx
│   ├── ChartSection.tsx
│   ├── ColumnManager.tsx
│   ├── DeleteConfirmModal.tsx
│   ├── ErrorBoundary.tsx
│   ├── FormulaEditor.tsx
│   ├── ImagePreviewModal.tsx
│   ├── PreviewSelector.tsx               #   Routes to UniversalPreview or legacy previews
│   ├── QuickNav.tsx                      #   Sticky section navigation (IntersectionObserver)
│   ├── RulesSection.tsx                  #   Condition builder
│   ├── TemplateControls.tsx             #   Main template control composer
│   ├── TinyBtn.tsx
│   ├── shared/
│   │   ├── PrintQueuePanel.tsx
│   │   └── TemplatePrintModal.tsx        #   Pure component (receives templates as props)
│   └── preview/                          #   Preview renderers
│       ├── UniversalPreview.tsx          #   Main orchestrator (132 lines)
│       ├── shared.tsx                    #   Shared helpers (mm, align, SectionWrap, etc.)
│       ├── HeaderSection.tsx             #   Uses printFieldResolver.resolve()
│       ├── DocInfoSection.tsx            #   Uses printFieldResolver.resolve()
│       ├── ItemsSection.tsx              #   Uses printFieldResolver.resolveItemField()
│       ├── TotalsSection.tsx             #   Uses printFieldResolver.resolve()
│       ├── PaymentsSection.tsx           #   Uses printFieldResolver.resolve()
│       ├── FooterSection.tsx
│       ├── LogoRenderer.tsx              #   Accepts data (not company), resolves internally
│       └── ReportSection.tsx             #   Report rendering (KPI cards, charts, top products)
│
├── runtime/                              # Print Runtime (designer-independent)
│   ├── index.ts                          #   Barrel (24 lines, 10 exports)
│   ├── PrintRuntimeContext.tsx            #   Minimal context: { templateRepository, slug, company }
│   ├── PrintRuntimeAdapter.tsx           #   Bridge to host (ONLY file importing apiGet/useActiveSlug)
│   ├── usePrintTemplatesList.ts          #   Runtime hook for loading templates by doc type
│   ├── TemplateResolver.ts               #   Pure: resolveTemplate(), resolveTemplateById()
│   ├── UniversalPrintPipeline.tsx         #   Orchestrator: source → data → render
│   └── renderPreviewToHtml.ts            #   Server-side HTML string rendering
│
├── providers/
│   └── PrintSettingsContext.tsx           #   Designer context (undo/redo, notifier, full repo)
│
├── api/
│   └── printTemplatesApi.ts              #   React Query hooks for template CRUD
│
├── contracts/                            # Interface contracts
│   ├── ApiClient.ts
│   ├── HostContext.ts
│   ├── Notifier.ts
│   └── TemplateRepository.ts
│
├── renderers/                            # Export renderers
│   ├── IRenderer.ts
│   ├── CsvRenderer.ts
│   ├── ExcelRenderer.ts
│   ├── PrintJobQueue.ts
│   ├── useExportDocument.ts
│   └── usePrintJobQueue.ts
│
├── engines/                              # Standalone engines
│   ├── AdvancedFunctions.ts
│   └── LayoutEngine.ts
│
├── template-library/                     # Template library (install/search/filter)
│   ├── index.ts
│   ├── types.ts
│   ├── constants.ts
│   ├── categories.ts
│   ├── mockData.ts
│   ├── registry.ts
│   ├── TemplateLibraryModal.tsx
│   └── config/
│       ├── index.ts
│       ├── PaperConfig.ts
│       ├── TypographyConfig.ts
│       ├── HeaderConfig.ts
│       ├── TableConfig.ts
│       ├── TotalsConfig.ts
│       └── FooterConfig.ts
│
├── theme/
│   └── ThemeSystem.ts
│
├── utils/
│   ├── index.ts
│   └── numberToArabic.ts                 #   Number-to-Arabic-words converter
│
└── __tests__/
    ├── visibility-engine.spec.ts          #   51 Vitest tests
    ├── serializer.spec.ts                 #   18 Vitest tests
    ├── registry-validation.spec.ts        #   19 Vitest tests
    ├── visibility.pw.spec.ts              #   4 Playwright browser tests
    ├── lifecycle.pw.spec.ts               #   3 Playwright browser tests
    ├── fixtures/
    │   ├── templates.ts
    │   └── expanded-registry.ts
    └── helpers/
        └── test-utils.ts
```

## Architecture Principles

### 1. Self-Containment
- All code for print template management lives inside `print-settings/`
- External imports are limited to 4 shared infrastructure paths:
  - `@/lib/api/core/client` (HTTP client)
  - `@/lib/store/appStore` (active company/slug)
  - `@/components/ui/ErrorBoundary`
  - `@/lib/api/core/types` (type-only)
- No imports from `@/pos`, `@/pages`, or other page modules

### 2. Two Bounded Contexts

| Context | Entry Point | Purpose | Dependencies |
|---------|-------------|---------|-------------|
| **Print Designer** | `PrintSettingsPage.tsx` | Edit, save, manage templates | `PrintSettingsContext` (undo/redo, notifier, full repository) |
| **Print Runtime** | `runtime/index.ts` | Load, resolve, render, print | `RuntimeContext` (templateRepository + slug + company only) |

The runtime is the **only** path used by POS, document modals, and batch printing. The designer is only mounted on the Settings page.

### 3. Single Source of Truth for Fields

**PrintFieldRegistry** defines 60+ canonical field IDs. **PrintFieldResolver** is the **only** access layer — every renderer calls `printFieldResolver.resolve(fieldId, data, template)` instead of raw property access. This guarantees:
- Template overrides (e.g., `company_name_text` overrides `company.name`)
- Computed fields (`item.tvaPct`, `item.index`, `amountInWords`)
- Null-safe dot-path traversal
- Consistent field access across all 10+ renderers

### 4. Settings as Metadata

**SettingsRegistry** defines 144+ settings with metadata: key, label, category, component type, default value, supported papers/docs, `dependsOn` dependencies, and `field` linkage to PrintFieldRegistry. This enables:
- Automatic UI generation from metadata
- Visibility engine (`PropertyVisibilityService`) gating controls by paper/doc type
- Symmetric serialization (`SettingsSerializer`) for save/load
- Auto-generated test suites (88+ tests from registry)

### 5. Data Flow
```
User action → PrintSettingsPage state → tpl object → UniversalPreview → Section components
                                                          ↕
                                              printFieldResolver.resolve(fieldId, data, tpl)
                                                          ↕
                                              rulesEngine.evaluate(tpl.rules, data)
```

### 6. Print Pipeline
```
POSPage → usePrintSettings(template) → renderPreviewToHtml() → browser print
            OR
         → printThermalViaWebUSBFromTemplate() → WebUSB ESC/POS
            OR
         → DocumentDataBuilder.fromPOSSnapshot() → UniversalPrintPipeline → UniversalPreview
```

## Key Components

| Component | File | Purpose |
|-----------|------|---------|
| PrintSettingsPage | `PrintSettingsPage.tsx` | 3-column layout: doc type selector, template controls, live preview |
| UniversalPreview | `components/preview/UniversalPreview.tsx` | Dispatches to paper-specific renderers |
| PreviewSelector | `components/PreviewSelector.tsx` | Routes to UniversalPreview or legacy A4/A5 previews |
| TemplateControls | `components/TemplateControls.tsx` | Composes all 7 section editors + section toggles |
| FormulaEditor | `components/FormulaEditor.tsx` | Expression editor with field picker + validation |
| TemplateLibraryModal | `template-library/TemplateLibraryModal.tsx` | Browse/search/install templates |
| RulesSection | `components/RulesSection.tsx` | Condition builder for show/hide/highlight |
| ChartSection | `components/ChartSection.tsx` | Chart rendering for report summaries |
| UniversalPrintPipeline | `runtime/UniversalPrintPipeline.tsx` | source → data → render orchestrator |

## Key Services

| Service | File | Purpose |
|---------|------|---------|
| SettingsRegistry | `services/SettingsRegistry.ts` | 144+ setting definitions with metadata |
| SettingsSerializer | `services/SettingsSerializer.ts` | Symmetric `toApiPayload()` / `fromApiResponse()` |
| PropertyVisibilityService | `services/PropertyVisibilityService.ts` | Facade: `isSettingVisible(key, paper, docType)` |
| PrintFieldRegistry | `services/PrintFieldRegistry.ts` | 60+ canonical field definitions |
| PrintFieldResolver | `services/PrintFieldResolver.ts` | Canonical field access: `resolve(fieldId, data, tpl)` |
| FormulaEngine | `services/engines/FormulaEngine.ts` | Expression evaluator (no `eval`) |
| RulesEngine | `services/engines/RulesEngine.ts` | Declarative rule evaluation |
| DocumentDataBuilder | `types/data/DocumentDataBuilder.ts` | Builds `UniversalDocumentData` from API/POS/Session |

## Runtime Architecture

The runtime layer (`runtime/`) is the only path used outside the designer:

```
POSPage / CommercialDocumentModal / BatchPrintModal
    ↓
PrintRuntimeAdapter (bridge: imports apiGet, useActiveSlug)
    ↓
RuntimeProvider { templateRepository, slug, company }
    ↓
usePrintTemplatesList(docTypeCode) → resolveTemplate() → UniversalPrintPipeline
    ↓
DocumentDataBuilder.fromPOSSnapshot() → UniversalPreview → HTML/ESC-POS
```

`PrintRuntimeAdapter` is the **only** file in the runtime that imports global modules. All runtime hooks depend solely on `RuntimeContext`.

## External Dependencies

Only 4 shared infrastructure imports:
- `@/lib/api/core/client`: `apiGet`, `apiPost`, `apiPut`, `apiDelete`, `apiUpload`, `apiPatch`
- `@/lib/store/appStore`: `useActiveCompany`, `useActiveSlug`
- `@/components/ui/ErrorBoundary`
- `@/lib/api/core/types`: `CommercialDocument` (type only)

## PrintTemplate Schema (144+ fields)

Organized into logical groups in `types/domain.ts`:

| Group | Fields | Purpose |
|-------|--------|---------|
| Metadata | `id`, `name`, `doc_type_code`, `paper_size`, `is_default`, `is_active` | Identity and routing |
| Paper/Layout | `paper_width_mm`, margins, `line_spacing`, `base_font_size`, `font_family` | Page geometry |
| Logo | `show_logo`, `logo_source`, `logo_size`, `logo_align`, `custom_logo_url` | Company logo |
| Company Info | `show_company_name/address/phone/tax_id/rc/nis/ice`, `override_*` | Company details |
| Document Info | `title_text/size/bold/align/color`, `show_doc_number/date/time/client` | Document metadata |
| Columns | `col_order`, `col_show`, `col_widths`, `col_headers`, `col_aligns` | Table columns |
| Items | `items_font_size`, `table_header_*`, `alternating_rows`, `price_display` | Line items |
| Totals | `show_total_ht/tva/discount/fiscal_stamp/ttc`, `show_amount_in_words` | Totals section |
| Payments | `show_payment_details`, `payment_font_size` | Payment details |
| Footer | `footer_line1/2/3`, `show_thank_you`, `show_returns_policy` | Footer content |
| Barcode/QR | `show_barcode`, `barcode_content/custom_text`, `show_qr`, `qr_content` | Machine-readable |
| Signatures | `show_cashier_signature`, `show_client_signature`, `show_stamp` | Signature areas |
| Section Visibility | `show_header/doc_info/items/totals/payments/footer_section` | Section toggles |
| Rules/Report | `rules: ReportRule[]`, `chart_type`, `group_by`, `show_report_*` | Report features |

## Test Coverage

| File | Tests | Coverage |
|------|-------|----------|
| `registry-validation.spec.ts` | 19 | Structural validation of all 144 settings |
| `serializer.spec.ts` | 18 | normalizeTemplate, toApiPayload, fromApiResponse, round-trip |
| `visibility-engine.spec.ts` | 51 | All 48 doc×paper combos + dependsOn gating |
| `visibility.pw.spec.ts` | 4 | Page-level visibility assertions (Playwright) |
| `lifecycle.pw.spec.ts` | 3 | Save/reload, template selector (Playwright) |

Tests auto-generate from `SETTINGS_REGISTRY` — adding a setting automatically includes it in all tests.

## Build

```bash
npm run build  # 1053 modules, 0 errors (print-settings-adapter chunk: ~104KB)
npm test       # 159/159 tests pass (includes 88 print-settings tests)
```
