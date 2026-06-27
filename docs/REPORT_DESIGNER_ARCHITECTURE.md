# World-Class ERP Report Designer — Architecture Document

**Status**: Draft  
**Version**: 0.1  
**Date**: 2026-06-27  
**Authors**: Architecture Team  
**Prerequisite**: `docs/PRINTING_SYSTEM_AUDIT.md` — full audit of the existing printing system

---

## Table of Contents

1. Architecture Decision Record (ADR)
2. Component Hierarchy
3. Rendering Pipeline
4. Data Flow Diagrams
5. Dependency Diagrams
6. Migration Strategy
7. Compatibility Strategy
8. Performance Strategy
9. Risk Analysis
10. Implementation Roadmap

---

## 1. Architecture Decision Record (ADR)

### ADR-001: Single Report Data Contract

**Decision**: Rename and extend `ReceiptLiveData` → `ReportData` as the universal data contract for ALL reports.

**Rationale**:
- Current `ReceiptLiveData` is a proxy alias to `TemplateLiveData` — confusion between the two
- It already contains all essential fields (doc info, items, totals, payments, balances)
- Adding fields (`deliveryAddress`, `session`, `paymentTerm`, `currency`, `warehouse`, `notes`, `attachments`, `barcode`, `weight`, `volume`, `customFields`) makes it truly universal
- `ReportData` becomes the single data source every ReportComponent reads from

**Consequences**:
- All existing POS/Kiosk code that builds `ReceiptLiveData` must upgrade to `ReportData`
- The `buildData()` functions in A4/A5/Receipt previews become obsolete — components read directly from `ReportData`
- Mock data is externalized to a single factory file (`reportDataMocks.ts`)

### ADR-002: ReportDefinition as Composition Root

**Decision**: Replace the flat `PrintTemplate` interface with a composable `ReportDefinition` type.

**Rationale**:
- `PrintTemplate` has 177 flat properties — rigid, hard to extend, no nesting
- `ReportDefinition` uses a `ReportSection[]` array where each section declares its own type, data binding, children, styles, conditions
- Sections can be reordered, duplicated, hidden conditionally — impossible with flat properties
- Existing template properties are auto-mapped into sections during migration

**Consequences**:
- A `LegacyTemplateAdapter` converts `PrintTemplate` → `ReportDefinition` for backward compatibility
- The designer UI builds `ReportDefinition` directly, not `PrintTemplate`
- New sections (charts, sub-reports, custom HTML) are added as new `ReportSection` types without schema changes

### ADR-003: Component-Based Rendering Engine

**Decision**: Every visual element is a `ReportComponent` — a self-contained React component receiving `ReportData` + `ComponentStyle`.

**Rationale**:
- Current: 3 monolithic previews (ReceiptPreview, A4Preview, A5Preview) each with duplicated render logic
- Target: `Text`, `Label`, `Image`, `Table`, `BarCode`, `QRCode`, `Line`, etc. as independent components
- The rendering engine iterates `ReportDefinition.sections[]`, instantiates the correct `ReportComponent` for each, passes `ReportData` slice + style props
- PreviewSelector becomes a thin shell: `switch(definition.paper_size) { case 'A4': render engine }` but the engine is the same code path

**Consequences**:
- `ReceiptPreview.tsx`, `A4Preview.tsx`, `A5Preview.tsx` are deleted — replaced by the unified render engine
- Components can be tested, reused, extended independently
- New paper sizes (Letter, Legal, Custom) require no code changes — just a new entry in `PAPER_SIZE_MAP`

### ADR-004: Expression Engine as Separate Module

**Decision**: Implement a pure-function expression parser/executor without `eval()` or external DSL.

**Rationale**:
- User-defined formulas should be safe, sandboxed, and typed
- Support `SUM()`, `AVG()`, `COUNT()`, `IF()`, `ROUND()`, `CONCAT()`, `TODAY()`, operators, field references
- Parse → AST → execute against `ReportData` context
- Store as string in `ReportDefinition.sections[].formula` or `calculatedFields[].expression`
- Autocomplete + syntax highlighting via CodeMirror or Monaco (future)

**Consequences**:
- The expression engine is zero-dependency core logic — usable from both frontend (preview) and future backend (PDF generation)
- Expression validation is performed at design time (red underline in editor)
- All existing calculated fields (prevBalance, newBalance, TVA breakdown, amount-in-words) are migrated to expression-based

### ADR-005: Rules Engine as Declarative Conditions

**Decision**: Conditional logic uses a JSON-based rule format: `{ if: { field: "total_ttc", op: "gt", value: 1000 }, then: { visible: true, style: { color: "red" } } }`.

**Rationale**:
- Rules are serializable, storable in DB, importable/exportable
- No code changes needed for new conditions
- The rules executor walks `ReportDefinition.rules[]` at render time, mutates component styles/visibility
- Combined with expression engine for complex conditions (`if: { expression: "total_ttc > 1000 && client.type == 'wholesale'" }`)

**Consequences**:
- Rules are attached to `ReportSection` or `ReportComponent` via `conditions: ConditionRule[]`
- The render engine applies conditions as a post-processing step before final render
- A future UI (Phase 2) can provide visual rule builder

### ADR-006: Twin Storage with Legacy Lock

**Decision**: Continue writing to both `settings` table (current) and a new `report_definitions` table, but deprecate reading from `print_templates` table.

**Rationale**:
- New `report_definitions` table has a proper schema (not JSON-blob-per-key)
- `settings` table remains as cache/fallback during migration
- `print_templates` table is write-locked: PrintSettingsPage can still write to it (for rollback), but POS reads ONLY from `settings` or `report_definitions`
- After 6 months, `print_templates` table and its controller/API are removed

**Consequences**:
- New table: `report_definitions(id, company_id, code, name, paper_size, definition JSON, version int, is_active bool, is_default bool, created_at, updated_at)`
- `definition` JSON column holds the full `ReportDefinition` object (sections, styles, formulas, rules)
- A migration script converts existing `print_templates` rows into `report_definitions` rows

### ADR-007: Plugin Architecture via Registry Pattern

**Decision**: Use a typed registry (`ReportComponentRegistry`) where components, exporters, and field providers self-register.

**Rationale**:
- Core engine has zero knowledge of component implementations
- Third-party plugins add entries to the registry: `ReportComponentRegistry.register('chart', ChartComponent)`
- The designer UI queries the registry for available components
- Each registry entry declares its capabilities (data source requirements, paper size compatibility, styles supported)

**Consequences**:
- Core exports: `ReportComponentRegistry`, `BaseReportComponent`, `ReportExporter`, `FieldProvider` interfaces
- Built-in components (Text, Table, Barcode, etc.) register on app bootstrap
- Future plugins are npm packages that import and call `register()`

---

## 2. Component Hierarchy

```
ReportDefinition
├── meta: { name, version, docType, paperSize, orientation, createdAt, updatedAt }
├── theme: ThemeDefinition
├── styles: GlobalStyleMap
├── formulas: CalculatedField[]
├── rules: GlobalRule[]
├── dataSources: DataSourceBinding[]
└── sections: ReportSection[]

ReportSection
├── id: string (uuid)
├── type: SectionType (header | body | footer | sidebar | custom)
├── dataBinding: DataBinding | null
├── layout: LayoutConfig
├── conditions: ConditionRule[]
├── styles: ComponentStyleMap
├── visible: boolean
└── children: ReportComponent[]

ReportComponent (base interface)
├── id: string (uuid)
├── type: ComponentType
├── dataBinding: DataBinding
├── conditions: ConditionRule[]
├── styles: ComponentStyleMap
├── layout: LayoutConfig
├── visible: boolean
├── lock: boolean
└── children: ReportComponent[]   (for containers)

ComponentType (union)
├── 'text' | 'label' | 'image' | 'logo'
├── 'table' | 'table-column' | 'repeater'
├── 'group' | 'rectangle' | 'circle' | 'line' | 'spacer'
├── 'barcode' | 'qrcode'
├── 'signature' | 'stamp'
├── 'totals' | 'chart'
├── 'html' | 'markdown'
└── 'custom'   (future plugin)

DataBinding
├── type: 'static' | 'field' | 'expression' | 'computed'
├── value: string          // static text or field path or expression
├── format: FormatConfig   // number, date, currency, etc.
└── fallback: string       // when value is empty

LayoutConfig
├── type: 'absolute' | 'flow' | 'flex' | 'grid' | 'stack' | 'table'
├── position: { x, y, width, height }  // for absolute
├── flex: { direction, wrap, justify, align, gap }
├── grid: { columns, rows, gap }
├── padding: [top, right, bottom, left]
└── margin: [top, right, bottom, left]

ComponentStyleMap
├── font: { family, size, weight, italic, underline, color, align, letterSpacing, lineHeight }
├── background: { color, image, opacity }
├── border: { top, right, bottom, left, style, color, width, radius }
├── dimension: { width, height, minWidth, minHeight, maxWidth, maxHeight }
├── position: { zIndex, float, clear }
└── effects: { shadow, opacity, rotation, transform }

ThemeDefinition
├── name: string
├── base: ThemePreset
├── variables: Record<string, string>
├── typography: TypographyTheme
├── colors: ColorPalette
├── spacing: SpacingTheme
├── borders: BorderTheme
└── components: Partial<Record<ComponentType, ComponentStyleMap>>

CalculatedField
├── name: string
├── expression: string
├── type: 'number' | 'string' | 'date' | 'boolean'
├── format: FormatConfig
└── dependencies: string[]   // field paths this expression reads

ConditionRule
├── id: string (uuid)
├── description: string
├── expression: string       // must evaluate to boolean
├── priority: number
└── actions: ConditionAction[]

ConditionAction
├── type: 'show' | 'hide' | 'highlight' | 'color' | 'style'
├── target: string           // component id or selector
└── value: any               // color, style override, etc.

FormatConfig
├── type: 'number' | 'currency' | 'date' | 'time' | 'percent' | 'text'
├── locale: string
├── decimals: number
├── prefix: string
├── suffix: string
├── dateFormat: string
└── timeFormat: string

ReportData (universal data contract)
├── meta: { docNumber, docDate, dueDate, time, cashierName, session, currency, language }
├── company: CompanyBlock
├── client: ClientBlock | null
├── items: ReportItem[]
├── totals: ReportTotals
├── payments: ReportPayment[]
├── balances: ReportBalances
├── dimensions: { weight, volume, packageCount, itemCount }
├── custom: Record<string, any>
└── computed: Record<string, any>   // evaluated formulas
```

---

## 3. Rendering Pipeline

### 3.1 Frontend Rendering (Browser)

```
ReportDefinition  (JSON from DB/localStorage)
        │
        ▼
  +-------------------+
  |  DefinitionLoader  |  ← validates version, migrates if needed
  +-------------------+
        │
        ▼
  +-------------------+
  |  ThemeResolver     |  ← merges theme, variables, global styles
  +-------------------+
        │
        ▼
  +-------------------+
  |  DataProvider      |  ← builds ReportData from source(s)
  +-------------------+     (POS: receiptSnapshot → ReportData)
        │                    (Designer: mock factory → ReportData)
        ▼
  +-------------------+
  |  FormulaEngine     |  ← evaluates all CalculatedField[]
  +-------------------+     → populates ReportData.computed
        │
        ▼
  +-------------------+
  |  SectionIterator   |  ← walks ReportDefinition.sections[]
  +-------------------+     for each section:
        │                      │
        ▼                      ▼
  +-------------------+  +-------------------+
  |  ConditionChecker  |  |  LayoutEngine      |
  +-------------------+  +-------------------+
        │                      │
        ▼                      ▼
  +-------------------+
  |  ComponentRenderer |  ← instantiates ReportComponent by type
  +-------------------+     passes: data slice + styles + layout
        │                      │
        ▼                      ▼
  +-------------------+
  |   React VDOM       |  ← standard React reconciliation
  +-------------------+
        │
        ▼
  +-------------------+
  |   Browser DOM      |
  +-------------------+
```

### 3.2 Thermal ESC/POS Pipeline

```
ReportDefinition
        │
        ▼
  +-------------------+
  |  DefinitionLoader  |  ← same loader
  +-------------------+
        │
        ▼
  +-------------------+
  |  ThermalAdapter    |  ← converts ReportDefinition → thermal layout
  +-------------------+     (paper width, column widths, font sizes)
        │                      │
        ▼                      ▼
  +-------------------+  +-------------------+
  |  FormulaEngine     |  |  RulesEngine       |  ← same engines
  +-------------------+  +-------------------+
        │
        ▼
  +-------------------+
  |  EscPosBuilder     |  ← upgraded from printService.ts
  +-------------------+     (accepts structured data, not raw bytes)
        │
        ▼
  +-------------------+
  |  WebUSB / Blob     |  ← same transport layer
  +-------------------+
```

### 3.3 PDF Export Pipeline (Future)

```
ReportDefinition + ReportData
        │
        ▼
  +-------------------+
  |  PdfAdapter        |  ← server-side (Laravel DomPDF / Puppeteer)
  +-------------------+     or client-side (jsPDF + html2canvas)
        │
        ▼
  +-------------------+
  |  Same render engine|  ← reuse React render → screenshot → PDF
  +-------------------+     or direct DOM → PDF conversion
        │
        ▼
    PDF File
```

---

## 4. Data Flow Diagrams

### 4.1 POS Sale → Print

```
User clicks Pay
       │
       ▼
ProfessionalPaymentModal
       │
       ▼
handleCompleteSale()
       │
       ├── documentsApi.create()          → document_number, due_date, etc.
       ├── partyBalancesApi.getOne()       → current_balance
       │
       ▼
Build ReportData (formerly receiptLiveData)
       │
       ├── meta: { docNumber, docDate, dueDate, cashierName, ... }
       ├── company: companyData
       ├── client: { name, nif, phone, address }
       ├── items: CartItem[]
       ├── totals: { ht, tva, ttc, fiscal_stamp, paid, change, remaining }
       ├── payments: paymentMode[]
       └── balances: { prevBalance, newBalance }
       │
       ▼
ProfessionalReceipt
       │
       ├── loadReportDefinition(activeDoc, paperSize)
       │     └── usePrintSettings() → ReportDefinition
       │
       ▼
RenderPipeline.run(definition, reportData)
       │
       ├── PreviewSelector → Browser Preview
       └── ThermalAdapter → ESC/POS → WebUSB
```

### 4.2 Template Designer → Storage

```
Designer UI (drag-drop)
       │
       ▼
Build ReportDefinition
       │
       ├── ComponentTreeBuilder
       ├── StyleEditor → ComponentStyleMap
       ├── FormulaEditor → CalculatedField[]
       └── RuleEditor → ConditionRule[]
       │
       ▼
Save
       │
       ├── dbSaveReportDefinition()
       │     ├── PATCH /settings → key: "report:def:{docCode}"
       │     └── POST /report-definitions → JSON column
       │
       ▼
       Success
```

### 4.3 Legacy Template Migration

```
PrintTemplate (177 flat properties)
       │
       ▼
LegacyTemplateAdapter
       │
       ├── map paper_size → definition.meta.paperSize
       ├── map show_logo, logo_size, logo_align → ImageComponent
       ├── map show_company_name, company_name_* → TextComponent
       ├── map col_order, col_show, col_widths → TableComponent.columns[]
       ├── map show_total_ht, show_total_ttc, etc. → TotalsComponent
       ├── map footer_line1-3, show_thank_you → TextComponent[]
       ├── map show_barcode, barcode_content → BarCodeComponent
       ├── map show_qr, qr_content → QRCodeComponent
       ├── map show_cashier_signature, show_client_signature → SignatureComponent
       ├── map show_stamp → StampComponent
       └── map margin_*, line_spacing, base_font_size → ThemeDefinition
       │
       ▼
  ReportDefinition (composable sections)
```

---

## 5. Dependency Diagrams

### 5.1 Module Dependency Graph (High-Level)

```
┌─────────────────────────────────────────────────────────────┐
│                  @core/report-types                          │
│  (ReportDefinition, ReportData, ReportComponent, etc.)       │
└────────────────────┬────────────────────────────────────────┘
                     │
    ┌────────────────┼────────────────┬──────────────────┐
    ▼                ▼                ▼                  ▼
┌──────────┐  ┌────────────┐  ┌──────────────┐  ┌──────────────┐
│ @core/   │  │ @core/     │  │ @core/       │  │ @core/       │
│formula   │  │rules-engine│  │layout-engine │  │data-binding  │
└──────────┘  └────────────┘  └──────────────┘  └──────────────┘
    │                │                │                  │
    └────────────────┼────────────────┼──────────────────┘
                     ▼
        ┌─────────────────────────┐
        │  @renderer/engine        │
        │  (SectionIterator,       │
        │   ComponentResolver,     │
        │   StyleResolver)         │
        └────────────┬────────────┘
                     │
    ┌────────────────┼────────────────┬──────────────────┐
    ▼                ▼                ▼                  ▼
┌──────────┐  ┌────────────┐  ┌──────────────┐  ┌──────────────┐
│ @comps/  │  │ @comps/    │  │ @comps/      │  │ @comps/      │
│ table    │  │ text       │  │ barcode      │  │ totals       │
├──────────┤  ├────────────┤  ├──────────────┤  ├──────────────┤
│ @comps/  │  │ @comps/    │  │ @comps/      │  │ @comps/      │
│ image    │  │ repeater   │  │ signature    │  │ chart        │
└──────────┘  └────────────┘  └──────────────┘  └──────────────┘
                     │
                     ▼
        ┌─────────────────────────┐
        │  @designer/studio        │
        │  (drag-drop canvas,      │
        │   property panel,        │
        │   component palette)     │
        └────────────┬────────────┘
                     │
                     ▼
        ┌─────────────────────────┐
        │  @export                │
        │  ├─ browser-print       │
        │  ├─ escpos              │
        │  ├─ pdf                 │
        │  └─ future plugins      │
        └─────────────────────────┘
                     │
                     ▼
        ┌─────────────────────────┐
        │  @storage               │
        │  ├─ db-store            │
        │  ├─ local-store         │
        │  └─ legacy-adapter      │
        └─────────────────────────┘
```

### 5.2 File Structure

```
resources/js/report-engine/              ← NEW: root package
├── index.ts                             ← public API barrel
├── types/
│   ├── index.ts                         ← re-exports
│   ├── report-definition.ts             ← ReportDefinition, ReportSection, etc.
│   ├── report-data.ts                   ← ReportData interface
│   ├── components.ts                    ← ComponentType, ReportComponent
│   ├── styles.ts                        ← ComponentStyleMap, ThemeDefinition
│   ├── layout.ts                        ← LayoutConfig, LayoutType
│   ├── formulas.ts                      ← CalculatedField, ExpressionAST
│   ├── rules.ts                         ← ConditionRule, ConditionAction
│   ├── binding.ts                       ← DataBinding, FormatConfig
│   ├── export.ts                        ← ExportFormat, ExportOptions
│   └── enums.ts                         ← PaperSize, AlignOption, BorderStyle, etc.
│
├── core/
│   ├── formula-engine/
│   │   ├── parser.ts                    ← tokenize + parse → AST
│   │   ├── ast.ts                       ← AST node types
│   │   ├── executor.ts                  ← walk AST → value
│   │   ├── validators.ts                ← validate expression, extract dependencies
│   │   ├── functions/
│   │   │   ├── index.ts                 ← function registry
│   │   │   ├── math.ts                  ← SUM, AVG, COUNT, MIN, MAX, ROUND, ABS
│   │   │   ├── string.ts               ← CONCAT, FORMAT, UPPER, LOWER, TRIM
│   │   │   ├── date.ts                  ← TODAY, NOW, DATE, YEAR, MONTH, DAY
│   │   │   ├── logic.ts                 ← IF, CASE, AND, OR, NOT
│   │   │   ├── type.ts                  ← TO_NUMBER, TO_STRING, TO_DATE
│   │   │   └── custom.ts                ← user-defined function placeholder
│   │   └── __tests__/
│   │       ├── parser.test.ts
│   │       ├── executor.test.ts
│   │       └── functions.test.ts
│   │
│   ├── rules-engine/
│   │   ├── executor.ts                  ← evaluate conditions → apply actions
│   │   ├── evaluator.ts                 ← boolean expression evaluator
│   │   └── __tests__/
│   │
│   ├── layout-engine/
│   │   ├── layout-types.ts              ← ILayoutEngine interface
│   │   ├── absolute.ts                  ← absolute positioning
│   │   ├── flow.ts                      ← document flow (default)
│   │   ├── flex.ts                      ← flexbox-based
│   │   ├── grid.ts                      ← CSS grid-based
│   │   ├── stack.ts                     ← vertical/horizontal stack
│   │   └── __tests__/
│   │
│   ├── data-binding/
│   │   ├── resolver.ts                  ← resolve DataBinding → value from ReportData
│   │   ├── path-parser.ts               ← parse "client.name" → field path
│   │   └── formatters.ts                ← format number, date, currency, etc.
│   │
│   ├── theme/
│   │   ├── resolver.ts                  ← merge theme presets + overrides
│   │   ├── presets/
│   │   │   ├── default.ts
│   │   │   ├── dark.ts
│   │   │   └── minimal.ts
│   │   └── variables.ts                 ← CSS variable resolution
│   │
│   └── registry/
│       ├── component-registry.ts        ← ReportComponentRegistry singleton
│       ├── exporter-registry.ts         ← ReportExporterRegistry
│       ├── function-registry.ts         ← custom function registration
│       └── field-provider-registry.ts   ← custom data field providers
│
├── renderer/
│   ├── index.ts                         ← public API: renderReport()
│   ├── engine.ts                        ← main SectionIterator
│   ├── component-resolver.ts            ← resolve type → React component
│   ├── style-resolver.ts                ← merge global + section + component styles
│   ├── condition-checker.ts             ← evaluate per-component conditions
│   └── providers/
│       ├── data-provider.ts             ← build ReportData from sources
│       └── mock-data.ts                 ← factory for designer preview
│
├── components/
│   ├── index.ts                         ← barrel: register all built-in components
│   ├── base/
│   │   ├── ReportComponent.tsx          ← base HOC: wraps children, applies styles
│   │   ├── ContainerComponent.tsx        ← layout-aware container
│   │   └── withDataBinding.tsx           ← HOC: resolves data binding
│   │
│   ├── text/
│   │   ├── Text.tsx                     ← stylable text element
│   │   └── Label.tsx                    ← labeled key:value pair
│   │
│   ├── image/
│   │   ├── Image.tsx                    ← image/logo renderer
│   │   ├── Logo.tsx                     ← company logo with fallback
│   │   └── Watermark.tsx                ← background watermark
│   │
│   ├── table/
│   │   ├── Table.tsx                    ← dynamic table renderer
│   │   ├── TableHeader.tsx
│   │   ├── TableBody.tsx
│   │   ├── TableFooter.tsx
│   │   ├── TableColumn.tsx              ← column definition component
│   │   ├── TableRepeater.tsx            ← repeated row rendering
│   │   ├── TableGroup.tsx               ← grouped rows with header/footer
│   │   └── utils/column-widths.ts       ← distribute widths
│   │
│   ├── totals/
│   │   ├── Totals.tsx                   ← configurable totals block
│   │   └── TotalRow.tsx                 ← single total row (label + value)
│   │
│   ├── barcode/
│   │   ├── BarCode.tsx                  ← real barcode (bwip-js / jsbarcode)
│   │   └── QRCode.tsx                   ← real QR (qrcode.js)
│   │
│   ├── signatures/
│   │   ├── SignatureLine.tsx            ← cashier/client signature
│   │   └── Stamp.tsx                    ← company stamp
│   │
│   ├── shapes/
│   │   ├── Rectangle.tsx
│   │   ├── Circle.tsx
│   │   ├── Line.tsx
│   │   └── Spacer.tsx
│   │
│   ├── repeater/
│   │   └── Repeater.tsx                 ← repeat children for each data item
│   │
│   ├── chart/
│   │   └── Chart.tsx                    ← simple chart component (future)
│   │
│   └── html/
│       ├── HtmlBlock.tsx                ← raw HTML embed
│       └── Markdown.tsx                 ← markdown to HTML
│
├── storage/
│   ├── index.ts                         ← ReportStorage interface
│   ├── db-store.ts                      ← settings API backend
│   ├── local-store.ts                   ← localStorage (offline/cache)
│   ├── legacy-adapter.ts                ← PrintTemplate → ReportDefinition
│   ├── migration.ts                     ← version → version migration
│   └── serialization.ts                ← ReportDefinition ↔ JSON
│
├── export/
│   ├── index.ts                         ← ReportExporter interface
│   ├── browser-print.ts                 ← window.print (printReceiptDirect upgrade)
│   ├── escpos/
│   │   ├── adapter.ts                   ← ReportDefinition → thermal layout
│   │   └── escpos-builder.ts            ← upgraded from printService.ts
│   ├── pdf.ts                           ← PDF export (future)
│   ├── image.ts                         ← image export (future)
│   └── csv.ts                           ← CSV data export (future)
│
├── designer/
│   ├── index.ts                         ← Studio entry point
│   ├── canvas/
│   │   ├── DesignerCanvas.tsx           ← drag-drop container
│   │   ├── ComponentDropZone.tsx        ← valid drop areas
│   │   ├── ResizeHandles.tsx            ← resize controls
│   │   ├── Rulers.tsx                   ← pixel/mm rulers
│   │   └── GridOverlay.tsx              ← snap-to-grid guides
│   │
│   ├── palette/
│   │   ├── ComponentPalette.tsx          ← drag source list
│   │   └── PaletteItem.tsx              ← draggable item
│   │
│   ├── properties/
│   │   ├── PropertyPanel.tsx            ← right-side editor
│   │   ├── StyleEditor.tsx              ← font, color, border, etc.
│   │   ├── DataBindingEditor.tsx        ← field picker + format
│   │   ├── LayoutEditor.tsx             ← position, margin, padding
│   │   ├── FormulaEditor.tsx            ← expression input with validation
│   │   ├── RuleEditor.tsx               ← condition builder
│   │   └── SectionOrderEditor.tsx       ← reorder sections
│   │
│   ├── toolbar/
│   │   ├── DesignerToolbar.tsx           ← undo/redo, zoom, export, save
│   │   ├── AlignmentTools.tsx            ← align, distribute, center
│   │   └── LayerTools.tsx               ← bring forward/backward
│   │
│   ├── hooks/
│   │   ├── useDesignerHistory.ts         ← undo/redo stack (use existing pattern)
│   │   ├── useDragDrop.ts               ← drag-and-drop state
│   │   ├── useSelection.ts              ← selected component state
│   │   ├── useZoom.ts                   ← zoom level state
│   │   └── useClipboard.ts              ← copy/paste/duplicate
│   │
│   └── context/
│       ├── DesignerContext.tsx            ← shared designer state
│       └── SelectionContext.tsx           ← selected component + actions
│
├── preview/
│   ├── index.ts                          ← LivePreview shell
│   ├── PreviewContainer.tsx              ← renders current definition
│   └── PaperFrame.tsx                    ← paper-sized wrapper with shadow
│
├── migration/
│   ├── v1-to-v2.ts                      ← PrintTemplate → ReportDefinition
│   ├── v2-to-v3.ts                      ← future schema migrations
│   └── rollback.ts                      ← revert to previous version
│
└── __tests__/
    ├── integration/
    │   ├── pos-to-print.test.ts          ← full POS→render cycle
    │   ├── template-migration.test.ts     ← legacy→new conversion
    │   └── formula-regression.test.ts    ← all functions
    └── snapshot/
        ├── thermal-default.test.ts
        ├── a4-default.test.ts
        └── a5-default.test.ts
```

---

## 6. Migration Strategy

### 6.1 Phase 0: Coexistence (no breaking changes)

```
Existing System (PrintTemplate)     New System (ReportDefinition)
───────────────────────────────     ───────────────────────────────
PrintSettingsPage.tsx               report-engine/ (background)
POSPage.tsx (receiptLiveData)       runs in parallel, not active
printTemplatesApi.ts                saves to new table too
printStore.ts (settings key)         developer preview only
usePrintSettings()                  uses new components for preview
```

- New code lives in `resources/js/report-engine/` parallel to existing system
- `PrintSettingsPage` still works unchanged
- The new code is not wired into any route yet
- A "Preview in New Designer" button can be added for testing

### 6.2 Phase 1: Migration Script

```
PrintTemplate (DB) ──────────────────────────────────────────┐
  (existing rows in print_templates + settings)              │
                                                             ▼
                                                   LegacyTemplateAdapter
                                                         │
                                                         ▼
                                              ReportDefinition (JSON)
                                                         │
                                                         ▼
                                              report_definitions table
                                                         │
                                                         ▼
                                            POS starts reading from new table
                                            (fallback to old if not found)
```

- Run `php artisan report: migrate-templates` — converts all existing templates
- New `report_definitions` table is populated
- POS/usePrintSettings reads from new table first, falls back to old
- Old tables remain for rollback

### 6.3 Phase 2: Feature Parity

```
PrintTemplate features ──────────────────────────────────────┐
  (all 177 properties)                                       │
                                                             ▼
                                                    Feature-parity check
                                                         │
                    ┌────────────────────────────────────┘
                    ▼
         All properties render identically
         in both old and new systems
                    │
                    ▼
         Old PrintSettingsPage is hidden
         (not removed — accessible via URL param ?legacy=1)
```

- Every existing property is verified to render identically
- The new designer is feature-complete
- Old UI is hidden but accessible via legacy URL param

### 6.4 Phase 3: Cutover

```
                                                  ┌──────────────┐
Old settings keys ──────────────→  delete after  │  Retention   │
  (print:templates, etc.)           6 months       │  Period      │
                                                  └──────────────┘
                                                  ┌──────────────┐
Old print_templates table ───────→  delete after  │  Retention   │
  (PrintTemplateController)         6 months       │  Period      │
                                                  └──────────────┘
                                                  ┌──────────────┐
Old PrintSettingsPage.tsx ────────→  delete after  │  Retention   │
  + sections directory               6 months       │  Period      │
                                                  └──────────────┘

```

- After 6 months of coexistence, remove:
  - `print_templates` table + controller + routes
  - `PrintTemplateController.php`
  - `printTemplatesApi.ts`
  - Old `PrintSettingsPage.tsx` (redirect to new designer)
  - Legacy settings keys from whitelist

### 6.5 Rollback Strategy

```
Problem detected in new system
               │
               ▼
    switch(settings key) back to old read
    ┌─────────────────────────────────────┐
    │ usePrintSettings() checks both      │
    │ sources, prefers old if flag set    │
    └─────────────────────────────────────┘
               │
               ▼
    Old templates still in DB
    Old PrintSettingsPage still served
    at /settings/print?legacy=1
```

---

## 7. Compatibility Strategy

### 7.1 Paper Size Compatibility

| Paper Size | Existing | New Engine | Notes |
|------------|----------|------------|-------|
| 80mm | ✅ ReceiptPreview | ✅ Default ThermalLayout | Width fixed, height auto |
| 58mm | ✅ ReceiptPreview | ✅ NarrowThermalLayout | Width fixed, height auto |
| A4 | ✅ A4Preview | ✅ A4PaperLayout | 794×1123px |
| A5 | ✅ A5Preview | ✅ A5PaperLayout | 559×794px |
| Letter | ❌ | ✅ Future | 816×1056px |
| Legal | ❌ | ✅ Future | 816×1344px |
| Custom | ❌ | ✅ Any mm | Future |

### 7.2 Component Compatibility

| Component | Thermal | A4 | A5 | Notes |
|-----------|---------|----|----|-------|
| Text | ✅ | ✅ | ✅ | All sizes |
| Label | ✅ | ✅ | ✅ | All sizes |
| Image/Logo | ✅ | ✅ | ✅ | Auto-scales |
| Table | ✅ | ✅ | ✅ | Column widths adapt |
| Totals | ✅ | ✅ | ✅ | Compact on thermal |
| Barcode | ✅ | ✅ | ✅ | Auto-sizes |
| QR Code | ✅ | ✅ | ✅ | Auto-sizes |
| Signature | ❌ | ✅ | ✅ | Not in thermal |
| Stamp | ❌ | ✅ | ⚠ | Not in A5 |
| Chart | ❌ | ✅ | ❌ | A4 only |
| Repeater | ✅ | ✅ | ✅ | — |
| Group | ⚠ | ✅ | ✅ | Limited in thermal |
| Shapes | ✅ | ✅ | ✅ | Line, spacer only |
| Watermark | ❌ | ✅ | ⚠ | A4 only |
| HTML | ❌ | ✅ | ❌ | A4 only |

### 7.3 Old API Compatibility

| Old API | New API | Compatibility |
|---------|---------|---------------|
| `printTemplatesApi.list()` | `reportEngine.storage.list()` | Adapter wraps old calls |
| `printTemplatesApi.show()` | `reportEngine.storage.get()` | Adapter wraps old calls |
| `printTemplatesApi.create()` | `reportEngine.storage.save()` | Saves to both tables |
| `printTemplatesApi.update()` | `reportEngine.storage.save()` | Saves to both tables |
| `printTemplatesApi.delete()` | `reportEngine.storage.delete()` | Deletes from both tables |
| `printTemplatesApi.setDefault()` | `reportEngine.storage.setDefault()` | New method |
| `printTemplatesApi.duplicate()` | `reportEngine.storage.duplicate()` | New method |

### 7.4 Old Hook Compatibility

| Old Hook | New Hook | Notes |
|----------|----------|-------|
| `usePrintSettings()` | `useReportConfig()` | Extended: returns ReportDefinition |
| `useReceiptRenderer()` | `useReportRenderer()` | Uses same render engine |
| `usePrintTemplates()` | `useReportList()` | Unified query |
| `usePrintTemplate()` | `useReport()` | Single report |

### 7.5 Data Contract Compatibility

| Old Field | New Field | Status |
|-----------|-----------|--------|
| `ReceiptLiveData` | `ReportData` | ✅ Wrapper type, same shape |
| `TemplateLiveData.dueDate` | `ReportData.meta.dueDate` | ✅ |
| `TemplateLiveData.prevBalance` | `ReportData.balances.prevBalance` | ✅ |
| `TemplateLiveData.newBalance` | `ReportData.balances.newBalance` | ✅ |
| `TemplateLiveData.payments` | `ReportData.payments` | ✅ |
| (deliveryAddress missing) | `ReportData.meta.deliveryAddress` | 🔄 New field |
| (session missing) | `ReportData.meta.session` | 🔄 New field |
| (paymentTerm missing) | `ReportData.meta.paymentTerm` | 🔄 New field |
| (currency missing) | `ReportData.meta.currency` | 🔄 New field |
| (barcode missing) | `ReportData.meta.barcode` | 🔄 New field |
| (warehouse missing) | `ReportData.meta.warehouse` | 🔄 New field |

---

## 8. Performance Strategy

### 8.1 Targets

| Metric | Target |
|--------|--------|
| Template load | < 200ms (cached) |
| Preview render | < 100ms (deferred) |
| Print HTML build | < 300ms |
| Thermal print generation | < 500ms |
| Large report (10K lines) | < 5s render |
| Multi-page (100 pages) | < 10s render |

### 8.2 Techniques

```
1. Virtualization
   └── For large item arrays, virtualize table rows (react-virtualized)
       Only render visible rows + buffer

2. Deferred Rendering (existing pattern)
   └── useDeferredValue for designer preview — slider doesn't lag
       Already works in PrintSettingsPage, reuse pattern

3. Memoization
   └── React.memo on every ReportComponent
       StyleResolver results cached by style hash
       FormulaEngine results cached by expression + data hash

4. Lazy Evaluation
   └── Formulas evaluated only when data changes (useMemo)
       Rules evaluated only for visible components

5. Code Splitting
   └── Each component type lazy-loaded
       Designer UI lazy-loaded (500KB+)
       Thermal export lazy-loaded (only when needed)

6. Caching
   └── ReportDefinition cached in React Query (staleTime: 5min)
       Theme values cached in memory
       AST parsed once per expression, cached

7. Worker Threads (future)
   └── Large formula evaluations → Web Worker
       PDF generation → Web Worker or service
```

### 8.3 Critical Rendering Path

```
User clicks "Print"
       │
       ▼ (0ms)
Read ReportDefinition from cache
       │
       ▼ (<5ms)
Clone + apply theme
       │
       ▼ (<1ms)
Resolve data bindings (Memoized)
       │
       ▼ (<2ms)
Evaluate formulas (dirty-checked)
       │
       ▼ (<1ms)
Apply rules (only if data changed)
       │
       ▼
Iterate sections (stop if empty)
       │
       ▼
For each component:
  │  Resolve type → import (lazy, cached after first)
  │  Resolve styles (memo)
  │  Resolve data slice (memo)
  │  Check conditions (skip if hidden)
  │  Render (React.memo)
       │
       ▼
Build DOM / ESC/POS bytes
       │
       ▼
Send to printer / window.print()
```

---

## 9. Risk Analysis

### 9.1 High Risks

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|------------|
| R1 | **Breaking existing templates** | Medium | Critical | LegacyTemplateAdapter + migration script + 6-month coexistence |
| R2 | **Performance with 10K+ line reports** | Medium | High | Virtualization, lazy rendering, pagination |
| R3 | **Formula engine bugs causing incorrect totals** | Medium | Critical | Comprehensive test suite + validation at design time |
| R4 | **Plugin API not extensible enough** | Medium | High | Start with minimal surface, iterate based on plugin feedback |
| R5 | **Designer too complex for non-technical users** | High | Medium | Progressive disclosure: simple mode first, advanced mode later |

### 9.2 Medium Risks

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|------------|
| R6 | **ESC/POS thermal layout diverges from preview** | Medium | High | Same render engine for both — only layout adapter differs |
| R7 | **Theme system causes visual regressions** | Medium | Medium | Snapshot tests for every paper size + component combo |
| R8 | **CSS-in-JS performance overhead** | Medium | Low | Use style objects, not runtime CSS generation. Style caching. |
| R9 | **Dual-write inconsistency (old + new tables)** | Medium | Medium | Wrap in transaction, retry on failure, alert on mismatch |
| R10 | **React 19 server components conflict** | Low | Medium | Keep render engine client-side. PDF export uses separate path. |

### 9.3 Low Risks

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|------------|
| R11 | **Third-party barcode library license** | Low | Low | Use MIT-licensed library (jsbarcode) |
| R12 | **WebUSB API removed from browsers** | Low | High | Thermal has blob fallback; future: WebSerial |
| R13 | **Print dialog blocked by popup blocker** | Medium | Low | Toast error with instructions |
| R14 | **Arabic LTR/RTL rendering issues** | Medium | Medium | Always `dir="rtl"` on root, test each component |

---

## 10. Implementation Roadmap

### Phase 0 — Foundation (Weeks 1–3)

**Goal**: Core types, formula engine, rules engine, data binding resolver — no UI.

```
Week 1:
  ├── Create report-engine/ directory structure
  ├── Implement ALL types (report-definition.ts, report-data.ts, etc.)
  ├── Write ReportData interface + mock data factory
  └── Unit tests for types

Week 2:
  ├── Formula engine: parser → AST → executor
  ├── All built-in functions (math, string, date, logic)
  ├── Expression validator with dependency extraction
  └── Unit tests: 100+ test cases

Week 3:
  ├── Rules engine executor
  ├── Layout engine: flow + absolute + flex
  ├── Data binding resolver + formatters
  └── Theme resolver with presets
```

**Deliverable**: `@core/formula-engine`, `@core/rules-engine`, `@core/layout-engine`, `@core/data-binding`, `@core/theme` — fully tested, ready for integration.

### Phase 1 — Rendering Engine (Weeks 4–6)

**Goal**: Render engine that takes `ReportDefinition` + `ReportData` → React tree. PreviewSelector replaced.

```
Week 4:
  ├── Component registry + base ReportComponent HOC
  ├── Text, Label, Image, Logo components
  ├── Line, Spacer, Rectangle shapes
  └── Integration test: render simple receipt

Week 5:
  ├── Table component with dynamic columns
  ├── TableRepeater + TableGroup
  ├── Totals component with configurable rows
  └── TableHeader/TableFooter

Week 6:
  ├── BarCode component (jsbarcode integration)
  ├── QRCode component (qrcode.js integration)
  ├── Signature + Stamp components
  ├── PreviewContainer + PaperFrame
  └── Integration test: render full invoice
```

**Deliverable**: `@renderer/engine` renders any `ReportDefinition`. `PreviewSelector` deleted. All 3 previews replaced.

### Phase 2 — Storage & Migration (Weeks 7–8)

**Goal**: Data persistence, legacy template migration, report_definitions table.

```
Week 7:
  ├── Create report_definitions migration + model (Laravel)
  ├── Report API controller (CRUD + duplicate + setDefault)
  ├── db-store.ts implementation
  ├── local-store.ts (cache fallback)
  └── SettingsController whitelist update for report: keys

Week 8:
  ├── LegacyTemplateAdapter (PrintTemplate → ReportDefinition)
  ├── Migration script (artisan command)
  ├── serialization.ts (versioned JSON)
  ├── Rollback script
  └── Test: every existing template migrates identically
```

**Deliverable**: Existing templates migrated. New storage backend operational. Dual-write to old and new tables.

### Phase 3 — Export (Weeks 9–10)

**Goal**: Browser print + thermal export with same render pipeline.

```
Week 9:
  ├── browser-print.ts (upgrade printUtils.ts)
  ├── escpos/adapter.ts (ReportDefinition → thermal layout)
  ├── escpos/escpos-builder.ts (upgrade printService.ts)
  └── Test: thermal output matches preview

Week 10:
  ├── Integrate new export into POSPage.handlePrintDirect
  ├── Integrate new export into POSKioskPage
  ├── Remove old printService.ts code (replace with new)
  ├── Test: full POS→print cycle for thermal, A4, A5
  └── Fix: all 10 missed properties from audit
```

**Deliverable**: POS prints using new engine. Old printService.ts deprecated but available for rollback.

### Phase 4 — Designer UI (Weeks 11–16)

**Goal**: Visual drag-and-drop designer to replace PrintSettingsPage.

```
Week 11:
  ├── DesignerContext + SelectionContext
  ├── useDesignerHistory (undo/redo)
  ├── useDragDrop + useSelection + useZoom
  └── DesignerCanvas with grid overlay + snap

Week 12:
  ├── ComponentPalette with drag sources
  ├── Drop zones with visual feedback
  ├── Resize handles on selection
  └── Rulers + measurement units (mm/px/in)

Week 13:
  ├── PropertyPanel: StyleEditor (font, color, border, background)
  ├── PropertyPanel: LayoutEditor (position, margin, padding)
  ├── PropertyPanel: DataBindingEditor (field picker)
  └── PropertyPanel: SectionOrderEditor

Week 14:
  ├── PropertyPanel: FormulaEditor (with syntax validation)
  ├── PropertyPanel: RuleEditor (condition builder)
  ├── Toolbar: AlignmentTools + LayerTools
  └── Toolbar: Zoom, Copy, Paste, Duplicate, Delete

Week 15:
  ├── Theme editor (create/edit themes)
  ├── Global styles panel
  ├── Import/Export JSON for full report definitions
  └── Keyboard shortcuts (Ctrl+S, Ctrl+Z, etc.)

Week 16:
  ├── Integration: wire designer into /settings/reports route
  ├── Replace PrintSettingsPage redirect
  ├── Legacy route at /settings/print?legacy=1
  ├── User acceptance testing
  └── Bug fixes from testing
```

**Deliverable**: Full designer at `/settings/reports`. Old PrintSettingsPage accessible via legacy param.

### Phase 5 — Polish & Performance (Weeks 17–18)

```
Week 17:
  ├── Virtualization for large tables (react-virtualized)
  ├── Lazy loading for all components
  ├── Rendering performance profiling
  └── Optimize formula evaluation (dirty checking)

Week 18:
  ├── Snapshot tests for all paper sizes × components
  ├── Regression test suite
  ├── Print validation tests (thermal matches preview)
  └── Documentation: architecture, components, APIs, data flow
```

### Phase 6 — Future (Post-launch)

```
  ├── PDF export (Laravel DomPDF or Puppeteer)
  ├── Chart component (chart.js / recharts)
  ├── CommercialDocumentModal integration
  ├── Plugin architecture documentation
  ├── User-defined functions
  ├── CSV/Excel export
  ├── Multi-company template sharing
  ├── Report scheduler (daily/weekly auto-print)
  ├── Email attachment export
  └── Mobile-compatible print preview
```

---

## Implementation Order Summary

```
Phase 0: Types + Formula Engine + Rules Engine     [3 weeks]   ← START HERE
Phase 1: Render Engine + Components                  [3 weeks]
Phase 2: Storage + Migration                         [2 weeks]
Phase 3: Export (thermal + browser print)            [2 weeks]
Phase 4: Designer UI                                 [6 weeks]  ← MOST WORK
Phase 5: Performance + Tests + Docs                  [2 weeks]
                                                  ──────────
Total: ~18 weeks
```

---

## Appendix A: Key Design Decisions Summary

| Decision | ID | Chosen Approach | Alternative Rejected |
|----------|----|----------------|---------------------|
| Data contract | ADR-001 | Single `ReportData` | Per-component DTOs |
| Template shape | ADR-002 | Composable `ReportDefinition` | Flat `PrintTemplate` |
| Rendering | ADR-003 | Component-based render engine | Template method pattern |
| Formulas | ADR-004 | Custom parser → AST → executor | Math.js, eval(), external DSL |
| Rules | ADR-005 | JSON declarative conditions | if/else in code |
| Storage | ADR-006 | `report_definitions` table + settings cache | Only settings table |
| Plugins | ADR-007 | Registry pattern | DI container, service locator |

## Appendix B: File Migration

| Old File | New File | Action |
|----------|----------|--------|
| `types.ts` (PrintTemplate) | `types/report-definition.ts` | Rewrite |
| `ReceiptPreview.tsx` | Deleted | Replaced by components + renderer |
| `A4Preview.tsx` | Deleted | Replaced by components + renderer |
| `A5Preview.tsx` | Deleted | Replaced by components + renderer |
| `PreviewSelector.tsx` | `preview/PreviewContainer.tsx` | Rewrite |
| `sections/` (not created yet) | `designer/` | New design |
| `PrintSettingsPage.tsx` | Deferred (Phase 6) | Redirect |
| `printTemplatesApi.ts` | `storage/db-store.ts` | Rewrite |
| `usePrintSettings.ts` | `(moved to hooks/useReportConfig.ts)` | Rewrite |
| `useReceiptRenderer.ts` | `renderer/engine.ts` | Rewrite |
| `printStore.ts` | `storage/` | Rewrite |
| `printService.ts` | `export/escpos/` | Refactor into adapter |
| `printUtils.ts` | `export/browser-print.ts` | Rewrite |
| `ProfessionalReceipt.tsx` | Kept (wraps new renderer) | Minor update |
| `print-settings.css` | Deferred | CSS modules per component |
| `pos.css` receipt classes | Deferred | Removed when unused |

## Appendix C: Theme Default Values

The default theme matches current hardcoded values for pixel-perfect backward compatibility:

```ts
const DEFAULT_THEME: ThemeDefinition = {
  name: 'default',
  typography: {
    fontFamily: 'Tajawal, sans-serif',
    fontSize: 10,
    fontWeight: 400,
    lineHeight: 1.3,
    color: '#111111',
  },
  colors: {
    primary: '#0a8a5c',
    text: '#111111',
    textSecondary: '#444444',
    textTertiary: '#555555',
    background: '#ffffff',
    border: '#e2e8f0',
    headerBg: '#f5f5f5',
    alternatingRow: '#fafafa',
    negative: '#cc0000',
  },
  spacing: {
    margin: { top: 3, bottom: 3, sides: 3 },  // mm
    padding: { section: 8, cell: 6 },
    gap: 4,
  },
  borders: {
    style: 'dashed',
    color: '#999999',
    width: 1,
    radius: 2,
  },
};
```
