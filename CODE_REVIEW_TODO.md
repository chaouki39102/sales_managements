# CODE_REVIEW_TODO.md — Full Code Review Checklist

> Status: **PENDING** — Created Aug 21, 2026. Pick up any time, task-by-task.

## How to use
- Work task-by-task (one section at a time)
- For each file: read the file, note bugs/suggestions, check off the box
- Commit + push after completing each section
- Move findings into the **Findings** table below as you go

---

## Section 1 — Backend Services

- [ ] `app/Services/CommercialDocumentService.php` — core doc service (stock movements, payments, totals, integrity gate)
- [ ] `app/Services/PaymentSynchronizer.php` — payment lifecycle
- [ ] `app/Services/Portal/PortalOrderService.php` — portal order logic
- [ ] `app/Services/ImportService.php` — product import + pending entities
- [ ] `app/Services/InventoryStockService.php` — stock computation
- [ ] `app/Services/InventoryValuationService.php` — weighted average PMP
- [ ] `app/Services/TransactionIntegrityService.php` — money gate
- [ ] `app/Services/ReportService.php` — all reports
- [ ] `app/Services/PartyBalanceService.php` — party balance
- [ ] `app/Services/SettingService.php` — settings cache

## Section 2 — Backend Controllers + Models + Routes

- [ ] `app/Http/Controllers/Api/V1/CommercialDocumentController.php` — document CRUD
- [ ] `app/Http/Controllers/Api/V1/Portal/PortalOrderController.php` — portal orders
- [ ] `app/Http/Controllers/Api/V1/Admin/AdminSystemSettingsController.php` — DB switch
- [ ] `app/Http/Controllers/Api/V1/HealthController.php` — health endpoint
- [ ] `app/Http/Controllers/Api/V1/PrintTemplateController.php` — print templates
- [ ] `app/Models/CommercialDocument.php` — document model
- [ ] `app/Models/Setting.php` — settings model
- [ ] `app/Models/Product.php` — product model
- [ ] `app/Models/Party.php` — party model
- [ ] `app/Observers/CommercialDocumentObserver.php` — document observer
- [ ] `app/Listeners/DataAuditSubscriber.php` — audit log
- [ ] `routes/api.php` — API routes
- [ ] `routes/api_admin.php` — admin routes
- [ ] `app/Console/Commands/SwitchDatabaseCommand.php` — CLI DB switch

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
| | | | | | | | |

---

## Completed Sections

| Section | Date | Findings | Commit |
|---------|------|----------|--------|
| | | | |
