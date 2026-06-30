# Print Settings Render Tree

Complete component hierarchy of the Print Settings page editor and its corresponding preview renderer.

## Page Orchestrator: `PrintSettingsPage.tsx`

```
PrintSettingsPage                     ← page container, state owner
├── Header Toolbar                    ← inline in PrintSettingsPage
│   ├── Template Name (editable)      ← localTpl.name
│   ├── Save Button                   ← dbSaveTemplate + mutations.update
│   ├── Undo / Redo Buttons           ← historyRef stack
│   ├── Export / Import Buttons       ← download/upload JSON
│   ├── Default Toggle               ← is_default
│   ├── Active Toggle                ← is_active
│   ├── Library Button               ← opens TemplateLibraryModal
│   ├── Test Print Button            ← opens TemplatePrintModal
│   └── Status Bar (paper size, doc type, dirty indicator)
│
├── Doc Type Sidebar                 ← inline DOC_CATS map
│   ├── POS (activeCat='pos')        ← shows POS, RPT
│   ├── Sales (activeCat='sales')    ← shows FV, BL, DEV, BCC, AA
│   ├── Purchase (activeCat='purchase') ← shows FA, BR, AV
│   └── Warehouse (activeCat='warehouse') ← shows DDP, BT
│
├── Template List Panel              ← inline, maps templates[]
│   ├── ListItem × N                 ← name, doc_type, paper size badge
│   ├── Delete Button                ← opens DeleteConfirmModal
│   └── Duplicate Button             ← calls mutations.duplicate
│
├── Editor Panel                     ← scroll container
│   ├── QuickNav                     ← QuickNav.tsx
│   └── TemplateControls             ← TemplateControls.tsx
│       ├── Collapse All Toggle
│       ├── Section Visibility Toggles  ← show_header_section, etc.
│       ├── HeaderSectionControls    ← HeaderSection.tsx
│       ├── DocumentSectionControls  ← DocumentSection.tsx
│       ├── ItemsSectionControls     ← ItemsSection.tsx
│       ├── TotalsSectionControls    ← TotalsSection.tsx
│       ├── PaymentsSectionControls  ← PaymentsSection.tsx
│       ├── FooterSectionControls    ← FooterSection.tsx
│       ├── FormattingSectionControls ← FormattingSection.tsx
│       ├── RulesSection             ← RulesSection.tsx
│       └── ReportSection            ← inline in TemplateControls
│
├── Preview Panel                    ← split view
│   ├── Preview Toolbar              ← theme toggle, real/mock data, zoom
│   │   ├── Modern/Legacy Toggle     ← useLegacyPreview state
│   │   └── Mock/Real Toggle         ← useRealData state
│   └── PreviewSelector              ← PreviewSelector.tsx
│       └── UniversalPreview         ← UniversalPreview.tsx
│
├── ImagePreviewModal                ← zoom-in for logo
├── DeleteConfirmModal               ← DeleteConfirmModal.tsx
├── TemplateLibraryModal             ← template-library/SearchableTemplateGrid
└── TemplatePrintModal               ← test-print preview
```

---

## Editor Controls — Detailed Node Breakdown

### `HeaderSectionControls` (`sections/HeaderSection.tsx`)

#### Logo Group

| Setting Key | Type | Visibility | Preview Counterpart |
|---|---|---|---|
| `show_logo` | Toggle | All papers/docs | `renderLogo()` in `LogoRenderer.tsx` |
| `logo_source` | Pills (default/company/custom) | All, when `show_logo=true` | `co.logoUrl` resolution in `getCompany()` |
| `logo_size` | Slider 30–120px | All, when `show_logo=true` | `tpl.logo_size` on img |
| `logo_align` | Pills (right/center/left) | All, when `show_logo=true` | `justifyContent` in flex container |
| `logo_border_radius` | Slider 0–50% | All | `borderRadius` on img/fallback |
| `custom_logo_url` | Upload button | All, when `logo_source=custom` | Stored, set on `custom_logo_url` |

#### Company Name Group

| Setting Key | Type | Visibility | Preview Counterpart |
|---|---|---|---|
| `show_company_name` | Toggle | All | `co.name` display |
| `company_name_text` | Input | All, when `show_company_name=true` | Overrides `co.name` in `getCompany()` |
| `company_name_size` | Slider 10–28px | All, when `show_company_name=true` | `fontSize` on name div |
| `company_name_bold` | Toggle | All, when `show_company_name=true` | `fontWeight: 900` vs `400` |
| `company_name_align` | Pills | All, when `show_company_name=true` | Thermal: `textAlign`; Page: inherited |
| `company_name_color` | ColorField | All, when `show_company_name=true` | `color` on name div |

#### Company Info Group

| Setting Key | Type | Visibility | Preview Counterpart |
|---|---|---|---|
| `show_address` | Toggle | All | `co.address` shown |
| `show_phone` | Toggle | All | `co.phone` shown |
| `show_tax_id` | Toggle | All | `co.nif` as "NIF:" |
| `show_rc` | Toggle | All | `co.rc` as "RC:" |
| `show_nis` | Toggle | All | `co.nis` as "NIS:" |
| `show_ice` | Toggle | All | `co.ice` as "ICE:" |
| `show_article` | Toggle | All | `co.article` shown |
| `company_info_size` | Slider 7–14px | All | `fontSize` on info div |
| `company_info_align` | Pills | All | Thermal: `textAlign`; Page: inherited |

#### Override Fields

| Setting Key | Type | Visibility | Preview Counterpart |
|---|---|---|---|
| `company_name_text` | Input (with API badge) | All | Overrides `co.name` |
| `override_address` | Input (with API badge) | All | Overrides `co.address` |
| `override_phone` | Input (with API badge) | All | Overrides `co.phone` |
| `override_nif` | Input (with API badge) | All | Overrides `co.nif` |
| `override_rc` | Input (with API badge) | All | Overrides `co.rc` |
| `override_nis` | Input (with API badge) | All | Overrides `co.nis` |
| `override_ice` | Input (with API badge) | All | Overrides `co.ice` |
| `override_article` | Input (with API badge) | All | Overrides `co.article` |

#### Extra

| Setting Key | Type | Visibility | Preview Counterpart |
|---|---|---|---|
| `header_custom_text` | Input | All | Shown below company info in thermal, below header in page |
| `header_separator` | Select (solid/dashed/double/none) | All | `<Separator style={tpl.header_separator}>` |

---

### `DocumentSectionControls` (`sections/DocumentSection.tsx`)

#### Title Group

| Setting Key | Type | Visibility | Preview Counterpart |
|---|---|---|---|
| `title_text` | Input | All | Thermal: centered title; Page: right-aligned title text |
| `title_size` | Slider 10–22px | All | `fontSize` on title |
| `title_bold` | Toggle | All | `fontWeight: 900` |
| `title_align` | Pills | All | Thermal: `textAlign`; Page: not used (title is right-aligned) |
| `title_color` | ColorField | All | `color` on title |

#### Document Field Toggles

| Setting Key | Type | Visibility | Preview Counterpart |
|---|---|---|---|
| `show_doc_number` | Toggle | All | Thermal: `DocRow` line; Page: `InfoRow` in table |
| `show_date` | Toggle | All | Shows formatted date, optionally with time |
| `show_time` | Toggle | All | Concatenated after date when both enabled |
| `show_due_date` | Toggle | All | Thermal: `DocRow`; Page: `InfoRow` |
| `show_cashier` | Toggle | All | `party.cashierName` or `session.cashierName` |
| `show_client` | Toggle | All | Entry toggle for client details block |
| `show_client_nif` | Toggle | When `show_client=true` | Thermal: `DocRow`; Page: in client card |
| `show_client_phone` | Toggle | When `show_client=true` | Thermal: `DocRow`; Page: in client card |
| `show_client_address` | Toggle | When `show_client=true` | Thermal: `DocRow`; Page: in client card |
| `show_delivery_address` | Toggle | Commercial docs only + when `show_client=true` | Page only: separate card in A4, inline in A5 |
| `show_session` | Toggle | POS docs only | `session.code` shown |
| `show_payment_term` | Toggle | Commercial docs only | Thermal: `DocRow`; Page: `InfoRow` |
| `show_bank_details` | Toggle | Page paper + commercial docs | Footer section shows bank_details_text |
| `bank_details_text` | Textarea | When `show_bank_details=true` | Rendered in footer |
| `doc_separator` | Select | All | `<Separator style={tpl.doc_separator}>` |

---

### `ItemsSectionControls` (`sections/ItemsSection.tsx`)

#### Column Manager (inline in ItemsSection, DnD with <ColumnManager)

| Setting Key | Type | Visibility | Preview Counterpart |
|---|---|---|---|
| `col_order` | DnD list | All | Column render order in `visibleCols.map()` |
| `col_show` | Toggle per column | All | Filter in `getVisibleCols()` |
| `col_widths` | Slider 5–60% per column | All | `flex: 0 0 X%` (thermal) or `width: X%` (page) |
| `col_headers` | Input per column | All | Custom header text |
| `col_aligns` | Pills per column (right/center/left) | All | `textAlign` per column cell |

#### Table Formatting

| Setting Key | Type | Visibility | Preview Counterpart |
|---|---|---|---|
| `items_font_size` | Slider 7–14px | All | `fontSize` on table/rows |
| `items_font_family` | Select (tajawal/monospace) | All | `fontFamily` on table |
| `show_col_header` | Toggle | All | Conditional `<thead>` / header row |
| `table_header_bold` | Toggle | When `show_col_header=true` | `fontWeight: 800` (thermal) or 700 (page) |
| `table_header_bg` | Toggle | When `show_col_header=true` | Thermal: `background: #f0f0f0`; Page: `background: #111` |
| `table_header_color` | ColorField | When `show_col_header=true` | Thermal: `color`; Page: text color (if bg=false) or white (if bg=true) |
| `table_border_style` | Select (solid/dashed/double/none) | All | `borderStyle` on cells |
| `alternating_rows` | Toggle | All | True: even rows get `alternating_color` background |
| `alternating_color` | ColorField | When `alternating_rows=true` | Background color for even rows |

#### Price Display

| Setting Key | Type | Visibility | Preview Counterpart |
|---|---|---|---|
| `price_display` | Pills (HT/TTC) | All | `unitPriceHt` vs `unitPriceTtc` in `colValue()` |
| `show_line_total_ttc` | Toggle | All | `totalTtc` vs `totalHt` in total column |

---

### `TotalsSectionControls` (`sections/TotalsSection.tsx`)

#### Totals Format

| Setting Key | Type | Visibility | Preview Counterpart |
|---|---|---|---|
| `totals_font_size` | Slider 8–16px | All | `fontSize` on totals container |
| `totals_bold` | Toggle | All | `fontWeight: 700` |
| `totals_align` | Pills (right/center/left) | All | Thermal: `textAlign`; Page: `justifyContent` on flex container |

#### Totals Lines

| Setting Key | Type | Visibility | Preview Counterpart |
|---|---|---|---|
| `show_total_ht` | Toggle | All | `TotalRow` label="المجموع HT", val=`t.totalHt` |
| `show_total_tva` | Toggle | All | `TotalRow` label="TVA", val=`t.totalTva` |
| `show_tva_breakdown` | Toggle | All | Per-rate `TotalRow` from `data.taxBreakdown[]` |
| `show_discount_total` | Toggle | All | `TotalRow` label="إجمالي الخصومات", val=`-t.totalDiscount` |
| `show_fiscal_stamp` | Toggle | Commercial docs only | `TotalRow` label="الطابع الجبائي", val=`t.fiscalStamp` |

#### TTC Block

| Setting Key | Type | Visibility | Preview Counterpart |
|---|---|---|---|
| `show_total_ttc` | Toggle | All | Entry toggle for TTC subtree |
| `total_ttc_font_size` | Slider 12–24px | When `show_total_ttc=true` | `fontSize` on TTC row |
| `total_ttc_bold` | Toggle | When `show_total_ttc=true` | `fontWeight: 900` |
| `total_ttc_color` | ColorField | When `show_total_ttc=true` | `color` on TTC row |
| `total_border_style` | Select | When `show_total_ttc=true` | Thermal: `border` on TTC div; Page: `borderTop` on TTC row |

#### Amount in Words

| Setting Key | Type | Visibility | Preview Counterpart |
|---|---|---|---|
| `show_amount_in_words` | Toggle | All | `numberToArabicWords(t.totalTtc)` |

#### Balances

| Setting Key | Type | Visibility | Preview Counterpart |
|---|---|---|---|
| `show_paid_amount` | Toggle | All | `TotalRow` val=`t.paid`, bold |
| `show_change` | Toggle | All | `TotalRow` val=`t.change` |
| `show_remaining` | Toggle | All | `TotalRow` val=`t.remaining`, red |
| `show_prev_balance` | Toggle | All | `TotalRow` val=`data.balance.previous` |
| `show_new_balance` | Toggle | All | `TotalRow` val=`data.balance.current`, bold |

---

### `PaymentsSectionControls` (`sections/PaymentsSection.tsx`)

| Setting Key | Type | Visibility | Preview Counterpart |
|---|---|---|---|
| `show_payment_details` | Toggle | All | Entry toggle; renders payment method table |
| `payment_font_size` | Slider 8–14px | When `show_payment_details=true` | `fontSize` on payments container |

**Preview**: `renderPayments()` in `PaymentsSection.tsx` — iterates `data.payments[]`, renders mode + amount rows.

---

### `FooterSectionControls` (`sections/FooterSection.tsx`)

#### Footer Lines

| Setting Key | Type | Visibility | Preview Counterpart |
|---|---|---|---|
| `footer_line1` | Input | All | Displayed as `<div>` |
| `footer_line2` | Input | All | Displayed as `<div>` |
| `footer_line3` | Input | All | Displayed as `<div>` |
| `footer_separator` | Select | All | `<Separator>` or `borderTop` |

#### Thank You Group

| Setting Key | Type | Visibility | Preview Counterpart |
|---|---|---|---|
| `show_thank_you` | Toggle | All | Entry toggle |
| `thank_you_text` | Input | When `show_thank_you=true` | Displayed text |
| `thank_you_size` | Slider 9–18px | When `show_thank_you=true` | `fontSize` |
| `thank_you_color` | ColorField | When `show_thank_you=true` | `color` |

#### Returns Policy

| Setting Key | Type | Visibility | Preview Counterpart |
|---|---|---|---|
| `show_returns_policy` | Toggle | All | Entry toggle |
| `returns_policy_text` | Textarea | When `show_returns_policy=true` | Displayed text |

#### Legal Text

| Setting Key | Type | Visibility | Preview Counterpart |
|---|---|---|---|
| `footer_legal_text` | Textarea | All | Small grey text at bottom of footer |

#### Barcode Group

| Setting Key | Type | Visibility | Preview Counterpart |
|---|---|---|---|
| `show_barcode` | Toggle | All | Entry toggle |
| `barcode_content` | Select (doc-number/total/custom) | When `show_barcode=true` | Determines `barcodeText()` |
| `barcode_custom_text` | Input | When `barcode_content=custom` | 48-bar SVG simulation |

#### QR Code Group

| Setting Key | Type | Visibility | Preview Counterpart |
|---|---|---|---|
| `show_qr` | Toggle | All | Entry toggle |
| `qr_content` | Select (doc-number/company-info/both) | When `show_qr=true` | Determines `qrDataText()` |

#### Signatures Group

| Setting Key | Type | Visibility | Preview Counterpart |
|---|---|---|---|
| `show_cashier_signature` | Toggle | All | Signature line + label |
| `show_client_signature` | Toggle | All | Signature line + label |
| `show_stamp` | Toggle | All | Circular stamp SVG |

---

### `FormattingSectionControls` (`sections/FormattingSection.tsx`)

| Setting Key | Type | Visibility | Preview Counterpart |
|---|---|---|---|
| `paper_width_mm` | Pills (58/80) | Thermal paper only | `paperWidth = paper_width_mm * 3.78` |
| `page_orientation` | Pills (portrait/landscape) | Page paper only | Swaps width/height values |
| `margin_top` | Slider 0–10mm | All | `paddingTop` on preview container |
| `margin_bottom` | Slider 0–10mm | All | `paddingBottom` on preview container |
| `margin_sides` | Slider 0–10mm | All | `paddingLeft/Right` on preview container |
| `line_spacing` | Slider 1–2.5× | All | `lineHeight` on preview container |
| `base_font_size` | Slider 8–14px | All | `fontSize` on preview container |
| `font_family` | Select (4 options) | All | `fontFamily` mapping |

---

### `RulesSection` (`components/RulesSection.tsx`)

| Setting Key | Type | Visibility | Preview Counterpart |
|---|---|---|---|
| `show_header_section` | Toggle (manual override) | All | `tpl.show_header_section` — gates section rendering |
| `show_doc_info_section` | Toggle (manual override) | All | `tpl.show_doc_info_section` |
| `show_items_section` | Toggle (manual override) | All | `tpl.show_items_section` |
| `show_totals_section` | Toggle (manual override) | All | `tpl.show_totals_section` |
| `show_payments_section` | Toggle (manual override) | All | `tpl.show_payments_section` |
| `show_footer_section` | Toggle (manual override) | All | `tpl.show_footer_section` |
| `rules` | RuleCard × N | All | `rulesEngine.evaluate()` in `UniversalPreview.tsx:75-82` — produces `visibility` map and `highlights` |

**Preview integration**: `sectionVisible(section)` and `sectionHighlight(section)` wrap each `<SectionWrap>` in the preview.

---

### Report Section (inline in `TemplateControls.tsx`)

| Setting Key | Type | Visibility | Preview Counterpart |
|---|---|---|---|
| `show_report_header` | Toggle | RPT docs only | Renders report header text + period/cashier |
| `report_header_text` | Input | RPT only | Header text |
| `show_report_footer` | Toggle | RPT only | Renders footer text |
| `report_footer_text` | Input | RPT only | Footer text |
| `show_charts` | Toggle | RPT only | Renders `<ChartSection>` |
| `chart_type` | Pills (bar/pie) | RPT only + `show_charts=true` | recharts BarChart / PieChart |
| `chart_title` | Input | RPT only + `show_charts=true` | Chart title |
| `show_report_period` | Toggle | RPT only | Period dates in header |
| `show_report_cashier` | Toggle | RPT only | Cashier name in header |
| `show_report_summary_cards` | Toggle | RPT only | KPI card grid (6 cards) |
| `show_report_payment_breakdown` | Toggle | RPT only | Payment method pie/table |
| `show_report_top_products` | Toggle | RPT only | Top products table |
| `report_col_widths` | Slider per column | RPT only + `show_report_top_products=true` | Column width inputs |
| `report_col_headers` | Input per column | RPT only + `show_report_top_products=true` | Custom column headers |
| `group_by` | Input | RPT only | UI scaffolding only |
| `sort_by` | Input | RPT only | UI scaffolding only |
| `sort_direction` | Pills (asc/desc) | RPT only | UI scaffolding only |

**Preview**: `renderReport()` in `ReportSection.tsx` — renders KPI cards, charts, top products table, and report header/footer above the totals section.

---

## Preview Renderer: `UniversalPreview.tsx`

```
UniversalPreview                     ← main preview renderer
├── buildEvalContext(data)           ← creates { data, computed } for rules
├── rulesEngine.evaluate()           ← evaluates all rules → visibility + highlights
│
├── Header Section                   ← renderHeader(tpl, co, data, isThermal)
│   ├── Thermal Mode                 ← flexbox layout, all info inline
│   │   ├── LogoRenderer             ← renderLogo()
│   │   ├── Company Name             ← styled div
│   │   ├── Company Info             ← address, phone, NIF, RC, NIS, ICE
│   │   └── Header Separator
│   └── Page Mode (A4/A5)           ← flex row with two columns
│       ├── Left: Logo + Company Info
│       └── Right: Title + InfoRow table (number, date, due, cashier, session)
│
├── Doc Info Section                 ← renderDocInfo(tpl, data, isThermal)
│   ├── Thermal Mode                 ← centered title + DocRow lines
│   └── Page Mode                    ← client detail card (A4) or single row (A5)
│
├── Items Section                    ← renderItems(tpl, data, isThermal)
│   ├── Thermal Mode                 ← flexbox header row + line rows
│   └── Page Mode                    ← HTML table with <thead> + <tbody>
│
├── Report Section (RPT only)       ← renderReport(tpl, data, isThermal, width)
│   ├── Report Header                ← text, period, cashier
│   ├── KPI Summary Cards            ← grid (1 col thermal, 3 col page)
│   ├── Chart Section                ← BarChart / PieChart via recharts
│   ├── Payment Breakdown            ← payment mode distribution
│   ├── Top Products Table           ← product, quantity, total
│   └── Report Footer                ← footer text
│
├── Totals Section                   ← renderTotals(tpl, data, isThermal)
│   ├── Thermal Mode                 ← inline flex TotalRow lines
│   └── Page Mode                    ← right-aligned HTML table
│
├── Payments Section                 ← renderPayments(tpl, data, isThermal)
│   ├── Thermal Mode                 ← flexbox payment rows
│   └── Page Mode                    ← HTML table (A4) or inline (A5)
│
└── Footer Section                   ← renderFooter(tpl, data, isThermal)
    ├── Thermal Mode                 ← Separator + lines + thank you + barcode + QR + signatures
    ├── A4 Mode                      ← Separator + lines + thank you + bank + signatures + stamp
    └── A5 Mode                      ← Separator + lines + thank you + bank + signatures
```

---

## Visibility Rules by Section

| Section | POS Docs (POS) | Invoice Docs (FV, BL, etc.) | Report Docs (RPT) | Warehouse Docs (DDP, BT) |
|---|---|---|---|---|
| Header | ✓ All | ✓ All | ✓ All | ✓ All |
| Document | ✓ All | ✓ All | ✓ All | ✓ All |
| Items | ✓ All | ✓ All | ✗ | ✓ All |
| Totals | ✓ All | ✓ All | ✗ | ✓ All |
| Payments | ✓ All | ✓ All | ✗ | ✓ All |
| Footer | ✓ All | ✓ All | ✓ All | ✓ All |
| Formatting | ✓ All | ✓ All | ✓ All | ✓ All |
| Rules | ✓ All | ✓ All | ✓ All | ✓ All |
| Report Section | ✗ | ✗ | ✓ RPT only | ✗ |

**Note**: The section visibility toggles (*show_header_section*, etc.) are always rendered by the settings registry (`SettingsRegistry.ts`), but the report section's settings are only visible for `RPT` doc type. The `SettingsRegistry.ts` filters per-setting visibility via `supportedDocs` and `supportedPapers` arrays — individual settings can have narrower visibility than their parent section.

## Component File Map

| File | Lines | Role |
|---|---|---|
| `PrintSettingsPage.tsx` | 791 | Page orchestrator — state, callbacks, layout |
| `sections/HeaderSection.tsx` | 211 | Header settings editor + AlignButtons, BorderSelect, CompanyField |
| `sections/DocumentSection.tsx` | 59 | Document settings editor |
| `sections/ItemsSection.tsx` | 224 | Items/columns editor with drag-and-drop |
| `sections/TotalsSection.tsx` | 59 | Totals settings editor |
| `sections/PaymentsSection.tsx` | 23 | Payments settings editor |
| `sections/FooterSection.tsx` | 107 | Footer + barcode/QR/signature editor |
| `sections/FormattingSection.tsx` | 64 | Margins, paper, font editor |
| `sections/ToggleSwitch.tsx` | — | Toggle, SliderField, Section wrappers |
| `components/QuickNav.tsx` | 65 | IntersectionObserver-based nav pills |
| `components/TemplateControls.tsx` | 180 | Composes all section controls + section toggles |
| `components/ColumnManager.tsx` | 111 | Column configuration manager |
| `components/RulesSection.tsx` | 326 | Rule editor with FormulaEditor |
| `components/ChartSection.tsx` | — | recharts BarChart/PieChart |
| `components/ui.tsx` | 194 | UI primitives (Toggle, Slider, Field, Input, Textarea, etc.) |
| `components/TinyBtn.tsx` | 28 | Small icon button |
| `components/DeleteConfirmModal.tsx` | 30 | Delete confirmation dialog |
| `components/ErrorBoundary.tsx` | — | Error boundary for preview |
| `components/PreviewSelector.tsx` | 22 | Routes to UniversalPreview with data conversion |
| `components/preview/UniversalPreview.tsx` | 147 | Main preview orchestrator |
| `components/preview/HeaderSection.tsx` | 104 | Preview header renderer |
| `components/preview/DocInfoSection.tsx` | 95 | Preview doc info renderer |
| `components/preview/ItemsSection.tsx` | 140 | Preview items table renderer |
| `components/preview/TotalsSection.tsx` | 152 | Preview totals renderer |
| `components/preview/PaymentsSection.tsx` | 59 | Preview payments renderer |
| `components/preview/FooterSection.tsx` | 293 | Preview footer renderer |
| `components/preview/ReportSection.tsx` | 139 | Preview report section renderer |
| `components/preview/LogoRenderer.tsx` | 33 | Logo image/fallback renderer |
| `components/preview/shared.tsx` | — | Shared helpers (mm, align, borderStyle, etc.) |
