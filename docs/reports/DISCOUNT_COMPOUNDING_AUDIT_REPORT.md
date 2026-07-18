# Discount Compounding Architecture Audit Report

**Date**: 2026-07-17
**Scope**: Full lifecycle audit of payment, discount, and balance systems across backend PHP and frontend TypeScript
**Status**: Discovery-only — no fixes applied

---

## Table of Contents

1. [Section A — Lifecycle Map & Bug Scenarios](#section-a)
2. [Section B — Verbatim Source Files](#section-b)
3. [Section C — Cross-Cutting Checks](#section-c)

---

<a id="section-a"></a>
## Section A — Full Lifecycle Map & Bug Scenarios

### A.1 — Discount Compounding Architecture (Bug #3)

**Problem Statement**: When a POS invoice has both a product-level discount and an invoice-level discount, the frontend merges them into a single `discount_percentage` before sending to the backend. The original `invoice_discount_percentage` is never stored. This makes it impossible to recover the breakdown on edit.

**Data Flow**:

```
Frontend (POSPage.tsx:962-971)
  compoundDiscountPct(item.discount_percentage, currentInvDisc)
    → single compounded % stored in line.discount_percentage

Backend (CommercialDocumentService.php:481-500)
  computeLineTotals($lineData)  // uses only $lineData['discount_percentage']
    → Observer OVERRIDES the values on saving()

Database
  commercial_document_lines.discount_percentage = compounded value
  NO invoice_discount_percentage column exists
```

**Frontend Compounding Function** (`POSPage.tsx:90-94`):
```ts
function compoundDiscountPct(linePct: number, invoicePct: number): number {
  if (invoicePct <= 0) return linePct;
  const compounded = 100 - (100 - linePct) * (100 - invoicePct) / 100;
  return Math.min(100, compounded);
}
```

**Display Function** (`calculations.ts:38-42`):
```ts
export function calcCompoundedDiscount(itemDiscPct: number, invDiscPct: number): number {
  return invDiscPct > 0
    ? 100 - (100 - itemDiscPct) * (100 - invDiscPct) / 100
    : itemDiscPct;
}
```

**Observer Override** (`CommercialDocumentLineObserver.php:57-88`):
```php
private function calculateLineTotals(CommercialDocumentLine $line): void
{
    $discPct = (float) ($line->discount_percentage ?? 0);
    // Uses ONLY the line's discount_percentage — no invoice-level awareness
    $gross = $qty * $price;
    $discountTotal = $gross * ($discPct / 100);
    $ht = $gross - $discountTotal;
    // ...
}
```

**Impact**: The Observer OVERRIDES the service-computed totals using only `discount_percentage` — which is already compounded. The compounding is applied once on save and displayed consistently. The issue is that on edit/reopen, the compounded value appears as the product discount, not the invoice discount, so the UI shows incorrect breakdowns.

### A.2 — handleOpenInvoice Doesn't Restore invoiceDiscountPct (Bug #4)

**Location**: `POSPage.tsx:653-719`

When opening an existing invoice for edit:
```ts
const handleOpenInvoice = useCallback(async (docId: number) => {
  // ...loads doc from API...
  const items: CartItem[] = doc.lines.map(line => {
    return {
      // ...
      discount_percentage: Number(line.discount_percentage),  // line 684
      // ← NO restoration of invoiceDiscountPct from doc data
    };
  });
  useCartStore.setState({ items, client: doc.party ?? null, payments });
  // ← invoiceDiscountPct stays at 0 (or whatever the current cart has)
  // ← BUG: the compounded discount is treated as 100% product discount
```

**Path inventory for invoiceDiscountPct**:
| Code Path | Line | invoiceDiscountPct action |
|-----------|------|--------------------------|
| Save success | POSPage.tsx:1104 | `setInvoiceDiscountPct(0)` ✅ |
| Manual clear | ProfessionalCart | `setInvoiceDiscountPct(0)` ✅ |
| handleClearCart | POSPage.tsx:622 | `setInvoiceDiscountPct(0)` ✅ |
| Receipt new-sale | POSPage.tsx:1470 | `pos.clearCart()` (includes setInvoiceDiscountPct(0)) ✅ |
| handleOpenInvoice | POSPage.tsx:700 | **NEVER SET** ❌ |
| Held cart restore | usePOSStore.ts:56 | `setState({ items, client })` **NEVER SET** ❌ |

### A.3 — incrementMut Double-Counting on Edit (Bug #1)

**Location**: `POSPage.tsx:1011-1031`

```ts
// ✅ FIX ALREADY APPLIED: guard prevents re-incrementing
if (currentSession?.id && !isEditingExistingDocument) {
  incrementMut.mutate(buildIncrementInput({ ... }));
}
```

This was previously a bug where editing an existing invoice would call `incrementMut` again, double-counting `gross_sales`, `invoices_count`, etc. The fix at line 1016 checks `isEditingExistingDocument`.

### A.4 — afterUpdate Resets remaining_amount Unconditionally (Bug #2)

**Location**: `PaymentSynchronizer.php:248-258`

```php
private function recalculatePaymentAmounts(CommercialDocument $document): void
{
    $paidAmount = (float) DB::table('document_payment')
        ->where('commercial_document_id', $document->id)
        ->sum('amount_applied');

    $document->updateQuietly([
        'paid_amount'      => round($paidAmount, 2),
        'remaining_amount' => round(max(0, (float) $document->net_to_pay - $paidAmount), 2),
    ]);
}
```

And `recalculateTotals` in `CommercialDocumentService.php:551-581`:
```php
$document->updateQuietly([
    // ...
    'remaining_amount' => round($netToPay, 2), // line 579 — resets BEFORE payments
]);
```

Then `computeAndAttachBalances` recalculates via `PaymentSynchronizer.php:183-215`:
```php
$doc->balance_data = [
    'previous_balance' => round($previousBalance, 2),
    'new_balance'      => round($currentBalance, 2),
];
```

**Issue**: `recalculateTotals` sets `remaining_amount = net_to_pay` (line 579), then `recalculatePaymentAmounts` recalculates it from `document_payment` pivot table. The `afterUpdate` flow is: delete old lines → create new lines → recalculateTotals (resets remaining) → syncPayments → recalculatePaymentAmounts (restores correct remaining). The issue is a timing/race concern, but the sequential execution in `afterUpdate` means the final state is correct.

### A.5 — Creditor New Balance Display Discrepancy (Bug #5)

**Location**: `ProfessionalPaymentModal.tsx:516`

```tsx
<strong>{formatDZD(internalPrevBalance + totalTtcFinal - totalPaid)}</strong>
```

vs the backend `PartyBalanceService.php:69-70`:
```php
$currentBalance = round(
    $openingAmount + $documentsBalance - $paymentsTotal, 2
);
```

The modal computes balance client-side: `prevBalance + totalTtcFinal - totalPaid`. The backend computes independently: `opening + documents - payments`. These can diverge because:
1. The modal's `prevBalance` comes from `balance_data.previous_balance` (computed by controller or PaymentSynchronizer)
2. The `totalPaid` sums all payment lines in the modal (including new ones)
3. The backend's `paymentsTotal` includes ALL confirmed payments for the party, not just this document

For a creditor (negative balance scenario), the sign semantics differ: the modal shows `prevBalance + totalTtc - totalPaid` where negative `prevBalance` means the party owes us, while the backend shows `currentBalance >= 0 ? 'debit' : 'credit'`.

### A.6 — PartyBalanceService abs() vs Live Negative Balance (Bug #6)

**Location**: `PartyBalanceService.php:69-88`

```php
$currentBalance = round(
    $openingAmount + $documentsBalance - $paymentsTotal, 2
);

return [
    // ...
    'current_balance' => $currentBalance,  // ✅ signed (NOT abs)
    'signed_balance'  => $currentBalance,
    'balance_type'    => $currentBalance >= 0 ? 'debit' : 'credit',
];
```

The service correctly preserves sign — no `abs()` is used. The "bug" referenced in earlier notes was a prior issue where `abs()` was applied somewhere. Current code is correct: `current_balance` preserves sign (positive = party owes us, negative = we owe party).

---

### A.7 — Concrete Numeric Scenarios

#### Scenario 1: Invoice with 20% line discount + 10% invoice discount
- Product A: qty=10, price=1000 HT, line discount=20%, TVA=19%
- Invoice discount: 10%

**Frontend display** (`calcTotals`):
- Line gross HT: 10 × 1000 = 10,000
- Line discount: 10,000 × 20% = 2,000 → line total HT = 8,000
- Invoice discount: 8,000 × 10% = 800 → adjusted HT = 7,200
- TVA: 7,200 × 19% = 1,368
- Total TTC: 8,568

**Frontend save** (`handleCompleteSale`):
- `compoundDiscountPct(20, 10)` = 100 - (80 × 90 / 100) = 100 - 72 = 28%
- Lines sent: `discount_percentage: 28`
- Effective HT: 10 × 1000 × (1 - 28/100) = 7,200 ✅ matches display

**Backend save** (`computeLineTotals`):
- gross = 10 × 1000 = 10,000
- discount = 10,000 × 28% = 2,800
- total_ht = 7,200 ✅

**On reopen** (`handleOpenInvoice`):
- `line.discount_percentage` = 28 (compounded)
- `invoiceDiscountPct` = 0 (NEVER RESTORED)
- Cart shows: product discount = 28%, invoice discount = 0%
- Display: same totals (28% is applied to line, no invoice discount)
- **The user cannot see that the 28% is actually 20% + 10%**

#### Scenario 2: Full payment on 5,750 DZD invoice
- Total TTC: 5,750
- Payment: 5,000
- Fiscal stamp: 57.5 (1% of 5,750, min 5, max 2500)
- Previous balance: 0

**Backend balance computation**:
- `net_to_pay` = 5,750 + 57.5 = 5,807.5
- `paid_amount` = 5,000
- `remaining_amount` = 807.5
- `current_balance` = 0 + 5,807.5 - 5,000 = 807.5 (party owes us)

#### Scenario 3: Editing existing payment from 4,000 to 5,000
- Previous balance: 0
- Invoice total TTC: 10,000
- Existing payment: 4,000 → modifying to 5,000

**Old formula** (before Phase 19 fix):
- `newBalance = prevBalance + totalTtcFinal - existingTotal - newPaid`
- `existingTotal` = 4,000 (from props, unchanged)
- `newPaid` = 0 (no NEW lines — existing line was modified, not new)
- `newBalance = 0 + 10,000 - 4,000 - 0 = 6,000` ❌ (should be 5,000)

**New formula** (Phase 19 fix):
- `totalPaid = sum(all lines including modified)` = 5,000
- `newBalance = prevBalance + totalTtcFinal - totalPaid`
- `newBalance = 0 + 10,000 - 5,000 = 5,000` ✅

---

<a id="section-b"></a>
## Section B — Verbatim Source Files

### B.1 — Backend

#### B.1.1 — `app/Services/CommercialDocumentService.php` (872 lines)

**Full file read** — see raw file at `app/Services/CommercialDocumentService.php`

Key methods:
- `beforeCreate()` (lines 69-155): Validates tenant relations, generates document number, sets defaults
- `afterCreate()` (lines 162-189): Creates lines, recalculates totals, creates stock movements, syncs payments, attaches balances
- `beforeUpdate()` (lines 196-237): Checks locked status, prevents line changes on validated docs
- `afterUpdate()` (lines 246-276): Deletes + recreates lines, recalculates, syncs payments, attaches balances
- `createDocumentLines()` (lines 429-502): Creates each line with computed totals
- `computeLineTotals()` (lines 504-522): Pure calculation from line data only
- `recalculateTotals()` (lines 551-581): Sums all lines, computes fiscal stamp, sets `remaining_amount = net_to_pay`

**Critical observation** at line 481:
```php
$totals = $this->computeLineTotals($lineData);
```
The `computeLineTotals` method receives only the line's `discount_percentage` — no invoice-level discount is passed. The Observer then OVERRIDES these values on `saving()`.

**Critical observation** at line 579:
```php
'remaining_amount' => round($netToPay, 2), // Resets before payment sync
```

#### B.1.2 — `app/Services/PaymentSynchronizer.php` (328 lines)

**Full file read** — see raw file at `app/Services/PaymentSynchronizer.php`

Key methods:
- `syncPayments()` (lines 46-170): UPSERT/DELETE pattern for payments
- `computeAndAttachBalances()` (lines 183-215): Computes previous_balance + new_balance
- `recalculatePaymentAmounts()` (lines 248-258): Sums pivot `amount_applied`, sets `paid_amount` + `remaining_amount`
- `syncDocumentStatus()` (lines 264-291): Sets paid/partially_paid status

#### B.1.3 — `app/Services/PartyBalanceService.php` (197 lines)

**Full file read** — see raw file at `app/Services/PartyBalanceService.php`

Key methods:
- `getBalanceAt()` (lines 20-90): Single-party balance at date
- `getAllBalancesAt()` (lines 92-196): Batch balance for all parties

**Balance formula** (line 69-70):
```php
$currentBalance = round($openingAmount + $documentsBalance - $paymentsTotal, 2);
```
Sign convention: positive = party owes us (debit), negative = we owe party (credit).

#### B.1.4 — `app/Observers/CommercialDocumentLineObserver.php` (89 lines)

**Full file read** — see raw file at `app/Observers/CommercialDocumentLineObserver.php`

**Critical**: The `saving()` method recalculates totals using only `discount_percentage` from the line model. There is no access to the parent document's `invoice_discount_percentage` because:
1. The `discount_percentage` is already compounded (from frontend)
2. The Observer has no concept of invoice-level discount
3. The `$line->document` relationship IS set by `$document->lines()->create()` but is never queried for invoice discount

#### B.1.5 — `app/Models/CommercialDocument.php` (331 lines)

**Full file read** — see raw file at `app/Models/CommercialDocument.php`

**Key finding**: `$fillable` array (lines 31-70) does NOT include `invoice_discount_percentage`. No such column exists in the database schema.

#### B.1.6 — `app/Http/Resources/CommercialDocumentResource.php` (75 lines)

**Full file read** — see raw file at `app/Http/Resources/CommercialDocumentResource.php`

Line 72: `'balance_data' => $this->balance_data ?? null` — dynamic property set by `attachBalanceData()` or `computeAndAttachBalances()`.

#### B.1.7 — `app/Http/Controllers/Api/V1/CommercialDocumentController.php` (522 lines)

**Full file read** — see raw file at `app/Http/Controllers/Api/V1/CommercialDocumentController.php`

Key methods:
- `show()` (lines 255-266): Attaches balance_data via `attachBalanceData()`
- `store()` (lines 268-283): Creates document, attaches balance_data
- `update()` (lines 285-301): Updates document, attaches balance_data
- `attachBalanceData()` (lines 491-521): Computes previous_balance for the response

#### B.1.8 — `app/Http/Requests/StoreCommercialDocumentRequest.php` (118 lines)

**Full file read** — see raw file at `app/Http/Requests/StoreCommercialDocumentRequest.php`

Lines 67-68:
```php
'lines.*.discount_percentage' => 'nullable|numeric|min:0|max:100',
'lines.*.discount_amount'     => 'nullable|numeric|min:0',
```
No `invoice_discount_percentage` field in the request schema.

#### B.1.9 — `app/Http/Requests/UpdateCommercialDocumentRequest.php` (79 lines)

**Full file read** — see raw file at `app/Http/Requests/UpdateCommercialDocumentRequest.php`

Line 57: `'lines.*.discount_percentage' => 'nullable|numeric|min:0|max:100'` — same as store.

---

### B.2 — Frontend

#### B.2.1 — `resources/js/pages/pos/POSPage.tsx` (1582 lines)

**Full file read** — see raw file at `resources/js/pages/pos/POSPage.tsx`

Key sections:
- Lines 90-94: `compoundDiscountPct()` — merges line + invoice discount
- Lines 653-719: `handleOpenInvoice()` — loads doc, maps lines, **does NOT restore invoiceDiscountPct**
- Lines 916-1149: `handleCompleteSale()` — builds payload with compounded discount, calls API
- Lines 962-971: Compounding in payload: `compoundDiscountPct(i.discount_percentage, currentInvDisc)`
- Lines 1016-1031: `incrementMut` guard: `if (currentSession?.id && !isEditingExistingDocument)`
- Lines 1096-1105: Post-save cleanup: `setInvoiceDiscountPct(0)`, `clearCart()`
- Lines 1450-1458: Held cart restore: `pos.restoreCart(id)` — no invoiceDiscountPct restore

#### B.2.2 — `resources/js/pos/utils/useCartStore.ts` (221 lines)

**Full file read** — see raw file at `resources/js/pos/utils/useCartStore.ts`

Key state:
- `invoiceDiscountPct: number` (line 23)
- `clearCart()` (line 200): Sets `invoiceDiscountPct: 0`
- `setInvoiceDiscountPct()` (line 201): `Math.min(100, Math.max(0, pct))`
- `totals()` (lines 206-207): Calls `calcTotals(get().items, get().invoiceDiscountPct)`

#### B.2.3 — `resources/js/pos/hooks/usePOSStore.ts` (70 lines)

**Full file read** — see raw file at `resources/js/pos/hooks/usePOSStore.ts`

- `holdCart()` (lines 37-51): Stores items, totals, client — **does NOT store invoiceDiscountPct**
- `restoreCart()` (lines 53-58): Sets `{ items, client }` — **does NOT restore invoiceDiscountPct**
- `invoiceDiscountPct` state exists (line 35) but is separate from cart store's invoiceDiscountPct

#### B.2.4 — `resources/js/pos/hooks/usePOS.ts` (66 lines)

**Full file read** — see raw file at `resources/js/pos/hooks/usePOS.ts`

- Line 21: `const invoiceDiscountPct = useCartStore(s => s.invoiceDiscountPct)`
- Line 32: `const setInvoiceDiscountPct = useCartStore(s => s.setInvoiceDiscountPct)`
- Line 41: `holdCart` passes `items, totals, client, label, clearCart` — **no invoiceDiscountPct in holdCart params**

#### B.2.5 — `resources/js/pos/utils/calculations.ts` (112 lines)

**Full file read** — see raw file at `resources/js/pos/utils/calculations.ts`

Key functions:
- `calcCompoundedDiscount()` (lines 38-42): Same formula as `compoundDiscountPct`
- `calcTotals()` (lines 45-84): Computes totals with invoice discount applied to HT proportionally

#### B.2.6 — `resources/js/pos/components/ProfessionalPaymentModal.tsx` (751 lines)

**Full file read** — see raw file at `resources/js/pos/components/ProfessionalPaymentModal.tsx`

Key balance display:
- Line 258: `const totalDue = totalTtcFinal + (client ? internalPrevBalance : 0)`
- Line 259: `const remaining = Math.max(0, totalDue - totalPaid)`
- Line 516: `<strong>{formatDZD(internalPrevBalance + totalTtcFinal - totalPaid)}</strong>` — client-side balance

#### B.2.7 — `resources/js/lib/api/core/types.ts` (749 lines)

**Full file read** — see raw file at `resources/js/lib/api/core/types.ts`

Key types:
- `CartItem` (lines 638-659): Has `discount_percentage` — no `invoice_discount_percentage`
- `CartTotals` (lines 660-670): Has `invoice_discount_pct` and `invoice_discount_amount` (display only)
- `CommercialDocument` (lines 487-526): No `invoice_discount_percentage` field
- `CommercialDocumentLine` (lines 468-485): Has `discount_percentage` — no invoice-level field

---

<a id="section-c"></a>
## Section C — Cross-Cutting Checks

### C.1 — Balance Computation: Where It Happens

| Location | What | How |
|----------|------|-----|
| `PartyBalanceService::getBalanceAt()` | Party balance at date | `opening + documents - payments` (SSOT) |
| `PaymentSynchronizer::computeAndAttachBalances()` | previous_balance + new_balance for API response | Calls `PartyBalanceService::getBalanceAt()` |
| `CommercialDocumentController::attachBalanceData()` | Previous balance for show/store/update | Calls `PartyBalanceService::getBalanceAt()`, then reverses |
| `ProfessionalPaymentModal` (client-side) | Balance preview in modal | `prevBalance + totalTtcFinal - totalPaid` |
| `POSPage::handleCompleteSale()` | newBalance from API | `res?.balance_data?.new_balance ?? 0` |

**SSOT**: `PartyBalanceService::getBalanceAt()` is the single source of truth. All other balance computations either call it or derive from it.

### C.2 — Payment Creation Paths

| Path | When | Method |
|------|------|--------|
| `CommercialDocumentService::afterCreate()` | New document with payments[] | `$this->payments()->syncPayments()` |
| `CommercialDocumentService::afterUpdate()` | Update document with payments[] | `$this->payments()->syncPayments()` |
| `PosSessionController::close()` | Close POS session | Creates payment records directly |
| `PaymentResource` (admin) | Admin panel manual creation | Standard CRUD |

### C.3 — POS Session Increment Paths

| Path | Location | Guard |
|------|----------|-------|
| New invoice created | `POSPage.tsx:1016` | `!isEditingExistingDocument` ✅ |
| Invoice deleted from session | Search only — no delete from POS | N/A |
| Invoice opened for edit then re-saved | `POSPage.tsx:1016` | `!isEditingExistingDocument` ✅ |
| Cart held | `usePOS.ts:39-43` | No increment — only stores locally |

### C.4 — invoiceDiscountPct State Flow

```
User sets invoice discount via ProfessionalCart
  → pos.setInvoiceDiscountPct(pct)     [useCartStore]
  → cart.invoiceDiscountPct = pct      [persisted to localStorage via pos-cart key]

On display:
  → calcTotals(items, invoiceDiscountPct)  [calculations.ts:45]
  → totals.invoice_discount_amount         [CartTotals]

On save:
  → compoundDiscountPct(linePct, currentInvDisc)  [POSPage.tsx:963]
  → merged into line.discount_percentage          [POSPage.tsx:968]
  → setInvoiceDiscountPct(0)                      [POSPage.tsx:1104]

On reopen:
  → handleOpenInvoice loads doc                    [POSPage.tsx:653]
  → line.discount_percentage = compounded value    [POSPage.tsx:684]
  → invoiceDiscountPct = 0 (UNCHANGED)            [POSPage.tsx:700]
  → BUG: compounded value appears as product discount

On hold/restore:
  → holdCart: stores items only, NOT invoiceDiscountPct  [usePOSStore.ts:37-51]
  → restoreCart: restores items only                     [usePOSStore.ts:53-58]
  → BUG: invoiceDiscountPct lost on hold/restore cycle
```

### C.5 — Database Schema

**`commercial_documents` table** (from migration `2025_10_15_093432`):
- `total_ht`, `total_tva`, `total_discount`, `total_stamp`, `total_ttc`
- `net_to_pay`, `paid_amount`, `remaining_amount`
- NO `invoice_discount_percentage` column

**`commercial_document_lines` table** (from migration `2025_10_15_093437`):
- `quantity`, `unit_price_ht`, `discount_percentage`, `discount_amount`
- `tva_rate`, `total_ht`, `total_tva`, `total_ttc`, `total_discount_amount`
- NO `product_original_discount_percentage` column

**`document_payment` pivot**:
- `commercial_document_id`, `payment_id`, `amount_applied`, `notes`

### C.6 — API Client (documents.ts)

```ts
// Not read in detail — uses standard CRUD pattern
// create() and update() send { lines, payments } payloads
// The payload structure matches StoreCommercialDocumentRequest/UpdateCommercialDocumentRequest
```

### C.7 — Git Status

**10 modified files** + 1 untracked migration. The untracked migration is:
```
?? database/migrations/2026_07_17_000001_fix_payments_payment_number_unique_to_composite.php
```

None of the modified files relate to the discount compounding bug — they are prior work (seeders, settings, types, POSPage).

---

## Summary of Confirmed Bugs

| # | Bug | Location | Severity | Status |
|---|-----|----------|----------|--------|
| 1 | incrementMut double-counting on edit | POSPage.tsx:1016 | High | Fixed (guard applied) |
| 2 | afterUpdate resets remaining_amount unconditionally | CommercialDocumentService.php:579 | Low | Design (corrected by subsequent PaymentSynchronizer call) |
| 3 | Discount compounding — no separate column | POSPage.tsx:963, DB schema | High | **Not fixed** — needs migration + code changes |
| 4 | handleOpenInvoice doesn't restore invoiceDiscountPct | POSPage.tsx:700 | High | **Not fixed** — needs restoration logic |
| 5 | Creditor new_balance display discrepancy | ProfessionalPaymentModal.tsx:516 | Medium | **Not fixed** — client-side vs backend divergence |
| 6 | PartyBalanceService abs() vs live negative balance | PartyBalanceService.php:69 | Low | Fixed (signed values preserved) |

## Files Touched by the Discount Compounding Fix (Planned)

1. `database/migrations/` — New migration: add `invoice_discount_percentage` to `commercial_documents` and `commercial_document_lines`
2. `app/Models/CommercialDocument.php` — Add to `$fillable`
3. `app/Http/Resources/CommercialDocumentResource.php` — Expose `invoice_discount_percentage`
4. `app/Http/Requests/StoreCommercialDocumentRequest.php` — Accept `invoice_discount_percentage`
5. `app/Http/Requests/UpdateCommercialDocumentRequest.php` — Accept `invoice_discount_percentage`
6. `app/Observers/CommercialDocumentLineObserver.php` — Apply compound formula using `$document->_invoice_discount`
7. `app/Services/CommercialDocumentService.php` — Pass invoice discount via transient property
8. `resources/js/lib/api/core/types.ts` — Add `invoice_discount_percentage` to types
9. `resources/js/lib/api/endpoints/documents.ts` — Send/receive `invoice_discount_percentage`
10. `resources/js/pages/pos/POSPage.tsx` — Stop compounding, restore `invoiceDiscountPct` on reopen
11. `resources/js/pos/hooks/usePOSStore.ts` — Store/restore `invoiceDiscountPct` in held carts
