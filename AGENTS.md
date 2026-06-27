# AGENTS.md — Context Cache for AI Coding Agents

## Date
2026-06-26

---

## Goal
Finish the 80mm receipt template designer — connected to real company data from the API, with full control over columns, totals, footer, margins, and all receipt elements. Printer detection, document-level print config.

---

## Build / Test / Lint
- **Build**: `npm run build` — uses Vite + Rollup (rolldown). Must pass cleanly.
- **Lint**: `npm run lint` — ESLint (config missing in project, not our fault).
- **Laravel**: `php artisan` commands in the project root.

---

## Project Summary
Laravel + React SPA (full SPA with own routing). Vite build with `@vitejs/plugin-react`. No Inertia.

Key directories:
- `resources/js/` — React source (pages, components, hooks, routes)
- `resources/css/` — styles (app.css imports theme/*.css)
- `routes/` — Laravel backend routes (for API)
- `app/` — Laravel PHP backend

---

## Constraints & Preferences
- All CSS must live in `.css` files imported globally via `app.css`.
- Control section components follow `(tpl, update)` prop signature; `HeaderSectionControls` also accepts optional `company` prop.
- `ReceiptTemplate80mm` in `types.ts` is the single source of truth — do not add nested objects beyond its current structure.
- `ReceiptPreview` is stateless; receives `tpl` + optional `company` prop, renders mock data with real company fallback.
- Sidebar `<Link>` hrefs use absolute paths (React Router v7 resolves relative paths from current route, causing bugs).
- `ToggleSwitch.tsx` is the home for shared primitives (`Toggle`, `SliderField`, `Section`, `ColorToggle`) — do NOT create duplicates.

---

## Architecture — New Files

```
resources/js/pages/settings/print-settings/
├── index.ts                          # re-exports all section components & types
├── types.ts                          # ReceiptTemplate80mm, CompanyPreviewData, DetectedPrinter, DocumentPrintConfig + defaultTemplate()
├── ReceiptPreview.tsx                # stateless 302px-wide receipt preview with real company data fallback + logo rendering
└── sections/
    ├── ToggleSwitch.tsx              # shared <Toggle>, <SliderField>, <Section> (accepts id prop), <ColorToggle>
    ├── HeaderSection.tsx             # logo size/align, company info toggles, CompanyField with API badge
    ├── DocumentSection.tsx           # title text/size/bold/align, doc info toggles
    ├── ItemsSection.tsx              # column order/width/visibility, table styling
    ├── TotalsSection.tsx             # HT/TVA/TTC/balance toggles & styling
    ├── FooterSection.tsx             # 3 footer lines, barcode, QR, signatures, stamp
    └── FormattingSection.tsx         # paper width, 4 margins, line spacing, base font size
```

---

## Current State (all complete)
- **PrintSettingsPage.tsx** refactored with 3 tabs: printers, documents, templates
- **Company data integrated**: `useCurrentCompany()` fetches API data → `CompanyPreviewData` → passed to `ReceiptPreview` + `HeaderSectionControls`
- **useSettingsByGroup('print')** imported (placeholder for future API save/load migration)
- **Logo**: renders real `<img>` from `company.logoUrl` or first-letter-in-circle fallback; alignment fixed (flex `justifyContent` in RTL)
- **CompanyField** in `HeaderSection.tsx`: shows "تلقائي من الشركة" badge + API value as placeholder when override field is empty
- **Print CSS**: `@media print` hides UI chrome, shows only receipt paper centered on page
- **QuickNav** in controls column: scrolls to each section via `id`
- **Source info banner** in preview column: shows company name or fallback text
- **handleTestPrint**: opens new window with only receipt paper HTML, then calls `print()`
- **Section** component accepts optional `id` prop for QuickNav anchoring
- Build passes (380 modules, ~2.5s, chunk ~50 kB / 12 kB gzip)

---

## Routing
- `resources/js/routes/index.tsx` → lazy import `/settings/print` → `PrintSettingsPage`
- Sidebar entry in `DashboardLayout.tsx`: `النظام ← إعدادات الطباعة` uses **absolute href** `/settings/print`

---

## CSS
- `resources/css/theme/print-settings.css` (~440 lines) — all print settings styles including:
  - QuickNav (`.ps-tpl-quicknav` with sticky position)
  - Source info banner (`.ps-preview-source-info`)
  - API badge (`.ps-badge-api`)
  - `@media print` rules hiding UI chrome
  - Responsive: `max-width: 900px` collapses grid, hides QuickNav
- Imported globally via `resources/css/app.css` → `@import 'theme/print-settings.css'`

---

## Key Design Decisions
- **Company data fallback chain**: template override → API company data → mock data (`MOCK_COMPANY`). Each step falls back to next if empty.
- **`company` prop on HeaderSectionControls only**: other sections (Document, Items, Totals, Footer, Formatting) don't need company data.
- **Print via `handleTestPrint`**: opens clean window with only receipt paper HTML, avoids browser full-page print.
- **QuickNav as wrapper `<div id>`**: simpler than adding `id` to each `Section`'s internal div.
- **`useSettingsByGroup('print')` called but unused**: placeholder for future migration from `localStorage` to server-side API.

---

## Balance Calculation for Receipt Print (`handlePrintDirect`)
- **`prevBalance`**: fetched via `partyBalancesApi.getOne(clientId)` AFTER the sale is completed. The API returns `current_balance` which INCLUDES the new invoice. We reverse its impact: `prevBalance = max(0, currentBalance - totalTtc + paid)`.
- **`remaining`** (المبلغ المتبقي): unpaid portion of THIS invoice only = `max(0, totalTtc - paid)`.
- **`newBalance`** (الرصيد الجديد): client's total debt after this invoice = `prevBalance + remaining`.
- The balance API call is wrapped in try/catch — if it fails, all values default to 0.
- `lastPaymentRef` stores the paid amount and payment modes from the last completed sale (set in `handleCompleteSale` after API success).

---

## Related API / Backend
- `GET /api/v1/companies/current` → `useCurrentCompany()` → `Company` object with fields: `name`, `address`, `phone`, `nif`, `nis`, `rc`, `ai` (article), `avatar` (logo URL)
- `CompanyPreviewData` maps `ai` → `article`; there is no `ice` field in backend — only template override handles ICE
- `settings` API group `'print'` → `useSettingsByGroup('print')` (unused placeholder)

---

## Completed Tasks
- **✅ API Integration**: Template/DocConfig/Printer CRUD uses DB-first architecture (`PATCH /settings` + `GET /settings/{key}`) with localStorage as cache/fallback.
- **✅ POS Receipt Integration**: `ProfessionalReceipt.tsx` refactored to use `ReceiptPreview` from the template system. Now renders according to `ReceiptTemplate80mm` — pixel-perfect match between preview and printed output. `POSPage` and `POSKioskPage` both build `ReceiptLiveData` from sale snapshots.
- **✅ WebUSB/WebSerial printer communication**: `printThermalViaWebUSB` implemented with device enumeration (no dialog) + fallback dialog. Demo printers only appear when no USB devices detected.
- **✅ Import/Export**: JSON file export/import for template configs added in PrintSettingsPage header.

## Remaining / Future
- **#4 — A4/A5 template types**: Only 80mm receipt template is implemented. A4 (full-page invoice) and A5 (half-page receipt) would need their own preview components, section controls, and printing pipeline. This is a substantial feature.
- **Minor polish**: QuickNav scroll behavior, edge cases in template loading, keyboard shortcuts in the designer.
