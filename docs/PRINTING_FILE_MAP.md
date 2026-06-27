# 🖨️ Printing System — Comprehensive File Map

**Generated**: 2026-06-27  
**Context**: Full audit of the A4/A5 printing pipeline from POS sale → preview → printed document.

---

## 1. Frontend — React (TypeScript)

### 1.1 Types & Interfaces

| File | Lines | Role |
|------|-------|------|
| `resources/js/pages/settings/print-settings/types.ts` | ~300 | Single source of truth: `ReceiptTemplate80mm`, `DocumentPrintConfig`, `DetectedPrinter`, `CompanyPreviewData`, `TemplateLiveData`, `ReceiptLiveData` (proxy), `defaultTemplate()`, `MOCK`, `MOCK_COMPANY` |
| `resources/js/pos/types.ts` | (check) | `receiptSnapshot` — shape used to pass sale data from `POSPage` into receipt preview/print |
| `resources/js/types/index.ts` | global | `CartItem`, `CartTotals`, `Party` — shared POS types consumed by `PrintService.ts` |

### 1.2 POS Pages (Sale Creation)

| File | Lines | Role |
|------|-------|------|
| `resources/js/pages/pos/POSPage.tsx` | ~1400 | Main POS page. `handleCompleteSale` → fetches client balance → builds `receiptSnapshot` → stores in `lastPaymentRef`. `receiptLiveData` built from snapshot. `handlePrintDirect` opens print window. |
| `resources/js/pages/pos/POSKioskPage.tsx` | ~800 | Self-service kiosk. Independent `kioskLiveData` (no balance/dueDate/payment support). Uses same `ReceiptPreview` via `PreviewSelector`. |

### 1.3 POS Hooks & Utils

| File | Lines | Role |
|------|-------|------|
| `resources/js/pos/hooks/usePrintSettings.ts` | ~120 | Fetches print template + doc config + printer from `printStore.ts`. Returns `template`, `docConfig`, `printer`, `paperWidth`, `printerId`, `enabled`. |
| `resources/js/pos/utils/printService.ts` | 601 | WebUSB thermal printing (`printThermalViaWebUSB`), legacy `window.print()` fallback (`printViaWindow`), `buildReceiptBytes`, Arabic Win-1256 encoder, QR code generation |
| `resources/js/pos/utils/useReceiptRenderer.ts` | ~150 | Renders receipt HTML string from template + live data using `ReceiptPreview` component via `createRoot` + `renderToString` (React 19 `renderToStaticMarkup` equivalent) |

### 1.4 POS UI Components

| File | Lines | Role |
|------|-------|------|
| `resources/js/pos/components/POSSettingsModal.tsx` | ~300 | Settings tab `'print'`: radio for print mode (`thermal` / `browser`), copies selector, print button |
| `resources/js/pos/components/ProfessionalReceipt.tsx` | ~250 | Post-sale receipt modal. Uses `useReceiptRenderer` + `PreviewSelector` with `liveData` prop to render A4/A5 or thermal receipt. |

### 1.5 Template Designer (PrintSettingsPage)

| File | Lines | Role |
|------|-------|------|
| `resources/js/pages/settings/PrintSettingsPage.tsx` | ~900 | Main page: 3 tabs (printers / documents / templates), template designer with QuickNav, undo/redo, import/export, `handleTestPrint`, `handleSave` (calls `dbSaveTemplate`) |
| `resources/js/pages/settings/print-settings/index.ts` | re-export | Barrel file for all section components |
| `resources/js/pages/settings/print-settings/sections/ToggleSwitch.tsx` | ~200 | Shared primitives: `Toggle`, `SliderField`, `Section`, `ColorToggle` |
| `resources/js/pages/settings/print-settings/sections/HeaderSection.tsx` | ~200 | Logo size/align, company info toggles, `CompanyField` |
| `resources/js/pages/settings/print-settings/sections/DocumentSection.tsx` | ~150 | Title text/size/bold/align, doc info toggles |
| `resources/js/pages/settings/print-settings/sections/ItemsSection.tsx` | ~200 | Column order/width/visibility, table styling |
| `resources/js/pages/settings/print-settings/sections/TotalsSection.tsx` | ~150 | HT/TVA/TTC/balance toggles & styling |
| `resources/js/pages/settings/print-settings/sections/FooterSection.tsx` | ~200 | 3 footer lines, barcode, QR, signatures, stamp |
| `resources/js/pages/settings/print-settings/sections/FormattingSection.tsx` | ~200 | Paper width, 4 margins, line spacing, base font size |

### 1.6 Preview Components

| File | Lines | Role |
|------|-------|------|
| `resources/js/pages/settings/print-settings/ReceiptPreview.tsx` | ~300 | 58mm/80mm thermal receipt preview (302px wide). Renders real data from `company` prop or mock fallback. |
| `resources/js/pages/settings/print-settings/A4Preview.tsx` | ~350 | A4 full-page invoice preview. `buildData(tpl, liveData)` converts `ReceiptLiveData` → renderable data. Shows due date, balances, delivery address. |
| `resources/js/pages/settings/print-settings/A5Preview.tsx` | ~250 | A5 half-page receipt preview. Lighter layout (no balances). |
| `resources/js/pages/settings/print-settings/PreviewSelector.tsx` | ~80 | Switches between ReceiptPreview / A4Preview / A5Preview based on `tpl.paper_size`. Also used by `ProfessionalReceipt` + `useReceiptRenderer`. |

### 1.7 API Clients & Storage

| File | Lines | Role |
|------|-------|------|
| `resources/js/lib/api/endpoints/printTemplatesApi.ts` | ~80 | CRUD for `print_templates` table (legacy backend). `getAll`, `getOne`, `save`, `delete`, `duplicate`. |
| `resources/js/lib/api/endpoints/settings.ts` | ~200 | `settingsApi` — generic `get(key)` / `set(key, val)` for `settings` table. `getSettingsByGroup(group)` returns `Record<string, any>`. |
| `resources/js/pos/utils/printStore.ts` | ~150 | `dbSaveTemplate(tpl)`, `dbSaveDocConfig(cfg)`, `dbSavePrinter(p)`, `loadPrintSettings()` — reads/writes `settings` table for all print config. Used by `usePrintSettings` hook. |

### 1.8 Routing & Navigation

| File | Lines | Role |
|------|-------|------|
| `resources/js/components/layouts/DashboardLayout.tsx` | 87 | Sidebar: `{ name: 'إعدادات الطباعة', href: '/settings/print', icon: 'ti-printer' }` (absolute path) |
| `resources/js/components/layouts/DashboardLayout.tsx` | 142 | Breadcrumbs: `'settings/print': { title: 'إعدادات الطباعة', path: 'نظام ← إعدادات الطباعة' }` |
| `resources/js/routes/index.tsx` | (check) | Lazy import: `const PrintSettings = lazy(() => import('@/pages/settings/PrintSettingsPage'))` |

### 1.9 CSS

| File | Lines | Role |
|------|-------|------|
| `resources/css/theme/print-settings.css` | ~440 | All print-settings-specific styles: QuickNav, source info banner, API badge, `@media print`, responsive collapse. Imported via `app.css`. |
| `resources/css/theme/pos.css` | ~350 (receipt) | `.receipt-*` classes for POS receipt modals, `@media print` inside POS, `.btn-thermal` / `.thermal-status` for WebUSB UI |
| `resources/css/app.css` | n/a | Imports `theme/print-settings.css` globally |

---

## 2. Backend — Laravel (PHP)

### 2.1 Controllers

| File | Lines | Role |
|------|-------|------|
| `app/Http/Controllers/Api/V1/SettingController.php` | ~220 | Whitelist includes `print_tpl_*`, `print:*`, `print_doc_configs`, `print_printers`, `print:templates`, `print:doc_configs` |
| `app/Http/Controllers/Api/V1/PrintTemplateController.php` | (check) | CRUD for `print_templates` DB table (legacy — used by `printTemplatesApi.ts`) |

### 2.2 Models

| File | Lines | Role |
|------|-------|------|
| `app/Models/DocumentType.php` | 80 | Has `is_printable` (boolean) + `print_template` (nullable string) fields. Only models — not wired to the new print designer. |
| `app/Models/Setting.php` | (check) | `key` / `value` / `group` — generic key-value store used for all print settings |

### 2.3 Database / Migrations

| File | Role |
|------|------|
| `database/migrations/xxxx_create_print_templates_table.php` | Legacy `print_templates` table |
| `database/migrations/xxxx_create_settings_table.php` | Generic `settings` table (used by current system) |

---

## 3. Other Documents Print Flow

| File | Lines | Role |
|------|-------|------|
| `resources/js/pages/documents/CommercialDocumentModal/index.tsx` | 1031 | Commercial documents (invoices, credit notes, etc.). Line 535: `window.print()` — direct browser print, no template integration. |
| `resources/js/pages/documents/CommercialDocumentModal/DocumentFooter.tsx` | 223 | Footer with print button (`window.print()`) + export (Excel/PDF/JSON/XML) |
| `resources/js/pages/settings/SettingsPage.tsx` | ~2431 | Old settings page. Lines 2384–2431: 'خيارات الطباعة' section with `thermal` / `browser` radio + copies. **Legacy** — POS now uses `POSSettingsModal`. |

---

## 4. Data Flow Diagram

```
POSPage.tsx
  │
  ├── handleCompleteSale()
  │     ├── POST /api/v1/sales          ← create sale
  │     ├── GET partyBalances.getOne()   ← fetch client balance
  │     └── build receiptSnapshot {
  │           items, totals, paid, client, dueDate, prevBalance, newBalance, paymentModes
  │         }
  │         → lastPaymentRef.current = snapshot
  │
  ├── receiptLiveData (modal preview)
  │     └── map from snapshot + company
  │         → ProfessionalReceipt.tsx
  │           → PreviewSelector
  │             ├── ReceiptPreview (58/80mm)
  │             ├── A4Preview (buildData with dueDate + balances)
  │             └── A5Preview (buildData, no balances)
  │
  └── handlePrintDirect()
        ├── read usePrintSettings() → template, docConfig, printer
        ├── if paper_size === '80mm' || '58mm' + printer.type === 'thermal' + USB
        │     → printThermalViaWebUSB()
        └── else
              → build HTML from template + liveData
              → open window → print()
```

## 5. Storage Backends

| Backend | Table/Key | API | Used By |
|---------|-----------|-----|---------|
| **settings** (current) | `print:templates`, `print:doc_configs`, `print_printers` | `SettingController` (`PATCH /settings`, `GET /settings/{key}`) | `usePrintSettings` hook, `printStore.ts`, POS flow |
| **print_templates** (legacy) | `print_templates` table | `PrintTemplateController` (`GET/POST/PUT/DELETE /api/v1/print-templates`) | `printTemplatesApi.ts`, PrintSettingsPage (list + save) |

> PrintSettingsPage saves to **both** backends on save. POS reads only from `settings` table.

## 6. Key Observations

### Unused / Deprecated
- `is_printable` + `print_template` on `DocumentType` model — never read by the new print designer
- `SettingsPage.tsx` lines 2384–2431 (old print settings) — superseded by `POSSettingsModal` + `PrintSettingsPage`
- `printTemplatesApi.ts` → `PrintTemplateController` — legacy backend; `settings` table is the source of truth

### Dual Storage Risk
- `PrintSettingsPage.tsx` saves template to both `print_templates` table (via `printTemplatesApi`) and `settings` table (via `printStore.dbSaveTemplate`)
- POS only reads from `settings` table
- If `dbSaveTemplate` call is removed or fails, POS will use stale template data

### Partial Implementation
- **A4Preview**: `deliveryAddress`, `session`, `paymentTerm` always render empty (no data source in `ReceiptLiveData` / `TemplateLiveData`)
- **A4Preview balances**: `prevBalance`/`newBalance` work correctly (flow through from `handleCompleteSale`)
- **A5Preview**: no balance rows (design choice — too small)
- **POSKioskPage**: no partial payments, no client balance (correct for kiosk use case)
- **CommercialDocumentModal**: uses plain `window.print()` with no template integration — completely separate from the print designer system

### Single Source of Truth
- `ReceiptTemplate80mm` in `types.ts` is the canonical shape for all template config
- `TemplateLiveData` extends `ReceiptTemplate80mm` with runtime-only fields (`dueDate`, `currency`, etc.)
- `ReceiptLiveData` (proxy constant) documents the shape that all preview components expect from POS

## 7. File Count Summary

| Category | Count |
|----------|-------|
| React pages | 4 |
| React components | 13 |
| Hooks/utils | 4 |
| CSS files | 2 |
| PHP controllers | 2 |
| PHP models | 2 |
| **Total** | **27+** |
