# Print-Settings Module Architecture

## Overview

`print-settings/` is a **fully self-contained feature module** for ERP document template management. It handles creating, editing, previewing, saving, exporting/importing, and installing print templates for all document types (invoices, deliveries, quotes, receipts, etc.).

## Directory Structure

```
print-settings/
├── index.ts                          # Public API — consumers import ONLY from here
├── ARCHITECTURE.md                   # This file
├── AGENTS.md                         # AI agent context cache
│
├── page/                             # Page-level orchestrator
│   └── index.ts                      #   Re-exports PrintSettingsPage
│
├── PrintSettingsPage.tsx             # Main page (orchestrator, ~740 lines of logic)
│
├── types.ts                          # Canonical PrintTemplate type + createDefaultTemplate()
├── types/
│   ├── index.ts                      # Re-exports from root types.ts + data/
│   ├── domain/
│   │   └── index.ts                  # Re-exports domain types
│   └── data/
│       ├── index.ts                  # Re-exports UniversalDocumentData + DocumentDataBuilder
│       ├── UniversalDocumentData.ts  # Single data contract (no imports)
│       └── DocumentDataBuilder.ts    # Builds from API/POS/legacy sources
│
├── services/
│   ├── index.ts                      # Barrel exports all services
│   ├── FieldRegistry.ts              # 79 cataloged fields with Arabic labels
│   ├── CalculatedFieldService.ts     # 8 computed fields
│   ├── printStoreService.ts          # DB layer — save/fetch templates from backend
│   └── engines/
│       ├── index.ts                  # Barrel exports engines
│       ├── FormulaEngine.ts          # Expression evaluator (no eval, custom parser)
│       └── RulesEngine.ts            # Declarative show/hide/highlight rules
│
├── hooks/
│   ├── index.ts                      # Barrel exports hooks
│   ├── useUndoRedo.ts               # Stack-based undo/redo (60 steps)
│   └── useKeyboardShortcuts.ts      # Ctrl+Z/Y/S handlers
│
├── components/
│   ├── index.ts                      # Barrel exports all public components
│   ├── ui.tsx                        # UI primitives (Toggle, Slider, Field, Input, etc.)
│   ├── Accordion.tsx                 # Collapsible accordion panel
│   ├── ColumnManager.tsx             # Table column visibility/order/width manager
│   ├── TemplateControls.tsx          # All template control sections
│   ├── QuickNav.tsx                  # Sticky section navigation with IntersectionObserver
│   ├── TinyBtn.tsx                   # Small icon action button
│   ├── PreviewSelector.tsx           # Routes to UniversalPreview or legacy previews
│   ├── FormulaEditor.tsx             # Formula expression editor with field picker
│   ├── RulesSection.tsx              # Condition builder (rules list, visibility, highlights)
│   ├── ChartSection.tsx              # BarChart/PieChart via recharts
│   ├── ImagePreviewModal.tsx         # Logo/image preview modal
│   └── preview/
│       ├── UniversalPreview.tsx      # Main preview orchestrator (~280 lines now)
│       ├── shared.tsx                # Shared helpers (mm, align, Separator, DocRow, etc.)
│       ├── ReportSection.tsx         # Report rendering (KPI cards, charts, top products)
│       ├── LogoRenderer.tsx          # Logo image renderer
│       ├── HeaderSection.tsx         # Header renderer (thermal + A4/A5)
│       ├── DocInfoSection.tsx        # Document info renderer
│       ├── ItemsSection.tsx          # Items table renderer
│       ├── TotalsSection.tsx         # Totals renderer
│       ├── PaymentsSection.tsx       # Payments renderer
│       └── FooterSection.tsx         # Footer renderer
│
├── sections/                         # Template control sections (for PrintSettingsPage)
│   ├── index.ts
│   ├── ToggleSwitch.tsx              # Section accordion toggle primitives
│   ├── HeaderSection.tsx
│   ├── DocumentSection.tsx
│   ├── ItemsSection.tsx
│   ├── TotalsSection.tsx
│   ├── FooterSection.tsx
│   └── FormattingSection.tsx
│
├── render/                           # Render helpers
│   └── index.ts                      # Re-exports
│
├── config/                           # Template library config
│   └── ...
│
├── template-library/                 # Template library (install/search/filter)
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
├── api/
│   └── printTemplatesApi.ts          # React Query hooks for template CRUD
│
├── utils/                            # Pure utilities
│   ├── index.ts
│   └── numberToArabic.ts             # Number-to-Arabic-words converter
│
└── page/
    └── index.ts                      # Re-exports PrintSettingsPage
```

## Architecture Principles

### 1. Self-Containment
- All code for print template management lives inside `print-settings/`
- External imports are limited to 4 shared infrastructure paths:
  - `@/lib/api/core/client` (HTTP client)
  - `@/lib/store/appStore` (active company/slug)
  - `@/components/ui/ErrorBoundary`
  - `@/lib/api/core/types` (type-only)
- No imports from `@/reporting`, `@/pos`, or other page modules

### 2. Singleton Sources
- All service instances are created once and stored in `services/engines/` and `services/`
- `reporting/index.ts` re-exports from `print-settings/` to avoid duplicate instances
- Direction: POS → print-settings → reporting (POS re-exports from print-settings)

### 3. Single Responsibility
- `PrintSettingsPage.tsx` is an orchestrator only — it composes components, manages state, and delegates to hooks
- UI primitives live in `components/ui.tsx`
- Each major render section has its own component file
- Services are stateless classes or singleton instances

### 4. Data Flow
```
User action → PrintSettingsPage state → tpl object → UniversalPreview → Section components
                                                          ↕
                                              rulesEngine.evaluate(tpl.rules, data)
```

## Key Components

| Component | File | Purpose |
|-----------|------|---------|
| PrintSettingsPage | `PrintSettingsPage.tsx` | 3-column layout: doc type selector, template controls, live preview |
| UniversalPreview | `components/preview/UniversalPreview.tsx` | Dispatches to paper-specific renderers |
| PreviewSelector | `components/PreviewSelector.tsx` | Routes to UniversalPreview or legacy A4/A5 previews |
| FormulaEditor | `components/FormulaEditor.tsx` | Expression editor with field picker + validation |
| TemplateLibraryModal | `template-library/TemplateLibraryModal.tsx` | Browse/search/install templates |
| RulesSection | `components/RulesSection.tsx` | Condition builder for show/hide/highlight |
| ChartSection | `components/ChartSection.tsx` | Chart rendering for report summaries |

## External Dependencies

Only 4 shared infrastructure imports:
- `@/lib/api/core/client`: `apiGet`, `apiPost`, `apiPut`, `apiDelete`, `apiUpload`, `apiPatch`
- `@/lib/store/appStore`: `useActiveCompany`, `useActiveSlug`
- `@/components/ui/ErrorBoundary`
- `@/lib/api/core/types`: `CommercialDocument` (type only)

## Build

```bash
npm run build  # 1020 modules, 0 errors (PrintSettingsPage chunk: ~95KB)
```
