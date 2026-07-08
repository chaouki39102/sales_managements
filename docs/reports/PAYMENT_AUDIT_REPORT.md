# Payment Module Technical Audit — Bug Report & Patches

**Date**: 2026-07-07
**Author**: AI Audit Agent
**Status**: All 6 patches applied — Build: 0 errors (1039 modules) — Tests: 159/159 pass

---

## Root Cause: Balance Duplication (1000→2000)

**Bug**: When re-opening an existing commercial document for editing, the frontend preview shows `future_balance = current_balance + 2×net_to_pay` instead of `current_balance`.

**Why**: The `signed_balance` from `PartyBalanceService::getBalanceAt()` is a live query that ALREADY includes the current document's `net_to_pay`. The frontend formula `signed_balance + (netToPay - totalPaid)` then adds it a second time.

| Scenario | signed_balance | netToPay | Old Formula | Correct |
|----------|----------------|----------|-------------|---------|
| New doc, 1000 TTC | 0 | 1000 | 0+1000=1000 ✓ | 0+1000=1000 ✓ |
| Re-open same doc | 1000 (includes doc) | 1000 | 1000+1000=**2000 ✗** | 1000-1000+1000=**1000 ✓** |
| Re-open, add 500 payment | 1000 | 1000 | 1000+(1000-500)=**1500 ✗** | 1000-1000+0+(1000-500)=**500 ✓** |

---

## Patch 1: Frontend Balance Preview Double-Count (CRITICAL)

### File
`resources/js/pages/documents/CommercialDocumentModal/DocumentTotalsSection.tsx`

### Before
```tsx
interface DocumentTotalsSectionProps {
  // ...
  // ❌ No existingDocument prop
}

export default function DocumentTotalsSection({
  // ...
}: DocumentTotalsSectionProps) {
  return (
    // ...
      <b style={{ color: 'var(--em)' }}>
        {fmtDZD(
          isPurchase
            ? partyBalance.signed_balance - (totals.netToPay - totals.totalPaid)
            : partyBalance.signed_balance + (totals.netToPay - totals.totalPaid),
        )} دج
      </b>
    // ...
  );
}
```

### After
```tsx
interface DocumentTotalsSectionProps {
  // ...
  existingDocument?: Record<string, unknown>;  // ✅ NEW
}

export default function DocumentTotalsSection({
  // ...
  existingDocument,  // ✅ NEW
}: DocumentTotalsSectionProps) {
  // ✅ Compute future balance correctly for both new + existing documents
  const futureBalance = partyBalance && form.party_id && totals.netToPay > 0
    ? (() => {
        const existingNetToPay = isEdit
          ? toNum(existingDocument?.total_ttc ?? 0)
            + toNum(existingDocument?.total_stamp ?? 0)
          : 0;
        const existingPaymentsSum = isEdit
          ? (existingDocument?.payments as unknown[] ?? [])
              .reduce((s, p) => s + toNum(p.amount ?? 0), 0)
          : 0;
        const deltaDoc = totals.netToPay - existingNetToPay;
        const deltaPmt = totals.totalPaid - existingPaymentsSum;
        return isPurchase
          ? partyBalance!.signed_balance - deltaDoc + deltaPmt
          : partyBalance!.signed_balance + deltaDoc - deltaPmt;
      })()
    : null;
  // ...
      <b style={{ color: 'var(--em)' }}>
        {futureBalance !== null ? `${fmtDZD(futureBalance)} دج` : ''}
      </b>
  // ...
}
```

### Supporting change in `index.tsx` — pass `existingDocument` prop
```tsx
<DocumentTotalsSection
  // ...
  existingDocument={existingDocument}  // ✅ NEW
/>
```

---

## Patch 2: Remove Duplicate Field Names (CRITICAL)

### Files
- `resources/js/lib/api/core/types.ts`
- `resources/js/pages/invoices/InvoicesPage.tsx`
- `resources/js/pos/components/SessionInvoicesModal.tsx`

### Problem
`CommercialDocument` interface had BOTH `amount_paid`/`amount_remaining` (non-existent in API) AND `paid_amount`/`remaining_amount` (actual DB columns). The API only returns `paid_amount` and `remaining_amount` per `CommercialDocumentResource.php`.

### Before (`types.ts`)
```ts
// CommercialDocument interface
  amount_paid:        number;   // ❌ Non-existent field
  amount_remaining:   number;   // ❌ Non-existent field
  paid_amount:        number;   // ✅ Actual DB column
  remaining_amount:   number;   // ✅ Actual DB column
```

### After (`types.ts`)
```ts
// CommercialDocument interface
  paid_amount:        number;   // ✅ Single source of truth
  remaining_amount:   number;   // ✅ Single source of truth
```

### Before (`SessionInvoicesModal.tsx`)
```ts
paid      += Number(doc.paid_amount ?? doc.amount_paid ?? 0);     // ❌ Fallback to dead field
remaining += Number(doc.remaining_amount ?? doc.amount_remaining ?? 0);  // ❌ Fallback to dead field
```

### After (`SessionInvoicesModal.tsx`)
```ts
paid      += Number(doc.paid_amount ?? 0);        // ✅ Clean
remaining += Number(doc.remaining_amount ?? 0);   // ✅ Clean
```

### Changed files summary
| File | Line(s) | Change |
|------|---------|--------|
| `types.ts` | 489-492 | Removed `amount_paid`, `amount_remaining` |
| `SessionInvoicesModal.tsx` | 50-51, 103-105 | Removed fallback to dead fields |
| `InvoicesPage.tsx` | 361, 460, 479, 762, 771 | Replaced `amount_paid`→`paid_amount`, `amount_remaining`→`remaining_amount` |

---

## Patch 3: Missing `direction` Column (CRITICAL)

### Problem
`TreasuryBalanceService` queries `WHERE direction = 'in'` and `WHERE direction = 'out'` (lines 61, 72), but the `direction` column was **never added** to the `payments` table. All live treasury balance queries returned `total_in = 0` and `total_out = 0` for every account.

### New migration
`database/migrations/2026_07_07_190342_add_direction_to_payments_table.php`

```php
Schema::table('payments', function (Blueprint $table) {
    $table->string('direction', 10)->nullable()->after('amount_local')
        ->comment('in for incoming (sale), out for outgoing (purchase/expense)');
});
```

### Model fillable (`Payment.php`)
```php
protected $fillable = [
    'company_id',
    'client_ref',
    'payment_number',
    'payment_date',
    'amount',
    'direction',        // ✅ Added
    'currency_id',
    // ...
];
```

### Resource (`PaymentResource.php`)
```php
'direction' => $this->direction,   // ✅ Added
```

---

## Patch 4: Missing Computed Fields in `PaymentResource` (MEDIUM)

### File
`app/Http/Resources/PaymentResource.php`

### Before
```php
return [
    'id'             => $this->id,
    'amount'         => (float) $this->amount,
    // ❌ No total_applied, no unapplied_amount
];
```

### After
```php
return [
    'id'             => $this->id,
    'amount'         => (float) $this->amount,
    'total_applied'  => $this->relationLoaded('commercialDocuments')
        ? (float) $this->getTotalApplied()
        : null,
    'unapplied_amount' => $this->relationLoaded('commercialDocuments')
        ? (float) $this->getUnappliedAmount()
        : null,
];
```

### Frontend type (`types.ts`)
```ts
export interface Payment extends BaseModel {
  // ...
  direction?:        'in' | 'out';        // ✅ NEW
  total_applied?:    number | null;        // ✅ NEW
  unapplied_amount?: number | null;        // ✅ NEW
}
```

---

## Patch 5: `PaymentCreateInput` Field Mismatch (MEDIUM)

### Problem
Frontend sent `commercial_document_id: number` (singular), but backend `StorePaymentRequest` expects `document_ids: number[]` (plural array for pivot table). The field `commercial_document_id` was always stripped by `BaseService::beforeCreate()` because it's not a column in the `payments` table.

### File
`resources/js/lib/api/endpoints/payments.ts`

### Before
```ts
export interface PaymentCreateInput {
  commercial_document_id: number;   // ❌ Stripped by beforeCreate(), never stored
  payment_mode_id:        number;
  amount:                 number;
  fiscal_year_id:         number;
}

const create = useMutation({
  mutationFn: paymentsApi.create,
  onSuccess:  (p) => invalidate(p.commercial_document_id),  // ❌ Always undefined
});

const invalidate = (docId?: number) => {
  qc.invalidateQueries({ queryKey: tenantKeys.payments.all(slug) });
  if (docId) {
    qc.invalidateQueries({ queryKey: tenantKeys.documents.detail(slug, docId) });  // ❌ Never fires
  }
};
```

### After
```ts
export interface PaymentCreateInput {
  document_ids:           number[];   // ✅ Matches backend StorePaymentRequest
  payment_mode_id:        number;
  amount:                 number;
  fiscal_year_id:         number;
}

const create = useMutation({
  mutationFn: paymentsApi.create,
  onSuccess:  () => invalidate(),   // ✅ Always invalidates all docs
});

const invalidate = () => {
  qc.invalidateQueries({ queryKey: tenantKeys.payments.all(slug) });
  qc.invalidateQueries({ queryKey: tenantKeys.documents.all(slug) });  // ✅ Always fires
};
```

### Frontend `Payment` type (`types.ts`)

### Before
```ts
export interface Payment extends BaseModel {
  commercial_document_id: number;   // ❌ Not a column in payments table
  payment_mode_id:        number;
  // ...
}
```

### After
```ts
export interface Payment extends BaseModel {
  payment_mode_id:        number;
  // ... (commercial_document_id removed)
}
```

---

## Patch 6: `SessionInvoicesModal` Payment Display Cleanup (MEDIUM)

### File
`resources/js/pos/components/SessionInvoicesModal.tsx`

### Before
```tsx
// 4 fallback patterns for same issue:
doc.paid_amount ?? doc.amount_paid ?? 0
doc.remaining_amount ?? doc.amount_remaining ?? 0
formatDZD(doc.paid_amount ?? doc.amount_paid ?? 0)
Number(doc.remaining_amount ?? doc.amount_remaining ?? 0) > 0
```

### After
```tsx
// Clean, no dead field fallback:
doc.paid_amount ?? 0
doc.remaining_amount ?? 0
```

---

## Verification Results

| Check | Result |
|-------|--------|
| `npm run build` | 0 errors, 1039 modules |
| `npm test` | 159/159 pass (6 test files) |
| PHP lint (all touched files) | No syntax errors in all 7 files |
| `amount_paid`/`amount_remaining` remaining references | 4 — all on different interfaces (`TaxDeclaration`, `PartyStatRow`, `Expense`) — legitimate, NOT touched |
| `commercial_document_id` remaining references | 9 — all on different tables (`commercial_document_lines`, `checks`, `stock_movements`) or as filter params — legitimate, NOT touched |

---

## Files Modified (11 total)

| # | File | Type | Priority |
|---|------|------|----------|
| 1 | `resources/js/pages/documents/CommercialDocumentModal/DocumentTotalsSection.tsx` | Frontend | CRITICAL |
| 2 | `resources/js/pages/documents/CommercialDocumentModal/index.tsx` | Frontend | CRITICAL |
| 3 | `resources/js/lib/api/core/types.ts` | Frontend | CRITICAL |
| 4 | `resources/js/lib/api/endpoints/payments.ts` | Frontend | MEDIUM |
| 5 | `resources/js/pages/invoices/InvoicesPage.tsx` | Frontend | MEDIUM |
| 6 | `resources/js/pos/components/SessionInvoicesModal.tsx` | Frontend | MEDIUM |
| 7 | `app/Http/Resources/PaymentResource.php` | Backend | CRITICAL |
| 8 | `app/Models/Payment.php` | Backend | CRITICAL |
| 9 | `database/migrations/2026_07_07_190342_add_direction_to_payments_table.php` | Backend | CRITICAL |
| 10 | `app/Services/TreasuryBalanceService.php` | Backend | NOT MODIFIED (correct) |
| 11 | `app/Services/CommercialDocumentService.php` | Backend | NOT MODIFIED (no bug) |

---

## What Was NOT Modified (and why)

| File | Reason |
|------|--------|
| `BankReconciliationService.php` | Only touches `is_reconciled`/`reconciliation_date` — no financial impact |
| `CommercialDocumentService.php` | `syncPayments()` direction uses `resolveDirectionFromDocument()` which depends on document type (never changes) — no order bug |
| `PartyBalanceService.php` | Live query is ALWAYS correct from DB — no bug |
| `PaymentService.php` | Correctly uses `ResolvesPaymentDirection` trait with direction column |
| `app/Core/Services/Concerns/ResolvesPaymentDirection.php` | Correct — `direction` column now exists in migration |
