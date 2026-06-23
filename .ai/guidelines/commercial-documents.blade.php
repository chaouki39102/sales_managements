{{--
┌─────────────────────────────────────────────────────────────────────┐
│  Commercial Documents — Business Logic                              │
│  File: .ai/guidelines/commercial-documents.blade.php               │
└─────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════
KEY FILES
═══════════════════════════════════════════════════════════

Backend:
  CommercialDocumentController      — CRUD + validate/lock/unlock/cancel/addPayments/qrcode
  CommercialDocumentLineController  — line CRUD
  DocumentComputeController         — computeLine, computeTotals, convert, chain, createReturn, creditCheck
  CommercialDocumentService         — main document service
  CommercialDocumentLineService     — line service
  ComputeLineService                — line price/tax computation engine
  DocumentConversionService         — DEV→BL→FV conversion
  DocumentReturnService             — return/avoir documents
  DocumentStatusService             — status transitions

Frontend:
  pages/documents/CommercialDocumentModal/index.tsx       — main modal
  pages/documents/CommercialDocumentModal/DocumentHeaderSection.tsx
  pages/documents/CommercialDocumentModal/DocumentInfoSection.tsx
  pages/documents/CommercialDocumentModal/DocumentLinesSection.tsx
  pages/documents/CommercialDocumentModal/DocumentPaymentsSection.tsx
  pages/documents/CommercialDocumentModal/DocumentTotalsSection.tsx
  pages/documents/CommercialDocumentModal/ExistingPaymentsTable.tsx
  pages/documents/CommercialDocumentModal/DocumentFooter.tsx
  pages/documents/CommercialDocumentModal/PartyBalanceBadge.tsx
  pages/documents/hooks/useDocumentForm.ts     — main form logic + state
  pages/documents/hooks/useDocumentLookups.ts  — remote data for selects
  pages/documents/hooks/useComputeLine.ts
  pages/documents/hooks/useCreditCheck.ts
  pages/documents/hooks/useAdvancePayments.ts
  pages/documents/hooks/useDocumentChain.ts
  pages/documents/types/document.types.ts
  pages/documents/utils/document.utils.ts


═══════════════════════════════════════════════════════════
PACKAGING UNITS — CRITICAL
═══════════════════════════════════════════════════════════

Model: ProductPackaging — defines pack_quantity for a product/unit combo.
Table: `product_packagings` + `commercial_document_lines`.packaging_id (added 2026_05_19)

Rule:
  ✅ Frontend SENDS:   quantity × pack_quantity  (actual units to backend)
  ✅ Frontend READS:   stored_quantity ÷ pack_quantity  (display in packs)
  ❌ Never send raw pack quantity to backend
  ❌ Never display raw actual quantity to user when packaging is selected


═══════════════════════════════════════════════════════════
DISCOUNTS — CRITICAL
═══════════════════════════════════════════════════════════

Backend accepts ONLY percentage discounts on document lines.

Fixed-amount discount flow:
  1. User enters fixed amount discount
  2. Frontend converts to percentage: (discount_amount / price_ht) × 100
  3. Send percentage to backend
  ❌ Never send raw fixed-amount discount to backend


═══════════════════════════════════════════════════════════
PAYMENTS ARCHITECTURE — 3 MODES
═══════════════════════════════════════════════════════════

Mode: 'free'      — user can add/edit payments freely (draft documents)
Mode: 'additive'  — user can add new payments, cannot edit existing ones
Mode: 'locked'    — all payments locked, no modification allowed (validated documents)

buildDefaultForm() rule:
  ✅ When EDITING an existing document: load payments from document.payments
  ❌ Never return payments: [] for an existing document (causes payments to disappear on modal reopen)

Advance payments: handled by AdvancePaymentService + useAdvancePayments hook


═══════════════════════════════════════════════════════════
PRICE LOOKUP
═══════════════════════════════════════════════════════════

Price lookup uses: ProductPrice model, PriceLevelService
Two levels: Détail / Gros
Price field: price_ht (Hors Taxe) — NEVER use price_ttc for computation base
QuantityDiscount: per price level, per product, quantity brackets

ProductPrice::computePrice() — server-side price computation
ComputeLineService — applies price level, quantity discounts, TVA, Timbre


═══════════════════════════════════════════════════════════
DOCUMENT FORM LOCKING
═══════════════════════════════════════════════════════════

A document is locked for editing when:
  - validated_at IS NOT NULL  (document validated)
  - OR status is a final status (cancelled, closed)

validated_at detection: check document.validated_at in frontend, not document.status alone.
❌ Do NOT lock based only on status string — status names can change.


═══════════════════════════════════════════════════════════
CUSTOMER PRICE LEVEL
═══════════════════════════════════════════════════════════

When a customer (Party) is selected on a document:
  → Auto-update price_level_id from party.price_level_id
  → Recompute all line prices using new price level
  ❌ Do NOT keep the old price level when customer changes


═══════════════════════════════════════════════════════════
DOCUMENT ROUTES — IMPORTANT ORDER
═══════════════════════════════════════════════════════════

Named routes registered BEFORE apiResource to prevent wildcard capture:
  GET  documents/unpaid       — before apiResource('documents')
  GET  documents/overdue      — before apiResource('documents')
  POST documents/compute-line — before apiResource('documents')
  POST documents/compute-totals — before apiResource('documents')

Same pattern for: payments, checks, treasury-accounts, expenses
Always register specific routes before Route::apiResource() calls.
--}}
