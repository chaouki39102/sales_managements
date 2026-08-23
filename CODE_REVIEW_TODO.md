# CODE_REVIEW_TODO.md — Full Code Review Checklist

> Status: **FULL REVIEW COMPLETE** — all 8 sections reviewed (Aug 23, 2026): 81 findings (46 fixed + 35 observations/verified).

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

- [x] `resources/js/lib/api/core/client.ts` — API client, interceptors, extractData
- [x] `resources/js/lib/api/core/types.ts` — core types
- [x] `resources/js/lib/api/core/queryKeys.ts` — query key factory
- [x] `resources/js/lib/api/admin/system.ts` — admin DB switch API
- [x] `resources/js/lib/offline/db.ts` — IndexedDB layer
- [x] `resources/js/lib/offline/offlineAwareApi.ts` — offline interceptor
- [x] `resources/js/lib/offline/syncEngine.ts` — sync engine
- [x] `resources/js/lib/offline/useOffline.ts` — offline hooks
- [x] `resources/js/lib/offline/queueMath.ts` — offline totals
- [x] `resources/js/lib/offline/prepareOffline.ts` — prefetch data
- [x] `resources/js/context/AuthContext.tsx` — auth context
- [x] `resources/js/context/FiscalYearContext.tsx` — fiscal year context
- [x] `resources/js/components/layouts/DashboardLayout.tsx` — main layout

## Section 4 — POS Classic + Pro + Mobile

- [x] `resources/js/pages/pos/POSPage.tsx` — classic POS
- [x] `resources/js/pos-pro/POSProPage.tsx` — POS Pro desktop
- [x] `resources/js/pos-pro/POSProMobilePage.tsx` — POS Pro mobile
- [x] `resources/js/pages/pos/POSKioskPage.tsx` — kiosk POS
- [x] `resources/js/pos/utils/useCartStore.ts` — classic cart store
- [x] `resources/js/pos-pro/store/usePosProCart.ts` — Pro cart store
- [x] `resources/js/pos/hooks/usePOSStore.ts` — classic POS state
- [x] `resources/js/pos-pro/hooks/usePosPro.ts` — Pro state hook
- [x] `resources/js/pos-pro/hooks/usePosProKeyboardShortcuts.ts` — keyboard shortcuts
- [x] `resources/js/pos/components/ProfessionalCart.tsx` — classic cart
- [x] `resources/js/pos-pro/components/POSProCart.tsx` — Pro cart
- [x] `resources/js/pos/components/ProfessionalPaymentModal.tsx` — payment modal
- [x] `resources/js/pos-pro/components/POSProScanbar.tsx` — scanbar
- [x] `resources/js/pos/components/ProductGrid.tsx` — product grid
- [x] `resources/js/pos-pro/components/ReorderableTopCards.tsx` — draggable cards
- [x] `resources/js/pos-pro/components/POSProTopCards.tsx` — top cards
- [x] `resources/js/pos/utils/calculations.ts` — POS math
- [x] `resources/js/pos/utils/printService.ts` — print service

## Section 5 — Portal (Admin + Customer)

- [x] `resources/js/pages/portal/PortalOrdersAdminPage.tsx` — admin orders
- [x] `resources/js/pages/portal/PortalMyOrdersPage.tsx` — customer my orders
- [x] `resources/js/pages/portal/PortalOrdersPage.tsx` — customer catalog
- [x] `resources/js/pages/portal/PortalLoginPage.tsx` — portal login
- [x] `resources/js/pages/portal/PortalLayout.tsx` — portal layout
- [x] `resources/js/pages/portal/PortalDashboardPage.tsx` — portal dashboard
- [x] `resources/js/pages/portal/PortalDocumentsPage.tsx` — portal documents
- [x] `resources/js/pages/portal/PortalStatementPage.tsx` — portal statement
- [x] `resources/js/pages/portal/PortalProfilePage.tsx` — portal profile
- [x] `resources/js/pages/portal/PortalTrackOrderPage.tsx` — order tracking
- [x] `resources/js/pages/portal/PortalPublicOrderPage.tsx` — public order
- [x] `resources/js/lib/api/portal/client.ts` — portal axios instance
- [x] `resources/js/lib/api/portal/portal.ts` — portal API

## Section 6 — Documents Module

- [x] `resources/js/pages/documents/CommercialDocumentPage.tsx` — doc editor
- [x] `resources/js/pages/documents/CommercialDocumentModal/index.tsx` — global quick-create modal (App-level provider)
- [x] `resources/js/pages/documents/CommercialDocumentsPage.tsx` — doc list
- [x] `resources/js/pages/documents/hooks/useCommercialDocumentController.ts` — doc controller hook
- [x] `resources/js/pages/documents/hooks/useDocumentChain.ts` — document chain hook
- [x] `resources/js/pages/documents/components/DocumentChainPanel.tsx` — chain panel
- [x] `resources/js/pages/documents/components/DocumentLinesSection.tsx` — doc lines
- [x] `resources/js/pages/documents/components/ApprovalWorkflow.tsx` — approval badge/actions
- [x] `resources/js/lib/api/endpoints/approvals.ts` — approvals API + batch hook
- [x] `resources/js/pages/documents/components/InvoiceOcrModal.tsx` — OCR modal
- [x] `resources/js/components/global/GlobalDocumentFAB.tsx` — floating action button

## Section 7 — Settings + Print System

- [x] `resources/js/pages/settings/print-settings/PrintSettingsPage.tsx` — print settings
- [x] `resources/js/pages/settings/print-settings/services/SettingsRegistry.ts` — settings registry
- [x] `resources/js/pages/settings/print-settings/services/SettingsSerializer.ts` — serializer
- [x] `resources/js/pages/settings/print-settings/services/PrintFieldResolver.ts` — field resolver
- [x] `resources/js/pages/settings/print-settings/components/preview/UniversalPreview.tsx` — preview
- [x] `resources/js/pages/settings/print-settings/components/preview/StickerLabel.tsx` — sticker renderer
- [x] `resources/js/pages/settings/sticker-designer/StickerCanvas.tsx` — sticker canvas
- [x] `resources/js/pages/settings/sticker-designer/StickerDesignerPage.tsx` — sticker designer
- [x] `resources/js/pages/settings/sticker-designer/ElementProperties.tsx` — element inspector
- [x] `resources/js/pages/settings/print-settings/components/shared/TemplatePrintModal.tsx` — print modal

## Section 8 — Shared Hooks + Components

- [x] `resources/js/hooks/useConfirm.ts` — confirm hook
- [x] `resources/js/hooks/useNotification.ts` — notification hook
- [x] `resources/js/hooks/useBarcodeScan.ts` — barcode scan hook
- [x] `resources/js/components/ui/ConfirmDialog.tsx` — confirm dialog
- [x] `resources/js/components/ui/Modal.tsx` — shared modal
- [x] `resources/js/components/ui/SimpleTable.tsx` — table component
- [x] `resources/js/lib/wa.ts` — WhatsApp utilities
- [x] `resources/js/lib/fiscalQr.ts` — QR parser
- [x] `resources/js/lib/invoiceOcr.ts` — OCR parser

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
| 35 | 3 | High | Race condition | `useOffline.ts` | useSync | Single-flight guard was a per-instance `syncingRef`, but `useSync()` mounts in 3 components at once (OfflineIndicator, SyncDashboard, POS Pro Mobile) — one `online` event could start MULTIPLE concurrent replays of the same queue → duplicate document creates on the server. Lock is now module-level (`syncingGlobal`) — one replay per app, others no-op | Fixed |
| 36 | 3 | Low | Dead state | `useOffline.ts` | useSync | `lastError` was never set (only reset to null) — consumers could never display a sync failure. Now try/catch around replay sets it via `errorMessage(e)` and rethrows (contract preserved) | Fixed |
| 37 | 3 | Medium | Dead code / phantom endpoints | `system.ts` + `useAdminSystem.ts` + `lib/admin.ts` | maintenanceApi | `scheduler`/`backup` methods targeted routes that do not exist in `routes/api_admin.php`; the `runScheduler`/`exportBackup` mutations were unreachable. Removed across all three layers (grep-verified zero consumers) | Fixed |
| 38 | 3 | Info | Observation | `offlineAwareApi.ts` | GET fallback | Offline GET fallback returns `data: []` even for uncached single-resource GETs — consumers see an empty result instead of an error; established design decision, left as-is. Also: offline mutations don't invalidate the local GET cache (replay/syncEngine owns invalidation) | Observation |
| 39 | 3 | Info | Observation | `queueMath.ts` | computeQueuedDocumentTotals | Queued offline totals preview omits the fiscal stamp in `net_to_pay` — the server recomputes authoritatively on sync; documented local-preview limitation, intentional | Observation |
| 40 | 3 | Info | Observation | `prepareOffline.ts` ↔ `useOfflineReadiness` | prefetch | Prefetch vs real POS queries build params objects independently — JSON.stringify key-order differences could produce offline-cache misses (pre-existing design risk, harmless: just a refetch when online) | Observation |
| 41 | 3 | Info | Observation | `db.ts` | queue helpers | Minor notes: `markOpFailed` uses two transactions (race window moot under single-flight sync); `clearPendingOps()` is cross-tenant but only invoked by test specs (grep-verified); `scopedBySlug(undefined)` intentionally returns all rows (documented). DB_VERSION 2 + repair-in-place upgrade matches Phase 68 follow-up rules | Observation |
| 42 | 3 | Info | Observation | `client.ts` | ~L253 | Cosmetic Chinese character 例 inside an Arabic comment; no functional impact | Observation |
| 43 | 4 | Info | Observation | `useCartStore.ts` | ~267 | `clearCart()` correctly resets `invoiceDiscountPct: 0` — consistent with pro store (`usePosProCart.ts:301`). No bug | Verified |
| 44 | 4 | Info | Observation | `useCartStore.ts` | 86–88 | Classic store has no `holdCart` method — hold/restore lifecycle lives entirely in POSPage component state (refs + `clearCart`/`restoreCart`). Separation is intentional, not a gap | Verified |
| 45 | 4 | Info | Observation | `usePosProCart.ts` | 312–333 | `holdCart()` is atomic: single `set()` call snapshots entire state then pushes to `heldCarts`. No race window between snapshot and clear | Verified |
| 46 | 4 | Info | Observation | `usePosProCart.ts` | 335–344 | `restoreCart()` correctly restores `documentId`, `documentNumber`, `documentDate` from held cart. Phase 46 fix (cart-store document provenance) is intact | Verified |
| 47 | 4 | Info | Observation | `calculations.ts` | 86–88 | `recalcItem` fixed-amount early-return does not reset `discount_percentage` — correct by design because `discount_amount` is the sole input in this branch and totals derive from it | Verified |
| 48 | 4 | Info | Observation | `ProfessionalPaymentModal.tsx` | 47–50 | `onConfirm` is required (not optional) in `ProfessionalPaymentModalProps` — no null-guard needed. `onClose` IS optional and correctly guarded via `onClose?.()` | Verified |
| 49 | 4 | Info | Observation | `usePosProKeyboardShortcuts.ts` | 60–82 | Global event listener has `anyModalOpen` guard (checks modal overlays, customer sheet, held sheet, discount popover, etc.) — shortcuts correctly disabled when any UI panel is open | Verified |
| 50 | 4 | Info | Observation | `POSPage.tsx` + `POSProPage.tsx` | 878 / 928 | Both pages compute `effectiveTotalHt/Tva` identically: `gross = qty × unitPrice × packQty`, `ht = gross − discount`, `tva = ht × tvaRate/100`. Classic reads `snapshot.totals`, Pro reads `pos.totals` — same underlying values | Verified |
| 51 | 4 | Info | Observation | `ReorderableTopCards.tsx` | — | Pointer-based drag-swap with 6px threshold, `setPointerCapture`, localStorage persistence. Interactive elements (`button,a,input,select,textarea`) excluded via `closest()` — no click/swap conflict | Verified |
| 52 | 5 | High | Computed-from-paginated | `PortalPaymentsPage.tsx` | ~180–200 | `totalIn`/`totalOut` summed from paginated `rows` (only ~20/page visible), not all matching rows — summary was always wrong for >1 page of payments | Fixed: backend `payments()` computes `SUM(CASE...)` over ALL matching rows before pagination; frontend reads `data.summary.total_in/total_out` |
| 53 | 5 | Medium | Duplicate hook | `PortalPaymentsPage.tsx` | 201–207 | Local `useDebounce` (6-line copy) duplicated `hooks/useDebounce.ts` (canonical). Fragile — both drift independently | Fixed: removed local copy, imported shared hook |
| 54 | 5 | Medium | Untyped store | `portalStore.ts` | 6 | `portalUser: unknown \| null` — `setPortalUser` accepted `any`, losing all type safety on portal user shape | Fixed: typed as `PortalUser \| null`; setter accepts full user OR updater fn; `PortalProfilePage.tsx` uses merge-update |
| 55 | 5 | Medium | Bot detection | `ImageProxyController.php` | 57–66 | Facebook CDN (`fbcdn.net`) returns 403 for ALL server-side requests regardless of headers (TLS fingerprinting). Proxy redirect still fails for some browsers | Fixed: `imageProxy.ts` skips proxy for known bot-blocked CDNs (fbcdn.net) — returns original URL directly for browser fetch |
| 56 | 5 | Info | Observation | `PortalStatementPage.tsx` | — | Server-side `summary.total_debit/total_credit` are authoritative; `computeStatementSummary` in `portalUtils.tsx` matches server values. NOT a bug | Verified |
| 57 | 5 | Info | Observation | `PortalOrdersAdminPage.tsx` | many | 3 inline `style=` props: WhatsApp brand green `#25D366` (one-off color, no CSS class needed), 2 dynamic width percentages (reactive to editing state). NOT a bug | Verified |
| 58 | 5 | Info | Observation | `PortalMyOrdersPage.tsx` | ~211–212 | `from`/`to` vars used in `Pager` component — NOT dead code despite unused in page title | Verified |
| 59 | 5 | Info | Observation | `PwaInstallBanner.tsx` | — | `beforeinstallprompt` warning is informational — banner correctly calls `preventDefault()` then `prompt()` on user click. Standard PWA pattern | Verified |
| 60 | 6 | Medium | Navigation bug | `CommercialDocumentPage.tsx` | 280 | Convert onSuccess called `onSaved()` AND `onClose()` → after converting, user landed back on the stale source-doc editor. The modal's double-call is correct (overlay close), the page's is not — dropped `onClose()` in the page only | Fixed |
| 61 | 6 | Medium | Dead feature | `DocumentChainPanel.tsx` + both callers | 17/28/283/233 | Chain-panel `onNavigate(docId)` went to ``?document=${docId}`` but ZERO consumers read `?document=` (grep-verified) → clicking a related doc silently did nothing. Signature changed to receive the full `ChainNode`; both callers navigate to `/documents/${type}/${id}/edit` (modal closes itself first; page navigates directly) | Fixed |
| 62 | 6 | Low | Dead state | `useCommercialDocumentController.ts` | 268/683 | Hook-owned `extraTab` state was returned by the hook but never consumed — page (L110) and modal (L100) each keep their own local `extraTab`. Removed both lines | Fixed |
| 63 | 6 | Medium | Draft bleed | `useCommercialDocumentController.ts` | 371-381 | `draftKey` (`doc-draft-{slug}-{code}`) is identical for new vs edit, and the autosave interval ran in EDIT mode too → editing an existing doc clobbered a pending new-doc draft of the same type. Autosave now skips when `isEdit` (+ dep); restore path was already new-only | Fixed |
| 64 | 6 | Medium | Stale closure / N+1 | `CommercialDocumentsPage.tsx` | 1499 | `allColumns` useMemo deps `[isPurch, opColor]` depend only on the route param → `approvalBatch` frozen at mount-time `undefined` forever → STATUS-column badge fell back to its own per-row `useApprovalCheck(documentId)` = N+1 `/approvals/check/{id}` requests, defeating `useApprovalCheckBatch`. Added `approvalBatch` to deps. Performance defect only (badge still rendered correctly via fallback) | Fixed |
| 65 | 6 | Low | Dead prop | `DocumentLinesSection.tsx` | interface | `fill?: boolean` declared + documented as "required for full-page layout" but never destructured, never consumed, and passed by NEITHER caller (page/modal). Removed from interface | Fixed |
| 66 | 6 | Info | Observation | `CommercialDocumentsPage.tsx` | footer/actions | Footer «مرتجع»/«إرسال» buttons wired to onClose only (placeholder UX); PDF export uses raw `window.print()`; clipboard write optional-chained; deleteMut invalidates stock queries even for non-stock docs (over-invalidation is safe); POS edit nav `/pos?edit=` pre-existing pattern left as-is | Verified |
| 67 | 6 | Info | Observation | `CommercialDocumentsPage.tsx` | table/virtual | Virtualization config `items.length > 100` rarely triggers with server pagination (perPage default 15) — harmless; `fetchAllForExport` caps at 10k rows; modals properly gated (`printDocId !== null && companyInfo`) | Verified |
| 68 | 6 | Info | Observation | `CommercialDocumentsPage.tsx` | rowActions | useCallback dep list missing `confirm`/`notify`/`approvalBatch`, but `muts` (TanStack v5 object identity) forces per-render recompute anyway — cosmetic only, no stale behavior | Verified |
| 69 | 6 | Info | Observation | `approvals.ts` + `DocumentLinesSection.tsx` | — | `useApprovalCheckBatch` sorts the memoized docIds array in place — harmless (order irrelevant to consumers); line rows use `key={idx}` index keys with removable lines — benign for fully-controlled inputs (pre-existing app-wide pattern) | Verified |
| 70 | 6 | Info | Observation | `useDocumentChain.ts` + modal lifecycle | — | Global modal correctly unmounts body when closed (Phase B.1 rule intact); convert onSuccess double-call (`onSaved(); onClose()`) IS correct inside the modal since it must dismiss the overlay before navigation | Verified |
| 71 | 7 | High | Design/print divergence | `StickerLabel.tsx` | 222–224 | Absolute-position mode dropped ANY element without a saved position entry (`if (!p \|\| !node) return null;`) → a sticker designed with the default stacked layout printed WITHOUT logo/price/ref (canvas showed them, print silently omitted). Fallback `positions[id] ?? { x: 0, y: 0 }` renders at top-left, matching canvas defaults | Fixed |
| 72 | 7 | Medium | Dead shortcut | `StickerCanvas.tsx` | 274 | Ctrl+wheel zoom guard was `if (!e.ctrlKey \|\| !e.metaKey) return;` — required Ctrl AND Meta pressed simultaneously, so zoom never fired. Fixed to `&&` (Ctrl OR Cmd) | Fixed |
| 73 | 7 | Medium | Native dialog | `StickerDesignerPage.tsx` | ~238 | «قالب جديد» used native `prompt('اسم القالب الجديد:')` — violates the project's no-native-dialogs rule (blocking, unstyled, inconsistent with ConfirmDialog UX). Replaced with shared `Modal` (size sm) + print-settings `Input` + create/cancel buttons; same `createDefaultTpl(name)` + navigate flow on confirm | Fixed |
| 74 | 7 | Info | Observation | `UniversalPreview.tsx` | 82/86 | Payments section intentionally reuses `section_header_width`/`align` dims for thermal receipts (no `section_payments_*` keys exist anywhere in registry/serializer) — deliberate reuse, dedicated keys would be feature work not a bug | Verified |
| 75 | 7 | Info | Observation | `StickerLabel.tsx` | flow mode | Flow-mode root subtracts double margin (~296×146 vs 320×160 design space) — long-shipped legacy fallback behavior; changing it would alter existing users' printed output. Left as-is | Verified |
| 76 | 7 | Info | Observation | `PrintSettingsPage.tsx` | left rail | Template count badges computed from `usePrintTemplates(activeDoc)` (active-doc-only list), so every other doc type shows 0 even when it has templates — cosmetic/misleading only; switching tabs loads the real list | Verified |
| 77 | 7 | Info | Observation | `PrintSettingsPage.tsx` | 285/345 | Test-print popup-blocked fallback is raw `window.print()` (prints whole admin page); `handleToggleActive` optimistic local update isn't reverted on mutation failure. Both pre-existing minor UX edges, no data impact | Verified |
| 78 | 7 | Info | Observation | `ElementProperties.tsx` + canvas refs | — | Number inputs don't clamp while typing and can't be cleared back to auto-size; canvas reads sibling offsetWidth during render (L421–426) which works because Moveable's updateRect re-anchors handles post-drag. Cosmetic notes only | Verified |
| 79 | 8 | Low | Dead code | `invoiceOcr.ts` | parseInvoiceText | Unreachable fallback branches: the `else if (nums.length >= 2)` block tested `layout?.hasQtyCol` / `layout?.trailingTotalCols`, but it can only execute when `layout?.columns?.length` is falsy (a detected layout always has ≥2 columns) → both nested branches permanently dead; their comments described column-aware behavior that actually lives in `assignRowColumns`. Removed (~13 lines), plain first/last heuristic kept — behavior unchanged (82/82 spec green) | Fixed |
| 80 | 8 | Info | Observation | `Modal.tsx` | — | Shared Modal does NOT unmount children when closed (`hidden` class on overlay, body stays mounted) — intentional for lightweight content; heavy-body callers must gate rendering themselves (CommercialDocumentModal post-B.1 is the reference pattern). Escape listener installs once globally, never removed (single harmless listener); stale `dims` if `storageKey` changes while open (next resize heals) | Verified |
| 81 | 8 | Info | Observation | hooks + ui + pure libs | — | Clean: useConfirm (resolveRef promise pattern), useNotification (store wrapper matches contract), useBarcodeScan (refs-during-render = established B.1 pattern), ConfirmDialog (variant maps), SimpleTable (`?? '—'` renders 0/false correctly; expansion state persists across refreshes by key — benign), wa.ts (10 spec tests), fiscalQr.ts (5 spec tests), invoiceOcr.ts (82 spec tests; engine lazy + seam-gated intact) | Verified |

---

## Completed Sections

| Section | Date | Findings | Commit |
|---------|------|----------|--------|
| 1 — Backend Services | Aug 22, 2026 | 13 fixed + 3 observations (rows 1–16 above; rows 1–9 in `ea4eb22`, rows 10–13 this commit) | `ea4eb22` + section commit |
| 2 — Backend Controllers + Models + Routes | Aug 22, 2026 | 16 fixed + 2 observations (rows 17–34 above). Clean: CommercialDocument model, Party model, CommercialDocumentObserver, DataAuditSubscriber, api_admin.php | section commit |
| 3 — Frontend Core + Offline | Aug 22, 2026 | 3 fixed + 5 observations (rows 35–42 above). Clean: types.ts, queryKeys.ts, syncEngine.ts, AuthContext.tsx, FiscalYearContext.tsx, DashboardLayout.tsx. Verified: tsc clean, vitest 391/391 (21 files) | section commit |
| 4 — POS Classic + Pro + Mobile | Aug 22, 2026 | 0 fixed + 9 observations (rows 43–51 above). Clean: all 18 files verified — cart stores, payment modal, keyboard shortcuts, calculations, product grid, scanbar, top cards, draggable cards, print service. Verified: tsc clean, vitest 391/391 | section commit |
| 5 — Portal (Admin + Customer) | Aug 22, 2026 | 4 fixed + 5 observations (rows 52–59 above). Fixed: payments summary (server-side SQL), duplicate useDebounce, portalStore typing, image proxy skip-CDN. Verified: tsc clean, vitest 391/391 (21 files), build 0 errors, 239 precache, SW MATCH | section commit |
| 6 — Documents Module | Aug 23, 2026 | 6 fixed + 5 observations (rows 60–70 above). Fixed: convert double-navigation, chain-panel dead `?document=` feature, dead hook extraTab state, draft autosave bleed into edit mode, stale approvalBatch closure (N+1 approvals), dead `fill` prop. Verified: tsc clean, vitest 391/391 (21 files), build 0 errors, SW MATCH | section commit |
| 7 — Settings + Print System | Aug 23, 2026 | 3 fixed + 5 observations (rows 71–78 above). Fixed: sticker print dropped unsaved-position elements (design/print divergence), dead Ctrl+wheel zoom (`\|\|`→`&&`), native `prompt()` → shared Modal + Input. Clean: SettingsRegistry/Serializer (spec-covered), PrintFieldResolver, TemplatePrintModal, ElementProperties. Verified: tsc clean, vitest + build + SW MATCH this commit | section commit |
| 8 — Shared Hooks + Components | Aug 23, 2026 | 1 fixed + 2 observations (rows 79–81 above). Fixed: dead unreachable layout-fallback branches in OCR parser. Clean: all 9 files — hooks (useConfirm/useNotification/useBarcodeScan), ui (ConfirmDialog/Modal/SimpleTable), pure libs (wa/fiscalQr/invoiceOcr, all spec-covered). Verified: tsc clean, vitest + build + SW MATCH this commit | section commit |

**Review finished** — no sections remain.
