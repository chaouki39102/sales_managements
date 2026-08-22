# CODE_REVIEW_TODO.md — Full Code Review Checklist

> Status: **Section 2 COMPLETE** (Aug 22, 2026). Next up: **Section 3 — Frontend Core + Offline**. Pick up any time, task-by-task.

## How to use
- Work task-by-task (one section at a time)
- For each file: read the file, note bugs/suggestions, check off the box
- Commit + push after completing each section
- Move findings into the **Findings** table below as you go

---

## Section 1 — Backend Services

- [x] `app/Services/CommercialDocumentService.php` — core doc service (stock movements, payments, totals, integrity gate)
- [x] `app/Services/PaymentSynchronizer.php` — payment lifecycle
- [x] `app/Services/Portal/PortalOrderService.php` — portal order logic
- [x] `app/Services/ImportService.php` — product import + pending entities
- [x] `app/Services/InventoryStockService.php` — stock computation
- [x] `app/Services/InventoryValuationService.php` — weighted average PMP
- [x] `app/Services/TransactionIntegrityService.php` — money gate
- [x] `app/Services/ReportService.php` — all reports
- [x] `app/Services/PartyBalanceService.php` — party balance
- [x] `app/Services/SettingService.php` — settings cache

## Section 2 — Backend Controllers + Models + Routes

- [x] `app/Http/Controllers/Api/V1/CommercialDocumentController.php` — document CRUD
- [x] `app/Http/Controllers/Api/V1/Portal/PortalOrderController.php` — portal orders
- [x] `app/Http/Controllers/Api/V1/Admin/AdminSystemSettingsController.php` — DB switch
- [x] `app/Http/Controllers/Api/V1/HealthController.php` — health endpoint
- [x] `app/Http/Controllers/Api/V1/PrintTemplateController.php` — print templates
- [x] `app/Models/CommercialDocument.php` — document model
- [x] `app/Models/Setting.php` — settings model
- [x] `app/Models/Product.php` — product model
- [x] `app/Models/Party.php` — party model
- [x] `app/Observers/CommercialDocumentObserver.php` — document observer
- [x] `app/Listeners/DataAuditSubscriber.php` — audit log
- [x] `routes/api.php` — API routes
- [x] `routes/api_admin.php` — admin routes
- [x] `app/Console/Commands/SwitchDatabaseCommand.php` — CLI DB switch

## Section 3 — Frontend Core + Offline

- [ ] `resources/js/lib/api/core/client.ts` — API client, interceptors, extractData
- [ ] `resources/js/lib/api/core/types.ts` — core types
- [ ] `resources/js/lib/api/core/queryKeys.ts` — query key factory
- [ ] `resources/js/lib/api/admin/system.ts` — admin DB switch API
- [ ] `resources/js/lib/offline/db.ts` — IndexedDB layer
- [ ] `resources/js/lib/offline/offlineAwareApi.ts` — offline interceptor
- [ ] `resources/js/lib/offline/syncEngine.ts` — sync engine
- [ ] `resources/js/lib/offline/useOffline.ts` — offline hooks
- [ ] `resources/js/lib/offline/queueMath.ts` — offline totals
- [ ] `resources/js/lib/offline/prepareOffline.ts` — prefetch data
- [ ] `resources/js/context/AuthContext.tsx` — auth context
- [ ] `resources/js/context/FiscalYearContext.tsx` — fiscal year context
- [ ] `resources/js/components/layouts/DashboardLayout.tsx` — main layout

## Section 4 — POS Classic + Pro + Mobile

- [ ] `resources/js/pages/pos/POSPage.tsx` — classic POS
- [ ] `resources/js/pos-pro/POSProPage.tsx` — POS Pro desktop
- [ ] `resources/js/pos-pro/POSProMobilePage.tsx` — POS Pro mobile
- [ ] `resources/js/pages/pos/POSKioskPage.tsx` — kiosk POS
- [ ] `resources/js/pos/utils/useCartStore.ts` — classic cart store
- [ ] `resources/js/pos-pro/store/usePosProCart.ts` — Pro cart store
- [ ] `resources/js/pos/hooks/usePOSStore.ts` — classic POS state
- [ ] `resources/js/pos-pro/hooks/usePosPro.ts` — Pro state hook
- [ ] `resources/js/pos-pro/hooks/usePosProKeyboardShortcuts.ts` — keyboard shortcuts
- [ ] `resources/js/pos/components/ProfessionalCart.tsx` — classic cart
- [ ] `resources/js/pos-pro/components/POSProCart.tsx` — Pro cart
- [ ] `resources/js/pos/components/ProfessionalPaymentModal.tsx` — payment modal
- [ ] `resources/js/pos-pro/components/POSProScanbar.tsx` — scanbar
- [ ] `resources/js/pos/components/ProductGrid.tsx` — product grid
- [ ] `resources/js/pos-pro/components/ReorderableTopCards.tsx` — draggable cards
- [ ] `resources/js/pos-pro/components/POSProTopCards.tsx` — top cards
- [ ] `resources/js/pos/utils/calculations.ts` — POS math
- [ ] `resources/js/pos/utils/printService.ts` — print service

## Section 5 — Portal (Admin + Customer)

- [ ] `resources/js/pages/portal/PortalOrdersAdminPage.tsx` — admin orders
- [ ] `resources/js/pages/portal/PortalMyOrdersPage.tsx` — customer my orders
- [ ] `resources/js/pages/portal/PortalOrdersPage.tsx` — customer catalog
- [ ] `resources/js/pages/portal/PortalLoginPage.tsx` — portal login
- [ ] `resources/js/pages/portal/PortalLayout.tsx` — portal layout
- [ ] `resources/js/pages/portal/PortalDashboardPage.tsx` — portal dashboard
- [ ] `resources/js/pages/portal/PortalDocumentsPage.tsx` — portal documents
- [ ] `resources/js/pages/portal/PortalStatementPage.tsx` — portal statement
- [ ] `resources/js/pages/portal/PortalProfilePage.tsx` — portal profile
- [ ] `resources/js/pages/portal/PortalTrackOrderPage.tsx` — order tracking
- [ ] `resources/js/pages/portal/PortalPublicOrderPage.tsx` — public order
- [ ] `resources/js/lib/api/portal/client.ts` — portal axios instance
- [ ] `resources/js/lib/api/portal/portal.ts` — portal API

## Section 6 — Documents Module

- [ ] `resources/js/pages/documents/CommercialDocumentPage.tsx` — doc editor
- [ ] `resources/js/pages/documents/CommercialDocumentsPage.tsx` — doc list
- [ ] `resources/js/pages/documents/hooks/useCommercialDocumentController.ts` — doc controller hook
- [ ] `resources/js/pages/documents/components/DocumentLinesSection.tsx` — doc lines
- [ ] `resources/js/pages/documents/components/InvoiceOcrModal.tsx` — OCR modal
- [ ] `resources/js/components/GlobalDocumentFAB.tsx` — floating action button

## Section 7 — Settings + Print System

- [ ] `resources/js/pages/settings/print-settings/PrintSettingsPage.tsx` — print settings
- [ ] `resources/js/pages/settings/print-settings/services/SettingsRegistry.ts` — settings registry
- [ ] `resources/js/pages/settings/print-settings/services/SettingsSerializer.ts` — serializer
- [ ] `resources/js/pages/settings/print-settings/services/PrintFieldResolver.ts` — field resolver
- [ ] `resources/js/pages/settings/print-settings/components/preview/UniversalPreview.tsx` — preview
- [ ] `resources/js/pages/settings/print-settings/components/preview/StickerLabel.tsx` — sticker renderer
- [ ] `resources/js/pages/settings/sticker-designer/StickerCanvas.tsx` — sticker canvas
- [ ] `resources/js/pages/settings/sticker-designer/StickerDesignerPage.tsx` — sticker designer
- [ ] `resources/js/pages/settings/sticker-designer/ElementProperties.tsx` — element inspector
- [ ] `resources/js/components/shared/TemplatePrintModal.tsx` — print modal

## Section 8 — Shared Hooks + Components

- [ ] `resources/js/hooks/useConfirm.ts` — confirm hook
- [ ] `resources/js/hooks/useNotification.ts` — notification hook
- [ ] `resources/js/hooks/useBarcodeScan.ts` — barcode scan hook
- [ ] `resources/js/components/ui/ConfirmDialog.tsx` — confirm dialog
- [ ] `resources/js/components/ui/Modal.tsx` — shared modal
- [ ] `resources/js/components/ui/SimpleTable.tsx` — table component
- [ ] `resources/js/lib/wa.ts` — WhatsApp utilities
- [ ] `resources/js/lib/fiscalQr.ts` — QR parser
- [ ] `resources/js/lib/invoiceOcr.ts` — OCR parser

---

## Review Focus Areas (per section)

### Backend
- SQL injection risks
- Race conditions in concurrent requests
- Missing soft-delete guards on raw DB queries (`DB::table` without `whereNull('deleted_at')`)
- N+1 query patterns
- Missing input validation
- Dead code / unused methods
- Cache invalidation bugs (SettingsSeeder cache clearing)
- Transaction boundary correctness
- LSP violations (controller method signatures)

### Frontend Core
- Stale closures in callbacks/refs
- Memory leaks (missing cleanup, unclosed subscriptions)
- Race conditions in async operations
- Missing error boundaries
- Unnecessary re-renders / performance
- Dead code / unused imports
- TypeScript `any` type abuse
- Missing null/undefined guards
- IndexedDB version migration bugs

### POS
- Cart state consistency across hold/restore/switch
- Payment modal balance calculation correctness
- Pack qty x price correctness (Phase 50-51 contract)
- Discount calculation edge cases (%/fixed amount modes)
- Keyboard shortcut conflicts
- Virtualization bugs in product grid/cart
- Race conditions in concurrent mutations

### Offline
- IndexedDB version migrations (DB_VERSION)
- Tenant scoping of cached data and write queue
- Stale closure issues in sync/retry callbacks
- Data loss scenarios (crash during replay)
- Queue ordering guarantees (FIFO, verbatim method+url)
- Error handling for permanent vs transient failures
- Cache TTL correctness

### Portal
- Auth token leakage between admin/portal axios instances
- XSS risks (rendering user content)
- Missing route guards or authorization checks
- State leaks between portal and admin
- N+1 API calls
- Mobile responsiveness issues

### Print/Settings
- Settings serialization round-trip bugs (toApiPayload/fromApiResponse)
- Template initialization bugs (spread defaults over saved)
- Print rendering inconsistencies (A4 vs thermal)
- Sticker designer state bugs (undo/redo, position persistence)

---

## Findings Table

| # | Section | Severity | Category | File | Line | Description | Fix Status |
|---|---------|----------|----------|------|------|-------------|------------|
| 1 | 1 | High | Soft-delete guard | `ReportService.php` | many | 33 raw `DB::table` queries missing `whereNull('deleted_at')` — soft-deleted docs/lines/payments/movements polluted every report | Fixed (`ea4eb22`) |
| 2 | 1 | Medium | Logic bug | `ReportService.php` | aging | Aging report bucketed by today instead of the report's ref date → wrong buckets for historical dates | Fixed (`ea4eb22`) |
| 3 | 1 | High | Transaction boundary | `CommercialDocumentService.php` | validateDocument | Validation ran outside the create/update transaction — a failing doc could pass validation then fail mid-write with no re-check inside the transaction | Fixed (`ea4eb22`) |
| 4 | 1 | High | State consistency | `CommercialDocumentService.php` | afterUpdate | Line edits did not refresh document amounts/status (validated_by, paid status) after line replacement | Fixed (`ea4eb22`) |
| 5 | 1 | Low | Dead code | `CommercialDocumentService.php` | stock movements | Movement create payload carried a dead `commercial_document_id` key (`stock_movements` has only `commercial_document_line_id`) | Fixed (`ea4eb22`) |
| 6 | 1 | Medium | Guard | `PaymentSynchronizer.php` | syncPayments | Switching a payment to a treasury mode kept stale cash fields; portal-context payments wrote null `user_id` | Fixed (`ea4eb22`) |
| 7 | 1 | Medium | Robustness | `TransactionIntegrityService.php` | stamp check | Fiscal-stamp verification threw on corrupt totals (turning the gate into a crash); float clamp removed per spec | Fixed (`ea4eb22`) |
| 8 | 1 | Medium | Cache invalidation | `SettingService.php` | set | Per-key writes did not forget that key's cache (only bulk forget existed) — stale reads for 24h TTL keys | Fixed (`ea4eb22`) |
| 9 | 1 | Medium | Parsing | `ImportService.php` | mapWithKeys/parsers | String-cast row keys broke numeric lookups; number/date parsers mishandled locale formats and rc_date column | Fixed (`ea4eb22`) |
| 10 | 1 | High | Fiscal-year scope | `PartyBalanceService.php` | getHistory/getDetailedHistory | Statement documents + payments queries missing `fiscal_year_id` filter — statement Σ never matched the balance endpoint for multi-year data (every other method in the class was scoped) | Fixed |
| 11 | 1 | Medium | Race condition | `PortalOrderService.php` | convertToSale / settlePayment | `is_converted` / `payment_status` read outside the transaction — concurrent convert calls or webhook redeliveries could both pass the check on MySQL. Now: `lockForUpdate` row re-read inside each transaction (no-op on SQLite dev, enforced on MySQL) | Fixed |
| 12 | 1 | Low | Performance | `PortalOrderService.php` | update() | `$doc->fresh()` called 3× = 3 redundant queries; single fresh instance reused | Fixed |
| 13 | 1 | Low | Data safety + dead code | `InventoryValuationService.php` | updateWeightedAverage/getFIFOCost | PMP stored a NEGATIVE cost when value_out > value_in with qty > 0 (corrupt data) — now guarded; unused `$usedLots` accumulation removed | Fixed |
| 14 | 1 | Info | Observation | `InventoryValuationService.php` | FIFO/LIFO | FIFO and LIFO getters are near-duplicates (~40 lines) — candidate for extraction, left as-is (working money code) | Observation |
| 15 | 1 | Info | Observation | `InventoryValuationService.php` | PMP | Weighted average intentionally excludes opening-balance stock (established design from Phase 49 era); getProductRecap excludes zero-cost lines from effective cost (margins slightly optimistic there) | Observation |
| 16 | 1 | Info | Observation | `app/Models/Traits/HasCompany.php` | comments | Pre-existing mojibake in Arabic comments (unrecoverable bytes, cosmetic only). Trait itself is correct: global CompanyScope via bootHasCompany explains why Eloquent queries need no manual company_id filters | Observation |
| 17 | 2 | High | Phantom columns | `Product.php` | is_low_stock accessor | Referenced non-existent `products.current_stock` / `type` columns (SQL error on every access). Rewritten atop `InventoryStockService::getStockAt` via `runAs` + per-company memoized map | Fixed |
| 18 | 2 | High | Phantom columns | `AlertEngine.php` | checkLowStock | Phantom `products.current_stock` + `stock_movements.movement_type_id` columns (no such column — FK is `stock_movement_type_id`); unused `use App\Models\Product;`. Rewritten atop getStockAt rows via `runAs` | Fixed |
| 19 | 2 | High | Phantom columns | `DashboardService.php` | getInventorySummary | Same phantom columns for low-stock count + monthly in/out sums. Rewritten: count from getStockAt rows, sums via join to `stock_movement_types` on `smt.direction` >0/<0 | Fixed |
| 20 | 2 | High | Phantom columns | `InventoryReportService.php` | getStockSummary/getLowStockProducts | Same rewrite atop getStockAt (optional warehouse param, out/low/value/product counts) | Fixed |
| 21 | 2 | Medium | Race condition | `PortalOrderController.php` | pay | Gateway intent creation ran outside any transaction — concurrent calls (double click / two tabs) could create two payment intents. Now `assertPayable` re-checked under `lockForUpdate` inside `DB::transaction`; pending-intent idempotent return moved under the lock | Fixed |
| 22 | 2 | Medium | Validation gap | `PortalOrderController.php` | store (guest) | No max-length validation → MySQL strict-mode 1406 = 500 instead of 422. Added validate on customer_name/phone/address before any DB touch | Fixed |
| 23 | 2 | Medium | Cross-tenant write | `PrintTemplateController.php` | store/update | Accepted client-sent `company_id`/`id` into fill — mass-assignment could move a template to another company. Both unset | Fixed |
| 24 | 2 | Medium | Logic bug | `PrintTemplateController.php` | installLibrary | `CompanyContextService::get()?->id` read `->id` off an int (always null) so the duplicate-install check never matched. Now `(get() ?? 0)` | Fixed |
| 25 | 2 | Low | Logic bug | `PrintTemplate.php` | saving hook | `where('id','!=', $model->id)` with null id on create matched nothing → old default stayed flagged (two defaults per doc type). exists-guard added | Fixed |
| 26 | 2 | Medium | Cache invalidation | `AdminSystemSettingsController.php` | update | Raw `DB::table` upsert bypasses model events — `Setting::clearCacheForKey($key)` never fired, stale reads up to 24h TTL. Added after each key write | Fixed |
| 27 | 2 | Medium | Wrong-driver count | `AdminSystemSettingsController.php` | pendingMigrations | `migrate:status` ran against the DEFAULT connection, not the target driver → DB-status card showed wrong pending count. Now `--database=$driver` | Fixed |
| 28 | 2 | High | Scope bypass | `Setting.php` | getSetting/setSetting | Global CompanyScope invalidated explicit companyId lookups AND the global-null fallback (settings resolved against session company only). `withoutGlobalScopes()` + explicit filters (the methods manage company scope themselves) | Fixed |
| 29 | 2 | Medium | Soft-delete guard | `CommercialDocumentController.php` | index | Party/warehouse name-match subqueries lacked `company_id` + `whereNull('deleted_at')` — cross-tenant names and soft-deleted rows could match document filters | Fixed |
| 30 | 2 | Low | Error surface | `CommercialDocumentController.php` | checkNumber | Only handler without try/catch or authorization — wrapped with `authorizeAction(viewAny)` + `handleError` like its siblings | Fixed |
| 31 | 2 | Medium | Route ordering | `routes/api.php` | print-templates | `GET print-templates/library` registered AFTER `{id}` → shadowed by `show('library')`, endpoint unreachable (probe proved resolution to @show). Moved before `{id}`; probe now resolves @library/@installLibrary | Fixed |
| 32 | 2 | Low | Dead code | `HealthController.php` | buildChecks | Unused `$dbConnected`/`$dbError` params. Signature cleaned | Fixed |
| 33 | 2 | Info | Observation | `SwitchDatabaseCommand.php` | — | Matches all Phase-82 hardening rules (auto-create DB, atomic .env write, subprocess DB_CONNECTION force, post-switch verify); sqlite backslash-doubling works on Windows paths, round-trip verified green | Observation |
| 34 | 2 | Info | Observation | `app/Models/Traits/HasCompany.php` | writes | Cross-tenant write injection remains possible anywhere code sets `company_id` explicitly — mitigated locally at controllers (PrintTemplate unset) rather than hardening the trait mid-review | Observation |

---

## Completed Sections

| Section | Date | Findings | Commit |
|---------|------|----------|--------|
| 1 — Backend Services | Aug 22, 2026 | 13 fixed + 3 observations (rows 1–16 above; rows 1–9 in `ea4eb22`, rows 10–13 this commit) | `ea4eb22` + section commit |
| 2 — Backend Controllers + Models + Routes | Aug 22, 2026 | 16 fixed + 2 observations (rows 17–34 above). Clean: CommercialDocument model, Party model, CommercialDocumentObserver, DataAuditSubscriber, api_admin.php | section commit |
