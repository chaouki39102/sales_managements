# POS Confirm Payment — Full Execution Trace

> **Date:** 2026-07-08
> **Scope:** Complete end-to-end flow when user clicks "تأكيد الدفع" (Confirm Payment) in ProfessionalPaymentModal
> **Files involved:** 18 files across frontend + backend

---

## Flow Overview

```
ProfessionalPaymentModal.handleSubmit()
  → onConfirm() / handleCompleteSale()
    → documentsApi.create() or .update()  [POST/PUT /api/{company}/documents]
      → CommercialDocumentController@store|update  (BaseApiController)
        → StoreCommercialDocumentRequest (validation)
        → CommercialDocumentService::create() (via BaseService)
          → beforeCreate(): number generation, defaults, status=validated
          → DB::transaction { INSERT document }
          → afterCreate():
              ├── createDocumentLines()
              ├── recalculateTotals()
              ├── createStockMovements()
              ├── syncPayments()  ★ CORE PAYMENT ENGINE
              │     ├── resolveIdempotentPaymentIds()
              │     ├── DELETE removed payments + reverse treasury
              │     ├── UPSERT payments (INSERT new / UPDATE existing)
              │     ├── adjustTreasuryBalance()
              │     ├── recalculatePaymentAmounts()
              │     └── syncDocumentStatus() → paid|partially_paid
              └── computeAndAttachBalances()
                  └── PartyBalanceService::getBalanceAt()
    → incrementMut.mutate()  [POST /pos-sessions/{id}/increment]
      → PosSessionController@increment
        ├── invoices_count++, gross_sales++
        ├── PosSessionPayment upsert (per payment mode)
        ├── PosSessionProduct upsert (per product)
    → build POSSaleSnapshot (receipt data)
    → clear cart, reset editing state
    → auto-print via handlePrintDirect() or show receipt modal
    → toast.success()
```

---

## 1. User Clicks "تأكيد الدفع" Button

**File:** `resources/js/pos/components/ProfessionalPaymentModal.tsx:714-733`

```tsx
<button className="btn btn-p" onClick={handleSubmit} disabled={!canSubmit}>
  <FaCheckCircle /> تأكيد الدفع — {totalPaid.toFixed(2)}
</button>
```

Keyboard shortcut: `Ctrl+Enter` (line 372-379)

---

## 2. handleSubmit — Validation + Data Assembly

**File:** `resources/js/pos/components/ProfessionalPaymentModal.tsx:343-369`

```tsx
const handleSubmit = useCallback(async () => {
  if (!canSubmit) return;
  setSubmitting(true);
  setError('');

  const payments = lines
    .filter(l => parseFloat(l.amount) > 0.009)
    .map(l => ({
      ...(l.dbId ? { id: l.dbId } : {}),
      paymentModeId:      l.modeId,
      amount:             parseFloat(l.amount),
      treasuryAccountId:  l.treasuryAccountId ?? null,
      reference:          l.refNote?.trim() || null,
    }));

  const res = await onConfirm({
    amountPaid: totalPaid,
    payments,
    docTypeCode,
    dueDate:    dueDate || undefined,
    note:       note || undefined,
    currencyId: selectedCurrencyId,
  });

  setSubmitting(false);
  if (!res.ok) setError(res.message ?? 'حدث خطأ غير متوقع');
}, [canSubmit, lines, totalPaid, docTypeCode, dueDate, note, selectedCurrencyId, onConfirm]);
```

**What it does:**
1. Guards: `!canSubmit` → return
2. Sets `submitting=true`, clears error
3. Filters payment lines (amount > 0.009)
4. Maps to API format with optional `id` (for existing payments)
5. Calls `onConfirm` callback — which is `handleCompleteSale` from POSPage

---

## 3. onConfirm → handleCompleteSale (POSPage)

**File:** `resources/js/pages/pos/POSPage.tsx:709-892`

**Modal wiring at line 1093-1107:**

```tsx
<ProfessionalPaymentModal
  ...
  onConfirm={handleCompleteSale}
/>
```

**handleCompleteSale** is a massive `useCallback` (lines 709-892). Key steps:

### 3a. Pre-validation (lines 717-725)
```tsx
const typeCode = params.docTypeCode ?? settings.defaultDocTypeCode;
const invType  = documentTypes?.find(t => t.code === typeCode) ?? ...
if (!invType)          return { ok: false, message: 'لم يُعثَر على نوع مستند' };
if (!defaultWarehouse) return { ok: false, message: 'لا يوجد مستودع مُفعَّل' };
if (!fiscalYear)       return { ok: false, message: 'لا توجد سنة مالية نشطة' };
```

### 3b. Snapshot cart state (lines 727-733)
```tsx
const currentItems   = pos.items;
const currentTotals  = pos.totals;
const currentClient  = pos.client;
const currentInvDisc = pos.invoiceDiscountPct;
const snapshot = { items: [...currentItems], totals: { ...currentTotals } };
```

### 3c. Build payments payload (lines 735-745)
```tsx
const apiPayments = (params.payments ?? [])
  .filter(p => p.amount > 0)
  .map(p => ({
    ...(p.id ? { id: p.id } : {}),
    payment_mode_id:     p.paymentModeId,
    amount:              p.amount,
    payment_date:        new Date().toISOString().slice(0, 10),
    treasury_account_id: p.treasuryAccountId ?? defaultTreasury?.id ?? null,
    reference:           p.reference?.trim() || null,
    notes:               params.note?.trim() || null,
  }));
```

### 3d. Build lines payload (lines 747-758)
```tsx
const linesPayload = currentItems.map(i => {
  const compoundedDisc = currentInvDisc > 0
    ? 100 - (100 - i.discount_percentage) * (100 - currentInvDisc) / 100
    : i.discount_percentage;
  return {
    product_id:          i.product_id,
    quantity:            i.quantity,
    unit_price_ht:       i.unit_price_ht,
    discount_percentage: Math.min(100, compoundedDisc),
    tva_rate:            i.tva_rate,
  };
});
```

### 3e. Recalculate totals (lines 760-766)
```tsx
const effectiveTotalHt = linesPayload.reduce((s, l) =>
  s + l.quantity * l.unit_price_ht * (1 - l.discount_percentage / 100), 0);
const effectiveTotalTva = linesPayload.reduce((s, l) => {
  const lineHt = l.quantity * l.unit_price_ht * (1 - l.discount_percentage / 100);
  return s + lineHt * l.tva_rate / 100;
}, 0);
const effectiveTotalTtc = effectiveTotalHt + effectiveTotalTva + snapshot.totals.fiscal_stamp;
```

### 3f. Build common payload (lines 768-776)
```tsx
const commonPayload = {
  party_id:       currentClient?.id ?? null,
  warehouse_id:   defaultWarehouse.id,
  fiscal_year_id: fiscalYear.id,
  currency_id:    params.currencyId ?? defaultCurrency?.id ?? null,
  document_date:  new Date().toISOString().slice(0, 10),
  due_date:       params.dueDate ?? null,
  notes:          params.note ?? cartNote ?? null,
};
```

### 3g. API Call — Create or Update (lines 778-793)
```tsx
if (editingDocumentId) {
  const isDraft = editingDocStatus === 'draft';
  res = await documentsApi.update(editingDocumentId, {
    ...commonPayload,
    ...(isDraft ? { lines: linesPayload } : {}),
    payments: apiPayments,
  });
} else {
  res = await documentsApi.create({
    ...commonPayload,
    document_type_id: invType.id,
    lines:            linesPayload,
    payments:         apiPayments,
  });
}
```

---

## 4. API Client — HTTP Request

**File:** `resources/js/lib/api/endpoints/documents.ts:142-146`

```ts
create(data):   apiPost<CommercialDocument>('/documents', data)
update(id,data):apiPut<CommercialDocument>(`/documents/${id}`, data)
```

**File:** `resources/js/lib/api/core/client.ts:250-254` — Axios `client.post()`/`client.put()` with Laravel response unwrapping.

**Routes** (`routes/api.php:436`):
```
POST  /api/{company}/documents          → CommercialDocumentController@store
PUT   /api/{company}/documents/{id}      → CommercialDocumentController@update
```

---

## 5. Backend Controller

**File:** `app/Http/Controllers/Api/V1/CommercialDocumentController.php`

Inherits `store()` and `update()` from `BaseApiController` (does not override them).

**BaseApiController::store()** (`app/Core/Http/Controllers/BaseApiController.php:121-135`):
```php
public function store(Request $request): JsonResponse
{
    $this->authorizeAction('create', $this->getModelClass());
    $data = $this->getValidatedData($request);  // StoreCommercialDocumentRequest
    $item = $this->getService()->create($data, $request);  // CommercialDocumentService
    return $this->successResponse($this->transformItem($item), ..., 201);
}
```

**BaseApiController::update()** (`app/Core/Http/Controllers/BaseApiController.php:137-152`):
```php
public function update(Request $request, $id): JsonResponse
{
    $resolvedId = $this->extractId($id);
    $item = $this->getService()->findById($resolvedId);
    $this->authorizeAction('update', $item);
    $data = $this->getValidatedData($request, $resolvedId);
    $item = $this->getService()->update($item, $data, $request);
    return $this->successResponse($this->transformItem($item), ...);
}
```

**Validation:** `StoreCommercialDocumentRequest` (lines 32-105):
- `document_type_id` — required, exists
- `party_id` — required (if doc type requires party)
- `lines` — array with `product_id`, `quantity`, `unit_price_ht` required
- `payments` — nullable array with `payment_mode_id`, `amount`, `payment_date` required

---

## 6. CommercialDocumentService::create() — BaseService

**File:** `app/Core/Services/BaseService.php:98-123`

```php
public function create(array $data, Request $request = null): Model
{
    $data = $this->beforeCreate($data, $request);
    $item = DB::transaction(function () use ($data, $request) {
        $item = $this->model::create($data);        // INSERT document
        $this->afterCreate($item, $data, $request); // lines + payments + stock
        return $this->loadDefaultRelations($item);
    });
    $this->performPostCommitOperations($item, $data, $request, 'create');
    return $item;
}
```

---

## 7. beforeCreate — Document Preparation

**File:** `app/Services/CommercialDocumentService.php:67-153`

| Step | Lines | Description |
|------|-------|-------------|
| Company ID | 69-76 | Sets `company_id` from context or data |
| User ID | 78-80 | Sets `user_id` from auth |
| Doc type validation | 84-95 | Verifies DocumentType exists + `requires_party` |
| Numbering series | 98-101 | Resolves via `resolveNumberingSeries()` |
| Document number | 103-118 | Generates `FV-2026-000042` via `generateDocumentNumber()` |
| Default warehouse | 121-124 | From settings if not provided |
| Default currency | 126-129 | From settings if not provided |
| Fiscal year | 132-138 | From settings or current open year |
| **Status** | 140-143 | `document_status_id = validated` (immediately — no draft) |
| Tenant validation | 145-150 | Validates party/warehouse/fiscal_year/currency belong to company |

---

## 8. afterCreate — The Core Transaction

**File:** `app/Services/CommercialDocumentService.php:160-187`

```php
protected function afterCreate(Model $item, array $data, $request): void
{
    $lines = $request?->input('lines') ?? $data['lines'] ?? [];
    if (!empty($lines)) {
        $this->createDocumentLines($item, $lines);     // 8a
    }
    $this->recalculateTotals($item);                    // 8b

    $item->load('documentType', 'lines.product');
    if (($item->documentType?->affects_stock_direction ?? 0) !== 0) {
        $this->createStockMovements($item);            // 8c
    }

    $hasPayments = $request?->has('payments') ?? array_key_exists('payments', $data);
    if ($hasPayments) {
        $payments = $request?->input('payments') ?? $data['payments'] ?? [];
        $this->syncPayments($item, $payments);         // 8d ★ CORE
    }

    $this->computeAndAttachBalances($item);             // 8e
}
```

### 8a. createDocumentLines() — lines 634+
- Validates all product IDs exist and are active (Phase 18 fix)
- Applies TVA exemption rules per party
- INSERT each `DocumentLine` with computed totals (HT, TVA, TTC)

### 8b. recalculateTotals() — lines 789+
- `SUM(line.total_ht)`, `SUM(line.total_tva)`, `SUM(line.total_ttc)`
- Fiscal stamp via `calcFiscalStamp()` (SSOT backend calculator)

### 8c. createStockMovements() — lines 871+
- Checks stock availability (if managed)
- Gets cost price from valuation service
- INSERT `StockMovement` records

### 8d. syncPayments() — lines 484-608 ★

```php
public function syncPayments(CommercialDocument $document, array $payments): void
{
    $companyId = $document->company_id;

    // 1. Idempotency protection — deduplicate via client_ref
    $payments = $this->resolveIdempotentPaymentIds($companyId, $payments);

    // 2. Load existing pivots
    $existingPivotIds = DB::table('document_payment')
        ->where('commercial_document_id', $document->id)
        ->pluck('payment_id')->toArray();

    // 3. DELETE payments removed from payload
    $toDelete = array_diff($existingPivotIds, $incomingIds);
    foreach ($toDelete as $paymentId) {
        // Delete pivot
        // Reverse treasury balance
        // Delete Payment if orphaned
    }

    // 4. UPSERT payments
    foreach ($payments as $paymentData) {
        if ($paymentId) {
            // UPDATE existing: amount, mode, treasury, reference
            // Adjust treasury balance with delta logic
        } else {
            // INSERT new Payment with generated number
            // Attach via document_payment pivot
            // Adjust treasury balance (add)
        }
    }

    // 5. Recalculate paid_amount, remaining_amount
    $this->recalculatePaymentAmounts($document);

    // 6. Sync document status
    $this->syncDocumentStatus($document);  // → paid|partially_paid|validated
}
```

**Key sub-functions:**
- `resolveIdempotentPaymentIds()` (line 489) — protects against duplicate submissions
- `adjustTreasuryBalance()` (line 597) — credits/debits treasury account
- `recalculatePaymentAmounts()` (line 604) — SUM pivot `amount_applied` → update document
- `syncDocumentStatus()` (line 607) — `remaining <= 0` → `paid`, else `partially_paid`

### 8e. computeAndAttachBalances() — lines 445-482

```php
private function computeAndAttachBalances(CommercialDocument $doc): void
{
    $balanceService = app(PartyBalanceService::class);
    $balanceData    = $balanceService->getBalanceAt($doc->party_id, $doc->document_date);

    $signedBalance   = (float) ($balanceData['signed_balance'] ?? 0);
    $netToPay        = (float) $doc->net_to_pay;
    $paidAmount      = (float) $doc->paid_amount;
    $remainingAmount = (float) $doc->remaining_amount;

    $previousSigned = $signedBalance - $netToPay + $paidAmount;

    $doc->balance_data = [
        'previous_balance' => round(abs($previousSigned), 4),
        'invoice_total'    => round($netToPay, 4),
        'paid_amount'      => round($paidAmount, 4),
        'remaining'        => round($remainingAmount, 4),
        'change'           => round(max(0, $paidAmount - $netToPay), 4),
        'new_balance'      => round(abs($signedBalance), 4),
    ];
}
```

**PartyBalanceService::getBalanceAt()** (`app/Services/PartyBalanceService.php:20-98`):
- `opening_balance` — from `opening_balances_parties`
- `documents_balance` — SUM of all docs up to date (signed by sale/purchase)
- `payments_total` — SUM of all confirmed payments
- `current_balance = opening + documents - payments`

---

## 9. API Response Serialization

**File:** `app/Http/Resources/CommercialDocumentResource.php:70`

```php
'balance_data' => $this->balance_data ?? null,
```

Response includes all document fields + relations + dynamically attached `balance_data`.

---

## 10. POS Session Increment

### Frontend Trigger (POSPage.tsx:795-810)

After successful document creation, the session is updated:

```tsx
if (currentSession?.id) {
  incrementMut.mutate(
    buildIncrementInput({
      items:            currentItems,
      totalHt:          effectiveTotalHt,
      totalTva:         effectiveTotalTva,
      totalFiscalStamp: snapshot.totals.fiscal_stamp,
      totalDiscount:    snapshot.totals.total_discount + invoiceDiscountAmount,
      grandTotal:       effectiveTotalTtc,
      payments:         apiPayments.map(p => ({
        payment_mode_id: p.payment_mode_id,
        amount:          p.amount,
      })),
    }),
  );
}
```

**buildIncrementInput()** — `resources/js/lib/api/endpoints/posSession.ts:184-210`:
```ts
export function buildIncrementInput(params) {
  return {
    invoice_total:      params.grandTotal,
    total_ht:           params.totalHt,
    total_tva:          params.totalTva,
    total_fiscal_stamp: params.totalFiscalStamp,
    total_discount:     params.totalDiscount,
    is_return:          params.isReturn ?? false,
    payments:           params.payments ?? [],
    items: params.items.map(i => ({
      product_id:   i.product_id,
      product_name: i.product_name,
      quantity:     i.quantity,
      total_ht:     i.total_ht,
      total_ttc:    i.total_ttc,
    })),
  };
}
```

### Backend: PosSessionController@increment (line 76-174)

```php
public function increment(Request $request): JsonResponse
{
    $session = $this->findOpenSession($request, $request->route('session'));
    $data = $request->validate([...]);

    DB::transaction(function () use ($session, $data) {
        // 1. Increment counters
        $session->increment('invoices_count');
        $session->increment('gross_sales', $amount);
        if ($amount > $session->highest_invoice)
            $session->update(['highest_invoice' => $amount]);

        $session->increment('total_tva', $data['total_tva']);
        $session->increment('total_fiscal_stamp', $data['total_fiscal_stamp']);
        $session->increment('total_discount', $data['total_discount']);

        $session->update(['net_sales' => $session->gross_sales - $session->returns_total]);

        // 2. Upsert PosSessionPayment per payment mode
        foreach ($data['payments'] ?? [] as $p) { ... }

        // 3. Upsert PosSessionProduct per product
        foreach ($data['items'] ?? [] as $item) { ... }
    });
}
```

---

## 11. Post-Sale Frontend State (POSPage.tsx:811-891)

After the API response is received:

| Step | Lines | Action |
|------|-------|--------|
| Store payment ref | 811-817 | `lastPaymentRef.current = { paid, payments, dueDate }` |
| Extract balance | 822-825 | `bd.previous_balance`, `bd.new_balance` from API |
| Build snapshot | 827-855 | `POSSaleSnapshot` with items, totals, client, payments, balance |
| Reset state | 856-866 | `editingDocumentId=null`, `clearCart()`, reset discount |
| Auto-print | 868-882 | If `autoPrint && isPrintEnabled && template` → `handlePrintDirect()` after 300ms |
| Receipt modal | 873-882 | `setModal('receipt')` or `setModal('none')` |
| Toast | 884 | `toast.success(\`✅ تم حفظ الفاتورة ${res.document_number}\`)` |
| Return | 885 | `{ ok: true, docNumber: res.document_number }` |

### Receipt Modal (POSPage.tsx:1118-1130)

```tsx
{modal === 'receipt' && receiptSnapshot && receiptSource && template && (
  <ProfessionalReceipt
    template={template}
    company={companyData}
    source={receiptSource}
    docNumber={receiptSnapshot.docNum}
    onClose={() => { setModal('none'); setReceiptSnapshot(null); }}
    onPrint={() => { handlePrintDirect(receiptSnapshot); }}
    onNewSale={() => { ... pos.clearCart(); }}
  />
)}
```

### Error Handling (lines 887-891)
```tsx
catch (err: any) {
  const msg = err?.errors?.lines?.[0] ?? err?.message ?? 'فشل حفظ الفاتورة';
  toast.error(String(msg));
  return { ok: false, message: String(msg) };
}
```

---

## Complete File Inventory

| # | File | Role |
|---|------|------|
| 1 | `resources/js/pos/components/ProfessionalPaymentModal.tsx` | Payment UI, handleSubmit, payment line editing |
| 2 | `resources/js/pages/pos/POSPage.tsx` | handleCompleteSale orchestrator, state management |
| 3 | `resources/js/lib/api/endpoints/documents.ts` | API client (create/update document) |
| 4 | `resources/js/lib/api/core/client.ts` | Axios HTTP client layer |
| 5 | `resources/js/lib/api/endpoints/posSession.ts` | buildIncrementInput, session increment API |
| 6 | `routes/api.php` | Route definitions (line 436: documents, line 557: sessions) |
| 7 | `app/Http/Controllers/Api/V1/CommercialDocumentController.php` | Controller (inherits BaseApiController) |
| 8 | `app/Core/Http/Controllers/BaseApiController.php` | Base store/update with authorization + validation |
| 9 | `app/Http/Requests/StoreCommercialDocumentRequest.php` | Validation rules for document creation |
| 10 | `app/Http/Requests/UpdateCommercialDocumentRequest.php` | Validation rules for document update |
| 11 | `app/Core/Services/BaseService.php` | Base create() with before/after hooks |
| 12 | `app/Services/CommercialDocumentService.php` | Core business logic: beforeCreate, afterCreate, syncPayments, computeAndAttachBalances, createDocumentLines, createStockMovements, recalculateTotals |
| 13 | `app/Services/PartyBalanceService.php` | Balance calculation (opening + documents - payments) |
| 14 | `app/Http/Resources/CommercialDocumentResource.php` | Response serialization (includes balance_data) |
| 15 | `app/Http/Controllers/Api/V1/PosSessionController.php` | Session increment handler |
| 16 | `resources/js/pages/pos/POSKioskPage.tsx` | Kiosk variant of the same flow |

---

## Data Flow: API Request/Response

### Request to POST /api/{company}/documents
```json
{
  "document_type_id": 1,
  "party_id": 42,
  "warehouse_id": 5,
  "fiscal_year_id": 2,
  "currency_id": 1,
  "document_date": "2026-07-08",
  "due_date": null,
  "notes": "ملاحظة",
  "lines": [
    {
      "product_id": 100,
      "quantity": 2,
      "unit_price_ht": 2500.00,
      "discount_percentage": 0,
      "tva_rate": 19
    }
  ],
  "payments": [
    {
      "payment_mode_id": 1,
      "amount": 5000.00,
      "payment_date": "2026-07-08",
      "treasury_account_id": 3,
      "reference": null,
      "notes": null
    }
  ]
}
```

### Request to POST /api/{company}/pos-sessions/{id}/increment
```json
{
  "invoice_total": 5000.00,
  "total_ht": 4201.68,
  "total_tva": 798.32,
  "total_fiscal_stamp": 50.00,
  "total_discount": 0,
  "is_return": false,
  "payments": [{"payment_mode_id": 1, "amount": 5000.00}],
  "items": [{"product_id": 100, "product_name": "...", "quantity": 2, "total_ht": 5000.00, "total_ttc": 5950.00}]
}
```

### Response from POST /api/{company}/documents
```json
{
  "data": {
    "id": 142,
    "document_number": "FV-2026-000042",
    "total_ht": 4201.68,
    "total_tva": 798.32,
    "total_stamp": 50.00,
    "total_ttc": 5000.00,
    "net_to_pay": 5050.00,
    "paid_amount": 5000.00,
    "remaining_amount": 50.00,
    "document_status": {"name": "partially_paid"},
    "balance_data": {
      "previous_balance": 0,
      "invoice_total": 5050.00,
      "paid_amount": 5000.00,
      "remaining": 50.00,
      "change": 0,
      "new_balance": 50.00
    },
    "payments": [
      {
        "id": 88,
        "payment_mode_id": 1,
        "amount": 5000.00,
        "status": "confirmed",
        "payment_number": "PAY-2026-000015",
        "payment_date": "2026-07-08"
      }
    ]
  }
}
```

---

## Database Tables Affected

| Table | Operation | Description |
|-------|-----------|-------------|
| `commercial_documents` | INSERT | New document with status=validated |
| `document_lines` | INSERT (×N) | One row per cart item |
| `payments` | INSERT | New payment with status=confirmed |
| `document_payment` | INSERT | Pivot linking document to payment |
| `treasury_accounts` | UPDATE | Balance incremented |
| `stock_movements` | INSERT (×N) | Stock decremented per product |
| `pos_sessions` | UPDATE | invoices_count++, gross_sales++, totals |
| `pos_session_payments` | INSERT/UPDATE | Per payment mode aggregation |
| `pos_session_products` | INSERT/UPDATE | Per product aggregation |
| `party_balance` | N/A | Computed on-the-fly via PartyBalanceService |

---

## Sequence Diagram (Text)

```
User                    ProfessionalPaymentModal        POSPage                     API Backend
 │                              │                          │                            │
 ├─ Click "تأكيد الدفع" ──────►│                          │                            │
 │                              │                          │                            │
 │                         handleSubmit()                  │                            │
 │                              │                          │                            │
 │                              ├─ Validate lines          │                            │
 │                              ├─ Map to API format       │                            │
 │                              └─ onConfirm(params) ─────►│                            │
 │                                                         │                            │
 │                                               handleCompleteSale()                  │
 │                                                         │                            │
 │                                                         ├─ Validate prerequisites    │
 │                                                         ├─ Build apiPayments[]       │
 │                                                         ├─ Build linesPayload[]      │
 │                                                         ├─ Recalculate totals        │
 │                                                         │                            │
 │                                                         ├─ documentsApi.create() ───►│
 │                                                         │                            │
 │                                                         │        BaseController@store│
 │                                                         │           │                │
 │                                                         │           ├─ Validate      │
 │                                                         │           ├─ beforeCreate() │
 │                                                         │           ├─ INSERT doc    │
 │                                                         │           └─ afterCreate() │
 │                                                         │                │           │
 │                                                         │                ├─ createDocumentLines()
 │                                                         │                ├─ recalculateTotals()
 │                                                         │                ├─ createStockMovements()
 │                                                         │                ├─ syncPayments()
 │                                                         │                │    ├─ UPSERT payments
 │                                                         │                │    ├─ adjustTreasuryBalance()
 │                                                         │                │    ├─ recalculatePaymentAmounts()
 │                                                         │                │    └─ syncDocumentStatus()
 │                                                         │                └─ computeAndAttachBalances()
 │                                                         │                     └─ PartyBalanceService
 │                                                         │                            │
 │                                                         │◄──── Response (doc + balance_data) ──┤
 │                                                         │                            │
 │                                                         ├─ incrementMut.mutate() ──►│
 │                                                         │         PosSessionController@increment
 │                                                         │◄──── Response ────────────┤
 │                                                         │                            │
 │                                                         ├─ Build POSSaleSnapshot     │
 │                                                         ├─ Clear cart, reset state   │
 │                                                         ├─ Auto-print or show receipt│
 │                                                         └─ toast.success()           │
 │◄──── receipt modal / toast ────────────────────────────│                            │
```

---

## Key Architecture Decisions

1. **No draft status**: Documents are created `validated` immediately (line 141-143)
2. **Single transaction**: All document creation (lines, stock, payments, balances) in one DB transaction via `BaseService::create()`
3. **SSOT balance calculation**: Backend computes `balance_data` — frontend never calculates balances (Phase 17 enforcement)
4. **Idempotent payments**: `resolveIdempotentPaymentIds()` protects against duplicate submissions
5. **Payment UPSERT pattern**: Supports modification of existing payments during document edit (Phase 19 fix)
6. **Session increment outside main transaction**: POS session is updated after document is confirmed (separate API call)
